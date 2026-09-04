import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip,
  ScaleControl, ZoomControl, CircleMarker, useMap, useMapEvents,
} from "react-leaflet";
import { CITY_CENTER, barangayCentroids, type Road } from "../data/roads";
import { projects, statusMeta, typeShort, type Project } from "../data/projects";
import { fmtCoord, fmtM } from "./ui";
import { IconCrosshair, NorthArrow } from "./icons";

export interface Focus {
  point: [number, number];
  zoom: number;
  key: number;
}

const condColor: Record<Road["condition"], string> = {
  Good: "#2fae7d",
  Fair: "#f0a32b",
  Poor: "#e8603c",
};
const classWeight: Record<Road["roadClass"], number> = { National: 5.5, Provincial: 4, City: 3 };

const pinIcon = (color: string, pulse = false) =>
  L.divIcon({
    className: "",
    iconSize: [24, 32],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
    html: `<svg width="24" height="32" viewBox="0 0 24 32">
      ${pulse ? `<circle cx="12" cy="11" r="8" fill="${color}" opacity="0.5"><animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.55;0;0.55" dur="2s" repeatCount="indefinite"/></circle>` : ""}
      <path d="M12 31C12 31 21 20.6 21 11.4A9 9 0 0 0 3 11.4C3 20.6 12 31 12 31Z" fill="${color}" stroke="#07110c" stroke-width="1.4"/>
      <circle cx="12" cy="11.4" r="3.4" fill="#07110c"/>
    </svg>`,
  });

const cityHallIcon = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<svg width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="#0c1913" stroke="#ffc24d" stroke-width="1.6"/>
    <path d="M15 5.5v19M8 9l7 4 7-4M8 21l7-4 7 4" stroke="#ffc24d" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <circle cx="15" cy="15" r="2.2" fill="#ffc24d"/>
  </svg>`,
});

function MouseProbe({ onMove, onZoom }: {
  onMove: (ll: [number, number] | null) => void;
  onZoom: (z: number) => void;
}) {
  const map = useMap();
  useMapEvents({
    mousemove: (e) => onMove([e.latlng.lat, e.latlng.lng]),
    mouseout: () => onMove(null),
    zoomend: () => onZoom(map.getZoom()),
  });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
  return null;
}

function FocusFly({ focus }: { focus?: Focus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus.point, focus.zoom, { duration: 1.15 });
  }, [focus, map]);
  return null;
}

function MapCapture({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

function ProjectPopup({ p }: { p: Project }) {
  const m = statusMeta[p.status];
  return (
    <div className="w-56">
      <p className="font-mono text-[9.5px] tracking-[0.18em]" style={{ color: m.color }}>{p.code} · {typeShort[p.type]}</p>
      <p className="font-display mt-1 text-lg leading-tight font-bold text-paper-100">{p.name}</p>
      <p className="mt-0.5 text-[11px] text-paper-300/75">{p.roadName} · Brgy. {p.barangay}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: m.color }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px]">
        <span style={{ color: m.color }}>{p.status.toUpperCase()} · {p.progress}%</span>
        <span className="text-paper-300/80">{fmtM(p.budgetM)}</span>
      </div>
      <p className="mt-1 font-mono text-[9.5px] text-paper-300/60">{p.contractor}</p>
    </div>
  );
}

