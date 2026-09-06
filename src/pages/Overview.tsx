import { useMemo, useRef, useState } from "react";
import MapView, { type Focus } from "../components/MapView";
import { PageHeader, Reveal, CornerTicks, CountUp } from "../components/ui";
import { AreaChart, Donut, HBars, StackedBar } from "../components/charts";
import { statusOf, STATUS_META, STATUS_LABELS, typeAbbr, fmtPesoM, activityFeed, PROJECT_TYPES, typeColorOf, type ProjectRecord } from "../data/registry";
import { surfaceLadder, conditionMix, networkByYear, type Road, conditionOf } from "../data/roads";
import { useStore, recordPoint } from "../state/store";
import { toast } from "../components/toast";
import { IconPin, IconArrow, IconLayers } from "../components/icons";

export default function Overview({ focus, onLocate, onOpenInventory }: {
  focus: Focus | null;
  onLocate: (p: [number, number], zoom?: number) => void;
  onOpenInventory: (roadId: string) => void;
}) {
  const { records, roadsReg } = useStore();
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  const mapRoads = useMemo<Road[]>(
    () => roadsReg.filter((e) => e.jurisdiction === "OCE").map((e) => ({
      id: e.id, name: e.name, barangay: e.barangays[0] ?? "—", roadClass: e.roadClass,
      surface: e.surface, condition: conditionOf(e.pci), lengthKm: e.lengthKm, widthM: e.widthM,
      lanes: e.lanes, aadt: e.aadt, pci: e.pci, lastInspection: e.lastInspection, geometry: e.geometry,
    })),
    [roadsReg]
  );

  const linked = useMemo(() => {
    const ids = new Set(records.map((r) => r.roadId).filter((x): x is string => !!x));
    const rs = mapRoads.filter((r) => ids.has(r.id));
    return { count: rs.length, km: rs.reduce((s, r) => s + r.lengthKm, 0) };
  }, [records, mapRoads]);

  const totalContracted = records.reduce((s, r) => s + r.contractedAmount, 0);
  const totalActual = records.reduce((s, r) => s + r.actualAmount, 0);
  const weightedPct = totalContracted ? Math.round(records.reduce((s, r) => s + r.percent * r.contractedAmount, 0) / totalContracted) : 0;
  const ongoing = records.filter((r) => r.percent > 0 && r.percent < 100);

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

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-GIS-01"
        title="Geospatial Console"
        subtitle="City road network, registered project stations and centerline axes on a live OSM base. Roads and axes are scoped to the project ledger — what is linked is what is drawn."
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-12">
        <Reveal className="xl:col-span-8">
          <div ref={mapWrapRef} className="relative">
            <MapView roads={mapRoads} focus={focus} onLocate={(r) => { setSelectedRoad(r); onLocate(r.geometry[Math.floor(r.geometry.length / 2)], 15); }} />
          </div>
          {selectedRoad && (
            <div className="anim-fade-up mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border-2 border-ink-800 bg-ink-900 px-5 py-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.18em] text-amber-400 uppercase">{selectedRoad.id} · {selectedRoad.roadClass}</p>
                <p className="font-display text-2xl leading-none font-bold text-paper-100 uppercase">{selectedRoad.name}</p>
              </div>
              <p className="font-mono text-[10.5px] text-paper-300/70 uppercase">Brgy. {selectedRoad.barangay} · {selectedRoad.surface} · {selectedRoad.lengthKm.toFixed(1)} km</p>
              <button onClick={() => onOpenInventory(selectedRoad.id)}
                className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-amber-500 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-colors hover:bg-amber-400">
                Open road inventory <IconArrow size={13} />
              </button>
            </div>
          )}
        </Reveal>

        <div className="space-y-4 xl:col-span-4">
          <Reveal delay={80}>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800">
              {[
                { label: "Inventoried network", node: <CountUp value={+linked.km.toFixed(1)} decimals={1} suffix=" km" />, sub: `${linked.count} linked roads` },
                { label: "Registered projects", node: <CountUp value={records.length} />, sub: "21-field records" },
                { label: "Active works", node: <CountUp value={ongoing.length} />, sub: "in progress now" },
                { label: "Weighted completion", node: <CountUp value={weightedPct} suffix="%" />, sub: "by contracted value" },
              ].map((k) => (
                <div key={k.label} className="group relative bg-ink-900 px-4 py-3.5 transition-colors hover:bg-ink-850">
                  <span className="absolute top-0 left-0 h-[3px] w-0 bg-amber-500 transition-all duration-300 group-hover:w-full" />
                  <p className="font-mono text-[8.5px] leading-tight tracking-[0.18em] text-paper-300/50 uppercase">{k.label}</p>
                  <p className="font-display mt-1 text-[26px] leading-none font-bold text-paper-100">{k.node}</p>
                  <p className="mt-1 font-mono text-[8px] tracking-[0.12em] text-amber-400/80 uppercase">{k.sub}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="relative rounded-[4px] border-2 border-ink-800 bg-ink-900 p-4">
              <CornerTicks />
              <p className="mb-3 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">Active works on the map</p>
              <ul className="space-y-1.5">
                {ongoing.slice(0, 6).map((p: ProjectRecord) => {
                  const m = statusOf(p);
                  const pt = recordPoint(p);
                  return (
                    <li key={p.id}>
                      <button onClick={() => onLocate(pt, 15)}
                        className="group flex w-full cursor-pointer items-center gap-3 rounded-[3px] border border-ink-700 bg-ink-850 px-3 py-2 text-left transition-all hover:translate-x-1 hover:border-amber-500/50">
                        <span className="shrink-0" style={{ color: m.color, display: "inline-flex" }}><IconPin size={14} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-paper-100">{p.name}</span>
                          <span className="font-mono text-[9px] tracking-wider text-paper-300/55 uppercase">{p.id} · {typeAbbr(p.type)} · {p.location.barangays[0]}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-[13px] font-bold tabular" style={{ color: m.color }}>{p.percent}%</span>
                          <span className="mt-0.5 block h-[5px] w-16 overflow-hidden rounded-full bg-ink-700">
                            <span className="block h-full rounded-full" style={{ width: `${p.percent}%`, background: m.color }} />
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {ongoing.length === 0 && <li className="font-mono text-[10px] text-paper-300/50">No works currently in progress.</li>}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <div className="relative h-full rounded-[4px] border-2 border-ink-800 bg-ink-900 p-4">
            <CornerTicks />
            <p className="mb-3 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">Paved network growth</p>
            <AreaChart points={networkByYear} height={190} />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-4" delay={70}>
          <div className="relative h-full rounded-[4px] border-2 border-ink-800 bg-ink-900 p-4">
            <CornerTicks />
            <p className="mb-3 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">Budget by status · ₱{fmtPesoM(totalContracted).replace("₱", "")}</p>
            <Donut data={statusDonut} size={150} thickness={20} centerLabel={fmtPesoM(totalContracted)} centerSub="contracted" />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-4" delay={140}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-4">
            <CornerTicks color="border-ink-800/50" />
            <p className="mb-3 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Appropriation by project type</p>
            <HBars data={typeBars} />
          </div>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-4">
            <CornerTicks color="border-ink-800/50" />
            <p className="mb-3 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Surface ladder · {surfaceLadder.opened.toFixed(1)} km opened</p>
            <StackedBar data={[
              { label: "Concrete", km: surfaceLadder.concrete, color: "#1e7a58" },
              { label: "Asphalt", km: surfaceLadder.asphalt, color: "#12897e" },
              { label: "Gravel", km: surfaceLadder.gravel, color: "#f0a32b" },
              { label: "Earth", km: surfaceLadder.earth, color: "#de5a36" },
            ]} />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-4" delay={70}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-4">
            <CornerTicks color="border-ink-800/50" />
            <p className="mb-3 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Condition exposure</p>
            <StackedBar data={conditionMix.map((c) => ({ label: c.label, km: c.km, color: c.color }))} />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-4" delay={140}>
          <div className="relative h-full overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-950 p-4">
            <CornerTicks />
            <p className="mb-3 flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
              <IconLayers size={14} className="text-amber-400" /> Field activity log
            </p>
            <ul className="space-y-2.5">
              {activityFeed.map((a, i) => (
                <li key={i} className="group border-l-2 border-ink-700 pl-3 transition-colors hover:border-amber-500">
                  <p className="flex items-center gap-2 font-mono text-[8.5px] tracking-[0.14em] text-paper-300/45 uppercase">
                    <span className="rounded-[2px] bg-ink-800 px-1.5 py-0.5 font-bold text-teal-400">{a.tag}</span>
                    {a.ts}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-paper-300/85">{a.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
