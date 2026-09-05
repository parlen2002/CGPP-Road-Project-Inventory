/* ─────────────────────────────────────────────────────────────
   ROAD & STREET REGISTRY — the naming basis of the road inventory.
   Every road Puerto Princesa repairs, rebuilds, develops or opens
   is registered here with a proper name; project records link to it
   by roadId. Modeled on the barangay registry: encode, edit, remove
   (removal requires Program-Admin and unlinks dependent projects).
   ────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useStore, addRoadReg, updateRoadReg, deleteRoadReg } from "../state/store";
import {
  ROAD_SOURCES, SURFACES, conditionOf, ladderOf, stubGeometry, deriveRoad,
  TREATMENT_ORDER, type RoadReg, type Jurisdiction,
} from "../data/roadsRegistry";
import type { Surface } from "../data/roads";
import { TREATMENT_SHORT, TREATMENT_COLOR } from "../data/roads";
import { PageHeader, Reveal, CornerTicks, CountUp, conditionMeta } from "../components/ui";
import { SearchSelect } from "../components/SearchSelect";
import { IconPlus, IconEdit, IconTrash, IconSearch, IconPin } from "../components/icons";
import { toast } from "../components/toast";
import ConfirmDialog from "../components/confirm";
import { fmtPesoM } from "../data/registry";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";
const saveBtnCls =
  "cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40";

export default function Roads({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { roadsReg, records, barangays, admin } = useStore();
  const [search, setSearch] = useState("");
  const [jur, setJur] = useState<"All" | Jurisdiction>("All");
  const [modal, setModal] = useState<null | { editing: RoadReg | null }>(null);
  const [del, setDel] = useState<RoadReg | null>(null);

  const cityRoads = useMemo(() => roadsReg.filter((r) => r.jurisdiction === "OCE"), [roadsReg]);
  const ladder = useMemo(() => ladderOf(cityRoads), [cityRoads]);

  const derived = useMemo(
    () => new Map(roadsReg.map((r) => [r.id, deriveRoad(r, records)])),
    [roadsReg, records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roadsReg.filter((r) =>
      (jur === "All" || r.jurisdiction === jur) &&
      (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) ||
        r.barangays.some((b) => b.toLowerCase().includes(q)))
    );
  }, [roadsReg, search, jur]);

  const linked = del ? (derived.get(del.id)?.projects.length ?? 0) : 0;
  const brgyOptions = barangays.map((b) => ({ value: b.name, label: b.name, sub: b.psgc }));

  const locate = (r: RoadReg) => {
    const mid = r.geometry[Math.floor(r.geometry.length / 2)];
    onLocate(mid, 15);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-RDR-06"
        title="Road & Street Registry"
        subtitle="The naming register of Puerto Princesa's roads — the basis of the road inventory. Each road being repaired, rebuilt, developed or opened is registered here with a proper name, jurisdiction and coverage; project records link to it by road. Renaming or removing a road propagates to every linked project."
      />

      {/* stat strip */}
      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-5">
          {[
            { k: "Registered roads", node: <CountUp value={roadsReg.length} />, s: "roads_registry rows" },
            { k: "City network (OCE)", node: <CountUp value={ladder.openedKm} decimals={1} suffix=" km" />, s: `${ladder.segments} segments` },
            { k: "Concreted + asphalted", node: <CountUp value={+(ladder.concretedKm + ladder.asphaltedKm).toFixed(1)} decimals={1} suffix=" km" />, s: "paved surface" },
            { k: "Earth / opened only", node: <CountUp value={+ladder.earthKm.toFixed(1)} decimals={1} suffix=" km" />, s: "awaiting surfacing" },
            { k: "With active projects", node: <CountUp value={[...derived.values()].filter((d) => d.ongoing > 0).length} />, s: "roads under works" },
          ].map((x) => (
            <div key={x.k} className="group bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.18em] text-paper-300/50 uppercase">{x.k}</p>
              <p className="font-display mt-1.5 text-3xl leading-none font-bold text-paper-100 sm:text-4xl">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* toolbar */}
      <Reveal className="mt-4" delay={60}>
        <div className="relative flex flex-wrap items-center gap-2 rounded-[4px] border border-line-300 bg-paper-100 p-3">
          <CornerTicks color="border-ink-800/50" />
          <div className="relative min-w-[220px] flex-1">
            <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by road name, key, or barangay…"
              className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
            />
          </div>
          {(["All", "OCE", "DPWH"] as const).map((j) => (
            <button key={j} onClick={() => setJur(j)}
              className={`cursor-pointer rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-all ${
                jur === j ? "border-ink-900 bg-ink-900 text-amber-400" : "border-line-400 text-text-600 hover:border-ink-800 hover:text-ink-900"
              }`}>
              {j === "All" ? "All" : j === "OCE" ? "City (OCE)" : "National (DPWH)"}
            </button>
          ))}
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-400 uppercase">
            {filtered.length} / {roadsReg.length} roads
          </p>
          <button onClick={() => setModal({ editing: null })}
            className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800">
            <IconPlus size={13} /> Encode road
          </button>
        </div>
      </Reveal>

      {/* table */}
      <Reveal className="mt-3 pb-2" delay={100}>
        <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
          <CornerTicks />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead className="bg-ink-900 text-paper-300">
                <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-mono [&>th]:text-[9.5px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                  <th className="text-left">Key</th>
                  <th className="text-left">Road / Street Name</th>
                  <th className="text-left">Jurisdiction</th>
                  <th className="text-left">Barangay Coverage</th>
                  <th className="text-right">Length</th>
                  <th className="text-left">Surface</th>
                  <th className="text-left">Treatment (from projects)</th>
                  <th className="text-left">PCI</th>
                  <th className="text-right">Projects</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {filtered.map((r) => {
                  const d = derived.get(r.id)!;
                  const cond = conditionOf(r.pci);
                  const cm = conditionMeta[cond];
                  const isDPWH = r.jurisdiction === "DPWH";
                  return (
                    <tr key={r.id} className="group transition-colors hover:bg-ink-900/[0.045]">
                      <td className="px-3 py-2.5 font-mono text-[10px] font-bold tracking-wide text-teal-500">{r.id}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-[12.5px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                        <p className="font-mono text-[9px] tracking-wider text-text-400 uppercase">{r.geometrySource}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider uppercase ${
                          isDPWH ? "bg-steel-500/15 text-steel-500" : "bg-pine-600/12 text-pine-600"
                        }`}>{r.jurisdiction}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-600">{r.barangays.join(" · ")}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] font-semibold text-ink-900 tabular">{r.lengthKm.toFixed(1)} km</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-text-600">{r.surface}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider uppercase"
                          style={{ color: TREATMENT_COLOR[d.treatment], background: `${TREATMENT_COLOR[d.treatment]}18` }}>
                          <i className="h-1.5 w-1.5 rounded-full" style={{ background: TREATMENT_COLOR[d.treatment] }} />
                          {TREATMENT_SHORT[d.treatment]}{d.treatmentYear ? ` · ${d.treatmentYear}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {isDPWH ? <span className="font-mono text-[10px] text-text-400">n/a · DPWH</span> : (
                          <span className="flex items-center gap-2">
                            <span className="h-[7px] w-12 overflow-hidden rounded-full bg-ink-900/10">
                              <span className="block h-full rounded-full" style={{ width: `${r.pci}%`, background: cm.color }} />
                            </span>
                            <span className="font-mono text-[11px] font-semibold tabular" style={{ color: cm.color }}>{r.pci}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-grid h-6 min-w-6 place-items-center rounded-[3px] px-1.5 font-mono text-[11px] font-bold ${
                          d.projects.length ? "bg-pine-600 text-paper-100" : "bg-ink-900/8 text-text-400"
                        }`}>{d.projects.length}</span>
                        {d.budget > 0 && <p className="mt-0.5 font-mono text-[9px] text-text-400 tabular">{fmtPesoM(d.budget)}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => locate(r)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-teal-500 hover:text-teal-500" title="Locate on map"><IconPin size={13} /></button>
                          <button onClick={() => setModal({ editing: r })} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600" title="Edit road"><IconEdit size={13} /></button>
                          <button
                            onClick={() => (admin ? setDel(r) : toast("Program-Admin mode required", "info", "toggle ADMIN on the top bar to remove registry entries"))}
                            className={`rounded-[3px] border p-1.5 transition-colors ${admin ? "cursor-pointer border-line-400 text-text-400 hover:border-coral-500 hover:text-coral-600" : "cursor-not-allowed border-line-300 text-line-400"}`}
                            title={admin ? "Remove road" : "Requires Program-Admin mode"}
                          ><IconTrash size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center font-mono text-[12px] text-text-400">— no roads match the filter —</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line-300 bg-paper-200 px-4 py-2 font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">
            {admin ? "admin mode · removals enabled" : "read-only view · toggle ADMIN (top bar) to remove"} · treatment derived from the project ledger
          </p>
        </div>
      </Reveal>

      {modal && <RoadForm editing={modal.editing} brgyOptions={brgyOptions} onClose={() => setModal(null)} />}

      {del && (
        <ConfirmDialog
          title="Remove road"
          sheet="roads_registry · DELETE"
          confirmLabel={linked ? "Remove & unlink" : "Remove road"}
          message={
            <div>
              <p><b className="text-ink-900">{del.id}</b> — {del.name} will be removed from the registry.</p>
              {linked > 0 && (
                <p className="mt-2 rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-coral-600 uppercase">
                  ⚠ {linked} project{linked > 1 ? "s" : ""} link to this road — they will be unlinked (roadId cleared).
                </p>
              )}
            </div>
          }
          onConfirm={() => {
            const n = deleteRoadReg(del.id);
            toast(del.name, "deleted", n ? `removed · unlinked ${n} project${n > 1 ? "s" : ""}` : "removed from registry");
          }}
          onClose={() => setDel(null)}
        />
      )}
    </div>
  );
}

/* ---------- encode / edit form (viewport-centered via portal) ---------- */

function RoadForm({ editing, brgyOptions, onClose }: {
  editing: RoadReg | null;
  brgyOptions: { value: string; label: string; sub: string }[];
  onClose: () => void;
}) {
  const { barangays, roadsReg } = useStore();
  const [f, setF] = useState(() => editing ? {
    name: editing.name, jurisdiction: editing.jurisdiction, roadClass: editing.roadClass,
    barangays: editing.barangays, lengthKm: String(editing.lengthKm), widthM: String(editing.widthM),
    lanes: String(editing.lanes), surface: editing.surface, aadt: String(editing.aadt),
    pci: String(editing.pci), lastInspection: editing.lastInspection === "—" ? "" : editing.lastInspection,
    geometrySource: editing.geometrySource,
  } : {
    name: "", jurisdiction: "OCE" as Jurisdiction, roadClass: "City" as RoadReg["roadClass"],
    barangays: [] as string[], lengthKm: "1.0", widthM: "6", lanes: "2", surface: "Earth" as Surface,
    aadt: "500", pci: "60", lastInspection: "", geometrySource: ROAD_SOURCES[2],
  });

  const valid = f.name.trim().length > 2 && f.barangays.length > 0;
  const previewId = editing?.id ?? `RD-${String(roadsReg.length + 1).padStart(3, "0")}`;

  const save = () => {
    const base = {
      name: f.name.trim(), jurisdiction: f.jurisdiction, roadClass: f.roadClass,
      barangays: f.barangays, lengthKm: parseFloat(f.lengthKm) || 0, widthM: parseFloat(f.widthM) || 0,
      lanes: parseInt(f.lanes, 10) || 2, surface: f.surface, aadt: parseInt(f.aadt, 10) || 0,
      pci: f.jurisdiction === "OCE" ? Math.max(0, Math.min(100, parseInt(f.pci, 10) || 0)) : 0,
      lastInspection: f.jurisdiction === "OCE" ? (f.lastInspection || new Date().toISOString().slice(0, 10)) : "—",
      geometrySource: f.geometrySource,
    };
    if (editing) {
      updateRoadReg(editing.id, base);
      toast(f.name.trim(), "updated", `${editing.id} · ${f.barangays.length} barangay${f.barangays.length > 1 ? "s" : ""}`);
    } else {
      const b = barangays.find((x) => x.name === f.barangays[0]);
      const geom = b ? stubGeometry(b.lat, b.lng) : stubGeometry(9.74, 118.74);
      const id = addRoadReg({ ...base, geometry: geom });
      toast(f.name.trim(), "saved", `${id} · stub centerline at Brgy. ${f.barangays[0]}`);
    }
    onClose();
  };

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-xl rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">roads_registry · {previewId}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{editing ? "Edit Road" : "Encode Road"}</h3>
          </div>
          <span className="font-mono text-[9px] tracking-[0.16em] text-paper-300/40 uppercase">EPSG:4326</span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="col-span-2">
            <label className={labelCls}>Road / Street Name *</label>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rizal Avenue" />
          </div>
          <div>
            <label className={labelCls}>Jurisdiction</label>
            <select className={inputCls} value={f.jurisdiction} onChange={(e) => setF({ ...f, jurisdiction: e.target.value as Jurisdiction })}>
              <option value="OCE">OCE — city-managed</option>
              <option value="DPWH">DPWH — national, reference only</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Road class</label>
            <select className={inputCls} value={f.roadClass} onChange={(e) => setF({ ...f, roadClass: e.target.value as RoadReg["roadClass"] })}>
              <option value="City">City</option>
              <option value="National">National</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Barangay coverage * (type to filter)</label>
            <SearchSelect multiple value={f.barangays} onChange={(v) => setF({ ...f, barangays: v as string[] })}
              options={brgyOptions} placeholder="Search & select barangays…" invalid={f.barangays.length === 0} />
          </div>
          <div>
            <label className={labelCls}>Length (km)</label>
            <input className={inputCls} value={f.lengthKm} onChange={(e) => setF({ ...f, lengthKm: e.target.value })} inputMode="decimal" />
          </div>
          <div>
            <label className={labelCls}>Width (m)</label>
            <input className={inputCls} value={f.widthM} onChange={(e) => setF({ ...f, widthM: e.target.value })} inputMode="decimal" />
          </div>
          <div>
            <label className={labelCls}>Lanes</label>
            <input className={inputCls} value={f.lanes} onChange={(e) => setF({ ...f, lanes: e.target.value })} inputMode="numeric" />
          </div>
          <div>
            <label className={labelCls}>Surface</label>
            <select className={inputCls} value={f.surface} onChange={(e) => setF({ ...f, surface: e.target.value as Surface })}>
              {SURFACES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>AADT</label>
            <input className={inputCls} value={f.aadt} onChange={(e) => setF({ ...f, aadt: e.target.value })} inputMode="numeric" />
          </div>
          <div>
            <label className={labelCls}>PCI (0–100, OCE only)</label>
            <input className={inputCls} value={f.pci} onChange={(e) => setF({ ...f, pci: e.target.value })} inputMode="numeric" disabled={f.jurisdiction === "DPWH"} style={{ opacity: f.jurisdiction === "DPWH" ? 0.5 : 1 }} />
          </div>
          <div>
            <label className={labelCls}>Last inspection</label>
            <input type="date" className={inputCls} value={f.lastInspection} onChange={(e) => setF({ ...f, lastInspection: e.target.value })} disabled={f.jurisdiction === "DPWH"} style={{ opacity: f.jurisdiction === "DPWH" ? 0.5 : 1 }} />
          </div>
          <div>
            <label className={labelCls}>Geometry source</label>
            <select className={inputCls} value={f.geometrySource} onChange={(e) => setF({ ...f, geometrySource: e.target.value })}>
              {ROAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">
            {editing ? "primary key is immutable" : `new key ${previewId} will be issued · stub centerline auto-generated`}
          </p>
          <button disabled={!valid} onClick={save} className={saveBtnCls}>{editing ? "Save changes" : "Encode road"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* keep TREATMENT_ORDER referenced (future inline re-grading control) */
void TREATMENT_ORDER;
