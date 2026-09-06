/* Lot & ROW impact panel for the project record drawer — mini-map, lots tab,
   buffer adjuster. The capture ref lands on the map frame only, so printed
   sheets never include the controls. */

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { useStore } from "../state/store";
import { useAuth } from "../state/authStore";
import type { ProjectRecord } from "../data/registry";
import { fmtPesoM } from "../data/registry";
import { runROWAnalysis } from "../data/cadastre";
import { fmtArea, lineLengthM, fmtKm } from "../lib/geo";
import BufferControl from "./BufferControl";
import CenterlineBufferModal from "./CenterlineBufferModal";

export default function ROWImpact({ record, onOpenCadastre, captureRef }: {
  record: ProjectRecord;
  onOpenCadastre?: (centerlineId?: string) => void;
  captureRef?: React.Ref<HTMLDivElement>;
}) {
  const { parcels, centerlines } = useStore();
  const { can } = useAuth();
  const [tab, setTab] = useState<"map" | "lots">("map");
  const [bufferOpen, setBufferOpen] = useState(false);
  const axis = centerlines.find((c) => c.projectId === record.id) ?? null;
  const row = useMemo(() => (axis ? runROWAnalysis(parcels, axis) : null), [parcels, axis]);

  return (
    <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-4 py-2.5">
        <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
          Lot overlap · ROW impact
        </p>
        <div className="flex items-center gap-1">
          {can.update && axis && (
            <button onClick={() => setBufferOpen(true)} title="Adjust the centerline buffer radius"
              className="group flex cursor-pointer items-center gap-1 rounded-[3px] border border-teal-500/60 px-2 py-1 font-mono text-[8.5px] font-bold tracking-wider text-teal-400 uppercase transition-all hover:border-teal-400 hover:bg-teal-500/15">
              <span className="text-[11px] leading-none transition-transform group-hover:scale-125">±</span> Buffer
            </button>
          )}
          {onOpenCadastre && (
            <button onClick={() => onOpenCadastre(axis?.id)} title="Open this centerline in Lot & ROW Analysis"
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
        {!axis ? (
          <div className="rounded-[3px] border border-dashed border-ink-600 px-4 py-5 text-center">
            <p className="font-mono text-[10px] leading-relaxed text-paper-300/60">
              No centerline linked to this record yet. Import a KML / GPX in <b className="text-amber-400">Lot &amp; ROW Analysis</b> and
              link it here to compute lot overlaps and ROW acquisition cost.
            </p>
            {onOpenCadastre && (
              <button onClick={() => onOpenCadastre()}
                className="mt-3 cursor-pointer rounded-[3px] bg-amber-500 px-4 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-colors hover:bg-amber-400">
                Open Lot &amp; ROW Analysis
              </button>
            )}
          </div>
        ) : tab === "map" ? (
          <>
            <div ref={captureRef} className="overflow-hidden rounded-[3px] border border-ink-600">
              <MapContainer center={axis.line[0]} zoom={14} className="h-[260px] w-full" scrollWheelZoom={false} zoomControl={false} dragging={false}>
                <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' crossOrigin="anonymous" />
                {row && row.rows.length > 0 && row.rows.map((x) => {
                  const parcel = parcels.find((p) => p.id === x.lotId);
                  if (!parcel) return null;
                  const color = x.ownerType === "Government" ? "#1e7a58" : "#de5a36";
                  return (
                    <Polygon key={x.lotId} positions={parcel.ring}
                      pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.3 }}>
                      <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
                        {x.lotId} · {x.ownerType} · {fmtArea(x.affectedM2)} affected
                      </Tooltip>
                    </Polygon>
                  );
                })}
                {row && (
                  <Polygon positions={row.corridorRing} pathOptions={{ color: "#f0a32b", weight: 2, fillColor: "#f0a32b", fillOpacity: 0.12, dashArray: "6 4" }} />
                )}
                <Polyline positions={axis.line} pathOptions={{ color: "#ffc24d", weight: 3, opacity: 0.95 }} />
                <CircleMarker center={axis.line[0]} radius={5} pathOptions={{ color: "#ffc24d", fillColor: "#0c1913", fillOpacity: 1, weight: 2 }} />
              </MapContainer>
            </div>
            <p className="mt-2 font-mono text-[8.5px] tracking-wider text-paper-300/50 uppercase">
              Axis {axis.id} · ±{axis.radiusM} m buffer · {fmtKm(lineLengthM(axis.line))}
            </p>
          </>
        ) : (
          <>
            {row && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-[3px] border border-ink-600 bg-ink-950 px-3 py-2">
                  <p className="font-mono text-[8px] tracking-[0.14em] text-paper-300/50 uppercase">Lots overlapped</p>
                  <p className="font-display mt-0.5 text-lg leading-none font-bold text-paper-100">{row.rows.length}</p>
                </div>
                <div className="rounded-[3px] border border-ink-600 bg-ink-950 px-3 py-2">
                  <p className="font-mono text-[8px] tracking-[0.14em] text-paper-300/50 uppercase">Corridor area</p>
                  <p className="font-display mt-0.5 text-lg leading-none font-bold text-paper-100">{fmtArea(row.corridorAreaM2)}</p>
                </div>
                <div className="rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-3 py-2">
                  <p className="font-mono text-[8px] tracking-[0.14em] text-coral-400 uppercase">Private affected</p>
                  <p className="font-display mt-0.5 text-lg leading-none font-bold text-coral-400">{fmtArea(row.privM2)}</p>
                </div>
                <div className="rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-3 py-2">
                  <p className="font-mono text-[8px] tracking-[0.14em] text-coral-400 uppercase">ROW acquisition</p>
                  <p className="font-display mt-0.5 text-lg leading-none font-bold text-coral-400">{fmtPesoM(row.totalCost)}</p>
                </div>
              </div>
            )}
            {row && row.rows.length > 0 ? (
              <div className="max-h-[200px] overflow-y-auto rounded-[3px] border border-ink-600">
                <table className="w-full border-collapse">
                  <thead className="bg-ink-950 text-paper-300">
                    <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8px] [&>th]:tracking-[0.14em] [&>th]:uppercase">
                      <th>Lot</th><th>Type</th><th className="!text-right">Affected</th><th className="!text-right">%</th><th className="!text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700">
                    {row.rows.map((x) => (
                      <tr key={x.lotId}>
                        <td className="px-2.5 py-1.5 font-mono text-[9.5px] font-bold text-paper-100">{x.lotId}</td>
                        <td className="px-2.5 py-1.5">
                          <span className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${x.ownerType === "Government" ? "bg-pine-500/20 text-pine-400" : "bg-coral-500/20 text-coral-400"}`}>{x.ownerType}</span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] text-paper-100">{fmtArea(x.affectedM2)}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] text-paper-300/70">{x.pct}%</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] font-bold text-paper-100">{x.cost ? fmtPesoM(x.cost) : "₱0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-[3px] border border-dashed border-ink-600 px-3 py-3 font-mono text-[9.5px] text-paper-300/50">
                The corridor does not intersect any registered lot.
              </p>
            )}
          </>
        )}
      </div>

      {bufferOpen && axis && (
        <CenterlineBufferModal record={record} axis={axis} onClose={() => setBufferOpen(false)}
          onOpenFull={onOpenCadastre ? () => onOpenCadastre(axis.id) : undefined} />
      )}
    </div>
  );
}

export { BufferControl };
