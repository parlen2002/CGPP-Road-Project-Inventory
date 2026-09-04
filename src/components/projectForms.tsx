import { useState, type ReactNode } from "react";
import {
  PROJECT_TYPES, MODES, FUNDS, TYPE_OBJECT_CODE, PCAB_CATEGORIES,
  ENGINEER_POSITIONS, ENGINEER_UNITS, LOC_SOURCES,
  type ProjectType, type ModeOfImplementation, type LocationSource,
  type ProjectRecord, type Contractor, type Engineer,
} from "../data/registry";
import {
  useStore, addRecord, addContractor, addEngineer,
  updateRecord, updateContractor, updateEngineer, nextRecordId,
} from "../state/store";
import { toast } from "./toast";
import { IconClose, IconPlus, IconSave, IconEdit } from "./icons";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";
const btnCls =
  "cursor-pointer rounded-[3px] bg-ink-900 px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40";

export function Modal({ title, sheet, onClose, children, wide, tone = "pine" }: {
  title: string; sheet: string; onClose: () => void; children: ReactNode; wide?: boolean; tone?: "pine" | "amber";
}) {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/60 p-4">
      <div className={`anim-fade-up relative my-6 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border ${tone === "amber" ? "border-amber-500 text-amber-400" : "border-pine-400 text-pine-400"}`}>
              {tone === "amber" ? <IconEdit size={15} /> : <IconPlus size={15} />}
            </span>
            <div>
              <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">{sheet}</p>
              <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────── Contractor encoder / editor (FK target) ─────────────── */

export function ContractorForm({ onClose, onCreated, editing }: {
  onClose: () => void; onCreated?: (id: string) => void; editing?: Contractor | null;
}) {
  const [f, setF] = useState(() =>
    editing
      ? { name: editing.name, pcab: editing.pcab, category: editing.category, address: editing.address, contactPerson: editing.contactPerson, phone: editing.phone, email: editing.email }
      : { name: "", pcab: "A", category: "", address: "", contactPerson: "", phone: "", email: "" }
  );
  const valid = f.name.trim().length > 2;
  const save = () => {
    if (editing) {
      updateContractor(editing.id, f);
      toast(`${editing.id} — ${f.name}`, "updated", "contractor profile updated");
    } else {
      const id = addContractor(f);
      toast(`${id} — ${f.name}`, "saved", "contractor profile registered");
      onCreated?.(id);
    }
    onClose();
  };
  return (
    <Modal title={editing ? "Edit Contractor" : "Encode Contractor"} sheet={`Registry · contractors_contractor · ${editing ? editing.id : "new row"}`} onClose={onClose} tone={editing ? "amber" : "pine"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Contractor / firm name *</label>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Bayanihan Civil Works Corp." />
        </div>
        <div>
          <label className={labelCls}>PCAB license category</label>
          <select className={inputCls} value={f.pcab} onChange={(e) => setF({ ...f, pcab: e.target.value })}>
            {PCAB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Trade / category</label>
          <input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Infrastructure / Roads" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Office address</label>
          <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Brgy., Puerto Princesa City" />
        </div>
        <div>
          <label className={labelCls}>Contact person</label>
          <input className={inputCls} value={f.contactPerson} onChange={(e) => setF({ ...f, contactPerson: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(048) …" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-mono text-[9.5px] text-text-400 uppercase">
          {editing ? `Updating row ${editing.id} — links in the ledger follow the profile` : "New CTR-### primary key will be issued"}
        </p>
        <button disabled={!valid} onClick={save} className={btnCls}>
          <span className="flex items-center gap-2">{editing ? <IconSave size={13} /> : null}{editing ? "Update contractor" : "Save contractor"}</span>
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────── Engineer / employee encoder / editor (FK target) ─────────────── */

export function EngineerForm({ onClose, onCreated, editing }: {
  onClose: () => void; onCreated?: (id: string) => void; editing?: Engineer | null;
}) {
  const [f, setF] = useState(() =>
    editing
      ? { name: editing.name, position: editing.position, unit: editing.unit, prc: editing.prc, email: editing.email, phone: editing.phone }
      : { name: "", position: ENGINEER_POSITIONS[3], unit: ENGINEER_UNITS[0], prc: "", email: "", phone: "" }
  );
  const valid = f.name.trim().length > 2;
  const save = () => {
    if (editing) {
      updateEngineer(editing.id, f);
      toast(`${editing.id} — ${f.name}`, "updated", "employee profile updated");
    } else {
      const id = addEngineer(f);
      toast(`${id} — ${f.name}`, "saved", "employee profile registered");
      onCreated?.(id);
    }
    onClose();
  };
  return (
    <Modal title={editing ? "Edit Engineer / Employee" : "Encode Engineer / Employee"} sheet={`Registry · employees_employee · ${editing ? editing.id : "new row"}`} onClose={onClose} tone={editing ? "amber" : "pine"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Full name *</label>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Engr. …" />
        </div>
        <div>
          <label className={labelCls}>Position / designation</label>
          <select className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>
            {ENGINEER_POSITIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Unit / division</label>
          <select className={inputCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            {ENGINEER_UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>PRC license no.</label>
          <input className={inputCls} value={f.prc} onChange={(e) => setF({ ...f, prc: e.target.value })} placeholder="7 digits" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="…@oce.puertoprincesa.gov.ph" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-mono text-[9.5px] text-text-400 uppercase">
          {editing ? `Updating row ${editing.id} — assignments in the ledger follow the profile` : "New ENG-### primary key will be issued"}
        </p>
        <button disabled={!valid} onClick={save} className={btnCls}>
          <span className="flex items-center gap-2">{editing ? <IconSave size={13} /> : null}{editing ? "Update employee" : "Save employee"}</span>
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────── Project encoder / editor ─────────────── */

export function ProjectForm({ onClose, editing }: { onClose: () => void; editing?: ProjectRecord | null }) {
  const { records, contractors, engineers } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const plus180 = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
  const [type, setType] = useState<ProjectType>(editing?.type ?? "Concreting");
  const [f, setF] = useState(() =>
    editing
      ? {
          name: editing.name, mode: editing.mode as ModeOfImplementation, fund: editing.fund,
          folderNo: editing.folderNo, implementorId: editing.implementorId, inchargeId: editing.inchargeId,
          lat: String(editing.location.lat), lng: String(editing.location.lng), source: editing.location.source as LocationSource, ref: editing.location.ref,
          linearLength: String(editing.linearLength), contractedAmount: String(editing.contractedAmount), actualAmount: String(editing.actualAmount),
          bidYear: String(editing.bidYear), contractedStart: editing.contractedStart, contractedCompletion: editing.contractedCompletion,
          actualStart: editing.actualStart ?? "", actualCompletion: editing.actualCompletion ?? "",
          percent: editing.percent, notes: editing.notes,
        }
      : {
          name: "", mode: "By Contract" as ModeOfImplementation, fund: FUNDS[0],
          folderNo: `OCE-IF-${new Date().getFullYear()}-`, implementorId: "", inchargeId: "",
          lat: "9.73890", lng: "118.73900", source: "KML" as LocationSource, ref: "",
          linearLength: "1000", contractedAmount: "0", actualAmount: "0", bidYear: String(new Date().getFullYear()),
          contractedStart: today, contractedCompletion: plus180, actualStart: "", actualCompletion: "",
          percent: 0, notes: "",
        }
  );
  const [nested, setNested] = useState<null | "ctr" | "eng">(null);
  const valid = f.name.trim().length > 3 && f.implementorId && f.inchargeId;
  const fundOptions = FUNDS.includes(f.fund) ? FUNDS : [f.fund, ...FUNDS];
  const unlinkWarn = editing && (!editing.implementorId || !editing.inchargeId);

  const submit = () => {
    const data = {
      name: f.name.trim(), type, mode: f.mode, fund: f.fund,
      objectCode: TYPE_OBJECT_CODE[type], folderNo: f.folderNo || "OCE-IF-PENDING",
      implementorId: f.implementorId, inchargeId: f.inchargeId,
      location: { lat: parseFloat(f.lat) || 9.7389, lng: parseFloat(f.lng) || 118.739, source: f.source, ref: f.ref || "pending_field_capture" },
      linearLength: parseFloat(f.linearLength) || 0,
      contractedAmount: parseFloat(f.contractedAmount) || 0,
      actualAmount: parseFloat(f.actualAmount) || 0,
      bidYear: parseInt(f.bidYear, 10) || new Date().getFullYear(),
      contractedStart: f.contractedStart, contractedCompletion: f.contractedCompletion,
      actualStart: f.actualStart || null, actualCompletion: f.actualCompletion || null,
      percent: f.percent, notes: f.notes,
    };
    if (editing) {
      updateRecord(editing.id, data);
      toast(`${editing.id} — ${data.name}`, "updated", "project record updated · all fields re-encoded");
    } else {
      const rec: ProjectRecord = { id: nextRecordId(records), ...data };
      addRecord(rec);
      toast(`${rec.id} — ${rec.name}`, "saved", "project record registered to ledger");
    }
    onClose();
  };

  const FkSelect = ({ label, value, onChange, options, encode, warn }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { id: string; name: string; sub: string }[]; encode: () => void; warn?: boolean;
  }) => (
    <div>
      <div className="flex items-center justify-between">
        <label className={`${labelCls} ${warn && !value ? "text-coral-600" : ""}`}>
          {label} (FK) * {warn && !value && <span className="normal-case">· relink required</span>}
        </label>
        <button onClick={encode} className="mb-1 flex cursor-pointer items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-pine-600 uppercase transition-colors hover:text-pine-500">
          <IconPlus size={9} /> Encode new
        </button>
      </div>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— unlinked · select —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.sub}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Modal
        title={editing ? "Edit Road Project" : "Encode Road Project"}
        sheet={`project_records · ${editing ? `${editing.id} · UPDATE` : nextRecordId(records)}`}
        onClose={onClose} wide tone={editing ? "amber" : "pine"}
      >
        {editing && (
          <div className="mb-4 flex items-center gap-2 rounded-[3px] border border-amber-500/60 bg-amber-500/10 px-3 py-2 font-mono text-[10px] tracking-wider text-amber-600 uppercase">
            <IconEdit size={12} /> Editing live row {editing.id} — saving overwrites the record and persists to localStorage
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Name of road project *</label>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Malvar Road Concreting (Seg. 2)" />
          </div>

          <div>
            <label className={labelCls}>Project type</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
              {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mode of implementation</label>
            <select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as ModeOfImplementation })}>
              {MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Source of fund</label>
            <select className={inputCls} value={f.fund} onChange={(e) => setF({ ...f, fund: e.target.value })}>
              {fundOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Object account code</label>
            <input className={inputCls} value={TYPE_OBJECT_CODE[type]} readOnly tabIndex={-1} title="Auto-set by project type (UACS)" style={{ opacity: 0.7 }} />
          </div>
          <div>
            <label className={labelCls}>File folder no.</label>
            <input className={inputCls} value={f.folderNo} onChange={(e) => setF({ ...f, folderNo: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Year of project bid</label>
            <input className={inputCls} value={f.bidYear} onChange={(e) => setF({ ...f, bidYear: e.target.value })} inputMode="numeric" />
          </div>

          <FkSelect
            label="Project implementor"
            value={f.implementorId} onChange={(v) => setF({ ...f, implementorId: v })}
            options={contractors.map((c) => ({ id: c.id, name: c.name, sub: c.pcab === "—" ? "Force Acct" : c.pcab }))}
            encode={() => setNested("ctr")} warn={!!unlinkWarn}
          />
          <FkSelect
            label="Project in-charge"
            value={f.inchargeId} onChange={(v) => setF({ ...f, inchargeId: v })}
            options={engineers.map((e) => ({ id: e.id, name: e.name, sub: e.position }))}
            encode={() => setNested("eng")} warn={!!unlinkWarn}
          />
          <div>
            <label className={labelCls}>Linear length (m)</label>
            <input className={inputCls} value={f.linearLength} onChange={(e) => setF({ ...f, linearLength: e.target.value })} inputMode="decimal" />
          </div>

          <div>
            <label className={labelCls}>Contracted amount (₱)</label>
            <input className={inputCls} value={f.contractedAmount} onChange={(e) => setF({ ...f, contractedAmount: e.target.value })} inputMode="numeric" />
          </div>
          <div>
            <label className={labelCls}>Actual amount (₱)</label>
            <input className={inputCls} value={f.actualAmount} onChange={(e) => setF({ ...f, actualAmount: e.target.value })} inputMode="numeric" />
          </div>
          <div>
            <label className={labelCls}>Location source</label>
            <select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as LocationSource })}>
              {LOC_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Latitude (WGS 84)</label>
            <input className={inputCls} value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Longitude (WGS 84)</label>
            <input className={inputCls} value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Source file ref</label>
            <input className={inputCls} value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="e.g. seg2_track.gpx" />
          </div>

          <div>
            <label className={labelCls}>Contracted start</label>
            <input type="date" className={inputCls} value={f.contractedStart} onChange={(e) => setF({ ...f, contractedStart: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Contracted completion</label>
            <input type="date" className={inputCls} value={f.contractedCompletion} onChange={(e) => setF({ ...f, contractedCompletion: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Actual start</label>
            <input type="date" className={inputCls} value={f.actualStart} onChange={(e) => setF({ ...f, actualStart: e.target.value })} />
          </div>

          <div className="col-span-2">
            <div className="flex items-baseline justify-between">
              <label className={labelCls}>Project status — % of completion</label>
              <span className="font-display text-2xl leading-none font-bold text-ink-900">{f.percent}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={1} value={f.percent}
              onChange={(e) => setF({ ...f, percent: parseInt(e.target.value, 10) })}
              className="rpis-slider"
              style={{ "--track": `linear-gradient(90deg, #f0a32b ${f.percent}%, #cbd4c2 ${f.percent}%)` } as React.CSSProperties}
            />
          </div>
          <div>
            <label className={labelCls}>Actual completion</label>
            <input type="date" className={inputCls} value={f.actualCompletion} onChange={(e) => setF({ ...f, actualCompletion: e.target.value })} />
          </div>

          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Notes & remarks</label>
            <textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Catch-up plans, suspensions, utility conflicts…" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-300 pt-4">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">
            {editing
              ? "All 21 fields re-encoded · primary key immutable"
              : f.mode === "By Administration" ? "Force-account mode — implementor defaults to OCE Forces" : "Contract mode — implementor must hold valid PCAB license"}
          </p>
          <button disabled={!valid} onClick={submit} className={btnCls}>
            <span className="flex items-center gap-2">
              {editing ? <IconSave size={13} /> : null}
              {editing ? "Update & save record" : "Register project"}
            </span>
          </button>
        </div>
      </Modal>

      {nested === "ctr" && <ContractorForm onClose={() => setNested(null)} onCreated={(id) => { setF((p) => ({ ...p, implementorId: id })); setNested(null); }} />}
      {nested === "eng" && <EngineerForm onClose={() => setNested(null)} onCreated={(id) => { setF((p) => ({ ...p, inchargeId: id })); setNested(null); }} />}
    </>
  );
}
