import { useEffect, useState } from "react";
import { Seal, IconLock } from "./icons";
import { useStore, setAdmin } from "../state/store";
import { toast } from "./toast";

export default function TopBar() {
  const { admin } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Manila" });
  const date = now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Manila" });

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b-2 border-ink-800 bg-ink-900 px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[3px] border-2 border-amber-500 bg-ink-950 text-amber-400">
          <Seal size={24} />
        </span>
        <div className="hidden leading-tight md:block">
          <p className="font-display text-[17px] font-bold tracking-[0.08em] text-paper-100 uppercase">Road Project Inventory System</p>
          <p className="font-mono text-[8.5px] tracking-[0.24em] text-amber-400/90 uppercase">Office of the City Engineer · Puerto Princesa City</p>
        </div>
      </div>

      <span className="ml-auto" />

      <button
        onClick={() => {
          const next = !admin;
          setAdmin(next);
          toast(next ? "Admin mode enabled" : "Admin mode disabled", "info",
            next ? "uploaded-file & registry removal unlocked" : "records are now read-protected");
        }}
        title={admin ? "Program admin — removal unlocked. Click to lock." : "Read-only. Click to enable program admin."}
        className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[3px] border px-2.5 py-2 font-mono text-[9px] font-bold tracking-[0.14em] uppercase transition-all ${
          admin
            ? "border-amber-500 bg-amber-500/15 text-amber-400 shadow-[0_0_0_1px_rgba(240,163,43,0.3)]"
            : "border-ink-600 bg-ink-950/70 text-paper-300/50 hover:border-amber-500/40 hover:text-paper-300"
        }`}>
        <IconLock size={12} />
        {admin ? "Admin · on" : "Read-only"}
      </button>

      <div className="hidden shrink-0 items-center gap-1.5 rounded-[3px] border border-ink-600 bg-ink-950/70 px-2.5 py-1.5 sm:flex">
        <span className="dot-live h-2 w-2 rounded-full bg-pine-400" />
        <div className="leading-none">
          <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-pine-400 uppercase">PostGIS 3.5 · live</p>
          <p className="mt-0.5 font-mono text-[8.5px] tracking-[0.12em] text-paper-300/45 uppercase">rpis_db@10.11.4.2 · 4326</p>
        </div>
      </div>

      <div className="hidden shrink-0 text-right leading-tight lg:block">
        <p className="font-mono text-[13px] font-semibold text-amber-400 tabular">{time} PHT</p>
        <p className="font-mono text-[8.5px] tracking-[0.18em] text-paper-300/50 uppercase">{date} · UTC+8</p>
      </div>
    </header>
  );
}
