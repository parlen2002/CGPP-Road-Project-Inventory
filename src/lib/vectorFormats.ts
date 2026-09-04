/* ─────────────────────────────────────────────────────────────
   VECTOR FORMAT READERS (all run in-browser, no API keys)
   · KML  → LineString centerlines (Placemark/LineString/MultiGeometry)
   · GPX  → tracks & routes as centerlines
   · SHP  → polygon rings   (raw shapefile binary parser, type 5/15)
   · DBF  → attribute table (joined 1:1 to SHP records)
   · GeoJSON → polygons and/or linestrings
   Assumes WGS 84 / EPSG:4326 — QGIS "Save As → EPSG:4326" before upload.
   ────────────────────────────────────────────────────────────── */

import type { LatLng } from "./geo";

export interface LineFeature { name: string; line: LatLng[]; }
export interface LotFeature { ring: LatLng[]; props: Record<string, string | number>; }

/* ---------------- KML ---------------- */

export function parseKML(text: string): LineFeature[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("KML is malformed — export as plain KML from QGIS.");
  const out: LineFeature[] = [];
  doc.querySelectorAll("Placemark").forEach((pm) => {
    const name = pm.querySelector("name")?.textContent?.trim() ?? `centerline-${out.length + 1}`;
    pm.querySelectorAll("coordinates").forEach((c) => {
      const line = c.textContent!.trim().split(/\s+/)
        .map((t) => t.split(",").map(Number))
        .filter((p) => p.length >= 2 && isFinite(p[0]) && isFinite(p[1]))
        .map((p): LatLng => [p[1], p[0]]); // KML is lng,lat
      if (line.length >= 2) out.push({ name, line });
    });
  });
  if (!out.length) throw new Error("No LineString geometry found in the KML.");
  return out;
}

/* ---------------- GPX ---------------- */

export function parseGPX(text: string): LineFeature[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("GPX is malformed.");
  const out: LineFeature[] = [];
  doc.querySelectorAll("trk").forEach((trk, i) => {
    const name = trk.querySelector("name")?.textContent?.trim() ?? `track-${i + 1}`;
    trk.querySelectorAll("trkseg").forEach((seg) => {
      const line: LatLng[] = [];
      seg.querySelectorAll("trkpt").forEach((pt) => {
        const lat = parseFloat(pt.getAttribute("lat") ?? "");
        const lng = parseFloat(pt.getAttribute("lon") ?? "");
        if (isFinite(lat) && isFinite(lng)) line.push([lat, lng]);
      });
      if (line.length >= 2) out.push({ name, line });
    });
  });
  doc.querySelectorAll("rte").forEach((rte, i) => {
    const name = rte.querySelector("name")?.textContent?.trim() ?? `route-${i + 1}`;
    const line: LatLng[] = [];
    rte.querySelectorAll("rtept").forEach((pt) => {
      const lat = parseFloat(pt.getAttribute("lat") ?? "");
      const lng = parseFloat(pt.getAttribute("lon") ?? "");
      if (isFinite(lat) && isFinite(lng)) line.push([lat, lng]);
    });
    if (line.length >= 2) out.push({ name, line });
  });
  if (!out.length) throw new Error("No tracks or routes found in the GPX.");
  return out;
}

/* ---------------- GeoJSON ---------------- */

export function parseGeoJSON(text: string): { lots: LotFeature[]; lines: LineFeature[] } {
  const gj = JSON.parse(text);
  const feats: any[] = gj.type === "FeatureCollection" ? gj.features : [gj];
  const lots: LotFeature[] = [];
  const lines: LineFeature[] = [];
  feats.forEach((f, i) => {
    const g = f.geometry;
    const props = f.properties ?? {};
    if (!g) return;
    const name = props.name ?? props.NAME ?? props.road_name ?? `feature-${i + 1}`;
    if (g.type === "Polygon") {
      lots.push({ ring: g.coordinates[0].map((p: number[]): LatLng => [p[1], p[0]]), props });
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach((poly: number[][][]) =>
        lots.push({ ring: poly[0].map((p: number[]): LatLng => [p[1], p[0]]), props }));
    } else if (g.type === "LineString") {
      lines.push({ name, line: g.coordinates.map((p: number[]): LatLng => [p[1], p[0]]) });
    } else if (g.type === "MultiLineString") {
      g.coordinates.forEach((l: number[][], j: number) =>
        lines.push({ name: `${name} (${j + 1})`, line: l.map((p: number[]): LatLng => [p[1], p[0]]) }));
    }
  });
  if (!lots.length && !lines.length) throw new Error("No polygon or linestring features found in the GeoJSON.");
  return { lots, lines };
}

