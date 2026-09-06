/* Road & street registry — the naming basis of the inventory. Treatment per road
   is the highest pavement stage among its linked projects. Ids match the surveyed
   road ids (rd-*) so every record link resolves. */

import {
  cityRoads, nationalRoads, SURFACE_TREATMENT, TREATMENT_ORDER,
  type RoadClass, type Surface, type Treatment,
} from "./roads";
import type { ProjectRecord } from "./registry";

export interface RoadReg {
  id: string; name: string; roadClass: RoadClass; jurisdiction: "OCE" | "DPWH";
  barangays: string[]; lengthKm: number; widthM: number; lanes: number;
  surface: Surface; aadt: number; pci: number; lastInspection: string;
  geometrySource: string; geometry: [number, number][];
}

export const ROAD_CLASSES: RoadClass[] = ["City", "National"];
export const SURFACES: Surface[] = ["Concrete", "Asphalt", "Gravel", "Earth"];
export const ROAD_SOURCES = [
  "OCE field GPS 2024", "NAMRIA 1:10K digitized", "DPWH as-built 2022", "QGIS municipal base 2023",
];

const fromRoad = (r: (typeof cityRoads)[number]): RoadReg => ({
  id: r.id, // keep the surveyed id so project links resolve
  name: r.name, roadClass: r.roadClass,
  jurisdiction: r.roadClass === "City" ? "OCE" : "DPWH",
  barangays: [r.barangay], lengthKm: r.lengthKm, widthM: r.widthM, lanes: r.lanes,
  surface: r.surface, aadt: r.aadt, pci: r.pci, lastInspection: r.lastInspection,
  geometrySource: r.roadClass === "City" ? "OCE field GPS 2024" : "DPWH as-built 2022",
  geometry: r.geometry,
});

export const seedRoadsReg: RoadReg[] = [...cityRoads.map(fromRoad), ...nationalRoads.map(fromRoad)];

export const nextRoadRegId = (list: RoadReg[]): string => {
  const n = list.map((r) => parseInt(r.id.replace("RD-", ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  return `RD-${String(n + 1).padStart(3, "0")}`;
};

export function stubCenterline(lat: number, lng: number): [number, number][] {
  return [[lat, lng - 0.0025], [lat, lng + 0.0025]];
}

const rank = (t: Treatment) => TREATMENT_ORDER.indexOf(t);

export function deriveRoad(entry: RoadReg, records: ProjectRecord[]) {
  const linked = records.filter((r) => r.roadId === entry.id);
  const paved = linked.filter((r) => r.treatment).sort((a, b) => rank(b.treatment!) - rank(a.treatment!));
  const byProjects = paved.length > 0;
  const treatment: Treatment = byProjects ? paved[0].treatment! : (SURFACE_TREATMENT[entry.surface] ?? "Road Opening");
  const withYear = linked.filter((r) => r.treatment === treatment);
  const treatmentYear = withYear.length ? Math.max(...withYear.map((r) => r.bidYear)) : 0;
  return {
    treatment, treatmentYear, byProjects,
    projects: linked,
    budget: linked.reduce((s, r) => s + r.contractedAmount, 0),
    completed: linked.filter((r) => r.percent >= 100).length,
    active: linked.filter((r) => r.percent > 0 && r.percent < 100).length,
  };
}
