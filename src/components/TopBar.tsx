import { useEffect, useState } from "react";
import { Seal, IconSearch } from "./icons";

function useManilaClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function TopBar({ onSearch }: { onSearch: (q: string) => void }) {
  const now = useManilaClock();
  const [q, setQ] = useState("");
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Manila",
  }).format(now);
  const date = new Intl.DateTimeFormat("en-PH", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila",
  }).format(now);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b-2 border-amber-500/80 bg-ink-950 px-4 sm:px-5">
      {/* wordmark */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-amber-500/60 bg-ink-800 text-amber-400">
          <Seal size={24} />
        </span>
        <div className="min-w-0 leading-none">
          <p className="font-display truncate text-[17px] font-bold tracking-wide text-paper-100 uppercase">
            Puerto Princesa <span className="text-amber-400">City Engineering</span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.24em] text-paper-300/60 uppercase">
            Road Project Inventory System · RPIS v2.4
          </p>
        </div>
      </div>

      {/* search */}
      <form
        className="relative ml-2 hidden max-w-md flex-1 md:block"
        onSubmit={(e) => { e.preventDefault(); onSearch(q); }}
      >
        <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-paper-300/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search road, barangay, or project code…"
          className="w-full rounded-[3px] border border-ink-600 bg-ink-900 py-1.5 pr-16 pl-9 font-mono text-[11.5px] text-paper-100 placeholder:text-paper-300/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
        />
        <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-[2px] border border-ink-600 px-1.5 py-0.5 font-mono text-[9px] text-paper-300/50">
          ⏎ INV
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* postgis status */}
        <div className="hidden items-center gap-2 rounded-[3px] border border-ink-600 bg-ink-900 px-2.5 py-1.5 lg:flex">
          <span className="relative flex h-2 w-2">
            <span className="ring-ping absolute inline-flex h-full w-full rounded-full bg-pine-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pine-400" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-paper-300/85">POSTGIS · CONNECTED</span>
        </div>

        {/* clock */}
        <div className="hidden text-right leading-none sm:block">
          <p className="font-mono text-[13px] font-semibold text-amber-300 tabular">{time} <span className="text-[9px] text-paper-300/50">PHT</span></p>
          <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-paper-300/55 uppercase">{date}</p>
        </div>

        {/* user */}
        <div className="flex items-center gap-2.5 border-l border-ink-700 pl-3 sm:pl-4">
          <span className="grid h-8 w-8 place-items-center rounded-[3px] bg-amber-500 font-display text-[13px] font-bold text-ink-950">
            MS
          </span>
          <div className="hidden leading-none xl:block">
            <p className="text-[11.5px] font-semibold text-paper-100">Engr. M. Santos</p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-paper-300/55 uppercase">OIC · Roads Division</p>
          </div>
        </div>
      </div>
    </header>
  );
}
