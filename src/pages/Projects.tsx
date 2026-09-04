import { useMemo, useState } from "react";
import { projects, statusMeta, typeShort, type ProjectStatus } from "../data/projects";
import { roads } from "../data/roads";
import { PageHeader, Reveal, CornerTicks, StatusPill, CountUp, fmtM, fmtFull } from "../components/ui";
import { IconPin, IconClock, IconArrow } from "../components/icons";

const tabs: ("All" | ProjectStatus)[] = ["All", "Ongoing", "For Bidding", "Planned", "Completed", "Delayed"];
const statusOrder: Record<ProjectStatus, number> = { Ongoing: 0, Delayed: 1, "For Bidding": 2, Planned: 3, Completed: 4 };

function timeline(p: { start: string; end: string }) {
  const s = new Date(p.start).getTime(), e = new Date(p.end).getTime();
  const now = Date.now();
  return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
}

export default function Projects({ onLocate, onOpenRoad }: {
  onLocate: (point: [number, number], zoom?: number) => void;
  onOpenRoad: (roadId: string) => void;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");

  const list = useMemo(
    () =>
      projects
        .filter((p) => tab === "All" || p.status === tab)
        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || b.progress - a.progress),
    [tab]
  );

  const totals = useMemo(() => {
    const portfolio = projects.reduce((s, p) => s + p.budgetM, 0);
    const ongoing = projects.filter((p) => p.status === "Ongoing" || p.status === "Delayed");
    const obligated = ongoing.reduce((s, p) => s + p.budgetM, 0);
    const completed = projects.filter((p) => p.status === "Completed").reduce((s, p) => s + p.budgetM, 0);
    return { portfolio, obligated, completed, active: ongoing.length };
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-PRJ-03"
        title="Project Ledger"
        subtitle="Every programmed road intervention — concreting, rehabilitation, widening, drainage, bridges — with physical progress, appropriation and station points synced from the field module."
      />

      {/* totals */}
      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Programmed portfolio", v: totals.portfolio, d: 1, p: "₱", s: "M", note: fmtFull(totals.portfolio) },
            { label: "Under implementation", v: totals.obligated, d: 1, p: "₱", s: "M", note: `${totals.active} worksites` },
            { label: "Completed value", v: totals.completed, d: 1, p: "₱", s: "M", note: "4 contracts closed" },
            { label: "Records in ledger", v: projects.length, d: 0, p: "", s: "", note: "linked to road geometries" },
          ].map((t, i) => (
            <div key={t.label} className="group relative overflow-hidden rounded-[4px] border border-line-300 bg-paper-100 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-800 hover:shadow-[0_10px_26px_rgba(21,35,28,0.13)]">
              <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-pine-600 transition-transform duration-300 group-hover:scale-x-100" />
              <p className="font-mono text-[9.5px] tracking-[0.18em] text-text-400 uppercase">{t.label}</p>
              <p className="font-display mt-1 text-[34px] leading-none font-bold text-ink-900">
                <CountUp value={t.v} decimals={t.d} prefix={t.p} suffix={t.s} />
              </p>
              <p className="mt-1.5 font-mono text-[9.5px] text-text-400">{t.note}</p>
              <span className="pointer-events-none absolute -right-2 -bottom-3 font-display text-[64px] leading-none font-bold text-ink-900/[0.045]">{String(i + 1).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* tabs */}
      <Reveal className="mt-6" delay={80}>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => {
            const n = t === "All" ? projects.length : projects.filter((p) => p.status === t).length;
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cursor-pointer rounded-[3px] border px-3 py-2 font-mono text-[10.5px] font-semibold tracking-[0.12em] uppercase transition-all duration-200 ${
                  active
                    ? "border-ink-900 bg-ink-900 text-amber-400 shadow-[0_4px_14px_rgba(12,25,19,0.3)]"
                    : "border-line-400 bg-paper-100 text-text-600 hover:border-ink-800 hover:text-ink-900"
                }`}
              >
                {t} <span className={`ml-1.5 rounded-sm px-1.5 py-0.5 text-[9px] ${active ? "bg-amber-500/20" : "bg-ink-900/8"}`}>{n}</span>
              </button>
            );
          })}
          <span className="ml-auto hidden font-mono text-[10px] tracking-[0.14em] text-text-400 uppercase md:block">
            ORDER BY status, progress DESC
          </span>
        </div>
      </Reveal>

      {/* list */}
      <div className="mt-4 space-y-3 pb-4">
        {list.map((p, i) => {
          const m = statusMeta[p.status];
          const road = roads.find((r) => r.id === p.roadId);
          const elapsed = timeline(p);
          return (
            <Reveal key={p.id} delay={Math.min(i * 50, 300)}>
              <article className="group relative grid overflow-hidden rounded-[4px] border border-line-300 bg-paper-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-800 hover:shadow-[0_12px_30px_rgba(21,35,28,0.15)] lg:grid-cols-[240px_1fr_280px]">
                <span className="absolute inset-y-0 left-0 w-[4px]" style={{ background: m.color }} />
                {/* identity */}
                <div className="border-b border-line-300 bg-ink-900 px-4 py-4 lg:border-r lg:border-b-0">
                  <p className="font-mono text-[9.5px] tracking-[0.18em]" style={{ color: m.color }}>{p.code}</p>
                  <h3 className="font-display mt-1 text-[21px] leading-tight font-bold text-paper-100 uppercase group-hover:text-amber-300">
                    {p.name}
                  </h3>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-[3px] border border-ink-600 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-paper-300/80">{typeShort[p.type]}</span>
                    <StatusPill label={p.status} color={m.color} soft={m.soft} />
                  </div>
                </div>
                {/* body */}
                <div className="px-4 py-4">
                  <p className="font-mono text-[10.5px] text-text-600">
                    <button className="cursor-pointer font-semibold text-pine-700 underline decoration-line-400 underline-offset-2 hover:decoration-amber-500" onClick={() => onOpenRoad(p.roadId)}>
                      {p.roadName}
                    </button>
                    {" "}· Brgy. {p.barangay}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900/10">
                      <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: m.color, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                    </div>
                    <span className="font-mono text-[13px] font-bold text-ink-900 tabular">{p.progress}%</span>
                  </div>
                  {/* timeline */}
                  <div className="relative mt-3">
                    <div className="h-px w-full bg-line-400" />
                    <span className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-paper-100 bg-ink-800" style={{ left: `calc(${elapsed}% - 5px)` }} />
                    <div className="mt-1.5 flex justify-between font-mono text-[9px] tracking-wider text-text-400 uppercase">
                      <span>Notice to proceed · {p.start}</span>
                      <span className="hidden items-center gap-1 sm:flex"><IconClock size={11} /> Target · {p.end}</span>
                    </div>
                  </div>
                  <p className="mt-2.5 font-mono text-[10px] text-text-600">
                    Contractor: <b className="text-ink-900">{p.contractor}</b> · Source: {p.funding}
                  </p>
                </div>
                {/* figures */}
                <div className="flex items-center justify-between gap-3 border-t border-line-300 bg-paper-200/70 px-4 py-4 lg:flex-col lg:items-end lg:justify-center lg:border-t-0 lg:border-l">
                  <div className="lg:text-right">
                    <p className="font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">Approved budget</p>
                    <p className="font-display text-[30px] leading-none font-bold text-ink-900">{fmtM(p.budgetM)}</p>
                  </div>
                  {road && (
                    <button
                      onClick={() => onLocate(p.point, 15)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-ink-800 bg-paper-100 px-3 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink-900 uppercase transition-all hover:bg-amber-500 hover:shadow-[0_4px_14px_rgba(240,163,43,0.4)]"
                    >
                      <IconPin size={13} /> Station point <IconArrow size={12} />
                    </button>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="pb-2">
        <div className="relative rounded-[4px] border border-line-300 bg-ink-900 p-4">
          <CornerTicks />
          <p className="font-mono text-[10px] leading-relaxed tracking-wider text-paper-300/70">
            <span className="text-amber-400">NOTE —</span> Physical progress is certified by the OCE materials engineer from geotagged field photos;
            station points are stored as PostGIS <span className="text-teal-400">POINT</span> geometries (SRID 4326) and re-projected to EPSG:3857 for console rendering.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
