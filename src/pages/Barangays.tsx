import { useMemo } from "react";
import { useStore } from "../state/store";
import { PageHeader, Reveal, CountUp, CornerTicks } from "../components/ui";
import { IconBarangay, IconPin, IconLayers, IconArrow } from "../components/icons";
import BarangayRegistry from "../components/BarangayRegistry";

export default function Barangays({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { barangays, records } = useStore();

  const stats = useMemo(() => {
    const linked = new Set<string>();
    let refs = 0;
    records.forEach((r) => r.location.barangays.forEach((b) => { linked.add(b); refs++; }));
    const sources = new Set(barangays.map((b) => b.dataSource)).size;
    const multi = records.filter((r) => r.location.barangays.length > 1).length;
    return { linked: linked.size, refs, sources, multi };
  }, [barangays, records]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-BRG-05"
        title="Barangay Registry"
        subtitle="The administrative basis of every project location. Each barangay carries its Ten-Digit PSGC Code, name and Data Source, is fully editable and removable, and drives the barangay-coverage location model, the spatial join in Lot & ROW Analysis, and the map labels."
      />

      {/* stat strip */}
      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-4">
          {[
            { k: "Registered barangays", node: <CountUp value={barangays.length} />, s: "brgy_registry rows", icon: <IconBarangay size={17} /> },
            { k: "Referenced by projects", node: <CountUp value={stats.linked} />, s: `${stats.refs} coverage links`, icon: <IconLayers size={17} /> },
            { k: "Multi-barangay projects", node: <CountUp value={stats.multi} />, s: "vast / spanning works", icon: <IconPin size={17} /> },
            { k: "Distinct data sources", node: <CountUp value={stats.sources} />, s: "PSG · NAMRIA · LGU", icon: <IconArrow size={17} /> },
          ].map((x) => (
            <div key={x.k} className="group bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">{x.k}</p>
                <span className="text-amber-500/60 transition-colors group-hover:text-amber-400">{x.icon}</span>
              </div>
              <p className="font-display mt-1.5 text-4xl leading-none font-bold text-paper-100">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* how it powers the system */}
      <Reveal className="mt-4" delay={60}>
        <div className="relative overflow-hidden rounded-[4px] border border-line-300 bg-paper-100">
          <CornerTicks color="border-ink-800/40" />
          <div className="grid gap-px bg-line-300 sm:grid-cols-3">
            {[
              { n: "01", t: "Project location basis", d: "A project's location is encoded directly by barangay — one or many. The registry is the source of truth behind every coverage chip and the tier-3 centroid pin." },
              { n: "02", t: "Spatial join target", d: "Uploaded lots are joined to their barangay by centroid proximity against this registry, so Lot & ROW Analysis attributes every affected parcel to a barangay." },
              { n: "03", t: "Editable & guarded", d: "Encode, rename, relocate or remove entries. Renames propagate to linked records; removals unlink with a warning. Deletion requires ADMIN mode (top bar)." },
            ].map((c) => (
              <div key={c.n} className="group bg-paper-100 px-4 py-4 transition-colors hover:bg-amber-500/[0.06]">
                <p className="font-display text-[15px] font-bold text-amber-600/70 transition-colors group-hover:text-amber-600">{c.n}</p>
                <p className="mt-1 text-[13px] font-semibold text-ink-900">{c.t}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-text-600">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* the registry */}
      <Reveal className="mt-4 pb-2" delay={120}>
        <BarangayRegistry onLocate={onLocate} />
      </Reveal>
    </div>
  );
}
