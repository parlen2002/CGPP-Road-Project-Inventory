import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "./components/TopBar";
import Sidebar, { type PageId } from "./components/Sidebar";
import type { Focus } from "./components/MapView";
import Overview from "./pages/Overview";
import Inventory from "./pages/Inventory";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import LotAnalysis from "./pages/LotAnalysis";
import System from "./pages/System";
import { statusOf } from "./data/registry";
import { useStore } from "./state/store";
import { type Road } from "./data/roads";
import { Seal } from "./components/icons";
import { Toaster } from "./components/toast";

function Ticker() {
  const { records } = useStore();
  const items = [
    ...records
      .filter((r) => { const l = statusOf(r).label; return l === "Ongoing" || l === "Delayed"; })
      .sort((a, b) => b.percent - a.percent)
      .map((r) => ({
        text: `${r.id} ${r.name} — ${r.percent}% · ${statusOf(r).label}`,
        alert: statusOf(r).label === "Delayed",
      })),
    { text: "PCI survey window opens Mar 02 for northern district — Materials & Testing Unit", alert: false },
    { text: "OCE-IF-2026-005 Libis Coastal Rd Shoulder — bid opening Mar 18, 10:00 BAC Conference Room", alert: false },
    { text: "PostGIS nightly normalize — 0 topology errors · ST_SnapToGrid(geom, 1e-6)", alert: false },
  ];
  const row = (key: string) => (
    <span key={key} className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase">
          <span className={`mx-4 h-1.5 w-1.5 rounded-full ${it.alert ? "bg-coral-500" : "bg-amber-500/70"}`} />
          <span className={it.alert ? "text-coral-400" : "text-paper-300/75"}>{it.text}</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className="relative z-20 flex h-7 shrink-0 items-center overflow-hidden border-b border-ink-700 bg-ink-950">
      <span className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-ink-700 bg-ink-900 px-3 font-mono text-[9px] font-bold tracking-[0.2em] text-amber-400 uppercase">
        <span className="dot-live h-1.5 w-1.5 rounded-full bg-coral-500" /> Field wire
      </span>
      <div className="flex w-max" style={{ animation: "ticker-scroll 46s linear infinite" }}>
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t-2 border-ink-800 bg-ink-950">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2.5 text-amber-400">
          <Seal size={26} />
          <span className="leading-none">
            <span className="font-display block text-[15px] font-bold tracking-wide text-paper-100 uppercase">Office of the City Engineer</span>
            <span className="mt-0.5 block font-mono text-[8.5px] tracking-[0.22em] text-paper-300/50 uppercase">Puerto Princesa City · Palawan · Republic of the Philippines</span>
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] tracking-[0.14em] uppercase">
          {["Django 6.1", "PostGIS 3.5", "GDAL 3.10", "GeoServer WMS", "EPSG:4326 / 3857"].map((t) => (
            <span key={t} className="rounded-[3px] border border-ink-600 px-2 py-1 text-paper-300/60 transition-colors hover:border-amber-500/50 hover:text-amber-400">{t}</span>
          ))}
        </div>
        <p className="ml-auto font-mono text-[9px] tracking-[0.14em] text-paper-300/40 uppercase">
          RPIS v3.0 · Rev C · © 2026 OCE GIS Unit
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState<PageId>("overview");
  const [focus, setFocus] = useState<Focus | null>(null);
  const [invQuery, setInvQuery] = useState("");
  const [invSelected, setInvSelected] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [page]);

  const navigate = useCallback((p: PageId) => setPage(p), []);

  const locate = useCallback((point: [number, number], zoom = 15) => {
    setFocus({ point, zoom, key: Date.now() });
    setPage("overview");
  }, []);

  const locateRoad = useCallback((road: Road) => {
    const mid = road.geometry[Math.floor(road.geometry.length / 2)];
    locate(mid, 15);
  }, [locate]);

  const openInventory = useCallback((roadId: string) => {
    setInvSelected(roadId);
    setInvQuery("");
    setPage("inventory");
  }, []);

  const search = useCallback((q: string) => {
    setInvQuery(q);
    setPage("inventory");
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-paper-200">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSearch={search} />
        <Ticker />
        <main ref={mainRef} className="bg-grid-light flex-1 overflow-y-auto">
          {page === "overview" && <Overview focus={focus} onLocate={locate} onOpenInventory={openInventory} />}
          {page === "inventory" && (
            <Inventory query={invQuery} selectedId={invSelected} onSelect={setInvSelected} onLocate={locateRoad} />
          )}
          {page === "projects" && <Projects onLocate={locate} onOpenRoad={openInventory} />}
          {page === "cadastre" && <LotAnalysis onLocate={locate} />}
          {page === "analytics" && <Analytics />}
          {page === "system" && <System />}
          <Footer />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
