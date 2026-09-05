/* ─────────────────────────────────────────────────────────────
   RPIS DATA REGISTRY — Office of the City Engineer, Puerto Princesa
   project_records ⟶ FK implementor (contractors)
                 ⟶ FK project_incharge (engineers)
   LOCATION IS BARANGAY-BASED:
     · primary key of location = one or more barangays covered
     · field files = uploaded GEOTAGGED IMAGES or PDFs (attachments)
     · KML / GPX live in the Lot & ROW module as road centerlines,
       linked back to a record — they are NOT record evidence
   PIN RESOLUTION (where the project actually is):
     1. geotagged image EXIF GPS  → exact station
     2. linked centerline (Lot & ROW) → its centroid
     3. barangay centroid(s) → fallback
 ────────────────────────────────────────────────────────────── */

import { BARANGAY_POINTS, type Treatment } from "./roads";
import {
  type TechSpecs, type RevisionMeta, type ActualMeta,
  type SuspensionOrder, type VariationOrder,
} from "./specs";

export type ProjectType =
  | "Road Opening" | "Concreting" | "Site Development" | "Drainage System" | "Slope Protection"
  | "Street Lights" | "Road Shoulder" | "Sidewalk";

export type ModeOfImplementation = "By Contract" | "By Administration";
export type AttachmentKind = "Geotagged Image" | "PDF";

/** Uploaded field file — a geotagged photo or a PDF document. */
export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  sizeKB: number;
  lat: number | null;   // EXIF GPS — images only
  lng: number | null;
  thumb?: string;       // small dataURL preview — images only
  uploadedAt: string;   // ISO datetime
}

export interface ProjectLocation {
  barangays: string[];  // PRIMARY — one or more barangays covered
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
  location: ProjectLocation;       // barangay-based
  attachments: Attachment[];       // geotagged images / PDFs
  linearLength: number;            // meters
  contractedAmount: number;        // PHP
  actualAmount: number;            // PHP
  bidYear: number;
  contractedStart: string;         // ISO date
  contractedCompletion: string;
  actualStart: string | null;
  actualCompletion: string | null;
  percent: number;                 // 0–100 — adjusted via slider
  roadId?: string;                 // FK → road & street registry (the road being worked on)
  treatment: Treatment | null;     // road treatment this work performs — drives the inventory ladder
  notes: string;                   // Notes and remarks

  /* linked detail records — encoded in their own windows */
  technical: TechSpecs | null;                       // as-designed specs (road / shoulder / sidewalk / drainage / slope)
  revision: { specs: TechSpecs; meta: RevisionMeta } | null;  // revised design
  actual: { specs: TechSpecs; meta: ActualMeta } | null;      // as-built / actual project details
  suspensions: SuspensionOrder[];                    // suspension orders → adjust completion
  variations: VariationOrder[];                      // variation orders → adjust amount + completion
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
  "Road Opening", "Concreting", "Site Development", "Drainage System", "Slope Protection",
  "Street Lights", "Road Shoulder", "Sidewalk",
];

export const MODES: ModeOfImplementation[] = ["By Contract", "By Administration"];

export const FUNDS = [
  "20% Development Fund", "General Fund", "Calamity Fund (LDRRMF)",
  "DPWH Convergence Program", "NDRRMF + LGU Counterpart",
  "Special Education Fund", "Supplemental Budget", "FY Annual Plan",
];

