import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, useMapEvents, ScaleControl, Tooltip } from "react-leaflet";
import type { Road } from "../data/roads";
import { statusOf, typeShort, fmtPesoM, barangayLabel } from "../data/registry";
import { useStore, recordPoint, pinSourceOf } from "../state/store";
import { conditionMeta, classMeta, fmtCoord, prefersReduced } from "./ui";
import { IconCrosshair, IconCompass, IconPlus } from "./icons";

const CITY: [number, number] = [9.7425, 118.7365];

/* key-free public tile services — OSM standard + Esri World Imagery (free use with attribution) */
const BASEMAPS = {
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    label: "OSM street",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    label: "Satellite",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
  },
};

export interface Focus { point: [number, number]; zoom: number; key: number; }

interface Layers { roads: boolean; pins: boolean; barangays: boolean; }

export default function MapView({ focus, roads, onLocate }: {
  focus?: Focus | null;
  roads: Road[];
  onLocate?: (r: Road) => void;
}) {
  const { records, contractors, barangays } = useStore();
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>("street");
  const [layers, setLayers] = useState<Layers>({ roads: true, pins: true, barangays: true });
  const [coord, setCoord] = useState<[number, number] | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const reduced = prefersReduced();

  const toggle = (k: keyof Layers) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="relative">
      <MapContainer
        center={CITY} zoom={13} minZoom={10} maxZoom={17}
        zoomControl={false}
        className="h-[440px] w-full sm:h-[520px]"
        ref={(m) => { mapRef.current = m as unknown as L.Map | null; }}
      >
        <TileLayer url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} />
        <ScaleControl position="bottomleft" imperial={false} />
        <MapCore focus={focus} reduced={reduced} onCursor={setCoord} />

        {layers.barangays &&
          barangays.map((b) => (
            <CircleMarker key={b.id} center={[b.lat, b.lng]} radius={2.5} pathOptions={{ color: "#7d9183", weight: 1, fillColor: "#7d9183", fillOpacity: 0.55 }} interactive={false} />
          ))}

        {layers.roads && roads.map((r) => (
          <RoadLayer key={r.id} road={r} onSelect={() => onLocate?.(r)} />
        ))}



        {layers.pins &&
          records.map((p) => {
            const meta = statusOf(p);
            const impl = contractors.find((c) => c.id === p.implementorId);
            const pt = recordPoint(p);
            const pin = pinSourceOf(p);
            return (
              <CircleMarker
                key={p.id}
                center={pt}
                radius={8}
                pathOptions={{ color: meta.color, weight: 2.5, fillColor: meta.color, fillOpacity: 0.28, dashArray: pin.kind === "barangay" ? "2 3" : undefined }}
              >
                {p.percent < 100 && p.percent > 0 && (
                  <CircleMarker center={pt} radius={13} interactive={false} pathOptions={{ color: meta.ring, weight: 1.5, fillOpacity: 0, dashArray: "3 5" }} />
                )}
                <Tooltip className="rpis-tip" direction="top" offset={[0, -8]}>
                  {p.id} · {p.name.length > 34 ? p.name.slice(0, 34) + "…" : p.name}
                </Tooltip>
                <Popup className="rpis-popup" minWidth={230}>
                  <div style={{ minWidth: 216 }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "#f0a32b", textTransform: "uppercase", margin: 0 }}>
                      {p.id} · {p.folderNo}
                    </p>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, lineHeight: 1.1, textTransform: "uppercase", margin: "4px 0 6px", color: "#f5f7f0" }}>
                      {p.name}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#9db8a6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {typeShort[p.type]} · {p.type} · {p.mode}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      <span style={{ color: "#7d9183" }}>IMPLEMENTOR</span>
                      <span style={{ color: "#e9efe4", textAlign: "right" }}>{impl?.name.split("(")[0].trim() ?? p.implementorId}</span>
                      <span style={{ color: "#7d9183" }}>LINEAR</span>
                      <span style={{ color: "#e9efe4", textAlign: "right" }}>{p.linearLength.toLocaleString()} m</span>
                      <span style={{ color: "#7d9183" }}>CONTRACTED</span>
                      <span style={{ color: "#e9efe4", textAlign: "right" }}>{fmtPesoM(p.contractedAmount)}</span>
                      <span style={{ color: "#7d9183" }}>BARANGAYS</span>
                      <span style={{ color: "#ffc24d", textAlign: "right" }}>{barangayLabel(p)}</span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "#9db8a6", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                        <span>{p.percent}%</span>
                      </div>
                      <div style={{ height: 5, marginTop: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${p.percent}%`, background: meta.color, borderRadius: 2 }} />
                      </div>
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "#7d9183", marginTop: 10, letterSpacing: "0.06em" }}>
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

      {/* controls */}
      <div className="absolute top-3 left-3 z-[600] flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => mapRef.current?.flyTo(CITY, 13, { duration: reduced ? 0 : 1.2 })}
            title="Recenter on city center"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-[3px] border border-ink-600 bg-ink-900/90 text-amber-400 backdrop-blur transition-all hover:border-amber-500 hover:text-amber-300"
          >
            <IconCrosshair size={15} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom in"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-[3px] border border-ink-600 bg-ink-900/90 text-paper-300 backdrop-blur transition-all hover:border-amber-500 hover:text-amber-300"
          >
            <IconPlus size={15} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom out"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-[3px] border border-ink-600 bg-ink-900/90 text-paper-300 backdrop-blur transition-all hover:border-amber-500 hover:text-amber-300"
          >
            <span className="font-mono text-base leading-none font-bold">–</span>
          </button>
        </div>
      </div>

      {/* basemap toggle */}
      <div className="absolute top-3 right-3 z-[600] flex rounded-[3px] border border-ink-600 bg-ink-900/90 p-0.5 backdrop-blur">
        {(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((k) => (
          <button
            key={k}
            onClick={() => setBasemap(k)}
            className={`cursor-pointer rounded-[2px] px-2.5 py-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase transition-all ${
              basemap === k ? "bg-amber-500 text-ink-950" : "text-paper-300/60 hover:text-paper-100"
            }`}
          >
            {BASEMAPS[k].label}
          </button>
        ))}
      </div>

      {/* legend */}
      <div className="absolute bottom-9 left-3 z-[600] hidden rounded-[3px] border border-ink-600 bg-ink-900/92 px-3 py-2.5 backdrop-blur sm:block">
        <p className="mb-1.5 font-mono text-[8.5px] tracking-[0.2em] text-paper-300/50 uppercase">Road condition · PCI</p>
        {(["Good", "Fair", "Poor"] as const).map((c) => (
          <p key={c} className="flex items-center gap-2 py-0.5 font-mono text-[9.5px] text-paper-300/80">
            <span className="h-[3px] w-5 rounded-full" style={{ background: conditionMeta[c].color }} /> {c}
          </p>
        ))}
        <p className="mt-1.5 mb-1 border-t border-ink-700 pt-1.5 font-mono text-[8.5px] tracking-[0.2em] text-paper-300/50 uppercase">Project station</p>
        <p className="flex items-center gap-2 py-0.5 font-mono text-[9.5px] text-paper-300/80">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-400 bg-amber-400/25" /> colored by status
        </p>
      </div>

      {/* north arrow */}
      <div className="absolute right-3 bottom-9 z-[600] grid h-11 w-11 place-items-center rounded-full border border-ink-600 bg-ink-900/90 text-amber-400 backdrop-blur">
        <IconCompass size={22} />
      </div>

      {/* cursor coordinates */}
      <div className="absolute right-0 bottom-0 left-0 z-[600] flex items-center justify-between gap-3 border-t border-ink-700 bg-ink-950/95 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.12em] text-paper-300/70 uppercase">
        <span className="flex items-center gap-1.5">
          <span className="dot-live h-1.5 w-1.5 rounded-full bg-pine-400" /> WGS 84
        </span>
        <span className="tabular">
          {coord ? `${fmtCoord(coord[0])}° N · ${fmtCoord(coord[1])}° E` : "MOVE CURSOR OVER MAP —"}
        </span>
        <span className="hidden sm:inline">{layers.roads ? `${roads.length} SEGS` : "SEGS OFF"} · {layers.pins ? `${records.length} STATIONS` : "STATIONS OFF"}</span>
      </div>

      {/* layer chips */}
      <div className="absolute top-14 left-3 z-[600] flex flex-col gap-1.5">
        {([
          ["roads", `City roads (OCE) · ${roads.length}`],
          ["pins", `Project stations · ${records.length}`],
          ["barangays", "Barangay centroids"],
        ] as [keyof Layers, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`cursor-pointer rounded-[3px] border px-2 py-1 text-left font-mono text-[9px] tracking-[0.12em] uppercase backdrop-blur transition-all ${
              layers[k]
                ? "border-amber-500/60 bg-ink-900/90 text-amber-300"
                : "border-ink-600 bg-ink-900/70 text-paper-300/40 hover:text-paper-300/70"
            }`}
          >
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${layers[k] ? "bg-amber-400" : "bg-paper-300/30"}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- internal map pieces ---------------- */

function MapCore({ focus, reduced, onCursor }: {
  focus?: Focus | null;
  reduced: boolean;
  onCursor: (c: [number, number]) => void;
}) {
  const map = useMap();
  useMapEvents({
    mousemove: (e) => onCursor([e.latlng.lat, e.latlng.lng]),
  });
  useEffect(() => {
    if (focus) map.flyTo(focus.point, focus.zoom, { duration: reduced ? 0 : 1.3 });
  }, [focus, map, reduced]);
  return null;
}

function RoadLayer({ road, onSelect }: { road: Road; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  const meta = conditionMeta[road.condition];
  const cls = classMeta[road.roadClass];
  const positions = useMemo(() => road.geometry.map(([a, b]) => [a, b] as [number, number]), [road]);
  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ color: "#0a1410", weight: cls.weight + 3.5, opacity: hover ? 0.95 : 0.85, lineCap: "round" }}
        interactive={false}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: meta.color, weight: hover ? cls.weight + 1.5 : cls.weight, opacity: hover ? 1 : 0.92, lineCap: "round" }}
        eventHandlers={{
          mouseover: () => setHover(true),
          mouseout: () => setHover(false),
          click: onSelect,
        }}
      >
        <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
          {road.name} · {road.lengthKm} km · PCI {road.pci}
        </Tooltip>
      </Polyline>
    </>
  );
}
