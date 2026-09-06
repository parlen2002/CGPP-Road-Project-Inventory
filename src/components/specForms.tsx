/* Detail-record encoders — technical/revision/actual specs plus suspension &
   variation orders. Spec dropdowns come from the Technical Catalogs. */

import { useState, type ReactNode } from "react";
import {
  emptySpecs, VARIANT_META, PAVEMENTS, SHOULDER_TYPES, FINISHES, RAMPS,
  DRAINAGE_TYPES, SLOPE_TYPES, LIGHT_FIXTURES, LIGHT_CONTROLS, LIGHT_POWER,
  filledCount,
  type TechSpecs, type RevisionMeta, type ActualMeta,
  type SuspensionOrder, type VariationOrder, type SpecVariant,
} from "../data/specs";
import type { ProjectRecord } from "../data/registry";
import { optionsOf } from "../data/catalogs";
import { useStore, setSpecVariant, addOrder } from "../state/store";
import { toast } from "./toast";
import { Modal, inputCls, labelCls } from "./projectForms";

function SpecField({ label, value, onChange, unit, select }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; select?: string[];
}) {
  return (
    <div>
      <label className={labelCls}>{label}{unit ? ` (${unit})` : ""}</label>
      {select ? (
        <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {select.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function SpecForm({ record, variant, onClose }: {
  record: ProjectRecord;
  variant: SpecVariant;
  onClose: () => void;
}) {
  const { catalogItems } = useStore();
  const list = (group: Parameters<typeof optionsOf>[1], fallback: string[]) => {
    const o = optionsOf(catalogItems, group);
    return o.length ? o : fallback;
  };

  const existing = variant === "technical" ? record.technical
    : variant === "revision" ? record.revision?.specs ?? null
    : record.actual?.specs ?? null;

  const [specs, setSpecs] = useState<TechSpecs>(existing ?? emptySpecs());
  const [revMeta, setRevMeta] = useState<RevisionMeta>(record.revision?.meta ?? { revisionNo: "R-01", date: new Date().toISOString().slice(0, 10), reason: "" });
  const [actMeta, setActMeta] = useState<ActualMeta>(record.actual?.meta ?? { date: new Date().toISOString().slice(0, 10), certifiedBy: "" });

  const setSec = <K extends keyof TechSpecs>(sec: K, field: string, v: string) =>
    setSpecs((s) => ({ ...s, [sec]: { ...s[sec], [field]: v } }));

  const meta = VARIANT_META[variant];

  const save = () => {
    if (variant === "technical") setSpecVariant(record.id, "technical", specs);
    else if (variant === "revision") setSpecVariant(record.id, "revision", { specs, meta: revMeta });
    else setSpecVariant(record.id, "actual", { specs, meta: actMeta });
    toast(`${meta.title} saved`, "updated", `${record.id} · ${filledCount(specs)} of 24 items encoded`);
    onClose();
  };

  const SectionBlock = ({ code, name, children }: { code: string; name: string; children: ReactNode }) => (
    <div className="rounded-[4px] border border-line-300 bg-paper-200/60 p-3">
      <p className="mb-2.5 flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">
        <span className="rounded-[2px] bg-ink-900 px-1.5 py-0.5 text-[8.5px] text-amber-400">{code}</span>
        {name}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>
    </div>
  );

  return (
    <Modal title={meta.title} sheet={`project_records · ${record.id} · ${variant}`} onClose={onClose} wide>
      <p className="mb-3 font-mono text-[9.5px] leading-relaxed tracking-wider text-text-400 uppercase">{meta.desc}</p>

      {(variant === "revision" || variant === "actual") && (
        <button onClick={() => setSpecs(record.technical ?? emptySpecs())}
          className="mb-3 cursor-pointer rounded-[3px] border border-teal-500 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-wider text-teal-500 uppercase transition-colors hover:bg-teal-500 hover:text-paper-100">
          ⟲ Copy as-designed specs
        </button>
      )}

      {variant === "revision" && (
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          <SpecField label="Revision no." value={revMeta.revisionNo} onChange={(v) => setRevMeta({ ...revMeta, revisionNo: v })} />
          <SpecField label="Revision date" value={revMeta.date} onChange={(v) => setRevMeta({ ...revMeta, date: v })} />
          <SpecField label="Reason" value={revMeta.reason} onChange={(v) => setRevMeta({ ...revMeta, reason: v })} />
        </div>
      )}
      {variant === "actual" && (
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <SpecField label="As-built date" value={actMeta.date} onChange={(v) => setActMeta({ ...actMeta, date: v })} />
          <SpecField label="Certified by" value={actMeta.certifiedBy} onChange={(v) => setActMeta({ ...actMeta, certifiedBy: v })} />
        </div>
      )}

      <div className="space-y-3">
        <SectionBlock code="RD" name="Road">
          <SpecField label="Roadway width" unit="m" value={specs.road.widthM} onChange={(v) => setSec("road", "widthM", v)} />
          <SpecField label="Lanes" value={specs.road.lanes} onChange={(v) => setSec("road", "lanes", v)} />
          <SpecField label="Pavement type" value={specs.road.pavement} onChange={(v) => setSec("road", "pavement", v)} select={list("pavements", PAVEMENTS)} />
          <SpecField label="Pavement thickness" unit="cm" value={specs.road.pavementCm} onChange={(v) => setSec("road", "pavementCm", v)} />
          <SpecField label="Sub-base thickness" unit="cm" value={specs.road.subbaseCm} onChange={(v) => setSec("road", "subbaseCm", v)} />
        </SectionBlock>
        <SectionBlock code="SHLD" name="Road Shoulder">
          <SpecField label="Shoulder width" unit="m" value={specs.shoulder.widthM} onChange={(v) => setSec("shoulder", "widthM", v)} />
          <SpecField label="Shoulder type" value={specs.shoulder.type} onChange={(v) => setSec("shoulder", "type", v)} select={list("shoulderTypes", SHOULDER_TYPES)} />
          <SpecField label="Thickness" unit="cm" value={specs.shoulder.thicknessCm} onChange={(v) => setSec("shoulder", "thicknessCm", v)} />
        </SectionBlock>
        <SectionBlock code="SWLK" name="Sidewalk">
          <SpecField label="Sidewalk width" unit="m" value={specs.sidewalk.widthM} onChange={(v) => setSec("sidewalk", "widthM", v)} />
          <SpecField label="Slab thickness" unit="cm" value={specs.sidewalk.thicknessCm} onChange={(v) => setSec("sidewalk", "thicknessCm", v)} />
          <SpecField label="Surface finish" value={specs.sidewalk.finish} onChange={(v) => setSec("sidewalk", "finish", v)} select={list("finishes", FINISHES)} />
          <SpecField label="Accessibility ramps" value={specs.sidewalk.ramps} onChange={(v) => setSec("sidewalk", "ramps", v)} select={list("ramps", RAMPS)} />
        </SectionBlock>
        <SectionBlock code="DRNG" name="Drainage System">
          <SpecField label="Drainage type" value={specs.drainage.type} onChange={(v) => setSec("drainage", "type", v)} select={list("drainageTypes", DRAINAGE_TYPES)} />
          <SpecField label="Section size" unit="m" value={specs.drainage.sizeM} onChange={(v) => setSec("drainage", "sizeM", v)} />
          <SpecField label="Length" unit="m" value={specs.drainage.lengthM} onChange={(v) => setSec("drainage", "lengthM", v)} />
        </SectionBlock>
        <SectionBlock code="SLP" name="Slope Protection">
          <SpecField label="Protection type" value={specs.slope.type} onChange={(v) => setSec("slope", "type", v)} select={list("slopeTypes", SLOPE_TYPES)} />
          <SpecField label="Wall height" unit="m" value={specs.slope.heightM} onChange={(v) => setSec("slope", "heightM", v)} />
          <SpecField label="Protected length" unit="m" value={specs.slope.lengthM} onChange={(v) => setSec("slope", "lengthM", v)} />
        </SectionBlock>
        <SectionBlock code="LITE" name="Street Lights">
          <SpecField label="Lighting points / poles" value={specs.streetlights.poles} onChange={(v) => setSec("streetlights", "poles", v)} />
          <SpecField label="Pole height" unit="m" value={specs.streetlights.poleHeightM} onChange={(v) => setSec("streetlights", "poleHeightM", v)} />
          <SpecField label="Fixture" value={specs.streetlights.fixture} onChange={(v) => setSec("streetlights", "fixture", v)} select={list("lightFixtures", LIGHT_FIXTURES)} />
          <SpecField label="Pole spacing" unit="m c/c" value={specs.streetlights.spacingM} onChange={(v) => setSec("streetlights", "spacingM", v)} />
          <SpecField label="Control" value={specs.streetlights.control} onChange={(v) => setSec("streetlights", "control", v)} select={list("lightControls", LIGHT_CONTROLS)} />
          <SpecField label="Power source" value={specs.streetlights.power} onChange={(v) => setSec("streetlights", "power", v)} select={list("lightPower", LIGHT_POWER)} />
        </SectionBlock>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-300 pt-4">
        <p className="font-mono text-[9.5px] tracking-wider text-text-400 uppercase">
          {filledCount(specs)} of 24 items encoded · blank items are hidden on the record
        </p>
        <button onClick={save} className="cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800">
          Save {variant} specs
        </button>
      </div>
    </Modal>
  );
}

export function OrderForm({ record, kind, onClose }: {
  record: ProjectRecord;
  kind: "suspensions" | "variations";
  onClose: () => void;
}) {
  const isVO = kind === "variations";
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    orderNo: `OO-${new Date().getFullYear()}-`, revisedAmount: "0", timeExtensionDays: "0",
    dateRequested: today, dateApproved: today, remarks: "",
    dateSuspended: today, dateResumed: today, durationDays: "0", daysUsed: "0",
  });

  const save = () => {
    if (isVO) {
      const vo: VariationOrder = {
        id: `VO-${Date.now()}`, orderNo: f.orderNo, revisedAmount: parseFloat(f.revisedAmount) || 0,
        timeExtensionDays: parseInt(f.timeExtensionDays, 10) || 0,
        dateRequested: f.dateRequested, dateApproved: f.dateApproved, remarks: f.remarks,
      };
      addOrder(record.id, "variations", vo);
      toast(`Variation ${vo.orderNo}`, "saved", "adjusts contract value & completion");
    } else {
      const so: SuspensionOrder = {
        id: `SO-${Date.now()}`, orderNo: f.orderNo, dateSuspended: f.dateSuspended, dateResumed: f.dateResumed,
        durationDays: parseInt(f.durationDays, 10) || 0, daysUsed: parseInt(f.daysUsed, 10) || 0, remarks: f.remarks,
      };
      addOrder(record.id, "suspensions", so);
      toast(`Suspension ${so.orderNo}`, "saved", `${so.daysUsed} days charged to the schedule`);
    }
    onClose();
  };

  return (
    <Modal title={isVO ? "New Variation Order" : "New Suspension Order"} sheet={`project_records · ${record.id} · ${kind}`} onClose={onClose}>
      <p className="mb-3 font-mono text-[9.5px] leading-relaxed tracking-wider text-text-400 uppercase">
        {isVO
          ? "Revised amount and time extension flow into the adjusted contract value and adjusted completion date."
          : "Days used extend the adjusted completion date of the project record."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Office order number *</label>
          <input className={inputCls} value={f.orderNo} onChange={(e) => setF({ ...f, orderNo: e.target.value })} />
        </div>
        {isVO ? (<>
          <div><label className={labelCls}>Revised amount (₱, +/−)</label>
            <input className={inputCls} value={f.revisedAmount} onChange={(e) => setF({ ...f, revisedAmount: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>Time extension (days)</label>
            <input className={inputCls} value={f.timeExtensionDays} onChange={(e) => setF({ ...f, timeExtensionDays: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>Date requested</label>
            <input type="date" className={inputCls} value={f.dateRequested} onChange={(e) => setF({ ...f, dateRequested: e.target.value })} /></div>
          <div><label className={labelCls}>Date approved</label>
            <input type="date" className={inputCls} value={f.dateApproved} onChange={(e) => setF({ ...f, dateApproved: e.target.value })} /></div>
        </>) : (<>
          <div><label className={labelCls}>Date suspended</label>
            <input type="date" className={inputCls} value={f.dateSuspended} onChange={(e) => setF({ ...f, dateSuspended: e.target.value })} /></div>
          <div><label className={labelCls}>Date resumed</label>
            <input type="date" className={inputCls} value={f.dateResumed} onChange={(e) => setF({ ...f, dateResumed: e.target.value })} /></div>
          <div><label className={labelCls}>Suspension duration (days)</label>
            <input className={inputCls} value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: e.target.value })} inputMode="numeric" /></div>
          <div><label className={labelCls}>Days used</label>
            <input className={inputCls} value={f.daysUsed} onChange={(e) => setF({ ...f, daysUsed: e.target.value })} inputMode="numeric" /></div>
        </>)}
        <div className="col-span-2">
          <label className={labelCls}>{isVO ? "Variation remarks" : "Suspension remarks"}</label>
          <textarea rows={3} className={inputCls} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} />
        </div>
      </div>
      <div className="mt-5 flex justify-end border-t border-line-300 pt-4">
        <button onClick={save} className="cursor-pointer rounded-[3px] bg-ink-900 px-6 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800">
          Record order
        </button>
      </div>
    </Modal>
  );
}
