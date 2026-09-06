/* Core registry — the 21-field project records, contractors, and the UNIFIED
   personnel dataset: every Person row is simultaneously an in-charge personnel
   profile AND a login account (one dataset, one source of truth). */

import { BARANGAY_POINTS } from "./roads";
import { joinName, type NameParts } from "./auth";
import type { TechSpecs, RevisionMeta, ActualMeta, SuspensionOrder, VariationOrder } from "./specs";

/* ---------------- unified person (account + personnel profile) ---------------- */

export interface Person extends NameParts {
  id: string;             // USR-###
  name: string;           // computed display "Prefix First M. Surname"
  email: string;
  passHash: string;
  salt: string;
  role: string;           // RoleDef id
  position: string;
  division: string;
  divisionCode: string;
  prc: string;
  phone: string;
  createdAt: string;
}

/* ---------------- attachments ---------------- */

export type AttachmentKind = "Geotagged Image" | "PDF";

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  sizeKB: number;
  lat: number | null;
  lng: number | null;
  thumb?: string;
  uploadedAt: string;
  raw?: string;           // untouched original bytes (EXIF intact)
  mime?: string;
}

/* ---------------- project record (21 fields + detail records) ---------------- */

export type ProjectType =
  | "Road Opening" | "Concreting" | "Site Development" | "Drainage System"
  | "Slope Protection" | "Street Lights" | "Road Shoulder" | "Sidewalk";

export type ModeOfImplementation = "By Contract" | "By Administration";

export interface ProjectRecord {
  id: string;                    // Project ID — RPIS-YYYY-NNN
  name: string;
  type: ProjectType;
  mode: ModeOfImplementation;
  fund: string;
  objectCode: string;
  folderNo: string;
  implementorId: string;         // FK → contractors
  inchargeId: string;            // FK → personnel (Person.id)
  location: { barangays: string[] };
  linearLength: number;
  contractedAmount: number;
  actualAmount: number;
  bidYear: number;
  contractedStart: string;
  contractedCompletion: string;
  actualStart: string | null;
  actualCompletion: string | null;
  percent: number;
  roadId?: string;               // FK → road & street registry
  treatment: "Road Opening" | "Road Graveling" | "Asphalting" | "Concreting" | null;
  notes: string;
  attachments: Attachment[];
  technical: TechSpecs | null;
  revision: { specs: TechSpecs; meta: RevisionMeta } | null;
  actual: { specs: TechSpecs; meta: ActualMeta } | null;
  suspensions: SuspensionOrder[];
  variations: VariationOrder[];
}

export interface Contractor {
  id: string; name: string; pcab: string; category: string;
  address: string; contactPerson: string; phone: string; email: string;
}

/* ---------------- constants ---------------- */

export const PROJECT_TYPES: ProjectType[] = [
  "Road Opening", "Concreting", "Site Development", "Drainage System",
  "Slope Protection", "Street Lights", "Road Shoulder", "Sidewalk",
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

export const typeShort: Record<ProjectType, string> = {
  "Road Opening": "OPEN", Concreting: "CONC", "Site Development": "SITE", "Drainage System": "DRNG",
  "Slope Protection": "SLOPE", "Street Lights": "LITE", "Road Shoulder": "SHLD", Sidewalk: "SWLK",
};

export const TYPE_COLORS: Record<ProjectType, string> = {
  "Road Opening": "#de5a36", Concreting: "#175c43", "Site Development": "#8a6d3b", "Drainage System": "#12897e",
  "Slope Protection": "#b84423", "Street Lights": "#f0a32b", "Road Shoulder": "#4a70b0", Sidewalk: "#5f8f6e",
};

export const typeAbbr = (t: ProjectType | string): string => typeShort[t as ProjectType] ?? String(t).slice(0, 4).toUpperCase();
export const typeColorOf = (t: ProjectType | string): string => TYPE_COLORS[t as ProjectType] ?? "#3f6350";

/* ---------------- formatting ---------------- */

export const fmtPeso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
export const fmtPesoM = (n: number) => `₱${(n / 1e6).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${String(d).padStart(2, "0")} '${String(y).slice(2)}`;
}

export const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 86400000);

