import {
  statusOf, typeShort, fmtPeso, fmtPesoM, fmtDate, durationOf,
  type ProjectRecord,
} from "../data/registry";
import { useState, useEffect } from "react";
import {
  useStore, updateRecord, recordPoint, pinSourceOf,
} from "../state/store";
import { TREATMENT_COLOR } from "../data/roads";
import { toast } from "./toast";
import { CornerTicks } from "./ui";
import { IconClose, IconPin, IconArrow, IconUser, IconCalendar, IconEdit, IconTrash, IconSave, IconRoad } from "./icons";
import ROWImpact from "./ROWImpact";
import DocumentIntake from "./DocumentIntake";
import RecordDetails from "./recordDetails";

function KV({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-paper-100 px-3 py-2.5">
      <p className="text-[8.5px] tracking-[0.16em] text-text-400 uppercase">{k}</p>
      <p className={`mt-0.5 text-[11.5px] font-semibold text-ink-900 ${mono ? "font-mono" : ""}`}>{v}</p>
    </div>
  );
}

export default function ProjectDrawer({ record, onClose, onLocate, onEdit, onDelete, onOpenCadastre }: {
  record: ProjectRecord | null;
  onClose: () => void;
  onLocate: (point: [number, number], zoom?: number) => void;
  onEdit?: (r: ProjectRecord) => void;
  onDelete?: (r: ProjectRecord) => void;
  onOpenCadastre?: () => void;
}) {
  const { contractors, engineers, roadsReg } = useStore();
  const impl = record ? contractors.find((c) => c.id === record.implementorId) : undefined;
  const engr = record ? engineers.find((e) => e.id === record.inchargeId) : undefined;
  const linkedRoad = record?.roadId ? roadsReg.find((r) => r.id === record.roadId) : undefined;

  /* local draft — edits stay here until the user presses Save/Update */
  const [draft, setDraft] = useState(() => ({
    percent: record?.percent ?? 0,
    actualStart: record?.actualStart ?? "",
    actualCompletion: record?.actualCompletion ?? "",
  }));
  useEffect(() => {
    setDraft({
      percent: record?.percent ?? 0,
      actualStart: record?.actualStart ?? "",
      actualCompletion: record?.actualCompletion ?? "",
    });
  }, [record?.id, record?.percent, record?.actualStart, record?.actualCompletion]);

  if (!record) return null;

  const draftRec = { ...record, percent: draft.percent, actualStart: draft.actualStart || null, actualCompletion: draft.actualCompletion || null };
  const meta = statusOf(draftRec);
  const pct = draft.percent;
  const dirty = draft.percent !== record.percent || draft.actualStart !== (record.actualStart ?? "") || draft.actualCompletion !== (record.actualCompletion ?? "");
  const saveDraft = () => {
    updateRecord(record.id, { percent: draft.percent, actualStart: draft.actualStart || null, actualCompletion: draft.actualCompletion || null });
    toast(record.name, "updated", `${record.id} · ${draft.percent}% · status ${statusOf(draftRec).label}`);
  };
  const variance = record.contractedAmount - record.actualAmount;
  const pin = pinSourceOf(record);
  const pt = recordPoint(record);
  const initials = (n: string) => n.replace("Engr. ", "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="anim-fade-in fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onClose} />
      {/* widened ~26% (570 → 720) so the three-column spec tables lay out cleanly */}
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-[720px] flex-col border-l-2 border-ink-800 bg-paper-200 shadow-2xl">
        {/* header */}
        <div className="border-b-2 border-ink-800 bg-ink-900 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-[3px] bg-amber-500 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-ink-950">{record.id}</span>
                <span className="rounded-[3px] border border-ink-600 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-paper-300 uppercase">{typeShort[record.type]} · {record.type}</span>
                <span className="rounded-[3px] border border-ink-600 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-paper-300 uppercase">{record.mode}</span>
              </div>
              <h3 className="font-display mt-2 text-[27px] leading-[1.02] font-bold text-paper-100 uppercase">{record.name}</h3>
              <p className="mt-1.5 font-mono text-[10px] text-paper-300/60 uppercase">
                {record.folderNo} · UACS {record.objectCode}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onEdit?.(record)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-amber-500 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-all hover:bg-amber-400 hover:shadow-[0_4px_14px_rgba(255,194,77,0.35)]"
                >
                  <IconEdit size={12} /> Edit record
                </button>
                <button
                  onClick={() => onDelete?.(record)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-coral-500/60 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-coral-400 uppercase transition-all hover:bg-coral-600 hover:text-paper-100"
                >
                  <IconTrash size={12} /> Delete
                </button>
                <span className="ml-auto font-mono text-[8.5px] tracking-[0.16em] text-paper-300/40 uppercase">{dirty ? "draft — not yet saved" : "row is persisted"}</span>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* status slider */}
          <div className="relative rounded-[4px] border-2 border-ink-800 bg-paper-100 p-4">
            <CornerTicks />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.18em] text-text-400 uppercase">Project status · % of completion</p>
                <p className="font-display mt-1 text-[52px] leading-none font-bold" style={{ color: meta.color }}>
                  {pct}<span className="text-2xl">%</span>
                </p>
              </div>
              <span
                className="mb-2 rounded-[3px] px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.14em] uppercase"
                style={{ color: meta.color, background: meta.soft, boxShadow: `inset 0 0 0 1px ${meta.ring}` }}
              >
                ● {meta.label}
              </span>
            </div>
            <input
              type="range" min={0} max={100} step={1} value={pct}
              aria-label="Percent of completion"
              onChange={(e) => setDraft((d) => ({ ...d, percent: parseInt(e.target.value, 10) }))}
              className="rpis-slider mt-3"
              style={{ "--track": `linear-gradient(90deg, ${meta.color} ${pct}%, #e2e7d9 ${pct}%)` } as React.CSSProperties}
            />
            <div className="mt-1 flex justify-between font-mono text-[8.5px] tracking-wider text-text-400 uppercase">
              <span>0 · not started</span><span>100 · complete</span>
            </div>
            <p className="mt-2 border-t border-dashed border-line-400 pt-2 font-mono text-[9px] text-text-400">
              Drag to stage field progress, then press <b className="text-amber-600">Save / Update record</b> below — nothing is written until you commit
            </p>
          </div>

          {/* identity grid */}
          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[3px] border border-line-400 bg-line-300">
            <KV k="Linear length" v={`${record.linearLength.toLocaleString()} m`} />
            <KV k="Bid year" v={record.bidYear} />
            <KV k="Source of fund" v={record.fund.replace(" Development Fund", " Dev Fund")} />
            <KV k="Object acct code" v={record.objectCode} />
            <KV k="File folder no." v={record.folderNo} />
            <KV k="Road treatment" v={
              record.treatment ? (
                <span className="inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
                  style={{ color: TREATMENT_COLOR[record.treatment], background: `${TREATMENT_COLOR[record.treatment]}18` }}>
                  <i className="h-1 w-1 rounded-full" style={{ background: TREATMENT_COLOR[record.treatment] }} />
                  {record.treatment}
                </span>
              ) : <span className="text-text-400">— non-pavement</span>
            } />
          </div>

          {/* linked road / street — the proper name this work is performed on */}
          <div className="mt-3 flex items-center gap-2.5 rounded-[3px] border border-line-300 bg-paper-100 px-3.5 py-2.5">
            <IconRoad size={15} className="shrink-0 text-pine-600" />
            {linkedRoad ? (
              <>
                <p className="min-w-0 truncate text-[12.5px] font-bold text-ink-900">{linkedRoad.name}</p>
                <span className="ml-auto shrink-0 rounded-[3px] bg-ink-900 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-amber-400 uppercase">{linkedRoad.id}</span>
              </>
            ) : (
              <p className="font-mono text-[10px] tracking-wider text-text-400 uppercase">No linked road — encode one in the Road Registry</p>
            )}
          </div>

          {/* financials */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[3px] border border-line-300 bg-paper-100 p-3.5">
              <p className="font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">Contracted amount</p>
              <p className="font-display mt-1 text-[24px] leading-none font-bold text-ink-900">{fmtPesoM(record.contractedAmount)}</p>
              <p className="mt-1 font-mono text-[9.5px] text-text-600">{fmtPeso(record.contractedAmount)}</p>
            </div>
            <div className="rounded-[3px] border border-line-300 bg-paper-100 p-3.5">
              <p className="font-mono text-[9px] tracking-[0.16em] text-text-400 uppercase">Actual amount</p>
              <p className="font-display mt-1 text-[24px] leading-none font-bold text-ink-900">{fmtPesoM(record.actualAmount)}</p>
              <p className="mt-1 font-mono text-[9.5px]" style={{ color: variance >= 0 ? "#175c43" : "#b84423" }}>
                {variance >= 0 ? `▼ ${fmtPesoM(variance)} unexpended` : `▲ ${fmtPesoM(-variance)} over`}
              </p>
            </div>
          </div>

          {/* schedule */}
          <div className="mt-4 rounded-[3px] border border-line-300 bg-paper-100 p-4">
            <p className="mb-3 flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-text-400 uppercase">
              <IconCalendar size={13} /> Project schedule <span className="text-text-400/60">· actual dates editable</span>
            </p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Contracted start</p>
                <p className="font-mono text-[12px] font-semibold text-ink-900">{fmtDate(record.contractedStart)}</p>
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Contracted completion</p>
                <p className="font-mono text-[12px] font-semibold text-ink-900">{fmtDate(record.contractedCompletion)}</p>
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Actual start</p>
                <input
                  type="date" value={draft.actualStart}
                  onChange={(e) => setDraft((d) => ({ ...d, actualStart: e.target.value }))}
                  className="mt-0.5 w-full rounded-[3px] border border-line-400 bg-white/70 px-2 py-1 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none"
                />
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Actual completion</p>
                <input
                  type="date" value={draft.actualCompletion}
                  onChange={(e) => setDraft((d) => ({ ...d, actualCompletion: e.target.value }))}
                  className="mt-0.5 w-full rounded-[3px] border border-line-400 bg-white/70 px-2 py-1 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-line-400 pt-2.5">
              <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">Actual project duration</p>
              <p className="font-mono text-[12px] font-bold text-ink-900">{durationOf(draftRec)}</p>
            </div>
          </div>

          {/* FK cards — uniform structure, stacked */}
          <div className="mt-4 grid items-stretch gap-3">
            <div className="rounded-[3px] border border-line-300 bg-paper-100 p-3.5">
              <p className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-text-400 uppercase">
                <IconUser size={12} /> Project implementor <span className="text-teal-500">FK → {record.implementorId}</span>
              </p>
              {impl ? (
                <>
                  <p className="text-[14px] font-bold text-ink-900">{impl.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-[3px] bg-ink-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400">PCAB {impl.pcab}</span>
                    <span className="rounded-[3px] border border-line-400 px-1.5 py-0.5 font-mono text-[9px] text-text-600 uppercase">{impl.category}</span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-text-600">{impl.contactPerson} · {impl.phone}</p>
                  <p className="font-mono text-[10px] text-text-400">{impl.address}</p>
                </>
              ) : (
                <div className="rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-2">
                  <p className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-coral-600 uppercase">⚠ Implementor unlinked</p>
                  <button onClick={() => onEdit?.(record)} className="mt-1 cursor-pointer font-mono text-[10px] text-coral-600 underline underline-offset-2 hover:text-coral-500">
                    Open editor to relink implementor →
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[3px] border border-line-300 bg-paper-100 p-3.5">
              <p className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-text-400 uppercase">
                <IconUser size={12} /> Project in-charge <span className="text-teal-500">FK → {record.inchargeId}</span>
              </p>
              {engr ? (
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border-2 border-ink-800 bg-amber-500 font-display text-lg font-bold text-ink-950">
                    {initials(engr.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink-900">{engr.name}</p>
                    <p className="font-mono text-[10px] text-text-600">{engr.position} · {engr.unit}</p>
                    <p className="font-mono text-[9.5px] text-text-400">PRC {engr.prc} · {engr.email}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-2">
                  <p className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-coral-600 uppercase">⚠ In-charge unlinked</p>
                  <button onClick={() => onEdit?.(record)} className="mt-1 cursor-pointer font-mono text-[10px] text-coral-600 underline underline-offset-2 hover:text-coral-500">
                    Open editor to relink in-charge →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* location — barangay-based */}
          <div className="relative mt-4 overflow-hidden rounded-[3px] border-2 border-ink-800 bg-ink-950 p-4">
            <div className="bg-graticule absolute inset-0" />
            <div className="relative">
              <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-paper-300/60 uppercase">
                <IconPin size={13} /> Location · barangay coverage
                {record.location.barangays.length > 1 && (
                  <span className="rounded-[3px] bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-400">MULTI · {record.location.barangays.length} BRGYS</span>
                )}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {record.location.barangays.map((b) => (
                  <span key={b} className="rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
                    Brgy. {b}
                  </span>
                ))}
              </div>

              {/* pin provenance */}
              <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-[3px] border px-3 py-2 ${
                pin.kind === "geotag" ? "border-pine-500/50 bg-pine-600/15"
                : pin.kind === "centerline" ? "border-teal-500/50 bg-teal-500/10"
                : "border-dashed border-ink-600"}`}>
                <IconPin size={12} className={pin.kind === "geotag" ? "text-pine-400" : pin.kind === "centerline" ? "text-teal-400" : "text-paper-300/50"} />
                <p className={`font-mono text-[9px] font-bold tracking-[0.14em] uppercase ${
                  pin.kind === "geotag" ? "text-pine-400" : pin.kind === "centerline" ? "text-teal-400" : "text-paper-300/60"}`}>
                  Pin · {pin.label}
                </p>
                <p className="ml-auto font-mono text-[9.5px] text-paper-100/90 tabular">
                  {pt[0].toFixed(5)}°N {pt[1].toFixed(5)}°E
                </p>
              </div>

              <button
                onClick={() => onLocate(pt, pin.kind === "barangay" ? 13 : 15)}
                className="group mt-3 inline-flex cursor-pointer items-center gap-2 rounded-[3px] bg-amber-500 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400"
              >
                <IconPin size={13} /> Zoom on map console
                <IconArrow size={12} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* linked detail records — technical / revision / actual + VO & SO */}
          <RecordDetails record={record} />

          {/* supporting documents — staging intake, admin-gated removal */}
          <DocumentIntake record={record} />

          {/* lot overlap + ROW impact */}
          <ROWImpact record={record} onOpenCadastre={onOpenCadastre} />

          {/* notes */}
          <div className="mt-4 rounded-[3px] border border-line-300 bg-amber-500/[0.07] p-4">
            <p className="mb-1.5 font-mono text-[9px] tracking-[0.18em] text-amber-600 uppercase">Notes & remarks</p>
            <p className="text-[12.5px] leading-relaxed text-text-900">{record.notes || "No remarks encoded."}</p>
          </div>
        </div>

        {/* dedicated save / update — commits the staged draft, no live writes */}
        <div className={`flex shrink-0 items-center gap-3 border-t-2 px-5 py-3.5 transition-colors ${dirty ? "border-amber-500 bg-amber-500/15" : "border-ink-800 bg-ink-900"}`}>
          <div className="min-w-0 flex-1">
            <p className={`font-mono text-[9px] font-bold tracking-[0.18em] uppercase ${dirty ? "text-amber-600" : "text-paper-300/50"}`}>
              {dirty ? "● Unsaved changes staged" : "Record up to date"}
            </p>
            <p className={`mt-0.5 font-mono text-[8.5px] tracking-wider uppercase ${dirty ? "text-amber-600/80" : "text-paper-300/35"}`}>
              {dirty
                ? `${pct}% · ${meta.label} · commits on save`
                : "adjust % and dates above, then save"}
            </p>
          </div>
          <button
            onClick={saveDraft}
            disabled={!dirty}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-[3px] px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.16em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
              dirty
                ? "bg-amber-500 text-ink-950 shadow-[0_6px_18px_rgba(240,163,43,0.4)] hover:bg-amber-400"
                : "bg-ink-700 text-paper-300/50"
            }`}
          >
            <IconSave size={14} /> {dirty ? "Save / Update record" : "Saved"}
          </button>
        </div>
      </aside>
    </div>
  );
}
