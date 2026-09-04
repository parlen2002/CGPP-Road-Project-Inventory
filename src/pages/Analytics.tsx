import { useMemo } from "react";
import { networkByYear, surfaceMix, conditionMix, cityRoads as roads, cityNetworkKm, nationalRoads, nationalKm } from "../data/roads";
import { PROJECT_TYPES, TYPE_COLORS, STATUS_META, STATUS_LABELS, statusOf } from "../data/registry";
import { useStore } from "../state/store";
import { PageHeader, Reveal, CornerTicks, fmtM } from "../components/ui";
import { AreaChart, Donut, HBars, StackedBar } from "../components/charts";

export default function Analytics() {
  const { records } = useStore();

  const statusDonut = useMemo(
    () =>
      STATUS_LABELS.map((l) => ({
        label: l,
        value: +(records.filter((r) => statusOf(r).label === l).reduce((s, r) => s + r.contractedAmount, 0) / 1e6).toFixed(1),
        color: STATUS_META[l].color,
      })).filter((d) => d.value > 0),
    [records]
  );

  const typeBars = useMemo(
    () =>
      PROJECT_TYPES
        .map((t) => ({
          label: t,
          value: +(records.filter((r) => r.type === t).reduce((s, r) => s + r.contractedAmount, 0) / 1e6).toFixed(1),
          color: TYPE_COLORS[t],
        }))
        .filter((d) => d.value > 0),
    [records]
  );

  const classStats = useMemo(() => {
    const cityPci = Math.round(roads.reduce((s, r) => s + r.pci, 0) / (roads.length || 1));
    return [
      { cls: "City", tag: "OCE JURISDICTION · INVENTORIED", segments: roads.length, km: cityNetworkKm, pci: cityPci, muted: false },
      { cls: "National", tag: "DPWH JURISDICTION · REFERENCE ONLY", segments: nationalRoads.length, km: nationalKm, pci: 0, muted: true },
    ];
  }, []);

  const totalM = records.reduce((s, r) => s + r.contractedAmount, 0) / 1e6;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-ANL-04"
        title="Network Analytics"
        subtitle="Longitudinal paving growth, budget distribution across the seven project types, surface composition and condition exposure — aggregated nightly from the PostGIS warehouse."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* paved growth */}
        <Reveal className="lg:col-span-8">
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">Paved Network Growth</h2>
              <p className="font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">
                km paved · FY 2019–2026 · <span className="font-semibold text-amber-600">+{(networkByYear[networkByYear.length - 1].km - networkByYear[0].km).toFixed(1)} km cumulative</span>
              </p>
            </div>
            <AreaChart points={networkByYear} height={230} />
          </div>
        </Reveal>

        {/* budget by status */}
        <Reveal className="lg:col-span-4" delay={90}>
          <div className="relative h-full rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5">
            <CornerTicks />
            <h2 className="font-display mb-1 text-2xl font-bold tracking-wide text-paper-100 uppercase">Budget by Status</h2>
            <p className="mb-4 font-mono text-[9.5px] tracking-[0.16em] text-paper-300/50 uppercase">₱ millions · slider-derived status</p>
            <Donut data={statusDonut} centerLabel={fmtM(totalM)} centerSub="contracted" size={172} />
          </div>
        </Reveal>

        {/* budget by type */}
        <Reveal className="lg:col-span-5" delay={0}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <h2 className="font-display mb-4 text-2xl font-bold tracking-wide text-ink-900 uppercase">Appropriation by Project Type</h2>
            <HBars unit="₱M" data={typeBars} />
          </div>
        </Reveal>

        {/* surface + condition */}
        <Reveal className="lg:col-span-4" delay={80}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <h2 className="font-display mb-1 text-2xl font-bold tracking-wide text-ink-900 uppercase">Treatment Mix</h2>
            <p className="mb-4 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">concreting · asphalting · graveling · opening — {cityNetworkKm} km opened, national excluded</p>
            <StackedBar data={surfaceMix} />
            <div className="my-5 h-px bg-line-300" />
            <h2 className="font-display mb-1 text-2xl font-bold tracking-wide text-ink-900 uppercase">Condition Exposure</h2>
            <p className="mb-4 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">km requiring action: <b className="text-coral-600">{conditionMix.find((c) => c.label === "Poor")!.km}</b></p>
            <StackedBar data={conditionMix} />
          </div>
        </Reveal>

        {/* class table */}
        <Reveal className="lg:col-span-3" delay={160}>
          <div className="relative flex h-full flex-col rounded-[4px] border-2 border-ink-800 bg-ink-950">
            <CornerTicks />
            <h2 className="font-display border-b border-ink-700 px-4 py-3 text-xl font-bold tracking-wide text-paper-100 uppercase">Network by Jurisdiction</h2>
            <ul className="flex-1 divide-y divide-ink-800">
              {classStats.map((c) => (
                <li key={c.cls} className={`px-4 py-3.5 transition-colors ${c.muted ? "opacity-60" : "hover:bg-ink-900"}`}>
                  <div className="flex items-baseline justify-between">
                    <p className={`font-mono text-[10.5px] font-bold tracking-[0.16em] uppercase ${c.muted ? "text-paper-300/60" : "text-amber-400"}`}>{c.cls}</p>
                    <p className="font-mono text-[9.5px] text-paper-300/50">{c.segments} seg</p>
                  </div>
                  <p className="mt-0.5 font-mono text-[8px] tracking-[0.14em] text-paper-300/40 uppercase">{c.tag}</p>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <p className="font-display text-[26px] leading-none font-bold text-paper-100">{c.km}<span className="text-[13px] text-paper-300/60"> km</span></p>
                    {c.muted
                      ? <p className="font-mono text-[10px] text-paper-300/50">PCI <b className="text-paper-300/40">n/a · DPWH</b></p>
                      : <p className="font-mono text-[10px] text-paper-300/60">PCI <b className={c.pci >= 70 ? "text-pine-400" : c.pci >= 50 ? "text-amber-400" : "text-coral-400"}>{c.pci}</b></p>}
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
                    <div className={`h-full rounded-full ${c.muted ? "bg-paper-300/30" : "bg-amber-500/80"}`} style={{ width: `${(c.km / (cityNetworkKm + nationalKm)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="border-t border-ink-700 px-4 py-2.5 font-mono text-[9px] leading-relaxed tracking-[0.14em] text-paper-300/40 uppercase">
              ST_Length(geog::geography)/1000 · city rows only feed OCE reporting
            </p>
          </div>
        </Reveal>
      </div>

      {/* obligation strip */}
      <Reveal className="mt-4 pb-2" delay={100}>
        <div className="overflow-x-auto rounded-[4px] border-2 border-ink-800 bg-paper-100">
          <table className="w-full min-w-[760px]">
            <thead className="bg-ink-900 text-paper-300 [&>th]:border-b-2 [&>th]:border-amber-500/70">
              <tr>
                {["Work Program", "Contracts", "Programmed", "Obligated", "Disbursed", "Obligation Rate"].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 font-mono text-[9.5px] font-semibold tracking-[0.16em] uppercase ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-300 font-mono text-[11.5px]">
              {[
                ["Concreting", 5, 141.5, 113.8, 78.6],
                ["Road Shoulder", 2, 57.1, 0, 0],
                ["Slope Protection", 1, 52.0, 0, 0],
                ["Street Lights", 2, 28.2, 11.7, 5.2],
                ["Sidewalk", 2, 39.6, 30.0, 21.4],
                ["Drainage System", 2, 39.6, 13.4, 6.8],
                ["Site Development", 1, 22.1, 7.5, 3.1],
              ].map((row) => {
                const [name, n, prog, obl, dis] = row as [string, number, number, number, number];
                const rate = prog ? Math.round((obl / prog) * 100) : 0;
                return (
                  <tr key={name} className="transition-colors hover:bg-ink-900/[0.045]">
                    <td className="px-4 py-3 font-body text-[12.5px] font-semibold text-ink-900">{name}</td>
                    <td className="px-4 py-3 text-text-600 tabular">{n}</td>
                    <td className="px-4 py-3 text-right text-ink-900 tabular">{fmtM(prog)}</td>
                    <td className="px-4 py-3 text-right text-ink-900 tabular">{fmtM(obl)}</td>
                    <td className="px-4 py-3 text-right text-text-600 tabular">{fmtM(dis)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-end gap-2">
                        <span className="h-[7px] w-24 overflow-hidden rounded-full bg-ink-900/10">
                          <span className="block h-full rounded-full" style={{ width: `${rate}%`, background: rate > 60 ? "#1e7a58" : rate > 25 ? "#f0a32b" : "#de5a36" }} />
                        </span>
                        <b className="tabular text-ink-900">{rate}%</b>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