export function durationOf(r: { actualStart: string | null; actualCompletion: string | null }): string {
  const today = new Date().toISOString().slice(0, 10);
  if (r.actualStart && r.actualCompletion) {
    const d = daysBetween(r.actualStart, r.actualCompletion);
    return d >= 60 ? `${Math.floor(d / 30)} mo ${d % 30} d` : `${d} d`;
  }
  if (r.actualStart) return `ongoing · ${daysBetween(r.actualStart, today)} d elapsed`;
  return "—";
}

/* ---------------- status derivation ---------------- */

export type StatusLabel = "Not Started" | "Ongoing" | "Delayed" | "Completed";
export interface StatusMeta { label: StatusLabel; color: string; soft: string; ring: string; }

export const STATUS_META: Record<StatusLabel, StatusMeta> = {
  "Not Started": { label: "Not Started", color: "#4a70b0", soft: "rgba(74,112,176,0.14)", ring: "rgba(74,112,176,0.45)" },
  Ongoing: { label: "Ongoing", color: "#f0a32b", soft: "rgba(240,163,43,0.14)", ring: "rgba(240,163,43,0.45)" },
  Delayed: { label: "Delayed", color: "#de5a36", soft: "rgba(222,90,54,0.14)", ring: "rgba(222,90,54,0.45)" },
  Completed: { label: "Completed", color: "#1e7a58", soft: "rgba(30,122,88,0.14)", ring: "rgba(30,122,88,0.45)" },
};
export const STATUS_LABELS: StatusLabel[] = ["Not Started", "Ongoing", "Delayed", "Completed"];

export function statusOf(r: Pick<ProjectRecord, "percent" | "contractedCompletion">): StatusMeta {
  const today = new Date().toISOString().slice(0, 10);
  if (r.percent >= 100) return STATUS_META.Completed;
  if (r.percent <= 0) return r.contractedCompletion < today ? STATUS_META.Delayed : STATUS_META["Not Started"];
  return r.contractedCompletion < today ? STATUS_META.Delayed : STATUS_META.Ongoing;
}

export const geotagOf = (r: ProjectRecord): Attachment | undefined =>
  (r.attachments ?? []).find((a) => a.lat != null && a.lng != null);

