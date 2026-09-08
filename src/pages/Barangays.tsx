/* Barangays — registry stats plus the full BarangayRegistry component. */

import { useMemo } from "react";
import { PageHeader, Reveal, CountUp } from "../components/ui";
import BarangayRegistry from "../components/BarangayRegistry";
import { useStore } from "../state/store";

export default function Barangays({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { barangays, records } = useStore();

  const stats = useMemo(() => {
    const referenced = new Set<string>();
    let multi = 0;
    records.forEach((r) => {
      r.location.barangays.forEach((b) => referenced.add(b));
      if (r.location.barangays.length > 1) multi++;
    });
    return {
      referenced: referenced.size,
      multi,
      population: barangays.reduce((s, b) => s + b.population, 0),
      sources: new Set(barangays.map((b) => b.dataSource)).size,
    };
  }, [barangays, records]);

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-BRGY-07"
        title="Barangay Registry"
        subtitle="The administrative basis of every project location — all 66 official barangays of Puerto Princesa City per PSA PSGC, each carrying its Ten-Digit Code, name, data source, centroid and 2024 POPCEN population."
      />

      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-4">
          {[
            { k: "Registered barangays", node: <CountUp value={barangays.length} />, s: "PSA PSGC 2025 basis" },
            { k: "Referenced by projects", node: <CountUp value={stats.referenced} />, s: "in project coverage" },
            { k: "Multi-barangay projects", node: <CountUp value={stats.multi} />, s: "vast / spanning works" },
            { k: "Resident population 2024", node: <CountUp value={stats.population} />, s: "PSA POPCEN · all 66" },
          ].map((x) => (
            <div key={x.k} className="bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">{x.k}</p>
              <p className="font-display mt-1.5 text-4xl leading-none font-bold text-paper-100">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-4" delay={70}>
        <BarangayRegistry onLocate={onLocate} />
      </Reveal>
    </div>
  );
}
