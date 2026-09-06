/* Buffer adjuster modal — opened from the project record's ROW panel.
   Portaled to <body> so it never appears on the printed sheet. */

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useStore, updateCenterline } from "../state/store";
import { runROWAnalysis, type Centerline } from "../data/cadastre";
import type { ProjectRecord } from "../data/registry";
import { fmtPesoM } from "../data/registry";
import { fmtArea } from "../lib/geo";
import BufferControl from "./BufferControl";
import { IconClose } from "./icons";

const fmtPeso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
void fmtPeso;

export default function CenterlineBufferModal({ record, axis, onClose, onOpenFull }: {
  record: ProjectRecord;
  axis: Centerline;
  onClose: () => void;
  onOpenFull?: () => void;
}) {
  const { parcels } = useStore();
  const row = useMemo(() => runROWAnalysis(parcels, axis), [parcels, axis]);

  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[62] grid place-items-center bg-ink-950/70 p-4" onClick={onClose}>
      <div className="anim-fade-up w-full max-w-md rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">corridor buffer · {axis.id}</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">Adjust Buffer Radius</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
        </div>

        <div className="p-5">
          <p className="mb-3 font-mono text-[9.5px] leading-relaxed tracking-wider text-text-400 uppercase">
            Parallel offset from the centerline — square ends, never past the stations. Applies to <b className="text-ink-900">{record.id}</b>.
          </p>

          <div className="mb-4 rounded-[3px] border border-line-300 bg-paper-200/70 p-3">
            <BufferControl value={axis.radiusM} onChange={(v) => updateCenterline(axis.id, { radiusM: v })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[3px] border border-line-300 bg-white/60 px-3 py-2">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Corridor area</p>
              <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{fmtArea(row.corridorAreaM2)}</p>
            </div>
            <div className="rounded-[3px] border border-line-300 bg-white/60 px-3 py-2">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Lots overlapped</p>
              <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{row.rows.length}</p>
            </div>
            <div className="rounded-[3px] border border-coral-500/40 bg-coral-500/[0.06] px-3 py-2">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-coral-600 uppercase">Private affected</p>
              <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtArea(row.privM2)}</p>
            </div>
            <div className="rounded-[3px] border border-coral-500/40 bg-coral-500/[0.06] px-3 py-2">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-coral-600 uppercase">ROW acquisition</p>
              <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtPesoM(row.totalCost)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-line-300 pt-4">
            {onOpenFull && (
              <button onClick={onOpenFull}
                className="cursor-pointer rounded-[3px] border border-teal-500 px-3 py-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-teal-500 uppercase transition-colors hover:bg-teal-500 hover:text-paper-100">
                Full editor · Lot &amp; ROW
              </button>
            )}
            <button onClick={onClose}
              className="ml-auto cursor-pointer rounded-[3px] bg-ink-900 px-5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-colors hover:bg-ink-800">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
