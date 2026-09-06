/* Geospatial console map — OSM/Esri (no API keys). Draws only ledger-scoped
   linked roads, status-colored project axes, and resolved station pins. */

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, ScaleControl, Tooltip, Popup, useMap } from "react-leaflet";
import type { Road } from "../data/roads";
import { statusOf, typeAbbr, fmtPesoM, barangayLabel } from "../data/registry";
import { useStore, recordPoint, pinSourceOf } from "../state/store";
import { lineLengthM, fmtKm } from "../lib/geo";
import { conditionMeta, classMeta, fmtCoord, prefersReduced } from "./ui";

export interface Focus { point: [number, number]; zoom?: number; key: number; }

const BASEMAPS = {
  street: {
    label: "Street · OSM",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    label: "Satellite · Esri",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
  },
};

interface Layers { roads: boolean; axes: boolean; pins: boolean; barangays: boolean; }

export default function MapView({ roads, focus, onLocate }: {
  roads: Road[];
  focus: Focus | null;
  onLocate?: (road: Road) => void;
}) {
  const { records, contractors, barangays, centerlines } = useStore();
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>("street");
  const [layers, setLayers] = useState<Layers>({ roads: true, axes: true, pins: true, barangays: true });
  const [coord, setCoord] = useState<[number, number] | null>(null);

  const linkedIds = new Set(records.map((r) => r.roadId).filter(Boolean) as string[]);
  const linkedRoads = roads.filter((r) => linkedIds.has(r.id));

  return (
    <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-950">
      <MapContainer center={[9.748, 118.745]} zoom={13} className="h-[540px] w-full" scrollWheelZoom zoomControl={false}>
        <TileLayer url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} crossOrigin="anonymous" />
        <ScaleControl position="bottomleft" imperial={false} />
        <MapCore focus={focus} reduced={prefersReduced()} onCursor={setCoord} />

        {layers.barangays && barangays.map((b) => (
          <CircleMarker key={b.id} center={[b.lat, b.lng]} radius={2.5}
            pathOptions={{ color: "#7d9183", weight: 1, fillColor: "#7d9183", fillOpacity: 0.55 }} interactive={false} />
        ))}

        {layers.roads && linkedRoads.map((r) => (
          <RoadLayer key={r.id} road={r} onSelect={() => onLocate?.(r)} />
        ))}

        {layers.axes && centerlines.map((cl) => {
          const rec = cl.projectId ? records.find((r) => r.id === cl.projectId) : undefined;
          const meta = rec ? statusOf(rec) : null;
          return (
            <Polyline key={cl.id} positions={cl.line}
              pathOptions={{ color: meta ? meta.color : "#7d9183", weight: 3, opacity: meta ? 0.9 : 0.6, dashArray: meta ? undefined : "4 6" }}>
              <Popup className="rpis-popup">
                <div style={{ minWidth: 210 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: meta ? meta.color : "#7d9183", textTransform: "uppercase", margin: 0, fontWeight: 700 }}>
                    CENTERLINE AXIS · {cl.id}
                  </p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, textTransform: "uppercase", margin: "4px 0 6px", color: "#f5f7f0" }}>{cl.name}</p>
                  {rec && meta ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
                        <span style={{ color: "#7d9183" }}>PROJECT</span><span style={{ color: "#ffc24d", textAlign: "right" }}>{rec.id}</span>
                        <span style={{ color: "#7d9183" }}>LENGTH</span><span style={{ color: "#ffc24d", textAlign: "right" }}>{fmtKm(lineLengthM(cl.line))}</span>
                        <span style={{ color: "#7d9183" }}>BUFFER</span><span style={{ color: "#ffc24d", textAlign: "right" }}>±{cl.radiusM} m</span>
                        <span style={{ color: "#7d9183" }}>CONTRACTED</span><span style={{ color: "#ffc24d", textAlign: "right" }}>{fmtPesoM(rec.contractedAmount)}</span>
                      </div>
                      <div style={{ marginTop: 9 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "#9db8a6", textTransform: "uppercase" }}>
                          <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span><span>{rec.percent}%</span>
                        </div>
                        <div style={{ height: 5, marginTop: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${rec.percent}%`, background: meta.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#7d9183" }}>
                      Not linked to a project record · via {cl.source} · {fmtKm(lineLengthM(cl.line))}
                    </p>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {layers.pins && records.map((p) => {
          const meta = statusOf(p);
          const pt = recordPoint(p);
          const pin = pinSourceOf(p);
          return (
            <CircleMarker key={p.id} center={pt} radius={8}
              pathOptions={{ color: meta.color, weight: 2.5, fillColor: meta.color, fillOpacity: 0.28, dashArray: pin.kind === "barangay" ? "2 3" : undefined }}>
              <Popup className="rpis-popup">
                <div style={{ minWidth: 220 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "#f0a32b", textTransform: "uppercase", margin: 0 }}>
                    {p.id} · {p.folderNo}
                  </p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, lineHeight: 1.1, textTransform: "uppercase", margin: "4px 0 6px", color: "#f5f7f0" }}>{p.name}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#9db8a6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {typeAbbr(p.type)} · {p.type} · {p.mode}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    <span style={{ color: "#7d9183" }}>BARANGAYS</span><span style={{ color: "#ffc24d", textAlign: "right" }}>{barangayLabel(p)}</span>
                    <span style={{ color: "#7d9183" }}>LINEAR</span><span style={{ color: "#ffc24d", textAlign: "right" }}>{p.linearLength.toLocaleString()} m</span>
                    <span style={{ color: "#7d9183" }}>CONTRACTED</span><span style={{ color: "#ffc24d", textAlign: "right" }}>{fmtPesoM(p.contractedAmount)}</span>
                    <span style={{ color: "#7d9183" }}>IMPLEMENTOR</span>
                    <span style={{ color: "#ffc24d", textAlign: "right" }}>{contractors.find((c) => c.id === p.implementorId)?.name ?? "—"}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "#9db8a6", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span><span>{p.percent}%</span>
                    </div>
                    <div style={{ height: 5, marginTop: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${p.percent}%`, background: meta.color, borderRadius: 2 }} />
                    </div>
                  </div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#7d9183", marginTop: 10, letterSpacing: "0.06em" }}>
                    {pin.kind === "geotag" && <>PINNED VIA GEOTAGGED IMAGE — EXIF GPS</>}
                    {pin.kind === "centerline" && <>PINNED VIA LINKED CENTERLINE — LOT &amp; ROW</>}
                    {pin.kind === "barangay" && <>PIN AT BARANGAY CENTROID — NO FIELD CAPTURE YET</>}
                    {" · "}{fmtCoord(pt[0])}N {fmtCoord(pt[1])}E
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="absolute top-3 left-3 z-[1000] flex gap-1.5">
        {(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((k) => (
          <button key={k} onClick={() => setBasemap(k)}
            className={`cursor-pointer rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase backdrop-blur transition-colors ${
              basemap === k ? "border-amber-500 bg-ink-900 text-amber-400" : "border-ink-600 bg-ink-900/85 text-paper-300/70 hover:text-paper-100"
            }`}>
            {BASEMAPS[k].label}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
        {([
          ["roads", `Linked roads · ${linkedRoads.length}`],
          ["axes", `Project axes · ${centerlines.length}`],
          ["pins", `Stations · ${records.length}`],
          ["barangays", "Barangay centroids"],
        ] as [keyof Layers, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
            className={`flex cursor-pointer items-center gap-2 rounded-[3px] border px-2 py-1 font-mono text-[9px] font-semibold tracking-wider uppercase backdrop-blur transition-colors ${
              layers[k] ? "border-amber-500/60 bg-ink-900/90 text-amber-400" : "border-ink-600 bg-ink-900/80 text-paper-300/50 hover:text-paper-300"
            }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${layers[k] ? "bg-amber-400" : "bg-paper-300/30"}`} />
            {label}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-[3px] border border-ink-600 bg-ink-900/90 px-3 py-1.5 font-mono text-[10px] tracking-wider text-paper-300 backdrop-blur">
        {coord ? <>WGS 84 · <b className="text-amber-400">{fmtCoord(coord[0])}N {fmtCoord(coord[1])}E</b></> : "WGS 84 · move cursor over map"}
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3 z-[1000] grid h-10 w-10 place-items-center rounded-full border-2 border-ink-600 bg-ink-900/90 text-amber-400 backdrop-blur">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l4 12-4-3-4 3 4-12Z" /></svg>
      </div>
    </div>
  );
}

function MapCore({ focus, reduced, onCursor }: {
  focus: Focus | null;
  reduced: boolean;
  onCursor: (c: [number, number] | null) => void;
}) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!focus) return;
    map.flyTo(focus.point, focus.zoom ?? 15, { duration: reduced ? 0 : 1.2 });
  }, [focus, map, reduced]);
  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;
    map.on("mousemove", (e) => onCursor([e.latlng.lat, e.latlng.lng]));
    map.on("mouseout", () => onCursor(null));
  }, [map, onCursor]);
  return null;
}

function RoadLayer({ road, onSelect }: { road: Road; onSelect: () => void }) {
  const cm = classMeta[road.roadClass];
  const cond = conditionMeta[road.condition];
  return (
    <>
      <Polyline positions={road.geometry} pathOptions={{ color: "#0c1913", weight: cm.weight + 3, opacity: 0.5 }} interactive={false} />
      <Polyline positions={road.geometry} eventHandlers={{ click: onSelect }}
        pathOptions={{ color: cond.color, weight: cm.weight, opacity: 0.95 }}>
        <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
          {road.roadClass.toUpperCase()} · {road.name} — {road.condition} · PCI {road.pci}
        </Tooltip>
      </Polyline>
    </>
  );
}
