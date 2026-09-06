import { useMemo, useState } from "react";
import { PageHeader, Reveal, CornerTicks, CountUp } from "../components/ui";
import { useStore, addRoadReg, updateRoadReg, deleteRoadReg } from "../state/store";
import { deriveRoad, stubCenterline, nextRoadRegId, ROAD_CLASSES, SURFACES, ROAD_SOURCES, type RoadReg } from "../data/roadsRegistry";
import { TREATMENT_COLOR, TREATMENT_SHORT, conditionOf, type RoadClass, type Surface } from "../data/roads";
import { conditionMeta } from "../components/ui";
import { fmtPesoM } from "../data/registry";
import { toast } from "../components/toast";
import ConfirmDialog from "../components/confirm";
import { SearchSelect } from "../components/SearchSelect";
import { IconPlus, IconEdit, IconTrash, IconSearch, IconPin } from "../components/icons";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";

function RoadForm({ editing, onClose }: { editing: RoadReg | null; onClose: () => void }) {
  const { roadsReg, barangays, records } = useStore();
  const [f, setF] = useState(() => editing ? {
    name: editing.name, roadClass: editing.roadClass, barangays: editing.barangays,
    lengthKm: String(editing.lengthKm), widthM: String(editing.widthM), lanes: String(editing.lanes),
    surface: editing.surface, aadt: String(editing.aadt), pci: String(editing.pci),
    lastInspection: editing.lastInspection, geometrySource: editing.geometrySource,
  } : {
    name: "", roadClass: "City" as RoadClass, barangays: [] as string[],
    lengthKm: "1.0", widthM: "8", lanes: "2", surface: "Gravel" as Surface, aadt: "1000", pci: "50",
    lastInspection: new Date().toISOString().slice(0, 10), geometrySource: ROAD_SOURCES[0],
  });

  const valid = f.name.trim().length > 2 && f.barangays.length > 0;
  const brgyOptions = barangays.map((b) => ({ value: b.name, label: b.name, sub: b.psgc }));

  const save = () => {
    const base = {
      name: f.name.trim(), roadClass: f.roadClass,
      jurisdiction: (f.roadClass === "City" ? "OCE" : "DPWH") as RoadReg["jurisdiction"],
      barangays: f.barangays, lengthKm: parseFloat(f.lengthKm) || 0, widthM: parseFloat(f.widthM) || 0,
      lanes: parseInt(f.lanes, 10) || 2, surface: f.surface, aadt: parseInt(f.aadt, 10) || 0,
      pci: parseInt(f.pci, 10) || 0, lastInspection: f.lastInspection, geometrySource: f.geometrySource,
    };
    if (editing) {
      updateRoadReg(editing.id, base);
      toast(f.name, "updated", `${editing.id} · ${f.roadClass} · ${f.surface}`);
    } else {
      const b = barangays.find((x) => x.name === f.barangays[0]);
      const geometry = b ? stubCenterline(b.lat, b.lng) : stubCenterline(9.74, 118.74);
      const id = nextRoadRegId(roadsReg);
      addRoadReg({ ...base, geometry });
      toast(f.name, "saved", `${id} · stub centerline placed at first barangay`);
    }
    onClose();
  };

  return (
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-2xl rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">roads_road · {editing ? editing.id : nextRoadRegId(roadsReg)}</p>
          <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{editing ? "Edit Road / Street" : "Encode Road / Street"}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Proper road / street name *</label>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rizal Avenue" />
          </div>
          <div>
            <label className={labelCls}>Road class</label>
            <select className={inputCls} value={f.roadClass} onChange={(e) => setF({ ...f, roadClass: e.target.value as RoadClass })}>
              {ROAD_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Surface</label>
            <select className={inputCls} value={f.surface} onChange={(e) => setF({ ...f, surface: e.target.value as Surface })}>
              {SURFACES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Geometry source</label>
            <select className={inputCls} value={f.geometrySource} onChange={(e) => setF({ ...f, geometrySource: e.target.value })}>
              {ROAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Barangay coverage *</label>
            <SearchSelect value={f.barangays} onChange={(v) => setF({ ...f, barangays: v as string[] })} options={brgyOptions} multiple placeholder="Select one or more barangays…" invalid={f.barangays.length === 0} />
          </div>
          <div><label className={labelCls}>Length (km)</label><input className={inputCls} value={f.lengthKm} onChange={(e) => setF({ ...f, lengthKm: e.target.value })} inputMode="decimal" /></div>
          <div><label className={labelCls}>Width (m)</label><input className={inputCls} value={f.widthM} onChange={(e) => setF({ ...f, widthM: e.target.value })} inputMode="decimal" /></div>
          <div><label className={labelCls}>Lanes</label><input className={inputCls} value={f.lanes} onChange={(e) => setF({ ...f, lanes: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>AADT</label><input className={inputCls} value={f.aadt} onChange={(e) => setF({ ...f, aadt: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>PCI (0–100)</label><input className={inputCls} value={f.pci} onChange={(e) => setF({ ...f, pci: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>Last inspection</label><input type="date" className={inputCls} value={f.lastInspection} onChange={(e) => setF({ ...f, lastInspection: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">{editing ? "primary key is immutable" : "a stub centerline is placed for Lot & ROW"}</p>
          <button disabled={!valid} onClick={save}
            className="cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40">
            {editing ? "Save changes" : "Encode road"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Roads({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { roadsReg, records } = useStore();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { editing: RoadReg | null }>(null);
  const [del, setDel] = useState<RoadReg | null>(null);

  const derived = useMemo(() => {
    const m = new Map<string, ReturnType<typeof deriveRoad>>();
    roadsReg.forEach((e) => m.set(e.id, deriveRoad(e, records)));
    return m;
  }, [roadsReg, records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roadsReg.filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.barangays.join(" ").toLowerCase().includes(q));
  }, [roadsReg, search]);

  const stats = useMemo(() => {
    const oce = roadsReg.filter((r) => r.jurisdiction === "OCE");
    const km = oce.reduce((s, r) => s + r.lengthKm, 0);
    const linked = new Set(records.map((r) => r.roadId).filter(Boolean));
    return { total: roadsReg.length, oce: oce.length, km, linked: oce.filter((r) => linked.has(r.id)).length };
  }, [roadsReg, records]);

  const delLinked = del ? records.filter((r) => r.roadId === del.id).length : 0;

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-RREG-06"
        title="Road & Street Registry"
        subtitle="The naming basis of the inventory — every repaired, rebuilt, developed or opened road gets its proper name here. Treatment shown per road is the highest pavement stage among its linked projects."
      />

      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-4">
          {[
            { k: "Registered roads", node: <CountUp value={stats.total} />, s: "city + national ref" },
            { k: "OCE city roads", node: <CountUp value={stats.oce} />, s: "city jurisdiction" },
            { k: "City network", node: <CountUp value={+stats.km.toFixed(1)} decimals={1} suffix=" km" />, s: "total length" },
            { k: "Linked to projects", node: <CountUp value={stats.linked} />, s: "appear in the inventory" },
          ].map((x) => (
            <div key={x.k} className="bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">{x.k}</p>
              <p className="font-display mt-1.5 text-4xl leading-none font-bold text-paper-100">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-6" delay={60}>
        <div className="relative flex flex-wrap items-center gap-2 rounded-[4px] border border-line-300 bg-paper-100 p-3">
          <CornerTicks color="border-ink-800/50" />
          <div className="relative min-w-[220px] flex-1">
            <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by road name, ID, or barangay…"
              className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/70 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none" />
          </div>
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-400 uppercase">{filtered.length} / {roadsReg.length} roads</p>
          <button onClick={() => setModal({ editing: null })}
            className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800">
            <IconPlus size={13} /> Encode road
          </button>
        </div>
      </Reveal>

      <Reveal className="mt-3" delay={100}>
        <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
          <CornerTicks />
          <div className="thick-scroll max-h-[62vh] overflow-auto">
            <table className="w-full min-w-[1240px] border-collapse">
              <thead className="bg-ink-900 text-paper-300">
                <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-ink-900 [&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9.5px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                  <th>Road / Street</th><th>Class</th><th>Barangays</th><th>Surface</th><th>Treatment (derived)</th>
                  <th className="!text-right">Length (km)</th><th>Condition · PCI</th><th className="!text-right">Projects</th>
                  <th className="!text-right">Budget</th><th className="!text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {filtered.map((r) => {
                  const d = derived.get(r.id)!;
                  const c = conditionOf(r.pci);
                  const cm = conditionMeta[c];
                  const isDPWH = r.jurisdiction === "DPWH";
                  return (
                    <tr key={r.id} className={`group transition-colors hover:bg-ink-900/[0.045] ${isDPWH ? "opacity-55" : ""}`}>
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                        <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{r.id} · {r.geometrySource}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase ${isDPWH ? "bg-steel-500/15 text-steel-500" : "bg-pine-600/15 text-pine-600"}`}>
                          {r.roadClass}{isDPWH ? " · ref" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-text-600">{r.barangays.join(", ")}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-text-600">{r.surface}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-1 font-mono text-[9.5px] font-bold tracking-wider uppercase"
                          style={{ color: TREATMENT_COLOR[d.treatment], background: `${TREATMENT_COLOR[d.treatment]}1a`, boxShadow: `inset 0 0 0 1px ${TREATMENT_COLOR[d.treatment]}55` }}>
                          <i className="h-1.5 w-1.5 rounded-full" style={{ background: TREATMENT_COLOR[d.treatment] }} />
                          {TREATMENT_SHORT[d.treatment]}{d.treatmentYear ? ` · ${d.treatmentYear}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] font-semibold text-ink-900 tabular">{r.lengthKm.toFixed(1)}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="h-[7px] w-14 overflow-hidden rounded-full bg-ink-900/10">
                            <span className="block h-full rounded-full" style={{ width: `${r.pci}%`, background: cm.color }} />
                          </span>
                          <span className="font-mono text-[11px] font-semibold tabular" style={{ color: cm.color }}>{isDPWH ? "—" : r.pci}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-grid h-6 min-w-6 place-items-center rounded-[3px] px-1.5 font-mono text-[11px] font-bold ${d.projects.length ? "bg-pine-600 text-paper-100" : "bg-ink-900/8 text-text-400"}`}>{d.projects.length}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] font-semibold text-ink-900 tabular">{d.budget ? fmtPesoM(d.budget) : "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onLocate(r.geometry[0], 14)}
                            className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-teal-500 hover:text-teal-500" title="Locate on map">
                            <IconPin size={13} />
                          </button>
                          <button onClick={() => setModal({ editing: r })}
                            className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600" title="Edit road">
                            <IconEdit size={13} />
                          </button>
                          <button onClick={() => setDel(r)}
                            className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600" title="Delete road">
                            <IconTrash size={13} />
                          </button>
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
        </div>
      </Reveal>

      {modal && <RoadForm editing={modal.editing} onClose={() => setModal(null)} />}

      {del && (
        <ConfirmDialog
          title="Delete road / street"
          sheet="roads_road · DELETE"
          confirmLabel={delLinked ? "Delete & unlink" : "Delete road"}
          message={
            <div>
              <p><b className="text-ink-900">{del.id}</b> — {del.name} will be removed from the registry.</p>
              {delLinked > 0 && (
                <p className="mt-2 rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-coral-600 uppercase">
                  ⚠ {delLinked} project{delLinked > 1 ? "s" : ""} link to this road — they will drop out of the road inventory.
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
