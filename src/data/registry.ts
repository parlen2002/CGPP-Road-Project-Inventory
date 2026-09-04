/* ─────────────────────────────────────────────────────────────
   RPIS DATA REGISTRY — Office of the City Engineer, Puerto Princesa
   project_records ⟶ FK implementor (contractors)
                 ⟶ FK project_incharge (engineers)
   LOCATION IS BARANGAY-BASED:
     · primary key of location = one or more barangays covered,
       depending on the vastness of the project
     · KML / GPX / geotagged images are SUPPORTING EVIDENCE only —
       they pinpoint the project accurately on the map when attached
 ────────────────────────────────────────────────────────────── */

import { BARANGAY_POINTS } from "./roads";

export type ProjectType =
  | "Concreting" | "Site Development" | "Drainage System" | "Slope Protection"
  | "Street Lights" | "Road Shoulder" | "Sidewalk";

export type ModeOfImplementation = "By Contract" | "By Administration";
export type LocationSource = "KML" | "GPX" | "Geotagged Image";

export interface LocationEvidence {
  source: LocationSource;            // supporting evidence format
  ref: string;                       // filename / capture reference
  lat: number;                       // exact station, WGS 84
  lng: number;
}

export interface ProjectLocation {
  barangays: string[];               // PRIMARY — one or more barangays covered
  evidence: LocationEvidence | null; // OPTIONAL — pinpoints the project on the map
}

export interface ProjectRecord {
  id: string;                      // Project ID — RPIS-YYYY-NNN
  name: string;                    // Name of road project
  type: ProjectType;
  mode: ModeOfImplementation;
  fund: string;                    // Source of fund
  objectCode: string;              // Object account code (UACS)
  folderNo: string;                // File folder number
  implementorId: string;           // FK → contractors
  inchargeId: string;              // FK → engineers
  location: ProjectLocation;       // barangay-based; evidence optional
  linearLength: number;            // meters
  contractedAmount: number;        // PHP
  actualAmount: number;            // PHP
  bidYear: number;
  contractedStart: string;         // ISO date
  contractedCompletion: string;
  actualStart: string | null;
  actualCompletion: string | null;
  percent: number;                 // 0–100 — adjusted via slider
  roadId?: string;                 // optional link → roads_road
  notes: string;                   // Notes and remarks
}

export interface Contractor {
  id: string; name: string; pcab: string; category: string;
  address: string; contactPerson: string; phone: string; email: string;
}

export interface Engineer {
  id: string; name: string; position: string; unit: string;
  prc: string; email: string; phone: string;
}

/* ---------------- reference lists ---------------- */

export const PROJECT_TYPES: ProjectType[] = [
  "Concreting", "Site Development", "Drainage System", "Slope Protection",
  "Street Lights", "Road Shoulder", "Sidewalk",
];

export const MODES: ModeOfImplementation[] = ["By Contract", "By Administration"];

export const FUNDS = [
  "20% Development Fund", "General Fund", "Calamity Fund (LDRRMF)",
  "DPWH Convergence Program", "NDRRMF + LGU Counterpart",
  "Special Education Fund", "Supplemental Budget", "FY Annual Plan",
];

export const TYPE_OBJECT_CODE: Record<ProjectType, string> = {
  Concreting: "1-07-03-01-01-00-02",
  "Site Development": "1-07-01-01-01-00-00",
  "Drainage System": "1-06-03-01-04-00-00",
  "Slope Protection": "1-06-03-01-02-00-00",
  "Street Lights": "1-06-05-01-99-00-01",
  "Road Shoulder": "1-06-03-01-01-00-03",
  Sidewalk: "1-06-03-01-01-00-04",
};

export const PCAB_CATEGORIES = ["AAAA", "AAA", "AA", "A", "B", "C", "D", "E", "—"];

export const ENGINEER_POSITIONS = [
  "City Engineer", "Assistant City Engineer", "District Engineer",
  "Project Engineer", "Materials Engineer", "Planning & Design Chief",
  "Engineering Aide III", "Construction Supervisor",
];

export const ENGINEER_UNITS = [
  "Office of the City Engineer", "District Engineering — North",
  "District Engineering — South", "Planning & Design Unit",
  "Materials & Testing Unit", "Construction Division",
];

