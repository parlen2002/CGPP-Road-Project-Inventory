/* Road & Street registry — the naming basis of the inventory. CRUD gated by
   role; deletions unlink project records. */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader, Reveal, CornerTicks, CountUp, conditionMeta } from "../components/ui";
import { useStore, addRoadReg, updateRoadReg, deleteRoadReg } from "../state/store";
import { useAuth } from "../state/authStore";
import { deriveRoad, stubCenterline, ROAD_CLASSES, SURFACES, ROAD_SOURCES, type RoadReg } from "../data/roadsRegistry";
import { TREATMENT_COLOR, TREATMENT_SHORT, type RoadClass, type Surface } from "../data/roads";
import { fmtPesoM } from "../data/registry";
import { CatalogSelect } from "../components/CatalogSelect";
import { SearchSelect } from "../components/SearchSelect";
import ConfirmDialog from "../components/confirm";
import { toast } from "../components/toast";
import { IconPlus, IconEdit, IconTrash, IconSearch, IconPin } from "../components/icons";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";

function RoadForm({ editing, onClose }: { editing: RoadReg | null; onClose: () => void }) {
  const { barangays } = useStore();
  const [f, setF] = useState(() => editing ? {
    name: editing.name, roadClass: editing.roadClass, jurisdiction: editing.jurisdiction,
    barangays: editing.barangays, lengthKm: String(editing.lengthKm), widthM: String(editing.widthM),
    lanes: String(editing.lanes), surface: editing.surface, aadt: String(editing.aadt),
    pci: String(editing.pci), lastInspection: editing.lastInspection === "—" ? "" : editing.lastInspection,
    geometrySource: editing.geometrySource,
  } : {
    name: "", roadClass: "City" as RoadClass, jurisdiction: "OCE" as "OCE" | "DPWH",
    barangays: [] as string[], lengthKm: "1.0", widthM: "8", lanes: "2", surface: "Gravel" as Surface,
    aadt: "1000", pci: "50", lastInspection: new Date().toISOString().slice(0, 10), geometrySource: ROAD_SOURCES[0],
  });
  const valid = f.name.trim().length > 2 && f.barangays.length > 0;

  const submit = () => {
    const base = {
      name: f.name.trim(), roadClass: f.roadClass, jurisdiction: f.jurisdiction,
      barangays: f.barangays, lengthKm: parseFloat(f.lengthKm) || 0, widthM: parseFloat(f.widthM) || 0,
      lanes: parseInt(f.lanes, 10) || 2, surface: f.surface, aadt: parseInt(f.aadt, 10) || 0,
      pci: parseInt(f.pci, 10) || 0, lastInspection: f.lastInspection || "—", geometrySource: f.geometrySource,
    };
    if (editing) {
      updateRoadReg(editing.id, base);
      toast(f.name, "updated", `${editing.id} · road registry`);
    } else {
      const b = barangays.find((x) => x.name === f.barangays[0]);
      const geometry = b ? stubCenterline(b.lat, b.lng) : stubCenterline(9.74, 118.74);
      const id = addRoadReg({ ...base, geometry });
      toast(f.name, "saved", `${id} · stub centerline at ${f.barangays[0]}`);
    }
    onClose();
  };

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-2xl rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">road_registry · {editing ? editing.id : "new"}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{editing ? "Edit Road / Street" : "Encode Road / Street"}</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer font-mono text-[11px] text-paper-300/60 hover:text-amber-400">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Proper road / street name *</label>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rizal Avenue" />
          </div>
          <div>
            <label className={labelCls}>Road class</label>
            <CatalogSelect group="roadClasses" fallback={[...ROAD_CLASSES]} value={f.roadClass} onChange={(v) => setF({ ...f, roadClass: v as RoadClass, jurisdiction: v === "National" ? "DPWH" : "OCE" })} />
          </div>
          <div>
            <label className={labelCls}>Jurisdiction</label>
            <select className={inputCls} value={f.jurisdiction} onChange={(e) => setF({ ...f, jurisdiction: e.target.value as "OCE" | "DPWH" })}>
              <option value="OCE">OCE (city)</option>
              <option value="DPWH">DPWH (reference)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Barangay coverage *</label>
            <SearchSelect value={f.barangays} onChange={(v) => setF({ ...f, barangays: v as string[] })} multiple
              options={barangays.map((b) => ({ value: b.name, label: b.name, sub: b.psgc }))} placeholder="Select barangays…" invalid={f.barangays.length === 0} />
          </div>
          <div><label className={labelCls}>Length (km)</label><input className={inputCls} value={f.lengthKm} onChange={(e) => setF({ ...f, lengthKm: e.target.value })} inputMode="decimal" /></div>
          <div><label className={labelCls}>Width (m)</label><input className={inputCls} value={f.widthM} onChange={(e) => setF({ ...f, widthM: e.target.value })} inputMode="decimal" /></div>
          <div><label className={labelCls}>Lanes</label><input className={inputCls} value={f.lanes} onChange={(e) => setF({ ...f, lanes: e.target.value })} inputMode="numeric" /></div>
          <div>
            <label className={labelCls}>Surface</label>
            <CatalogSelect group="roadSurfaces" fallback={[...SURFACES]} value={f.surface} onChange={(v) => setF({ ...f, surface: v as Surface })} />
          </div>
          <div><label className={labelCls}>AADT</label><input className={inputCls} value={f.aadt} onChange={(e) => setF({ ...f, aadt: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>PCI (0–100)</label><input className={inputCls} value={f.pci} onChange={(e) => setF({ ...f, pci: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>Last inspection</label><input type="date" className={inputCls} value={f.lastInspection} onChange={(e) => setF({ ...f, lastInspection: e.target.value })} /></div>
          <div>
            <label className={labelCls}>Geometry source</label>
            <CatalogSelect group="roadSources" fallback={[...ROAD_SOURCES]} value={f.geometrySource} onChange={(v) => setF({ ...f, geometrySource: v })} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">{editing ? "primary key is immutable" : "new roads get a stub centerline for linking"}</p>
          <button disabled={!valid} onClick={submit}
            className="cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40">
            {editing ? "Save changes" : "Encode road"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Roads({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { roadsReg, records } = useStore();
  const { can, role } = useAuth();
  const [search, setSearch] = useState("");
  const [jur, setJur] = useState("All");
  const [modal, setModal] = useState<null | { editing: RoadReg | null }>(null);
  const [del, setDel] = useState<RoadReg | null>(null);

  const derived = useMemo(() => {
    const m = new Map<string, ReturnType<typeof deriveRoad>>();
    roadsReg.forEach((e) => m.set(e.id, deriveRoad(e, records)));
    return m;
  }, [roadsReg, records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roadsReg.filter((r) =>
      (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.barangays.join(" ").toLowerCase().includes(q)) &&
      (jur === "All" || r.jurisdiction === jur)
    );
  }, [roadsReg, search, jur]);

  const stats = useMemo(() => {
    const oce = roadsReg.filter((r) => r.jurisdiction === "OCE");
    const linked = new Set(records.map((r) => r.roadId).filter(Boolean));
    return {
      total: roadsReg.length,
      oceKm: oce.reduce((s, r) => s + r.lengthKm, 0),
      linked: oce.filter((r) => linked.has(r.id)).length,
      budget: records.reduce((s, r) => s + r.contractedAmount, 0),
    };
  }, [roadsReg, records]);

  const delLinked = del ? records.filter((r) => r.roadId === del.id).length : 0;

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-RRG-06"
        title="Road & Street Registry"
        subtitle="Every repaired, rebuilt, developed or opened road gets its proper name here. Project records link to these entries — the road inventory is derived from those links."
      />

      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-4">
          {[
            { k: "Registered roads", node: <CountUp value={stats.total} />, s: "city + DPWH reference" },
            { k: "OCE network", node: <CountUp value={+stats.oceKm.toFixed(1)} decimals={1} suffix=" km" />, s: "city jurisdiction" },
            { k: "Linked to projects", node: <CountUp value={stats.linked} />, s: "drive the inventory" },
            { k: "Programmed budget", node: <CountUp value={stats.budget / 1e6} decimals={1} prefix="₱" suffix="M" />, s: "all linked records" },
          ].map((x) => (
            <div key={x.k} className="bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">{x.k}</p>
              <p className="font-display mt-1.5 text-4xl leading-none font-bold text-paper-100">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-4" delay={70}>
        <div className="relative flex flex-wrap items-center gap-2 rounded-[4px] border border-line-300 bg-paper-100 p-3">
          <CornerTicks color="border-ink-800/50" />
          <div className="relative min-w-[220px] flex-1">
            <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search road name, ID, or barangay…"
              className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none" />
          </div>
          <select value={jur} onChange={(e) => setJur(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
            {["All", "OCE", "DPWH"].map((j) => <option key={j}>{j === "All" ? "All jurisdictions" : j}</option>)}
          </select>
          {can.create && (
            <button onClick={() => setModal({ editing: null })}
              className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800">
              <IconPlus size={13} /> Encode road
            </button>
          )}
        </div>
      </Reveal>

      <Reveal className="mt-4" delay={100}>
        <div className="overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
          <div className="thick-scroll max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead className="bg-ink-900 text-paper-300">
                <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-ink-900 [&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9.5px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                  <th>Key / Name</th><th>Jurisdiction</th><th>Barangays</th><th>Treatment (derived)</th><th>Surface</th>
                  <th className="!text-right">Length</th><th className="!text-right">PCI</th><th className="!text-right">Projects</th><th className="!text-right">Budget</th><th className="!text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {filtered.map((r) => {
                  const d = derived.get(r.id)!;
                  const tc = TREATMENT_COLOR[d.treatment];
                  const isOce = r.jurisdiction === "OCE";
                  return (
                    <tr key={r.id} className={`group transition-colors hover:bg-ink-900/[0.045] ${!isOce ? "opacity-60" : ""}`}>
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-[9px] font-bold tracking-wide text-teal-500">{r.id}</p>
                        <p className="text-[12.5px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                        <p className="font-mono text-[8.5px] tracking-wider text-text-400 uppercase">{r.geometrySource}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-[3px] px-2 py-1 font-mono text-[9px] font-bold uppercase ${isOce ? "bg-pine-500/15 text-pine-600" : "bg-ink-900/8 text-text-600"}`}>{r.jurisdiction}</span>
                      </td>
                      <td className="max-w-[180px] px-3 py-2.5 font-mono text-[10px] text-text-600">{r.barangays.join(", ")}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-1 font-mono text-[9.5px] font-bold tracking-wider uppercase"
                          style={{ color: tc, background: `${tc}1a`, boxShadow: `inset 0 0 0 1px ${tc}55` }}>
                          <i className="h-1.5 w-1.5 rounded-full" style={{ background: tc }} />
                          {TREATMENT_SHORT[d.treatment]}{d.treatmentYear ? ` · ${d.treatmentYear}` : ""}{d.byProjects ? "" : " · srv"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-text-600">{r.surface}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11.5px] font-semibold text-ink-900 tabular">{r.lengthKm.toFixed(1)} km</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono text-[11px] font-semibold tabular" style={{ color: conditionMeta[r.pci >= 70 ? "Good" : r.pci >= 50 ? "Fair" : "Poor"].color }}>{r.pci}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-grid h-6 min-w-6 place-items-center rounded-[3px] px-1.5 font-mono text-[11px] font-bold ${d.projects.length ? "bg-pine-600 text-paper-100" : "bg-ink-900/8 text-text-400"}`}>{d.projects.length}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] font-semibold text-ink-900 tabular">{d.budget ? fmtPesoM(d.budget) : "—"}</td>
                      <td className="px-3 py-2.5" >
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onLocate(r.geometry[Math.floor(r.geometry.length / 2)], 15)}
                            className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-teal-500 hover:text-teal-500" title="Locate on console map">
                            <IconPin size={13} />
                          </button>
                          {can.update && isOce && (
                            <button onClick={() => setModal({ editing: r })}
                              className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600" title="Edit road">
                              <IconEdit size={13} />
                            </button>
                          )}
                          {can.del && isOce && (
                            <button onClick={() => setDel(r)}
                              className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600" title="Delete road (admin)">
                              <IconTrash size={13} />
                            </button>
                          )}
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
            {can.del ? "admin role · removals enabled" : `${role} role · removals require admin`} · DPWH rows are reference-only
          </p>
        </div>
      </Reveal>

      {modal && <RoadForm editing={modal.editing} onClose={() => setModal(null)} />}

      {del && (
        <ConfirmDialog
          title="Delete road"
          sheet="road_registry · DELETE"
          confirmLabel={delLinked ? "Delete & unlink" : "Delete road"}
          message={
            <div>
              <p><b className="text-ink-900">{del.id} · {del.name}</b> will be removed from the registry.</p>
              {delLinked > 0 && (
                <p className="mt-2 rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-coral-600 uppercase">
                  ⚠ {delLinked} project{delLinked > 1 ? "s" : ""} link to this road — they will be unlinked.
                </p>
              )}
            </div>
          }
          onConfirm={() => {
            deleteRoadReg(del.id);
            toast(del.name, "deleted", delLinked ? `removed · unlinked ${delLinked} project${delLinked > 1 ? "s" : ""}` : "removed from registry");
          }}
          onClose={() => setDel(null)}
        />
      )}
    </div>
  );
}
