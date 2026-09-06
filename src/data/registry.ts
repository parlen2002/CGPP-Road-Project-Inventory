/* Project registry — the 21-field ledger. Location is barangay-based;
   KML/GPX become centerlines (Lot & ROW), geotagged images pinpoint stations. */

import { BARANGAY_POINTS, type Treatment } from "./roads";

export type ProjectType =
  | "Road Opening" | "Concreting" | "Site Development" | "Drainage System"
  | "Slope Protection" | "Street Lights" | "Road Shoulder" | "Sidewalk";
export type ModeOfImplementation = "By Contract" | "By Administration";
export type AttachmentKind = "Geotagged Image" | "PDF";

export interface Attachment {
  id: string; kind: AttachmentKind; name: string; sizeKB: number;
  lat: number | null; lng: number | null; thumb?: string; uploadedAt: string;
  raw?: string; mime?: string;
}

export interface ProjectLocation { barangays: string[]; }

export interface ProjectRecord {
  id: string; name: string; type: ProjectType; mode: ModeOfImplementation;
  fund: string; objectCode: string; folderNo: string;
  implementorId: string; inchargeId: string;
  location: ProjectLocation;
  linearLength: number; contractedAmount: number; actualAmount: number;
  bidYear: number; contractedStart: string; contractedCompletion: string;
  actualStart: string | null; actualCompletion: string | null;
  percent: number; roadId?: string; treatment: Treatment | null;
  notes: string; attachments: Attachment[];
  technical: import("./specs").TechSpecs | null;
  revision: { specs: import("./specs").TechSpecs; meta: import("./specs").RevisionMeta } | null;
  actual: { specs: import("./specs").TechSpecs; meta: import("./specs").ActualMeta } | null;
  suspensions: import("./specs").SuspensionOrder[];
  variations: import("./specs").VariationOrder[];
}

export interface Contractor {
  id: string; name: string; pcab: string; category: string;
  address: string; contactPerson: string; phone: string; email: string;
}
export interface Engineer {
  id: string; name: string; position: string; unit: string;
  prc: string; email: string; phone: string;
}