export const LOC_SOURCES: LocationSource[] = ["KML", "GPX", "Geotagged Image"];

/* ---------------- lookups / formatting ---------------- */

export const typeShort: Record<ProjectType, string> = {
  Concreting: "CONC", "Site Development": "SITE", "Drainage System": "DRNG",
  "Slope Protection": "SLOPE", "Street Lights": "LITE", "Road Shoulder": "SHLD",
  Sidewalk: "SWLK",
};

export const TYPE_COLORS: Record<ProjectType, string> = {
  Concreting: "#175c43", "Site Development": "#8a6d3b", "Drainage System": "#12897e",
  "Slope Protection": "#b84423", "Street Lights": "#f0a32b", "Road Shoulder": "#4a70b0",
  Sidewalk: "#5f8f6e",
};

export const fmtPeso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
export const fmtPesoM = (n: number) =>
  `₱${(n / 1e6).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${String(d).padStart(2, "0")} '${String(y).slice(2)}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((+new Date(b) - +new Date(a)) / 86400000);
}

export function durationOf(r: ProjectRecord): string {
  if (r.actualStart && r.actualCompletion) {
    const d = daysBetween(r.actualStart, r.actualCompletion);
    return d >= 60 ? `${Math.floor(d / 30)} mo ${d % 30} d` : `${d} d`;
  }
  if (r.actualStart) return `ongoing · ${daysBetween(r.actualStart, today())} d elapsed`;
  return "—";
}

const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- location helpers ---------------- */

/** True when KML / GPX / geotag evidence pinpoints the project. */
export const hasEvidence = (r: ProjectRecord) => r.location.evidence !== null;

/**
 * Map point for the record:
 *  · with evidence → exact station from the attached KML / GPX / geotag
 *  · without      → centroid of the covered barangay(ies), averaged when multiple
 */
export function projectPoint(r: ProjectRecord): [number, number] {
  const ev = r.location.evidence;
  if (ev) return [ev.lat, ev.lng];
  const pts = (r.location.barangays ?? [])
    .map((b) => BARANGAY_POINTS[b])
    .filter((p): p is [number, number] => Array.isArray(p));
  if (!pts.length) return [9.7389, 118.739];
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

/** Compact label: "Brgy. X" or "Brgy. X +2" for multi-barangay coverage. */
export function barangayLabel(r: ProjectRecord): string {
  const [first, ...rest] = r.location.barangays ?? [];
  return `Brgy. ${first ?? "—"}${rest.length ? ` +${rest.length}` : ""}`;
}

/* ---------------- status derivation (slider-driven) ---------------- */

export type StatusLabel = "Not Started" | "Ongoing" | "Delayed" | "Completed";

export interface StatusMeta { label: StatusLabel; color: string; soft: string; ring: string; }

export const STATUS_META: Record<StatusLabel, StatusMeta> = {
  "Not Started": { label: "Not Started", color: "#4a70b0", soft: "rgba(74,112,176,0.14)", ring: "rgba(74,112,176,0.45)" },
  Ongoing: { label: "Ongoing", color: "#f0a32b", soft: "rgba(240,163,43,0.14)", ring: "rgba(240,163,43,0.45)" },
  Delayed: { label: "Delayed", color: "#de5a36", soft: "rgba(222,90,54,0.14)", ring: "rgba(222,90,54,0.45)" },
  Completed: { label: "Completed", color: "#1e7a58", soft: "rgba(30,122,88,0.14)", ring: "rgba(30,122,88,0.45)" },
};

export const STATUS_LABELS: StatusLabel[] = ["Not Started", "Ongoing", "Delayed", "Completed"];

export function statusOf(r: ProjectRecord): StatusMeta {
  if (r.percent >= 100) return STATUS_META.Completed;
  if (r.percent <= 0) return r.contractedCompletion < today() ? STATUS_META.Delayed : STATUS_META["Not Started"];
  return r.contractedCompletion < today() ? STATUS_META.Delayed : STATUS_META.Ongoing;
}

/* ---------------- FK registries ---------------- */

export const seedContractors: Contractor[] = [
  { id: "CTR-001", name: "OCE Forces (Force Account)", pcab: "—", category: "LGU Force Account / By Administration", address: "City Hall Compound, Brgy. San Pedro (Poblacion)", contactPerson: "Engr. Ramon C. Villanueva", phone: "(048) 434-2811", email: "forces@oce.puertoprincesa.gov.ph" },
  { id: "CTR-002", name: "Palawan Buildwell Corporation", pcab: "AAAA", category: "General Engineering / Roads", address: "Km 2 National Highway, Brgy. San Manuel", contactPerson: "Arch. Dennis Uy", phone: "(048) 433-7182", email: "ops@buildwellpalawan.ph" },
  { id: "CTR-003", name: "Sandoval Construction & Dev't Corp.", pcab: "AAA", category: "Infrastructure / Concreting", address: "Brgy. Bacungan, Puerto Princesa City", contactPerson: "Mr. Ramil Sandoval", phone: "0917 802 4471", email: "projects@sandovalcdc.ph" },
  { id: "CTR-004", name: "Irawan Earthworks Inc.", pcab: "AA", category: "Earthworks / Slope Protection", address: "Brgy. Irawan, Puerto Princesa City", contactPerson: "Engr. Lito Panganiban", phone: "0928 551 0932", email: "main@irawanearthworks.ph" },
  { id: "CTR-005", name: "HydroLine Builders", pcab: "A", category: "Drainage & Waterworks", address: "Brgy. Liwanag, Puerto Princesa City", contactPerson: "Mr. Cesar Abellanosa", phone: "0906 214 8873", email: "hydro@hydrolinebuilders.ph" },
  { id: "CTR-006", name: "LuzVolt Systems", pcab: "B", category: "Electrical / Street Lighting", address: "Brgy. Mandaragat, Puerto Princesa City", contactPerson: "Mr. Alvin Recto", phone: "0915 330 9126", email: "luzvolt@luzvolt.ph" },
  { id: "CTR-007", name: "Consunji–Palawan JV", pcab: "AAAA", category: "Major Roads / Widening", address: "Satellite Office, Brgy. Sta. Monica", contactPerson: "Engr. Paolo Consunji", phone: "(02) 8893-4410", email: "palawan@consunji-jv.ph" },
];

export const seedEngineers: Engineer[] = [
  { id: "ENG-001", name: "Engr. Ramon C. Villanueva", position: "City Engineer", unit: "Office of the City Engineer", prc: "0098771", email: "oce@puertoprincesa.gov.ph", phone: "(048) 434-2811" },
  { id: "ENG-002", name: "Engr. Maria L. Fernandez", position: "Assistant City Engineer", unit: "Office of the City Engineer", prc: "0114208", email: "ace@puertoprincesa.gov.ph", phone: "(048) 434-2812" },
  { id: "ENG-003", name: "Engr. Jose P. Alcala", position: "District Engineer", unit: "District Engineering — North", prc: "0131557", email: "north@oce.puertoprincesa.gov.ph", phone: "0917 442 8810" },
  { id: "ENG-004", name: "Engr. Ana R. Buenaventura", position: "Project Engineer", unit: "District Engineering — North", prc: "0152934", email: "a.buenaventura@oce.puertoprincesa.gov.ph", phone: "0928 771 3345" },
  { id: "ENG-005", name: "Engr. Marco T. Ilustrisimo", position: "Materials Engineer", unit: "Materials & Testing Unit", prc: "0140216", email: "materials@oce.puertoprincesa.gov.ph", phone: "0906 118 5527" },
  { id: "ENG-006", name: "Engr. Katrina D. Salcedo", position: "Planning & Design Chief", unit: "Planning & Design Unit", prc: "0127650", email: "planning@oce.puertoprincesa.gov.ph", phone: "0915 902 6684" },
];

/* ---------------- seed project records ----------------
   location.barangays = primary coverage (multi-select for vast projects)
   location.evidence  = supporting KML / GPX / geotag fix, when captured */

export const seedRecords: ProjectRecord[] = [
  { id: "RPIS-2025-014", name: "Rizal Avenue Sidewalk & Drainage Improvement", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-06-03-01-01-00-04", folderNo: "OCE-IF-2025-014", implementorId: "CTR-002", inchargeId: "ENG-004", location: { barangays: ["San Pedro (Poblacion)"], evidence: { source: "KML", ref: "Rizal_Ave_sidewalk_rev2.kml", lat: 9.7415, lng: 118.7383 } }, linearLength: 1240, contractedAmount: 24_800_000, actualAmount: 15_376_000, bidYear: 2025, contractedStart: "2025-03-10", contractedCompletion: "2026-02-28", actualStart: "2025-03-24", actualCompletion: null, percent: 62, roadId: "rd-rizal", notes: "Segment B (St. 0+640 – 1+240) pending PPC-ELCO utility relocation; revised completion target under review by Planning & Design." },
  { id: "RPIS-2025-021", name: "Circumferential Road East Street Lighting", type: "Street Lights", mode: "By Contract", fund: "DPWH Convergence Program", objectCode: "1-06-05-01-99-00-01", folderNo: "OCE-IF-2025-021", implementorId: "CTR-006", inchargeId: "ENG-006", location: { barangays: ["Tagumpay", "Santa Monica", "Bancao-Bancao"], evidence: { source: "GPX", ref: "circum_east_lighting.gpx", lat: 9.7362, lng: 118.7572 } }, linearLength: 3800, contractedAmount: 18_600_000, actualAmount: 2_232_000, bidYear: 2025, contractedStart: "2025-06-01", contractedCompletion: "2026-03-31", actualStart: "2025-06-20", actualCompletion: null, percent: 12, roadId: "rd-circum", notes: "Poles 1–22 of 228 energized. Metering application with PPC-ELCO pending; pole setting paused at Tagumpay junction." },
  { id: "RPIS-2024-036", name: "North Road Concreting — Brgy. Bacungan (Seg. 3)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-IF-2024-036", implementorId: "CTR-003", inchargeId: "ENG-003", location: { barangays: ["San Rafael", "Bacungan"], evidence: { source: "GPX", ref: "north_rd_seg3_2025-11.gpx", lat: 9.7668, lng: 118.7592 } }, linearLength: 2860, contractedAmount: 86_400_000, actualAmount: 67_392_000, bidYear: 2024, contractedStart: "2024-11-02", contractedCompletion: "2025-12-20", actualStart: "2024-11-18", actualCompletion: null, percent: 78, roadId: "rd-north", notes: "Concrete pour St. 2+340 – 2+860 verified by materials engineer; 28-day core samples passed. Catch-up plan submitted for rain delays." },
  { id: "RPIS-2025-008", name: "South Road Drainage System (Iwahig–Irawan)", type: "Drainage System", mode: "By Contract", fund: "NDRRMF + LGU Counterpart", objectCode: "1-06-03-01-04-00-00", folderNo: "OCE-IF-2025-008", implementorId: "CTR-004", inchargeId: "ENG-002", location: { barangays: ["Iwahig", "Irawan"], evidence: { source: "Geotagged Image", ref: "IMG_20251004_141233.jpg", lat: 9.7188, lng: 118.7252 } }, linearLength: 1650, contractedAmount: 32_700_000, actualAmount: 13_407_000, bidYear: 2024, contractedStart: "2025-02-01", contractedCompletion: "2025-10-15", actualStart: "2025-02-19", actualCompletion: null, percent: 41, roadId: "rd-south", notes: "Slipped 128 days on ROW dispute at St. 1+100; suspension lifted 2025-12-01. Contractor required to submit revised catch-up program." },
  { id: "RPIS-2024-047", name: "Lacao Street Drainage Line", type: "Drainage System", mode: "By Contract", fund: "General Fund", objectCode: "1-06-03-01-04-00-00", folderNo: "OCE-IF-2024-047", implementorId: "CTR-005", inchargeId: "ENG-004", location: { barangays: ["Liwanag"], evidence: { source: "KML", ref: "lacao_drainage_asbuilt.kml", lat: 9.7392, lng: 118.7366 } }, linearLength: 940, contractedAmount: 6_900_000, actualAmount: 6_842_500, bidYear: 2024, contractedStart: "2024-10-01", contractedCompletion: "2025-02-14", actualStart: "2024-10-08", actualCompletion: "2025-02-10", percent: 100, roadId: "rd-lacao", notes: "As-built survey approved by P&D; final payment processed March 2025. Warranty runs to Feb 2026." },
  { id: "RPIS-2025-017", name: "Mandaragat Road Concreting (Seg. 1)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-IF-2025-017", implementorId: "CTR-003", inchargeId: "ENG-003", location: { barangays: ["Mandaragat"], evidence: { source: "GPX", ref: "mandaragat_seg1.gpx", lat: 9.7468, lng: 118.7515 } }, linearLength: 1980, contractedAmount: 27_500_000, actualAmount: 15_125_000, bidYear: 2025, contractedStart: "2025-04-22", contractedCompletion: "2026-04-22", actualStart: "2025-05-06", actualCompletion: null, percent: 55, roadId: "rd-mandaragat", notes: "Sub-base 100%, paving 41%. Rainy-season slippage absorbed by contract float; no extension of time filed." },
  { id: "RPIS-2026-002", name: "Tiniguiban Road Shoulder Widening", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: "1-06-03-01-01-00-03", folderNo: "OCE-IF-2026-002", implementorId: "CTR-003", inchargeId: "ENG-006", location: { barangays: ["Tiniguiban"], evidence: null }, linearLength: 2400, contractedAmount: 18_200_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-05-04", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-tiniguiban", notes: "Notice to Proceed pending; contractor mobilization scheduled May 2026. Shoulder width 1.5 m both sides. No field capture yet — map pin derived from barangay centroid." },
  { id: "RPIS-2026-005", name: "Libis Coastal Road Shoulder & Guardrail", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: "1-06-03-01-01-00-03", folderNo: "OCE-IF-2026-005", implementorId: "CTR-007", inchargeId: "ENG-002", location: { barangays: ["Bancao-Bancao"], evidence: { source: "KML", ref: "libis_coastal_rev1.kml", lat: 9.7212, lng: 118.7401 } }, linearLength: 3150, contractedAmount: 38_900_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-04-01", contractedCompletion: "2027-03-30", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-libis", notes: "Bid opening 18 Mar 2026, 10:00 at BAC Conference Room. Three contractors pre-qualified; includes 890 m steel guardrail." },
  { id: "RPIS-2026-007", name: "Iwahig Slope Protection Works", type: "Slope Protection", mode: "By Contract", fund: "DPWH Convergence Program", objectCode: "1-06-03-01-02-00-00", folderNo: "OCE-IF-2026-007", implementorId: "CTR-004", inchargeId: "ENG-005", location: { barangays: ["Iwahig"], evidence: null }, linearLength: 620, contractedAmount: 52_000_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-06-01", contractedCompletion: "2027-08-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-iwahig", notes: "Pre-qualification underway. Geotechnical boring completed (3 boreholes, 15 m depth); gabion + ripraps design under review. Geotagged borehole photos to be attached after design approval." },
  { id: "RPIS-2025-041", name: "San Manuel Road Concreting (Force Account)", type: "Concreting", mode: "By Administration", fund: "20% Development Fund", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-FA-2025-041", implementorId: "CTR-001", inchargeId: "ENG-004", location: { barangays: ["San Manuel"], evidence: { source: "GPX", ref: "san_manuel_forces.gpx", lat: 9.7501, lng: 118.7282 } }, linearLength: 1450, contractedAmount: 16_400_000, actualAmount: 6_724_000, bidYear: 2025, contractedStart: "2025-11-20", contractedCompletion: "2026-10-30", actualStart: "2026-01-12", actualCompletion: null, percent: 41, roadId: "rd-sanman", notes: "Force-account execution using LGU batching plant. Materials procurement on schedule; labor force at 22 personnel." },
  { id: "RPIS-2024-052", name: "Burgos Street LED Street Lighting", type: "Street Lights", mode: "By Contract", fund: "General Fund", objectCode: "1-06-05-01-99-00-01", folderNo: "OCE-IF-2024-052", implementorId: "CTR-006", inchargeId: "ENG-006", location: { barangays: ["San Pedro (Poblacion)"], evidence: { source: "KML", ref: "burgos_lighting_asbuilt.kml", lat: 9.7352, lng: 118.7385 } }, linearLength: 860, contractedAmount: 9_600_000, actualAmount: 9_512_300, bidYear: 2024, contractedStart: "2024-07-15", contractedCompletion: "2024-12-10", actualStart: "2024-07-22", actualCompletion: "2024-12-02", percent: 100, roadId: "rd-burgos", notes: "64 LED fixtures energized; turnover accepted December 2024. Includes dusk-to-dawn photocell controllers." },
  { id: "RPIS-2024-029", name: "Valencia Street Sidewalk Construction", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-06-03-01-01-00-04", folderNo: "OCE-IF-2024-029", implementorId: "CTR-002", inchargeId: "ENG-004", location: { barangays: ["San Pedro (Poblacion)"], evidence: { source: "KML", ref: "valencia_sidewalk_asbuilt.kml", lat: 9.7331, lng: 118.7356 } }, linearLength: 720, contractedAmount: 14_800_000, actualAmount: 14_655_000, bidYear: 2024, contractedStart: "2024-09-12", contractedCompletion: "2025-03-18", actualStart: "2024-09-28", actualCompletion: "2025-03-11", percent: 100, roadId: "rd-valencia", notes: "Interlocking blocks with ramps per BP 344 accessibility standards. Warranty period to September 2026." },
  { id: "RPIS-2025-033", name: "City Motorpool Site Development", type: "Site Development", mode: "By Contract", fund: "General Fund", objectCode: "1-07-01-01-01-00-00", folderNo: "OCE-IF-2025-033", implementorId: "CTR-004", inchargeId: "ENG-003", location: { barangays: ["Santa Lourdes"], evidence: { source: "Geotagged Image", ref: "IMG_20251208_110245.jpg", lat: 9.7455, lng: 118.7312 } }, linearLength: 640, contractedAmount: 22_100_000, actualAmount: 7_514_000, bidYear: 2025, contractedStart: "2025-10-08", contractedCompletion: "2026-09-30", actualStart: "2025-10-24", actualCompletion: null, percent: 34, roadId: undefined, notes: "Cut-and-fill 68% complete; perimeter fence footings ongoing. Linear length recorded as site perimeter per P&D convention." },
  { id: "RPIS-2025-036", name: "Bacungan Interior Road Concreting (Force Account)", type: "Concreting", mode: "By Administration", fund: "Calamity Fund (LDRRMF)", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-FA-2025-036", implementorId: "CTR-001", inchargeId: "ENG-003", location: { barangays: ["Bacungan"], evidence: { source: "GPX", ref: "bacungan_interior_forces.gpx", lat: 9.7712, lng: 118.7541 } }, linearLength: 1150, contractedAmount: 11_200_000, actualAmount: 4_592_000, bidYear: 2025, contractedStart: "2025-09-01", contractedCompletion: "2026-06-30", actualStart: "2025-09-14", actualCompletion: null, percent: 41, roadId: undefined, notes: "Post-typhoon restoration under force account with DPWH-assigned equipment. Aggregates hauled from city quarry." },
];

/* ---------------- field activity feed ---------------- */

export const activityFeed = [
  { ts: "2026-02-18 09:42", tag: "FIELD", text: "Percent-of-completion adjusted 56 → 62% on OCE-IF-2025-014 (Rizal Ave Sidewalk) — verified vs. geotagged IMG_20260218" },
  { ts: "2026-02-17 16:05", tag: "GIS", text: "GPX track north_rd_seg3_2025-11.gpx ingested as supporting evidence (ST_LineFromEncodedPath) — 1,412 vertices, 2.86 km" },
  { ts: "2026-02-17 11:30", tag: "BIDS", text: "Bid opening scheduled for OCE-IF-2026-005 Libis Coastal Rd Shoulder — 3 contractors pre-qualified, Mar 18 10:00" },
  { ts: "2026-02-16 14:22", tag: "INSP", text: "Materials core tests passed (3/3 cylinders) on North Road Concreting Seg. 3 — logged to OCE-IF-2024-036 folder" },
  { ts: "2026-02-15 10:08", tag: "SYNC", text: "Nightly normalize ran on project_records — 14 rows, barangay coverage re-indexed, evidence pins ST_Transform(4326→3857) refreshed" },
  { ts: "2026-02-14 08:51", tag: "FIELD", text: "Actual start encoded for OCE-FA-2025-041 San Manuel Force Account — 12 Jan 2026, crew of 22 deployed" },
];
