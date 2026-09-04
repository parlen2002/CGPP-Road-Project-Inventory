/* ─────────────────────────────────────────────────────────────
   ROAD NETWORK — Puerto Princesa City
   Only two road classes exist here: NATIONAL and CITY.
     · National roads (North/South National Highway, Circumferential)
       are DPWH-managed — the City Engineer has no jurisdiction;
       they are kept ONLY as reference geometry for the map console.
     · City roads are the OCE inventory: everything the Office of
       the City Engineer programs, builds and maintains.
 ────────────────────────────────────────────────────────────── */

export type RoadClass = "National" | "City";
export type Surface = "Concrete" | "Asphalt" | "Gravel" | "Earth";
export type Condition = "Good" | "Fair" | "Poor";

/* Pavement treatments — the works that put each road on the ladder:
   Road Opening (earth) → Road Graveling (gravel) → Asphalting → Concreting.
   They are the key to reading the network: how much was opened, how much
   is still earth/gravel, how much has been asphalted or concreted. */
export type Treatment = "Road Opening" | "Road Graveling" | "Asphalting" | "Concreting";

export const SURFACE_TREATMENT: Record<Surface, Treatment> = {
  Earth: "Road Opening",
  Gravel: "Road Graveling",
  Asphalt: "Asphalting",
  Concrete: "Concreting",
};

export const TREATMENT_SHORT: Record<Treatment, string> = {
  "Road Opening": "OPEN",
  "Road Graveling": "GRVL",
  Asphalting: "ASPH",
  Concreting: "CONC",
};

export const TREATMENT_COLOR: Record<Treatment, string> = {
  "Road Opening": "#de5a36",
  "Road Graveling": "#f0a32b",
  Asphalting: "#12897e",
  Concreting: "#1e7a58",
};

/** Year the treatment that produced the segment's present surface was executed. */
export const TREATMENT_YEAR: Record<string, number> = {
  "rd-rizal": 2022, "rd-malvar": 2021, "rd-lacao": 2023, "rd-valencia": 2020,
  "rd-burgos": 2024, "rd-mandaragat": 2019, "rd-tiniguiban": 2018, "rd-sanman": 2021,
  "rd-libis": 2020, "rd-tagumpay": 2017, "rd-iwahig": 2019, "rd-sicsican": 2016,
  "rd-bacungan": 2015, "rd-baywalk": 2023,
};

export function treatmentOf(r: Road): { treatment: Treatment; year: number } {
  return { treatment: SURFACE_TREATMENT[r.surface], year: TREATMENT_YEAR[r.id] ?? 0 };
}

export interface Road {
  id: string;
  name: string;
  barangay: string;
  roadClass: RoadClass;            // National → DPWH reference only
  surface: Surface;
  condition: Condition;
  lengthKm: number;
  widthM: number;
  lanes: number;
  aadt: number; // avg annual daily traffic
  lastInspection: string;
  pci: number; // pavement condition index 0-100
  geometry: [number, number][]; // [lat, lng] WGS84 / EPSG:4326
}

export const CITY_CENTER: [number, number] = [9.7392, 118.7353];

