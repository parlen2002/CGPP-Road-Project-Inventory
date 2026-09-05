/* ─────────────────────────────────────────────────────────────
   SEARCHABLE DROPDOWN — renders as a plain select while the list
   is short, and automatically becomes a type-to-filter dropdown
   the moment the option count exceeds SEARCHABLE_AT (12 items).
   Supports single and multiple (checkbox) modes.
   ────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck } from "./icons";

export interface SSOption {
  value: string;
  label: string;
  sub?: string;
  disabled?: boolean;
}

export const SEARCHABLE_AT = 12; // lists longer than this become searchable

const controlCls =
  "w-full rounded-[3px] border border-line-400 bg-white/70 px-2.5 py-2 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40";

export function SearchSelect({ value, onChange, options, placeholder = "— select —", multiple = false, invalid = false }: {
  value: string | string[];
  onChange: (v: string | string[]) => void;
  options: SSOption[];
  placeholder?: string;
  multiple?: boolean;
  invalid?: boolean;
}) {
  const searchable = options.length > SEARCHABLE_AT;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => { if (open) { setQ(""); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const sel = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return options.filter((o) => !t || o.label.toLowerCase().includes(t) || (o.sub ?? "").toLowerCase().includes(t) || o.value.toLowerCase().includes(t));
  }, [options, q]);

  const toggle = (v: string) => {
    if (multiple) {
      const arr = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
      onChange(arr);
    } else {
      onChange(v);
      setOpen(false);
    }
  };

  /* ---- short list → native select ---- */
  if (!searchable) {
    if (multiple) {
      return (
        <div className="max-h-[180px] overflow-y-auto rounded-[3px] border border-line-400 bg-white/70">
          {options.map((o) => {
            const on = sel.includes(o.value);
            return (
              <label key={o.value} className={`flex cursor-pointer items-center gap-2 px-2.5 py-1.5 font-mono text-[11px] transition-colors ${on ? "bg-pine-600/10 text-pine-700" : "text-ink-900 hover:bg-paper-200"}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(o.value)} className="h-3.5 w-3.5 cursor-pointer accent-pine-600" />
                <span className="font-semibold">{o.label}</span>
                {o.sub && <span className="ml-auto text-[9px] tracking-wider text-text-400 uppercase">{o.sub}</span>}
              </label>
            );
          })}
        </div>
      );
    }
    return (
      <select className={`${controlCls} cursor-pointer ${invalid ? "border-coral-500 ring-1 ring-coral-500/40" : ""}`} value={value as string} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}{o.sub ? ` · ${o.sub}` : ""}</option>)}
      </select>
    );
  }

  /* ---- long list → searchable dropdown ---- */
  const summary = sel.length === 0 ? placeholder
    : multiple
      ? (sel.length === 1 ? options.find((o) => o.value === sel[0])?.label ?? sel[0] : `${sel.length} selected`)
      : options.find((o) => o.value === sel[0])?.label ?? sel[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${controlCls} flex cursor-pointer items-center justify-between gap-2 text-left ${invalid ? "border-coral-500 ring-1 ring-coral-500/40" : ""} ${sel.length ? "" : "text-text-400/70"}`}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {multiple && sel.length > 0 && (
            <span className="rounded-sm bg-pine-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-paper-100">{sel.length}</span>
          )}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`text-text-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="anim-fade-up absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-[0_18px_44px_rgba(12,25,19,0.28)]">
          <div className="border-b border-line-300 bg-paper-200 p-2">
            <div className="relative">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-400">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Filter ${options.length} entries…`}
                className="w-full rounded-[3px] border border-line-400 bg-white/80 py-1.5 pr-2 pl-8 font-mono text-[11px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">
              <span>{filtered.length} of {options.length}</span>
              {multiple && (
                <span className="flex gap-2">
                  <button type="button" onClick={() => onChange(filtered.map((o) => o.value))} className="cursor-pointer text-pine-600 hover:underline">select all shown</button>
                  <button type="button" onClick={() => onChange([])} className="cursor-pointer text-coral-600 hover:underline">clear</button>
                </span>
              )}
            </div>
          </div>
          <ul className="max-h-[240px] overflow-y-auto py-1">
            {filtered.map((o) => {
              const on = sel.includes(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors ${on ? "bg-pine-600/12" : "hover:bg-paper-200"}`}
                  >
                    {multiple && (
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border transition-colors ${on ? "border-pine-600 bg-pine-600 text-paper-100" : "border-line-400 bg-white"}`}>
                        {on && <IconCheck size={10} />}
                      </span>
                    )}
                    <span className={`min-w-0 flex-1 truncate text-[11.5px] font-semibold ${on ? "text-pine-700" : "text-ink-900"}`}>{o.label}</span>
                    {o.sub && <span className="shrink-0 font-mono text-[9px] tracking-wider text-text-400 uppercase">{o.sub}</span>}
                    {!multiple && on && <IconCheck size={13} className="shrink-0 text-pine-600" />}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center font-mono text-[10px] text-text-400">— no matches —</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
