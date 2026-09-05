import { useMemo, useState } from "react";
import MapView from "../components/MapView";
import { PageHeader, Reveal, CornerTicks, CountUp, conditionMeta } from "../components/ui";
import { cityRoads as roads, networkByYear, cityNetworkKm as totalNetworkKm, pavedPct, barangayCount, type Road } from "../data/roads";
import {
  statusOf, STATUS_META, STATUS_LABELS, typeShort, fmtPesoM, activityFeed,
  PROJECT_TYPES, TYPE_COLORS,
} from "../data/registry";
import { useStore, recordPoint } from "../state/store";
import { Donut, HBars, StackedBar, AreaChart } from "../components/charts";
import { surfaceMix, conditionMix } from "../data/roads";

export default function Overview({ focus, onLocate, onOpenInventory }: {
  focus: { point: [number, number]; zoom: number; key: number } | null;
  onLocate: (point: [number, number], zoom?: number) => void;
  onOpenInventory: (roadId: string) => void;
}) {
  const { records } = useStore();
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const totalContracted = records.reduce((s, r) => s + r.contractedAmount, 0);
  const totalActual = records.reduce((s, r) => s + r.actualAmount, 0);
  const weightedPct = totalContracted
    ? Math.round(records.reduce((s, r) => s + r.percent * r.contractedAmount, 0) / totalContracted)
    : 0;
  const activeCount = records.filter((r) => { const l = statusOf(r).label; return l === "Ongoing" || l === "Delayed"; }).length;

  const feed = useMemo(
    () => records.filter((r) => r.percent > 0 && r.percent < 100).sort((a, b) => b.contractedAmount - a.contractedAmount).slice(0, 5),
    [records]
  );

  const statusDonut = useMemo(
    () => STATUS_LABELS.map((l) => ({
      label: l,
      value: +records.filter((r) => statusOf(r).label === l).reduce((s, r) => s + r.contractedAmount, 0).toFixed(0) / 1e6,
      color: STATUS_META[l].color,
    })).filter((d) => d.value > 0),
    [records]
  );

  const typeBars = useMemo(
    () => PROJECT_TYPES
      .map((t) => ({ label: t, value: +(records.filter((r) => r.type === t).reduce((s, r) => s + r.contractedAmount, 0) / 1e6).toFixed(1), color: TYPE_COLORS[t] }))
      .filter((d) => d.value > 0),
    [records]
  );

  const kpis: { label: string; node: React.ReactNode; sub: string; accent?: string }[] = [
    {
      label: "City road network",
      node: <CountUp value={totalNetworkKm} decimals={1} suffix=" km" />,
      sub: `${roads.length} segments · OCE jurisdiction`,
    },
    {
      label: "Registered projects",
      node: <CountUp value={records.length} />,
      sub: "project_records rows",
    },
    {
      label: "Active works",
      node: <CountUp value={activeCount} />,
      sub: "ongoing + delayed on site",
      accent: "#f0a32b",
    },
    {
      label: "Contracted value",
      node: <CountUp value={totalContracted / 1e6} decimals={1} prefix="₱" suffix="M" />,
      sub: "approved appropriations",
    },
    {
      label: "Actual to date",
      node: <CountUp value={totalActual / 1e6} decimals={1} prefix="₱" suffix="M" />,
      sub: `${Math.round((totalActual / (totalContracted || 1)) * 100)}% of contracted`,
      accent: "#f0a32b",
    },
    {
      label: "Weighted completion",
      node: <CountUp value={weightedPct} suffix="%" />,
      sub: "by contracted value",
      accent: "#2f9a70",
    },
  ];

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-GIS-01"
        title="Geospatial Console"
        subtitle="Live PostGIS view of CITY roads under OCE jurisdiction and registered road projects. Dashed grey alignments are national highways — DPWH-managed, kept for map context only. Stations are pinned from barangay coverage and supporting KML / GPX / geotag evidence."
      />

      {/* KPI ledger strip — uniform cells, consistent hierarchy */}
      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="group relative bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <span
                className="absolute top-0 left-0 h-[3px] w-0 bg-amber-500 transition-all duration-300 group-hover:w-full"
                style={k.accent ? { background: k.accent } : undefined}
              />
              <p className="font-mono text-[9px] leading-tight tracking-[0.18em] text-paper-300/50 uppercase">{k.label}</p>
              <p className="font-display mt-1.5 text-[30px] leading-none font-bold text-paper-100 xl:text-[32px]">{k.node}</p>
              <p className="mt-1.5 truncate font-mono text-[8.5px] tracking-[0.12em] text-amber-400/80 uppercase" title={k.sub}>{k.sub}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* map */}
        <Reveal className="lg:col-span-12 xl:col-span-8">
          <section className="relative rounded-[4px] border-2 border-ink-800 bg-ink-950 shadow-[0_24px_60px_rgba(12,25,19,0.35)]">
            <CornerTicks />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink-800 px-4 py-3">
              <div>
                <h2 className="font-display text-[26px] leading-none font-bold tracking-wide text-paper-100 uppercase">
                  Road Network & Project Stations
                </h2>
                <p className="mt-1 font-mono text-[9.5px] tracking-[0.18em] text-paper-300/50 uppercase">
                  Puerto Princesa City · Palawan · EPSG:4326 → 3857
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-wider text-paper-300/60 uppercase">
                <span className="dot-live h-2 w-2 rounded-full bg-pine-400" />
                PostGIS · {roads.length} segments / {records.length} stations
              </div>
            </div>
            <MapView focus={focus} roads={roads} onLocate={(r: Road) => { setSelectedRoad(r); onLocate(r.geometry[Math.floor(r.geometry.length / 2)], 15); }} />
            {selectedRoad && (
              <div className="anim-fade-up flex items-center gap-3 border-t border-ink-700 px-4 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: conditionMeta[selectedRoad.condition].color }} />
                <p className="min-w-0 truncate font-mono text-[10.5px] text-paper-300/80">
                  <b className="text-amber-400">{selectedRoad.name}</b> · {selectedRoad.lengthKm} km · PCI {selectedRoad.pci} · {selectedRoad.surface}
                </p>
                <button
                  onClick={() => onOpenInventory(selectedRoad.id)}
                  className="ml-auto shrink-0 cursor-pointer rounded-[3px] border border-amber-500/50 px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-amber-500 hover:text-ink-950"
                >
                  Open record →
                </button>
                <button onClick={() => setSelectedRoad(null)} className="shrink-0 cursor-pointer font-mono text-[9.5px] text-paper-300/40 uppercase hover:text-paper-100">✕</button>
              </div>
            )}
          </section>

          {/* active works feed */}
          <Reveal className="mt-5" delay={80}>
            <div className="rounded-[4px] border border-line-300 bg-paper-100 p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">Active Works Register</h2>
                <p className="font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">click a row to fly the console to station</p>
              </div>
              <ul className="divide-y divide-line-300">
                {feed.map((p) => {
                  const meta = statusOf(p);
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => onLocate(recordPoint(p), 15)}
                        className="group grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 text-left transition-colors hover:bg-ink-900/[0.04] sm:grid-cols-[1fr_120px_86px_auto]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-ink-900 group-hover:text-pine-700">{p.name}</span>
                          <span className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">
                            {p.id} · {typeShort[p.type]} · {p.mode} · {p.folderNo}
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <span className="block h-[7px] overflow-hidden rounded-full bg-ink-900/10">
                            <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${p.percent}%`, background: meta.color }} />
                          </span>
                          <span className="mt-1 block font-mono text-[9px] text-text-400 tabular">{p.percent}% of scope</span>
                        </span>
                        <span className="hidden text-right font-mono text-[11.5px] font-semibold text-ink-900 tabular sm:block">{fmtPesoM(p.contractedAmount)}</span>
                        <span
                          className="justify-self-end rounded-[3px] px-2 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-transform group-hover:translate-x-0.5"
                          style={{ color: meta.color, background: meta.soft }}
                        >
                          {meta.label} →
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </Reveal>

        {/* right column */}
        <div className="space-y-5 lg:col-span-12 xl:col-span-4">
          <Reveal delay={60}>
            <div className="relative rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5">
              <CornerTicks />
              <h2 className="font-display mb-1 text-2xl font-bold tracking-wide text-paper-100 uppercase">Program by Status</h2>
              <p className="mb-5 font-mono text-[9.5px] tracking-[0.16em] text-paper-300/50 uppercase">
                contracted ₱ millions · as of {today}
              </p>
              <Donut data={statusDonut} centerLabel={fmtPesoM(totalContracted)} centerSub="contracted" size={168} />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative rounded-[4px] border border-line-300 bg-paper-100 p-5">
              <CornerTicks color="border-ink-800/50" />
              <h2 className="font-display mb-4 text-2xl font-bold tracking-wide text-ink-900 uppercase">Network Condition</h2>
              <div className="mb-4 flex items-center gap-6">
                <div>
                  <p className="font-display text-5xl leading-none font-bold text-ink-900"><CountUp value={pavedPct} suffix="%" /></p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">paved coverage</p>
                </div>
                <div className="h-14 w-px bg-line-400" />
                <div>
                  <p className="font-display text-5xl leading-none font-bold text-ink-900"><CountUp value={barangayCount} /></p>
                  <p className="mt-1 font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">barangays served</p>
                </div>
              </div>
              {["Good", "Fair", "Poor"].map((c) => {
                const km = conditionMix.find((x) => x.label === c)!.km;
                const pct = Math.round((km / totalNetworkKm) * 100);
                const m = conditionMeta[c as keyof typeof conditionMeta];
                return (
                  <div key={c} className="group mb-2.5">
                    <div className="mb-1 flex justify-between font-mono text-[9.5px] tracking-[0.14em] text-text-600 uppercase">
                      <span>{c} · PCI {c === "Good" ? "70–100" : c === "Fair" ? "40–69" : "0–39"}</span>
                      <span className="tabular">{km} km · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-[2px] bg-ink-900/10">
                      <div className="h-full rounded-[2px] transition-all duration-500 group-hover:brightness-110" style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="rounded-[4px] border border-line-300 bg-paper-100 p-5">
              <h2 className="font-display mb-4 text-2xl font-bold tracking-wide text-ink-900 uppercase">Surface Composition</h2>
              <StackedBar data={surfaceMix} />
            </div>
          </Reveal>
        </div>
      </div>

      {/* lower grid */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">Paved Network Growth</h2>
              <p className="font-mono text-[9.5px] tracking-[0.14em] text-amber-600 uppercase">km · FY 2019–2026</p>
            </div>
            <AreaChart points={networkByYear} height={150} />
          </div>
        </Reveal>

        <Reveal className="lg:col-span-4" delay={80}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">Appropriation by Type</h2>
              <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-400 uppercase">₱M</p>
            </div>
            <HBars data={typeBars} unit="₱M" />
          </div>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={160}>
          <div className="relative flex h-full flex-col rounded-[4px] border-2 border-ink-800 bg-ink-950">
            <CornerTicks />
            <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
              <span className="dot-live h-1.5 w-1.5 rounded-full bg-pine-400" />
              <h2 className="font-display text-xl font-bold tracking-wide text-paper-100 uppercase">Field Activity</h2>
            </div>
            <ul className="flex-1 divide-y divide-ink-800 overflow-y-auto">
              {activityFeed.map((a, i) => (
                <li key={i} className="group px-4 py-3 transition-colors hover:bg-ink-900">
                  <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-paper-300/45 uppercase">
                    <span className="rounded-[2px] bg-amber-500/15 px-1 py-0.5 font-bold text-amber-400">{a.tag}</span>
                    {a.ts} PHT
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-paper-300/85 transition-colors group-hover:text-paper-100">{a.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