export const roads: Road[] = [
  /* ── CITY ROADS — OCE jurisdiction (the inventory) ── */
  {
    id: "rd-rizal", name: "Rizal Avenue", barangay: "San Pedro (Poblacion)", roadClass: "City",
    surface: "Concrete", condition: "Good", lengthKm: 2.4, widthM: 12, lanes: 4, aadt: 14200,
    lastInspection: "2026-01-14", pci: 86,
    geometry: [[9.7282, 118.7338], [9.7315, 118.7349], [9.7348, 118.7359], [9.7382, 118.7371], [9.7415, 118.7383], [9.7448, 118.7394], [9.7495, 118.7408]],
  },
  {
    id: "rd-malvar", name: "Malvar Road", barangay: "Mandaragat / Liwanag", roadClass: "City",
    surface: "Asphalt", condition: "Fair", lengthKm: 1.8, widthM: 10, lanes: 2, aadt: 9800,
    lastInspection: "2025-11-02", pci: 68,
    geometry: [[9.7363, 118.7262], [9.7371, 118.7295], [9.7378, 118.7328], [9.7388, 118.7372], [9.7395, 118.7405], [9.7401, 118.7448]],
  },
  {
    id: "rd-lacao", name: "Lacao Street", barangay: "Liwanag", roadClass: "City",
    surface: "Concrete", condition: "Good", lengthKm: 1.4, widthM: 8, lanes: 2, aadt: 7650,
    lastInspection: "2025-12-08", pci: 82,
    geometry: [[9.7328, 118.7352], [9.7358, 118.7358], [9.7392, 118.7366], [9.7422, 118.7372], [9.7455, 118.7378]],
  },
  {
    id: "rd-valencia", name: "Valencia Street", barangay: "San Pedro (Poblacion)", roadClass: "City",
    surface: "Concrete", condition: "Fair", lengthKm: 1.6, widthM: 8, lanes: 2, aadt: 6420,
    lastInspection: "2025-10-19", pci: 71,
    geometry: [[9.7322, 118.7281], [9.7326, 118.7314], [9.7331, 118.7356], [9.7336, 118.7392], [9.7341, 118.7431]],
  },
  {
    id: "rd-burgos", name: "Burgos Street", barangay: "San Pedro (Poblacion)", roadClass: "City",
    surface: "Concrete", condition: "Good", lengthKm: 0.9, widthM: 7, lanes: 2, aadt: 5230,
    lastInspection: "2026-01-22", pci: 88,
    geometry: [[9.7349, 118.7355], [9.7352, 118.7385], [9.7356, 118.7415], [9.7359, 118.7446]],
  },
  {
    id: "rd-bacungan", name: "Bacungan Spur Road", barangay: "Bacungan", roadClass: "City",
    surface: "Gravel", condition: "Poor", lengthKm: 4.2, widthM: 6, lanes: 2, aadt: 1240,
    lastInspection: "2025-08-15", pci: 38,
    geometry: [[9.7611, 118.7548], [9.7642, 118.7512], [9.7675, 118.7482], [9.7712, 118.7455], [9.7752, 118.7438]],
  },
  {
    id: "rd-mandaragat", name: "Mandaragat Road", barangay: "Mandaragat", roadClass: "City",
    surface: "Concrete", condition: "Fair", lengthKm: 3.1, widthM: 8, lanes: 2, aadt: 3980,
    lastInspection: "2025-11-21", pci: 70,
    geometry: [[9.7418, 118.7452], [9.7442, 118.7482], [9.7468, 118.7515], [9.7496, 118.7551], [9.7522, 118.7588]],
  },
  {
    id: "rd-tiniguiban", name: "Tiniguiban Road", barangay: "Tiniguiban", roadClass: "City",
    surface: "Gravel", condition: "Poor", lengthKm: 2.6, widthM: 6, lanes: 2, aadt: 1650,
    lastInspection: "2025-07-30", pci: 34,
    geometry: [[9.7482, 118.7368], [9.7512, 118.7352], [9.7542, 118.7338], [9.7575, 118.7328], [9.7608, 118.7322]],
  },
  {
    id: "rd-sanman", name: "San Manuel Road", barangay: "San Manuel", roadClass: "City",
    surface: "Concrete", condition: "Good", lengthKm: 2.2, widthM: 7, lanes: 2, aadt: 3120,
    lastInspection: "2025-12-17", pci: 79,
    geometry: [[9.7445, 118.7332], [9.7472, 118.7305], [9.7501, 118.7282], [9.7532, 118.7262], [9.7565, 118.7248]],
  },
  {
    id: "rd-libis", name: "Libis Coastal Road", barangay: "Bancao-Bancao", roadClass: "City",
    surface: "Concrete", condition: "Fair", lengthKm: 2.8, widthM: 7, lanes: 2, aadt: 4470,
    lastInspection: "2025-10-05", pci: 63,
    geometry: [[9.7275, 118.7368], [9.7242, 118.7382], [9.7212, 118.7401], [9.7185, 118.7425], [9.7162, 118.7452]],
  },
  {
    id: "rd-tagumpay", name: "Tagumpay–Sta. Monica Connector", barangay: "Tagumpay", roadClass: "City",
    surface: "Gravel", condition: "Fair", lengthKm: 1.9, widthM: 6, lanes: 2, aadt: 2210,
    lastInspection: "2025-09-12", pci: 52,
    geometry: [[9.7362, 118.7442], [9.7372, 118.7472], [9.7384, 118.7502], [9.7398, 118.7535]],
  },
  {
    id: "rd-iwahig", name: "Iwahig Penal Colony Road", barangay: "Iwahig", roadClass: "City",
    surface: "Asphalt", condition: "Fair", lengthKm: 3.4, widthM: 7, lanes: 2, aadt: 2890,
    lastInspection: "2025-11-08", pci: 61,
    geometry: [[9.7132, 118.7235], [9.7115, 118.7268], [9.7098, 118.7302], [9.7082, 118.7338]],
  },
  {
    id: "rd-sicsican", name: "Sicsican Road", barangay: "Sicsican", roadClass: "City",
    surface: "Earth", condition: "Poor", lengthKm: 5.6, widthM: 5, lanes: 2, aadt: 640,
    lastInspection: "2025-06-24", pci: 27,
    geometry: [[9.7868, 118.7719], [9.7902, 118.7752], [9.7938, 118.7788], [9.7975, 118.7828], [9.8012, 118.7865]],
  },
  {
    id: "rd-baywalk", name: "Baywalk–Capitol Road", barangay: "Liwanag", roadClass: "City",
    surface: "Concrete", condition: "Good", lengthKm: 1.1, widthM: 9, lanes: 2, aadt: 8340,
    lastInspection: "2026-01-09", pci: 90,
    geometry: [[9.7415, 118.7282], [9.7392, 118.7272], [9.7368, 118.7264], [9.7345, 118.7258]],
  },

  /* ── NATIONAL ROADS — DPWH jurisdiction, reference geometry only ── */
  {
    id: "rd-north", name: "North National Highway", barangay: "Bacungan / San Rafael", roadClass: "National",
    surface: "Concrete", condition: "Fair", lengthKm: 12.4, widthM: 9, lanes: 2, aadt: 4900,
    lastInspection: "—", pci: 0,
    geometry: [[9.7462, 118.7412], [9.7508, 118.7448], [9.7556, 118.7495], [9.7611, 118.7548], [9.7668, 118.7592], [9.7729, 118.7638], [9.7795, 118.7681], [9.7868, 118.7719]],
  },
  {
    id: "rd-south", name: "South National Highway", barangay: "Iwahig / Irawan", roadClass: "National",
    surface: "Asphalt", condition: "Good", lengthKm: 11.2, widthM: 10, lanes: 2, aadt: 6850,
    lastInspection: "—", pci: 0,
    geometry: [[9.7335, 118.7322], [9.7289, 118.7295], [9.7241, 118.7272], [9.7188, 118.7252], [9.7132, 118.7235], [9.7071, 118.7221], [9.7008, 118.7221]],
  },
  {
    id: "rd-circum", name: "Palawan Circumferential Rd — East", barangay: "Tagumpay / Santa Monica", roadClass: "National",
    surface: "Asphalt", condition: "Good", lengthKm: 8.6, widthM: 12, lanes: 2, aadt: 11300,
    lastInspection: "—", pci: 0,
    geometry: [[9.7521, 118.7425], [9.7498, 118.7482], [9.7462, 118.7526], [9.7415, 118.7558], [9.7362, 118.7572], [9.7305, 118.7562], [9.7258, 118.7528], [9.7221, 118.7485]],
  },
];

