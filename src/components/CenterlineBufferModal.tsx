/* Centerline buffer adjuster — opened from the project detail's Lot & ROW panel.
   Edits the linked centerline's parallel-buffer radius in place: the store updates
   live, so the drawer map and impact stats behind the modal respond as you drag.
   Portaled to <body>, so none of this ever lands in the printed sheet. */

import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { Centerline } from "../data/cadastre";
import { runROWAnalysis } from "../data/cadastre";
import { fmtPesoM, type ProjectRecord } from "../data/registry";
import { useStore, updateCenterline } from "../state/store";
import { fmtArea, fmtKm, lineLengthM } from "../lib/geo";
import BufferControl from "./BufferControl";
import { IconClose, IconArrow, IconPin } from "./icons";

export default function CenterlineBufferModal({ record, axis, onClose, onOpenFull }: {
  record: ProjectRecord;
  axis: Centerline;
  onClose: () => void;
  onOpenFull?: () => void;
}) {
  const { parcels } = useStore();
  const row = useMemo(() => runROWAnalysis(parcels, axis), [parcels, axis]);
  const gov = row.rows.filter((x) => x.ownerType === "Government").length;
  const priv = row.rows.filter((x) => x.ownerType === "Private").length;

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[65] grid place-items-center bg-ink-950/70 p-4" onClick={onClose}>
      <div className="anim-fade-up relative w-full max-w-[560px] rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink-800 bg-ink-900 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] tracking-[0.22em] text-teal-400 uppercase">Centerline buffer · {axis.id}</p>
            <h3 className="font-display mt-0.5 truncate text-[24px] leading-none font-bold tracking-wide text-paper-100 uppercase">{axis.name}</h3>
            <p className="mt-1.5 font-mono text-[9.5px] tracking-wider text-paper-300/60 uppercase">
              axis of {record.id} · via {axis.source} · {fmtKm(lineLengthM(axis.line))}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400" aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {/* buffer instrument */}
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-[3px] border-2 border-ink-800 bg-ink-950 px-4 py-2.5 text-center">
              <p className="font-mono text-[8px] tracking-[0.18em] text-paper-300/50 uppercase">Offset</p>
              <p key={axis.radiusM} className="anim-fade-in font-display text-[34px] leading-none font-bold text-amber-400">
                ±{axis.radiusM}<span className="text-[16px] text-paper-300/60"> m</span>
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <BufferControl value={axis.radiusM} onChange={(v) => updateCenterline(axis.id, { radiusM: v })} />
              <p className="mt-1.5 font-mono text-[8.5px] leading-relaxed tracking-wider text-text-400 uppercase">
                Parallel to the axis only — square ends at the first / last station · ST_Buffer(axis, r, 'endcap=flat')
              </p>
            </div>
          </div>

          {/* live impact — recomputed on every drag */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { k: "Corridor area", v: fmtArea(row.corridorAreaM2), tone: "text-ink-900" },
              { k: "Lots overlapped", v: String(row.rows.length), sub: `${gov} govt · ${priv} priv`, tone: "text-ink-900" },
              { k: "Private affected", v: fmtArea(row.privM2), tone: "text-coral-600" },
              { k: "ROW cost", v: fmtPesoM(row.totalCost), tone: "text-coral-600" },
            ].map((s) => (
              <div key={s.k} className="rounded-[3px] border border-line-400 bg-white/60 px-2.5 py-2 transition-colors">
                <p className="font-mono text-[7.5px] tracking-[0.12em] text-text-400 uppercase">{s.k}</p>
                <p className={`font-display mt-0.5 text-[17px] leading-none font-bold ${s.tone}`}>{s.v}</p>
                {s.sub && <p className="mt-0.5 font-mono text-[7.5px] text-text-400">{s.sub}</p>}
              </div>
            ))}
          </div>

          <p className="mt-3 flex items-start gap-2 rounded-[3px] border border-teal-500/40 bg-teal-500/[0.07] px-3 py-2 font-mono text-[9px] leading-relaxed tracking-wider text-teal-500 uppercase">
            <IconPin size={12} className="mt-0.5 shrink-0" />
            Changes commit instantly — the project map and impact figures behind this window are already reflecting the new buffer.
          </p>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line-300 bg-paper-200 px-5 py-3.5">
          {onOpenFull ? (
            <button onClick={() => { onClose(); onOpenFull(); }}
              className="group flex cursor-pointer items-center gap-2 rounded-[3px] border border-teal-500 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-teal-500 uppercase transition-all hover:bg-teal-500 hover:text-paper-100">
              Full editor · Lot &amp; ROW
              <IconArrow size={12} className="transition-transform group-hover:translate-x-1" />
            </button>
          ) : <span />}
          <button onClick={onClose}
            className="cursor-pointer rounded-[3px] bg-ink-900 px-5 py-2 font-mono text-[10.5px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-all hover:bg-ink-800">
            Done — keep buffer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
