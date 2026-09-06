/* GIS stack — the Django 6.1 + PostGIS reference architecture behind the
   console. Every module maps one-to-one onto a server component. */

import { PageHeader, Reveal, CornerTicks } from "../components/ui";

const MODELS = [
  { name: "roads_road", cols: "id · name · road_class · jurisdiction · length_m · width_m · lanes · surface · aadt · pci · geom LineString(4326)", note: "Road & Street Registry — naming basis of the inventory" },
  { name: "project_records", cols: "id · name · type · mode · fund · object_code · folder_no · implementor_id FK · incharge_id FK · road_id FK · barangays[] · linear_length · contracted · actual · dates · percent · treatment · notes", note: "21-field ledger + detail records" },
  { name: "spec_details", cols: "record_id FK · variant (technical/revision/actual) · specs JSONB · meta JSONB", note: "Road, shoulder, sidewalk, drainage, slope, street lights" },
  { name: "orders", cols: "record_id FK · kind (VO/SO) · order_no · amounts · days · remarks", note: "Variation & suspension orders adjust amount & completion" },
  { name: "attachments", cols: "record_id FK · kind (geotag/pdf) · name · exif Point(4326) · file blob", note: "Raw bytes archived; EXIF intact" },
  { name: "cadastre_parcels", cols: "id · owner · owner_type · brgy · area_m2 · zonal_value · geom Polygon(4326)", note: "QGIS shapefile basis" },
  { name: "centerlines", cols: "id · record_id FK · source · radius_m · geom LineString(4326)", note: "KML / GPX axes; parallel buffer endcap=flat" },
  { name: "personnel_users", cols: "id · name parts · email · pass_hash · salt · role_id FK · position · division · division_code · prc · phone", note: "ONE table — accounts and in-charge personnel" },
  { name: "brgy_registry", cols: "id · psgc_10digit · name · data_source · population · centroid Point(4326)", note: "All 66 barangays, editable" },
];

const ENDPOINTS = [
  ["GET", "/api/records/?status=Ongoing&brgy=San Pedro", "filter ledger"],
  ["POST", "/api/records/", "encode project (21 fields)"],
  ["PATCH", "/api/records/RPIS-2026-014/percent/", "slider update"],
  ["POST", "/api/records/{id}/attachments/", "multipart upload; EXIF → geog"],
  ["GET", "/api/roads/{id}/treatment/", "ST_ derived pavement stage"],
  ["POST", "/api/row/analyze/", "ST_Intersection(lot, ST_Buffer(axis,r,'endcap=flat'))"],
  ["POST", "/api/personnel/", "create account + profile (one row)"],
  ["GET", "/wms?LAYERS=rpis:roads&FORMAT=image/png", "GeoServer basemap layer"],
];

export default function System() {
  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-SYS-08"
        title="GIS Stack"
        subtitle="Django 6.1 + PostGIS 3.5 reference architecture. The console in this browser is the field front-end of the same schema — every module maps one-to-one onto a server component."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <div className="relative h-full rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5">
            <CornerTicks />
            <h2 className="font-display mb-4 text-2xl font-bold tracking-wide text-paper-100 uppercase">Service stack</h2>
            <div className="space-y-2.5">
              {[
                { t: "Browser console", s: "React 18 · Leaflet 1.9 · this UI", tone: "#f0a32b" },
                { t: "Django 6.1 API", s: "DRF · GeoDjango · async views", tone: "#2f9a70" },
                { t: "GeoServer 2.26", s: "WMS / WFS vector tiles", tone: "#1ea899" },
                { t: "PostGIS 3.5", s: "geography math · GiST indexes", tone: "#6f93cf" },
                { t: "Object storage", s: "attachments · rasters · orthos", tone: "#ef7450" },
              ].map((l, i) => (
                <div key={l.t} className="group rounded-[3px] border border-ink-700 bg-ink-850 p-3 transition-all hover:translate-x-1 hover:border-ink-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.tone }} />
                    <p className="font-display text-lg font-bold text-paper-100 uppercase">{l.t}</p>
                  </div>
                  <p className="mt-0.5 font-mono text-[9.5px] tracking-wider text-paper-300/60 uppercase">{l.s}</p>
                  {i < 4 && <p className="mt-1 pl-4 font-mono text-[10px] text-ink-500">▼</p>}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[3px] border border-amber-500/40 bg-amber-500/[0.07] p-3">
              <p className="font-mono text-[8.5px] font-bold tracking-[0.16em] text-amber-400 uppercase">Unified personnel model</p>
              <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-paper-300/70">
                Accounts and in-charge personnel share ONE table — no linking, no sync drift. Signatories on every
                printout resolve from the live row that holds the seat.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-8" delay={70}>
          <div className="relative rounded-[4px] border-2 border-ink-800 bg-paper-100">
            <CornerTicks />
            <h2 className="font-display border-b border-line-300 px-5 py-3 text-2xl font-bold tracking-wide text-ink-900 uppercase">Spatial schema · SRID 4326</h2>
            <ul className="divide-y divide-line-300">
              {MODELS.map((m) => (
                <li key={m.name} className="group px-5 py-3 transition-colors hover:bg-paper-200/70">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[12px] font-bold text-pine-600">{m.name}</p>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{m.note}</p>
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-text-600">{m.cols}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={100}>
          <div className="relative h-full rounded-[4px] border-2 border-ink-800 bg-ink-950 p-5">
            <CornerTicks />
            <h2 className="font-display mb-3 text-2xl font-bold tracking-wide text-paper-100 uppercase">Console API surface</h2>
            <ul className="space-y-1.5">
              {ENDPOINTS.map(([verb, path, note]) => (
                <li key={path} className="flex items-center gap-3 rounded-[3px] border border-ink-800 bg-ink-900/70 px-3 py-2 transition-colors hover:border-ink-600">
                  <span className={`w-14 shrink-0 rounded-[3px] px-1.5 py-0.5 text-center font-mono text-[9px] font-bold ${
                    verb === "GET" ? "bg-pine-500/20 text-pine-400" : verb === "POST" ? "bg-amber-500/20 text-amber-400" : "bg-teal-500/20 text-teal-400"}`}>{verb}</span>
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-paper-300">{path}</code>
                  <span className="hidden shrink-0 font-mono text-[9px] tracking-wider text-paper-300/40 uppercase sm:inline">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={130}>
          <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
            <CornerTicks color="border-ink-800/50" />
            <h2 className="font-display mb-3 text-2xl font-bold tracking-wide text-ink-900 uppercase">Nightly ETL & integrity</h2>
            <ul className="space-y-2.5">
              {[
                "02:00 — field photos → EXIF Point geocoded, thumbnailed, raw archived",
                "02:20 — KML / GPX imports normalized; ST_SnapToGrid(0.00001)",
                "02:40 — treatment ladder re-derived from project links (highest stage)",
                "03:00 — GeoServer cache reseed; WMS version bumped",
                "03:10 — integrity: orphan FK scan · duplicate folder numbers · percent bounds",
                "03:30 — ROW cost rollups refreshed against zonal values table",
              ].map((s, i) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[3px] bg-ink-900 font-mono text-[10px] font-bold text-amber-400">{i + 1}</span>
                  <p className="font-mono text-[10.5px] leading-relaxed text-text-600">{s}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-[3px] border border-amber-500/50 bg-amber-500/[0.07] p-3">
              <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-amber-600 uppercase">Invariants</p>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-text-600">
                percent ∈ [0,100] · actual ≤ contracted + ΣVO · completion + ΣVO days + ΣSO days used ·
                road inventory = π(roads ⋈ project_records) · geotag pins take precedence over centerlines.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
