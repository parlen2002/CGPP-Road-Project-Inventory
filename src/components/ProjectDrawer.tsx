import {
  statusOf, typeShort, fmtPeso, fmtPesoM, fmtDate, durationOf, projectPoint,
  type ProjectRecord,
} from "../data/registry";
import { useStore, setPercent, setActualDates } from "../state/store";
import { CornerTicks } from "./ui";
import { IconClose, IconPin, IconArrow, IconCamera, IconUser, IconCalendar, IconEdit, IconTrash } from "./icons";

function KV({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-paper-100 px-3 py-2.5">
      <p className="text-[8.5px] tracking-[0.16em] text-text-400 uppercase">{k}</p>
      <p className={`mt-0.5 text-[11.5px] font-semibold text-ink-900 ${mono ? "font-mono" : ""}`}>{v}</p>
    </div>
  );
}

export default function ProjectDrawer({ record, onClose, onLocate, onEdit, onDelete }: {
  record: ProjectRecord | null;
  onClose: () => void;
  onLocate: (point: [number, number], zoom?: number) => void;
  onEdit?: (r: ProjectRecord) => void;
  onDelete?: (r: ProjectRecord) => void;
}) {
  const { contractors, engineers } = useStore();
  const impl = record ? contractors.find((c) => c.id === record.implementorId) : undefined;
  const engr = record ? engineers.find((e) => e.id === record.inchargeId) : undefined;

  if (!record) return null;
  const meta = statusOf(record);
  const pct = record.percent;
  const variance = record.contractedAmount - record.actualAmount;
  const initials = (n: string) => n.replace("Engr. ", "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="anim-fade-in fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onClose} />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-[470px] flex-col border-l-2 border-ink-800 bg-paper-200 shadow-2xl">
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
                <span className="ml-auto font-mono text-[8.5px] tracking-[0.16em] text-paper-300/40 uppercase">row is persisted</span>
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
              onChange={(e) => setPercent(record.id, parseInt(e.target.value, 10))}
              className="rpis-slider mt-3"
              style={{ "--track": `linear-gradient(90deg, ${meta.color} ${pct}%, #e2e7d9 ${pct}%)` } as React.CSSProperties}
            />
            <div className="mt-1 flex justify-between font-mono text-[8.5px] tracking-wider text-text-400 uppercase">
              <span>0 · not started</span><span>100 · complete</span>
            </div>
            <p className="mt-2 border-t border-dashed border-line-400 pt-2 font-mono text-[9px] text-text-400">
              Drag to encode field progress — status re-derives and persists to <b className="text-teal-500">project_records.percent</b>
            </p>
          </div>

          {/* identity grid */}
          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[3px] border border-line-400 bg-line-300">
            <KV k="Linear length" v={`${record.linearLength.toLocaleString()} m`} />
            <KV k="Bid year" v={record.bidYear} />
            <KV k="Source of fund" v={record.fund.replace(" Development Fund", " Dev Fund")} />
            <KV k="Object acct code" v={record.objectCode} />
            <KV k="File folder no." v={record.folderNo} />
            <KV k="Mode" v={record.mode.replace("By ", "")} />
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
                  type="date" value={record.actualStart ?? ""}
                  onChange={(e) => setActualDates(record.id, e.target.value || null, record.actualCompletion)}
                  className="mt-0.5 w-full rounded-[3px] border border-line-400 bg-white/70 px-2 py-1 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none"
                />
              </div>
              <div>
                <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Actual completion</p>
                <input
                  type="date" value={record.actualCompletion ?? ""}
                  onChange={(e) => setActualDates(record.id, record.actualStart, e.target.value || null)}
                  className="mt-0.5 w-full rounded-[3px] border border-line-400 bg-white/70 px-2 py-1 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-line-400 pt-2.5">
              <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">Actual project duration</p>
              <p className="font-mono text-[12px] font-bold text-ink-900">{durationOf(record)}</p>
            </div>
          </div>

          {/* FK cards */}
          <div className="mt-4 grid gap-3">
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

              {record.location.evidence ? (
                <div className="mt-3 rounded-[3px] border border-pine-500/50 bg-pine-600/15 p-3">
                  <p className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.16em] text-pine-400 uppercase">
                    <IconCamera size={12} /> Supporting evidence · {record.location.evidence.source} — pinpoints the project
                  </p>
                  <p className="mt-1.5 font-mono text-[13px] font-semibold text-paper-100">
                    {record.location.evidence.lat.toFixed(5)}° N, {record.location.evidence.lng.toFixed(5)}° E
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-paper-300/60">
                    {record.location.evidence.ref}
                    <span className="text-pine-400/80"> → ST_Point(lng, lat) · SRID 4326</span>
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-[3px] border border-dashed border-ink-600 p-3">
                  <p className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-paper-300/70 uppercase">No field capture attached</p>
                  <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-paper-300/50">
                    Map pin falls on the barangay centroid{record.location.barangays.length > 1 ? "s (averaged)" : ""}. Attach a KML, GPX or geotagged image to pinpoint the project accurately.
                  </p>
                </div>
              )}

              <button
                onClick={() => onLocate(projectPoint(record), record.location.evidence ? 15 : 13)}
                className="group mt-3 inline-flex cursor-pointer items-center gap-2 rounded-[3px] bg-amber-500 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400"
              >
                <IconPin size={13} /> Zoom on map console
                <IconArrow size={12} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* notes */}
          <div className="mt-4 rounded-[3px] border border-line-300 bg-amber-500/[0.07] p-4">
            <p className="mb-1.5 font-mono text-[9px] tracking-[0.18em] text-amber-600 uppercase">Notes & remarks</p>
            <p className="text-[12.5px] leading-relaxed text-text-900">{record.notes || "No remarks encoded."}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
