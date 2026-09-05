/* ─────────────────────────────────────────────────────────────
   TECHNICAL SPECIFICATIONS · REVISIONS · ACTUAL (AS-BUILT)
   + SUSPENSION & VARIATION ORDERS — linked to project_records.

   One shared spec shape covers the five civil works sections
   (road, shoulder, sidewalk, drainage, slope protection).
   A record carries up to three variants of it:
     · technical — as-designed
     · revision  — revised design (revision no. + reason)
     · actual    — as-built / as-constructed
   Variation orders adjust the contract amount and grant time
   extensions; suspension orders consume calendar days. Both
   feed the ADJUSTED contract value and ADJUSTED completion date
   shown on the project record.
   ────────────────────────────────────────────────────────────── */

import type { ProjectRecord } from "./registry";

/* ---------- spec leaves (strings — descriptive, unit-labelled) ---------- */

export interface RoadSpec { widthM: string; lanes: string; pavement: string; pavementCm: string; subbaseCm: string; }
export interface ShoulderSpec { widthM: string; type: string; thicknessCm: string; }
export interface SidewalkSpec { widthM: string; thicknessCm: string; finish: string; ramps: string; }
export interface DrainageSpec { type: string; sizeM: string; lengthM: string; }
export interface SlopeSpec { type: string; heightM: string; lengthM: string; }

export interface TechSpecs {
  road: RoadSpec;
  shoulder: ShoulderSpec;
  sidewalk: SidewalkSpec;
  drainage: DrainageSpec;
  slope: SlopeSpec;
}

export type SpecVariant = "technical" | "revision" | "actual";

export const VARIANT_META: Record<SpecVariant, { tag: string; title: string; color: string }> = {
  technical: { tag: "AS-DESIGNED", title: "Technical Specifications", color: "#4a70b0" },
  revision: { tag: "REVISED", title: "Revision Details", color: "#f0a32b" },
  actual: { tag: "AS-BUILT", title: "Actual Project Details", color: "#1e7a58" },
};

export const emptySpecs = (): TechSpecs => ({
  road: { widthM: "", lanes: "", pavement: "", pavementCm: "", subbaseCm: "" },
  shoulder: { widthM: "", type: "", thicknessCm: "" },
  sidewalk: { widthM: "", thicknessCm: "", finish: "", ramps: "" },
  drainage: { type: "", sizeM: "", lengthM: "" },
  slope: { type: "", heightM: "", lengthM: "" },
});

/* select lists for the spec encoder */
export const PAVEMENTS = ["Concrete", "Asphalt", "Gravel", "Earth"];
export const SHOULDER_TYPES = ["Gravel", "Earth", "Concrete curb", "Riprap"];
export const FINISHES = ["Interlocking blocks", "Concrete broom finish", "Concrete stamped"];
export const RAMPS = ["Yes — BP 344", "No"];
export const DRAINAGE_TYPES = ["RC box culvert", "RC pipe", "Open channel (lined)", "Catch basin + pipe"];
export const SLOPE_TYPES = ["Gabion", "Riprap", "RC retaining wall", "Soil nail + shotcrete"];

/* revision / actual carry their own meta */
export interface RevisionMeta { revisionNo: string; date: string; reason: string; }
export interface ActualMeta { date: string; certifiedBy: string; }

/* ---------- flattened row map — powers the comparison tables ---------- */

export interface SpecRow {
  section: string;    // RD / SHLD / SWLK / DRNG / SLP
  label: string;
  unit: string;
  get: (s: TechSpecs) => string;
}

export const SPEC_ROWS: SpecRow[] = [
  { section: "RD", label: "Road width", unit: "m", get: (s) => s.road.widthM },
  { section: "RD", label: "Lanes", unit: "no.", get: (s) => s.road.lanes },
  { section: "RD", label: "Pavement type", unit: "", get: (s) => s.road.pavement },
  { section: "RD", label: "Pavement thickness", unit: "cm", get: (s) => s.road.pavementCm },
  { section: "RD", label: "Sub-base thickness", unit: "cm", get: (s) => s.road.subbaseCm },
  { section: "SHLD", label: "Shoulder width", unit: "m", get: (s) => s.shoulder.widthM },
  { section: "SHLD", label: "Shoulder type", unit: "", get: (s) => s.shoulder.type },
  { section: "SHLD", label: "Shoulder thickness", unit: "cm", get: (s) => s.shoulder.thicknessCm },
  { section: "SWLK", label: "Sidewalk width", unit: "m", get: (s) => s.sidewalk.widthM },
  { section: "SWLK", label: "Sidewalk thickness", unit: "cm", get: (s) => s.sidewalk.thicknessCm },
  { section: "SWLK", label: "Surface finish", unit: "", get: (s) => s.sidewalk.finish },
  { section: "SWLK", label: "Accessibility ramps", unit: "", get: (s) => s.sidewalk.ramps },
  { section: "DRNG", label: "Drainage type", unit: "", get: (s) => s.drainage.type },
  { section: "DRNG", label: "Inside size", unit: "m", get: (s) => s.drainage.sizeM },
  { section: "DRNG", label: "Drainage length", unit: "m", get: (s) => s.drainage.lengthM },
  { section: "SLP", label: "Protection type", unit: "", get: (s) => s.slope.type },
  { section: "SLP", label: "Wall height", unit: "m", get: (s) => s.slope.heightM },
  { section: "SLP", label: "Protected length", unit: "m", get: (s) => s.slope.lengthM },
];

export const filledCount = (s: TechSpecs) => SPEC_ROWS.filter((r) => r.get(s).trim() !== "").length;

/* ---------- suspension & variation orders ---------- */

export interface SuspensionOrder {
  id: string;
  orderNo: string;          // office order number
  dateSuspended: string;
  dateResumed: string | null;
  durationDays: number;     // suspension duration (calendar days granted)
  daysUsed: number;         // days actually consumed
  remarks: string;          // suspension remarks
}

export interface VariationOrder {
  id: string;
  orderNo: string;          // office order number
  revisedAmount: number;    // PHP — + adds to / − deducts from the contract
  timeExtensionDays: number;
  dateRequested: string;
  dateApproved: string | null;
  remarks: string;          // variation remarks
}

/* ---------- order impact on the project record ---------- */

export const soDaysUsed = (r: ProjectRecord) => r.suspensions.reduce((s, o) => s + (o.daysUsed || 0), 0);
export const voTimeExt = (r: ProjectRecord) => r.variations.reduce((s, v) => s + (v.timeExtensionDays || 0), 0);
export const voAmount = (r: ProjectRecord) => r.variations.reduce((s, v) => s + (v.revisedAmount || 0), 0);

/** adjusted contract value = contracted + Σ variation orders */
export const adjustedContract = (r: ProjectRecord) => r.contractedAmount + voAmount(r);

const addDays = (iso: string, days: number) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** adjusted completion = contracted completion + VO time extensions + SO days used */
export const adjustedCompletion = (r: ProjectRecord) =>
  addDays(r.contractedCompletion, voTimeExt(r) + soDaysUsed(r));

export const fmtShortDate = (iso: string | null) => {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${M[Number(m) - 1]} ${Number(d)}`;
};
