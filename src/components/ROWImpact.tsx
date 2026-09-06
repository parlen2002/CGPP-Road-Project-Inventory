/* Lot overlap & ROW impact — computes the corridor from the linked centerline
   against the cadastre and renders an OSM mini-map with affected lots. */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, useMap } from "react-leaflet";
import type { ProjectRecord } from "../data/registry";
import { fmtPesoM } from "../data/registry";
import { useStore, linkedCenterline } from "../state/store";
import { runROWAnalysis } from "../data/cadastre";
import { fmtArea, lineLengthM, fmtKm } from "../lib/geo";
import CenterlineBufferModal from "./CenterlineBufferModal";

function Fit({ line }: { line: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !line.length) return;
    done.current = true;
    if (line.length === 1) map.setView(line[0], 15);
    else map.fitBounds(line as [number, number][], { padding: [40, 40] });
  }, [map, line]);
  return null;
}

export default function ROWImpact({ record, onOpenCadastre, captureRef }: {
  record: ProjectRecord;
  onOpenCadastre?: () => void;
  /** attached to the map frame only — print snapshots never include the controls */
  captureRef?: React.Ref<HTMLDivElement>;
}) {
  const { parcels } = useStore();
  const [tab, setTab] = useState<"map" | "lots">("map");
  const [bufferOpen, setBufferOpen] = useState(false);
  const axis = linkedCenterline(record);
  const row = useMemo(() => (axis ? runROWAnalysis(parcels, axis) : null), [parcels, axis]);

  if (!axis || !row) {
    return (
      <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-paper-100">
        <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-ink-900 px-4 py-2.5">
          <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">Lot overlap · ROW impact</p>
        </div>
        <div className="p-4">
          <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[9.5px] leading-relaxed text-text-400">
            No centerline linked — import the project's KML / GPX in Lot &amp; ROW Analysis and link it to this record to compute lot overlaps and acquisition cost.
          </p>
          {onOpenCadastre && (
            <button onClick={onOpenCadastre}
              className="mt-3 cursor-pointer rounded-[3px] border border-teal-500 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-wider text-teal-500 uppercase transition-colors hover:bg-teal-500 hover:text-paper-100">
              Open Lot &amp; ROW Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const govLots = row.rows.filter((x) => x.ownerType === "Government");
  const privLots = row.rows.filter((x) => x.ownerType === "Private");

  return (
    <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-paper-100">
      <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-ink-900 px-4 py-2.5">
        <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
          Lot overlap · ROW impact
          <span className="rounded-[3px] bg-ink-950 px-1.5 py-0.5 font-bold text-amber-400">{row.rows.length}</span>
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setBufferOpen(true)} title="Adjust the centerline buffer radius"
            className="group flex cursor-pointer items-center gap-1 rounded-[3px] border border-teal-500/60 px-2 py-1 font-mono text-[8.5px] font-bold tracking-wider text-teal-400 uppercase transition-all hover:border-teal-400 hover:bg-teal-500/15">
            <span className="text-[11px] leading-none transition-transform group-hover:scale-125">±</span> Buffer
          </button>
          {onOpenCadastre && (
            <button onClick={onOpenCadastre} title="Open the full centerline editor in Lot & ROW Analysis"
              className="cursor-pointer rounded-[3px] border border-ink-600 px-2 py-1 font-mono text-[8.5px] font-bold tracking-wider text-paper-300/60 uppercase transition-colors hover:border-amber-500/60 hover:text-amber-400">
              Lot &amp; ROW ⤢
            </button>
          )}
          <span className="mx-0.5 h-4 w-px bg-ink-600" />
          {(["map", "lots"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`cursor-pointer rounded-[3px] border px-2 py-1 font-mono text-[8.5px] font-bold tracking-wider uppercase transition-colors ${
                tab === t ? "border-amber-500 bg-ink-950 text-amber-400" : "border-ink-600 text-paper-300/60 hover:text-paper-100"
              }`}>
              {t === "map" ? "Map" : "Lots"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-[3px] border border-line-400 bg-white/60 px-2.5 py-2">
            <p className="font-mono text-[8px] tracking-[0.12em] text-text-400 uppercase">Lots overlapped</p>
            <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{row.rows.length}</p>
            <p className="mt-0.5 font-mono text-[8px] text-text-400">{govLots.length} govt · {privLots.length} priv</p>
          </div>
          <div className="rounded-[3px] border border-line-400 bg-white/60 px-2.5 py-2">
            <p className="font-mono text-[8px] tracking-[0.12em] text-text-400 uppercase">Corridor area</p>
            <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{fmtArea(row.corridorAreaM2)}</p>
            <p className="mt-0.5 font-mono text-[8px] text-text-400">±{axis.radiusM} m buffer</p>
          </div>
          <div className="rounded-[3px] border border-line-400 bg-white/60 px-2.5 py-2">
            <p className="font-mono text-[8px] tracking-[0.12em] text-text-400 uppercase">Private affected</p>
            <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtArea(row.privM2)}</p>
            <p className="mt-0.5 font-mono text-[8px] text-text-400">for acquisition</p>
          </div>
          <div className="rounded-[3px] border border-line-400 bg-white/60 px-2.5 py-2">
            <p className="font-mono text-[8px] tracking-[0.12em] text-text-400 uppercase">ROW cost</p>
            <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtPesoM(row.totalCost)}</p>
            <p className="mt-0.5 font-mono text-[8px] text-text-400">Σ area × zonal</p>
          </div>
        </div>

        {tab === "map" ? (
          <div ref={captureRef} className="mt-3 overflow-hidden rounded-[3px] border border-ink-800">
            <MapContainer center={axis.line[0]} zoom={14} className="h-[280px] w-full" scrollWheelZoom={false} zoomControl={false} dragging={false}>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
              <Fit line={axis.line} />
              <Polygon positions={row.corridorRing} pathOptions={{ color: "#f0a32b", weight: 1.5, fillColor: "#f0a32b", fillOpacity: 0.12, dashArray: "4 4" }} />
              <Polyline positions={axis.line} pathOptions={{ color: "#12897e", weight: 3, opacity: 0.95 }} />
              {row.rows.map((x) => {
                const lot = parcels.find((p) => p.id === x.lotId);
                if (!lot) return null;
                return (
                  <Polygon key={x.lotId} positions={lot.ring}
                    pathOptions={{ color: x.ownerType === "Government" ? "#1e7a58" : "#de5a36", weight: 2, fillColor: x.ownerType === "Government" ? "#1e7a58" : "#de5a36", fillOpacity: 0.3 }} />
                );
              })}
              <CircleMarker center={axis.line[0]} radius={5} pathOptions={{ color: "#12897e", fillColor: "#12897e", fillOpacity: 0.9 }} />
            </MapContainer>
          </div>
        ) : (
          <div className="mt-3 max-h-[280px] overflow-y-auto rounded-[3px] border border-line-400">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-ink-900 text-paper-300">
                <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8.5px] [&>th]:tracking-[0.12em] [&>th]:uppercase">
                  <th>Lot</th><th>Owner</th><th className="!text-right">Affected</th><th className="!text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {row.rows.map((x) => (
                  <tr key={x.lotId} className="transition-colors hover:bg-ink-900/[0.04]">
                    <td className="px-2.5 py-1.5 font-mono text-[9.5px] font-bold text-ink-900">{x.lotId}</td>
                    <td className="px-2.5 py-1.5 text-[10.5px] text-text-600">
                      {x.owner}
                      <span className={`ml-1.5 rounded-[2px] px-1 py-0.5 font-mono text-[7.5px] font-bold uppercase ${x.ownerType === "Government" ? "bg-pine-600/15 text-pine-600" : "bg-coral-500/15 text-coral-600"}`}>{x.ownerType}</span>
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-[10px] font-semibold text-ink-900">{fmtArea(x.affectedM2)}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-[10px] font-bold" style={{ color: x.cost ? "#b84423" : "#1e7a58" }}>{x.cost ? fmtPesoM(x.cost) : "₱0"}</td>
                  </tr>
                ))}
                {row.rows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center font-mono text-[9.5px] text-text-400">Corridor does not intersect any registered lot.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-2.5 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">
          Axis {axis.id} · via {axis.source} · {axis.name} · {fmtKm(lineLengthM(axis.line))} — government land incurs no acquisition cost.
        </p>
      </div>

      {/* buffer adjuster — portaled, so it never appears on the printed sheet */}
      {bufferOpen && (
        <CenterlineBufferModal
          record={record}
          axis={axis}
          onClose={() => setBufferOpen(false)}
          onOpenFull={onOpenCadastre ? () => onOpenCadastre() : undefined}
        />
      )}
    </div>
  );
}