export default function MapView({
  focus, selectedRoadId = null, onSelectRoad, className = "h-[480px]",
  defaultZoom = 13, layersUI = true, roads,
}: {
  focus?: Focus | null;
  selectedRoadId?: string | null;
  onSelectRoad?: (r: Road | null) => void;
  className?: string;
  defaultZoom?: number;
  layersUI?: boolean;
  roads: Road[];
}) {
  const [basemap, setBasemap] = useState<"dark" | "light">("dark");
  const [showCond, setShowCond] = useState(true);
  const [showProj, setShowProj] = useState(true);
  const [showBrgy, setShowBrgy] = useState(true);
  const [hoverRoad, setHoverRoad] = useState<string | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(defaultZoom);
  const mapRef = useMemo<{ m: L.Map | null }>(() => ({ m: null }), []);

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    (Object.keys(statusMeta) as (keyof typeof statusMeta)[]).forEach((s) => {
      map.set(s, pinIcon(statusMeta[s].color, s === "Ongoing" || s === "Delayed"));
    });
    return map;
  }, []);

  const tile =
    basemap === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className={`relative overflow-hidden rounded-[4px] border-2 border-ink-800 ${className}`}>
      <MapContainer
        center={CITY_CENTER}
        zoom={defaultZoom}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer key={basemap} url={tile} attribution='&copy; OpenStreetMap &copy; CARTO' maxZoom={19} />
        <ScaleControl position="bottomleft" imperial={false} />
        <ZoomControl position="topright" />
        <MouseProbe onMove={setCursor} onZoom={setZoom} />
        <FocusFly focus={focus} />
        <MapCapture onMap={(m) => { mapRef.m = m; }} />

        {showBrgy &&
          barangayCentroids.map((b) => (
            <CircleMarker key={b.name} center={b.point} radius={3} pathOptions={{ color: "#ffc24d", weight: 1, fillColor: "#0c1913", fillOpacity: 1 }}>
              <Tooltip direction="top" className="rpis-tip" opacity={1} offset={[0, -4]}>{b.name.toUpperCase()}</Tooltip>
            </CircleMarker>
          ))}

        {/* casing pass for contrast */}
        {roads.map((r) => (
          <Polyline
            key={`${r.id}-case`}
            positions={r.geometry}
            interactive={false}
            pathOptions={{ color: "#07110c", weight: classWeight[r.roadClass] + 3, opacity: 0.55, lineCap: "round" }}
          />
        ))}
        {roads.map((r) => {
          const selected = r.id === selectedRoadId;
          const hovered = r.id === hoverRoad;
          const color = showCond ? condColor[r.condition] : "#c8d3c0";
          return (
            <Polyline
              key={r.id}
              positions={r.geometry}
              pathOptions={{
                color: selected || hovered ? "#ffc24d" : color,
                weight: classWeight[r.roadClass] + (selected || hovered ? 1.6 : 0),
                opacity: selected || hovered ? 1 : 0.92,
                lineCap: "round",
              }}
              eventHandlers={{
                click: () => onSelectRoad?.(r),
                mouseover: () => setHoverRoad(r.id),
                mouseout: () => setHoverRoad(null),
              }}
            >
              <Tooltip direction="top" className="rpis-tip" opacity={1} offset={[0, -6]}>
                {`${r.name.toUpperCase()} · ${r.lengthKm.toFixed(1)} KM · PCI ${r.pci}`}
              </Tooltip>
            </Polyline>
          );
        })}

        {showProj &&
          projects.map((p) => (
            <Marker key={p.id} position={p.point} icon={icons.get(p.status)!} zIndexOffset={p.status === "Ongoing" ? 500 : 0}>
              <Popup className="rpis-popup" maxWidth={260}>
                <ProjectPopup p={p} />
              </Popup>
            </Marker>
          ))}

        <Marker position={CITY_CENTER} icon={cityHallIcon} zIndexOffset={900}>
          <Popup className="rpis-popup">
            <p className="font-display text-base font-bold text-amber-400">Puerto Princesa City Hall</p>
            <p className="font-mono text-[10px] text-paper-300/70">9.73920°N · 118.73530°E — Office of the City Engineer</p>
          </Popup>
        </Marker>
      </MapContainer>

      {/* layer chips */}
      {layersUI && (
        <div className="absolute top-3 left-3 z-[500] flex flex-wrap gap-1.5">
          {[
            { label: "CONDITION", on: showCond, set: () => setShowCond(!showCond) },
            { label: "PROJECTS", on: showProj, set: () => setShowProj(!showProj) },
            { label: "BRGYS", on: showBrgy, set: () => setShowBrgy(!showBrgy) },
          ].map((b) => (
            <button
              key={b.label}
              onClick={b.set}
              className={`cursor-pointer rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] transition-all duration-200 ${
                b.on
                  ? "border-amber-500/80 bg-ink-900/85 text-amber-400 shadow-[0_0_0_1px_rgba(240,163,43,0.2)]"
                  : "border-ink-600 bg-ink-900/70 text-paper-300/60 hover:text-paper-100"
              }`}
            >
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${b.on ? "bg-amber-400" : "bg-ink-600"}`} />
              {b.label}
            </button>
          ))}
          <div className="ml-1 flex overflow-hidden rounded-[3px] border border-ink-600">
            {(["dark", "light"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasemap(b)}
                className={`cursor-pointer px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                  basemap === b ? "bg-amber-500 text-ink-950" : "bg-ink-900/70 text-paper-300/70 hover:text-paper-100"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* reset view */}
      <button
        onClick={() => mapRef.m?.flyTo(CITY_CENTER, 13, { duration: 1.1 })}
        className="absolute right-3 bottom-9 z-[500] hidden cursor-pointer items-center gap-1.5 rounded-[3px] border border-ink-600 bg-ink-900/80 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-paper-300/80 transition-colors hover:border-amber-500/60 hover:text-amber-400 sm:flex"
      >
        <IconCrosshair size={13} /> CITY CENTER
      </button>

      {/* north arrow */}
      <div className="pointer-events-none absolute top-3 right-12 z-[450] hidden text-paper-100/70 sm:block">
        <NorthArrow size={30} />
      </div>

      {/* coordinate probe bar */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-[500] flex w-full items-center gap-4 border-t border-ink-700 bg-ink-950/88 px-3 py-1.5 font-mono text-[10px] tracking-wider text-paper-300/85 backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <IconCrosshair size={12} className="text-amber-400" />
          {cursor
            ? <>LAT <b className="text-amber-300">{fmtCoord(cursor[0])}</b> · LON <b className="text-amber-300">{fmtCoord(cursor[1])}</b></>
            : <span className="text-paper-300/50">MOVE CURSOR OVER MAP — WGS 84 READOUT</span>}
        </span>
        <span className="hidden sm:inline">EPSG:4326</span>
        <span className="hidden text-paper-300/50 md:inline">WEB MERCATOR · EPSG:3857</span>
        <span className="ml-auto">Z{zoom.toFixed(0)}</span>
      </div>
    </div>
  );
}
