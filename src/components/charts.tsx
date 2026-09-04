import { useEffect, useRef, useState } from "react";
import { prefersReduced } from "./ui";

function useMounted(delay = 80) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), prefersReduced() ? 0 : delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on;
}

/* ---------- donut ---------- */
export function Donut({ data, size = 168, thickness = 20, centerLabel, centerSub }: {
  data: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; centerLabel: string; centerSub?: string;
}) {
  const on = useMounted();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} />
          {data.map((d) => {
            const frac = d.value / total;
            const dash = frac * C;
            const offset = -acc * C;
            acc += frac;
            return (
              <circle
                key={d.label}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color} strokeWidth={thickness}
                strokeDasharray={`${on ? dash - 1.5 : 0.01} ${C}`}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-display text-[26px] leading-none font-bold text-paper-100">{centerLabel}</p>
            {centerSub && <p className="mt-1 font-mono text-[9.5px] tracking-[0.16em] text-paper-300/60 uppercase">{centerSub}</p>}
          </div>
        </div>
      </div>
      <ul className="ml-auto space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 font-mono text-[11px] text-paper-300/85">
            <i className="h-2 w-2 rounded-[2px]" style={{ background: d.color }} />
            <span className="w-20">{d.label}</span>
            <span className="tabular ml-2 font-semibold text-paper-100">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- horizontal bars (light surface) ---------- */
export function HBars({ data, unit = "km", maxHint }: {
  data: { label: string; value: number; color?: string; sub?: string }[];
  unit?: string; maxHint?: number;
}) {
  const on = useMounted(150);
  const max = maxHint ?? Math.max(...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-[12.5px] font-medium text-text-900">{d.label}
              {d.sub && <span className="ml-2 font-mono text-[10px] text-text-400">{d.sub}</span>}
            </span>
            <span className="font-mono text-[11.5px] font-semibold text-ink-800 tabular">
              {d.value.toLocaleString("en-PH")} <span className="text-[9.5px] font-normal text-text-400">{unit}</span>
            </span>
          </div>
          <div className="relative h-[9px] overflow-hidden rounded-[2px] bg-ink-900/8">
            <span className="absolute inset-y-0 left-0 grid grid-flow-col opacity-40"
              style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 14px)" }} />
            <div
              className="relative h-full rounded-[2px] transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:brightness-110"
              style={{
                width: on ? `${(d.value / max) * 100}%` : "0%",
                background: d.color ?? "#1e7a58",
                transitionDelay: `${i * 90}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- area chart (paved km growth) ---------- */
export function AreaChart({ points, height = 200, unit = "km" }: {
  points: { year: number; km: number }[]; height?: number; unit?: string;
}) {
  const on = useMounted(120);
  const ref = useRef<HTMLDivElement>(null);
  const W = 640;
  const H = height;
  const padL = 34, padR = 14, padT = 16, padB = 26;
  const min = Math.min(...points.map((p) => p.km)) * 0.86;
  const max = Math.max(...points.map((p) => p.km)) * 1.04;
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.km).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  const [hover, setHover] = useState<number | null>(null);
  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0a32b" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#f0a32b" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridYs.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(21,35,28,0.09)" strokeDasharray="3 5" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#71826f" fontFamily="IBM Plex Mono, monospace">
              {v.toFixed(0)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#areaFill)" className="anim-fade-in" style={{ animationDelay: "0.5s", animationFillMode: "both" }} />
        <path
          d={line} fill="none" stroke="#d18a14" strokeWidth="2.4" strokeLinecap="round"
          style={{ strokeDasharray: 900, strokeDashoffset: on ? 0 : 900, transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {points.map((p, i) => (
          <g key={p.year}>
            <rect
              x={x(i) - (W / points.length) / 2} y={padT} width={W / points.length} height={H - padT - padB}
              fill="transparent" onMouseEnter={() => setHover(i)}
            />
            <circle
              cx={x(i)} cy={y(p.km)} r={hover === i ? 5 : 3.4}
              fill={hover === i ? "#f0a32b" : "#15231c"} stroke="#f0a32b" strokeWidth="1.8"
              style={{ transition: "r 0.15s" }}
            />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#71826f" fontFamily="IBM Plex Mono, monospace">
              {String(p.year).slice(2)}
            </text>
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-[3px] border border-ink-800 bg-ink-900 px-2.5 py-1.5 font-mono text-[10.5px] text-paper-100 shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-amber-400">{points[hover].year}</span> · {points[hover].km.toFixed(1)} {unit} paved
        </div>
      )}
    </div>
  );
}

/* ---------- stacked bar ---------- */
export function StackedBar({ data }: { data: { label: string; km: number; color: string }[] }) {
  const on = useMounted(200);
  const total = data.reduce((s, d) => s + d.km, 0);
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-[3px] ring-1 ring-ink-800/15">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="h-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] first:rounded-l-[2px] last:rounded-r-[2px] hover:brightness-110"
            style={{ width: on ? `${(d.km / total) * 100}%` : "0%", background: d.color, transitionDelay: `${i * 110}ms` }}
            title={`${d.label}: ${d.km} km`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-[2px]" style={{ background: d.color }} />
            <span className="text-[11.5px] text-text-600">{d.label}</span>
            <span className="ml-auto font-mono text-[11px] font-semibold text-ink-900 tabular">{d.km}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- sparkline ---------- */
export function Sparkline({ values, width = 120, height = 34, color = "#ffc24d" }: {
  values: number[]; width?: number; height?: number; color?: string;
}) {
  const on = useMounted(250);
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (width - 4) + 2,
    height - 3 - ((v - min) / (max - min || 1)) * (height - 8),
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"
        style={{ strokeDasharray: 300, strokeDashoffset: on ? 0 : 300, transition: "stroke-dashoffset 1.4s ease 0.3s" }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}
