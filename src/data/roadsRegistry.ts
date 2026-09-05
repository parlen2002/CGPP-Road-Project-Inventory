/* ─────────────────────────────────────────────────────────────
   ROAD & STREET REGISTRY — the administrative name register of
   Puerto Princesa's roads, modeled on the barangay registry.
   Every road being repaired, rebuilt, developed or opened by a
   project record is linked here by roadId, so each work carries
   a proper road name. The Road Inventory is DERIVED from this
   registry × the project ledger (treatment history, investment).
   Fields: registry key, road/street name, jurisdiction, class,
   barangay coverage, length, width, lanes, surface, AADT, PCI,
   last inspection, geometry + its source.
   ────────────────────────────────────────────────────────────── */

import { roads, nationalRoads, type Surface, type RoadClass } from "./roads";
import { mPerDegLng } from "../lib/geo";

export type Jurisdiction = "OCE" | "DPWH";

export interface RoadReg {
  id: string;                 // registry key — rd-xxx (seed) / RD-### (encoded)
  name: string;               // proper road / street name
  jurisdiction: Jurisdiction; // OCE = city-managed · DPWH = national, reference only
  roadClass: RoadClass;
  barangays: string[];        // coverage — a road can span several barangays
  lengthKm: number;
  widthM: number;
  lanes: number;
  surface: Surface;           // present surface (encoded by OCE survey)
  aadt: number;
  pci: number;                // pavement condition index 0–100 (0 = n/a for DPWH)
  lastInspection: string;     // ISO date or "—"
  geometry: [number, number][];
  geometrySource: string;
}

export const ROAD_SOURCES = [
  "OCE as-built 2024", "NAMRIA centerline 2022", "QGIS digitized 2025",
  "Field GPS 2025", "DPWH geodata 2023",
];

export const SURFACES: Surface[] = ["Concrete", "Asphalt", "Gravel", "Earth"];

export function conditionOf(pci: number): "Good" | "Fair" | "Poor" {
  return pci >= 70 ? "Good" : pci >= 45 ? "Fair" : "Poor";
}

/* seed = the surveyed network, carried over with its geometry */
const seedFrom = (src: typeof roads, jurisdiction: Jurisdiction): RoadReg[] =>
  src.map((r) => ({
    id: r.id,
    name: r.name,
    jurisdiction,
    roadClass: r.roadClass,
    barangays: r.barangay.split("/").map((s) => s.trim()).filter(Boolean),
    lengthKm: r.lengthKm,
    widthM: r.widthM,
    lanes: r.lanes,
    surface: r.surface,
    aadt: r.aadt,
    pci: jurisdiction === "OCE" ? r.pci : 0,
    lastInspection: jurisdiction === "OCE" ? r.lastInspection : "—",
    geometry: r.geometry,
    geometrySource: jurisdiction === "OCE" ? "OCE as-built 2024" : "DPWH geodata 2023",
  }));

export const seedRoadsReg: RoadReg[] = [
  ...seedFrom(roads, "OCE"),
  ...seedFrom(nationalRoads, "DPWH"),
];

/** A fresh registry key — RD-### after the seed series */
export function suggestRoadId(existing: RoadReg[]): string {
  const n = existing
    .map((r) => parseInt(r.id.replace(/^RD-0*/, ""), 10))
    .filter((x) => !Number.isNaN(x))
    .reduce((a, b) => Math.max(a, b), 0);
  return `RD-${String(Math.max(n, 0) + 1).padStart(3, "0")}`;
}

/** stub centerline for newly encoded roads — 400 m due-east at the barangay centroid */
export function stubGeometry(lat: number, lng: number): [number, number][] {
  const kx = mPerDegLngAt(lat);
  const dLng = 200 / kx; // ±200 m
  return [[lat, lng - dLng], [lat, lng + dLng]];
}

/* ---------- network roll-ups (live, from the registry) ---------- */

export interface LadderRollup {
  openedKm: number; concretedKm: number; asphaltedKm: number; graveledKm: number; earthKm: number;
  segments: number;
}

export function ladderOf(cityRoads: RoadReg[]): LadderRollup {
  const sum = (s: Surface) => cityRoads.filter((r) => r.surface === s).reduce((a, r) => a + r.lengthKm, 0);
  return {
    openedKm: +cityRoads.reduce((a, r) => a + r.lengthKm, 0).toFixed(1),
    concretedKm: +sum("Concrete").toFixed(1),
    asphaltedKm: +sum("Asphalt").toFixed(1),
    graveledKm: +sum("Gravel").toFixed(1),
    earthKm: +sum("Earth").toFixed(1),
    segments: cityRoads.length,
  };
}
