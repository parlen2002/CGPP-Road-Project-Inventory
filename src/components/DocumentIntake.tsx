/* Supporting-document intake — staging queue with replace/remove before
   upload; originals archived byte-for-byte (EXIF intact); admin-gated removal. */

import { useRef, useState } from "react";
import type { ProjectRecord, Attachment } from "../data/registry";
import { useStore, addAttachment, deleteAttachment, nextAttachmentId } from "../state/store";
import { useAuth } from "../state/authStore";
import { parseExifGPS, makeThumb, readDataURL } from "../lib/exif";
import { toast } from "./toast";
import { IconCamera, IconPlus, IconTrash, IconUpload, IconLock, IconDownload } from "./icons";

const MAX_RAW_BYTES = 3.5 * 1024 * 1024;

interface Staged { key: string; file: File; kind: "image" | "pdf"; raw: string | null; reading?: boolean; }
let slotSeq = 0;

export default function DocumentIntake({ record }: { record: ProjectRecord }) {
  const { can, role } = useAuth();
  const [staged, setStaged] = useState<Staged[]>([]);
  const [busy, setBusy] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceKey = useRef<string | null>(null);

  const attachments = record.attachments ?? [];

  const stage = async (file: File, key: string, kind: "image" | "pdf") => {
    setStaged((s) => [...s, { key, file, kind, raw: null, reading: true }]);
    const raw = file.size <= MAX_RAW_BYTES ? await readDataURL(file) : null;
    setStaged((s) => s.map((x) => (x.key === key ? { ...x, raw, reading: false } : x)));
    if (!raw) toast(file.name, "info", `over ${(MAX_RAW_BYTES / 1048576).toFixed(1)} MB — kept as metadata + thumbnail only`);
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImg = file.type.startsWith("image/");
      if (!isPdf && !isImg) { toast(file.name, "info", "Only geotagged images or PDFs are accepted"); return; }
      void stage(file, `slot-${++slotSeq}`, isPdf ? "pdf" : "image");
    });
  };

  const onReplacePicked = (files: FileList | null) => {
    const file = files?.[0];
    const key = replaceKey.current;
    replaceKey.current = null;
    if (!file || !key) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImg = file.type.startsWith("image/");
    if (!isPdf && !isImg) { toast(file.name, "info", "Only geotagged images or PDFs are accepted"); return; }
    setStaged((s) => s.filter((x) => x.key !== key));
    void stage(file, key, isPdf ? "pdf" : "image");
  };

  const downloadSaved = (att: Attachment) => {
    if (!att.raw) { toast(att.name, "info", "raw bytes not archived locally — over the archive cap"); return; }
    const a = document.createElement("a");
    a.href = att.raw; a.download = att.name; a.click();
    toast(att.name, "info", "original saved — EXIF metadata intact");
  };

  const upload = async () => {
    if (!staged.length || staged.some((s) => s.reading)) return;
    setBusy(true);
    let geo = 0, pdf = 0, noGps = 0, rawN = 0;
    for (const s of staged) {
      const sizeKB = Math.max(1, Math.round(s.file.size / 1024));
      const now = new Date().toISOString();
      const mime = s.file.type || (s.kind === "pdf" ? "application/pdf" : "image/jpeg");
      if (s.raw) rawN++;
      if (s.kind === "pdf") {
        addAttachment(record.id, { id: nextAttachmentId(record.id), kind: "PDF", name: s.file.name, sizeKB, lat: null, lng: null, uploadedAt: now, raw: s.raw ?? undefined, mime });
        pdf++;
      } else {
        const gps = parseExifGPS(await s.file.arrayBuffer());
        const thumb = (await makeThumb(s.file)) ?? undefined;
        addAttachment(record.id, {
          id: nextAttachmentId(record.id), kind: "Geotagged Image", name: s.file.name, sizeKB,
          lat: gps ? gps[0] : null, lng: gps ? gps[1] : null, thumb, uploadedAt: now,
          raw: s.raw ?? undefined, mime,
        });
        if (gps) geo++; else noGps++;
      }
    }
    setStaged([]);
    setBusy(false);
    toast(`${geo + pdf} file${geo + pdf > 1 ? "s" : ""} attached`, "saved",
      [geo ? `${geo} geotagged (EXIF GPS locked)` : "", noGps ? `${noGps} image without GPS` : "",
       pdf ? `${pdf} PDF document${pdf > 1 ? "s" : ""}` : "", rawN ? `${rawN} raw archive${rawN > 1 ? "s" : ""} intact` : ""]
        .filter(Boolean).join(" · ") || undefined);
  };

  return (
    <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-paper-100">
      <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-ink-900 px-4 py-2.5">
        <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
          <IconCamera size={13} className="text-amber-400" /> Supporting documents
          <span className="rounded-[3px] bg-ink-950 px-1.5 py-0.5 font-bold text-amber-400">{attachments.length}</span>
        </p>
        <p className="font-mono text-[8.5px] tracking-[0.14em] uppercase" style={{ color: can.del ? "#2f9a70" : "rgba(255,255,255,0.35)" }}>
          {can.del ? "admin · removal unlocked" : `removal requires admin · ${role}`}
        </p>
      </div>

      <div className="p-4">
        {staged.length > 0 && (
          <div className="mb-4 rounded-[3px] border-2 border-dashed border-amber-500/70 bg-amber-500/[0.06] p-3">
            <p className="mb-2.5 font-mono text-[9px] font-bold tracking-[0.16em] text-amber-600 uppercase">
              Staged · {staged.length} file{staged.length > 1 ? "s" : ""} — review, replace or remove before uploading
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {staged.map((s) => (
                <li key={s.key} className="rounded-[3px] border border-line-400 bg-paper-100 p-1.5">
                  {s.kind === "image" && s.raw
                    ? <img src={s.raw} alt={s.file.name} className="h-16 w-full rounded-[2px] border border-ink-800 object-cover" />
                    : (
                      <div className="grid h-16 w-full place-items-center rounded-[2px] border border-ink-800 bg-ink-900">
                        <span className={`font-display text-[15px] font-bold ${s.reading ? "animate-pulse text-paper-300/50" : "text-coral-400"}`}>{s.reading ? "…" : "PDF"}</span>
                      </div>
                    )}
                  <p className="mt-1 truncate font-mono text-[8.5px] text-text-600" title={s.file.name}>{s.file.name}</p>
                  <p className="font-mono text-[8px] tracking-wider text-text-400 uppercase">{s.raw ? "raw · EXIF intact" : s.reading ? "reading bytes…" : "metadata only"}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <button onClick={() => { replaceKey.current = s.key; replaceRef.current?.click(); }}
                      className="flex-1 cursor-pointer rounded-[2px] border border-line-400 px-1 py-0.5 font-mono text-[8px] font-bold tracking-wider text-text-600 uppercase transition-colors hover:border-teal-500 hover:text-teal-500">
                      ↻ Replace
                    </button>
                    <button onClick={() => setStaged((st) => st.filter((x) => x.key !== s.key))} title="Remove from staging"
                      className="cursor-pointer rounded-[2px] border border-line-400 p-1 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600">
                      <IconTrash size={11} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => void upload()} disabled={busy || staged.some((s) => s.reading)}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-amber-500 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
                <IconUpload size={13} /> {busy ? "Processing EXIF…" : `Upload ${staged.length} file${staged.length > 1 ? "s" : ""}`}
              </button>
              <button onClick={() => setStaged([])}
                className="cursor-pointer rounded-[3px] border border-line-400 px-3 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-600 uppercase transition-colors hover:border-coral-500 hover:text-coral-600">
                Clear
              </button>
            </div>
          </div>
        )}

        {attachments.length === 0 && staged.length === 0 && (
          <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[9.5px] leading-relaxed text-text-400">
            No files yet. A geotagged photo sets the exact project station from its EXIF GPS;
            PDFs (plans, reports, bid documents) file into the project folder as supporting documents.
            Originals are archived byte-for-byte — download them anytime for print-out.
          </p>
        )}

        {attachments.length > 0 && (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-[3px] border border-line-300 bg-white/60 p-2.5 transition-colors hover:border-ink-800">
                {a.kind === "Geotagged Image"
                  ? (a.thumb
                      ? <img src={a.thumb} alt={a.name} className="h-11 w-11 shrink-0 rounded-[3px] border border-ink-800 object-cover" />
                      : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border border-ink-800 bg-ink-900 text-pine-400"><IconCamera size={16} /></span>)
                  : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border border-ink-800 bg-ink-900 font-display text-[11px] font-bold text-coral-400">PDF</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-ink-900" title={a.name}>{a.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {a.kind === "Geotagged Image"
                      ? (a.lat != null
                          ? <span className="rounded-[3px] bg-pine-600/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-pine-600 uppercase">Geotag · {a.lat.toFixed(5)}N {a.lng!.toFixed(5)}E</span>
                          : <span className="rounded-[3px] bg-coral-500/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-coral-600 uppercase">Image · no GPS metadata</span>)
                      : <span className="rounded-[3px] bg-ink-900/8 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-text-600 uppercase">Supporting doc</span>}
                    {a.raw
                      ? <span className="rounded-[3px] bg-teal-500/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-teal-500 uppercase" title="Original bytes archived — EXIF intact">RAW · EXIF intact</span>
                      : <span className="rounded-[3px] bg-ink-900/8 px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider text-text-400 uppercase">metadata only</span>}
                    <span className="font-mono text-[8.5px] text-text-400">{a.sizeKB >= 1024 ? `${(a.sizeKB / 1024).toFixed(1)} MB` : `${a.sizeKB} KB`}</span>
                  </div>
                </div>
                <button onClick={() => downloadSaved(a)} title={a.raw ? "Download / save original (EXIF intact)" : "Raw bytes not archived locally"}
                  className="shrink-0 cursor-pointer p-1.5 text-text-400 transition-colors hover:text-pine-600">
                  <IconDownload size={14} />
                </button>
                {can.del ? (
                  <button onClick={() => { deleteAttachment(record.id, a.id); toast(a.name, "deleted", "file removed from project folder"); }}
                    className="shrink-0 cursor-pointer p-1.5 text-text-400 transition-colors hover:text-coral-600" title="Remove file (admin)">
                    <IconTrash size={14} />
                  </button>
                ) : (
                  <span className="shrink-0 p-1.5 text-text-400/50" title="Only the program admin can remove uploaded files"><IconLock size={14} /></span>
                )}
              </li>
            ))}
          </ul>
        )}

        <input ref={pickRef} type="file" multiple accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={replaceRef} type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => { onReplacePicked(e.target.files); e.target.value = ""; }} />
        <button onClick={() => pickRef.current?.click()}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-ink-600/60 bg-paper-200/70 py-2.5 font-mono text-[9.5px] font-bold tracking-[0.16em] text-text-600 uppercase transition-all hover:border-amber-600 hover:bg-amber-500/10 hover:text-amber-600">
          <IconPlus size={13} /> Add geotagged images / PDFs <span className="opacity-60">(multiple)</span>
        </button>
      </div>
    </div>
  );
}
