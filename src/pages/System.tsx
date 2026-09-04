import { PageHeader, Reveal, CornerTicks } from "../components/ui";
import { IconTerminal, IconStack, IconLayers } from "../components/icons";

const schema = [
  { table: "roads_road", geom: "LineStringM", srid: 4326, fields: "name · road_class · surface · condition · pci · length_m · width_m · aadt · last_inspection", idx: "GiST(geom)" },
  { table: "projects_project", geom: "Point", srid: 4326, fields: "code · type · status · progress · budget · contractor · start · end · road_id FK", idx: "GiST(geom)" },
  { table: "brgy_boundary", geom: "MultiPolygon", srid: 4326, fields: "name · population · district · area_ha", idx: "GiST(geom)" },
  { table: "inspections_inspection", geom: "Point", srid: 4326, fields: "road_id FK · pci · photos · inspector · surveyed_at", idx: "GiST(geom) · BRIN(surveyed_at)" },
  { table: "drone_orthomosaic", geom: "Raster", srid: 32651, fields: "flight_id · gsd_cm · captured_at · rrid band", idx: "SP-GiST" },
];

const endpoints = [
  { m: "GET", path: "/api/v1/roads/?bbox=118.60,9.62,118.90,9.85&condition=poor", note: "bbox → ST_Intersects filter", code: 200 },
  { m: "GET", path: "/api/v1/roads/{id}/geojson/", note: "single segment as GeoJSON Feature", code: 200 },
  { m: "GET", path: "/api/v1/projects/?status=ongoing&progress__lt=50", note: "ORM → SQL via GeoDjango lookup", code: 200 },
  { m: "POST", path: "/api/v1/inspections/", note: "field upload; geotag validated by ST_Within(brgy)", code: 201 },
  { m: "GET", path: "/api/v1/analytics/paved-km/?group=year", note: "ST_Length aggregate over roads_road", code: 200 },
  { m: "GET", path: "/geoserver/rpis/wms?layers=roads:condition_v3", note: "WMS 1.3.0 tiles for external clients", code: 200 },
];

const stack = [
  { name: "Django 6.1", role: "Application core", detail: "Python 3.13 · async views for console API · GeoDjango contrib (GDAL 3.10 / GEOS 3.13) for geometry fields, lookups and serialization.", tone: "amber" },
  { name: "PostgreSQL 17 + PostGIS 3.5", role: "Spatial database", detail: "GiST spatial indexes on every geometry column · ST_SnapToGrid normalization nightly · pg_cron for warehouse rollups.", tone: "pine" },
  { name: "GeoServer 2.26", role: "OGC services", detail: "WMS/WFS publication of condition and project layers for DPWH and provincial GIS clients · layer caching at z10–z16.", tone: "teal" },
  { name: "React 19 + Leaflet", role: "This console", detail: "Web Mercator rendering (EPSG:3857) of WGS 84 features · vector overlays for live editing sessions.", tone: "steel" },
];

const toneClass: Record<string, string> = {
  amber: "border-amber-500/50 text-amber-400", pine: "border-pine-400/50 text-pine-400",
  teal: "border-teal-400/50 text-teal-400", steel: "border-steel-400/50 text-steel-400",
};
const toneBar: Record<string, string> = { amber: "bg-amber-500", pine: "bg-pine-400", teal: "bg-teal-400", steel: "bg-steel-400" };

