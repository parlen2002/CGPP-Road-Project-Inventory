/* Project encoder — the 21-field record form. Dropdowns resolve from the
   Technical Catalogs; barangay coverage is a searchable multi-select. */

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  PROJECT_TYPES, MODES, FUNDS, TYPE_OBJECT_CODE,
  type ProjectType, type ModeOfImplementation, type ProjectRecord,
} from "../data/registry";
import { TREATMENT_ORDER } from "../data/roads";
import { optionsOf } from "../data/catalogs";
import { useStore, addRecord, updateRecord, nextRecordId } from "../state/store";
import { toast } from "./toast";
import { SearchSelect } from "./SearchSelect";
import { CatalogSelect } from "./CatalogSelect";
import { IconClose } from "./icons";

export const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
export const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";
export const saveBtnCls =
  "cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40";

export function Modal({ title, sheet, onClose, children, wide }: {
  title: string; sheet: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className={`anim-fade-up relative my-6 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">{sheet}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{title}</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ProjectForm({ onClose, editing }: { onClose: () => void; editing?: ProjectRecord | null }) {
  const { records, contractors, personnel, barangays, roadsReg, catalogItems } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const plus180 = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

  const [type, setType] = useState<ProjectType>(editing?.type ?? "Concreting");
  const [treatment, setTreatment] = useState<string>(editing?.treatment ?? "");
  const [roadId, setRoadId] = useState<string>(editing?.roadId ?? "");
  const [barangaySel, setBarangaySel] = useState<string[]>(editing?.location.barangays ?? []);
  const [f, setF] = useState(() => editing ? {
    name: editing.name, mode: editing.mode, fund: editing.fund, folderNo: editing.folderNo,
    implementorId: editing.implementorId, inchargeId: editing.inchargeId,
    linearLength: String(editing.linearLength), contractedAmount: String(editing.contractedAmount),
    actualAmount: String(editing.actualAmount), bidYear: String(editing.bidYear),
    contractedStart: editing.contractedStart, contractedCompletion: editing.contractedCompletion,
    actualStart: editing.actualStart ?? "", actualCompletion: editing.actualCompletion ?? "",
    percent: editing.percent, notes: editing.notes,
  } : {
    name: "", mode: "By Contract" as ModeOfImplementation, fund: FUNDS[0],
    folderNo: `OCE-IF-${new Date().getFullYear()}-`, implementorId: "", inchargeId: "",
    linearLength: "1000", contractedAmount: "0", actualAmount: "0", bidYear: String(new Date().getFullYear()),
    contractedStart: today, contractedCompletion: plus180, actualStart: "", actualCompletion: "",
    percent: 0, notes: "",
  });

  const objectCode = TYPE_OBJECT_CODE[type] ?? "";
  const treatList = (() => { const o = optionsOf(catalogItems, "projectTypes"); void o; return [...TREATMENT_ORDER]; })();

  const valid = f.name.trim().length > 3 && !!f.implementorId && !!f.inchargeId && barangaySel.length > 0;

  const submit = () => {
    const base = {
      name: f.name.trim(), type, mode: f.mode, fund: f.fund, objectCode, folderNo: f.folderNo || "OCE-IF-PENDING",
      implementorId: f.implementorId, inchargeId: f.inchargeId,
      location: { barangays: barangaySel },
      linearLength: parseFloat(f.linearLength) || 0,
      contractedAmount: parseFloat(f.contractedAmount) || 0,
      actualAmount: parseFloat(f.actualAmount) || 0,
      bidYear: parseInt(f.bidYear, 10) || new Date().getFullYear(),
      contractedStart: f.contractedStart, contractedCompletion: f.contractedCompletion,
      actualStart: f.actualStart || null, actualCompletion: f.actualCompletion || null,
      percent: f.percent, notes: f.notes,
      treatment: (treatList.includes(treatment as never) ? treatment : null) as ProjectRecord["treatment"],
      roadId: roadId || undefined,
    };
    if (editing) {
      updateRecord(editing.id, base);
      toast(editing.name, "updated", `${editing.id} · ${barangaySel.length} barangay${barangaySel.length > 1 ? "s" : ""}`);
    } else {
      const id = nextRecordId(records);
      addRecord({ ...base, id, attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] });
      toast(f.name.trim(), "saved", `${id} · ${barangaySel.length} barangay${barangaySel.length > 1 ? "s" : ""} covered`);
    }
    onClose();
  };

  const brgyOptions = barangays.map((b) => ({ value: b.name, label: b.name, sub: b.psgc }));
  const roadOptions = roadsReg.filter((r) => r.jurisdiction === "OCE").map((r) => ({ value: r.id, label: r.name, sub: r.barangays[0] }));
  const implOptions = contractors.map((c) => ({ value: c.id, label: c.name, sub: c.pcab }));
  const personOptions = personnel.map((p) => ({ value: p.id, label: p.name, sub: p.position }));

  const Field = ({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) => (
    <div className={span ? "col-span-2 sm:col-span-3" : ""}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );

  return (
    <Modal title={editing ? "Edit Road Project" : "Encode Road Project"} sheet={`project_records · ${editing ? editing.id : nextRecordId(records)}`} onClose={onClose} wide>
      {editing && (
        <p className="mb-3 rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-3 py-2 font-mono text-[9.5px] tracking-wider text-amber-600 uppercase">
          Updating live row {editing.id} — the primary key is immutable
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Name of road project *" span>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Malvar Road Concreting (Seg. 2)" />
        </Field>

        <Field label="Project type">
          <CatalogSelect group="projectTypes" fallback={[...PROJECT_TYPES]} value={type} onChange={(v) => setType(v as ProjectType)} />
        </Field>
        <Field label="Mode of implementation">
          <CatalogSelect group="modes" fallback={[...MODES]} value={f.mode} onChange={(v) => setF({ ...f, mode: v as ModeOfImplementation })} />
        </Field>
        <Field label="Source of fund">
          <CatalogSelect group="funds" fallback={[...FUNDS]} value={f.fund} onChange={(v) => setF({ ...f, fund: v })} />
        </Field>

        <Field label="Object account code (auto)">
          <input className={inputCls} value={objectCode} readOnly tabIndex={-1} style={{ opacity: 0.7 }} />
        </Field>
        <Field label="File folder no.">
          <input className={inputCls} value={f.folderNo} onChange={(e) => setF({ ...f, folderNo: e.target.value })} />
        </Field>
        <Field label="Year of project bid">
          <input className={inputCls} value={f.bidYear} onChange={(e) => setF({ ...f, bidYear: e.target.value })} inputMode="numeric" />
        </Field>

        <Field label="Road / street (link to registry)" span>
          <SearchSelect value={roadId} onChange={(v) => setRoadId(v as string)} options={roadOptions} placeholder="Search the road & street registry…" />
        </Field>

        <Field label="Road treatment">
          <select className={inputCls} value={treatment} onChange={(e) => setTreatment(e.target.value)}>
            <option value="">— none · non-pavement —</option>
            {treatList.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Project implementor (FK) *">
          <SearchSelect value={f.implementorId} onChange={(v) => setF({ ...f, implementorId: v as string })} options={implOptions} placeholder="— select contractor —" invalid={editing !== null && !f.implementorId} />
        </Field>
        <Field label="Project in-charge (FK) *">
          <SearchSelect value={f.inchargeId} onChange={(v) => setF({ ...f, inchargeId: v as string })} options={personOptions} placeholder="— select personnel —" invalid={editing !== null && !f.inchargeId} />
        </Field>

        <Field label="Location — barangay coverage *" span>
          <SearchSelect value={barangaySel} onChange={(v) => setBarangaySel(v as string[])} options={brgyOptions} multiple placeholder="Select one or more barangays…" invalid={barangaySel.length === 0} />
          <p className="mt-1 font-mono text-[9px] leading-relaxed text-text-400">
            The project is located by barangay — select every barangay it covers. For vast projects, use multiple selection.
          </p>
        </Field>

        <Field label="Linear length (m)">
          <input className={inputCls} value={f.linearLength} onChange={(e) => setF({ ...f, linearLength: e.target.value })} inputMode="decimal" />
        </Field>
        <Field label="Contracted amount (₱)">
          <input className={inputCls} value={f.contractedAmount} onChange={(e) => setF({ ...f, contractedAmount: e.target.value })} inputMode="numeric" />
        </Field>
        <Field label="Actual amount (₱)">
          <input className={inputCls} value={f.actualAmount} onChange={(e) => setF({ ...f, actualAmount: e.target.value })} inputMode="numeric" />
        </Field>

        <Field label="Contracted start">
          <input type="date" className={inputCls} value={f.contractedStart} onChange={(e) => setF({ ...f, contractedStart: e.target.value })} />
        </Field>
        <Field label="Contracted completion">
          <input type="date" className={inputCls} value={f.contractedCompletion} onChange={(e) => setF({ ...f, contractedCompletion: e.target.value })} />
        </Field>
        <Field label="Actual start">
          <input type="date" className={inputCls} value={f.actualStart} onChange={(e) => setF({ ...f, actualStart: e.target.value })} />
        </Field>
        <Field label="Actual completion">
          <input type="date" className={inputCls} value={f.actualCompletion} onChange={(e) => setF({ ...f, actualCompletion: e.target.value })} />
        </Field>

        {editing ? (
          <div className="col-span-2 sm:col-span-3">
            <div className="flex items-baseline justify-between">
              <label className={labelCls}>Project status — % of completion</label>
              <span className="font-display text-2xl leading-none font-bold text-ink-900">{f.percent}%</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={f.percent}
              onChange={(e) => setF({ ...f, percent: parseInt(e.target.value, 10) })}
              className="rpis-slider"
              style={{ "--track": `linear-gradient(90deg, #f0a32b ${f.percent}%, #cbd4c2 ${f.percent}%)` } as React.CSSProperties} />
          </div>
        ) : (
          <div className="col-span-2 rounded-[3px] border border-dashed border-line-400 bg-paper-200/50 px-3 py-2.5 sm:col-span-3">
            <p className="font-mono text-[9.5px] leading-relaxed text-text-400 uppercase">
              Status starts at <b className="text-ink-900">0% · Not Started</b> — the completion slider is available when updating the saved record
            </p>
          </div>
        )}

        <Field label="Notes & remarks" span>
          <textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Catch-up plans, suspensions, utility conflicts…" />
        </Field>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-300 pt-4">
        <p className="font-mono text-[9.5px] text-text-400 uppercase">
          {f.mode === "By Administration" ? "Force-account mode — implementor is OCE Forces" : "Contract mode — implementor must hold valid PCAB license"}
        </p>
        <button disabled={!valid} onClick={submit} className={saveBtnCls}>
          {editing ? "Update project" : "Register project"}
        </button>
      </div>
    </Modal>
  );
}