/* ---------------- Shapefile (.shp) — polygon reader ---------------- */

export function parseSHP(buffer: ArrayBuffer): LatLng[][] {
  const dv = new DataView(buffer);
  const magic = dv.getInt32(0, false);
  if (magic !== 9994) throw new Error("Not a valid shapefile (.shp) — check the file.");
  const shapeType = dv.getInt32(32, true);
  if (shapeType !== 5 && shapeType !== 15 && shapeType !== 0)
    throw new Error("Only polygon shapefiles are supported here (this one is type " + shapeType + ").");
  const fileLen = dv.getInt32(24, false) * 2; // 16-bit words → bytes
  const rings: LatLng[][] = [];
  let pos = 100;
  while (pos + 12 <= fileLen && pos + 12 <= buffer.byteLength) {
    const contentLen = dv.getInt32(pos + 4, false) * 2;
    const recStart = pos + 8;
    const st = dv.getInt32(recStart, true);
    if (st === 5 || st === 15) {
      const numParts = dv.getInt32(recStart + 36, true);
      const numPoints = dv.getInt32(recStart + 40, true);
      const parts: number[] = [];
      for (let i = 0; i < numParts; i++) parts.push(dv.getInt32(recStart + 44 + i * 4, true));
      const ptStart = recStart + 44 + numParts * 4;
      const pts: [number, number][] = [];
      for (let i = 0; i < numPoints; i++) {
        const x = dv.getFloat64(ptStart + i * 16, true);      // longitude
        const y = dv.getFloat64(ptStart + i * 16 + 8, true);  // latitude
        pts.push([y, x]);
      }
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        const b = i + 1 < parts.length ? parts[i + 1] : numPoints;
        let ring = pts.slice(a, b);
        if (ring.length > 3) {
          const f = ring[0], l = ring[ring.length - 1];
          if (f[0] === l[0] && f[1] === l[1]) ring = ring.slice(0, -1);
          if (ring.length >= 3) rings.push(ring);
        }
      }
    }
    pos = recStart + contentLen;
  }
  if (!rings.length) throw new Error("No polygon records decoded from the shapefile.");
  return rings;
}

/* ---------------- dBASE (.dbf) attribute reader ---------------- */

export function parseDBF(buffer: ArrayBuffer): Record<string, string | number>[] {
  const dv = new DataView(buffer);
  const numRec = dv.getUint32(4, true);
  const hdrLen = dv.getUint16(8, true);
  const recLen = dv.getUint16(10, true);
  const fields: { name: string; len: number }[] = [];
  let p = 32;
  while (p < hdrLen - 1 && dv.getUint8(p) !== 0x0d) {
    let name = "";
    for (let i = 0; i < 11 && dv.getUint8(p + i) !== 0; i++) name += String.fromCharCode(dv.getUint8(p + i));
    fields.push({ name: name.trim(), len: dv.getUint8(p + 16) });
    p += 32;
  }
  const bytes = new Uint8Array(buffer);
  const dec = new TextDecoder("latin1");
  const rows: Record<string, string | number>[] = [];
  for (let r = 0; r < numRec; r++) {
    const off = hdrLen + r * recLen;
    if (off + recLen > buffer.byteLength) break;
    if (bytes[off] === 0x2a) continue; // deleted record
    const row: Record<string, string | number> = {};
    let c = off + 1;
    for (const f of fields) {
      const raw = dec.decode(bytes.slice(c, c + f.len)).trim();
      const num = Number(raw);
      row[f.name] = raw !== "" && isFinite(num) && /^-?[\d.]+$/.test(raw) ? num : raw;
      c += f.len;
    }
    rows.push(row);
  }
  return rows;
}

/* ---------------- file helpers ---------------- */

export const readText = (f: File) => f.text();
export const readBuffer = (f: File) => f.arrayBuffer();

export function detectKind(file: File): "shp" | "dbf" | "geojson" | "kml" | "gpx" | null {
  const n = file.name.toLowerCase();
  if (n.endsWith(".shp")) return "shp";
  if (n.endsWith(".dbf")) return "dbf";
  if (n.endsWith(".geojson") || n.endsWith(".json")) return "geojson";
  if (n.endsWith(".kml")) return "kml";
  if (n.endsWith(".gpx")) return "gpx";
  return null;
}
