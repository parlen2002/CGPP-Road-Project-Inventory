import { useEffect, useSyncExternalStore } from "react";
import { IconCheck, IconTrash, IconSave } from "./icons";

export type ToastKind = "saved" | "updated" | "deleted" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
  sub?: string;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();

const META: Record<ToastKind, { color: string; icon: (p: { size?: number }) => React.ReactNode; verb: string }> = {
  saved: { color: "#2f9a70", icon: (p) => <IconSave {...p} />, verb: "INSERT COMMITTED" },
  updated: { color: "#f0a32b", icon: (p) => <IconCheck {...p} />, verb: "UPDATE COMMITTED" },
  deleted: { color: "#de5a36", icon: (p) => <IconTrash {...p} />, verb: "DELETE COMMITTED" },
  info: { color: "#12897e", icon: (p) => <IconCheck {...p} />, verb: "RPIS" },
};

export function toast(msg: string, kind: ToastKind = "saved", sub?: string) {
  const id = ++seq;
  items = [...items, { id, kind, msg, sub }];
  listeners.forEach((l) => l());
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    listeners.forEach((l) => l());
  }, 3600);
}

export function Toaster() {
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => items
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { items = []; listeners.forEach((l) => l()); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[320px] flex-col gap-2">
      {items.map((t) => {
        const m = META[t.kind];
        return (
          <div
            key={t.id}
            className="anim-fade-up pointer-events-auto flex items-start gap-3 rounded-[4px] border-2 bg-ink-900 p-3 shadow-[0_16px_40px_rgba(7,17,12,0.5)]"
            style={{ borderColor: m.color }}
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[3px]" style={{ background: `${m.color}22`, color: m.color }}>
              {m.icon({ size: 15 })}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[8.5px] font-bold tracking-[0.2em]" style={{ color: m.color }}>{m.verb}</p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-paper-100">{t.msg}</p>
              {t.sub && <p className="mt-0.5 font-mono text-[9px] tracking-wider text-paper-300/55 uppercase">{t.sub}</p>}
            </div>
            <button
              onClick={() => { items = items.filter((x) => x.id !== t.id); listeners.forEach((l) => l()); }}
              className="cursor-pointer font-mono text-[10px] text-paper-300/40 transition-colors hover:text-paper-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
