import type { ReactNode } from "react";
import { IconMap, IconRoad, IconLayers, IconChart, IconStack } from "./icons";
import { roads } from "../data/roads";
import { projects } from "../data/projects";

export type PageId = "overview" | "inventory" | "projects" | "analytics" | "system";

const items: { id: PageId; label: string; icon: (p: { size?: number; className?: string }) => ReactNode; note: string }[] = [
  { id: "overview", label: "Overview", icon: (p) => <IconMap {...p} />, note: "MAP CONSOLE" },
  { id: "inventory", label: "Road Inventory", icon: (p) => <IconRoad {...p} />, note: `${roads.length} SEGMENTS` },
  { id: "projects", label: "Projects", icon: (p) => <IconLayers {...p} />, note: `${projects.length} RECORDS` },
  { id: "analytics", label: "Analytics", icon: (p) => <IconChart {...p} />, note: "FY 2019–2026" },
  { id: "system", label: "GIS Stack", icon: (p) => <IconStack {...p} />, note: "DJANGO 6.1" },
];

export default function Sidebar({ page, onNavigate }: { page: PageId; onNavigate: (p: PageId) => void }) {
  return (
    <aside className="relative z-20 flex w-[62px] shrink-0 flex-col border-r-2 border-ink-700 bg-ink-900 lg:w-60">
      {/* ambient contour lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]" preserveAspectRatio="none" viewBox="0 0 240 800">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M-20 ${90 + i * 128} C 60 ${40 + i * 128}, 120 ${150 + i * 128}, 260 ${70 + i * 128}`}
            fill="none" stroke="#3f6350" strokeWidth="1"
          />
        ))}
      </svg>

      <nav className="relative mt-4 flex-1 space-y-1 px-2.5 lg:px-3">
        <p className="mb-3 hidden px-2 font-mono text-[9px] tracking-[0.26em] text-paper-300/40 uppercase lg:block">
          Modules
        </p>
        {items.map((it) => {
          const active = page === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onNavigate(it.id)}
              className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-[3px] px-2.5 py-2.5 text-left transition-all duration-200 ${
                active ? "bg-ink-700/70 text-amber-400" : "text-paper-300/70 hover:bg-ink-800 hover:text-paper-100"
              }`}
            >
              <span className={`absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r bg-amber-500 transition-all duration-300 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`} />
              <span className="grid h-6 w-6 shrink-0 place-items-center">{it.icon({ size: 19 })}</span>
              <span className="hidden min-w-0 flex-1 lg:block">
                <span className="block text-[13px] leading-tight font-semibold">{it.label}</span>
                <span className={`mt-0.5 block font-mono text-[8.5px] tracking-[0.2em] ${active ? "text-amber-400/70" : "text-paper-300/35"}`}>
                  {it.note}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* stack status footer */}
      <div className="relative border-t border-ink-700 p-2.5 lg:p-3">
        <div className="hidden rounded-[3px] border border-ink-700 bg-ink-950/60 p-3 lg:block">
          <div className="flex items-center gap-2">
            <span className="dot-live h-1.5 w-1.5 rounded-full bg-pine-400" />
            <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/70 uppercase">Services nominal</p>
          </div>
          <ul className="mt-2.5 space-y-1.5 font-mono text-[9.5px] text-paper-300/55">
            <li className="flex justify-between"><span>Django</span><span className="text-amber-400">6.1.0</span></li>
            <li className="flex justify-between"><span>PostGIS</span><span className="text-amber-400">3.5.2</span></li>
            <li className="flex justify-between"><span>GDAL</span><span className="text-amber-400">3.10.1</span></li>
            <li className="flex justify-between"><span>GeoServer WMS</span><span className="text-pine-400">● UP</span></li>
          </ul>
        </div>
        <div className="mt-2 hidden lg:block">
          <div className="mb-1 flex justify-between font-mono text-[9px] tracking-[0.16em] text-paper-300/45 uppercase">
            <span>Index coverage</span><span className="text-amber-400">94%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-ink-700">
            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-pine-500 to-amber-500" />
          </div>
        </div>
        <p className="mt-2.5 text-center font-mono text-[8.5px] tracking-[0.18em] text-paper-300/30 uppercase lg:text-left">
          OCE · PPC GIS UNIT
        </p>
      </div>
    </aside>
  );
}
