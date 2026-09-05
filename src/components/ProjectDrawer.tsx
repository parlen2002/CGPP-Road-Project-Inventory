import { useRef } from "react";
import {
  statusOf, typeShort, fmtPeso, fmtPesoM, fmtDate, durationOf,
  type ProjectRecord,
} from "../data/registry";
import {
  useStore, setPercent, setActualDates,
  addAttachment, deleteAttachment, nextAttachmentId, recordPoint, pinSourceOf,
} from "../state/store";
import { parseExifGPS, makeThumb } from "../lib/exif";
import { toast } from "./toast";
import { CornerTicks } from "./ui";
import { IconClose, IconPin, IconArrow, IconCamera, IconUser, IconCalendar, IconEdit, IconTrash, IconPlus } from "./icons";
import ROWImpact from "./ROWImpact";

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
  const { contractors, engineers } = useStore();
  const impl = record ? contractors.find((c) => c.id === record.implementorId) : undefined;
  const engr = record ? engineers.find((e) => e.id === record.inchargeId) : undefined;

  const fileRef = useRef<HTMLInputElement>(null);

  if (!record) return null;
  const meta = statusOf(record);
  const pct = record.percent;
  const variance = record.contractedAmount - record.actualAmount;
  const pin = pinSourceOf(record);
  const pt = recordPoint(record);
  const initials = (n: string) => n.replace("Engr. ", "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  /* ---- field file intake: geotagged images (EXIF GPS) / PDFs ---- */
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const sizeKB = Math.max(1, Math.round(file.size / 1024));
      const now = new Date().toISOString();
      if (isPdf) {
        addAttachment(record.id, { id: nextAttachmentId(record.id), kind: "PDF", name: file.name, sizeKB, lat: null, lng: null, uploadedAt: now });
        toast(file.name, "saved", "PDF filed to project folder");
      } else if (file.type.startsWith("image/")) {
        const gps = parseExifGPS(await file.arrayBuffer());
        const thumb = (await makeThumb(file)) ?? undefined;
        addAttachment(record.id, {
          id: nextAttachmentId(record.id), kind: "Geotagged Image", name: file.name, sizeKB,
          lat: gps ? gps[0] : null, lng: gps ? gps[1] : null, thumb, uploadedAt: now,
        });
        toast(file.name, gps ? "saved" : "info",
          gps ? `EXIF GPS locked — ${gps[0].toFixed(5)}N ${gps[1].toFixed(5)}E · pin now at the capture point`
            : "no GPS metadata found — pin keeps its current resolution");
      } else {
        toast(file.name, "info", "Only geotagged images or PDFs are accepted");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

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

          {/* field files — geotagged images / PDFs */}
          <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-paper-100">
            <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-ink-900 px-4 py-2.5">
              <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
                <IconCamera size={13} className="text-amber-400" /> Field files
                <span className="rounded-[3px] bg-ink-950 px-1.5 py-0.5 font-bold text-amber-400">{record.attachments.length}</span>
              </p>
              <p className="hidden font-mono text-[8.5px] tracking-[0.14em] text-paper-300/50 uppercase sm:block">geotagged images · PDFs</p>
            </div>

            <div className="p-4">
              {record.attachments.length === 0 && (
                <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[9.5px] leading-relaxed text-text-400">
                  No files yet. A geotagged photo sets the exact project station from its EXIF GPS; PDFs (plans, reports, bid docs) file into the project folder.
                </p>
              )}
              <ul className="space-y-2">
                {record.attachments.map((a) => (
                  <li key={a.id} className="group/att flex items-center gap-3 rounded-[3px] border border-line-300 bg-white/60 p-2.5 transition-colors hover:border-ink-800">
                    {a.kind === "Geotagged Image" ? (
                      a.thumb
                        ? <img src={a.thumb} alt={a.name} className="h-11 w-11 shrink-0 rounded-[3px] border border-ink-800 object-cover" />
                        : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border border-ink-800 bg-ink-900 text-pine-400"><IconCamera size={16} /></span>
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border border-ink-800 bg-ink-900 font-display text-[11px] font-bold text-coral-400">PDF</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-semibold text-ink-900" title={a.name}>{a.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {a.kind === "Geotagged Image" ? (
                          a.lat != null ? (
                            <span className="rounded-[3px] bg-pine-600/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-pine-600 uppercase">
                              Geotag · {a.lat.toFixed(5)}N {a.lng!.toFixed(5)}E
                            </span>
                          ) : (
                            <span className="rounded-[3px] bg-coral-500/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-coral-600 uppercase">
                              Image · no GPS metadata
                            </span>
                          )
                        ) : (
                          <span className="rounded-[3px] bg-ink-900/8 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-text-600 uppercase">Document</span>
                        )}
                        <span className="font-mono text-[8.5px] text-text-400">{a.sizeKB >= 1024 ? `${(a.sizeKB / 1024).toFixed(1)} MB` : `${a.sizeKB} KB`}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { deleteAttachment(record.id, a.id); toast(a.name, "deleted", "file removed from project folder"); }}
                      className="shrink-0 cursor-pointer p-1.5 text-text-400 transition-colors hover:text-coral-600"
                      title="Remove file"
                    >
                      <IconTrash size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={(e) => { void onFiles(e.target.files); }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-ink-600/60 bg-paper-200/70 py-2.5 font-mono text-[9.5px] font-bold tracking-[0.16em] text-text-600 uppercase transition-all hover:border-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
              >
                <IconPlus size={13} /> Upload geotagged image / PDF
              </button>
            </div>
          </div>

          {/* lot overlap + ROW impact */}
          <ROWImpact record={record} onOpenCadastre={onOpenCadastre} />

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
