import type { ReactNode } from "react";
import { IconTrash } from "./icons";

export default function ConfirmDialog({ title, sheet, message, confirmLabel, onConfirm, onClose }: {
  title: string;
  sheet: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center bg-ink-950/70 p-4" onClick={onClose}>
      <div
        className="anim-fade-up relative w-full max-w-md rounded-[4px] border-2 border-coral-600 bg-paper-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-coral-500" />
        <div className="flex items-start gap-3.5 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border-2 border-coral-500 bg-coral-500/10 text-coral-600">
            <IconTrash size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[9px] tracking-[0.22em] text-coral-600 uppercase">{sheet}</p>
            <h3 className="font-display mt-0.5 text-[26px] leading-none font-bold tracking-wide text-ink-900 uppercase">{title}</h3>
            <div className="mt-2.5 text-[12.5px] leading-relaxed text-text-600">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line-300 bg-paper-200 px-5 py-3.5">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-[3px] border border-line-400 px-4 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-text-600 uppercase transition-colors hover:border-ink-800 hover:text-ink-900"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="cursor-pointer rounded-[3px] bg-coral-600 px-4 py-2 font-mono text-[10.5px] font-bold tracking-[0.14em] text-paper-100 uppercase transition-all hover:bg-coral-500 hover:shadow-[0_6px_16px_rgba(184,68,35,0.4)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