export function projectPoint(r: ProjectRecord): [number, number] {
  const pts = r.location.barangays
    .map((b) => BARANGAY_POINTS[b])
    .filter((p): p is [number, number] => Array.isArray(p));
  if (!pts.length) return [9.7389, 118.739];
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

/* ---------------- seed data ---------------- */

export const seedContractors: Contractor[] = [
  { id: "CTR-001", name: "OCE Forces (Force Account)", pcab: "—", category: "LGU Force Account / By Administration", address: "City Hall Compound, Brgy. San Pedro", contactPerson: "Engr. Ramon C. Villanueva", phone: "(048) 434-2811", email: "forces@oce.puertoprincesa.gov.ph" },
  { id: "CTR-002", name: "Palawan Buildwell Corporation", pcab: "AAAA", category: "General Engineering / Roads", address: "Km 2 National Highway, Brgy. San Manuel", contactPerson: "Arch. Dennis Uy", phone: "(048) 433-7182", email: "ops@buildwellpalawan.ph" },
  { id: "CTR-003", name: "Sandoval Construction & Dev't Corp.", pcab: "AAA", category: "Infrastructure / Concreting", address: "Brgy. Bacungan, Puerto Princesa City", contactPerson: "Mr. Ramil Sandoval", phone: "0917 802 4471", email: "projects@sandovalcdc.ph" },
  { id: "CTR-004", name: "Irawan Earthworks Inc.", pcab: "AA", category: "Earthworks / Slope Protection", address: "Brgy. Irawan, Puerto Princesa City", contactPerson: "Engr. Lito Panganiban", phone: "0928 551 0932", email: "main@irawanearthworks.ph" },
  { id: "CTR-005", name: "HydroLine Builders", pcab: "A", category: "Drainage & Waterworks", address: "Brgy. Liwanag, Puerto Princesa City", contactPerson: "Mr. Cesar Abellanosa", phone: "0906 214 8873", email: "hydro@hydrolinebuilders.ph" },
  { id: "CTR-006", name: "LuzVolt Systems", pcab: "B", category: "Electrical / Street Lighting", address: "Brgy. Mandaragat, Puerto Princesa City", contactPerson: "Mr. Alvin Recto", phone: "0915 330 9126", email: "luzvolt@luzvolt.ph" },
  { id: "CTR-007", name: "Consunji–Palawan JV", pcab: "AAAA", category: "Major Roads / Widening", address: "Satellite Office, Brgy. Sta. Monica", contactPerson: "Engr. Paolo Consunji", phone: "(02) 8893-4410", email: "palawan@consunji-jv.ph" },
];

/** Demo personnel — passHash is filled by ensureAuthReady() on first load. */
export function seedPersonnel(): Person[] {
  const rows: [string, NameParts, string, string, string, string, string, string][] = [
    ["USR-001", { prefix: "Engr.", firstName: "Ramon", middleName: "Castillo", lastName: "Villanueva" }, "admin@oce.puertoprincesa.gov.ph", "admin", "City Engineer", "Administrative Division", "AD", "0098771"],
    ["USR-002", { prefix: "Engr.", firstName: "Maria", middleName: "Lacson", lastName: "Fernandez" }, "city.engineer@oce.puertoprincesa.gov.ph", "executive", "Assistant City Engineer", "Administrative Division", "AD", "0114208"],
    ["USR-003", { prefix: "Engr.", firstName: "Jose", middleName: "Panganiban", lastName: "Alcala" }, "jose.alcala@oce.puertoprincesa.gov.ph", "encoder", "District Engineer", "Construction Division", "CD", "0131557"],
    ["USR-004", { prefix: "Engr.", firstName: "Ana", middleName: "Reyes", lastName: "Buenaventura" }, "ana.buenaventura@oce.puertoprincesa.gov.ph", "personnel", "Project Engineer", "Construction Division", "CD", "0152934"],
    ["USR-005", { prefix: "Engr.", firstName: "Marco", middleName: "Tan", lastName: "Ilustrisimo" }, "marco.ilustrisimo@oce.puertoprincesa.gov.ph", "personnel", "Materials Engineer", "Materials Testing Quality Control Division", "MTQC", "0140216"],
    ["USR-006", { prefix: "Engr.", firstName: "Katrina", middleName: "Dizon", lastName: "Salcedo" }, "katrina.salcedo@oce.puertoprincesa.gov.ph", "divisionHead", "Planning & Design Chief", "Planning Design & Programming Division", "PDPD", "0127650"],
  ];
  return rows.map(([id, np, email, role, position, division, divisionCode, prc]) => ({
    id, ...np, name: joinName(np), email, passHash: "", salt: `seed-${id}`, role,
    position, division, divisionCode, prc, phone: "(048) 434-2811",
    createdAt: "2026-01-05T08:00:00.000Z",
  }));
}

/** demo credentials hashed on first ensureAuthReady() */
export const DEMO_PASSWORDS: [string, string][] = [
  ["USR-001", "admin123"],
  ["USR-002", "oce2026"],
  ["USR-003", "demo123"],
  ["USR-004", "demo123"],
  ["USR-005", "demo123"],
  ["USR-006", "demo123"],
];

export const seedRecords: ProjectRecord[] = [
  { id: "RPIS-2025-014", name: "Rizal Avenue Sidewalk & Drainage Improvement", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Sidewalk, folderNo: "OCE-IF-2025-014", implementorId: "CTR-002", inchargeId: "USR-004", location: { barangays: ["San Pedro"] }, linearLength: 1240, contractedAmount: 24_800_000, actualAmount: 15_376_000, bidYear: 2025, contractedStart: "2025-03-10", contractedCompletion: "2026-02-28", actualStart: "2025-03-24", actualCompletion: null, percent: 62, roadId: "rd-rizal", treatment: null, notes: "Segment B (St. 0+640 – 1+240) pending PPC-ELCO utility relocation; revised completion target under review by Planning & Design.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2024-036", name: "Bacungan Spur Road Concreting (Seg. 3)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Concreting, folderNo: "OCE-IF-2024-036", implementorId: "CTR-003", inchargeId: "USR-003", location: { barangays: ["Bacungan"] }, linearLength: 2860, contractedAmount: 86_400_000, actualAmount: 67_392_000, bidYear: 2024, contractedStart: "2024-11-02", contractedCompletion: "2025-12-20", actualStart: "2024-11-18", actualCompletion: null, percent: 78, roadId: "rd-bacungan", treatment: "Concreting", notes: "Concrete pour St. 2+340 – 2+860 verified by materials engineer; 28-day core samples passed.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2025-008", name: "Iwahig Penal Colony Road Drainage System", type: "Drainage System", mode: "By Contract", fund: "NDRRMF + LGU Counterpart", objectCode: TYPE_OBJECT_CODE["Drainage System"], folderNo: "OCE-IF-2025-008", implementorId: "CTR-004", inchargeId: "USR-005", location: { barangays: ["Iwahig", "Irawan"] }, linearLength: 1650, contractedAmount: 32_700_000, actualAmount: 13_407_000, bidYear: 2024, contractedStart: "2025-02-01", contractedCompletion: "2025-10-15", actualStart: "2025-02-19", actualCompletion: null, percent: 41, roadId: "rd-iwahig", treatment: null, notes: "Slipped 128 days on ROW dispute at St. 1+100; suspension lifted 2025-12-01.", attachments: [], technical: null, revision: null, actual: null,
    suspensions: [{ id: "SO-001", orderNo: "OO-2025-018", dateSuspended: "2025-06-02", dateResumed: "2025-12-01", durationDays: 182, daysUsed: 128, remarks: "ROW dispute at St. 1+100" }],
    variations: [{ id: "VO-001", orderNo: "OO-2025-027", revisedAmount: 1_250_000, timeExtensionDays: 30, dateRequested: "2025-09-10", dateApproved: "2025-10-02", remarks: "Added 120 m channel at Irawan crossing" }] },
  { id: "RPIS-2024-047", name: "Lacao Street Drainage Line", type: "Drainage System", mode: "By Contract", fund: "General Fund", objectCode: TYPE_OBJECT_CODE["Drainage System"], folderNo: "OCE-IF-2024-047", implementorId: "CTR-005", inchargeId: "USR-004", location: { barangays: ["Liwanag"] }, linearLength: 940, contractedAmount: 6_900_000, actualAmount: 6_842_500, bidYear: 2024, contractedStart: "2024-10-01", contractedCompletion: "2025-02-14", actualStart: "2024-10-08", actualCompletion: "2025-02-10", percent: 100, roadId: "rd-lacao", treatment: null, notes: "As-built survey approved; final payment processed March 2025.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2025-017", name: "Mandaragat Road Concreting (Seg. 1)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Concreting, folderNo: "OCE-IF-2025-017", implementorId: "CTR-003", inchargeId: "USR-003", location: { barangays: ["Mandaragat"] }, linearLength: 1980, contractedAmount: 27_500_000, actualAmount: 15_125_000, bidYear: 2025, contractedStart: "2025-04-22", contractedCompletion: "2026-04-22", actualStart: "2025-05-06", actualCompletion: null, percent: 55, roadId: "rd-mandaragat", treatment: "Concreting", notes: "Sub-base 100%, paving 41%.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2026-002", name: "Tiniguiban Road Shoulder Widening", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: TYPE_OBJECT_CODE["Road Shoulder"], folderNo: "OCE-IF-2026-002", implementorId: "CTR-003", inchargeId: "USR-006", location: { barangays: ["Tiniguiban"] }, linearLength: 2400, contractedAmount: 18_200_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-05-04", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-tiniguiban", treatment: null, notes: "Notice to Proceed pending.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2026-005", name: "Libis Coastal Road Shoulder & Guardrail", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: TYPE_OBJECT_CODE["Road Shoulder"], folderNo: "OCE-IF-2026-005", implementorId: "CTR-007", inchargeId: "USR-004", location: { barangays: ["Bancao-Bancao"] }, linearLength: 3150, contractedAmount: 38_900_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-04-01", contractedCompletion: "2027-03-30", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-libis", treatment: null, notes: "Bid opening 18 Mar 2026; includes 890 m steel guardrail.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2026-007", name: "Iwahig Slope Protection Works", type: "Slope Protection", mode: "By Contract", fund: "DPWH Convergence Program", objectCode: TYPE_OBJECT_CODE["Slope Protection"], folderNo: "OCE-IF-2026-007", implementorId: "CTR-004", inchargeId: "USR-005", location: { barangays: ["Iwahig"] }, linearLength: 620, contractedAmount: 52_000_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-06-01", contractedCompletion: "2027-08-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-iwahig", treatment: null, notes: "Geotechnical boring completed; gabion design under review.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2025-041", name: "San Manuel Road Concreting (Force Account)", type: "Concreting", mode: "By Administration", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Concreting, folderNo: "OCE-FA-2025-041", implementorId: "CTR-001", inchargeId: "USR-003", location: { barangays: ["San Manuel"] }, linearLength: 1450, contractedAmount: 16_400_000, actualAmount: 6_724_000, bidYear: 2025, contractedStart: "2025-11-20", contractedCompletion: "2026-10-30", actualStart: "2026-01-12", actualCompletion: null, percent: 41, roadId: "rd-sanman", treatment: "Concreting", notes: "Force account with LGU batching plant.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2024-052", name: "Burgos Street LED Street Lighting", type: "Street Lights", mode: "By Contract", fund: "General Fund", objectCode: TYPE_OBJECT_CODE["Street Lights"], folderNo: "OCE-IF-2024-052", implementorId: "CTR-006", inchargeId: "USR-006", location: { barangays: ["San Pedro"] }, linearLength: 860, contractedAmount: 9_600_000, actualAmount: 9_512_300, bidYear: 2024, contractedStart: "2024-07-15", contractedCompletion: "2024-12-10", actualStart: "2024-07-22", actualCompletion: "2024-12-02", percent: 100, roadId: "rd-burgos", treatment: null, notes: "64 LED fixtures energized; turnover accepted December 2024.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2024-029", name: "Valencia Street Sidewalk Construction", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Sidewalk, folderNo: "OCE-IF-2024-029", implementorId: "CTR-002", inchargeId: "USR-004", location: { barangays: ["San Pedro"] }, linearLength: 720, contractedAmount: 14_800_000, actualAmount: 14_655_000, bidYear: 2024, contractedStart: "2024-09-12", contractedCompletion: "2025-03-18", actualStart: "2024-09-28", actualCompletion: "2025-03-11", percent: 100, roadId: "rd-valencia", treatment: null, notes: "Interlocking blocks with BP 344 ramps.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2025-033", name: "City Motorpool Site Development", type: "Site Development", mode: "By Contract", fund: "General Fund", objectCode: TYPE_OBJECT_CODE["Site Development"], folderNo: "OCE-IF-2025-033", implementorId: "CTR-004", inchargeId: "USR-006", location: { barangays: ["Santa Lourdes"] }, linearLength: 640, contractedAmount: 22_100_000, actualAmount: 7_514_000, bidYear: 2025, contractedStart: "2025-10-08", contractedCompletion: "2026-09-30", actualStart: "2025-10-24", actualCompletion: null, percent: 34, roadId: undefined, treatment: null, notes: "Cut-and-fill 68% complete; perimeter fence footings ongoing.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
  { id: "RPIS-2026-010", name: "Sicsican Farm-to-Market Road Opening (Seg. 2)", type: "Road Opening", mode: "By Administration", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE["Road Opening"], folderNo: "OCE-FA-2026-010", implementorId: "CTR-001", inchargeId: "USR-003", location: { barangays: ["Sicsican"] }, linearLength: 3200, contractedAmount: 8_400_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-03-02", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-sicsican", treatment: "Road Opening", notes: "Clearing, grubbing, grading and compaction; gravel seal to follow.", attachments: [], technical: null, revision: null, actual: null, suspensions: [], variations: [] },
];

export const activityFeed = [
  { ts: "2026-02-18 09:42", tag: "FIELD", text: "Percent-of-completion adjusted on OCE-IF-2025-014 (Rizal Ave Sidewalk) — verified vs. geotagged capture" },
  { ts: "2026-02-17 16:05", tag: "GIS", text: "GPX track bacungan_spur_seg3.gpx ingested as centerline axis — 4 vertices, 2.86 km" },
  { ts: "2026-02-17 11:30", tag: "BIDS", text: "Bid opening scheduled for OCE-IF-2026-005 Libis Coastal Rd Shoulder — Mar 18 10:00" },
  { ts: "2026-02-16 14:22", tag: "INSP", text: "Materials core tests passed (3/3 cylinders) on Bacungan Spur Concreting Seg. 3" },
  { ts: "2026-02-15 10:08", tag: "SYNC", text: "Nightly normalize ran on project_records — 13 rows, barangay coverage re-indexed" },
  { ts: "2026-02-14 08:51", tag: "FIELD", text: "Actual start encoded for OCE-FA-2025-041 San Manuel Force Account — crew of 22 deployed" },
];