export default function System() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-SYS-05"
        title="GIS Stack & Data Architecture"
        subtitle="Reference architecture of the RPIS platform: a Django 6.1 service tier over a PostGIS warehouse, published through OGC services and consumed by this mapping console."
        drawnBy="GIS UNIT / ICT"
      />

      {/* stack */}
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stack.map((s, i) => (
          <Reveal key={s.name} delay={i * 70}>
            <div className="group relative h-full overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5 transition-transform duration-300 hover:-translate-y-1">
              <span className={`absolute inset-x-0 top-0 h-[3px] ${toneBar[s.tone]}`} />
              <div className="flex items-center justify-between">
                <IconStack size={20} className={toneClass[s.tone].split(" ")[1]} />
                <span className={`rounded-[3px] border px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.18em] uppercase ${toneClass[s.tone]}`}>{s.role}</span>
              </div>
              <h3 className="font-display mt-3 text-[26px] leading-none font-bold text-paper-100 uppercase group-hover:text-amber-300">{s.name}</h3>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-paper-300/70">{s.detail}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        {/* schema */}
        <Reveal className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
            <CornerTicks />
            <div className="flex items-center gap-2 border-b-2 border-ink-800 bg-ink-900 px-4 py-3">
              <IconLayers size={16} className="text-amber-400" />
              <h2 className="font-display text-xl font-bold tracking-wide text-paper-100 uppercase">Spatial Schema · rpis_prod</h2>
              <span className="ml-auto font-mono text-[9px] tracking-[0.16em] text-paper-300/50 uppercase">5 tables · 3 geometry types</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-paper-300/70 text-text-600">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9px] [&>th]:font-semibold [&>th]:tracking-[0.16em] [&>th]:uppercase">
                    <th>Table</th><th>Geometry</th><th>SRID</th><th>Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-300">
                  {schema.map((s) => (
                    <tr key={s.table} className="align-top transition-colors hover:bg-ink-900/[0.045]">
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-[11.5px] font-bold text-pine-700">{s.table}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-text-400">{s.fields}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-ink-900">{s.geom}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-text-600">{s.srid}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-amber-600">{s.idx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* api */}
        <Reveal className="lg:col-span-5" delay={90}>
          <div className="relative h-full overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-950">
            <CornerTicks />
            <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900 px-4 py-3">
              <IconTerminal size={16} className="text-amber-400" />
              <h2 className="font-display text-xl font-bold tracking-wide text-paper-100 uppercase">Console API</h2>
              <span className="ml-auto font-mono text-[9px] tracking-[0.16em] text-paper-300/50 uppercase">rpis.ppc.gov.ph</span>
            </div>
            <ul className="divide-y divide-ink-800/80">
              {endpoints.map((e) => (
                <li key={e.path} className="px-4 py-3 transition-colors hover:bg-ink-900">
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-bold ${e.m === "GET" ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"}`}>{e.m}</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-paper-100">{e.path}</code>
                    <span className="shrink-0 font-mono text-[9.5px] font-bold text-pine-400">{e.code}</span>
                  </div>
                  <p className="mt-1 pl-9 font-mono text-[9.5px] text-paper-300/50">{e.note}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-700 px-4 py-3">
              <p className="font-mono text-[9.5px] leading-relaxed text-paper-300/60">
                <span className="text-amber-400">$</span> python manage.py migrate roads<br />
                <span className="text-amber-400">$</span> python manage.py import_segments --srid 4326 --snap 1e-6<br />
                <span className="text-pine-400">✓ 17 segments loaded · topology clean · GiST indexes rebuilt</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* pipeline + notes */}
      <div className="mt-4 grid gap-4 pb-2 lg:grid-cols-3">
        {[
          { title: "Nightly ETL", lines: ["02:00 — ST_SnapToGrid normalization, 1e-6 tolerance", "02:15 — ST_Length(geography) recompute → length_m", "02:30 — rollups into analytics_mv (materialized)", "03:00 — GeoServer cache reseed, z10–z14"] },
          { title: "Data Integrity", lines: ["CHECK (ST_IsValid(geom)) on all tables", "FK cascade: inspections → roads → brgy", "SRID enforced 4326 at ORM level", "Point-in-polygon ward validation on upload"] },
          { title: "Operations", lines: ["pgBackRest full backup Sun 01:00 + hourly WAL", "Read replica serves console API", "Uptime target 99.5% (city intranet + internet)", "Change log: schema rev C · 2026-01-12"] },
        ].map((c, i) => (
          <Reveal key={c.title} delay={i * 80}>
            <div className="relative h-full rounded-[4px] border border-line-300 bg-paper-100 p-5">
              <CornerTicks color="border-ink-800/50" />
              <h3 className="font-display mb-3 text-xl font-bold tracking-wide text-ink-900 uppercase">{c.title}</h3>
              <ul className="space-y-2">
                {c.lines.map((l) => (
                  <li key={l} className="flex gap-2.5 font-mono text-[10.5px] leading-relaxed text-text-600">
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-amber-500" /> {l}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
