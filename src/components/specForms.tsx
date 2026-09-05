/* ─────────────────────────────────────────────────────────────
   DETAIL ENCODERS — each opens in its own window, linked to a
   project record:
     · SpecForm  — technical (as-designed) / revision / actual specs
     · SOForm    — suspension order
     · VOForm    — variation order
   ────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  emptySpecs, VARIANT_META, PAVEMENTS, SHOULDER_TYPES, FINISHES, RAMPS,
  DRAINAGE_TYPES, SLOPE_TYPES, SPEC_ROWS, filledCount,
  type TechSpecs, type RevisionMeta, type ActualMeta,
  type SuspensionOrder, type VariationOrder, type SpecVariant,
} from "../data/specs";
import type { ProjectRecord } from "../data/registry";
import { useStore, setSpecVariant, addOrder, updateOrder, specOf } from "../state/store";
import { toast } from "./toast";
import { IconClose, IconSave } from "./icons";

const inputCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
const labelCls = "mb-1 block font-mono text-[9px] font-semibold tracking-[0.16em] text-text-600 uppercase";
const saveBtnCls =
  "flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800";

const SECTION_META = [
  { key: "road", code: "RD", name: "Road" },
  { key: "shoulder", code: "SHLD", name: "Road Shoulder" },
  { key: "sidewalk", code: "SWLK", name: "Sidewalk" },
  { key: "drainage", code: "DRNG", name: "Drainage System" },
  { key: "slope", code: "SLP", name: "Slope Protection" },
] as const;

function SpecField({ label, value, onChange, select, unit }: {
  label: string; value: string; onChange: (v: string) => void; select?: string[]; unit?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}{unit ? ` (${unit})` : ""}</label>
      {select ? (
        <select className={`${inputCls} cursor-pointer`} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {select.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" />
      )}
    </div>
  );
}

/* ---------- Technical / Revision / Actual specs encoder ---------- */