export const TYPE_OBJECT_CODE: Record<ProjectType, string> = {
  "Road Opening": "1-06-03-01-01-00-05",
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

/* ---------------- lookups / formatting ---------------- */

export const typeShort: Record<ProjectType, string> = {
  "Road Opening": "OPEN", Concreting: "CONC", "Site Development": "SITE", "Drainage System": "DRNG",
  "Slope Protection": "SLOPE", "Street Lights": "LITE", "Road Shoulder": "SHLD",
  Sidewalk: "SWLK",
};

export const TYPE_COLORS: Record<ProjectType, string> = {
  "Road Opening": "#de5a36", Concreting: "#175c43", "Site Development": "#8a6d3b", "Drainage System": "#12897e",
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

/** First attachment carrying EXIF GPS — the exact project station. */
export const geotagOf = (r: ProjectRecord): Attachment | null =>
  (r.attachments ?? []).find((a) => a.lat != null && a.lng != null) ?? null;

/**
 * Record-based map point:
 *  · geotagged image GPS → exact station
 *  · else barangay centroid(s), averaged when multi-barangay
 * (The linked-centerline middle step lives in the store — see recordPoint.)
 */
export function projectPoint(r: ProjectRecord): [number, number] {
  const geo = geotagOf(r);
  if (geo) return [geo.lat!, geo.lng!];
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
  { id: "CTR-001", name: "OCE Forces (Force Account)", pcab: "—", category: "LGU Force Account / By Administration", address: "City Hall Compound, Brgy. San Pedro", contactPerson: "Engr. Ramon C. Villanueva", phone: "(048) 434-2811", email: "forces@oce.puertoprincesa.gov.ph" },
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
   attachments        = uploaded geotagged images (EXIF GPS) / PDFs
   centerlines        = seeded in data/cadastre, linked by projectId */

type SeedExtras = Partial<Pick<ProjectRecord, "technical" | "revision" | "actual" | "suspensions" | "variations">>;
const RAW_SEEDS: Omit<ProjectRecord, "treatment" | "technical" | "revision" | "actual" | "suspensions" | "variations">[] = [
  { id: "RPIS-2025-014", name: "Rizal Avenue Sidewalk & Drainage Improvement", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-06-03-01-01-00-04", folderNo: "OCE-IF-2025-014", implementorId: "CTR-002", inchargeId: "ENG-004", location: { barangays: ["San Pedro"] }, attachments: [], linearLength: 1240, contractedAmount: 24_800_000, actualAmount: 15_376_000, bidYear: 2025, contractedStart: "2025-03-10", contractedCompletion: "2026-02-28", actualStart: "2025-03-24", actualCompletion: null, percent: 62, roadId: "rd-rizal", notes: "Segment B (St. 0+640 – 1+240) pending PPC-ELCO utility relocation; revised completion target under review by Planning & Design." },
  { id: "RPIS-2025-021", name: "Tagumpay–Sta. Monica Connector Street Lighting", type: "Street Lights", mode: "By Contract", fund: "DPWH Convergence Program", objectCode: "1-06-05-01-99-00-01", folderNo: "OCE-IF-2025-021", implementorId: "CTR-006", inchargeId: "ENG-006", location: { barangays: ["Tagumpay", "Santa Monica"] }, attachments: [], linearLength: 1900, contractedAmount: 18_600_000, actualAmount: 2_232_000, bidYear: 2025, contractedStart: "2025-06-01", contractedCompletion: "2026-03-31", actualStart: "2025-06-20", actualCompletion: null, percent: 12, roadId: "rd-tagumpay", notes: "Poles 1–9 of 54 installed. Metering application with PPC-ELCO pending; pole setting paused at Sta. Monica junction." },
  { id: "RPIS-2024-036", name: "Bacungan Spur Road Concreting (Seg. 3)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-IF-2024-036", implementorId: "CTR-003", inchargeId: "ENG-003", location: { barangays: ["Bacungan"] }, attachments: [{ id: "ATT-001", kind: "Geotagged Image", name: "IMG_20251112_093412_pour.jpg", sizeKB: 2841, lat: 9.7671, lng: 118.7479, uploadedAt: "2025-11-12T09:34:12+08:00" }], linearLength: 2860, contractedAmount: 86_400_000, actualAmount: 67_392_000, bidYear: 2024, contractedStart: "2024-11-02", contractedCompletion: "2025-12-20", actualStart: "2024-11-18", actualCompletion: null, percent: 78, roadId: "rd-bacungan", notes: "Concrete pour St. 2+340 – 2+860 verified by materials engineer; 28-day core samples passed. Catch-up plan submitted for rain delays." },
  { id: "RPIS-2025-008", name: "Iwahig Penal Colony Road Drainage System", type: "Drainage System", mode: "By Contract", fund: "NDRRMF + LGU Counterpart", objectCode: "1-06-03-01-04-00-00", folderNo: "OCE-IF-2025-008", implementorId: "CTR-004", inchargeId: "ENG-002", location: { barangays: ["Iwahig", "Irawan"] }, attachments: [{ id: "ATT-002", kind: "Geotagged Image", name: "IMG_20251004_141233_row.jpg", sizeKB: 3122, lat: 9.7115, lng: 118.7268, uploadedAt: "2025-10-04T14:12:33+08:00" }, { id: "ATT-003", kind: "PDF", name: "NDRRMF_utilization_report_Q3.pdf", sizeKB: 894, lat: null, lng: null, uploadedAt: "2025-10-20T16:40:00+08:00" }], linearLength: 1650, contractedAmount: 32_700_000, actualAmount: 13_407_000, bidYear: 2024, contractedStart: "2025-02-01", contractedCompletion: "2025-10-15", actualStart: "2025-02-19", actualCompletion: null, percent: 41, roadId: "rd-iwahig", notes: "Slipped 128 days on ROW dispute at St. 1+100; suspension lifted 2025-12-01. Contractor required to submit revised catch-up program." },
  { id: "RPIS-2024-047", name: "Lacao Street Drainage Line", type: "Drainage System", mode: "By Contract", fund: "General Fund", objectCode: "1-06-03-01-04-00-00", folderNo: "OCE-IF-2024-047", implementorId: "CTR-005", inchargeId: "ENG-004", location: { barangays: ["Liwanag"] }, attachments: [{ id: "ATT-004", kind: "PDF", name: "lacao_drainage_asbuilt_plan.pdf", sizeKB: 1560, lat: null, lng: null, uploadedAt: "2025-02-12T11:05:00+08:00" }], linearLength: 940, contractedAmount: 6_900_000, actualAmount: 6_842_500, bidYear: 2024, contractedStart: "2024-10-01", contractedCompletion: "2025-02-14", actualStart: "2024-10-08", actualCompletion: "2025-02-10", percent: 100, roadId: "rd-lacao", notes: "As-built survey approved by P&D; final payment processed March 2025. Warranty runs to Feb 2026." },
  { id: "RPIS-2025-017", name: "Mandaragat Road Concreting (Seg. 1)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-IF-2025-017", implementorId: "CTR-003", inchargeId: "ENG-003", location: { barangays: ["Mandaragat"] }, attachments: [], linearLength: 1980, contractedAmount: 27_500_000, actualAmount: 15_125_000, bidYear: 2025, contractedStart: "2025-04-22", contractedCompletion: "2026-04-22", actualStart: "2025-05-06", actualCompletion: null, percent: 55, roadId: "rd-mandaragat", notes: "Sub-base 100%, paving 41%. Rainy-season slippage absorbed by contract float; no extension of time filed." },
  { id: "RPIS-2026-002", name: "Tiniguiban Road Shoulder Widening", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: "1-06-03-01-01-00-03", folderNo: "OCE-IF-2026-002", implementorId: "CTR-003", inchargeId: "ENG-006", location: { barangays: ["Tiniguiban"] }, attachments: [], linearLength: 2400, contractedAmount: 18_200_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-05-04", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-tiniguiban", notes: "Notice to Proceed pending; contractor mobilization scheduled May 2026. Shoulder width 1.5 m both sides. No field capture yet — pin at barangay centroid." },
  { id: "RPIS-2026-005", name: "Libis Coastal Road Shoulder & Guardrail", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: "1-06-03-01-01-00-03", folderNo: "OCE-IF-2026-005", implementorId: "CTR-007", inchargeId: "ENG-002", location: { barangays: ["Bancao-Bancao"] }, attachments: [{ id: "ATT-005", kind: "PDF", name: "OCE-IF-2026-005_bid_documents.pdf", sizeKB: 4210, lat: null, lng: null, uploadedAt: "2026-02-10T09:00:00+08:00" }], linearLength: 3150, contractedAmount: 38_900_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-04-01", contractedCompletion: "2027-03-30", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-libis", notes: "Bid opening 18 Mar 2026, 10:00 at BAC Conference Room. Three contractors pre-qualified; includes 890 m steel guardrail." },
  { id: "RPIS-2026-007", name: "Iwahig Slope Protection Works", type: "Slope Protection", mode: "By Contract", fund: "DPWH Convergence Program", objectCode: "1-06-03-01-02-00-00", folderNo: "OCE-IF-2026-007", implementorId: "CTR-004", inchargeId: "ENG-005", location: { barangays: ["Iwahig"] }, attachments: [{ id: "ATT-006", kind: "PDF", name: "iwahig_geotech_boring_report.pdf", sizeKB: 6733, lat: null, lng: null, uploadedAt: "2026-01-28T15:22:00+08:00" }], linearLength: 620, contractedAmount: 52_000_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-06-01", contractedCompletion: "2027-08-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-iwahig", notes: "Pre-qualification underway. Geotechnical boring completed (3 boreholes, 15 m depth); gabion + ripraps design under review. Borehole geotags to be attached after design approval." },
  { id: "RPIS-2025-041", name: "San Manuel Road Concreting (Force Account)", type: "Concreting", mode: "By Administration", fund: "20% Development Fund", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-FA-2025-041", implementorId: "CTR-001", inchargeId: "ENG-004", location: { barangays: ["San Manuel"] }, attachments: [], linearLength: 1450, contractedAmount: 16_400_000, actualAmount: 6_724_000, bidYear: 2025, contractedStart: "2025-11-20", contractedCompletion: "2026-10-30", actualStart: "2026-01-12", actualCompletion: null, percent: 41, roadId: "rd-sanman", notes: "Force-account execution using LGU batching plant. Materials procurement on schedule; labor force at 22 personnel." },
  { id: "RPIS-2024-052", name: "Burgos Street LED Street Lighting", type: "Street Lights", mode: "By Contract", fund: "General Fund", objectCode: "1-06-05-01-99-00-01", folderNo: "OCE-IF-2024-052", implementorId: "CTR-006", inchargeId: "ENG-006", location: { barangays: ["San Pedro"] }, attachments: [], linearLength: 860, contractedAmount: 9_600_000, actualAmount: 9_512_300, bidYear: 2024, contractedStart: "2024-07-15", contractedCompletion: "2024-12-10", actualStart: "2024-07-22", actualCompletion: "2024-12-02", percent: 100, roadId: "rd-burgos", notes: "64 LED fixtures energized; turnover accepted December 2024. Includes dusk-to-dawn photocell controllers." },
  { id: "RPIS-2024-029", name: "Valencia Street Sidewalk Construction", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: "1-06-03-01-01-00-04", folderNo: "OCE-IF-2024-029", implementorId: "CTR-002", inchargeId: "ENG-004", location: { barangays: ["San Pedro"] }, attachments: [], linearLength: 720, contractedAmount: 14_800_000, actualAmount: 14_655_000, bidYear: 2024, contractedStart: "2024-09-12", contractedCompletion: "2025-03-18", actualStart: "2024-09-28", actualCompletion: "2025-03-11", percent: 100, roadId: "rd-valencia", notes: "Interlocking blocks with ramps per BP 344 accessibility standards. Warranty period to September 2026." },
  { id: "RPIS-2025-033", name: "City Motorpool Site Development", type: "Site Development", mode: "By Contract", fund: "General Fund", objectCode: "1-07-01-01-01-00-00", folderNo: "OCE-IF-2025-033", implementorId: "CTR-004", inchargeId: "ENG-003", location: { barangays: ["Santa Lourdes"] }, attachments: [{ id: "ATT-007", kind: "Geotagged Image", name: "IMG_20251208_110245_cutfill.jpg", sizeKB: 2214, lat: 9.7455, lng: 118.7312, uploadedAt: "2025-12-08T11:02:45+08:00" }], linearLength: 640, contractedAmount: 22_100_000, actualAmount: 7_514_000, bidYear: 2025, contractedStart: "2025-10-08", contractedCompletion: "2026-09-30", actualStart: "2025-10-24", actualCompletion: null, percent: 34, roadId: undefined, notes: "Cut-and-fill 68% complete; perimeter fence footings ongoing. Linear length recorded as site perimeter per P&D convention." },
  { id: "RPIS-2025-036", name: "Bacungan Interior Road Concreting (Force Account)", type: "Concreting", mode: "By Administration", fund: "Calamity Fund (LDRRMF)", objectCode: "1-07-03-01-01-00-02", folderNo: "OCE-FA-2025-036", implementorId: "CTR-001", inchargeId: "ENG-003", location: { barangays: ["Bacungan"] }, attachments: [], linearLength: 1150, contractedAmount: 11_200_000, actualAmount: 4_592_000, bidYear: 2025, contractedStart: "2025-09-01", contractedCompletion: "2026-06-30", actualStart: "2025-09-14", actualCompletion: null, percent: 41, roadId: undefined, notes: "Post-typhoon restoration under force account with DPWH-assigned equipment. Aggregates hauled from city quarry." },
  { id: "RPIS-2026-010", name: "Sicsican Farm-to-Market Road Opening (Seg. 2)", type: "Road Opening", mode: "By Administration", fund: "20% Development Fund", objectCode: "1-06-03-01-01-00-05", folderNo: "OCE-FA-2026-010", implementorId: "CTR-001", inchargeId: "ENG-003", location: { barangays: ["Sicsican"] }, attachments: [], linearLength: 3200, contractedAmount: 8_400_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-03-02", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-sicsican", notes: "Earth-road opening ahead of programmed graveling: clearing, grubbing, grading and compaction of the 3.2 km farm-to-market alignment. Gravel seal to follow under a separate graveling project." },
];

/* pavement works default to their matching treatment; ancillary works (drainage,
   lighting, sidewalks…) carry no treatment and never move the inventory ladder */
const DEFAULT_TREATMENT: Partial<Record<ProjectType, Treatment>> = {
  "Road Opening": "Road Opening",
  Concreting: "Concreting",
};

/* linked detail records seeded on a few projects so the tables demonstrate themselves */
const SEED_EXTRAS: Record<string, SeedExtras> = {
  "RPIS-2025-014": {
    technical: {
      road: { widthM: "9.0", lanes: "2", pavement: "Asphalt", pavementCm: "10", subbaseCm: "20" },
      shoulder: { widthM: "", type: "", thicknessCm: "" },
      sidewalk: { widthM: "1.8", thicknessCm: "12", finish: "Interlocking blocks", ramps: "Yes — BP 344" },
      drainage: { type: "RC box culvert", sizeM: "0.9 × 0.9", lengthM: "1240" },
      slope: { type: "", heightM: "", lengthM: "" },
    },
    revision: {
      specs: {
        road: { widthM: "9.0", lanes: "2", pavement: "Asphalt", pavementCm: "10", subbaseCm: "20" },
        shoulder: { widthM: "", type: "", thicknessCm: "" },
        sidewalk: { widthM: "1.5", thicknessCm: "12", finish: "Interlocking blocks", ramps: "Yes — BP 344" },
        drainage: { type: "RC box culvert", sizeM: "0.9 × 0.9", lengthM: "1240" },
        slope: { type: "", heightM: "", lengthM: "" },
      },
      meta: { revisionNo: "REV-1", date: "2025-08-14", reason: "Utility conflict at St. 0+640 — sidewalk narrowed to 1.5 m on Segment B" },
    },
    suspensions: [],
    variations: [],
  },
  "RPIS-2025-008": {
    technical: {
      road: { widthM: "", lanes: "", pavement: "", pavementCm: "", subbaseCm: "" },
      shoulder: { widthM: "", type: "", thicknessCm: "" },
      sidewalk: { widthM: "", thicknessCm: "", finish: "", ramps: "" },
      drainage: { type: "Open channel (lined)", sizeM: "1.2 × 0.8", lengthM: "1650" },
      slope: { type: "Gabion", heightM: "2.5", lengthM: "180" },
    },
    revision: null,
    actual: null,
    suspensions: [
      { id: "SO-001", orderNo: "OCE-SO-2025-011", dateSuspended: "2025-06-20", dateResumed: "2025-12-01", durationDays: 165, daysUsed: 164, remarks: "ROW dispute at St. 1+100; work suspended pending amicable settlement with affected lot owners" },
    ],
    variations: [
      { id: "VO-001", orderNo: "OCE-VO-2025-004", revisedAmount: 1_850_000, timeExtensionDays: 30, dateRequested: "2025-09-02", dateApproved: "2025-10-10", remarks: "Additional 180 m gabion slope protection added at the Iwahig creek approach" },
    ],
  },
  "RPIS-2024-047": {
    technical: {
      road: { widthM: "", lanes: "", pavement: "", pavementCm: "", subbaseCm: "" },
      shoulder: { widthM: "", type: "", thicknessCm: "" },
      sidewalk: { widthM: "", thicknessCm: "", finish: "", ramps: "" },
      drainage: { type: "RC pipe", sizeM: "Ø 0.60", lengthM: "940" },
      slope: { type: "", heightM: "", lengthM: "" },
    },
    revision: null,
    actual: {
      specs: {
        road: { widthM: "", lanes: "", pavement: "", pavementCm: "", subbaseCm: "" },
        shoulder: { widthM: "", type: "", thicknessCm: "" },
        sidewalk: { widthM: "", thicknessCm: "", finish: "", ramps: "" },
        drainage: { type: "RC pipe", sizeM: "Ø 0.60", lengthM: "946" },
        slope: { type: "", heightM: "", lengthM: "" },
      },
      meta: { date: "2025-02-12", certifiedBy: "Engr. Marco T. Ilustrisimo" },
    },
    suspensions: [],
    variations: [],
  },
};

export const seedRecords: ProjectRecord[] = RAW_SEEDS.map((s) => ({
  ...s,
  treatment: DEFAULT_TREATMENT[s.type] ?? null,
  technical: SEED_EXTRAS[s.id]?.technical ?? null,
  revision: SEED_EXTRAS[s.id]?.revision ?? null,
  actual: SEED_EXTRAS[s.id]?.actual ?? null,
  suspensions: SEED_EXTRAS[s.id]?.suspensions ?? [],
  variations: SEED_EXTRAS[s.id]?.variations ?? [],
}));

/* ---------------- field activity feed ---------------- */

export const activityFeed = [
  { ts: "2026-02-18 09:42", tag: "FIELD", text: "Percent-of-completion adjusted 56 → 62% on OCE-IF-2025-014 (Rizal Ave Sidewalk) — verified against linked centerline CL-001" },
  { ts: "2026-02-17 16:05", tag: "GIS", text: "GPX track mandaragat_seg1.gpx ingested in Lot & ROW as centerline CL-002 → linked to OCE-IF-2025-017; project pin now resolves from the axis" },
  { ts: "2026-02-17 11:30", tag: "BIDS", text: "Bid opening scheduled for OCE-IF-2026-005 Libis Coastal Rd Shoulder — 3 contractors pre-qualified, Mar 18 10:00" },
  { ts: "2026-02-16 14:22", tag: "FILE", text: "Geotagged photo IMG_20251112_093412_pour.jpg attached to OCE-IF-2024-036 — EXIF GPS 9.76710N 118.74790E set as project station" },
  { ts: "2026-02-15 10:08", tag: "SYNC", text: "Nightly normalize ran on project_records — 14 rows, barangay coverage re-indexed, attachment GPS pins ST_Transform(4326→3857) refreshed" },
  { ts: "2026-02-14 08:51", tag: "FIELD", text: "Actual start encoded for OCE-FA-2025-041 San Manuel Force Account — 12 Jan 2026, crew of 22 deployed" },
];
