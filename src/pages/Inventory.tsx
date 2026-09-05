import { useEffect, useMemo, useState } from "react";
import type { Road, Treatment } from "../data/roads";
import { TREATMENT_SHORT, TREATMENT_COLOR } from "../data/roads";
import { conditionOf, deriveRoad, type RoadDerivation } from "../data/roadsRegistry";
import { statusOf, fmtPesoM } from "../data/registry";
import { useStore } from "../state/store";
import { PageHeader, Reveal, CornerTicks, conditionMeta } from "../components/ui";
import { IconDownload, IconFilter, IconSearch, IconSort, IconClose, IconPin, IconArrow } from "../components/icons";

type SortKey = "name" | "lengthKm" | "pci" | "aadt" | "widthM";

const selects = ["bg-paper-100 border border-line-400 rounded-[3px] px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none cursor-pointer"] as const;

export default function Inventory({ query, selectedId, onSelect, onLocate }: {
  query: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLocate: (road: Road) => void;
}) {
  const { records, roadsReg } = useStore();
  const [search, setSearch] = useState(query);
  const [brgy, setBrgy] = useState("All");
  const [treatF, setTreatF] = useState<"All" | Treatment>("All");
  const [cond, setCond] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("lengthKm");
  const [dir, setDir] = useState<1 | -1>(-1);

  /* ── the inventory is DERIVED: road registry (OCE rows) × project ledger ──
     Each road's treatment is the highest treatment across its linked projects,
     so the ladder below reflects actual programmed works, not just surveyed surface. */
  const derived = useMemo(
    () => new Map(roadsReg.map((e) => [e.id, deriveRoad(e, records)])),
    [roadsReg, records]
  );

  const roads: Road[] = useMemo(
    () =>
      roadsReg
        .filter((e) => e.jurisdiction === "OCE")
        .map((e) => ({
          id: e.id, name: e.name, barangay: e.barangays.join(" / "), roadClass: e.roadClass,
          surface: e.surface, condition: conditionOf(e.pci), lengthKm: e.lengthKm, widthM: e.widthM,
          lanes: e.lanes, aadt: e.aadt, lastInspection: e.lastInspection, pci: e.pci, geometry: e.geometry,
        })),
    [roadsReg]
  );

  const cityNetworkKm = useMemo(() => roads.reduce((s, r) => s + r.lengthKm, 0), [roads]);
  const nationalKm = useMemo(
    () => roadsReg.filter((e) => e.jurisdiction === "DPWH").reduce((s, e) => s + e.lengthKm, 0),
    [roadsReg]
  );

  /* pavement ladder — km per treatment, as derived from the project ledger */
  const ladder = useMemo(() => {
    const acc: Record<Treatment, number> = { "Road Opening": 0, "Road Graveling": 0, Asphalting: 0, Concreting: 0 };
    for (const r of roads) acc[derived.get(r.id)!.treatment] += r.lengthKm;
    return acc;
  }, [roads, derived]);
  const pavedKm = ladder.Concreting + ladder.Asphalting;
  const unsurfacedKm = ladder["Road Graveling"] + ladder["Road Opening"];

  useEffect(() => setSearch(query), [query]);
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`row-${selectedId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedId]);

  const barangays = useMemo(() => ["All", ...Array.from(new Set(roads.flatMap((r) => r.barangay.split(" / ")))).sort()], [roads]);
  const projCount = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach((p) => { if (p.roadId) m.set(p.roadId, (m.get(p.roadId) ?? 0) + 1); });
    return m;
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = roads.filter((r) =>
      (!q || r.name.toLowerCase().includes(q) || r.barangay.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) &&
      (brgy === "All" || r.barangay.split(" / ").includes(brgy)) &&
      (treatF === "All" || derived.get(r.id)!.treatment === treatF) &&
      (cond === "All" || r.condition === cond)
    );
    return list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const c = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return c * dir;
    });
  }, [search, brgy, treatF, cond, sortKey, dir, roads, derived]);

  const selected = roads.find((r) => r.id === selectedId) ?? null;
  const selectedProjects = selected ? records.filter((p) => p.roadId === selected.id) : [];
  const filteredKm = filtered.reduce((s, r) => s + r.lengthKm, 0);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir(dir === 1 ? -1 : 1);
    else { setSortKey(k); setDir(k === "name" ? 1 : -1); }
  };

  const exportCsv = () => {
    const head = "road_id,name,barangay,class,treatment,treatment_year,from_projects,surface,condition,length_km,width_m,lanes,aadt,pci,last_inspection,geom_wkt_linestring";
    const rows = filtered.map((r) => {
      const d = derived.get(r.id)!;
      return [r.id, `"${r.name}"`, `"${r.barangay}"`, r.roadClass, `"${d.treatment}"`, d.treatmentYear || "", d.byProjects ? "yes" : "no", r.surface, r.condition, r.lengthKm, r.widthM, r.lanes, r.aadt, r.pci, r.lastInspection,
        `"LINESTRING(${r.geometry.map(([la, ln]) => `${ln} ${la}`).join(", ")})"`].join(",");
    });
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rpis_road_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Th = ({ k, children, right }: { k?: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={`px-3 py-2.5 font-mono text-[9.5px] font-semibold tracking-[0.16em] uppercase ${right ? "text-right" : "text-left"} ${k ? "cursor-pointer select-none hover:text-amber-400" : ""}`}
      onClick={k ? () => toggleSort(k) : undefined}>
      <span className="inline-flex items-center gap-1">
        {children}
        {k && <IconSort size={10} className={sortKey === k ? "text-amber-400" : "opacity-30"} />}
        {k && sortKey === k && <span className="text-amber-400">{dir === 1 ? "▲" : "▼"}</span>}
      </span>
    </th>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-INV-02"
        title="Road Inventory"
        subtitle="Attribute register of CITY roads under OCE jurisdiction, stored in PostGIS (roads_road, SRID 4326). National highways are DPWH-managed and are excluded from the city inventory. Each segment is accounted by its latest works — road opening, graveling, asphalting or concreting — the key to reading how much road is opened, still earth or gravel, and how much is asphalted or concreted."
      />

      {/* ── pavement ladder — opened vs. surfaced ── */}
      <Reveal className="mt-6">
        <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-900">
          <CornerTicks />
          <div className="bg-graticule absolute inset-0" />
          <div className="relative p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-wide text-paper-100 uppercase sm:text-[26px]">Pavement Ladder</h2>
              <p className="font-mono text-[9.5px] tracking-[0.18em] text-paper-300/50 uppercase">road opening → graveling → asphalting → concreting</p>
            </div>

            {/* cumulative proportion bar */}
            <div className="mt-4 flex h-4 w-full overflow-hidden rounded-[3px] border border-ink-600">
              {[
                { label: "Concreted", km: ladder.Concreting, color: "#1e7a58" },
                { label: "Asphalted", km: ladder.Asphalting, color: "#12897e" },
                { label: "Graveled", km: ladder["Road Graveling"], color: "#f0a32b" },
                { label: "Earth (opened)", km: ladder["Road Opening"], color: "#de5a36" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="group relative h-full transition-[filter] hover:brightness-125"
                  style={{ width: `${(s.km / cityNetworkKm) * 100}%`, background: s.color }}
                  title={`${s.label} — ${s.km.toFixed(1)} km`}
                />
              ))}
            </div>

            {/* ladder figures */}
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-ink-600 bg-ink-700 sm:grid-cols-5">
              <div className="bg-ink-950/70 px-3.5 py-3 transition-colors hover:bg-ink-950">
                <p className="font-mono text-[9px] tracking-[0.16em] text-amber-400 uppercase">Opened (total)</p>
                <p className="font-display mt-1 text-3xl leading-none font-bold text-paper-100">{cityNetworkKm.toFixed(1)}<span className="text-[14px] text-paper-300/60"> km</span></p>
                <p className="mt-1 font-mono text-[9px] text-paper-300/45 uppercase">{roads.length} segments</p>
              </div>
              {[
                { label: "Concreted", km: ladder.Concreting, color: "#4cc08f" },
                { label: "Asphalted", km: ladder.Asphalting, color: "#35c4b4" },
                { label: "Graveled", km: ladder["Road Graveling"], color: "#ffc24d" },
                { label: "Earth / opened only", km: ladder["Road Opening"], color: "#f2855f" },
              ].map((s) => (
                <div key={s.label} className="bg-ink-950/70 px-3.5 py-3 transition-colors hover:bg-ink-950">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: s.color }}>
                    <i className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.label}
                  </p>
                  <p className="font-display mt-1 text-3xl leading-none font-bold text-paper-100">{s.km.toFixed(1)}<span className="text-[14px] text-paper-300/60"> km</span></p>
                  <p className="mt-1 font-mono text-[9px] text-paper-300/45 uppercase">{((s.km / cityNetworkKm) * 100).toFixed(1)}% of opened</p>
                </div>
              ))}
            </div>

            <p className="mt-3.5 font-mono text-[10px] tracking-[0.08em] text-paper-300/60">
              <b className="text-pine-400">{pavedKm.toFixed(1)} km paved</b> (concrete + asphalt) · <b className="text-coral-400">{unsurfacedKm.toFixed(1)} km unsurfaced</b> (earth + gravel) — the program backlog for asphalting / concreting
            </p>
          </div>
        </div>
      </Reveal>

      {/* toolbar */}
      <Reveal className="mt-6">
        <div className="relative flex flex-wrap items-center gap-2 rounded-[4px] border border-line-300 bg-paper-100 p-3">
          <CornerTicks color="border-ink-800/50" />
          <div className="relative min-w-[220px] flex-1">
            <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, barangay, or segment ID…"
              className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/70 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
            />
          </div>
          <IconFilter size={14} className="ml-1 hidden text-text-400 sm:block" />
          <select value={brgy} onChange={(e) => setBrgy(e.target.value)} className={selects[0]}>
            {barangays.map((b) => <option key={b}>{b}</option>)}
          </select>
          <span className="hidden cursor-default items-center gap-1.5 rounded-[3px] border border-pine-600/50 bg-pine-600/10 px-2.5 py-2 font-mono text-[10px] font-bold tracking-wider text-pine-600 uppercase sm:flex">
            OCE jurisdiction · City roads
          </span>
          <select value={treatF} onChange={(e) => setTreatF(e.target.value as "All" | Treatment)} className={selects[0]}>
            <option value="All">All treatments</option>
            <option value="Concreting">Concreting</option>
            <option value="Asphalting">Asphalting</option>
            <option value="Road Graveling">Road Graveling</option>
            <option value="Road Opening">Road Opening (earth)</option>
          </select>
          <select value={cond} onChange={(e) => setCond(e.target.value)} className={selects[0]}>
            {["All", "Good", "Fair", "Poor"].map((b) => <option key={b}>{b === "All" ? "All conditions" : b}</option>)}
          </select>
          {(search || brgy !== "All" || treatF !== "All" || cond !== "All") && (
            <button onClick={() => { setSearch(""); setBrgy("All"); setTreatF("All"); setCond("All"); }}
              className="cursor-pointer rounded-[3px] border border-line-400 px-2.5 py-2 font-mono text-[10px] tracking-wider text-text-600 uppercase hover:border-coral-500 hover:text-coral-500">
              Reset
            </button>
          )}
          <button onClick={exportCsv}
            className="group ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800 hover:shadow-[0_6px_18px_rgba(12,25,19,0.35)]">
            <IconDownload size={14} className="transition-transform group-hover:translate-y-0.5" /> Export CSV
          </button>
        </div>
      </Reveal>

      {/* result strip */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-1 font-mono text-[10.5px] tracking-wider text-text-600 uppercase">
        <span><b className="text-ink-900">{filtered.length}</b> / {roads.length} city segments</span>
        <span><b className="text-ink-900">{filteredKm.toFixed(1)}</b> km selected · {(filteredKm / cityNetworkKm * 100).toFixed(1)}% of city network</span>
        <span className="rounded-[3px] border border-line-400 px-1.5 py-0.5 text-[9.5px] text-text-400">national roads ({nationalKm} km · DPWH) excluded — reference only</span>
        <span className="ml-auto hidden text-text-400 sm:inline">SELECT * FROM roads_road WHERE jurisdiction = 'CITY' · {filtered.length} rows</span>
      </div>

      {/* table */}
      <Reveal className="mt-3" delay={80}>
        <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
          <CornerTicks />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-ink-900 text-paper-300">
                <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70">
                  <Th>Segment / Name</Th>
                  <Th>Barangay</Th>
                  <Th>Treatment</Th>
                  <Th>Surface</Th>
                  <Th k="lengthKm" right>Length (km)</Th>
                  <Th k="widthM" right>Width (m)</Th>
                  <Th k="pci">PCI</Th>
                  <Th k="aadt" right>AADT</Th>
                  <Th right>Projects</Th>
                  <Th right>Geom</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {filtered.map((r) => {
                  const cm = conditionMeta[r.condition];
                  const isSel = r.id === selectedId;
                  return (
                    <tr
                      key={r.id}
                      id={`row-${r.id}`}
                      onClick={() => onSelect(isSel ? null : r.id)}
                      className={`group cursor-pointer transition-colors ${isSel ? "bg-amber-500/12" : "hover:bg-ink-900/[0.045]"}`}
                      style={{ boxShadow: isSel ? "inset 3px 0 0 #f0a32b" : "inset 3px 0 0 transparent" }}
                    >
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                        <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{r.id} · insp {r.lastInspection}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-600">{r.barangay}</td>
                      <td className="px-3 py-2.5">
                        {(() => {
                          const d = derived.get(r.id)!;
                          const tc = TREATMENT_COLOR[d.treatment];
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-1 font-mono text-[9.5px] font-bold tracking-wider uppercase" style={{ color: tc, background: `${tc}1a`, boxShadow: `inset 0 0 0 1px ${tc}55` }}
                              title={d.byProjects ? "Derived from the project ledger" : "No linked projects — from surveyed surface"}>
                              <i className="h-1.5 w-1.5 rounded-full" style={{ background: tc }} />
                              {TREATMENT_SHORT[d.treatment]}{d.treatmentYear ? ` · ${d.treatmentYear}` : ""}{d.byProjects ? "" : " · srv"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-600">{r.surface}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] font-semibold text-ink-900 tabular">{r.lengthKm.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-text-600 tabular">{r.widthM}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="h-[7px] w-14 overflow-hidden rounded-full bg-ink-900/10">
                            <span className="block h-full rounded-full" style={{ width: `${r.pci}%`, background: cm.color }} />
                          </span>
                          <span className="font-mono text-[11px] font-semibold tabular" style={{ color: cm.color }}>{r.pci}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11.5px] text-text-600 tabular">{r.aadt.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-grid h-6 min-w-6 place-items-center rounded-[3px] px-1 font-mono text-[11px] font-bold ${projCount.get(r.id) ? "bg-pine-600 text-paper-100" : "bg-ink-900/8 text-text-400"}`}>
                          {projCount.get(r.id) ?? 0}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-teal-500">
                          <IconPin size={11} /> 4326
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center font-mono text-[12px] text-text-400">— 0 rows returned. Adjust filters or reset the query. —</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* ------- drawer ------- */}
      <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${selected ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-0 bg-ink-950/50" onClick={() => onSelect(null)} />
        <aside className={`absolute top-0 right-0 flex h-full w-full max-w-[430px] flex-col border-l-2 border-ink-800 bg-paper-100 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${selected ? "translate-x-0" : "translate-x-full"}`}>
          {selected && (
            <>
              <div className="border-b-2 border-ink-800 bg-ink-900 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9.5px] tracking-[0.2em] text-amber-400 uppercase">{selected.roadClass} · {selected.id.toUpperCase()} · SRID 4326</p>
                    <h3 className="font-display mt-1 text-3xl leading-none font-bold text-paper-100 uppercase">{selected.name}</h3>
                    <p className="mt-1.5 font-mono text-[10.5px] text-paper-300/70">Brgy. {selected.barangay}</p>
                  </div>
                  <button onClick={() => onSelect(null)} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[3px] border border-line-400 bg-line-300 font-mono text-[11px]">
                  {[
                    ["LENGTH", `${selected.lengthKm.toFixed(1)} km`],
                    ["WIDTH", `${selected.widthM} m`],
                    ["LANES", `${selected.lanes}`],
                    ["TREATMENT", derived.get(selected.id)!.treatment + (derived.get(selected.id)!.byProjects ? "" : " (survey)")],
                    ["WORKS YEAR", derived.get(selected.id)!.treatmentYear ? String(derived.get(selected.id)!.treatmentYear) : "—"],
                    ["SURFACE", selected.surface],
                    ["AADT", selected.aadt.toLocaleString()],
                    ["PCI", String(selected.pci)],
                    ["INSPECTED", selected.lastInspection],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-paper-100 px-3 py-2.5">
                      <p className="text-[8.5px] tracking-[0.16em] text-text-400 uppercase">{k}</p>
                      <p className="mt-0.5 font-semibold text-ink-900">{v}</p>
                    </div>
                  ))}
                </div>

                {/* PCI gauge */}
                <div className="mt-5 rounded-[4px] border border-line-300 bg-white/50 p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Pavement Condition Index</p>
                    <p className="font-display text-3xl leading-none font-bold" style={{ color: conditionMeta[selected.condition].color }}>{selected.pci}</p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${selected.pci}%`, background: `linear-gradient(90deg, #de5a36, #f0a32b 55%, #1e7a58)` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between font-mono text-[8.5px] text-text-400">
                    <span>0 · FAILED</span><span>50 · FAIR</span><span>100 · EXCELLENT</span>
                  </div>
                </div>

                {/* geometry */}
                <div className="mt-5">
                  <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Geometry · {selected.geometry.length} vertices</p>
                  <pre className="overflow-x-auto rounded-[3px] border border-ink-800 bg-ink-950 p-3 font-mono text-[9.5px] leading-relaxed text-pine-400">
{`LINESTRING(\n${selected.geometry.map(([la, ln]) => `  ${ln.toFixed(5)} ${la.toFixed(5)}`).join(",\n")}\n)`}
                  </pre>
                </div>

                {/* linked projects */}
                <div className="mt-5">
                  <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Linked projects ({selectedProjects.length})</p>
                  {selectedProjects.length === 0 && <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[10.5px] text-text-400">No programmed projects on this segment.</p>}
                  <ul className="space-y-2">
                    {selectedProjects.map((p) => {
                      const meta = statusOf(p);
                      return (
                        <li key={p.id} className="rounded-[3px] border border-line-300 bg-white/60 p-3 transition-colors hover:border-ink-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{p.id} · {p.folderNo}</span>
                            <span className="rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: meta.color, background: meta.soft }}>{meta.label} {p.percent}%</span>
                          </div>
                          <p className="mt-1 text-[12.5px] font-semibold text-ink-900">{p.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-text-600">{fmtPesoM(p.contractedAmount)} · {p.type} · {p.mode}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => onLocate(selected)}
                className="group flex w-full items-center justify-center gap-2 border-t-2 border-ink-800 bg-amber-500 py-3.5 font-mono text-[11px] font-bold tracking-[0.18em] text-ink-950 uppercase transition-colors hover:bg-amber-400"
              >
                <IconPin size={15} /> Locate on map console
                <IconArrow size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