export function SpecForm({ record, variant, onClose }: {
  record: ProjectRecord;
  variant: SpecVariant;
  onClose: () => void;
}) {
  const existing = specOf(record, variant);
  const [specs, setSpecs] = useState<TechSpecs>(() => existing ?? emptySpecs());
  const [revMeta, setRevMeta] = useState<RevisionMeta>(() =>
    variant === "revision" && record.revision ? record.revision.meta : { revisionNo: "REV-1", date: new Date().toISOString().slice(0, 10), reason: "" });
  const [actMeta, setActMeta] = useState<ActualMeta>(() =>
    variant === "actual" && record.actual ? record.actual.meta : { date: new Date().toISOString().slice(0, 10), certifiedBy: "" });

  const vm = VARIANT_META[variant];
  const setSec = (key: keyof TechSpecs, field: string, v: string) =>
    setSpecs((s) => ({ ...s, [key]: { ...s[key], [field]: v } }));

  const copyFromTech = () => {
    if (record.technical) {
      setSpecs(JSON.parse(JSON.stringify(record.technical)));
      toast("Copied as-designed values", "info", "adjust the fields that changed");
    }
  };

  const save = () => {
    if (variant === "technical") setSpecVariant(record.id, "technical", specs);
    else if (variant === "revision") setSpecVariant(record.id, "revision", { specs, meta: revMeta });
    else setSpecVariant(record.id, "actual", { specs, meta: actMeta });
    toast(record.name, existing ? "updated" : "saved", `${vm.tag} · ${filledCount(specs)} fields encoded`);
    onClose();
  };

  const SectionBlock = ({ secKey, code, name }: { secKey: typeof SECTION_META[number]["key"]; code: string; name: string }) => {
    const key = secKey;
    return (
      <div className="rounded-[4px] border border-line-300 bg-paper-200/60 p-3.5">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-900 uppercase">
          <span className="rounded-[3px] bg-ink-900 px-1.5 py-0.5 text-amber-400">{code}</span> {name}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {key === "road" && (<>
            <SpecField label="Road width" unit="m" value={specs.road.widthM} onChange={(v) => setSec("road", "widthM", v)} />
            <SpecField label="Lanes" unit="no." value={specs.road.lanes} onChange={(v) => setSec("road", "lanes", v)} />
            <SpecField label="Pavement type" value={specs.road.pavement} onChange={(v) => setSec("road", "pavement", v)} select={PAVEMENTS} />
            <SpecField label="Pavement thk" unit="cm" value={specs.road.pavementCm} onChange={(v) => setSec("road", "pavementCm", v)} />
            <SpecField label="Sub-base thk" unit="cm" value={specs.road.subbaseCm} onChange={(v) => setSec("road", "subbaseCm", v)} />
          </>)}
          {key === "shoulder" && (<>
            <SpecField label="Shoulder width" unit="m" value={specs.shoulder.widthM} onChange={(v) => setSec("shoulder", "widthM", v)} />
            <SpecField label="Shoulder type" value={specs.shoulder.type} onChange={(v) => setSec("shoulder", "type", v)} select={SHOULDER_TYPES} />
            <SpecField label="Thickness" unit="cm" value={specs.shoulder.thicknessCm} onChange={(v) => setSec("shoulder", "thicknessCm", v)} />
          </>)}
          {key === "sidewalk" && (<>
            <SpecField label="Sidewalk width" unit="m" value={specs.sidewalk.widthM} onChange={(v) => setSec("sidewalk", "widthM", v)} />
            <SpecField label="Thickness" unit="cm" value={specs.sidewalk.thicknessCm} onChange={(v) => setSec("sidewalk", "thicknessCm", v)} />
            <SpecField label="Surface finish" value={specs.sidewalk.finish} onChange={(v) => setSec("sidewalk", "finish", v)} select={FINISHES} />
            <SpecField label="Accessibility ramps" value={specs.sidewalk.ramps} onChange={(v) => setSec("sidewalk", "ramps", v)} select={RAMPS} />
          </>)}
          {key === "drainage" && (<>
            <SpecField label="Drainage type" value={specs.drainage.type} onChange={(v) => setSec("drainage", "type", v)} select={DRAINAGE_TYPES} />
            <SpecField label="Inside size" unit="m" value={specs.drainage.sizeM} onChange={(v) => setSec("drainage", "sizeM", v)} />
            <SpecField label="Length" unit="m" value={specs.drainage.lengthM} onChange={(v) => setSec("drainage", "lengthM", v)} />
          </>)}
          {key === "slope" && (<>
            <SpecField label="Protection type" value={specs.slope.type} onChange={(v) => setSec("slope", "type", v)} select={SLOPE_TYPES} />
            <SpecField label="Wall height" unit="m" value={specs.slope.heightM} onChange={(v) => setSec("slope", "heightM", v)} />
            <SpecField label="Protected length" unit="m" value={specs.slope.lengthM} onChange={(v) => setSec("slope", "lengthM", v)} />
          </>)}
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-3xl rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] uppercase" style={{ color: vm.color }}>{record.id} · {vm.tag}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{vm.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {variant !== "technical" && record.technical && (
              <button onClick={copyFromTech} className="cursor-pointer rounded-[3px] border border-amber-500/60 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-wider text-amber-400 uppercase transition-colors hover:bg-amber-500 hover:text-ink-950">
                ⟲ Copy as-designed
              </button>
            )}
            <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
          </div>
        </div>

        <div className="max-h-[68vh] space-y-3.5 overflow-y-auto p-5">
          {variant === "revision" && (
            <div className="grid grid-cols-2 gap-3 rounded-[4px] border border-amber-500/50 bg-amber-500/10 p-3.5 sm:grid-cols-3">
              <SpecField label="Revision no." value={revMeta.revisionNo} onChange={(v) => setRevMeta({ ...revMeta, revisionNo: v })} />
              <div><label className={labelCls}>Revision date</label><input type="date" className={inputCls} value={revMeta.date} onChange={(e) => setRevMeta({ ...revMeta, date: e.target.value })} /></div>
              <div className="col-span-2 sm:col-span-1"><label className={labelCls}>Reason</label><input className={inputCls} value={revMeta.reason} onChange={(e) => setRevMeta({ ...revMeta, reason: e.target.value })} placeholder="Why the design changed…" /></div>
            </div>
          )}
          {variant === "actual" && (
            <div className="grid grid-cols-2 gap-3 rounded-[4px] border border-pine-600/50 bg-pine-600/10 p-3.5">
              <div><label className={labelCls}>As-built date</label><input type="date" className={inputCls} value={actMeta.date} onChange={(e) => setActMeta({ ...actMeta, date: e.target.value })} /></div>
              <div><label className={labelCls}>Certified by</label><input className={inputCls} value={actMeta.certifiedBy} onChange={(e) => setActMeta({ ...actMeta, certifiedBy: e.target.value })} placeholder="Materials / project engineer" /></div>
            </div>
          )}

          {SECTION_META.map(({ key, code, name }) => <SectionBlock key={key} secKey={key} code={code} name={name} />)}
        </div>

        <div className="flex items-center justify-between border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <p className="font-mono text-[9.5px] text-text-400 uppercase">{filledCount(specs)} of {SPEC_ROWS.length} fields encoded</p>
          <button onClick={save} className={saveBtnCls}><IconSave size={14} /> {existing ? "Update " : "Save "}{vm.tag.toLowerCase()}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Suspension order encoder ---------- */

