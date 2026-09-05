import { useState, type ReactNode } from "react";
import {
  PROJECT_TYPES, MODES, FUNDS, TYPE_OBJECT_CODE, PCAB_CATEGORIES,
  ENGINEER_POSITIONS, ENGINEER_UNITS,
  type ProjectType, type ModeOfImplementation, type ProjectRecord,
  type Contractor, type Engineer,
} from "../data/registry";
import { useStore, addRecord, updateRecord, addContractor, updateContractor, addEngineer, updateEngineer, nextRecordId } from "../state/store";
import { toast } from "./toast";
import { IconClose, IconPlus, IconPin, IconCheck } from "./icons";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";
const saveBtnCls =
  "cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40";

export function Modal({ title, sheet, onClose, children, wide }: {
  title: string; sheet: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/60 p-4">
      <div className={`anim-fade-up relative my-6 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">{sheet}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{title}</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────── Contractor encoder / editor (FK target) ─────────────── */

export function ContractorForm({ onClose, editing, onCreated }: {
  onClose: () => void; editing?: Contractor | null; onCreated?: (id: string) => void;
}) {
  const [f, setF] = useState(() => editing
    ? { name: editing.name, pcab: editing.pcab, category: editing.category, address: editing.address, contactPerson: editing.contactPerson, phone: editing.phone, email: editing.email }
    : { name: "", pcab: "A", category: "", address: "", contactPerson: "", phone: "", email: "" });
  const valid = f.name.trim().length > 2;

  const save = () => {
    if (editing) {
      updateContractor(editing.id, f);
      toast(f.name, "updated", `${editing.id} · contractors_contractor`);
      onClose();
    } else {
      onCreated?.(addContractor(f));
    }
  };

  return (
    <Modal title={editing ? "Edit Contractor" : "Encode Contractor"} sheet={`Registry · contractors_contractor${editing ? ` · ${editing.id}` : ""}`} onClose={onClose}>
      {editing && (
        <p className="mb-3 rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-3 py-2 font-mono text-[9.5px] tracking-wider text-amber-600 uppercase">
          Editing live profile {editing.id} — changes apply to every linked project
        </p>
      )}
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
          {editing ? `Primary key ${editing.id} is immutable` : "New CTR-### primary key will be issued"}
        </p>
        <button disabled={!valid} onClick={save} className={saveBtnCls}>
          {editing ? "Save changes" : "Save contractor"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────── Engineer / employee encoder / editor (FK target) ─────────────── */

export function EngineerForm({ onClose, editing, onCreated }: {
  onClose: () => void; editing?: Engineer | null; onCreated?: (id: string) => void;
}) {
  const [f, setF] = useState(() => editing
    ? { name: editing.name, position: editing.position, unit: editing.unit, prc: editing.prc, email: editing.email, phone: editing.phone }
    : { name: "", position: ENGINEER_POSITIONS[3], unit: ENGINEER_UNITS[0], prc: "", email: "", phone: "" });
  const valid = f.name.trim().length > 2;

  const save = () => {
    if (editing) {
      updateEngineer(editing.id, f);
      toast(f.name, "updated", `${editing.id} · employees_employee`);
      onClose();
    } else {
      onCreated?.(addEngineer(f));
    }
  };

  return (
    <Modal title={editing ? "Edit Engineer / Employee" : "Encode Engineer / Employee"} sheet={`Registry · employees_employee${editing ? ` · ${editing.id}` : ""}`} onClose={onClose}>
      {editing && (
        <p className="mb-3 rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-3 py-2 font-mono text-[9.5px] tracking-wider text-amber-600 uppercase">
          Editing live profile {editing.id} — changes apply to every assigned project
        </p>
      )}
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
          {editing ? `Primary key ${editing.id} is immutable` : "New ENG-### primary key will be issued"}
        </p>
        <button disabled={!valid} onClick={save} className={saveBtnCls}>
          {editing ? "Save changes" : "Save employee"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────── Project encoder / editor ─────────────── */

export function ProjectForm({ onClose, editing }: { onClose: () => void; editing?: ProjectRecord | null }) {
  const { records, contractors, engineers, barangays: brgyRegistry } = useStore();
  /* live barangay registry — PSGC code shown on hover, removable entries drop out automatically */
  const BARANGAY_LIST = brgyRegistry.map((b) => b.name);
  const brgyPsgc = (name: string) => brgyRegistry.find((b) => b.name === name)?.psgc ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const plus180 = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
  const [type, setType] = useState<ProjectType>(editing?.type ?? "Concreting");
  const [f, setF] = useState(() => editing ? {
    name: editing.name, mode: editing.mode, fund: editing.fund,
    folderNo: editing.folderNo, implementorId: editing.implementorId, inchargeId: editing.inchargeId,
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

  /* location — barangay-based. Field files (geotagged images / PDFs) are
     uploaded on the saved record; KML / GPX live in Lot & ROW as centerlines. */
  const [barangays, setBarangays] = useState<string[]>(editing?.location.barangays ?? []);
  const [nested, setNested] = useState<null | "ctr" | "eng">(null);

  const toggleBarangay = (b: string) =>
    setBarangays((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const valid = f.name.trim().length > 3 && !!f.implementorId && !!f.inchargeId && barangays.length > 0;

  const submit = () => {
    const base = {
      name: f.name.trim(), type, mode: f.mode, fund: f.fund,
      objectCode: TYPE_OBJECT_CODE[type], folderNo: f.folderNo || "OCE-IF-PENDING",
      implementorId: f.implementorId, inchargeId: f.inchargeId,
      location: { barangays },
      attachments: editing?.attachments ?? [],   // uploads live on the record — never clobbered here
      linearLength: parseFloat(f.linearLength) || 0,
      contractedAmount: parseFloat(f.contractedAmount) || 0,
      actualAmount: parseFloat(f.actualAmount) || 0,
      bidYear: parseInt(f.bidYear, 10) || new Date().getFullYear(),
      contractedStart: f.contractedStart, contractedCompletion: f.contractedCompletion,
      actualStart: f.actualStart || null, actualCompletion: f.actualCompletion || null,
      percent: f.percent, notes: f.notes,
    };
    if (editing) {
      updateRecord(editing.id, base);
      toast(editing.name, "updated", `${editing.id} · ${barangays.length} barangay${barangays.length > 1 ? "s" : ""}`);
    } else {
      const id = nextRecordId(records);
      addRecord({ ...base, id });
      toast(f.name.trim(), "saved", `${id} · ${barangays.length} barangay${barangays.length > 1 ? "s" : ""} covered`);
    }
    onClose();
  };

  const FkSelect = ({ label, value, onChange, options, encode, warn }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { id: string; name: string; sub: string }[]; encode: () => void; warn?: boolean;
  }) => (
    <div>
      <div className="flex items-center justify-between">
        <label className={`${labelCls} ${warn ? "text-coral-600" : ""}`}>{label} (FK) *</label>
        <button onClick={encode} className="mb-1 flex cursor-pointer items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-pine-600 uppercase transition-colors hover:text-pine-500">
          <IconPlus size={9} /> Encode new
        </button>
      </div>
      <select className={`${inputCls} ${warn ? "border-coral-500 ring-1 ring-coral-500/40" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{warn ? "⚠ previous profile deleted — relink" : "— select —"}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.sub}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Modal
        title={editing ? "Edit Road Project" : "Encode Road Project"}
        sheet={`project_records · ${editing ? editing.id : nextRecordId(records)}`}
        onClose={onClose} wide
      >
        {editing && (
          <p className="mb-3 rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-3 py-2 font-mono text-[9.5px] tracking-wider text-amber-600 uppercase">
            Updating live row {editing.id} — the primary key is immutable
          </p>
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
              {FUNDS.map((s) => <option key={s}>{s}</option>)}
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
            encode={() => setNested("ctr")}
            warn={editing !== null && f.implementorId === ""}
          />
          <FkSelect
            label="Project in-charge"
            value={f.inchargeId} onChange={(v) => setF({ ...f, inchargeId: v })}
            options={engineers.map((e) => ({ id: e.id, name: e.name, sub: e.position }))}
            encode={() => setNested("eng")}
            warn={editing !== null && f.inchargeId === ""}
          />
          <div>
            <label className={labelCls}>Linear length (m)</label>
            <input className={inputCls} value={f.linearLength} onChange={(e) => setF({ ...f, linearLength: e.target.value })} inputMode="decimal" />
          </div>

          {/* ── LOCATION · BARANGAY-BASED ── */}
          <div className="col-span-2 rounded-[4px] border-2 border-ink-800 bg-paper-200/70 p-3.5 sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.18em] text-ink-900 uppercase">
                <IconPin size={14} className="text-amber-600" /> Location — barangay coverage *
              </label>
              <span className={`rounded-[3px] px-2 py-0.5 font-mono text-[9.5px] font-bold tracking-wider uppercase ${barangays.length ? "bg-pine-600 text-paper-100" : "bg-coral-500/15 text-coral-600"}`}>
                {barangays.length ? `${barangays.length} selected${barangays.length > 1 ? " · multi-barangay" : ""}` : "select at least one"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-text-400">
              The project is located by barangay — select every barangay it covers. For vast projects spanning several barangays, use multiple selection.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {BARANGAY_LIST.map((b) => {
                const on = barangays.includes(b);
                return (
                  <button
                    key={b} type="button" onClick={() => toggleBarangay(b)}
                    title={brgyPsgc(b) ? `PSGC ${brgyPsgc(b)}` : undefined}
                    className={`cursor-pointer rounded-[3px] border px-2 py-1 font-mono text-[9.5px] font-semibold tracking-wider uppercase transition-all duration-150 ${
                      on
                        ? "border-pine-600 bg-pine-600 text-paper-100 shadow-[0_2px_8px_rgba(23,92,67,0.35)]"
                        : "border-line-400 bg-paper-100 text-text-600 hover:border-pine-500 hover:text-pine-600"
                    }`}
                  >
                    {on && <IconCheck size={9} className="mr-1 inline" />}{b}
                  </button>
                );
              })}
            </div>

            {/* how the project pin is resolved */}
            <div className="mt-3 rounded-[3px] border border-line-400 bg-paper-100 p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-900 uppercase">
                <IconPin size={13} className="text-amber-600" /> How the project pin resolves
              </p>
              <ol className="mt-2 space-y-1 font-mono text-[9.5px] leading-relaxed text-text-600">
                <li><b className="text-pine-600">1 · Geotagged image</b> — upload the photo on the saved record; its EXIF GPS becomes the exact station.</li>
                <li><b className="text-teal-500">2 · Linked centerline</b> — import the project's KML / GPX in <b>Lot &amp; ROW Analysis</b> and link it to this record; the pin moves to the axis.</li>
                <li><b className="text-text-400">3 · Barangay centroid{barangays.length > 1 ? "s (averaged)" : ""}</b> — the fallback when no field capture exists yet.</li>
              </ol>
            </div>
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
          <div>
            <label className={labelCls}>Actual completion</label>
            <input type="date" className={inputCls} value={f.actualCompletion} onChange={(e) => setF({ ...f, actualCompletion: e.target.value })} />
          </div>

          <div className="col-span-2 sm:col-span-3">
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

          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Notes & remarks</label>
            <textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Catch-up plans, suspensions, utility conflicts…" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-300 pt-4">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">
            {f.mode === "By Administration" ? "Force-account mode — implementor defaults to OCE Forces" : "Contract mode — implementor must hold valid PCAB license"}
          </p>
          <button disabled={!valid} onClick={submit} className={saveBtnCls}>
            {editing ? "Update project" : "Register project"}
          </button>
        </div>
      </Modal>

      {nested === "ctr" && <ContractorForm onClose={() => setNested(null)} onCreated={(id) => { setF((p) => ({ ...p, implementorId: id })); setNested(null); }} />}
      {nested === "eng" && <EngineerForm onClose={() => setNested(null)} onCreated={(id) => { setF((p) => ({ ...p, inchargeId: id })); setNested(null); }} />}
    </>
  );
}