export const PROJECT_TYPES: ProjectType[] = [
  "Road Opening", "Concreting", "Site Development", "Drainage System",
  "Slope Protection", "Street Lights", "Road Shoulder", "Sidewalk",
];
export const MODES: ModeOfImplementation[] = ["By Contract", "By Administration"];
export const FUNDS = [
  "20% Development Fund", "General Fund", "Calamity Fund (LDRRMF)",
  "DPWH Convergence Program", "NDRRMF + LGU Counterpart", "FY Annual Plan",
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
export const typeAbbr = (t: ProjectType): string => typeShort[t] ?? t.slice(0, 4).toUpperCase();
export const typeColorOf = (t: ProjectType): string => TYPE_COLORS[t] ?? "#175c43";

export const fmtPeso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
export const fmtPesoM = (n: number) => `₱${(n / 1e6).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

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
  if (r.actualStart) return `ongoing · ${daysBetween(r.actualStart, new Date().toISOString().slice(0, 10))} d elapsed`;
  return "—";
}

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
  const today = new Date().toISOString().slice(0, 10);
  if (r.percent >= 100) return STATUS_META.Completed;
  if (r.percent <= 0) return r.contractedCompletion < today ? STATUS_META.Delayed : STATUS_META["Not Started"];
  return r.contractedCompletion < today ? STATUS_META.Delayed : STATUS_META.Ongoing;
}

export const geotagOf = (r: ProjectRecord): Attachment | undefined =>
  (r.attachments ?? []).find((a) => a.kind === "Geotagged Image" && a.lat != null && a.lng != null);

export function projectPoint(r: ProjectRecord): [number, number] {
  const geo = geotagOf(r);
  if (geo) return [geo.lat!, geo.lng!];
  const pts = (r.location.barangays ?? []).map((b) => BARANGAY_POINTS[b]).filter((p): p is [number, number] => Array.isArray(p));
  if (!pts.length) return [9.7389, 118.739];
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}
export function barangayLabel(r: ProjectRecord): string {
  const [first, ...rest] = r.location.barangays ?? [];
  return `Brgy. ${first ?? "—"}${rest.length ? ` +${rest.length}` : ""}`;
}

export const seedContractors: Contractor[] = [
  { id: "CTR-001", name: "OCE Forces (Force Account)", pcab: "—", category: "LGU Force Account / By Administration", address: "City Hall Compound, Brgy. San Pedro", contactPerson: "Engr. Ramon C. Villanueva", phone: "(048) 434-2811", email: "forces@oce.puertoprincesa.gov.ph" },
  { id: "CTR-002", name: "Palawan Buildwell Corporation", pcab: "AAAA", category: "General Engineering / Roads", address: "Km 2 National Highway, Brgy. San Manuel", contactPerson: "Arch. Dennis Uy", phone: "(048) 433-7182", email: "ops@buildwellpalawan.ph" },
  { id: "CTR-003", name: "Sandoval Construction & Dev't Corp.", pcab: "AAA", category: "Infrastructure / Concreting", address: "Brgy. Bacungan, Puerto Princesa City", contactPerson: "Mr. Ramil Sandoval", phone: "0917 802 4471", email: "projects@sandovalcdc.ph" },
  { id: "CTR-004", name: "Irawan Earthworks Inc.", pcab: "AA", category: "Earthworks / Slope Protection", address: "Brgy. Irawan, Puerto Princesa City", contactPerson: "Engr. Lito Panganiban", phone: "0928 551 0932", email: "main@irawanearthworks.ph" },
  { id: "CTR-005", name: "HydroLine Builders", pcab: "A", category: "Drainage & Waterworks", address: "Brgy. Liwanag, Puerto Princesa City", contactPerson: "Mr. Cesar Abellanosa", phone: "0906 214 8873", email: "hydro@hydrolinebuilders.ph" },
  { id: "CTR-006", name: "LuzVolt Systems", pcab: "B", category: "Electrical / Street Lighting", address: "Brgy. Mandaragat, Puerto Princesa City", contactPerson: "Mr. Alvin Recto", phone: "0915 330 9126", email: "luzvolt@luzvolt.ph" },
];

export const seedEngineers: Engineer[] = [
  { id: "ENG-001", name: "Engr. Ramon C. Villanueva", position: "City Engineer", unit: "Office of the City Engineer", prc: "0098771", email: "oce@puertoprincesa.gov.ph", phone: "(048) 434-2811" },
  { id: "ENG-002", name: "Engr. Maria L. Fernandez", position: "Assistant City Engineer", unit: "Office of the City Engineer", prc: "0114208", email: "ace@puertoprincesa.gov.ph", phone: "(048) 434-2812" },
  { id: "ENG-003", name: "Engr. Jose P. Alcala", position: "District Engineer", unit: "District Engineering — North", prc: "0131557", email: "north@oce.puertoprincesa.gov.ph", phone: "0917 442 8810" },
  { id: "ENG-004", name: "Engr. Ana R. Buenaventura", position: "Project Engineer", unit: "District Engineering — North", prc: "0152934", email: "a.buenaventura@oce.puertoprincesa.gov.ph", phone: "0928 771 3345" },
  { id: "ENG-005", name: "Engr. Marco T. Ilustrisimo", position: "Materials Engineer", unit: "Materials & Testing Unit", prc: "0140216", email: "materials@oce.puertoprincesa.gov.ph", phone: "0906 118 5527" },
  { id: "ENG-006", name: "Engr. Katrina D. Salcedo", position: "Planning & Design Chief", unit: "Planning & Design Unit", prc: "0127650", email: "planning@oce.puertoprincesa.gov.ph", phone: "0915 902 6684" },
];

/* seed records — roadId links match the road registry ids (rd-*) */
type RawSeed = Omit<ProjectRecord, "technical" | "revision" | "actual" | "suspensions" | "variations">;
const RAW: RawSeed[] = [
  { id: "RPIS-2025-014", name: "Rizal Avenue Sidewalk & Drainage Improvement", type: "Sidewalk", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Sidewalk, folderNo: "OCE-IF-2025-014", implementorId: "CTR-002", inchargeId: "ENG-004", location: { barangays: ["San Pedro"] }, linearLength: 1240, contractedAmount: 24_800_000, actualAmount: 15_376_000, bidYear: 2025, contractedStart: "2025-03-10", contractedCompletion: "2026-02-28", actualStart: "2025-03-24", actualCompletion: null, percent: 62, roadId: "rd-rizal", treatment: null, notes: "Segment B pending PPC-ELCO utility relocation; revised completion target under review.", attachments: [] },
  { id: "RPIS-2025-021", name: "Tagumpay–Sta. Monica Connector Street Lighting", type: "Street Lights", mode: "By Contract", fund: "DPWH Convergence Program", objectCode: TYPE_OBJECT_CODE["Street Lights"], folderNo: "OCE-IF-2025-021", implementorId: "CTR-006", inchargeId: "ENG-006", location: { barangays: ["Tagumpay", "Santa Monica"] }, linearLength: 1900, contractedAmount: 18_600_000, actualAmount: 2_232_000, bidYear: 2025, contractedStart: "2025-06-01", contractedCompletion: "2026-03-31", actualStart: "2025-06-20", actualCompletion: null, percent: 12, roadId: "rd-tagumpay", treatment: null, notes: "Poles 1–9 of 54 installed. Metering application with PPC-ELCO pending.", attachments: [] },
  { id: "RPIS-2024-036", name: "Bacungan Spur Road Concreting (Seg. 3)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Concreting, folderNo: "OCE-IF-2024-036", implementorId: "CTR-003", inchargeId: "ENG-003", location: { barangays: ["Bacungan"] }, linearLength: 2860, contractedAmount: 86_400_000, actualAmount: 67_392_000, bidYear: 2024, contractedStart: "2024-11-02", contractedCompletion: "2025-12-20", actualStart: "2024-11-18", actualCompletion: null, percent: 78, roadId: "rd-bacungan", treatment: "Concreting", notes: "Concrete pour verified by materials engineer; 28-day core samples passed.", attachments: [] },
  { id: "RPIS-2025-008", name: "Iwahig Penal Colony Road Drainage System", type: "Drainage System", mode: "By Contract", fund: "NDRRMF + LGU Counterpart", objectCode: TYPE_OBJECT_CODE["Drainage System"], folderNo: "OCE-IF-2025-008", implementorId: "CTR-004", inchargeId: "ENG-002", location: { barangays: ["Iwahig", "Irawan"] }, linearLength: 1650, contractedAmount: 32_700_000, actualAmount: 13_407_000, bidYear: 2024, contractedStart: "2025-02-01", contractedCompletion: "2025-10-15", actualStart: "2025-02-19", actualCompletion: null, percent: 41, roadId: "rd-iwahig", treatment: null, notes: "Slipped 128 days on ROW dispute at St. 1+100; suspension lifted 2025-12-01.", attachments: [] },
  { id: "RPIS-2024-047", name: "Lacao Street Drainage Line", type: "Drainage System", mode: "By Contract", fund: "General Fund", objectCode: TYPE_OBJECT_CODE["Drainage System"], folderNo: "OCE-IF-2024-047", implementorId: "CTR-005", inchargeId: "ENG-004", location: { barangays: ["Liwanag"] }, linearLength: 940, contractedAmount: 6_900_000, actualAmount: 6_842_500, bidYear: 2024, contractedStart: "2024-10-01", contractedCompletion: "2025-02-14", actualStart: "2024-10-08", actualCompletion: "2025-02-10", percent: 100, roadId: "rd-lacao", treatment: null, notes: "As-built survey approved by P&D; final payment processed March 2025.", attachments: [] },
  { id: "RPIS-2025-017", name: "Mandaragat Road Concreting (Seg. 1)", type: "Concreting", mode: "By Contract", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Concreting, folderNo: "OCE-IF-2025-017", implementorId: "CTR-003", inchargeId: "ENG-003", location: { barangays: ["Mandaragat"] }, linearLength: 1980, contractedAmount: 27_500_000, actualAmount: 15_125_000, bidYear: 2025, contractedStart: "2025-04-22", contractedCompletion: "2026-04-22", actualStart: "2025-05-06", actualCompletion: null, percent: 55, roadId: "rd-mandaragat", treatment: "Concreting", notes: "Sub-base 100%, paving 41%. Rainy-season slippage absorbed by contract float.", attachments: [] },
  { id: "RPIS-2026-002", name: "Tiniguiban Road Shoulder Widening", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: TYPE_OBJECT_CODE["Road Shoulder"], folderNo: "OCE-IF-2026-002", implementorId: "CTR-003", inchargeId: "ENG-006", location: { barangays: ["Tiniguiban"] }, linearLength: 2400, contractedAmount: 18_200_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-05-04", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-tiniguiban", treatment: null, notes: "Notice to Proceed pending; contractor mobilization scheduled May 2026.", attachments: [] },
  { id: "RPIS-2026-005", name: "Libis Coastal Road Shoulder & Guardrail", type: "Road Shoulder", mode: "By Contract", fund: "FY Annual Plan", objectCode: TYPE_OBJECT_CODE["Road Shoulder"], folderNo: "OCE-IF-2026-005", implementorId: "CTR-002", inchargeId: "ENG-002", location: { barangays: ["Bancao-Bancao"] }, linearLength: 3150, contractedAmount: 38_900_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-04-01", contractedCompletion: "2027-03-30", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-libis", treatment: null, notes: "Bid opening 18 Mar 2026; includes 890 m steel guardrail.", attachments: [] },
  { id: "RPIS-2025-041", name: "San Manuel Road Concreting (Force Account)", type: "Concreting", mode: "By Administration", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE.Concreting, folderNo: "OCE-FA-2025-041", implementorId: "CTR-001", inchargeId: "ENG-004", location: { barangays: ["San Manuel"] }, linearLength: 1450, contractedAmount: 16_400_000, actualAmount: 6_724_000, bidYear: 2025, contractedStart: "2025-11-20", contractedCompletion: "2026-10-30", actualStart: "2026-01-12", actualCompletion: null, percent: 41, roadId: "rd-sanman", treatment: "Concreting", notes: "Force-account execution using LGU batching plant. Materials on schedule.", attachments: [] },
  { id: "RPIS-2024-052", name: "Burgos Street LED Street Lighting", type: "Street Lights", mode: "By Contract", fund: "General Fund", objectCode: TYPE_OBJECT_CODE["Street Lights"], folderNo: "OCE-IF-2024-052", implementorId: "CTR-006", inchargeId: "ENG-006", location: { barangays: ["San Pedro"] }, linearLength: 860, contractedAmount: 9_600_000, actualAmount: 9_512_300, bidYear: 2024, contractedStart: "2024-07-15", contractedCompletion: "2024-12-10", actualStart: "2024-07-22", actualCompletion: "2024-12-02", percent: 100, roadId: "rd-burgos", treatment: null, notes: "64 LED fixtures energized; turnover accepted December 2024.", attachments: [] },
  { id: "RPIS-2026-010", name: "Sicsican Farm-to-Market Road Opening (Seg. 2)", type: "Road Opening", mode: "By Administration", fund: "20% Development Fund", objectCode: TYPE_OBJECT_CODE["Road Opening"], folderNo: "OCE-FA-2026-010", implementorId: "CTR-001", inchargeId: "ENG-003", location: { barangays: ["Sicsican"] }, linearLength: 3200, contractedAmount: 8_400_000, actualAmount: 0, bidYear: 2026, contractedStart: "2026-03-02", contractedCompletion: "2026-12-15", actualStart: null, actualCompletion: null, percent: 0, roadId: "rd-sicsican", treatment: "Road Opening", notes: "Earth-road opening ahead of programmed graveling: clearing, grubbing, grading.", attachments: [] },
];

export const seedRecords: ProjectRecord[] = RAW.map((s) => ({
  ...s, technical: null, revision: null, actual: null, suspensions: [], variations: [],
}));

export const activityFeed = [
  { ts: "2026-02-18 09:42", tag: "FIELD", text: "Percent 56 → 62% on OCE-IF-2025-014 (Rizal Ave Sidewalk) — verified vs. geotagged IMG_20260218" },
  { ts: "2026-02-17 16:05", tag: "GIS", text: "GPX track bacungan_spur_seg3 ingested as centerline — 1,412 vertices, 2.86 km" },
  { ts: "2026-02-17 11:30", tag: "BIDS", text: "Bid opening scheduled for OCE-IF-2026-005 Libis Coastal Rd — 3 contractors pre-qualified, Mar 18 10:00" },
  { ts: "2026-02-16 14:22", tag: "INSP", text: "Materials core tests passed (3/3 cylinders) on Bacungan Spur Concreting Seg. 3" },
  { ts: "2026-02-15 10:08", tag: "SYNC", text: "Nightly normalize ran on project_records — barangay coverage re-indexed, evidence pins refreshed" },
];
