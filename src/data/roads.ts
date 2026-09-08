/* Road network — surveyed geometry.
   CITY segments: OCE jurisdiction, the inventory target.
   NATIONAL alignments: DPWH reference only, never drawn or inventoried. */

import { BARANGAY_POINTS } from "./barangays";

export { BARANGAY_POINTS };

export type RoadClass = "National" | "City";
export type Surface = "Concrete" | "Asphalt" | "Gravel" | "Earth";
export type Condition = "Good" | "Fair" | "Poor";
export type Treatment = "Road Opening" | "Road Graveling" | "Asphalting" | "Concreting";

export const SURFACE_TREATMENT: Record<Surface, Treatment> = {
  Concrete: "Concreting", Asphalt: "Asphalting", Gravel: "Road Graveling", Earth: "Road Opening",
};
export const TREATMENT_SHORT: Record<Treatment, string> = {
  "Road Opening": "OPEN", "Road Graveling": "GRVL", Asphalting: "ASPH", Concreting: "CONC",
};
export const TREATMENT_COLOR: Record<Treatment, string> = {
  "Road Opening": "#de5a36", "Road Graveling": "#f0a32b", Asphalting: "#12897e", Concreting: "#1e7a58",
};
export const TREATMENT_ORDER: Treatment[] = ["Road Opening", "Road Graveling", "Asphalting", "Concreting"];

export interface Road {
  id: string; name: string; barangay: string; roadClass: RoadClass;
  surface: Surface; condition: Condition; lengthKm: number; widthM: number;
  lanes: number; aadt: number; pci: number; lastInspection: string;
  geometry: [number, number][];
}

export const cityRoads: Road[] = [
  { id: "rd-rizal", name: "Rizal Avenue", barangay: "San Pedro", roadClass: "City", surface: "Concrete", condition: "Fair", lengthKm: 2.4, widthM: 12, lanes: 2, aadt: 14800, pci: 68, lastInspection: "2026-01-12",
    geometry: [[9.7452, 118.7362], [9.7428, 118.7371], [9.7402, 118.738], [9.7375, 118.7388], [9.7348, 118.7394], [9.7318, 118.7398]] },
  { id: "rd-malvar", name: "Malvar Road", barangay: "Mandaragat", roadClass: "City", surface: "Asphalt", condition: "Good", lengthKm: 1.8, widthM: 10, lanes: 2, aadt: 9200, pci: 82, lastInspection: "2026-02-02",
    geometry: [[9.7352, 118.7412], [9.7375, 118.7398], [9.7398, 118.7382], [9.7421, 118.7365]] },
  { id: "rd-valencia", name: "Valencia Street", barangay: "San Pedro", roadClass: "City", surface: "Concrete", condition: "Good", lengthKm: 1.2, widthM: 9, lanes: 2, aadt: 6100, pci: 88, lastInspection: "2025-11-28",
    geometry: [[9.7338, 118.7328], [9.7333, 118.7352], [9.7328, 118.7375]] },
  { id: "rd-lacao", name: "Lacao Street", barangay: "Liwanag", roadClass: "City", surface: "Concrete", condition: "Good", lengthKm: 0.9, widthM: 8, lanes: 2, aadt: 4300, pci: 90, lastInspection: "2025-12-15",
    geometry: [[9.7412, 118.7352], [9.7395, 118.7362], [9.7378, 118.7372]] },
  { id: "rd-burgos", name: "Burgos Street", barangay: "San Pedro", roadClass: "City", surface: "Asphalt", condition: "Fair", lengthKm: 0.9, widthM: 9, lanes: 2, aadt: 5200, pci: 74, lastInspection: "2026-01-20",
    geometry: [[9.7368, 118.7355], [9.7352, 118.7385], [9.7338, 118.7412]] },
  { id: "rd-mandaragat", name: "Mandaragat Road", barangay: "Mandaragat", roadClass: "City", surface: "Gravel", condition: "Fair", lengthKm: 3.1, widthM: 8, lanes: 2, aadt: 3800, pci: 58, lastInspection: "2026-01-08",
    geometry: [[9.7435, 118.7438], [9.7452, 118.7468], [9.7468, 118.7502], [9.7482, 118.7535]] },
  { id: "rd-tagumpay", name: "Tagumpay–Sta. Monica Connector", barangay: "Tagumpay", roadClass: "City", surface: "Gravel", condition: "Poor", lengthKm: 2.6, widthM: 7, lanes: 2, aadt: 2900, pci: 44, lastInspection: "2026-02-05",
    geometry: [[9.7398, 118.7445], [9.7388, 118.7478], [9.7378, 118.7512], [9.7362, 118.7542]] },
  { id: "rd-tiniguiban", name: "Tiniguiban Road", barangay: "Tiniguiban", roadClass: "City", surface: "Gravel", condition: "Fair", lengthKm: 2.8, widthM: 7, lanes: 2, aadt: 2600, pci: 52, lastInspection: "2026-02-16",
    geometry: [[9.7505, 118.7362], [9.7528, 118.7348], [9.7552, 118.7332], [9.7578, 118.7318]] },
  { id: "rd-sanman", name: "San Manuel Road", barangay: "San Manuel", roadClass: "City", surface: "Gravel", condition: "Poor", lengthKm: 3.4, widthM: 7, lanes: 2, aadt: 3100, pci: 41, lastInspection: "2026-01-25",
    geometry: [[9.7568, 118.7225], [9.7545, 118.7248], [9.7522, 118.7272], [9.7498, 118.7295]] },
  { id: "rd-libis", name: "Libis Coastal Road", barangay: "Bancao-Bancao", roadClass: "City", surface: "Gravel", condition: "Fair", lengthKm: 3.2, widthM: 7, lanes: 2, aadt: 2400, pci: 55, lastInspection: "2026-02-08",
    geometry: [[9.7248, 118.7362], [9.7225, 118.7382], [9.7205, 118.7405], [9.7188, 118.7428]] },
  { id: "rd-iwahig", name: "Iwahig Penal Colony Road", barangay: "Iwahig", roadClass: "City", surface: "Earth", condition: "Poor", lengthKm: 4.6, widthM: 6, lanes: 2, aadt: 1500, pci: 31, lastInspection: "2026-02-14",
    geometry: [[9.7162, 118.7308], [9.7138, 118.7292], [9.7112, 118.7275], [9.7088, 118.7258]] },
  { id: "rd-sicsican", name: "Sicsican Road", barangay: "Sicsican", roadClass: "City", surface: "Earth", condition: "Poor", lengthKm: 5.8, widthM: 6, lanes: 2, aadt: 1100, pci: 28, lastInspection: "2026-01-30",
    geometry: [[9.7852, 118.7712], [9.7885, 118.7742], [9.7918, 118.7772], [9.7952, 118.7802]] },
  { id: "rd-bacungan", name: "Bacungan Spur Road", barangay: "Bacungan", roadClass: "City", surface: "Gravel", condition: "Fair", lengthKm: 2.9, widthM: 7, lanes: 2, aadt: 1900, pci: 57, lastInspection: "2026-02-11",
    geometry: [[9.7642, 118.7532], [9.7665, 118.7508], [9.7688, 118.7485], [9.7712, 118.7462]] },
  { id: "rd-sanrafael", name: "San Rafael Road", barangay: "San Rafael", roadClass: "City", surface: "Earth", condition: "Poor", lengthKm: 2.2, widthM: 6, lanes: 2, aadt: 900, pci: 33, lastInspection: "2026-01-18",
    geometry: [[9.7812, 118.7652], [9.7828, 118.7678], [9.7845, 118.7702]] },
];

