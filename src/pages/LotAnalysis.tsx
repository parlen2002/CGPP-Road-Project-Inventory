import { useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker } from "react-leaflet";
import { PageHeader, Reveal, CornerTicks, CountUp } from "../components/ui";
import { useStore, setParcels, resetCadastre, addCenterline, updateCenterline, deleteCenterline } from "../state/store";
import { runROWAnalysis, type Parcel, type Centerline, type AffectedLot } from "../data/cadastre";
import { parseKML, parseGPX, parseGeoJSON, parseSHP, parseDBF, readText, readBuffer, detectKind, type LotFeature } from "../lib/vectorFormats";
import { fmtArea, lineLengthM, fmtKm, polygonAreaM2, type LatLng as GeoLatLng } from "../lib/geo";
import { fmtPesoM } from "../data/registry";
import { toast } from "../components/toast";
import ConfirmDialog from "../components/confirm";
import { IconUpload, IconTrash, IconPin, IconDownload } from "../components/icons";

type Tab = "cadastre" | "centerlines" | "affected";

export default function LotAnalysis({ onLocate }: { onLocate: (p: [number, number], zoom?: number) => void }) {
  const { parcels, centerlines, records, barangays } = useStore();
  const [tab, setTab] = useState<Tab>("cadastre");
  const [activeCl, setActiveCl] = useState<string | null>(centerlines[0]?.id ?? null);
  const [delCl, setDelCl] = useState<Centerline | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shpRings = useRef<GeoLatLng[][] | null>(null);
  const dbfRef = useRef<LotFeature["props"][] | null>(null);

  const cl = centerlines.find((c) => c.id === activeCl) ?? centerlines[0] ?? null;
  const analysis = useMemo(() => (cl ? runROWAnalysis(parcels, cl) : null), [parcels, cl]);

  const ingestLots = (lots: LotFeature[], source: string) => {
    const govWords = ["city", "government", "denr", "dpwh", "national", "public"];
    const next: Parcel[] = lots.map((l, i) => {
      const owner = String(l.props.OWNER ?? l.props.owner ?? l.props.NAME ?? l.props.name ?? `Lot owner ${i + 1}`);
      const gov = govWords.some((w) => owner.toLowerCase().includes(w));
      const lat = l.ring.reduce((s, p) => s + p[0], 0) / l.ring.length;
      const lng = l.ring.reduce((s, p) => s + p[1], 0) / l.ring.length;
      /* nearest-barangay spatial join */
      let brgy = "—";
      let bd = Infinity;
      for (const b of barangays) {
        const d = (b.lat - lat) ** 2 + (b.lng - lng) ** 2;
        if (d < bd) { bd = d; brgy = b.name; }
      }
      const declaredArea = Number(l.props.AREA ?? l.props.area ?? 0);
      return {
        id: `LOT-UP-${String(i + 1).padStart(3, "0")}`,
        ring: l.ring,
        owner,
        ownerType: gov ? "Government" as const : "Private" as const,
        barangay: brgy,
        areaM2: Math.round(declaredArea > 0 ? declaredArea : polygonAreaM2(l.ring)),
        valuePerM2: gov ? 0 : Number(l.props.ZONAL ?? l.props.zonal ?? 5000),
      };
    });
    setParcels(next);
    toast(`${next.length} parcels loaded`, "saved", `cadastre basis from ${source} · joined to barangay boundaries`);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const kind = detectKind(file);
      try {
        if (kind === "kml" || kind === "gpx") {
          const lines = kind === "kml" ? parseKML(await readText(file)) : parseGPX(await readText(file));
          lines.forEach((ln) => addCenterline({ name: ln.name, source: kind === "kml" ? "KML" : "GPX", ref: file.name, projectId: null, radiusM: 6, line: ln.line }));
          toast(`${lines.length} centerline${lines.length > 1 ? "s" : ""} imported`, "saved", `${kind.toUpperCase()} · ${file.name}`);
        } else if (kind === "geojson") {
          const { lots, lines } = parseGeoJSON(await readText(file));
          if (lots.length) ingestLots(lots, file.name);
          lines.forEach((ln) => addCenterline({ name: ln.name, source: "KML", ref: file.name, projectId: null, radiusM: 6, line: ln.line }));
        } else if (kind === "shp") {
          const rings = parseSHP(await readBuffer(file));
          shpRings.current = rings;
          const attrs = dbfRef.current;
          if (attrs) {
            ingestLots(rings.map((ring, i) => ({ ring, props: attrs[i] ?? {} })), file.name);
            shpRings.current = null; dbfRef.current = null;
          } else {
            toast("Shapefile read", "info", `${rings.length} polygons — now load the matching .dbf for attributes`);
          }
        } else if (kind === "dbf") {
          const rows = parseDBF(await readBuffer(file));
          dbfRef.current = rows;
          const rings = shpRings.current;
          if (rings) {
            ingestLots(rings.map((ring, i) => ({ ring, props: rows[i] ?? {} })), "SHP + DBF");
            shpRings.current = null; dbfRef.current = null;
          } else {
            toast("Attribute table read", "info", `${rows.length} rows — now load the matching .shp`);
          }
        } else {
          toast(file.name, "info", "Unsupported format — use KML, GPX, GeoJSON or SHP+DBF");
        }
      } catch (e) {
        toast(file.name, "info", e instanceof Error ? e.message : "Failed to parse file");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const rows = analysis?.rows ?? [];
  const govM2 = analysis?.govM2 ?? 0;
  const privM2 = analysis?.privM2 ?? 0;

  const TabBtn = ({ id, label, count }: { id: Tab; label: string; count: number }) => (
    <button onClick={() => setTab(id)}
      className={`relative cursor-pointer px-4 py-3 font-display text-lg font-bold tracking-wider uppercase transition-colors sm:text-xl ${
        tab === id ? "bg-paper-100 text-ink-900" : "bg-ink-800 text-paper-300/60 hover:text-paper-100"
      }`}>
      {label}
      <span className={`ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${tab === id ? "bg-amber-500 text-ink-950" : "bg-ink-950 text-amber-400"}`}>{count}</span>
      {tab === id && <span className="absolute inset-x-0 top-0 h-[3px] bg-amber-500" />}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-ROW-05"
        title="Lot & ROW Analysis"
        subtitle="QGIS cadastre overlaid with barangay boundaries; KML / GPX centerlines buffered parallel to the axis, clipped against lots to compute affected area and acquisition cost by government / private ownership."
      />

      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-4">
          {[
            { k: "Cadastral parcels", node: <CountUp value={parcels.length} />, s: "QGIS shapefile basis" },
            { k: "Centerlines", node: <CountUp value={centerlines.length} />, s: "KML · GPX · drawn" },
            { k: "Affected lots", node: <CountUp value={rows.length} />, s: cl ? `axis ${cl.id}` : "no axis selected" },
            { k: "ROW acquisition cost", node: <CountUp value={(analysis?.totalCost ?? 0) / 1e6} decimals={2} prefix="₱" suffix="M" />, s: "private land only" },
          ].map((x) => (
            <div key={x.k} className="bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">{x.k}</p>
              <p className="font-display mt-1.5 text-4xl leading-none font-bold text-paper-100">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-6" delay={60}>
        <div className="flex flex-wrap items-center overflow-hidden rounded-t-[4px] border-2 border-b-0 border-ink-800">
          <TabBtn id="cadastre" label="Cadastre" count={parcels.length} />
          <TabBtn id="centerlines" label="Centerlines" count={centerlines.length} />
          <TabBtn id="affected" label="Affected" count={rows.length} />
          <div className="ml-auto flex items-center gap-2 border-l-2 border-ink-800 bg-ink-900 px-3 py-2">
            <input ref={fileRef} type="file" multiple accept=".kml,.gpx,.geojson,.json,.shp,.dbf" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-2 rounded-[3px] bg-amber-500 px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-colors hover:bg-amber-400">
              <IconUpload size={13} /> Import KML / GPX / SHP
            </button>
            {tab === "cadastre" && (
              <button onClick={() => { resetCadastre(); toast("Sample cadastre restored", "info", `${""}generated parcels reloaded`); }}
                className="cursor-pointer rounded-[3px] border border-ink-600 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-paper-300/70 uppercase transition-colors hover:text-amber-400">
                Reset sample
              </button>
            )}
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 rounded-b-[4px] border-2 border-ink-800 bg-paper-100 p-4 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800">
            <MapContainer center={[9.742, 118.742]} zoom={13} className="h-[520px] w-full" scrollWheelZoom>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
              {parcels.map((p) => {
                const hit = rows.some((r) => r.lotId === p.id);
                return (
                  <Polygon key={p.id} positions={p.ring}
                    pathOptions={{ color: hit ? (p.ownerType === "Government" ? "#1e7a58" : "#de5a36") : "#47584d", weight: hit ? 2 : 1, fillColor: hit ? (p.ownerType === "Government" ? "#1e7a58" : "#de5a36") : "#9db8a6", fillOpacity: hit ? 0.35 : 0.12 }} />
                );
              })}
              {centerlines.map((c) => (
                <Polyline key={c.id} positions={c.line} eventHandlers={{ click: () => setActiveCl(c.id) }}
                  pathOptions={{ color: c.id === cl?.id ? "#f0a32b" : "#12897e", weight: c.id === cl?.id ? 3.5 : 2, opacity: c.id === cl?.id ? 1 : 0.6 }} />
              ))}
              {cl && analysis && (
                <Polygon positions={analysis.corridorRing}
                  pathOptions={{ color: "#f0a32b", weight: 1.5, fillColor: "#f0a32b", fillOpacity: 0.1, dashArray: "4 4" }} />
              )}
            </MapContainer>
            <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-[3px] border border-ink-600 bg-ink-900/90 px-3 py-1.5 font-mono text-[9px] tracking-wider text-paper-300 backdrop-blur">
              <span className="mr-3"><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-[#1e7a58]" />government</span>
              <span className="mr-3"><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-[#de5a36]" />private</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-[#f0a32b]" />corridor ±{cl?.radiusM ?? "—"} m</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          {tab === "cadastre" && (
            <div className="anim-fade-in">
              <p className="mb-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Cadastre · {parcels.length} parcels</p>
              <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
                {parcels.slice(0, 60).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-[3px] border border-line-300 bg-white/60 px-3 py-2 transition-colors hover:border-ink-800">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${p.ownerType === "Government" ? "bg-pine-500" : "bg-coral-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[10.5px] font-bold text-ink-900">{p.id}</p>
                      <p className="truncate text-[10px] text-text-600">{p.owner}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] font-semibold text-text-600">{fmtArea(p.areaM2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "centerlines" && (
            <div className="anim-fade-in">
              <p className="mb-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Centerlines · {centerlines.length}</p>
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {centerlines.map((c) => {
                  const rec = c.projectId ? records.find((r) => r.id === c.projectId) : null;
                  return (
                    <div key={c.id} onClick={() => setActiveCl(c.id)}
                      className={`cursor-pointer rounded-[3px] border p-3 transition-all ${c.id === cl?.id ? "border-amber-500 bg-amber-500/[0.07]" : "border-line-300 bg-white/60 hover:border-ink-800"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10.5px] font-bold text-ink-900">{c.id} · {c.name}</p>
                        <button onClick={(e) => { e.stopPropagation(); setDelCl(c); }}
                          className="cursor-pointer p-1 text-text-400 transition-colors hover:text-coral-600" title="Delete centerline">
                          <IconTrash size={12} />
                        </button>
                      </div>
                      <p className="mt-0.5 font-mono text-[9px] tracking-wider text-text-400 uppercase">via {c.source} · {c.ref} · {fmtKm(lineLengthM(c.line))}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="font-mono text-[8.5px] tracking-wider text-text-400 uppercase">Buffer ±</label>
                        <input type="range" min={3} max={20} step={1} value={c.radiusM}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateCenterline(c.id, { radiusM: parseInt(e.target.value, 10) })}
                          className="rpis-slider flex-1"
                          style={{ "--track": `linear-gradient(90deg, #f0a32b ${((c.radiusM - 3) / 17) * 100}%, #cbd4c2 ${((c.radiusM - 3) / 17) * 100}%)` } as React.CSSProperties} />
                        <span className="w-10 text-right font-mono text-[11px] font-bold text-ink-900">{c.radiusM} m</span>
                      </div>
                      <select value={c.projectId ?? ""} onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateCenterline(c.id, { projectId: e.target.value || null })}
                        className="mt-2 w-full cursor-pointer rounded-[3px] border border-line-400 bg-white/70 px-2 py-1.5 font-mono text-[10px] text-ink-900 focus:border-amber-600 focus:outline-none">
                        <option value="">— link to project record —</option>
                        {records.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.name}</option>)}
                      </select>
                      {rec && <p className="mt-1 font-mono text-[9px] text-pine-600">↳ linked · {rec.percent}% complete</p>}
                    </div>
                  );
                })}
                {centerlines.length === 0 && (
                  <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-4 font-mono text-[10px] leading-relaxed text-text-400">
                    No centerlines yet — import a KML / GPX from the field or QGIS to begin ROW analysis.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "affected" && (
            <div className="anim-fade-in">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Affected lots · {rows.length}</p>
                {cl && <button onClick={() => onLocate(cl.line[0], 15)} className="flex cursor-pointer items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-teal-500 uppercase hover:text-teal-400"><IconPin size={11} /> fly to axis</button>}
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div className="rounded-[3px] border border-pine-500/40 bg-pine-600/10 px-3 py-2">
                  <p className="font-mono text-[8px] tracking-[0.12em] text-pine-600 uppercase">Government affected</p>
                  <p className="font-display mt-0.5 text-xl leading-none font-bold text-pine-600">{fmtArea(govM2)}</p>
                </div>
                <div className="rounded-[3px] border border-coral-500/40 bg-coral-500/10 px-3 py-2">
                  <p className="font-mono text-[8px] tracking-[0.12em] text-coral-600 uppercase">Private affected</p>
                  <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtArea(privM2)}</p>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto rounded-[3px] border border-line-400">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-ink-900 text-paper-300">
                    <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8.5px] [&>th]:tracking-[0.12em] [&>th]:uppercase">
                      <th>Lot</th><th>Owner</th><th className="!text-right">Affected</th><th className="!text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-300">
                    {rows.map((x: AffectedLot) => (
                      <tr key={x.lotId} className="transition-colors hover:bg-ink-900/[0.04]">
                        <td className="px-2.5 py-1.5 font-mono text-[9.5px] font-bold text-ink-900">{x.lotId}</td>
                        <td className="px-2.5 py-1.5 text-[10px] text-text-600">
                          {x.owner}
                          <span className={`ml-1.5 rounded-[2px] px-1 py-0.5 font-mono text-[7.5px] font-bold uppercase ${x.ownerType === "Government" ? "bg-pine-600/15 text-pine-600" : "bg-coral-500/15 text-coral-600"}`}>{x.ownerType}</span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[10px] font-semibold text-ink-900">{fmtArea(x.affectedM2)}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[10px] font-bold" style={{ color: x.cost ? "#b84423" : "#1e7a58" }}>{x.cost ? fmtPesoM(x.cost) : "₱0"}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center font-mono text-[9.5px] text-text-400">Corridor does not intersect any registered lot.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {delCl && (
        <ConfirmDialog
          title="Delete centerline"
          sheet="centerlines · DELETE"
          confirmLabel="Delete axis"
          message={<p>Axis <b className="text-ink-900">{delCl.id}</b> ({delCl.name}) will be removed. Any linked project record will fall back to its geotag or barangay pin.</p>}
          onConfirm={() => { deleteCenterline(delCl.id); if (activeCl === delCl.id) setActiveCl(null); toast(delCl.name, "deleted", "centerline removed"); }}
          onClose={() => setDelCl(null)}
        />
      )}
    </div>
  );
}
