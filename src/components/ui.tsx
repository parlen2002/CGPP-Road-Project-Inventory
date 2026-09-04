import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Condition, RoadClass, Surface } from "../data/roads";

/* ---------------- meta maps ---------------- */

export const conditionMeta: Record<Condition, { color: string; soft: string }> = {
  Good: { color: "#1e7a58", soft: "rgba(30,122,88,0.13)" },
  Fair: { color: "#d18a14", soft: "rgba(240,163,43,0.16)" },
  Poor: { color: "#de5a36", soft: "rgba(222,90,54,0.14)" },
};

export const classMeta: Record<RoadClass, { color: string; weight: number }> = {
  City: { color: "#5f7d6b", weight: 3 },
  National: { color: "#5a7263", weight: 2 }, // DPWH reference — muted
};

export const surfaceMeta: Record<Surface, string> = {
  Concrete: "#CBD4C2",
  Asphalt: "#9DB8A6",
  Gravel: "#F0A32B",
  Earth: "#DE5A36",
};

/* ---------------- formatters ---------------- */

export const fmtNum = (n: number, d = 1) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtM = (m: number) => `₱${fmtNum(m, 1)}M`;

export const fmtFull = (m: number) =>
  `₱${(m * 1_000_000).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

export const fmtCoord = (v: number) => v.toFixed(5);

export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- scroll reveal ---------------- */

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) { setInView(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- count-up ---------------- */

export function CountUp({ value, decimals = 0, prefix = "", suffix = "", className = "" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(prefersReduced() ? value : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) { setDisplay(value); return; }
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 1300;
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        setDisplay(value * eased);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {prefix}{display.toLocaleString("en-PH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

/* ---------------- corner ticks (survey marks) ---------------- */

export function CornerTicks({ color = "border-amber-500/70" }: { color?: string }) {
  const c = "pointer-events-none absolute h-3 w-3 " + color;
  return (
    <span aria-hidden>
      <i className={`${c} -top-px -left-px border-t-2 border-l-2`} />
      <i className={`${c} -top-px -right-px border-t-2 border-r-2`} />
      <i className={`${c} -bottom-px -left-px border-b-2 border-l-2`} />
      <i className={`${c} -bottom-px -right-px border-b-2 border-r-2`} />
    </span>
  );
}

/* ---------------- sheet header (drawing title block) ---------------- */

export function PageHeader({ sheet, title, subtitle, drawnBy = "OCE-GIS UNIT" }: {
  sheet: string; title: string; subtitle: string; drawnBy?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const cells: [string, string][] = [
    ["DWG NO.", sheet], ["REV", "C"], ["SCALE", "NTS"],
    ["DRAWN", drawnBy], ["CHECKED", "ENGR. R. VILLANUEVA"], ["DATE", today],
  ];
  return (
    <header className="anim-fade-up">
      <div className="flex items-end justify-between gap-6 border-2 border-ink-800 bg-paper-100">
        <div className="min-w-0 px-5 py-4 sm:px-7">
          <p className="font-mono text-[10px] tracking-[0.22em] text-amber-600 uppercase">
            Office of the City Engineer · Puerto Princesa City
          </p>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-wide text-ink-900 uppercase sm:text-[52px]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-600">{subtitle}</p>
        </div>
        <div className="hidden shrink-0 border-l-2 border-ink-800 md:block">
          <div className="grid grid-cols-3">
            {cells.map(([k, v], i) => (
              <div
                key={k}
                className={`min-w-[104px] px-3 py-2 ${i % 3 !== 2 ? "border-r border-line-400" : ""} ${i < 3 ? "border-b border-line-400" : ""}`}
              >
                <p className="font-mono text-[9px] tracking-[0.18em] text-text-400">{k}</p>
                <p className="font-mono text-[11px] font-semibold text-ink-800">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex h-1.5">
        <span className="w-1/2 bg-amber-500" />
        <span className="w-1/4 bg-pine-600" />
        <span className="w-1/6 bg-ink-800" />
        <span className="flex-1 bg-coral-500" />
      </div>
    </header>
  );
}

/* ---------------- badges ---------------- */

export function StatusPill({ label, color, soft }: { label: string; color: string; soft: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[3px] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase"
      style={{ color, background: soft, boxShadow: `inset 0 0 0 1px ${color}44` }}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function Chip({ active, onClick, children, count }: {
  active?: boolean; onClick?: () => void; children: ReactNode; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex cursor-pointer items-center gap-2 rounded-[3px] border px-2.5 py-1.5 font-mono text-[10.5px] font-medium tracking-wider uppercase transition-all duration-200 ${
        active
          ? "border-amber-500 bg-amber-500/15 text-amber-500 shadow-[0_0_0_1px_rgba(240,163,43,0.25)]"
          : "border-line-400/60 bg-ink-900/60 text-paper-300 hover:border-amber-500/50 hover:text-amber-300"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`rounded-sm px-1 text-[9.5px] ${active ? "bg-amber-500/20" : "bg-ink-700 text-paper-300/70"}`}>{count}</span>
      )}
    </button>
  );
}