export function SOForm({ record, editing, onClose }: {
  record: ProjectRecord;
  editing: SuspensionOrder | null;
  onClose: () => void;
}) {
  const [f, setF] = useState(() => editing ? {
    orderNo: editing.orderNo, dateSuspended: editing.dateSuspended, dateResumed: editing.dateResumed ?? "",
    durationDays: String(editing.durationDays), daysUsed: String(editing.daysUsed), remarks: editing.remarks,
  } : {
    orderNo: "OCE-SO-", dateSuspended: new Date().toISOString().slice(0, 10), dateResumed: "",
    durationDays: "0", daysUsed: "0", remarks: "",
  });
  const valid = f.orderNo.trim().length > 3;

  const save = () => {
    const base = {
      orderNo: f.orderNo.trim(), dateSuspended: f.dateSuspended, dateResumed: f.dateResumed || null,
      durationDays: parseInt(f.durationDays, 10) || 0, daysUsed: parseInt(f.daysUsed, 10) || 0, remarks: f.remarks,
    };
    if (editing) { updateOrder(record.id, "so", { ...base, id: editing.id }); toast(f.orderNo, "updated", "suspension order"); }
    else { const id = addOrder(record.id, "so", base); toast(base.orderNo, "saved", `${id} · ${base.daysUsed} days consumed`); }
    onClose();
  };

  return (
    <OrderShell title={editing ? "Edit Suspension Order" : "Encode Suspension Order"} sheet={`${record.id} · suspension_orders`} onClose={onClose} onSave={save} valid={valid} saveLabel={editing ? "Update order" : "Save order"}>
      <div className="grid grid-cols-2 gap-3 p-5">
        <div><label className={labelCls}>Office order no. *</label><input className={inputCls} value={f.orderNo} onChange={(e) => setF({ ...f, orderNo: e.target.value })} /></div>
        <div><label className={labelCls}>Suspension duration (days)</label><input className={inputCls} value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: e.target.value })} inputMode="numeric" /></div>
        <div><label className={labelCls}>Date suspended</label><input type="date" className={inputCls} value={f.dateSuspended} onChange={(e) => setF({ ...f, dateSuspended: e.target.value })} /></div>
        <div><label className={labelCls}>Date resumed</label><input type="date" className={inputCls} value={f.dateResumed} onChange={(e) => setF({ ...f, dateResumed: e.target.value })} /></div>
        <div><label className={labelCls}>Days used</label><input className={inputCls} value={f.daysUsed} onChange={(e) => setF({ ...f, daysUsed: e.target.value })} inputMode="numeric" /></div>
        <div className="col-span-2"><label className={labelCls}>Suspension remarks</label><textarea rows={2} className={inputCls} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} placeholder="Reason for suspension…" /></div>
      </div>
    </OrderShell>
  );
}

