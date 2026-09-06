/* Buffer control — slider ⇄ custom numeric input, two-way synced.
   Drag the slider or type an exact custom radius; both commit to the
   same store value, so every consumer (map corridor, ROW stats) updates live. */

import { useEffect, useState } from "react";

export default function BufferControl({ value, onChange, min = 1, max = 60, step = 0.5, compact = false }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);

  const commitText = (raw: string) => {
    const n = parseFloat(raw);
    if (isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n * 2) / 2)));
    else setText(String(value));
  };

  const clamped = Math.min(max, Math.max(min, value));
  const pct = ((clamped - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
      {!compact && <label className="shrink-0 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">Buffer ±</label>}
      <input
        type="range" min={min} max={max} step={step} value={clamped}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="rpis-slider min-w-0 flex-1"
        style={{ "--track": `linear-gradient(90deg, #f0a32b ${pct}%, #cbd4c2 ${pct}%)` } as React.CSSProperties}
        aria-label="Corridor buffer radius"
      />
      <div className="relative shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          inputMode="decimal"
          className="w-[64px] rounded-[3px] border border-line-400 bg-white/80 py-1 pr-6 pl-2 text-right font-mono text-[11px] font-bold text-ink-900 transition-colors focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
          title="Custom buffer in meters — syncs with the slider"
        />
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[9px] font-bold text-text-400">m</span>
      </div>
    </div>
  );
}
