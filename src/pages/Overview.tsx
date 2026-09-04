import { useMemo, useState } from "react";
import MapView, { type Focus } from "../components/MapView";
import { roads, networkByYear, totalNetworkKm, pavedPct, barangayCount, type Road } from "../data/roads";
import { projects, statusMeta, activityFeed } from "../data/projects";
import { CornerTicks, CountUp, Reveal, StatusPill, fmtM, conditionMeta } from "../components/ui";
import { Donut, HBars, Sparkline, StackedBar } from "../components/charts";
import { IconArrow, IconPin, IconRoad, IconClose } from "../components/icons";
import { surfaceMix, conditionMix } from "../data/roads";

function SectionHead({ no, title, right }: { no: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="flex items-end gap-3">
        <span className="font-display border-2 border-ink-800 bg-amber-500 px-2 py-0.5 text-lg leading-none font-bold text-ink-950">{no}</span>
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide text-ink-900 uppercase sm:text-3xl">{title}</h2>
      </div>
      {right}
      <span className="hidden h-px flex-1 bg-line-400 sm:block" />
    </div>
  );
}

const tagColor: Record<string, string> = {
  FIELD: "#f0a32b", GIS: "#12897e", BIDS: "#4a70b0", INSP: "#de5a36", SYNC: "#1e7a58",
};

