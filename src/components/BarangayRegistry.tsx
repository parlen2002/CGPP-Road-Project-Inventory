/* ─────────────────────────────────────────────────────────────
   BARANGAY REGISTRY — the administrative basis of every project
   location. Each barangay carries its Ten-Digit PSGC Code, name
   and Data Source, and is fully editable / removable. Renames and
   removals propagate to the project records that reference it.
   ────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { DATA_SOURCES, type Barangay } from "../data/barangays";
import { useStore, addBarangay, updateBarangay, renameBarangay, deleteBarangay, nextBarangayId } from "../state/store";
import { toast } from "./toast";
import ConfirmDialog from "./confirm";
import { IconPlus, IconEdit, IconTrash, IconSearch, IconPin } from "./icons";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";
const saveBtnCls =
  "cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40";

export default function BarangayRegistry({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { barangays, records, admin } = useStore();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { editing: Barangay | null }>(null);
  const [del, setDel] = useState<Barangay | null>(null);

  const linkedCount = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach((r) => r.location.barangays.forEach((b) => m.set(b, (m.get(b) ?? 0) + 1)));
    return m;
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return barangays.filter((b) => !q || b.name.toLowerCase().includes(q) || b.psgc.includes(q) || b.dataSource.toLowerCase().includes(q));
  }, [barangays, search]);

  const linked = del ? linkedCount.get(del.name) ?? 0 : 0;

  return (
    <div className="anim-fade-in rounded-[4px] border-2 border-ink-800 bg-paper-100">
      {/* toolbar */}
      <div className="relative flex flex-wrap items-center gap-2 border-b-2 border-ink-800 bg-paper-200 p-3">
        <div className="relative min-w-[200px] flex-1">
          <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, PSGC code, or data source…"
            className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
          />
        </div>
        <p className="font-mono text-[9.5px] tracking-[0.14em] text-text-400 uppercase">
          {filtered.length} / {barangays.length} barangays
        </p>
        <button
          onClick={() => setModal({ editing: null })}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800"
        >
          <IconPlus size={13} /> Encode barangay
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead className="bg-ink-900 text-paper-300">
            <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-mono [&>th]:text-[9.5px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
              <th className="text-left">Key</th>
              <th className="text-left">Ten-Digit PSGC Code</th>
              <th className="text-left">Barangay Name</th>
              <th className="text-left">Data Source</th>
              <th className="text-left">Centroid</th>
              <th className="text-right">Linked projects</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-300">
            {filtered.map((b) => {
              const n = linkedCount.get(b.name) ?? 0;
              return (
                <tr key={b.id} className="group transition-colors hover:bg-ink-900/[0.045]">
                  <td className="px-3 py-2.5 font-mono text-[10px] font-bold tracking-wide text-teal-500">{b.id}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] font-semibold tracking-wider text-ink-900 tabular">{b.psgc}</td>
                  <td className="px-3 py-2.5 text-[12.5px] font-semibold text-ink-900 group-hover:text-pine-700">{b.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-[3px] border border-ink-800/25 bg-ink-900/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-wider uppercase text-text-600">{b.dataSource}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onLocate([b.lat, b.lng], 14)}
                      className="flex cursor-pointer items-center gap-1 font-mono text-[10px] text-teal-500 transition-colors hover:text-amber-600"
                      title="Locate centroid on map"
                    >
                      <IconPin size={11} /> {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`inline-grid h-6 min-w-6 place-items-center rounded-[3px] px-1.5 font-mono text-[11px] font-bold ${n ? "bg-pine-600 text-paper-100" : "bg-ink-900/8 text-text-400"}`}>{n}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setModal({ editing: b })}
                        className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600"
                        title="Edit barangay"
                      ><IconEdit size={13} /></button>
                      <button
                        onClick={() => setDel(b)}
                        className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600"
                        title="Remove barangay"
                      ><IconTrash size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center font-mono text-[12px] text-text-400">— no barangays match the filter —</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-line-300 bg-paper-200 px-4 py-2 font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">
        {admin ? "admin mode · removals enabled" : "read-only view · toggle ADMIN (top bar) to remove"} · renaming propagates to project records
      </p>

      {/* encode / edit modal */}
      {modal && (
        <BarangayForm
          editing={modal.editing}
          previewId={modal.editing?.id ?? nextBarangayId()}
          onClose={() => setModal(null)}
        />
      )}

      {/* guarded delete */}
      {del && (
        <ConfirmDialog
          title="Remove barangay"
          sheet="brgy_registry · DELETE"
          confirmLabel={linked ? "Remove & unlink" : "Remove barangay"}
          message={
            <div>
              <p><b className="text-ink-900">{del.psgc}</b> — {del.name} will be removed from the registry.</p>
              {linked > 0 && (
                <p className="mt-2 rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-coral-600 uppercase">
                  ⚠ {linked} project{linked > 1 ? "s" : ""} reference this barangay — it will be removed from their coverage.
                </p>
              )}
            </div>
          }
          onConfirm={() => {
            const n = deleteBarangay(del.id);
            toast(del.name, "deleted", n ? `removed · unlinked from ${n} project${n > 1 ? "s" : ""}` : "removed from registry");
          }}
          onClose={() => setDel(null)}
        />
      )}
    </div>
  );
}

/* ---------- encode / edit form ---------- */

function BarangayForm({ editing, previewId, onClose }: {
  editing: Barangay | null;
  previewId: string;
  onClose: () => void;
}) {
  const [f, setF] = useState(() => editing
    ? { psgc: editing.psgc, name: editing.name, dataSource: editing.dataSource, lat: String(editing.lat), lng: String(editing.lng) }
    : { psgc: "1769010000", name: "", dataSource: DATA_SOURCES[0], lat: "9.7400", lng: "118.7400" });

  const validPsgc = /^\d{10}$/.test(f.psgc.trim());
  const valid = validPsgc && f.name.trim().length > 1;

  const save = () => {
    const lat = parseFloat(f.lat) || 9.74, lng = parseFloat(f.lng) || 118.74;
    if (editing) {
      const renamed = editing.name !== f.name.trim();
      if (renamed) renameBarangay(editing.id, editing.name, f.name.trim());
      updateBarangay(editing.id, { psgc: f.psgc.trim(), dataSource: f.dataSource, lat, lng });
      toast(f.name.trim(), "updated", `${editing.id} · PSGC ${f.psgc.trim()}${renamed ? " · renamed" : ""}`);
    } else {
      const id = addBarangay({ psgc: f.psgc.trim(), name: f.name.trim(), dataSource: f.dataSource, lat, lng });
      toast(f.name.trim(), "saved", `${id} · PSGC ${f.psgc.trim()}`);
    }
    onClose();
  };

  return (
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-lg rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">brgy_registry · {editing ? editing.id : previewId}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">
              {editing ? "Edit Barangay" : "Encode Barangay"}
            </h3>
          </div>
          <span className="font-mono text-[9px] tracking-[0.16em] text-paper-300/40 uppercase">PSGC 10-digit</span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          <div>
            <label className={labelCls}>Ten-Digit Code *</label>
            <input className={`${inputCls} ${!validPsgc && f.psgc ? "border-coral-500 ring-1 ring-coral-500/40" : ""}`} value={f.psgc} onChange={(e) => setF({ ...f, psgc: e.target.value })} inputMode="numeric" maxLength={10} placeholder="1769010001" />
            {!validPsgc && <p className="mt-1 font-mono text-[8.5px] text-coral-600 uppercase">must be exactly 10 digits</p>}
          </div>
          <div>
            <label className={labelCls}>Data Source</label>
            <select className={inputCls} value={f.dataSource} onChange={(e) => setF({ ...f, dataSource: e.target.value })}>
              {DATA_SOURCES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Barangay Name *</label>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. San Pedro (Poblacion)" />
            {editing && editing.name !== f.name.trim() && (
              <p className="mt-1 font-mono text-[8.5px] tracking-wider text-teal-500 uppercase">rename will propagate to linked project records</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Centroid Latitude</label>
            <input className={inputCls} value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} inputMode="decimal" placeholder="9.7400" />
          </div>
          <div>
            <label className={labelCls}>Centroid Longitude</label>
            <input className={inputCls} value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} inputMode="decimal" placeholder="118.7400" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">
            {editing ? "primary key is immutable" : `new key ${previewId} will be issued`}
          </p>
          <button disabled={!valid} onClick={save} className={saveBtnCls}>
            {editing ? "Save changes" : "Encode barangay"}
          </button>
        </div>
      </div>
    </div>
  );
}
