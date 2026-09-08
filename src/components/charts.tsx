import { useEffect, useRef, useState } from "react";
import { prefersReduced } from "./ui";

function useDivOnScreen(threshold = 0.35): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(prefersReduced());
  useEffect(() => {
    if (on) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setOn(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [on, threshold]);
  return [ref, on];
}

function useUlOnScreen(threshold = 0.35): [React.RefObject<HTMLUListElement>, boolean] {
  const ref = useRef<HTMLUListElement>(null);
  const [on, setOn] = useState(prefersReduced());
  useEffect(() => {
    if (on) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setOn(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [on, threshold]);
  return [ref, on];
}

export function AreaChart({ points, height = 230, unit = "km" }: {
  points: { year: number; km: number }[]; height?: number; unit?: string;
}) {
  const [ref, on] = useDivOnScreen();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 230, padL = 42, padB = 26, padT = 14, padR = 14;
  const max = Math.ceil(Math.max(...points.map((p) => p.km)) * 1.15);
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.km).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  const ticks = 4;

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="paveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e7a58" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1e7a58" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (max / ticks) * i;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#cbd4c2" strokeWidth="1" strokeDasharray={i ? "3 4" : undefined} />
              <text x={padL - 7} y={y(v) + 3.5} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="#71826f">{v.toFixed(0)}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#paveFill)" />
        <path d={path} fill="none" stroke="#175c43" strokeWidth="2.5"
          strokeDasharray={on ? undefined : 900} strokeDashoffset={on ? 0 : 900}
          className={on && !prefersReduced() ? "anim-draw" : undefined} style={{ ["--dash" as string]: 900 }} />
        {points.map((p, i) => (
          <g key={p.year}>
            <rect x={x(i) - 22} y={padT} width={44} height={H - padT - padB} fill="transparent" onMouseEnter={() => setHover(i)} />
            <circle cx={x(i)} cy={y(p.km)} r={hover === i ? 5 : 3.2} fill={hover === i ? "#f0a32b" : "#175c43"} stroke="#f5f7f0" strokeWidth="1.5" style={{ transition: "r 0.15s" }} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="#71826f">{p.year}</text>
          </g>
        ))}
        {hover !== null && (
          <g>
            <rect x={Math.min(Math.max(x(hover) - 42, padL), W - padR - 84)} y={y(points[hover].km) - 34} width={84} height={24} rx={3} fill="#0c1913" />
            <text x={Math.min(Math.max(x(hover), padL + 42), W - padR - 42)} y={y(points[hover].km) - 18} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="#ffc24d" fontWeight="700">
              {points[hover].km} {unit} · {points[hover].year}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function Donut({ data, size = 172, thickness = 22, centerLabel, centerSub }: {
  data: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; centerLabel: string; centerSub?: string;
}) {
  const [ref, on] = useDivOnScreen();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div ref={ref} className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} />
          {data.map((d) => {
            const frac = d.value / total;
            const dash = frac * C;
            const offset = -acc * C;
            acc += frac;
            return (
              <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color} strokeWidth={thickness}
                strokeDasharray={`${on ? dash - 1.5 : 0.01} ${C}`} strokeDashoffset={offset}
                style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
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
          <li key={d.label} className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-paper-300/75 uppercase">
            <i className="h-2 w-2 rounded-[2px]" style={{ background: d.color }} />
            {d.label}
            <b className="ml-1 text-paper-100">₱{d.value.toFixed(1)}M</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ data, unit = "₱M" }: { data: { label: string; value: number; color: string }[]; unit?: string }) {
  const [ref, on] = useUlOnScreen();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul ref={ref} className="space-y-2.5">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between font-mono text-[10px] tracking-wider uppercase">
            <span className="font-semibold text-ink-900">{d.label}</span>
            <span className="tabular text-text-600">{d.value.toFixed(1)} {unit}</span>
          </div>
          <div className="mt-1 h-[9px] overflow-hidden rounded-[2px] bg-ink-900/10">
            <div className="h-full rounded-[2px]" style={{
              width: on ? `${(d.value / max) * 100}%` : "0%",
              background: d.color,
              transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
            }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StackedBar({ data }: { data: { label: string; km: number; color: string }[] }) {
  const [ref, on] = useDivOnScreen();
  const total = data.reduce((s, d) => s + d.km, 0) || 1;
  return (
    <div ref={ref}>
      <div className="flex h-[16px] overflow-hidden rounded-[2px] border border-ink-800/40">
        {data.map((d, i) => (
          <div key={d.label} title={`${d.label} · ${d.km} km`} style={{
            width: on ? `${(d.km / total) * 100}%` : "0%",
            background: d.color,
            transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms`,
          }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {data.map((d) => (
          <p key={d.label} className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-text-600 uppercase">
            <i className="h-2 w-2 rounded-[2px]" style={{ background: d.color }} />
            {d.label} <b className="tabular text-ink-900">{d.km} km</b>
            <span className="text-text-400">· {((d.km / total) * 100).toFixed(0)}%</span>
          </p>
        ))}
      </div>
    </div>
  );
}