export default function Overview({ focus, onLocate, onOpenInventory }: {
  focus: Focus | null;
  onLocate: (point: [number, number], zoom?: number) => void;
  onOpenInventory: (roadId: string) => void;
}) {
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === "Ongoing" || p.status === "Delayed");
    const portfolio = projects.reduce((s, p) => s + p.budgetM, 0);
    const pci = roads.reduce((s, r) => s + r.pci, 0) / roads.length;
    const byStatus = (["Ongoing", "For Bidding", "Planned", "Completed", "Delayed"] as const).map((s) => ({
      label: s, value: projects.filter((p) => p.status === s).length, color: statusMeta[s].color,
    }));
    return { active, portfolio, pci, byStatus };
  }, []);

  const brgyKm = useMemo(() => {
    const map = new Map<string, number>();
    roads.forEach((r) => {
      const key = r.barangay.split(" / ")[0];
      map.set(key, (map.get(key) ?? 0) + r.lengthKm);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value: +value.toFixed(1), color: "#175c43" }));
  }, []);

  const kpis: { label: string; value: number; decimals: number; suffix: string; prefix?: string; sub: string; wide?: boolean }[] = [
    { label: "City road network", value: totalNetworkKm, decimals: 1, suffix: " km", sub: `${roads.length} inventoried segments · WGS 84`, wide: true },
    { label: "Active worksites", value: stats.active.length, decimals: 0, suffix: "", sub: `${projects.filter((p) => p.status === "Delayed").length} flagged delayed` },
    { label: "Project portfolio", value: stats.portfolio, decimals: 1, prefix: "₱", suffix: "M", sub: "FY 2019–2026 programmed" },
    { label: "Mean pavement index", value: stats.pci, decimals: 0, suffix: "", sub: "PCI scale 0–100" },
    { label: "Barangays served", value: barangayCount, decimals: 0, suffix: "", sub: `${pavedPct}% network paved` },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      {/* ------- 01 · MAP CONSOLE ------- */}
      <Reveal>
        <SectionHead
          no="01"
          title="Geospatial Console"
          right={
            <p className="hidden shrink-0 font-mono text-[10px] tracking-[0.16em] text-text-400 uppercase lg:block">
              Layer: road_condition_v3 · Live from PostGIS
            </p>
          }
        />
        <div className="relative">
          <CornerTicks />
          <MapView
            roads={roads}
            focus={focus}
            selectedRoadId={selectedRoad?.id ?? null}
            onSelectRoad={setSelectedRoad}
            className="h-[56vh] min-h-[430px]"
          />
          {/* selected road card */}
          {selectedRoad && (
            <div className="anim-fade-up absolute right-3 bottom-10 z-[600] w-72 rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-[0_16px_40px_rgba(7,17,12,0.5)]">
              <div className="flex items-start justify-between gap-2 border-b-2 border-ink-800 bg-ink-900 px-3.5 py-2.5">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.2em] text-amber-400 uppercase">{selectedRoad.roadClass} ROAD · {selectedRoad.id.toUpperCase()}</p>
                  <p className="font-display text-xl leading-tight font-bold text-paper-100">{selectedRoad.name}</p>
                </div>
                <button onClick={() => setSelectedRoad(null)} className="cursor-pointer p-1 text-paper-300/60 hover:text-amber-400">
                  <IconClose size={15} />
                </button>
              </div>
              <dl className="grid grid-cols-3 gap-px bg-line-300 font-mono text-[10.5px]">
                {[
                  ["LENGTH", `${selectedRoad.lengthKm.toFixed(1)} km`],
                  ["WIDTH", `${selectedRoad.widthM} m`],
                  ["PCI", `${selectedRoad.pci}`],
                  ["SURFACE", selectedRoad.surface.toUpperCase()],
                  ["AADT", selectedRoad.aadt.toLocaleString()],
                  ["INSPECTED", selectedRoad.lastInspection],
                ].map(([k, v]) => (
                  <div key={k} className="bg-paper-100 px-2.5 py-1.5">
                    <dt className="text-[8.5px] tracking-[0.16em] text-text-400">{k}</dt>
                    <dd className="font-semibold text-ink-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={() => onOpenInventory(selectedRoad.id)}
                className="group flex w-full cursor-pointer items-center justify-center gap-2 bg-amber-500 py-2 font-mono text-[10.5px] font-semibold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400"
              >
                <IconRoad size={14} /> Open full record
                <IconArrow size={13} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>

        {/* legend strip */}
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[3px] border border-line-300 bg-paper-100 px-3.5 py-2.5">
          <span className="font-mono text-[9px] tracking-[0.2em] text-text-400 uppercase">Legend</span>
          {(Object.keys(conditionMeta) as (keyof typeof conditionMeta)[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5 font-mono text-[10px] text-text-600">
              <i className="h-[3px] w-5 rounded-full" style={{ background: c === "Good" ? "#2fae7d" : c === "Fair" ? "#f0a32b" : "#e8603c" }} /> {c}
            </span>
          ))}
          <span className="h-4 w-px bg-line-400" />
          {["National", "Provincial", "City"].map((c, i) => (
            <span key={c} className="flex items-center gap-1.5 font-mono text-[10px] text-text-600">
              <i className="rounded-full bg-ink-800" style={{ width: 18, height: [5, 4, 3][i] }} /> {c}
            </span>
          ))}
          <span className="h-4 w-px bg-line-400" />
          {(Object.keys(statusMeta) as (keyof typeof statusMeta)[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 font-mono text-[10px] text-text-600">
              <i className="h-2.5 w-2.5 rounded-full border border-ink-900" style={{ background: statusMeta[s].color }} /> {s}
            </span>
          ))}
        </div>
      </Reveal>

      {/* ------- 02 · KPI STRIP ------- */}
      <div className="mt-10">
        <Reveal><SectionHead no="02" title="Network Ledger" /></Reveal>
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          {kpis.map((k, i) => (
            <Reveal key={k.label} delay={i * 60} className={k.wide ? "col-span-2 lg:col-span-1" : ""}>
              <div className="group relative h-full overflow-hidden rounded-[4px] border border-line-300 bg-paper-100 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-800 hover:shadow-[0_10px_28px_rgba(21,35,28,0.14)]" style={{ ["--i" as string]: i }}>
                <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-amber-500 transition-transform duration-300 group-hover:scale-x-100" />
                <p className="font-mono text-[9.5px] tracking-[0.18em] text-text-400 uppercase">{k.label}</p>
                <p className="font-display mt-1.5 text-4xl leading-none font-bold text-ink-900 lg:text-[44px]">
                  <CountUp value={k.value} decimals={k.decimals} prefix={k.prefix ?? ""} suffix={k.suffix} />
                </p>
                <p className="mt-2 font-mono text-[9.5px] text-text-400">{k.sub}</p>
                {k.wide && (
                  <div className="mt-2 flex items-end justify-between">
                    <Sparkline values={networkByYear.map((n) => n.km)} width={150} height={36} color="#d18a14" />
                    <p className="font-mono text-[9.5px] text-text-400">paved km, '19→'26</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ------- 03 · WORKS + STATUS ------- */}
      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-5" delay={0}>
          <SectionHead no="03" title="Active Works" />
          <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-900">
            <CornerTicks />
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-ink-700 bg-ink-950/60 px-4 py-2.5">
              <p className="font-mono text-[9.5px] tracking-[0.2em] text-paper-300/60 uppercase">Ongoing + delayed · sort by physical progress</p>
              <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-pine-400">
                <span className="dot-live h-1.5 w-1.5 rounded-full bg-pine-400" /> FIELD SYNC 5 MIN AGO
              </span>
            </div>
            <ul className="divide-y divide-ink-700/70">
              {[...stats.active].sort((a, b) => b.progress - a.progress).map((p) => {
                const m = statusMeta[p.status];
                return (
                  <li key={p.id} className="group cursor-pointer px-4 py-3 transition-colors hover:bg-ink-800/70" onClick={() => onLocate(p.point, 15)}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-[13.5px] font-semibold text-paper-100 group-hover:text-amber-300">
                        <span className="mr-2 font-mono text-[9.5px] text-paper-300/50">{p.code}</span>{p.name}
                      </p>
                      <span className="shrink-0 font-mono text-[11px] font-semibold tabular" style={{ color: m.color }}>{p.progress}%</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-ink-700">
                        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${p.progress}%`, background: m.color }} />
                      </div>
                      <span className="font-mono text-[10px] text-paper-300/60 tabular">{fmtM(p.budgetM)}</span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-2 font-mono text-[9.5px] text-paper-300/50">
                      <IconPin size={11} /> {p.roadName} · {p.contractor}
                      {p.status === "Delayed" && <StatusPill label="DELAYED" color={m.color} soft={m.soft} />}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-ink-700 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-paper-300/40 uppercase">
              Click an entry to fly the console to its station point
            </p>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-4" delay={90}>
          <SectionHead no="04" title="Portfolio Status" />
          <div className="relative rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5">
            <CornerTicks />
            <Donut data={stats.byStatus} centerLabel={String(projects.length)} centerSub="projects" size={168} />
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-ink-700 font-mono text-[10px]">
              <div className="bg-ink-950/70 px-3 py-2">
                <p className="text-paper-300/50 uppercase tracking-[0.14em] text-[8.5px]">Obligated</p>
                <p className="mt-0.5 text-[12px] font-semibold text-amber-400 tabular">{fmtM(projects.filter((p) => p.status !== "Planned").reduce((s, p) => s + p.budgetM, 0))}</p>
              </div>
              <div className="bg-ink-950/70 px-3 py-2">
                <p className="text-paper-300/50 uppercase tracking-[0.14em] text-[8.5px]">Avg progress (active)</p>
                <p className="mt-0.5 text-[12px] font-semibold text-pine-400 tabular">
                  {Math.round(stats.active.reduce((s, p) => s + p.progress, 0) / (stats.active.length || 1))}%
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={160}>
          <SectionHead no="05" title="Condition" />
          <div className="relative rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <p className="mb-3 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Network by condition (km)</p>
            <HBars data={conditionMix.map((c) => ({ label: c.label, value: c.km, color: c.color }))} />
            <div className="my-5 h-px bg-line-300" />
            <p className="mb-3 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Surface composition</p>
            <StackedBar data={surfaceMix} />
          </div>
        </Reveal>
      </div>

      {/* ------- 06 · COVERAGE + ACTIVITY ------- */}
      <div className="mt-10 grid gap-4 pb-4 lg:grid-cols-2">
        <Reveal delay={0}>
          <SectionHead no="06" title="Barangay Coverage" />
          <div className="relative rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <p className="mb-4 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">
              Top inventoried segments by barangay · of {barangayCount} total
            </p>
            <HBars data={brgyKm} />
          </div>
        </Reveal>

        <Reveal delay={90}>
          <SectionHead no="07" title="Field Activity Log" />
          <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-950">
            <CornerTicks />
            <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full border border-ink-600 bg-coral-500" />
              <span className="h-2.5 w-2.5 rounded-full border border-ink-600 bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full border border-ink-600 bg-pine-400" />
              <span className="ml-2 font-mono text-[9.5px] tracking-[0.18em] text-paper-300/60 uppercase">tail -f /var/log/rpis/field.sync</span>
            </div>
            <ul className="max-h-[300px] divide-y divide-ink-800/80 overflow-y-auto">
              {activityFeed.map((a) => (
                <li key={a.ts} className="flex gap-3 px-4 py-2.5 font-mono text-[10.5px] leading-relaxed transition-colors hover:bg-ink-900">
                  <span className="shrink-0 text-paper-300/45 tabular">{a.ts.slice(5)}</span>
                  <span className="shrink-0 font-semibold" style={{ color: tagColor[a.tag] ?? "#ffc24d" }}>[{a.tag}]</span>
                  <span className="text-paper-300/85">{a.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
