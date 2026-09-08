/* Technical specifications — shared detail model across technical (as-designed),
   revision and actual (as-built) records. Six sections plus variation/suspension
   orders and their impact on the record's amount & dates. */

export interface RoadSpec { widthM: string; lanes: string; pavement: string; pavementCm: string; subbaseCm: string; }
export interface ShoulderSpec { widthM: string; type: string; thicknessCm: string; }
export interface SidewalkSpec { widthM: string; thicknessCm: string; finish: string; ramps: string; }
export interface DrainageSpec { type: string; sizeM: string; lengthM: string; }
export interface SlopeSpec { type: string; heightM: string; lengthM: string; }
export interface StreetlightSpec { poles: string; poleHeightM: string; fixture: string; spacingM: string; control: string; power: string; }

export interface TechSpecs {
  road: RoadSpec; shoulder: ShoulderSpec; sidewalk: SidewalkSpec;
  drainage: DrainageSpec; slope: SlopeSpec; streetlights: StreetlightSpec;
}

export interface RevisionMeta { revisionNo: string; date: string; reason: string; }
export interface ActualMeta { date: string; certifiedBy: string; }

export interface SuspensionOrder {
  id: string; orderNo: string; dateSuspended: string; dateResumed: string;
  durationDays: number; daysUsed: number; remarks: string;
}
export interface VariationOrder {
  id: string; orderNo: string; revisedAmount: number; timeExtensionDays: number;
  dateRequested: string; dateApproved: string; remarks: string;
}

export const emptySpecs = (): TechSpecs => ({
  road: { widthM: "", lanes: "", pavement: "", pavementCm: "", subbaseCm: "" },
  shoulder: { widthM: "", type: "", thicknessCm: "" },
  sidewalk: { widthM: "", thicknessCm: "", finish: "", ramps: "" },
  drainage: { type: "", sizeM: "", lengthM: "" },
  slope: { type: "", heightM: "", lengthM: "" },
  streetlights: { poles: "", poleHeightM: "", fixture: "", spacingM: "", control: "", power: "" },
});

export const PAVEMENTS = ["Concrete", "Asphalt", "Gravel", "Earth"];
export const SHOULDER_TYPES = ["Gravel", "Earth", "Concrete curb", "Riprap"];
export const FINISHES = ["Interlocking blocks", "Concrete broom finish", "Concrete stamped"];
export const RAMPS = ["Yes — BP 344", "No"];
export const DRAINAGE_TYPES = ["RC box culvert", "RC pipe", "Open channel (lined)", "Catch basin + pipe"];
export const SLOPE_TYPES = ["Gabion", "Riprap", "RC retaining wall", "Soil nail + shotcrete"];
export const LIGHT_FIXTURES = ["LED 60W", "LED 100W", "LED 150W", "HPS 250W", "Solar LED 40W"];
export const LIGHT_CONTROLS = ["Photocell dusk-to-dawn", "Timer", "Smart dimming", "Manual"];
export const LIGHT_POWER = ["PPC-ELCO feed", "LGU meter", "Solar hybrid", "Standalone solar"];

export interface SpecRow { section: string; label: string; unit: string; get: (s: TechSpecs) => string; }

export const SPEC_ROWS: SpecRow[] = [
  { section: "RD", label: "Roadway width", unit: "m", get: (s) => s.road.widthM },
  { section: "RD", label: "Lanes", unit: "no.", get: (s) => s.road.lanes },
  { section: "RD", label: "Pavement type", unit: "", get: (s) => s.road.pavement },
  { section: "RD", label: "Pavement thickness", unit: "cm", get: (s) => s.road.pavementCm },
  { section: "RD", label: "Sub-base thickness", unit: "cm", get: (s) => s.road.subbaseCm },
  { section: "SHLD", label: "Shoulder width", unit: "m", get: (s) => s.shoulder.widthM },
  { section: "SHLD", label: "Shoulder type", unit: "", get: (s) => s.shoulder.type },
  { section: "SHLD", label: "Shoulder thickness", unit: "cm", get: (s) => s.shoulder.thicknessCm },
  { section: "SWLK", label: "Sidewalk width", unit: "m", get: (s) => s.sidewalk.widthM },
  { section: "SWLK", label: "Slab thickness", unit: "cm", get: (s) => s.sidewalk.thicknessCm },
  { section: "SWLK", label: "Surface finish", unit: "", get: (s) => s.sidewalk.finish },
  { section: "SWLK", label: "Accessibility ramps", unit: "", get: (s) => s.sidewalk.ramps },
  { section: "DRNG", label: "Drainage type", unit: "", get: (s) => s.drainage.type },
  { section: "DRNG", label: "Section size", unit: "m", get: (s) => s.drainage.sizeM },
  { section: "DRNG", label: "Length", unit: "m", get: (s) => s.drainage.lengthM },
  { section: "SLP", label: "Protection type", unit: "", get: (s) => s.slope.type },
  { section: "SLP", label: "Wall height", unit: "m", get: (s) => s.slope.heightM },
  { section: "SLP", label: "Protected length", unit: "m", get: (s) => s.slope.lengthM },
  { section: "LITE", label: "Lighting points / poles", unit: "no.", get: (s) => s.streetlights.poles },
  { section: "LITE", label: "Pole height", unit: "m", get: (s) => s.streetlights.poleHeightM },
  { section: "LITE", label: "Fixture", unit: "", get: (s) => s.streetlights.fixture },
  { section: "LITE", label: "Pole spacing", unit: "m c/c", get: (s) => s.streetlights.spacingM },
  { section: "LITE", label: "Control", unit: "", get: (s) => s.streetlights.control },
  { section: "LITE", label: "Power source", unit: "", get: (s) => s.streetlights.power },
];

export const filledCount = (s: TechSpecs | null | undefined): number =>
  s ? SPEC_ROWS.filter((r) => r.get(s).trim() !== "").length : 0;

interface OrderHolder { variations: VariationOrder[]; suspensions: SuspensionOrder[]; }
export const voTimeExt = (r: OrderHolder) => r.variations.reduce((s, v) => s + (v.timeExtensionDays || 0), 0);
export const soDaysUsed = (r: OrderHolder) => r.suspensions.reduce((s, o) => s + (o.daysUsed || 0), 0);
export const voAmount = (r: OrderHolder) => r.variations.reduce((s, v) => s + (v.revisedAmount || 0), 0);

export const VARIANT_META = {
  technical: { title: "Technical (As-Designed)", desc: "The base scope as designed and bid." },
  revision: { title: "Revision", desc: "Amends the as-designed specs. Start from a copy, then adjust." },
  actual: { title: "Actual (As-Built)", desc: "What was actually built, certified on completion." },
} as const;
export type SpecVariant = keyof typeof VARIANT_META;
