/* ─────────────────────────────────────────────────────────────
   SUPPORTING-DOCUMENT INTAKE
   Staging queue → preview → replace/remove → upload.
   After upload, only the program ADMIN may remove a file
   (the admin gate lives in the store and is toggled in the TopBar).
   Geotagged images → EXIF GPS + thumbnail.  PDFs → document tile.
   ────────────────────────────────────────────────────────────── */

import { useRef, useState } from "react";
import type { ProjectRecord, Attachment } from "../data/registry";
import { useStore, addAttachment, deleteAttachment, nextAttachmentId } from "../state/store";
import { parseExifGPS, makeThumb } from "../lib/exif";
import { toast } from "./toast";
import { IconCamera, IconPlus, IconTrash, IconUpload, IconLock } from "./icons";

interface Staged {
  key: string;       // unique slot id
  file: File;
  kind: "image" | "pdf";
  preview: string | null; // object-URL for images
}

let slotSeq = 0;

export default function DocumentIntake({ record }: { record: ProjectRecord }) {
  const { admin } = useStore();
  const [staged, setStaged] = useState<Staged[]>([]);
  const [busy, setBusy] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceKey = useRef<string | null>(null);

  const attachments = record.attachments ?? [];

  /* ---------- staging ---------- */

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: Staged[] = [];
    Array.from(files).forEach((file) => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImg = file.type.startsWith("image/");
      if (!isPdf && !isImg) {
        toast(file.name, "info", "Only geotagged images or PDFs are accepted");
        return;
      }
      const key = `slot-${++slotSeq}`;
      next.push({ key, file, kind: isPdf ? "pdf" : "image", preview: isImg ? URL.createObjectURL(file) : null });
    });
    if (next.length) setStaged((s) => [...s, ...next]);
  };

  const removeStaged = (key: string) => {
    setStaged((s) => {
      const it = s.find((x) => x.key === key);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return s.filter((x) => x.key !== key);
    });
  };

  const replaceStaged = (key: string) => {
    replaceKey.current = key;
    replaceRef.current?.click();
  };

  const onReplacePicked = (files: FileList | null) => {
    const file = files?.[0];
    const key = replaceKey.current;
    replaceKey.current = null;
    if (!file || !key) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImg = file.type.startsWith("image/");
    if (!isPdf && !isImg) { toast(file.name, "info", "Only geotagged images or PDFs are accepted"); return; }
    setStaged((s) => s.map((x) => {
      if (x.key !== key) return x;
      if (x.preview) URL.revokeObjectURL(x.preview);
      return { key, file, kind: isPdf ? "pdf" : "image", preview: isImg ? URL.createObjectURL(file) : null };
    }));
  };

  /* ---------- upload (commit staged → record) ---------- */

  const upload = async () => {
    if (!staged.length) return;
    setBusy(true);
    let geo = 0, pdf = 0, noGps = 0;
    for (const s of staged) {
      const sizeKB = Math.max(1, Math.round(s.file.size / 1024));
      const now = new Date().toISOString();
      if (s.kind === "pdf") {
        addAttachment(record.id, { id: nextAttachmentId(record.id), kind: "PDF", name: s.file.name, sizeKB, lat: null, lng: null, uploadedAt: now });
        pdf++;
      } else {
        const gps = parseExifGPS(await s.file.arrayBuffer());
        const thumb = (await makeThumb(s.file)) ?? undefined;
        addAttachment(record.id, {
          id: nextAttachmentId(record.id), kind: "Geotagged Image", name: s.file.name, sizeKB,
          lat: gps ? gps[0] : null, lng: gps ? gps[1] : null, thumb, uploadedAt: now,
        });
        if (gps) geo++; else noGps++;
      }
    }
    staged.forEach((s) => { if (s.preview) URL.revokeObjectURL(s.preview); });
    setStaged([]);
    setBusy(false);
    toast(
      `${geo + pdf} file${geo + pdf > 1 ? "s" : ""} attached`,
      "saved",
      [
        geo ? `${geo} geotagged (EXIF GPS locked)` : "",
        noGps ? `${noGps} image without GPS` : "",
        pdf ? `${pdf} PDF document${pdf > 1 ? "s" : ""}` : "",
      ].filter(Boolean).join(" · ") || undefined
    );
  };

  /* ---------- render ---------- */

  return (
    <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-paper-100">
      <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-ink-900 px-4 py-2.5">
        <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
          <IconCamera size={13} className="text-amber-400" /> Supporting documents
          <span className="rounded-[3px] bg-ink-950 px-1.5 py-0.5 font-bold text-amber-400">{attachments.length}</span>
        </p>
        <p className="font-mono text-[8.5px] tracking-[0.14em] uppercase" style={{ color: admin ? "#2f9a70" : "rgba(255,255,255,0.35)" }}>
          {admin ? "admin · removal unlocked" : "admin required to remove"}
        </p>
      </div>

      <div className="p-4">
        {/* ── staging queue (before upload) ── */}
        {staged.length > 0 && (
          <div className="mb-4 rounded-[3px] border-2 border-dashed border-amber-500/70 bg-amber-500/[0.06] p-3">
            <p className="mb-2.5 font-mono text-[9px] font-bold tracking-[0.16em] text-amber-600 uppercase">
              Staged · {staged.length} file{staged.length > 1 ? "s" : ""} — review, replace or remove before uploading
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {staged.map((s) => (
                <li key={s.key} className="group/stage relative rounded-[3px] border border-line-400 bg-paper-100 p-1.5">
                  {s.kind === "image" && s.preview
                    ? <img src={s.preview} alt={s.file.name} className="h-16 w-full rounded-[2px] border border-ink-800 object-cover" />
                    : (
                      <div className="grid h-16 w-full place-items-center rounded-[2px] border border-ink-800 bg-ink-900">
                        <span className="font-display text-[15px] font-bold text-coral-400">PDF</span>
                      </div>
                    )}
                  <p className="mt-1 truncate font-mono text-[8.5px] text-text-600" title={s.file.name}>{s.file.name}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <button
                      onClick={() => replaceStaged(s.key)}
                      className="flex-1 cursor-pointer rounded-[2px] border border-line-400 px-1 py-0.5 font-mono text-[8px] font-bold tracking-wider text-text-600 uppercase transition-colors hover:border-teal-500 hover:text-teal-500"
                      title="Replace this file"
                    >↻ Replace</button>
                    <button
                      onClick={() => removeStaged(s.key)}
                      className="cursor-pointer rounded-[2px] border border-line-400 p-1 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600"
                      title="Remove from staging"
                    ><IconTrash size={11} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => void upload()}
                disabled={busy}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-amber-500 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconUpload size={13} /> {busy ? "Processing EXIF…" : `Upload ${staged.length} file${staged.length > 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => { staged.forEach((s) => s.preview && URL.revokeObjectURL(s.preview)); setStaged([]); }}
                className="cursor-pointer rounded-[3px] border border-line-400 px-3 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-text-600 uppercase transition-colors hover:border-coral-500 hover:text-coral-600"
              >Clear</button>
            </div>
          </div>
        )}

        {/* ── uploaded files (admin-gated removal) ── */}
        {attachments.length === 0 && staged.length === 0 && (
          <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[9.5px] leading-relaxed text-text-400">
            No files yet. A geotagged photo sets the exact project station from its EXIF GPS;
            PDFs (plans, reports, bid documents) file into the project folder as supporting documents.
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
                    <span className="font-mono text-[8.5px] text-text-400">{a.sizeKB >= 1024 ? `${(a.sizeKB / 1024).toFixed(1)} MB` : `${a.sizeKB} KB`}</span>
                  </div>
                </div>
                {admin ? (
                  <button
                    onClick={() => { deleteAttachment(record.id, a.id); toast(a.name, "deleted", "file removed from project folder"); }}
                    className="shrink-0 cursor-pointer p-1.5 text-text-400 transition-colors hover:text-coral-600"
                    title="Remove file (admin)"
                  ><IconTrash size={14} /></button>
                ) : (
                  <span className="shrink-0 p-1.5 text-text-400/50" title="Only the program admin can remove uploaded files"><IconLock size={14} /></span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* ── add-files control ── */}
        <input ref={pickRef} type="file" multiple accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={replaceRef} type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => { onReplacePicked(e.target.files); e.target.value = ""; }} />
        <button
          onClick={() => pickRef.current?.click()}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-ink-600/60 bg-paper-200/70 py-2.5 font-mono text-[9.5px] font-bold tracking-[0.16em] text-text-600 uppercase transition-all hover:border-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
        >
          <IconPlus size={13} /> Add geotagged images / PDFs <span className="opacity-60">(multiple)</span>
        </button>
      </div>
    </div>
  );
}
