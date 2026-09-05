import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Popup, Tooltip, ScaleControl, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "../lib/geo";
import { lineLengthM, fmtArea, fmtKm, polygonAreaM2 } from "../lib/geo";
import { parseKML, parseGPX, parseGeoJSON, parseSHP, parseDBF, detectKind, readText, readBuffer, type LotFeature } from "../lib/vectorFormats";
import {
  generateSampleCadastral, runROWAnalysis, seedCenterlines,
  type Parcel, type Centerline, type AffectedLot,
} from "../data/cadastre";
import { BARANGAY_POINTS } from "../data/roads";
import {
  useStore, setParcels as storeSetParcels, setCenterlinesAll,
} from "../state/store";
import { PageHeader, Reveal, CornerTicks, CountUp } from "../components/ui";
import { toast } from "../components/toast";
import ConfirmDialog from "../components/confirm";
import { IconPin, IconEdit, IconTrash, IconDownload, IconPlus, IconCheck } from "../components/icons";
import BarangayRegistry from "../components/BarangayRegistry";

const BASEMAPS = {
  street: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", label: "OSM street", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", label: "Satellite", attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics" },
};

const CITY: [number, number] = [9.7405, 118.7372];

/* ---------- map internals ---------- */
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    map.fitBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ], { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function DrawEvents({ active, onPoint, onCursor }: {
  active: boolean;
  onPoint: (p: LatLng) => void;
  onCursor: (p: LatLng | null) => void;
}) {
  useMapEvents({
    click: (e) => { if (active) onPoint([e.latlng.lat, e.latlng.lng]); },
    mousemove: (e) => onCursor([e.latlng.lat, e.latlng.lng]),
    mouseout: () => onCursor(null),
  });
  return null;
}

type Tab = "cadastre" | "centerlines" | "affected" | "barangays";

export default function LotAnalysis({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { records, parcels: parcelsAll, centerlines, barangays } = useStore();
  /* shims — map the old local-state API onto the shared store */
  const parcels = parcelsAll;
  const setParcels = (v: Parcel[] | null) => storeSetParcels(v ?? []);
  const setCenterlines = (updater: (prev: Centerline[]) => Centerline[]) => setCenterlinesAll(updater(centerlines));
  const [tab, setTab] = useState<Tab>("cadastre");
  const [selCL, setSelCL] = useState<string>(seedCenterlines[0]?.id ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [delCL, setDelCL] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<false | { redrawId: string | null }>(false);
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [cursor, setCursor] = useState<LatLng | null>(null);
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>("street");
  const [layers, setLayers] = useState({ lots: true, corridor: true, lines: true, brgy: true });
  const [hoverLot, setHoverLot] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const shpBuf = useRef<ArrayBuffer | null>(null);
  const cadFileRef = useRef<HTMLInputElement>(null);
  const lineFileRef = useRef<HTMLInputElement>(null);

  const cl = centerlines.find((c) => c.id === selCL) ?? centerlines[0] ?? null;

  /* analysis — recomputed live whenever the centerline or cadastre changes */
  const analysis = useMemo(
    () => (parcels && cl ? runROWAnalysis(parcels, cl) : null),
    [parcels, cl]
  );
  const affectedIds = useMemo(() => new Set(analysis?.rows.map((r) => r.lotId) ?? []), [analysis]);

  const fitPoints = useMemo<LatLng[]>(() => {
    const pts: LatLng[] = [];
    if (cl) pts.push(...cl.line);
    parcels?.slice(0, 400).forEach((p) => pts.push(p.ring[0]));
    return pts;
  }, [cl, parcels]);

  /* ---------- cadastre ingestion ---------- */
  const ingestCadastralFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const shp = list.find((f) => detectKind(f) === "shp");
    const dbf = list.find((f) => detectKind(f) === "dbf");
    const gj = list.find((f) => detectKind(f) === "geojson");
    try {
      let lots: LotFeature[] = [];
      if (shp) {
        shpBuf.current = await readBuffer(shp);
        const rings = parseSHP(shpBuf.current);
        const rows = dbf ? parseDBF(await readBuffer(dbf)) : [];
        lots = rings.map((ring, i) => ({ ring, props: rows[i] ?? {} }));
      } else if (gj) {
        lots = parseGeoJSON(await readText(gj)).lots;
        if (!lots.length) throw new Error("GeoJSON has no polygon features.");
      } else {
        throw new Error("Select a shapefile pair (.shp + .dbf) or a .geojson export from QGIS.");
      }
      const next: Parcel[] = lots.map((l, i) => {
        const id = String(l.props.LOT_ID ?? l.props.lot_id ?? l.props.PIN ?? `LOT-UPL-${String(i + 1).padStart(3, "0")}`);
        const owner = String(l.props.OWNER ?? l.props.owner ?? l.props.OWNER_NAME ?? "—");
        const gov = /gov|city|lgU|barangay|deped|dpwh|psa|public/i.test(owner) || String(l.props.OWNERTYPE ?? "").toLowerCase() === "government";
        const [la, ln] = [l.ring.reduce((s, p) => s + p[0], 0) / l.ring.length, l.ring.reduce((s, p) => s + p[1], 0) / l.ring.length];
        let brgy = "—";
        let bd = Infinity;
        for (const b of barangays) {
          const d = (b.lat - la) ** 2 + (b.lng - ln) ** 2;
          if (d < bd) { bd = d; brgy = b.name; }
        }
        const rawVal = l.props.ZONAL_VAL ?? l.props.zonal_val ?? l.props.MV ?? l.props.mv ?? l.props.VALUE ?? l.props.value;
        const valuePerM2 = gov ? 0 : (typeof rawVal === "number" && isFinite(rawVal) && rawVal > 0 ? Math.round(rawVal) : 5000);
        return { id, ring: l.ring, owner: owner === "—" ? `Owner of ${id}` : owner, ownerType: gov ? "Government" as const : "Private" as const, barangay: brgy, areaM2: Math.round(polygonAreaM2(l.ring)), valuePerM2 };
      });
      setParcels(next);
      setFitKey((k) => k + 1);
      toast(`${next.length} lots loaded`, "saved", shp ? `${shp.name}${dbf ? " + " + dbf.name : " (no .dbf)"}` : (gj?.name ?? ""));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Cadastral ingest failed", "deleted", "check the file format");
    }
  };

  /* ---------- centerline ingestion (KML / GPX / GeoJSON) ---------- */
  const ingestLineFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    let added = 0;
    for (const f of list) {
      const kind = detectKind(f);
      try {
        const feats = kind === "kml" ? parseKML(await readText(f))
          : kind === "gpx" ? parseGPX(await readText(f))
          : kind === "geojson" ? parseGeoJSON(await readText(f)).lines
          : [];
        if (!feats.length && kind !== "geojson") throw new Error(`No linestrings found in ${f.name}.`);
        feats.forEach((ft, i) => {
          const id = `CL-${String(Date.now()).slice(-5)}${i}`;
          setCenterlines((prev) => [...prev, { id, name: ft.name, line: ft.line, radiusM: 8, projectId: "", source: `${(kind ?? "").toUpperCase()} · ${f.name}` }]);
          added++;
        });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Line ingest failed", "deleted", f.name);
      }
    }
    if (added) { toast(`${added} centerline${added > 1 ? "s" : ""} registered`, "saved", "road axis · KML/GPX"); setTab("centerlines"); }
  };

  /* ---------- centerline CRUD ---------- */
  const finishDraft = () => {
    if (draft.length < 2) { toast("A centerline needs at least 2 stations", "info", `${draft.length} point${draft.length === 1 ? "" : "s"} drawn`); return; }
    if (drawing && drawing.redrawId) {
      setCenterlines((prev) => prev.map((c) => (c.id === drawing.redrawId ? { ...c, line: draft, source: "Redrawn on map" } : c)));
      toast("Centerline geometry replaced", "updated", `${draft.length} vertices · WGS 84`);
    } else {
      const id = `CL-${String(Date.now()).slice(-5)}`;
      setCenterlines((prev) => [...prev, { id, name: "Drawn centerline", line: draft, radiusM: 8, projectId: "", source: "Drawn on map console" }]);
      setSelCL(id);
      toast("Centerline added", "saved", `${id} · ${draft.length} vertices`);
    }
    setDraft([]); setDrawing(false); setTab("centerlines");
  };

  const exportAffected = () => {
    if (!analysis || !cl) return;
    const head = "lot_id,owner,owner_type,barangay,total_sqm,affected_sqm,pct_affected,centerline,radius_m";
    const rows = analysis.rows.map((r) => [r.lotId, `"${r.owner}"`, r.ownerType, r.barangay, r.totalM2, r.affectedM2, r.pct, cl.id, cl.radiusM].join(","));
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `row_affected_lots_${cl.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const stats = useMemo(() => {
    if (!parcels) return null;
    const gov = parcels.filter((p) => p.ownerType === "Government");
    const pvt = parcels.filter((p) => p.ownerType === "Private");
    const area = parcels.reduce((s, p) => s + p.areaM2, 0);
    const brgy = new Set(parcels.map((p) => p.barangay)).size;
    return { gov, pvt, area, brgy };
  }, [parcels]);

  const agg = useMemo(() => {
    if (!analysis) return null;
    const pvt = analysis.rows.filter((r) => r.ownerType === "Private");
    const gov = analysis.rows.filter((r) => r.ownerType === "Government");
    return {
      pvtN: pvt.length, pvtA: pvt.reduce((s, r) => s + r.affectedM2, 0),
      govN: gov.length, govA: gov.reduce((s, r) => s + r.affectedM2, 0),
      totalA: analysis.rows.reduce((s, r) => s + r.affectedM2, 0),
      cost: analysis.rows.reduce((s, r) => s + r.cost, 0),
    };
  }, [analysis]);

  const TabBtn = ({ id, label, n }: { id: Tab; label: string; n?: number }) => (
    <button onClick={() => setTab(id)}
      className={`relative cursor-pointer px-3.5 py-2.5 font-display text-[17px] font-bold tracking-wider uppercase transition-colors ${tab === id ? "bg-paper-100 text-ink-900" : "bg-ink-800 text-paper-300/60 hover:text-paper-100"}`}>
      {label}
      {n !== undefined && <span className={`ml-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${tab === id ? "bg-amber-500 text-ink-950" : "bg-ink-950 text-amber-400"}`}>{n}</span>}
      {tab === id && <span className="absolute inset-x-0 top-0 h-[3px] bg-amber-500" />}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-CAD-05"
        title="Lot & ROW Analysis"
        subtitle="QGIS shapefile cadastre joined against barangay boundaries, road centerlines from KML / GPX capture, and a flat-sided parallel buffer that clips every affected lot — computing area and government / private ownership for right-of-way accounting."
      />

      {/* pipeline strip */}
      <Reveal className="mt-5">
        <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 font-mono text-[10px] uppercase">
          {[
            ["01", "QGIS shapefile", "cadastre_lot · .shp+.dbf / .geojson"],
            ["02", "Barangay join", "ST_Intersects(lot, brgy_boundary)"],
            ["03", "Centerline axis", "KML / GPX / drawn linestring"],
            ["04", "Parallel buffer", "offset radius · butt endcaps"],
            ["05", "Clip & attribute", "ST_Intersection → affected area + owner"],
          ].map(([n, t, s], i, arr) => (
            <div key={n} className="relative flex min-w-[168px] flex-1 flex-col justify-center bg-ink-900 px-3.5 py-3 transition-colors hover:bg-ink-850">
              <span className="font-display text-[15px] font-bold text-amber-400">{n}</span>
              <span className="mt-0.5 font-bold tracking-[0.14em] text-paper-100">{t}</span>
              <span className="mt-0.5 text-[9px] tracking-wide text-paper-300/45 normal-case">{s}</span>
              {i < arr.length - 1 && <span className="absolute top-1/2 -right-1.5 z-10 -translate-y-1/2 text-amber-500">▸</span>}
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* ─────────── MAP (hidden on the barangays tab to give the registry full width) ─────────── */}
        {tab === "barangays" ? null : <div className="lg:col-span-7 xl:col-span-8">
          <Reveal className="lg:sticky lg:top-4">
            <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800">
              <CornerTicks />
              <MapContainer center={CITY} zoom={14} minZoom={10} maxZoom={18} zoomControl={false}
                doubleClickZoom={false} className="h-[460px] w-full sm:h-[560px] xl:h-[640px]">
                <TileLayer url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} />
                <ScaleControl position="bottomleft" imperial={false} />
                <DrawEvents active={!!drawing} onPoint={(p) => setDraft((d) => [...d, p])} onCursor={setCursor} />
                {fitKey >= 0 && <FitBounds key={fitKey} points={fitPoints.length > 3 ? fitPoints : [CITY, [9.75, 118.75]]} />}

                {/* barangay centroids */}
                {layers.brgy && Object.entries(BARANGAY_POINTS).map(([name, pt]) => (
                  <CircleMarker key={name} center={pt} radius={2.5}
                    pathOptions={{ color: "#175c43", weight: 1, fillColor: "#1e7a58", fillOpacity: 0.6 }} interactive={false}>
                    <Tooltip className="rpis-tip" direction="top" offset={[0, -4]}>{name}</Tooltip>
                  </CircleMarker>
                ))}

                {/* cadastral lots */}
                {layers.lots && parcels?.map((p) => {
                  const hit = affectedIds.has(p.id);
                  const hovered = hoverLot === p.id;
                  const col = hit ? (p.ownerType === "Government" ? "#1e7a58" : "#de5a36") : "#16291f";
                  return (
                    <Polygon key={p.id} positions={p.ring}
                      pathOptions={{
                        color: col, weight: hovered ? 2.5 : hit ? 1.6 : 0.8,
                        fillColor: col, fillOpacity: hit ? (hovered ? 0.6 : 0.42) : hovered ? 0.25 : 0.1,
                      }}
                      eventHandlers={{ mouseover: () => setHoverLot(p.id), mouseout: () => setHoverLot(null) }}>
                      <Popup className="rpis-popup" minWidth={210}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, minWidth: 190 }}>
                          <p style={{ color: "#f0a32b", letterSpacing: "0.14em", fontSize: 9, margin: 0 }}>{p.id} · {p.barangay}</p>
                          <p style={{ color: "#f5f7f0", fontSize: 12, fontWeight: 700, margin: "3px 0" }}>{p.owner}</p>
                          <p style={{ color: p.ownerType === "Government" ? "#2f9a70" : "#ef7450", fontSize: 9, letterSpacing: "0.12em" }}>{p.ownerType.toUpperCase()} · {fmtArea(p.areaM2)}</p>
                          {hit && <p style={{ color: "#ffc24d", marginTop: 4, fontSize: 9 }}>AFFECTED — see Affected Lots register</p>}
                        </div>
                      </Popup>
                    </Polygon>
                  );
                })}

                {/* corridor + centerline */}
                {analysis && layers.corridor && analysis.corridorRing.length > 2 && (
                  <Polygon positions={analysis.corridorRing} interactive={false}
                    pathOptions={{ color: "#cf8812", weight: 1.5, fillColor: "#ffc24d", fillOpacity: 0.2, dashArray: "6 4" }} />
                )}
                {layers.lines && centerlines.map((c) => {
                  const active = c.id === cl?.id;
                  return (
                    <Polyline key={c.id} positions={c.line}
                      pathOptions={{ color: active ? "#07110c" : "#47584d", weight: active ? 6 : 3, opacity: active ? 0.9 : 0.5 }}
                      eventHandlers={{ click: () => setSelCL(c.id) }}>
                      <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
                        {c.name} · r = {c.radiusM} m · {fmtKm(lineLengthM(c.line))}
                      </Tooltip>
                    </Polyline>
                  );
                })}
                {layers.lines && cl && (
                  <Polyline positions={cl.line} interactive={false} pathOptions={{ color: "#f0a32b", weight: 2.5, opacity: 0.95 }} />
                )}

                {/* draft line */}
                {draft.length > 0 && (
                  <>
                    <Polyline positions={draft} interactive={false} pathOptions={{ color: "#de5a36", weight: 3, dashArray: "7 5" }} />
                    {draft.map((p, i) => (
                      <CircleMarker key={i} center={p} radius={4} interactive={false}
                        pathOptions={{ color: "#07110c", weight: 1.5, fillColor: "#ffc24d", fillOpacity: 1 }} />
                    ))}
                  </>
                )}
              </MapContainer>

              {/* drawing toolbar */}
              {drawing && (
                <div className="absolute inset-x-3 top-3 z-[600] flex items-center gap-2 rounded-[3px] border-2 border-coral-500 bg-ink-950/95 px-3 py-2 backdrop-blur">
                  <span className="dot-live h-2 w-2 rounded-full bg-coral-500" />
                  <p className="font-mono text-[10.5px] font-bold tracking-[0.14em] text-paper-100 uppercase">
                    Drawing centerline — click stations · {draft.length} pt{draft.length === 1 ? "" : "s"}
                  </p>
                  <button onClick={finishDraft}
                    className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-amber-500 px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-ink-950 uppercase hover:bg-amber-400">
                    <IconCheck size={12} /> Finish
                  </button>
                  <button onClick={() => { setDrawing(false); setDraft([]); }}
                    className="cursor-pointer rounded-[3px] border border-ink-600 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-paper-300/70 uppercase hover:text-paper-100">
                    Cancel
                  </button>
                </div>
              )}

              {/* basemap + layer chips */}
              <div className="absolute top-3 right-3 z-[600] flex rounded-[3px] border border-ink-600 bg-ink-900/90 p-0.5 backdrop-blur">
                {(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((k) => (
                  <button key={k} onClick={() => setBasemap(k)}
                    className={`cursor-pointer rounded-[2px] px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-all ${basemap === k ? "bg-amber-500 text-ink-950" : "text-paper-300/60 hover:text-paper-100"}`}>
                    {BASEMAPS[k].label}
                  </button>
                ))}
              </div>
              {!drawing && (
                <div className="absolute top-14 left-3 z-[600] flex flex-col gap-1.5">
                  {([["lots", `Cadastral lots · ${parcels?.length ?? 0}`], ["corridor", "Parallel buffer"], ["lines", `Centerlines · ${centerlines.length}`], ["brgy", "Barangay centroids"]] as [keyof typeof layers, string][]).map(([k, label]) => (
                    <button key={k} onClick={() => setLayers((p) => ({ ...p, [k]: !p[k] }))}
                      className={`cursor-pointer rounded-[3px] border px-2 py-1 text-left font-mono text-[10px] tracking-[0.12em] uppercase backdrop-blur transition-all ${layers[k] ? "border-amber-500/60 bg-ink-900/90 text-amber-300" : "border-ink-600 bg-ink-900/70 text-paper-300/40 hover:text-paper-300/70"}`}>
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${layers[k] ? "bg-amber-400" : "bg-paper-300/30"}`} />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* coord readout */}
              <div className="absolute right-0 bottom-0 left-0 z-[600] flex items-center justify-between gap-3 border-t border-ink-700 bg-ink-950/95 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.12em] text-paper-300/70 uppercase">
                <span className="tabular">
                  {cursor ? <>{cursor[0].toFixed(5)}° N · {cursor[1].toFixed(5)}° E — WGS 84</> : <>hover for WGS 84 readout</>}
                </span>
                <span className="hidden sm:inline">
                  {cl ? <>axis <b className="text-amber-400">{cl.id}</b> · r = <b className="text-amber-400">{cl.radiusM} m</b> · {fmtKm(lineLengthM(cl.line))}</> : "no centerline"}
                </span>
              </div>
            </div>
          </Reveal>
        </div>}

        {/* ─────────── PANELS ─────────── */}
        <div className={tab === "barangays" ? "lg:col-span-12" : "lg:col-span-5 xl:col-span-4"}>
          <div className="flex overflow-hidden rounded-t-[4px] border-2 border-b-0 border-ink-800">
            <TabBtn id="cadastre" label="Cadastre" n={parcels?.length ?? 0} />
            <TabBtn id="centerlines" label="Centerlines" n={centerlines.length} />
            <TabBtn id="affected" label="Affected" n={analysis?.rows.length ?? 0} />
            <TabBtn id="barangays" label="Barangays" n={barangays.length} />
          </div>

          {/* CADASTRE */}
          {tab === "cadastre" && (
            <div className="anim-fade-in rounded-b-[4px] border-2 border-ink-800 bg-paper-100 p-4">
              <p className="font-mono text-[10px] leading-relaxed tracking-wide text-text-600">
                Load the lot layer exported from QGIS — select the <b>.shp + .dbf pair</b> (WGS 84), or a GeoJSON.
                Every lot is joined to its barangay on ingest.
              </p>
              <input ref={cadFileRef} type="file" multiple accept=".shp,.dbf,.geojson,.json" className="hidden"
                onChange={(e) => { if (e.target.files?.length) ingestCadastralFiles(e.target.files); e.target.value = ""; }} />
              <button onClick={() => cadFileRef.current?.click()}
                className="group mt-3 flex w-full cursor-pointer flex-col items-center gap-1 rounded-[4px] border-2 border-dashed border-line-400 bg-white/40 px-4 py-6 transition-all hover:border-pine-600 hover:bg-pine-600/5">
                <IconDownload size={20} className="rotate-180 text-pine-600 transition-transform group-hover:-translate-y-0.5" />
                <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-900 uppercase">Upload QGIS shapefile / GeoJSON</span>
                <span className="font-mono text-[9.5px] text-text-400">.shp + .dbf (multi-select) · .geojson</span>
              </button>
              <button onClick={() => { setParcels(generateSampleCadastral()); setFitKey((k) => k + 1); toast("Sample cadastre loaded", "saved", "PPC demo extent · seeded lots"); }}
                className="mt-2 w-full cursor-pointer rounded-[3px] border border-ink-800 bg-ink-900 py-2.5 font-mono text-[10.5px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800">
                Load sample cadastral (PPC demo extent)
              </button>

              {stats ? (
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line-400 bg-line-300">
                    {[
                      ["Lots on record", <CountUp key="a" value={parcels!.length} />],
                      ["Cadastral area", <CountUp key="b" value={stats.area / 10000} decimals={1} suffix=" ha" />],
                      ["Barangays hit", <CountUp key="c" value={stats.brgy} />],
                      ["Gov / private", `${stats.gov.length} / ${stats.pvt.length}`],
                    ].map(([k, v]) => (
                      <div key={k as string} className="bg-paper-100 px-3 py-2.5">
                        <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">{k}</p>
                        <p className="font-display mt-0.5 text-[26px] leading-none font-bold text-ink-900">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-[3px] border border-pine-600/50 bg-pine-600/10 p-3">
                      <p className="font-mono text-[9px] font-bold tracking-[0.14em] text-pine-600 uppercase">Government</p>
                      <p className="font-display mt-1 text-[22px] leading-none font-bold text-ink-900">{stats.gov.length} lots</p>
                      <p className="mt-1 font-mono text-[10px] text-text-600">{fmtArea(stats.gov.reduce((s, p) => s + p.areaM2, 0))}</p>
                    </div>
                    <div className="rounded-[3px] border border-coral-500/50 bg-coral-500/10 p-3">
                      <p className="font-mono text-[9px] font-bold tracking-[0.14em] text-coral-600 uppercase">Private</p>
                      <p className="font-display mt-1 text-[22px] leading-none font-bold text-ink-900">{stats.pvt.length} lots</p>
                      <p className="mt-1 font-mono text-[10px] text-text-600">{fmtArea(stats.pvt.reduce((s, p) => s + p.areaM2, 0))}</p>
                    </div>
                  </div>
                  <p className="mt-3 font-mono text-[9px] leading-relaxed text-text-400">
                    Barangay assignment = spatial join against brgy_boundary (ST_Intersects). Demo seed uses deterministic lots; uploads keep original attributes.
                  </p>
                </div>
              ) : (
                <p className="mt-4 rounded-[3px] border border-dashed border-line-400 px-3 py-4 text-center font-mono text-[10.5px] text-text-400">
                  No cadastre loaded — upload a shapefile or load the sample.
                </p>
              )}
            </div>
          )}

          {/* CENTERLINES */}
          {tab === "centerlines" && (
            <div className="anim-fade-in rounded-b-[4px] border-2 border-ink-800 bg-paper-100 p-4">
              <div className="flex flex-wrap gap-2">
                <input ref={lineFileRef} type="file" multiple accept=".kml,.gpx,.geojson,.json" className="hidden"
                  onChange={(e) => { if (e.target.files?.length) ingestLineFiles(e.target.files); e.target.value = ""; }} />
                <button onClick={() => lineFileRef.current?.click()}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-ink-900 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-amber-400 uppercase transition-all hover:bg-ink-800">
                  <IconPlus size={12} /> Add · KML / GPX
                </button>
                <button onClick={() => { setDrawing({ redrawId: null }); setDraft([]); }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-ink-800 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-900 uppercase transition-all hover:bg-ink-900 hover:text-paper-100">
                  <IconPin size={12} /> Draw on map
                </button>
              </div>
              <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-text-400">
                Imported KML / GPX linestrings become road-project centerlines. The buffer offset (radius) is variable per line; ends stay square at the start/end stations.
              </p>
              <ul className="mt-3 space-y-2.5">
                {centerlines.map((c) => {
                  const isSel = c.id === cl?.id;
                  const isEd = editing === c.id;
                  return (
                    <li key={c.id}
                      className={`rounded-[4px] border p-3 transition-all ${isSel ? "border-amber-500 bg-amber-500/[0.07] shadow-[0_6px_18px_rgba(240,163,43,0.12)]" : "border-line-300 bg-white/50 hover:border-ink-800"}`}
                      onClick={() => setSelCL(c.id)}>
                      <div className="flex items-center justify-between gap-2">
                        {isEd ? (
                          <input defaultValue={c.name} autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => { if (e.key === "Enter") { setCenterlines((prev) => prev.map((x) => x.id === c.id ? { ...x, name: (e.target as HTMLInputElement).value } : x)); setEditing(null); toast("Centerline updated", "updated", c.id); } }}
                            className="w-full rounded-[3px] border border-amber-500 bg-white px-2 py-1 font-mono text-[11.5px] text-ink-900 focus:outline-none" />
                        ) : (
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-ink-900">{c.name}</p>
                            <p className="font-mono text-[9px] tracking-wider text-text-400 uppercase">{c.id} · {c.source}</p>
                          </div>
                        )}
                        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {isEd ? (
                            <button onClick={() => { setEditing(null); }} className="cursor-pointer rounded-[3px] bg-pine-600 px-2 py-1.5 font-mono text-[9px] font-bold text-paper-100 uppercase hover:bg-pine-500">Save</button>
                          ) : (
                            <button title="Edit" onClick={() => setEditing(c.id)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-600 transition-colors hover:border-pine-600 hover:text-pine-600"><IconEdit size={12} /></button>
                          )}
                          <button title="Redraw geometry" onClick={() => { setDrawing({ redrawId: c.id }); setDraft([]); }}
                            className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-600 transition-colors hover:border-teal-500 hover:text-teal-500"><IconPin size={12} /></button>
                          <button title="Delete" onClick={() => setDelCL(c.id)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-600 transition-colors hover:border-coral-500 hover:text-coral-500"><IconTrash size={12} /></button>
                        </div>
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-[10px] text-text-600">
                        <span>{c.line.length} vtx</span>
                        <span className="tabular">{fmtKm(lineLengthM(c.line))}</span>
                        <span className="tabular">len × 2r corridor</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <span className="shrink-0 font-mono text-[9px] font-bold tracking-[0.12em] text-text-600 uppercase">Offset r</span>
                        <input type="range" min={3} max={20} step={0.5} value={c.radiusM}
                          onChange={(e) => setCenterlines((prev) => prev.map((x) => (x.id === c.id ? { ...x, radiusM: parseFloat(e.target.value) } : x)))}
                          className="rpis-slider flex-1"
                          style={{ "--track": `linear-gradient(90deg, #f0a32b ${((c.radiusM - 3) / 17) * 100}%, #cbd4c2 ${((c.radiusM - 3) / 17) * 100}%)` } as React.CSSProperties} />
                        <span className="w-12 shrink-0 text-right font-mono text-[11.5px] font-bold text-ink-900 tabular">{c.radiusM} m</span>
                      </div>

                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <select value={c.projectId}
                          onChange={(e) => { setCenterlines((prev) => prev.map((x) => (x.id === c.id ? { ...x, projectId: e.target.value } : x))); toast("Centerline linked", "updated", `${c.id} → ${e.target.value || "unlinked"}`); }}
                          className="w-full cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2 py-1.5 font-mono text-[10.5px] text-ink-900 focus:border-amber-600 focus:outline-none">
                          <option value="">— link to project record —</option>
                          {records.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* AFFECTED LOTS */}
          {tab === "affected" && (
            <div className="anim-fade-in rounded-b-[4px] border-2 border-ink-800 bg-paper-100 p-4">
              {!parcels || !cl ? (
                <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-5 text-center font-mono text-[10.5px] text-text-400">
                  Load a cadastre and keep a centerline selected — the clip runs automatically.
                </p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[10px] tracking-wider text-text-600 uppercase">
                      Corridor <b className="text-ink-900">{cl.id}</b> · r = {cl.radiusM} m
                    </p>
                    <button onClick={exportAffected} className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-ink-900 px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-amber-400 uppercase transition-all hover:bg-ink-800">
                      <IconDownload size={11} /> CSV
                    </button>
                  </div>
                  {agg && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[3px] border-2 border-coral-500/60 bg-coral-500/[0.07] px-3.5 py-2.5">
                      <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-coral-600 uppercase">
                        Estimated ROW acquisition cost · private lots only
                      </p>
                      <p className="font-display text-[26px] leading-none font-bold text-coral-600 tabular">
                        ₱{agg.cost.toLocaleString("en-PH")}
                      </p>
                    </div>
                  )}
                  {agg && (
                    <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line-400 bg-line-300">
                      <div className="bg-ink-900 px-3 py-3">
                        <p className="font-mono text-[8.5px] tracking-[0.14em] text-paper-300/50 uppercase">Lots affected</p>
                        <p className="font-display mt-1 text-[30px] leading-none font-bold text-amber-400"><CountUp value={analysis!.rows.length} /></p>
                      </div>
                      <div className="bg-ink-900 px-3 py-3">
                        <p className="font-mono text-[8.5px] tracking-[0.14em] text-paper-300/50 uppercase">Corridor area</p>
                        <p className="font-display mt-1 text-[30px] leading-none font-bold text-paper-100">{fmtArea(analysis!.corridorAreaM2)}</p>
                      </div>
                      <div className="bg-paper-100 px-3 py-2.5">
                        <p className="font-mono text-[8.5px] font-bold tracking-[0.14em] text-coral-600 uppercase">Private (ROW acquisition)</p>
                        <p className="font-display mt-0.5 text-[22px] leading-none font-bold text-ink-900">{agg.pvtN} lots</p>
                        <p className="mt-1 font-mono text-[10px] text-text-600">{fmtArea(agg.pvtA)} affected</p>
                      </div>
                      <div className="bg-paper-100 px-3 py-2.5">
                        <p className="font-mono text-[8.5px] font-bold tracking-[0.14em] text-pine-600 uppercase">Government</p>
                        <p className="font-display mt-0.5 text-[22px] leading-none font-bold text-ink-900">{agg.govN} lots</p>
                        <p className="mt-1 font-mono text-[10px] text-text-600">{fmtArea(agg.govA)} affected</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 max-h-[380px] overflow-y-auto rounded-[3px] border border-line-300">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-ink-900 text-paper-300">
                        <tr className="[&>th]:px-2.5 [&>th]:py-2 [&>th]:font-mono [&>th]:text-[9px] [&>th]:font-semibold [&>th]:tracking-[0.12em] [&>th]:uppercase">
                          <th className="text-left">Lot / Owner</th>
                          <th className="text-left">Type</th>
                          <th className="text-right">Affected</th>
                          <th className="text-right">%</th>
                          <th className="text-right">₱ / m²</th>
                          <th className="text-right">ROW Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-300">
                        {analysis!.rows.map((r: AffectedLot) => (
                          <tr key={r.lotId} className="transition-colors hover:bg-ink-900/[0.05]">
                            <td className="px-2.5 py-2">
                              <p className="text-[12px] font-bold text-ink-900">{r.lotId}</p>
                              <p className="truncate font-mono text-[9px] text-text-400">{r.owner} · {r.barangay}</p>
                            </td>
                            <td className="px-2.5 py-2">
                              <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider uppercase ${r.ownerType === "Government" ? "bg-pine-600/15 text-pine-600" : "bg-coral-500/15 text-coral-600"}`}>
                                {r.ownerType === "Government" ? "GOV" : "PVT"}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono text-[11px] font-semibold text-ink-900 tabular">{fmtArea(r.affectedM2)}</td>
                            <td className="px-2.5 py-2">
                              <span className="flex items-center justify-end gap-1.5">
                                <span className="h-[6px] w-10 overflow-hidden rounded-full bg-ink-900/10">
                                  <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 80 ? "#de5a36" : "#f0a32b" }} />
                                </span>
                                <span className="w-8 text-right font-mono text-[10px] font-bold text-ink-900 tabular">{r.pct}%</span>
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono text-[10.5px] text-text-600 tabular">
                              {r.ownerType === "Government" ? <span className="text-pine-600">public</span> : `₱${r.valuePerM2.toLocaleString()}`}
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono text-[11px] font-bold tabular">
                              {r.cost === 0
                                ? <span className="font-semibold text-pine-600">₱0 · no acquisition</span>
                                : <span className="text-coral-600">₱{(r.cost / 1e6).toFixed(2)}M</span>}
                            </td>
                          </tr>
                        ))}
                        {analysis!.rows.length === 0 && (
                          <tr><td colSpan={6} className="px-3 py-6 text-center font-mono text-[10.5px] text-text-400">No lots intersect this corridor.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2.5 font-mono text-[9px] leading-relaxed text-text-400">
                    Clip = ST_Intersection(lot.geom, ST_Buffer(axis, {cl.radiusM}, 'endcap=flat join=mitre')) — browser preview uses segment-quad planar clipping; production runs in PostGIS.
                  </p>
                </>
              )}
            </div>
          )}

          {/* BARANGAY REGISTRY — expands to full width (map hidden on this tab) */}
          {tab === "barangays" && (
            <div className="mt-4">
              <BarangayRegistry onLocate={onLocate} />
            </div>
          )}
        </div>
      </div>

      {/* locate CTA — jump corridor station to main console */}
      {cl && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border-2 border-ink-800 bg-ink-900 px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.14em] text-paper-300/60 uppercase">
            Active axis <b className="text-amber-400">{cl.name}</b> — {fmtKm(lineLengthM(cl.line))} · buffer ±{cl.radiusM} m
          </p>
          <button onClick={() => onLocate(cl.line[Math.floor(cl.line.length / 2)], 16)}
            className="flex cursor-pointer items-center gap-2 rounded-[3px] bg-amber-500 px-4 py-2 font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-all hover:bg-amber-400">
            <IconPin size={13} /> Open in geospatial console
          </button>
        </div>
      )}

      {delCL && (
        <ConfirmDialog
          title="Delete centerline"
          sheet="project_axis · DELETE"
          confirmLabel="Delete line"
          message={<p><b className="text-ink-900">{delCL}</b> and its buffer corridor will be removed. Affected-lot results depending on it are discarded.</p>}
          onConfirm={() => {
            setCenterlines((prev) => prev.filter((c) => c.id !== delCL));
            toast("Centerline deleted", "deleted", delCL);
            if (selCL === delCL) setSelCL("");
          }}
          onClose={() => setDelCL(null)}
        />
      )}
    </div>
  );
}