export const nationalRoads: Road[] = [
  { id: "rd-north", name: "North National Highway", barangay: "San Rafael", roadClass: "National", surface: "Concrete", condition: "Good", lengthKm: 14.2, widthM: 12, lanes: 2, aadt: 12400, pci: 0, lastInspection: "—",
    geometry: [[9.7455, 118.7445], [9.7548, 118.7482], [9.7642, 118.7522], [9.7742, 118.7568], [9.7848, 118.7622], [9.7955, 118.7685]] },
  { id: "rd-south", name: "South National Highway", barangay: "Iwahig", roadClass: "National", surface: "Concrete", condition: "Good", lengthKm: 12.6, widthM: 12, lanes: 2, aadt: 10800, pci: 0, lastInspection: "—",
    geometry: [[9.7455, 118.7445], [9.7362, 118.7398], [9.7268, 118.7335], [9.7172, 118.7268], [9.7078, 118.7205]] },
  { id: "rd-circum", name: "Palawan Circumferential Rd — East", barangay: "Santa Monica", roadClass: "National", surface: "Asphalt", condition: "Fair", lengthKm: 5.4, widthM: 10, lanes: 2, aadt: 7600, pci: 0, lastInspection: "—",
    geometry: [[9.7455, 118.7445], [9.7422, 118.7512], [9.7372, 118.7565], [9.7308, 118.7588], [9.7245, 118.7572]] },
];

export const roads: Road[] = [...cityRoads, ...nationalRoads];

export const cityNetworkKm = +cityRoads.reduce((s, r) => s + r.lengthKm, 0).toFixed(1);
export const nationalKm = +nationalRoads.reduce((s, r) => s + r.lengthKm, 0).toFixed(1);

const kmBy = (s: Surface) => +cityRoads.filter((r) => r.surface === s).reduce((a, r) => a + r.lengthKm, 0).toFixed(1);

export const surfaceLadder = {
  opened: cityNetworkKm,
  concrete: kmBy("Concrete"),
  asphalt: kmBy("Asphalt"),
  gravel: kmBy("Gravel"),
  earth: kmBy("Earth"),
};

export const pavedKm = +(surfaceLadder.concrete + surfaceLadder.asphalt).toFixed(1);
export const unsurfacedKm = +(surfaceLadder.gravel + surfaceLadder.earth).toFixed(1);
export const pavedPct = +((pavedKm / surfaceLadder.opened) * 100).toFixed(1);

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

export const barangayCount = Object.keys(BARANGAY_POINTS).length;
