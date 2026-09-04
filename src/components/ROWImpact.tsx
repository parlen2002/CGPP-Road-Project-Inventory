/* ─────────────────────────────────────────────────────────────
   ROW IMPACT — embedded in the project record drawer.
   Shows the centerline linked to the project (from its KML / GPX),
   the parallel buffer corridor, every cadastral lot it overlaps,
   the affected area per lot, and the right-of-way acquisition cost
   (private lots only — government land needs no acquisition).
   ────────────────────────────────────────────────────────────── */

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMap, Tooltip } from "react-leaflet";
import type { LatLng } from "../lib/geo";
import { fmtArea } from "../lib/geo";
import { runROWAnalysis } from "../data/cadastre";
import { useStore } from "../state/store";
import type { ProjectRecord } from "../data/registry";
import { CornerTicks } from "./ui";

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    map.fitBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ], { padding: [24, 24], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export default function ROWImpact({ record, onOpenCadastre }: {
  record: ProjectRecord;
  onOpenCadastre?: () => void;
}) {
  const { parcels, centerlines } = useStore();
  const cl = useMemo(
    () => centerlines.find((c) => c.projectId === record.id) ?? null,
    [centerlines, record.id]
  );
  const analysis = useMemo(
    () => (cl && parcels.length ? runROWAnalysis(parcels, cl) : null),
    [parcels, cl]
  );
  const affectedIds = useMemo(() => new Set(analysis?.rows.map((r) => r.lotId) ?? []), [analysis]);

  const fitPts = useMemo<LatLng[]>(() => {
    if (!cl) return [];
    return [...cl.line];
  }, [cl]);

  const agg = useMemo(() => {
    if (!analysis) return null;
    return {
      n: analysis.rows.length,
      pvtN: analysis.rows.filter((r) => r.ownerType === "Private").length,
      govN: analysis.rows.filter((r) => r.ownerType === "Government").length,
      cost: analysis.totalCost,
      privA: analysis.privM2,
    };
  }, [analysis]);

  return (
    <div className="relative mt-4 rounded-[4px] border-2 border-ink-800 bg-ink-950">
      <CornerTicks />
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2.5">
        <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-amber-400 uppercase">
          Lot overlap · ROW impact
        </p>
        <p className="font-mono text-[8.5px] tracking-[0.12em] text-paper-300/50 uppercase">
          {cl ? `${cl.id} · r = ${cl.radiusM} m` : "no centerline linked"}
        </p>
      </div>

      {!cl ? (
        <div className="px-4 py-6 text-center">
          <p className="font-mono text-[10.5px] leading-relaxed text-paper-300/60">
            No road centerline is linked to this project yet. Import its KML / GPX as a
            centerline in <b className="text-amber-400">Lot &amp; ROW Analysis</b> and link it to
            this record to compute overlapping lots and acquisition cost.
          </p>
          {onOpenCadastre && (
            <button
              onClick={onOpenCadastre}
              className="mt-3 cursor-pointer rounded-[3px] bg-amber-500 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-colors hover:bg-amber-400"
            >
              Open Lot &amp; ROW Analysis
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="h-[240px] w-full">
            <MapContainer center={fitPts[0] ?? [9.7405, 118.7372]} zoom={15} scrollWheelZoom={false} attributionControl={false} className="h-full w-full">
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds points={fitPts} />

              {/* corridor buffer */}
              {analysis && (
                <Polygon
                  positions={analysis.corridorRing}
                  pathOptions={{ color: "#f0a32b", weight: 1.5, fillColor: "#f0a32b", fillOpacity: 0.14, dashArray: "4 4" }}
                />
              )}

              {/* affected lots */}
              {parcels.filter((p) => affectedIds.has(p.id)).map((p) => (
                <Polygon
                  key={p.id}
                  positions={p.ring}
                  pathOptions={{
                    color: p.ownerType === "Government" ? "#1e7a58" : "#de5a36",
                    weight: 2,
                    fillColor: p.ownerType === "Government" ? "#1e7a58" : "#de5a36",
                    fillOpacity: 0.4,
                  }}
                >
                  <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
                    {p.id} · {p.ownerType === "Government" ? "GOV" : "PVT"}
                  </Tooltip>
                </Polygon>
              ))}

              {/* centerline */}
              <Polyline positions={cl.line} pathOptions={{ color: "#ffc24d", weight: 3, opacity: 0.95 }} />

              {/* geotagged station, if present */}
              {record.location.evidence && (
                <CircleMarker
                  center={[record.location.evidence.lat, record.location.evidence.lng]}
                  radius={6}
                  pathOptions={{ color: "#f5f7f0", weight: 2, fillColor: "#de5a36", fillOpacity: 1 }}
                />
              )}
            </MapContainer>
          </div>

          {agg && (
            <div className="grid grid-cols-2 gap-px border-t border-ink-700 bg-ink-700">
              <div className="bg-ink-950 px-4 py-2.5">
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-paper-300/50 uppercase">Lots overlapped</p>
                <p className="font-display mt-0.5 text-[22px] leading-none font-bold text-amber-400">{agg.n}</p>
                <p className="mt-0.5 font-mono text-[9px] text-paper-300/50">{agg.govN} gov · {agg.pvtN} private</p>
              </div>
              <div className="bg-ink-950 px-4 py-2.5">
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-paper-300/50 uppercase">Private area affected</p>
                <p className="font-display mt-0.5 text-[22px] leading-none font-bold text-paper-100">{fmtArea(agg.privA)}</p>
                <p className="mt-0.5 font-mono text-[9px] text-paper-300/50">subject to acquisition</p>
              </div>
              <div className="col-span-2 flex items-center justify-between bg-ink-900 px-4 py-2.5">
                <p className="font-mono text-[9px] font-bold tracking-[0.14em] text-coral-400 uppercase">ROW acquisition cost</p>
                <p className="font-display text-[24px] leading-none font-bold text-coral-400 tabular">₱{agg.cost.toLocaleString("en-PH")}</p>
              </div>
            </div>
          )}

          {/* per-lot affected area + cost */}
          {analysis && analysis.rows.length > 0 && (
            <div className="max-h-[170px] overflow-y-auto border-t border-ink-700">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-ink-900">
                  <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8px] [&>th]:font-semibold [&>th]:tracking-[0.12em] [&>th]:text-paper-300/60 [&>th]:uppercase">
                    <th>Lot</th>
                    <th>Type</th>
                    <th className="!text-right">Affected</th>
                    <th className="!text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {analysis.rows.map((r) => (
                    <tr key={r.lotId} className="transition-colors hover:bg-ink-900/60">
                      <td className="px-3 py-1.5">
                        <p className="font-mono text-[10px] font-bold text-paper-100">{r.lotId}</p>
                        <p className="truncate font-mono text-[8.5px] text-paper-300/45">{r.owner}</p>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider uppercase ${r.ownerType === "Government" ? "bg-pine-600/25 text-pine-400" : "bg-coral-500/25 text-coral-400"}`}>
                          {r.ownerType === "Government" ? "GOV" : "PVT"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[10px] font-semibold text-paper-100 tabular">{fmtArea(r.affectedM2)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[10px] tabular">
                        {r.cost === 0
                          ? <span className="font-semibold text-pine-400">₱0</span>
                          : <span className="font-semibold text-coral-400">₱{(r.cost / 1e6).toFixed(2)}M</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