/* ---------- Variation order encoder ---------- */

export function VOForm({ record, editing, onClose }: {
  record: ProjectRecord;
  editing: VariationOrder | null;
  onClose: () => void;
}) {
  const [f, setF] = useState(() => editing ? {
    orderNo: editing.orderNo, revisedAmount: String(editing.revisedAmount), timeExtensionDays: String(editing.timeExtensionDays),
    dateRequested: editing.dateRequested, dateApproved: editing.dateApproved ?? "", remarks: editing.remarks,
  } : {
    orderNo: "OCE-VO-", revisedAmount: "0", timeExtensionDays: "0",
    dateRequested: new Date().toISOString().slice(0, 10), dateApproved: "", remarks: "",
  });
  const valid = f.orderNo.trim().length > 3;

  const save = () => {
    const base = {
      orderNo: f.orderNo.trim(), revisedAmount: parseFloat(f.revisedAmount) || 0, timeExtensionDays: parseInt(f.timeExtensionDays, 10) || 0,
      dateRequested: f.dateRequested, dateApproved: f.dateApproved || null, remarks: f.remarks,
    };
    if (editing) { updateOrder(record.id, "vo", { ...base, id: editing.id }); toast(f.orderNo, "updated", "variation order"); }
    else { const id = addOrder(record.id, "vo", base); toast(base.orderNo, "saved", `${id} · ${base.revisedAmount >= 0 ? "+" : ""}₱${base.revisedAmount.toLocaleString()}`); }
    onClose();
  };

  return (
    <OrderShell title={editing ? "Edit Variation Order" : "Encode Variation Order"} sheet={`${record.id} · variation_orders`} onClose={onClose} onSave={save} valid={valid} saveLabel={editing ? "Update order" : "Save order"}>
      <div className="grid grid-cols-2 gap-3 p-5">
        <div><label className={labelCls}>Office order no. *</label><input className={inputCls} value={f.orderNo} onChange={(e) => setF({ ...f, orderNo: e.target.value })} /></div>
        <div><label className={labelCls}>Revised amount (₱, + / −)</label><input className={inputCls} value={f.revisedAmount} onChange={(e) => setF({ ...f, revisedAmount: e.target.value })} inputMode="decimal" /></div>
        <div><label className={labelCls}>Time extension (days)</label><input className={inputCls} value={f.timeExtensionDays} onChange={(e) => setF({ ...f, timeExtensionDays: e.target.value })} inputMode="numeric" /></div>
        <div><label className={labelCls}>Date requested</label><input type="date" className={inputCls} value={f.dateRequested} onChange={(e) => setF({ ...f, dateRequested: e.target.value })} /></div>
        <div><label className={labelCls}>Date approved</label><input type="date" className={inputCls} value={f.dateApproved} onChange={(e) => setF({ ...f, dateApproved: e.target.value })} /></div>
        <div className="col-span-2"><label className={labelCls}>Variation remarks</label><textarea rows={2} className={inputCls} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} placeholder="Scope of variation…" /></div>
      </div>
    </OrderShell>
  );
}

/* shared modal frame for the two order encoders */
function OrderShell({ title, sheet, onClose, onSave, valid, saveLabel, children }: {
  title: string; sheet: string; onClose: () => void; onSave: () => void; valid: boolean; saveLabel: string; children: React.ReactNode;
}) {
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-950/60 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-xl rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">{sheet}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">{title}</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
        </div>
        {children}
        <div className="flex items-center justify-end border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <button disabled={!valid} onClick={onSave} className={saveBtnCls}><IconSave size={14} /> {saveLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