/* derived slices */
export const cityRoads = roads.filter((r) => r.roadClass === "City");
export const nationalRoads = roads.filter((r) => r.roadClass === "National");
export const cityNetworkKm = +cityRoads.reduce((s, r) => s + r.lengthKm, 0).toFixed(1); // 35.0
export const nationalKm = +nationalRoads.reduce((s, r) => s + r.lengthKm, 0).toFixed(1);

/* ── pavement ladder — how the opened city network stands ──────────────
   opened  = every inventoried alignment (road opening is the first rung)
   earth / gravel = still unsurfaced; asphalt / concrete = paved        */
const kmBySurface = (s: Surface) =>
  +cityRoads.filter((r) => r.surface === s).reduce((sum, r) => sum + r.lengthKm, 0).toFixed(1);

export const surfaceLadder = {
  opened: cityNetworkKm,
  segments: cityRoads.length,
  earth: kmBySurface("Earth"),
  gravel: kmBySurface("Gravel"),
  asphalt: kmBySurface("Asphalt"),
  concrete: kmBySurface("Concrete"),
};

export const unsurfacedKm = +(surfaceLadder.earth + surfaceLadder.gravel).toFixed(1);
export const pavedKm = +(surfaceLadder.asphalt + surfaceLadder.concrete).toFixed(1);

