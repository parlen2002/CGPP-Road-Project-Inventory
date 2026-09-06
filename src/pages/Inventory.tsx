import { useEffect, useMemo, useState } from "react";
import { conditionOf, TREATMENT_COLOR, TREATMENT_SHORT, type Treatment, type Condition } from "../data/roads";
import { deriveRoad } from "../data/roadsRegistry";
import { statusOf, fmtPesoM } from "../data/registry";
import { useStore } from "../state/store";
import { PageHeader, Reveal, CornerTicks, conditionMeta } from "../components/ui";
import { IconDownload, IconSearch, IconSort, IconClose, IconPin, IconArrow, IconPrinter } from "../components/icons";
import { PrintPortal, InventorySheet, usePrintSession } from "../print/PrintSheets";

type SortKey = "name" | "lengthKm" | "pci" | "aadt" | "widthM";

export default function Inventory({ selectedId, onSelect, onLocate }: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLocate: (e: { geometry: [number, number][] }) => void;
}) {
  const { records, roadsReg } = useStore();
  const [search, setSearch] = useState("");
  const [brgy, setBrgy] = useState("All");
  const [surface, setSurface] = useState("All");
  const [cond, setCond] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("lengthKm");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [printing, setPrinting] = useState(false);
  usePrintSession(printing, () => setPrinting(false));

  /* the inventory is DERIVED from the road registry ∩ project ledger */
  const roads = useMemo(
    () => roadsReg.filter((e) => e.jurisdiction === "OCE"),
    [roadsReg]
  );
  const derived = useMemo(() => {
    const m = new Map<string, ReturnType<typeof deriveRoad>>();
    roads.forEach((e) => m.set(e.id, deriveRoad(e, records)));
    return m;
  }, [roads, records]);
  const linkedIds = useMemo(() => new Set(records.map((r) => r.roadId).filter((x): x is string => !!x)), [records]);

  const projCount = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach((p) => { if (p.roadId) m.set(p.roadId, (m.get(p.roadId) ?? 0) + 1); });
    return m;
  }, [records]);

  /* pavement ladder over the ledger-linked subset */
  const linkedRoads = useMemo(() => roads.filter((r) => linkedIds.has(r.id)), [roads, linkedIds]);
  const ladder = useMemo(() => {
    const l: Record<string, number> = { "Road Opening": 0, "Road Graveling": 0, Asphalting: 0, Concreting: 0 };
    linkedRoads.forEach((r) => { const d = derived.get(r.id); if (d) l[d.treatment] = +(l[d.treatment] + r.lengthKm).toFixed(1); });
    return l;
  }, [linkedRoads, derived]);
  const openedKm = linkedRoads.reduce((s, r) => s + r.lengthKm, 0);

  const barangays = useMemo(() => ["All", ...Array.from(new Set(roads.flatMap((r) => r.barangays))).sort()], [roads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = linkedRoads.filter((r) => {
      const c = conditionOf(r.pci);
      return (!q || r.name.toLowerCase().includes(q) || r.barangays.join(" ").toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) &&
        (brgy === "All" || r.barangays.includes(brgy)) &&
        (surface === "All" || r.surface === surface) &&
        (cond === "All" || c === cond);
    });
    return list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const c = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return c * dir;
    });
  }, [linkedRoads, search, brgy, surface, cond, sortKey, dir]);

  const selected = roads.find((r) => r.id === selectedId) ?? null;
  const selectedProjects = selected ? records.filter((p) => p.roadId === selected.id) : [];
  const filteredKm = filtered.reduce((s, r) => s + r.lengthKm, 0);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`row-${selectedId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedId]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir(dir === 1 ? -1 : 1);
    else { setSortKey(k); setDir(k === "name" ? 1 : -1); }
  };

  const exportCsv = () => {
    const head = "road_id,name,barangays,treatment,treatment_year,from_projects,surface,condition,length_km,width_m,lanes,aadt,pci,geom_wkt_linestring";
    const rows = filtered.map((r) => {
      const d = derived.get(r.id)!;
      return [r.id, `"${r.name}"`, `"${r.barangays.join("; ")}"`, `"${d.treatment}"`, d.treatmentYear || "", d.byProjects ? "yes" : "no", r.surface, conditionOf(r.pci), r.lengthKm, r.widthM, r.lanes, r.aadt, r.pci,
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

  const stages: { label: Treatment }[] = [
    { label: "Concreting" }, { label: "Asphalting" }, { label: "Road Graveling" }, { label: "Road Opening" },
  ];
  const selCond: Condition | null = selected ? conditionOf(selected.pci) : null;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-INV-02"
        title="Road Inventory"
        subtitle="Derived from the PROJECT LEDGER — only roads a project record is linked to are listed, so this register and the geospatial console always show the same scope. Each segment is accounted by its latest works: road opening, graveling, asphalting or concreting."
      />

      <Reveal className="mt-6">
        <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-900">
          <CornerTicks />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4">
            <div>
              <p className="font-mono text-[9px] tracking-[0.2em] text-amber-400 uppercase">Pavement ladder · ledger scope</p>
              <p className="font-display mt-1 text-[42px] leading-none font-bold text-paper-100">
                {openedKm.toFixed(1)}<span className="text-[18px] text-paper-300/60"> km opened</span>
              </p>
            </div>
            <div className="min-w-[260px] flex-1">
              <div className="flex h-[14px] overflow-hidden rounded-[3px] border border-ink-600">
                {stages.map((s) => (
                  <div key={s.label} title={`${s.label} ${(ladder[s.label] ?? 0).toFixed(1)} km`}
                    style={{ width: `${openedKm ? ((ladder[s.label] ?? 0) / openedKm) * 100 : 0}%`, background: TREATMENT_COLOR[s.label], transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                {stages.map((s) => (
                  <p key={s.label} className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-wider text-paper-300/75 uppercase">
                    <i className="h-2 w-2 rounded-[2px]" style={{ background: TREATMENT_COLOR[s.label] }} />
                    {TREATMENT_SHORT[s.label]} <b className="text-paper-100">{(ladder[s.label] ?? 0).toFixed(1)} km</b>
                  </p>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">Paved share</p>
              <p className="font-display mt-1 text-[34px] leading-none font-bold text-pine-400">
                {openedKm ? (((ladder.Concreting ?? 0) + (ladder.Asphalting ?? 0)) / openedKm * 100).toFixed(1) : "0.0"}%
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-4">
        <div className="relative flex flex-wrap items-center gap-2 rounded-[4px] border border-line-300 bg-paper-100 p-3">
          <CornerTicks color="border-ink-800/50" />
          <div className="relative min-w-[220px] flex-1">
            <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, barangay, or segment ID…"
              className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/70 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none" />
          </div>
          <span className="hidden cursor-default items-center gap-1.5 rounded-[3px] border border-pine-600/50 bg-pine-600/10 px-2.5 py-2 font-mono text-[10px] font-bold tracking-wider text-pine-600 uppercase sm:flex">
            Project-ledger scope · {linkedIds.size} roads linked
          </span>
          <select value={brgy} onChange={(e) => setBrgy(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
            {barangays.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={surface} onChange={(e) => setSurface(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
            {["All", "Concrete", "Asphalt", "Gravel", "Earth"].map((b) => <option key={b}>{b === "All" ? "All surfaces" : b}</option>)}
          </select>
          <select value={cond} onChange={(e) => setCond(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
            {["All", "Good", "Fair", "Poor"].map((b) => <option key={b}>{b === "All" ? "All conditions" : b}</option>)}
          </select>
          {(search || brgy !== "All" || surface !== "All" || cond !== "All") && (
            <button onClick={() => { setSearch(""); setBrgy("All"); setSurface("All"); setCond("All"); }}
              className="cursor-pointer rounded-[3px] border border-line-400 px-2.5 py-2 font-mono text-[10px] tracking-wider text-text-600 uppercase hover:border-coral-500 hover:text-coral-500">
              Reset
            </button>
          )}
          <button onClick={() => setPrinting(true)}
            className="flex cursor-pointer items-center gap-2 rounded-[3px] border-2 border-ink-800 px-3.5 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-ink-900 uppercase transition-all hover:bg-ink-900 hover:text-amber-400">
            <IconPrinter size={14} /> Print
          </button>
          <button onClick={exportCsv}
            className="group ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800">
            <IconDownload size={14} className="transition-transform group-hover:translate-y-0.5" /> Export CSV
          </button>
        </div>
      </Reveal>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-1 font-mono text-[10.5px] tracking-wider text-text-600 uppercase">
        <span><b className="text-ink-900">{filtered.length}</b> / {linkedRoads.length} ledger-linked roads</span>
        <span><b className="text-ink-900">{filteredKm.toFixed(1)}</b> km selected · {(openedKm ? (filteredKm / openedKm * 100) : 0).toFixed(1)}% of inventory</span>
        <span className="rounded-[3px] border border-line-400 px-1.5 py-0.5 text-[9.5px] text-text-400">
          {(() => {
            const unlinked = roads.length - linkedIds.size;
            return unlinked > 0 ? `${unlinked} registered road${unlinked > 1 ? "s" : ""} hidden — no project record yet` : "every registered city road has a project record";
          })()}
        </span>
        <span className="ml-auto hidden text-text-400 sm:inline">SELECT * FROM roads_road WHERE id IN (SELECT road_id FROM project_records) · {filtered.length} rows</span>
      </div>

      <Reveal className="mt-3" delay={80}>
        <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
          <CornerTicks />
          <div className="thick-scroll max-h-[62vh] overflow-auto">
            <table className="w-full min-w-[1040px] border-collapse">
              <thead className="bg-ink-900 text-paper-300">
                <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-ink-900 [&>th]:border-b-2 [&>th]:border-amber-500/70">
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
                  const c = conditionOf(r.pci);
                  const cm = conditionMeta[c];
                  const d = derived.get(r.id)!;
                  const tc = TREATMENT_COLOR[d.treatment];
                  const isSel = r.id === selectedId;
                  return (
                    <tr key={r.id} id={`row-${r.id}`} onClick={() => onSelect(isSel ? null : r.id)}
                      className={`group cursor-pointer transition-colors ${isSel ? "bg-amber-500/12" : "hover:bg-ink-900/[0.045]"}`}
                      style={{ boxShadow: isSel ? "inset 3px 0 0 #f0a32b" : "inset 3px 0 0 transparent" }}>
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                        <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{r.id} · insp {r.lastInspection}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-600">{r.barangays.join(", ")}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-1 font-mono text-[9.5px] font-bold tracking-wider uppercase"
                          style={{ color: tc, background: `${tc}1a`, boxShadow: `inset 0 0 0 1px ${tc}55` }}
                          title={d.byProjects ? "Derived from the project ledger" : "From surveyed surface"}>
                          <i className="h-1.5 w-1.5 rounded-full" style={{ background: tc }} />
                          {TREATMENT_SHORT[d.treatment]}{d.treatmentYear ? ` · ${d.treatmentYear}` : ""}{d.byProjects ? "" : " · srv"}
                        </span>
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
                        <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-teal-500"><IconPin size={11} /> 4326</span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center font-mono text-[12px] text-text-400">— 0 rows returned. Link a project record to a road to grow the inventory. —</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* drawer */}
      <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${selected ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-0 bg-ink-950/50" onClick={() => onSelect(null)} />
        <aside className={`absolute top-0 right-0 flex h-full w-full max-w-[430px] flex-col border-l-2 border-ink-800 bg-paper-100 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${selected ? "translate-x-0" : "translate-x-full"}`}>
          {selected && selCond && (
            <>
              <div className="border-b-2 border-ink-800 bg-ink-900 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9.5px] tracking-[0.2em] text-amber-400 uppercase">{selected.roadClass} · {selected.id.toUpperCase()} · SRID 4326</p>
                    <h3 className="font-display mt-1 text-3xl leading-none font-bold text-paper-100 uppercase">{selected.name}</h3>
                    <p className="mt-1.5 font-mono text-[10.5px] text-paper-300/70">Brgy. {selected.barangays.join(", ")}</p>
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
                  ].map(([k, v]) => (
                    <div key={k} className="bg-paper-100 px-3 py-2.5">
                      <p className="text-[8.5px] tracking-[0.16em] text-text-400 uppercase">{k}</p>
                      <p className="mt-0.5 font-semibold text-ink-900">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[4px] border border-line-300 bg-white/50 p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Pavement Condition Index</p>
                    <p className="font-display text-3xl leading-none font-bold" style={{ color: conditionMeta[selCond].color }}>{selected.pci}</p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${selected.pci}%`, background: "linear-gradient(90deg, #de5a36, #f0a32b 55%, #1e7a58)" }} />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Geometry · {selected.geometry.length} vertices</p>
                  <pre className="overflow-x-auto rounded-[3px] border border-ink-800 bg-ink-950 p-3 font-mono text-[9.5px] leading-relaxed text-pine-400">
{`LINESTRING(\n${selected.geometry.map(([la, ln]) => `  ${ln.toFixed(5)} ${la.toFixed(5)}`).join(",\n")}\n)`}
                  </pre>
                </div>

                <div className="mt-5">
                  <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-text-400 uppercase">Linked projects ({selectedProjects.length})</p>
                  {selectedProjects.length === 0 && <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[10.5px] text-text-400">No programmed projects on this segment.</p>}
                  <ul className="space-y-2">
                    {selectedProjects.map((p) => {
                      const m = statusOf(p);
                      return (
                        <li key={p.id} className="rounded-[3px] border border-line-300 bg-white/60 p-3 transition-colors hover:border-ink-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{p.id} · {p.folderNo}</span>
                            <span className="rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: m.color, background: m.soft }}>{m.label} {p.percent}%</span>
                          </div>
                          <p className="mt-1 text-[12.5px] font-semibold text-ink-900">{p.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-text-600">{fmtPesoM(p.contractedAmount)} · {p.type} · {p.mode}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <button onClick={() => onLocate(selected)}
                className="group flex w-full items-center justify-center gap-2 border-t-2 border-ink-800 bg-amber-500 py-3.5 font-mono text-[11px] font-bold tracking-[0.18em] text-ink-950 uppercase transition-colors hover:bg-amber-400">
                <IconPin size={15} /> Locate on map console
                <IconArrow size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </>
          )}
        </aside>
      </div>

      {printing && (
        <PrintPortal>
          <InventorySheet
            scopeNote="Project-ledger linked city roads"
            networkKm={openedKm}
            ladder={ladder}
            rows={filtered.map((r) => {
              const d = derived.get(r.id)!;
              return {
                r: { id: r.id, name: r.name, barangay: r.barangays.join(", "), surface: r.surface, condition: conditionOf(r.pci), lengthKm: r.lengthKm, widthM: r.widthM, lanes: r.lanes, aadt: r.aadt, pci: r.pci },
                treatment: d.treatment as Treatment, treatmentYear: d.treatmentYear, byProjects: d.byProjects,
                projCount: projCount.get(r.id) ?? 0,
              };
            })}
          />
        </PrintPortal>
      )}
    </div>
  );
}
