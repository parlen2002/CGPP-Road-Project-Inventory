/* Technical catalogs — CRUD-able dropdown lists behind every encoder.
   Three domains: project-record fields · technical specs · registries. */

import {
  PAVEMENTS, SHOULDER_TYPES, FINISHES, RAMPS, DRAINAGE_TYPES, SLOPE_TYPES,
  LIGHT_FIXTURES, LIGHT_CONTROLS, LIGHT_POWER,
} from "./specs";
import { PROJECT_TYPES, MODES, FUNDS, type ProjectRecord } from "./registry";
import { ROAD_CLASSES, SURFACES, ROAD_SOURCES, type RoadReg } from "./roadsRegistry";
import { DATA_SOURCES, type Barangay } from "./barangays";

export type CatalogKey =
  | "projectTypes" | "modes" | "funds"
  | "pavements" | "shoulderTypes" | "finishes" | "ramps"
  | "drainageTypes" | "slopeTypes" | "lightFixtures" | "lightControls" | "lightPower"
  | "roadClasses" | "roadSurfaces" | "roadSources" | "brgyDataSources";

export interface CatalogGroup {
  key: CatalogKey; name: string; section: string; sectionName: string;
  desc: string; seed: string[]; domain: "record" | "specs" | "registry";
}

export const CATALOG_GROUPS: CatalogGroup[] = [
  { key: "projectTypes", name: "Project types", section: "PRJ", sectionName: "Project Record", domain: "record", desc: "Work classification of the record", seed: PROJECT_TYPES },
  { key: "modes", name: "Modes of implementation", section: "PRJ", sectionName: "Project Record", domain: "record", desc: "Contract vs. force account", seed: MODES },
  { key: "funds", name: "Sources of fund", section: "PRJ", sectionName: "Project Record", domain: "record", desc: "Appropriation / funding lines", seed: FUNDS },
  { key: "pavements", name: "Pavement types", section: "RD", sectionName: "Road", domain: "specs", desc: "Wearing course material options", seed: PAVEMENTS },
  { key: "shoulderTypes", name: "Shoulder types", section: "SHLD", sectionName: "Road Shoulder", domain: "specs", desc: "Shoulder construction options", seed: SHOULDER_TYPES },
  { key: "finishes", name: "Sidewalk finishes", section: "SWLK", sectionName: "Sidewalk", domain: "specs", desc: "Surface finish options", seed: FINISHES },
  { key: "ramps", name: "Accessibility ramps", section: "SWLK", sectionName: "Sidewalk", domain: "specs", desc: "BP 344 compliance options", seed: RAMPS },
  { key: "drainageTypes", name: "Drainage types", section: "DRNG", sectionName: "Drainage System", domain: "specs", desc: "Conveyance structure options", seed: DRAINAGE_TYPES },
  { key: "slopeTypes", name: "Slope protection types", section: "SLP", sectionName: "Slope Protection", domain: "specs", desc: "Retaining / protection options", seed: SLOPE_TYPES },
  { key: "lightFixtures", name: "Lighting fixtures", section: "LITE", sectionName: "Street Lights", domain: "specs", desc: "Luminaire options", seed: LIGHT_FIXTURES },
  { key: "lightControls", name: "Lighting controls", section: "LITE", sectionName: "Street Lights", domain: "specs", desc: "Switching / dimming options", seed: LIGHT_CONTROLS },
  { key: "lightPower", name: "Power sources", section: "LITE", sectionName: "Street Lights", domain: "specs", desc: "Electrical feed options", seed: LIGHT_POWER },
  { key: "roadClasses", name: "Road classes", section: "RRG", sectionName: "Road Registry", domain: "registry", desc: "Jurisdiction class of the road", seed: [...ROAD_CLASSES] },
  { key: "roadSurfaces", name: "Road surfaces", section: "RRG", sectionName: "Road Registry", domain: "registry", desc: "Wearing surface options", seed: [...SURFACES] },
  { key: "roadSources", name: "Geometry sources", section: "RRG", sectionName: "Road Registry", domain: "registry", desc: "Where the centerline came from", seed: [...ROAD_SOURCES] },
  { key: "brgyDataSources", name: "Barangay data sources", section: "BRG", sectionName: "Barangay Registry", domain: "registry", desc: "Provenance of barangay records", seed: [...DATA_SOURCES] },
];

export interface CatalogItem { id: string; group: CatalogKey; value: string; }

let seedSeq = 0;
export const seedCatalogItems: CatalogItem[] = CATALOG_GROUPS.flatMap((g) =>
  g.seed.map((value) => ({ id: `CAT-${String(++seedSeq).padStart(3, "0")}`, group: g.key, value }))
);

export const nextCatalogId = (items: CatalogItem[]): string => {
  const n = items.map((c) => parseInt(c.id.replace("CAT-", ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  return `CAT-${String(n + 1).padStart(3, "0")}`;
};

export const optionsOf = (items: CatalogItem[], group: CatalogKey): string[] =>
  items.filter((c) => c.group === group).map((c) => c.value);

export function backfillCatalogs(loaded: CatalogItem[]): CatalogItem[] {
  let seq = loaded.map((c) => parseInt(c.id.replace("CAT-", ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  const out = [...loaded];
  for (const g of CATALOG_GROUPS) {
    if (loaded.some((c) => c.group === g.key)) continue;
    g.seed.forEach((value) => out.push({ id: `CAT-${String(++seq).padStart(3, "0")}`, group: g.key, value }));
  }
  return out;
}

export function usageOf(value: string, records: ProjectRecord[]): number {
  let n = 0;
  const scan = (s: Record<string, unknown> | null | undefined) => {
    if (!s) return;
    for (const sec of Object.values(s)) {
      if (sec && typeof sec === "object") {
        for (const v of Object.values(sec as Record<string, unknown>)) if (v === value) n++;
      }
    }
  };
  for (const r of records) {
    scan(r.technical as unknown as Record<string, unknown>);
    scan(r.revision?.specs as unknown as Record<string, unknown>);
    scan(r.actual?.specs as unknown as Record<string, unknown>);
  }
  return n;
}

export function itemUsage(
  group: CatalogKey, value: string, records: ProjectRecord[],
  roadsReg: RoadReg[] = [], barangays: Barangay[] = [],
): number {
  switch (group) {
    case "projectTypes": return records.filter((r) => r.type === value).length;
    case "modes": return records.filter((r) => r.mode === value).length;
    case "funds": return records.filter((r) => r.fund === value).length;
    case "roadClasses": return roadsReg.filter((r) => r.roadClass === value).length;
    case "roadSurfaces": return roadsReg.filter((r) => r.surface === value).length;
    case "roadSources": return roadsReg.filter((r) => r.geometrySource === value).length;
    case "brgyDataSources": return barangays.filter((b) => b.dataSource === value).length;
    default: return usageOf(value, records);
  }
}
