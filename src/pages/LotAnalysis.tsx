/* Lot & ROW Analysis — cadastre basis (SHP/DBF/GeoJSON/sample), centerline
   CRUD with synced buffer control, and the affected-lots register. */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { PageHeader, Reveal, CornerTicks } from "../components/ui";
import { useStore, setParcels, resetCadastre, addCenterline, updateCenterline, deleteCenterline } from "../state/store";
import { useAuth } from "../state/authStore";
import type { Parcel, Centerline } from "../data/cadastre";
import { generateSampleCadastral, runROWAnalysis } from "../data/cadastre";
import type { LotFeature } from "../lib/vectorFormats";
import { parseKML, parseGPX, parseGeoJSON, parseSHP, parseDBF, readText, readBuffer, detectKind } from "../lib/vectorFormats";
import { polygonAreaM2, fmtArea, lineLengthM, fmtKm, nearestBarangay, type LatLng as GeoLatLng } from "../lib/geo";
import { fmtPesoM } from "../data/registry";
import BufferControl from "../components/BufferControl";
import ConfirmDialog from "../components/confirm";
import { toast } from "../components/toast";
import { IconUpload, IconTrash, IconPin, IconDownload } from "../components/icons";

type Tab = "cadastre" | "centerlines" | "affected";

export default function LotAnalysis({ onLocate, focusId }: {
  onLocate: (p: [number, number], zoom?: number) => void;
  focusId?: string | null;
}) {
  const { parcels, centerlines, records, barangays } = useStore();
  const { can, role } = useAuth();
  const [tab, setTab] = useState<Tab>("cadastre");
  const [activeCl, setActiveCl] = useState<string | null>(centerlines[0]?.id ?? null);
  const [delCl, setDelCl] = useState<Centerline | null>(null);
  const [highlightCl, setHighlightCl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shpRings = useRef<GeoLatLng[][] | null>(null);
  const dbfRows = useRef<LotFeature["props"][] | null>(null);

  /* deep link from the project record — land on the Centerlines tab,
     select + spotlight the linked axis */
  useEffect(() => {
    if (!focusId) return;
    setTab("centerlines");
    setActiveCl(focusId);
    setHighlightCl(focusId);
    const scroll = setTimeout(() => {
      document.getElementById(`cl-row-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 140);
    const clear = setTimeout(() => setHighlightCl(null), 3000);
    return () => { clearTimeout(scroll); clearTimeout(clear); };
  }, [focusId]);

  const cl = centerlines.find((c) => c.id === activeCl) ?? centerlines[0] ?? null;
  const analysis = useMemo(() => (cl ? runROWAnalysis(parcels, cl) : null), [parcels, cl]);

  const ingestLots = (lots: LotFeature[], source: string) => {
    const govWords = ["city", "government", "denr", "dpwh", "national", "public"];
    const next: Parcel[] = lots.map((l, i) => {
      const owner = String(l.props.OWNER ?? l.props.owner ?? l.props.NAME ?? l.props.name ?? `Lot owner ${i + 1}`);
      const gov = govWords.some((w) => owner.toLowerCase().includes(w));
      const lat = l.ring.reduce((s, p) => s + p[0], 0) / l.ring.length;
      const lng = l.ring.reduce((s, p) => s + p[1], 0) / l.ring.length;
      const declaredArea = Number(l.props.AREA ?? l.props.area ?? 0);
      return {
        id: `LOT-UP-${String(i + 1).padStart(3, "0")}`,
        ring: l.ring,
        owner,
        ownerType: gov ? "Government" as const : "Private" as const,
        barangay: nearestBarangay(lat, lng, Object.fromEntries(barangays.map((b) => [b.name, [b.lat, b.lng] as [number, number]]))),
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
        if (kind === "kml") {
          const lines = parseKML(await readText(file));
          lines.forEach((l) => addCenterline({ name: l.name, source: "KML", ref: file.name, projectId: null, radiusM: 6, line: l.line }));
          toast(`${lines.length} centerline${lines.length > 1 ? "s" : ""} imported`, "saved", `KML · ${file.name} — link each to a project record`);
        } else if (kind === "gpx") {
          const lines = parseGPX(await readText(file));
          lines.forEach((l) => addCenterline({ name: l.name, source: "GPX", ref: file.name, projectId: null, radiusM: 6, line: l.line }));
          toast(`${lines.length} centerline${lines.length > 1 ? "s" : ""} imported`, "saved", `GPX · ${file.name}`);
        } else if (kind === "geojson") {
          const { lots, lines } = parseGeoJSON(await readText(file));
          if (lots.length) ingestLots(lots, file.name);
          lines.forEach((l) => addCenterline({ name: l.name, source: "Drawn", ref: file.name, projectId: null, radiusM: 6, line: l.line }));
          if (lines.length) toast(`${lines.length} centerlines imported`, "saved", `GeoJSON · ${file.name}`);
        } else if (kind === "shp") {
          const rings = parseSHP(await readBuffer(file));
          shpRings.current = rings;
          const attrs = dbfRows.current;
          if (attrs) {
            ingestLots(rings.map((ring, i) => ({ ring, props: attrs[i] ?? {} })), file.name);
            shpRings.current = null; dbfRows.current = null;
          } else {
            toast("Shapefile read", "info", `${rings.length} polygons — now load the matching .dbf for attributes`);
          }
        } else if (kind === "dbf") {
          const rows = parseDBF(await readBuffer(file));
          dbfRows.current = rows;
          const rings = shpRings.current;
          if (rings) {
            ingestLots(rings.map((ring, i) => ({ ring, props: rows[i] ?? {} })), "SHP + DBF");
            shpRings.current = null; dbfRows.current = null;
          } else {
            toast("Attribute table read", "info", `${rows.length} rows — now load the matching .shp`);
          }
        } else {
          toast(file.name, "info", "Unsupported format — KML, GPX, SHP+DBF or GeoJSON");
        }
      } catch (err) {
        toast(file.name, "deleted", err instanceof Error ? err.message : "Could not parse file");
      }
    }
  };

  const TabBtn = ({ id, label, n }: { id: Tab; label: string; n: number }) => (
    <button onClick={() => setTab(id)}
      className={`relative cursor-pointer px-4 py-3 font-display text-lg font-bold tracking-wider uppercase transition-colors sm:text-xl ${
        tab === id ? "bg-paper-100 text-ink-900" : "bg-ink-800 text-paper-300/60 hover:text-paper-100"
      }`}>
      {label}
      <span className={`ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${tab === id ? "bg-amber-500 text-ink-950" : "bg-ink-950 text-amber-400"}`}>{n}</span>
      {tab === id && <span className="absolute inset-x-0 top-0 h-[3px] bg-amber-500" />}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-ROW-05"
        title="Lot & ROW Analysis"
        subtitle="QGIS shapefile cadastre joined to barangay boundaries, KML/GPX centerlines as road axes, and flat-sided parallel buffers clipped against lots — with government / private attribution and acquisition cost."
      />

      <Reveal className="mt-6" delay={70}>
        <div className="flex flex-wrap overflow-hidden rounded-t-[4px] border-2 border-b-0 border-ink-800">
          <TabBtn id="cadastre" label="Cadastre" n={parcels.length} />
          <TabBtn id="centerlines" label="Centerlines" n={centerlines.length} />
          <TabBtn id="affected" label="Affected" n={analysis?.rows.length ?? 0} />
          {can.create && (
            <button onClick={() => fileRef.current?.click()}
              className="ml-auto flex cursor-pointer items-center gap-2 self-stretch border-l-2 border-ink-800 bg-amber-500 px-4 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400 sm:px-6">
              <IconUpload size={14} /> Import KML / GPX / SHP
            </button>
          )}
        </div>
      </Reveal>

      <input ref={fileRef} type="file" multiple accept=".kml,.gpx,.shp,.dbf,.geojson,.json" className="hidden"
        onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* map */}
        <Reveal className="lg:col-span-7">
          <div className="relative h-full">
            <CornerTicks />
            <div className="overflow-hidden rounded-[4px] border-2 border-ink-800">
              <MapContainer center={[9.744, 118.741]} zoom={13} className="h-[520px] w-full" scrollWheelZoom>
                <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' crossOrigin="anonymous" />
                {parcels.map((p) => {
                  const color = p.ownerType === "Government" ? "#1e7a58" : "#de5a36";
                  return (
                    <Polygon key={p.id} positions={p.ring} pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: 0.16 }}>
                      <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
                        {p.id} · {p.owner} · {p.ownerType} · {fmtArea(p.areaM2)} · Brgy. {p.barangay}
                      </Tooltip>
                    </Polygon>
                  );
                })}
                {cl && analysis && (
                  <Polygon positions={analysis.corridorRing} pathOptions={{ color: "#f0a32b", weight: 2.5, fillColor: "#f0a32b", fillOpacity: 0.14, dashArray: "6 4" }} />
                )}
                {centerlines.map((c) => {
                  const linked = records.find((r) => r.id === c.projectId);
                  const isActive = c.id === cl?.id;
                  return (
                    <Polyline key={c.id} positions={c.line} eventHandlers={{ click: () => setActiveCl(c.id) }}
                      pathOptions={{ color: isActive ? "#ffc24d" : linked ? "#1ea899" : "#7d9183", weight: isActive ? 3.5 : 2, opacity: isActive ? 1 : 0.7, dashArray: isActive ? undefined : "4 5" }}>
                      <Tooltip className="rpis-tip" direction="top" offset={[0, -6]}>
                        {c.id} · {c.name} · {linked ? linked.id : "unlinked"} · ±{c.radiusM} m
                      </Tooltip>
                    </Polyline>
                  );
                })}
                {cl && <CircleMarker center={cl.line[0]} radius={5} pathOptions={{ color: "#ffc24d", fillColor: "#0c1913", fillOpacity: 1, weight: 2 }} />}
              </MapContainer>
            </div>
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-1 font-mono text-[10px] tracking-wider text-text-600 uppercase">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-pine-500" /> Government lots</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-coral-500" /> Private lots</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" /> Active corridor</span>
              <span className="ml-auto text-text-400">click an axis to select</span>
            </p>
          </div>
        </Reveal>

        {/* panels */}
        <Reveal className="lg:col-span-5" delay={70}>
          {tab === "cadastre" && (
            <div className="rounded-[4px] border-2 border-ink-800 bg-paper-100">
              <div className="border-b-2 border-ink-800 bg-ink-900 px-4 py-3">
                <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">Cadastre basis · {parcels.length} parcels</p>
              </div>
              <div className="space-y-3 p-4">
                <p className="rounded-[3px] border border-line-300 bg-paper-200/70 px-3 py-2.5 font-mono text-[9.5px] leading-relaxed text-text-600">
                  Load the QGIS-exported <b className="text-ink-900">.shp + .dbf</b> pair (or GeoJSON). Parcels are joined to barangay
                  boundaries on ingest; <code>OWNER</code>, <code>AREA</code> and <code>ZONAL</code> attributes are honoured.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-[3px] px-3 py-2.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${can.create ? "cursor-pointer bg-ink-900 text-amber-400 hover:bg-ink-800" : "cursor-not-allowed bg-ink-900/20 text-text-400"}`}>
                    <IconUpload size={13} /> Load shapefile
                  </button>
                  <button onClick={() => { setParcels(generateSampleCadastral()); toast("Sample cadastre loaded", "saved", `${generateSampleCadastral().length} parcels around the poblacion corridors`); }}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[3px] border-2 border-ink-800 px-3 py-2.5 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-900 uppercase transition-colors hover:bg-ink-900 hover:text-amber-400">
                    Sample cadastre
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[3px] border border-line-300 bg-white/60 px-3 py-2">
                    <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Government</p>
                    <p className="font-display mt-0.5 text-xl leading-none font-bold text-pine-600">{parcels.filter((p) => p.ownerType === "Government").length}</p>
                  </div>
                  <div className="rounded-[3px] border border-line-300 bg-white/60 px-3 py-2">
                    <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Private</p>
                    <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{parcels.filter((p) => p.ownerType === "Private").length}</p>
                  </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto rounded-[3px] border border-line-300">
                  <table className="w-full border-collapse">
                    <thead className="bg-ink-900 text-paper-300">
                      <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8px] [&>th]:tracking-[0.14em] [&>th]:uppercase">
                        <th>Lot</th><th>Owner</th><th>Brgy</th><th className="!text-right">Area</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-300">
                      {parcels.slice(0, 40).map((p) => (
                        <tr key={p.id} className="transition-colors hover:bg-paper-200/70">
                          <td className="px-2.5 py-1.5 font-mono text-[9.5px] font-bold text-teal-500">{p.id}</td>
                          <td className="max-w-[120px] truncate px-2.5 py-1.5 text-[10.5px] text-text-600" title={p.owner}>{p.owner}</td>
                          <td className="px-2.5 py-1.5 font-mono text-[9px] text-text-400">{p.barangay}</td>
                          <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] text-ink-900">{fmtArea(p.areaM2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parcels.length > 40 && <p className="px-2.5 py-1.5 font-mono text-[8.5px] text-text-400">…and {parcels.length - 40} more</p>}
                </div>
              </div>
            </div>
          )}

          {tab === "centerlines" && (
            <div className="rounded-[4px] border-2 border-ink-800 bg-paper-100">
              <div className="border-b-2 border-ink-800 bg-ink-900 px-4 py-3">
                <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">Centerline axes · {centerlines.length}</p>
              </div>
              <div className="max-h-[440px] space-y-2.5 overflow-y-auto p-4">
                {centerlines.map((c) => {
                  const linked = records.find((r) => r.id === c.projectId);
                  const isActive = c.id === cl?.id;
                  return (
                    <div key={c.id} id={`cl-row-${c.id}`} onClick={() => setActiveCl(c.id)}
                      className={`cursor-pointer rounded-[3px] border p-3 transition-all duration-300 ${
                        highlightCl === c.id
                          ? "border-amber-500 bg-amber-500/[0.12] shadow-[0_0_0_4px_rgba(240,163,43,0.28)]"
                          : isActive
                            ? "border-amber-500 bg-amber-500/[0.07]"
                            : "border-line-300 bg-white/60 hover:border-ink-800"
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] font-bold text-ink-900">{c.id} · {c.name}</p>
                        <span className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${c.source === "KML" ? "bg-teal-500/15 text-teal-500" : c.source === "GPX" ? "bg-pine-500/15 text-pine-600" : "bg-ink-900/8 text-text-600"}`}>{c.source}</span>
                      </div>
                      <p className="mt-1 font-mono text-[9px] tracking-wider text-text-400 uppercase">
                        {linked ? <>linked → <b className="text-pine-600">{linked.id}</b> {linked.name}</> : "unlinked — set on the project record"}
                      </p>
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <BufferControl value={c.radiusM} disabled={!can.update} onChange={(v) => updateCenterline(c.id, { radiusM: v })} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="font-mono text-[9px] text-text-400">{fmtKm(lineLengthM(c.line))} · {c.ref}</p>
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); onLocate(c.line[0], 15); }}
                            className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-teal-500 hover:text-teal-500" title="Locate on console map">
                            <IconPin size={12} />
                          </button>
                          {can.del && (
                            <button onClick={(e) => { e.stopPropagation(); setDelCl(c); }}
                              className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600" title="Delete centerline (admin)">
                              <IconTrash size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {centerlines.length === 0 && (
                  <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-4 text-center font-mono text-[10px] text-text-400">
                    No centerlines yet — import a KML / GPX from the field.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "affected" && (
            <div className="rounded-[4px] border-2 border-ink-800 bg-paper-100">
              <div className="border-b-2 border-ink-800 bg-ink-900 px-4 py-3">
                <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
                  Affected lots · {cl ? cl.id : "—"}
                </p>
              </div>
              {analysis && cl ? (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[3px] border border-line-300 bg-white/60 px-3 py-2">
                      <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Corridor area</p>
                      <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{fmtArea(analysis.corridorAreaM2)}</p>
                    </div>
                    <div className="rounded-[3px] border border-line-300 bg-white/60 px-3 py-2">
                      <p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Lots overlapped</p>
                      <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{analysis.rows.length}</p>
                    </div>
                    <div className="rounded-[3px] border border-coral-500/40 bg-coral-500/[0.06] px-3 py-2">
                      <p className="font-mono text-[8.5px] tracking-[0.14em] text-coral-600 uppercase">Private affected</p>
                      <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtArea(analysis.privM2)}</p>
                    </div>
                    <div className="rounded-[3px] border border-coral-500/40 bg-coral-500/[0.06] px-3 py-2">
                      <p className="font-mono text-[8.5px] tracking-[0.14em] text-coral-600 uppercase">ROW acquisition</p>
                      <p className="font-display mt-0.5 text-xl leading-none font-bold text-coral-600">{fmtPesoM(analysis.totalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-3 max-h-[260px] overflow-y-auto rounded-[3px] border border-line-300">
                    <table className="w-full border-collapse">
                      <thead className="bg-ink-900 text-paper-300">
                        <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8px] [&>th]:tracking-[0.14em] [&>th]:uppercase">
                          <th>Lot</th><th>Owner</th><th>Type</th><th className="!text-right">Affected</th><th className="!text-right">%</th><th className="!text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-300">
                        {analysis.rows.map((x) => (
                          <tr key={x.lotId} className="transition-colors hover:bg-paper-200/70">
                            <td className="px-2.5 py-1.5 font-mono text-[9.5px] font-bold text-teal-500">{x.lotId}</td>
                            <td className="max-w-[110px] truncate px-2.5 py-1.5 text-[10.5px] text-text-600" title={x.owner}>{x.owner}</td>
                            <td className="px-2.5 py-1.5">
                              <span className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${x.ownerType === "Government" ? "bg-pine-500/15 text-pine-600" : "bg-coral-500/15 text-coral-600"}`}>{x.ownerType}</span>
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] font-bold text-ink-900">{fmtArea(x.affectedM2)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] text-text-600">{x.pct}%</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-[9.5px] font-bold text-ink-900">{x.cost ? fmtPesoM(x.cost) : "₱0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {analysis.rows.length === 0 && <p className="px-3 py-4 text-center font-mono text-[10px] text-text-400">No lots intersect this corridor.</p>}
                  </div>
                  <p className="mt-2 font-mono text-[8.5px] leading-relaxed tracking-wider text-text-400 uppercase">
                    ST_Intersection(lot, ST_Buffer(axis, {cl.radiusM}, 'endcap=flat')) preview · government land incurs no acquisition cost
                  </p>
                </div>
              ) : (
                <p className="p-6 text-center font-mono text-[10.5px] text-text-400">Select a centerline to run the analysis.</p>
              )}
            </div>
          )}
        </Reveal>
      </div>

      {delCl && (
        <ConfirmDialog
          title="Delete centerline"
          sheet="centerlines · DELETE"
          confirmLabel="Delete axis"
          message={
            <p>
              <b className="text-ink-900">{delCl.id} · {delCl.name}</b> will be removed.
              {records.some((r) => r.id === delCl.projectId) && " The linked project record keeps its other data."}
            </p>
          }
          onConfirm={() => { deleteCenterline(delCl.id); toast(delCl.id, "deleted", "centerline removed"); }}
          onClose={() => setDelCl(null)}
        />
      )}
    </div>
  );
}
