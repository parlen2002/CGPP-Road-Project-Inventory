/* Project record drawer — header actions, save/update draft bar, identity,
   parties, location, Lot & ROW impact (captured for print), supporting
   documents, detail records, schedule, notes. */

import { useState, useEffect, useRef } from "react";
import { useStore, updateRecord, recordPoint, pinSourceOf, linkedCenterline } from "../state/store";
import { statusOf, fmtPesoM, fmtDate, durationOf, type ProjectRecord } from "../data/registry";
import { TREATMENT_COLOR } from "../data/roads";
import { toast } from "./toast";
import { IconClose, IconPin, IconArrow, IconUser, IconCalendar, IconEdit, IconTrash, IconSave, IconRoad, IconPrinter } from "./icons";
import ROWImpact from "./ROWImpact";
import DocumentIntake from "./DocumentIntake";
import RecordDetails from "./recordDetails";
import { PrintPortal, ProjectSheet, usePrintSession } from "../print/PrintSheets";

export default function ProjectDrawer({ record, onClose, onLocate, onEdit, onDelete, onOpenCadastre }: {
  record: ProjectRecord | null;
  onClose: () => void;
  onLocate: (point: [number, number], zoom?: number) => void;
  onEdit?: (r: ProjectRecord) => void;
  onDelete?: (r: ProjectRecord) => void;
  onOpenCadastre?: () => void;
}) {
  const { contractors, engineers, roadsReg } = useStore();
  const [printing, setPrinting] = useState(false);
  const [mapShot, setMapShot] = useState<string | null>(null);
  const rowMapRef = useRef<HTMLDivElement>(null);
  usePrintSession(printing, () => setPrinting(false));

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

  const printDetail = async () => {
    setMapShot(null);
    try {
      if (rowMapRef.current && linkedCenterline(record)) {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(rowMapRef.current, {
          useCORS: true, backgroundColor: "#dfe3d6", scale: 1.5, logging: false,
          windowWidth: 1280, windowHeight: 900,
        });
        setMapShot(canvas.toDataURL("image/png"));
      }
    } catch { setMapShot(null); }
    setPrinting(true);
  };

  const draftRec = { ...record, percent: draft.percent, actualStart: draft.actualStart || null, actualCompletion: draft.actualCompletion || null };
  const meta = statusOf(draftRec);
  const dirty = draft.percent !== record.percent || draft.actualStart !== (record.actualStart ?? "") || draft.actualCompletion !== (record.actualCompletion ?? "");
  const saveDraft = () => {
    updateRecord(record.id, { percent: draft.percent, actualStart: draft.actualStart || null, actualCompletion: draft.actualCompletion || null });
    toast(record.name, "updated", `${record.id} · ${draft.percent}% · status ${statusOf(draftRec).label}`);
  };

  const impl = contractors.find((c) => c.id === record.implementorId);
  const engr = engineers.find((e) => e.id === record.inchargeId);
  const linkedRoad = roadsReg.find((r) => r.id === record.roadId);
  const pin = pinSourceOf(record);
  const pt = recordPoint(record);

  const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="bg-paper-100 px-3 py-2.5">
      <p className="font-mono text-[8.5px] tracking-[0.16em] text-text-400 uppercase">{k}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-ink-900">{v}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onClose} />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-[720px] flex-col border-l-2 border-ink-800 bg-paper-200 shadow-2xl">
        <div className="border-b-2 border-ink-800 bg-ink-900 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] tracking-[0.2em] uppercase" style={{ color: meta.color }}>
                {record.id} · {meta.label} · {draft.percent}%
              </p>
              <h3 className="font-display mt-1 truncate text-[26px] leading-none font-bold text-paper-100 uppercase">{record.name}</h3>
              <p className="mt-1.5 font-mono text-[10px] text-paper-300/70">{record.type} · {record.mode} · {record.fund}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => onEdit?.(record)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-amber-500 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-all hover:bg-amber-400 hover:shadow-[0_4px_14px_rgba(255,194,77,0.35)]">
                  <IconEdit size={12} /> Edit record
                </button>
                <button onClick={() => onDelete?.(record)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-coral-500/60 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-coral-400 uppercase transition-all hover:bg-coral-600 hover:text-paper-100">
                  <IconTrash size={12} /> Delete
                </button>
                <button onClick={() => void printDetail()}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border-2 border-paper-100/40 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-paper-100 uppercase transition-all hover:border-amber-400 hover:text-amber-400">
                  <IconPrinter size={12} /> Print
                </button>
                <span className="ml-auto font-mono text-[8.5px] tracking-[0.16em] text-paper-300/40 uppercase">{dirty ? "draft — not yet saved" : "row is persisted"}</span>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
          </div>
        </div>

        <div className={`flex items-center gap-3 border-b px-5 py-3 transition-colors ${dirty ? "border-amber-500/60 bg-amber-500/10" : "border-line-300 bg-paper-100"}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-text-600 uppercase">Completion · drag to adjust</p>
              <p className="font-display text-2xl leading-none font-bold" style={{ color: meta.color }}>{draft.percent}%</p>
            </div>
            <input type="range" min={0} max={100} step={1} value={draft.percent}
              onChange={(e) => setDraft((d) => ({ ...d, percent: parseInt(e.target.value, 10) }))}
              className="rpis-slider"
              style={{ "--track": `linear-gradient(90deg, ${meta.color} ${draft.percent}%, #cbd4c2 ${draft.percent}%)` } as React.CSSProperties} />
          </div>
          <button onClick={saveDraft} disabled={!dirty}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-[3px] px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition-all ${
              dirty ? "bg-ink-900 text-amber-400 hover:bg-ink-800 hover:shadow-[0_8px_20px_rgba(12,25,19,0.4)]" : "cursor-not-allowed bg-ink-900/10 text-text-400"
            }`}>
            <IconSave size={14} /> {dirty ? "Save / Update record" : "Saved"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[3px] border border-line-400 bg-line-300">
            <KV k="Linear length" v={`${record.linearLength.toLocaleString()} m`} />
            <KV k="Bid year" v={record.bidYear} />
            <KV k="Source of fund" v={record.fund.replace(" Development Fund", " Dev Fund")} />
            <KV k="Object acct code" v={<span className="font-mono">{record.objectCode}</span>} />
            <KV k="File folder no." v={<span className="font-mono">{record.folderNo}</span>} />
            <KV k="Road treatment" v={record.treatment
              ? <span className="inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase" style={{ color: TREATMENT_COLOR[record.treatment], background: `${TREATMENT_COLOR[record.treatment]}18` }}>
                  <i className="h-1 w-1 rounded-full" style={{ background: TREATMENT_COLOR[record.treatment] }} />{record.treatment}
                </span>
              : <span className="text-text-400">— non-pavement</span>} />
          </div>

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

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[3px] border border-line-300 bg-paper-100 p-3.5">
              <p className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.16em] text-teal-500 uppercase"><IconUser size={12} /> Implementor · FK</p>
              {impl ? (<>
                <p className="mt-1.5 text-[13px] font-bold text-ink-900">{impl.name}</p>
                <p className="font-mono text-[9.5px] text-text-600">PCAB {impl.pcab} · {impl.category}</p>
                <p className="mt-0.5 text-[10.5px] text-text-600">{impl.contactPerson} · {impl.phone}</p>
              </>) : <p className="mt-1.5 font-mono text-[10.5px] text-text-400">Unlinked — edit the record to relink.</p>}
            </div>
            <div className="rounded-[3px] border border-line-300 bg-paper-100 p-3.5">
              <p className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.16em] text-teal-500 uppercase"><IconUser size={12} /> In-charge · FK</p>
              {engr ? (<>
                <p className="mt-1.5 text-[13px] font-bold text-ink-900">{engr.name}</p>
                <p className="font-mono text-[9.5px] text-text-600">{engr.position} · {engr.unit}</p>
                <p className="mt-0.5 text-[10.5px] text-text-600">PRC {engr.prc} · {engr.phone}</p>
              </>) : <p className="mt-1.5 font-mono text-[10.5px] text-text-400">Unlinked — edit the record to relink.</p>}
            </div>
          </div>

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
                  <span key={b} className="rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">Brgy. {b}</span>
                ))}
              </div>
              <p className="mt-2.5 font-mono text-[9px] tracking-wider uppercase" style={{ color: pin.kind === "geotag" ? "#2f9a70" : pin.kind === "centerline" ? "#1ea899" : "#71826f" }}>
                {pin.label} · {pt[0].toFixed(5)}N {pt[1].toFixed(5)}E
              </p>
              <button onClick={() => onLocate(pt, pin.kind === "barangay" ? 13 : 15)}
                className="group mt-3 inline-flex cursor-pointer items-center gap-2 rounded-[3px] bg-amber-500 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400">
                <IconPin size={13} /> Zoom on map console
                <IconArrow size={12} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          <div ref={rowMapRef}>
            <ROWImpact record={record} onOpenCadastre={onOpenCadastre} />
          </div>

          <DocumentIntake record={record} />

          <RecordDetails record={record} />

          <div className="mt-4 rounded-[3px] border border-line-300 bg-paper-100 p-4">
            <p className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.16em] text-text-600 uppercase"><IconCalendar size={12} /> Schedule</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Contracted window</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-semibold text-ink-900">{fmtDate(record.contractedStart)} → {fmtDate(record.contractedCompletion)}</p>
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Actual duration</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-semibold text-ink-900">{durationOf(draftRec)}</p>
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Actual start</p>
                <input type="date" value={draft.actualStart}
                  onChange={(e) => setDraft((d) => ({ ...d, actualStart: e.target.value }))}
                  className="mt-0.5 w-full rounded-[3px] border border-line-400 bg-white/70 px-2 py-1 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none" />
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Actual completion</p>
                <input type="date" value={draft.actualCompletion}
                  onChange={(e) => setDraft((d) => ({ ...d, actualCompletion: e.target.value }))}
                  className="mt-0.5 w-full rounded-[3px] border border-line-400 bg-white/70 px-2 py-1 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[3px] border border-line-300 bg-amber-500/[0.07] p-4">
            <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-amber-600 uppercase">Notes & remarks</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-text-600">{record.notes || "—"}</p>
          </div>

          <p className="mt-4 pb-2 text-center font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">
            prepared for the official project file
          </p>
        </div>
      </aside>

      {printing && (
        <PrintPortal orientation="portrait">
          <ProjectSheet record={record} contractor={impl} engineer={engr} linkedRoad={linkedRoad} mapShot={mapShot} />
        </PrintPortal>
      )}
    </div>
  );
}
