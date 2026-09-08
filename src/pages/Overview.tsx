/* Geospatial console — live map, KPI ledger, active works, charts, feed.
   The map draws only project-ledger-linked roads; network figures scope to
   the same ledger subset so console / map / register always agree. */

import { useMemo, useState } from "react";
import MapView, { type Focus } from "../components/MapView";
import { PageHeader, Reveal, CornerTicks, CountUp, conditionMeta } from "../components/ui";
import { AreaChart, Donut, HBars } from "../components/charts";
import { useStore } from "../state/store";
import {
  statusOf, STATUS_META, STATUS_LABELS, fmtPesoM, typeAbbr, typeColorOf, PROJECT_TYPES, activityFeed,
  type ProjectRecord,
} from "../data/registry";
import { cityRoads, networkByYear, type Road } from "../data/roads";
import { IconPin } from "../components/icons";

export default function Overview({ focus, onLocate, onOpenInventory }: {
  focus: Focus | null;
  onLocate: (point: [number, number], zoom?: number) => void;
  onOpenInventory: (roadId: string) => void;
}) {
  const { records, personnel } = useStore();
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);

  /* city (OCE) roads shaped for the map; map layer further filters to linked */
  const mapRoads = useMemo<Road[]>(() => cityRoads, []);

  const linked = useMemo(() => {
    const ids = new Set(records.map((r) => r.roadId).filter((x): x is string => !!x));
    const rs = cityRoads.filter((r) => ids.has(r.id));
    return { count: rs.length, km: rs.reduce((s, r) => s + r.lengthKm, 0) };
  }, [records]);

  const totalContracted = records.reduce((s, r) => s + r.contractedAmount, 0);
  const totalActual = records.reduce((s, r) => s + r.actualAmount, 0);
  const weightedPct = totalContracted ? Math.round(records.reduce((s, r) => s + r.percent * r.contractedAmount, 0) / totalContracted) : 0;

  const statusDonut = useMemo(
    () => STATUS_LABELS.map((l) => ({
      label: l,
      value: +(records.filter((r) => statusOf(r).label === l).reduce((s, r) => s + r.contractedAmount, 0) / 1e6).toFixed(1),
      color: STATUS_META[l].color,
    })).filter((d) => d.value > 0),
    [records]
  );

  const typeBars = useMemo(
    () => PROJECT_TYPES.map((t) => ({
      label: t,
      value: +(records.filter((r) => r.type === t).reduce((s, r) => s + r.contractedAmount, 0) / 1e6).toFixed(1),
      color: typeColorOf(t),
    })).filter((d) => d.value > 0),
    [records]
  );

  const activeWorks = useMemo(
    () => records.filter((r) => r.percent > 0 && r.percent < 100).sort((a, b) => b.percent - a.percent).slice(0, 5),
    [records]
  );

  const kpis: { label: string; node: React.ReactNode; sub: string }[] = [
    { label: "Inventoried network", node: <CountUp value={+linked.km.toFixed(1)} decimals={1} suffix=" km" />, sub: `${linked.count} linked roads · ledger scope` },
    { label: "Registered projects", node: <CountUp value={records.length} />, sub: "21-field registry" },
    { label: "Active works", node: <CountUp value={activeWorks.length} />, sub: "physically ongoing" },
    { label: "Contracted", node: <CountUp value={totalContracted / 1e6} decimals={1} prefix="₱" suffix="M" />, sub: "approved appropriations" },
    { label: "Actual to date", node: <CountUp value={totalActual / 1e6} decimals={1} prefix="₱" suffix="M" />, sub: `${Math.round((totalActual / (totalContracted || 1)) * 100)}% of contracted` },
    { label: "Weighted completion", node: <CountUp value={weightedPct} suffix="%" />, sub: "by contracted value" },
  ];

  const eName = (id: string) => personnel.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-GIS-01"
        title="Geospatial Console"
        subtitle="Live PostGIS view of the city road network and registered road projects. Only roads linked to the project ledger are drawn — pins resolve geotag → centerline → barangay centroid."
      />

      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.18em] text-paper-300/50 uppercase">{k.label}</p>
              <p className="font-display mt-1.5 text-3xl leading-none font-bold text-paper-100">{k.node}</p>
              <p className="mt-1.5 truncate font-mono text-[8.5px] tracking-[0.12em] text-amber-400/80 uppercase">{k.sub}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-4" delay={70}>
        <div className="relative">
          <CornerTicks />
          <MapView roads={mapRoads} focus={focus} onLocate={(r) => { setSelectedRoad(r); onLocate(r.geometry[Math.floor(r.geometry.length / 2)], 15); }} />
          <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-1 font-mono text-[10px] tracking-wider text-text-600 uppercase">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" /> Project-ledger linked roads · {linked.count}</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-teal-500" /> Centerline axes</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-pine-500" /> Barangay centroids</span>
            <span className="ml-auto text-text-400">click a road to focus · PostGIS · EPSG 3857</span>
          </p>
        </div>
      </Reveal>

      {selectedRoad && (
        <Reveal className="mt-4">
          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border-2 border-ink-800 bg-paper-100 px-5 py-3.5">
            <CornerTicks color="border-ink-800/50" />
            <p className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">{selectedRoad.name}</p>
            <p className="font-mono text-[10px] tracking-wider text-text-600 uppercase">
              {selectedRoad.roadClass} · {selectedRoad.surface} · {selectedRoad.lengthKm.toFixed(1)} km · PCI
              <b style={{ color: conditionMeta[selectedRoad.condition].color }}> {selectedRoad.pci}</b> · {selectedRoad.condition}
            </p>
            <button onClick={() => onOpenInventory(selectedRoad.id)}
              className="ml-auto cursor-pointer rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-colors hover:bg-ink-800">
              Open in Road Inventory
            </button>
          </div>
        </Reveal>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">Active Works</h2>
              <p className="font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">{activeWorks.length} physically ongoing</p>
            </div>
            <ul className="space-y-2.5">
              {activeWorks.map((p) => {
                const m = statusOf(p);
                return (
                  <li key={p.id}>
                    <button onClick={() => onLocate(projectPointOf(p), 15)}
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-[3px] border border-line-300 bg-white/60 px-3.5 py-2.5 text-left transition-all hover:border-ink-800 hover:bg-paper-200">
                      <span className="shrink-0" style={{ color: m.color, display: "inline-flex" }}><IconPin size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-ink-900 group-hover:text-pine-700">{p.name}</span>
                        <span className="mt-0.5 block font-mono text-[9px] tracking-wider text-text-400 uppercase">
                          {p.id} · {typeAbbr(p.type)} · {p.mode} · in-charge {eName(p.inchargeId)}
                        </span>
                      </span>
                      <span className="w-28 shrink-0">
                        <span className="flex justify-between font-mono text-[9px] uppercase" style={{ color: m.color }}>
                          <b>{m.label}</b><span>{p.percent}%</span>
                        </span>
                        <span className="mt-1 block h-[7px] overflow-hidden rounded-full bg-ink-900/10">
                          <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${p.percent}%`, background: m.color }} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {activeWorks.length === 0 && (
                <li className="rounded-[3px] border border-dashed border-line-400 px-3 py-4 text-center font-mono text-[10.5px] text-text-400">
                  No physically ongoing works.
                </li>
              )}
            </ul>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={70}>
          <div className="relative h-full rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5">
            <CornerTicks />
            <h2 className="font-display mb-1 text-2xl font-bold tracking-wide text-paper-100 uppercase">Budget by Status</h2>
            <p className="mb-4 font-mono text-[9px] tracking-[0.16em] text-paper-300/50 uppercase">₱ millions programmed</p>
            <Donut data={statusDonut} centerLabel={`₱${(totalContracted / 1e6).toFixed(1)}M`} centerSub="total" size={168} />
            <div className="mt-5 border-t border-ink-700 pt-4">
              <h3 className="font-display mb-2.5 text-lg font-bold tracking-wide text-paper-100 uppercase">Appropriation by Program</h3>
              <HBars unit="₱M" data={typeBars} />
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={100}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">Paved Network Growth</h2>
              <p className="font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">
                km paved · FY 2019–2026 · <span className="font-semibold text-amber-600">+{(networkByYear[networkByYear.length - 1].km - networkByYear[0].km).toFixed(1)} km cumulative</span>
              </p>
            </div>
            <AreaChart points={networkByYear} height={210} />
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={130}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-ink-950 p-5">
            <CornerTicks />
            <h2 className="font-display mb-3 text-2xl font-bold tracking-wide text-paper-100 uppercase">Field Wire</h2>
            <ul className="space-y-2.5">
              {activityFeed.map((a, i) => (
                <li key={i} className="flex gap-3 rounded-[3px] border border-ink-800 bg-ink-900/70 px-3.5 py-2.5 transition-colors hover:border-ink-600">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.tag === "FIELD" ? "bg-amber-400" : a.tag === "GIS" ? "bg-teal-400" : a.tag === "BIDS" ? "bg-coral-400" : "bg-pine-400"}`} />
                  <span className="min-w-0">
                    <span className="block font-mono text-[8.5px] tracking-[0.16em] text-paper-300/50 uppercase">{a.ts} · {a.tag}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-paper-300/85">{a.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function projectPointOf(p: ProjectRecord): [number, number] {
  const geo = (p.attachments ?? []).find((a) => a.lat != null && a.lng != null);
  if (geo) return [geo.lat!, geo.lng!];
  return [9.744, 118.741];
}