export const barangayCentroids: { name: string; point: [number, number] }[] = [
  { name: "San Pedro", point: [9.7360, 118.7390] },
  { name: "Liwanag", point: [9.7385, 118.7310] },
  { name: "Mandaragat", point: [9.7455, 118.7495] },
  { name: "Tagumpay", point: [9.7395, 118.7535] },
  { name: "Santa Monica", point: [9.7285, 118.7545] },
  { name: "San Manuel", point: [9.7535, 118.7265] },
  { name: "Tiniguiban", point: [9.7565, 118.7335] },
  { name: "Bancao-Bancao", point: [9.7210, 118.7415] },
  { name: "Bacungan", point: [9.7690, 118.7490] },
  { name: "Iwahig", point: [9.7095, 118.7290] },
  { name: "Sicsican", point: [9.7955, 118.7805] },
  { name: "San Rafael", point: [9.7835, 118.7700] },
];

export const BARANGAY_POINTS: Record<string, [number, number]> = {
  "San Pedro (Poblacion)": [9.7362, 118.7386], "San Jose": [9.7435, 118.7435],
  "Liwanag": [9.7385, 118.731], "Mandaragat": [9.7455, 118.7495], "Tagumpay": [9.7395, 118.7535],
  "Santa Monica": [9.7285, 118.7545], "San Manuel": [9.7535, 118.7265], "Tiniguiban": [9.7565, 118.7335],
  "Bancao-Bancao": [9.721, 118.7415], "Bacungan": [9.769, 118.749], "Iwahig": [9.7095, 118.729],
  "Irawan": [9.718, 118.7235], "Sicsican": [9.7955, 118.7805], "San Rafael": [9.7835, 118.77],
  "Santa Lourdes": [9.751, 118.7205], "Irigang": [9.7005, 118.7215], "Balile": [9.774, 118.7395],
  "Salvacion": [9.789, 118.7525], "Tinigban": [9.7612, 118.7312], "Tanglaw": [9.7795, 118.759],
  "Bagong Sikat": [9.7682, 118.7275], "Bagong Bayan": [9.7648, 118.735], "Iwahig Colony": [9.7095, 118.729],
  "Manalo": [9.7715, 118.724], "Montoble": [9.7855, 118.7455], "Alvarez": [9.7762, 118.749],
  "Langogan": [9.7918, 118.7662], "Maoyod": [9.7865, 118.7595], "Magsaysay": [9.7945, 118.758],
  "Marufinas": [9.7998, 118.7515], "San Isidro": [9.7698, 118.7402],
};

export const barangayCount = 66;
export const pavedPct = +((pavedKm / surfaceLadder.opened) * 100).toFixed(1); // concrete + asphalt share

export const networkByYear = [
  { year: 2019, km: 12.6 }, { year: 2020, km: 13.8 }, { year: 2021, km: 14.9 },
  { year: 2022, km: 16.2 }, { year: 2023, km: 17.4 }, { year: 2024, km: 18.6 },
  { year: 2025, km: 19.8 }, { year: 2026, km: pavedKm },
];

export const surfaceMix = [
  { label: "Concrete", km: surfaceLadder.concrete, color: "#1e7a58" },
  { label: "Asphalt", km: surfaceLadder.asphalt, color: "#12897e" },
  { label: "Gravel", km: surfaceLadder.gravel, color: "#f0a32b" },
  { label: "Earth", km: surfaceLadder.earth, color: "#de5a36" },
];

export const conditionMix = (["Good", "Fair", "Poor"] as Condition[]).map((c, i) => ({
  label: c,
  km: +cityRoads.filter((r) => r.condition === c).reduce((s, r) => s + r.lengthKm, 0).toFixed(1),
  color: ["#1e7a58", "#f0a32b", "#de5a36"][i],
}));
