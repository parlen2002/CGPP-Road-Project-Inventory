export type ProjectStatus = "Ongoing" | "Planned" | "For Bidding" | "Completed" | "Delayed";
export type ProjectType =
  | "Rehabilitation" | "Concreting" | "Widening" | "Drainage"
  | "Bridge" | "Slope Protection" | "Streetlighting" | "Grading";

export interface Project {
  id: string;
  code: string;
  name: string;
  roadId: string;
  roadName: string;
  barangay: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number; // 0-100
  budgetM: number; // PHP, millions
  funding: string;
  contractor: string;
  start: string;
  end: string;
  point: [number, number];
}

export const projects: Project[] = [
  { id: "pj-01", code: "RPIS-2025-014", name: "Rizal Avenue Rehabilitation — Phase II", roadId: "rd-rizal", roadName: "Rizal Avenue", barangay: "San Pedro (Poblacion)", type: "Rehabilitation", status: "Ongoing", progress: 62, budgetM: 48.5, funding: "20% Dev Fund", contractor: "Palawan Buildwell Corp.", start: "2025-03-10", end: "2026-02-28", point: [9.7415, 118.7383] },
  { id: "pj-02", code: "RPIS-2025-021", name: "Circumferential Road Widening (Tagumpay–Sta. Monica)", roadId: "rd-circum", roadName: "Palawan Circumferential Rd — East", barangay: "Tagumpay / Santa Monica", type: "Widening", status: "Ongoing", progress: 34, budgetM: 120.0, funding: "DPWH Convergence", contractor: "Consunji–Palawan JV", start: "2025-01-15", end: "2026-11-30", point: [9.7362, 118.7572] },
  { id: "pj-03", code: "RPIS-2024-036", name: "North Road Concreting — Brgy. Bacungan", roadId: "rd-north", roadName: "Puerto Princesa North Road", barangay: "Bacungan / San Rafael", type: "Concreting", status: "Ongoing", progress: 78, budgetM: 86.4, funding: "20% Dev Fund", contractor: "Sandoval Construction", start: "2024-11-02", end: "2025-12-20", point: [9.7668, 118.7592] },
  { id: "pj-04", code: "RPIS-2025-008", name: "South Road Drainage & Slope Protection", roadId: "rd-south", roadName: "National Highway — South Road", barangay: "Iwahig / Irigang", type: "Slope Protection", status: "Delayed", progress: 41, budgetM: 32.7, funding: "NDRRMF + LGU", contractor: "Irawan Earthworks Inc.", start: "2025-02-01", end: "2025-10-15", point: [9.7188, 118.7252] },
  { id: "pj-05", code: "RPIS-2024-029", name: "Malvar Road Asphalt Overlay", roadId: "rd-malvar", roadName: "Malvar Road", barangay: "Mandaragat / Liwanag", type: "Rehabilitation", status: "Completed", progress: 100, budgetM: 21.3, funding: "General Fund", contractor: "AsphaltPro Palawan", start: "2024-08-05", end: "2025-01-30", point: [9.7388, 118.7372] },
  { id: "pj-06", code: "RPIS-2024-041", name: "Valencia Street Concreting", roadId: "rd-valencia", roadName: "Valencia Street", barangay: "San Pedro (Poblacion)", type: "Concreting", status: "Completed", progress: 100, budgetM: 14.8, funding: "20% Dev Fund", contractor: "Palawan Buildwell Corp.", start: "2024-09-12", end: "2025-03-18", point: [9.7331, 118.7356] },
  { id: "pj-07", code: "RPIS-2024-047", name: "Lacao Street Drainage Line", roadId: "rd-lacao", roadName: "Lacao Street", barangay: "Liwanag", type: "Drainage", status: "Completed", progress: 100, budgetM: 6.9, funding: "General Fund", contractor: "HydroLine Builders", start: "2024-10-01", end: "2025-02-14", point: [9.7392, 118.7366] },
  { id: "pj-08", code: "RPIS-2025-017", name: "Mandaragat Road Concreting", roadId: "rd-mandaragat", roadName: "Mandaragat Road", barangay: "Mandaragat", type: "Concreting", status: "Ongoing", progress: 55, budgetM: 27.5, funding: "20% Dev Fund", contractor: "Sandoval Construction", start: "2025-04-22", end: "2026-04-22", point: [9.7468, 118.7515] },
  { id: "pj-09", code: "RPIS-2026-002", name: "Tiniguiban Road Rehabilitation", roadId: "rd-tiniguiban", roadName: "Tiniguiban Road", barangay: "Tiniguiban", type: "Rehabilitation", status: "Planned", progress: 0, budgetM: 18.2, funding: "FY2026 Annual Plan", contractor: "— (for procurement)", start: "2026-05-04", end: "2026-12-15", point: [9.7542, 118.7338] },
  { id: "pj-10", code: "RPIS-2026-005", name: "Libis Coastal Road Extension", roadId: "rd-libis", roadName: "Libis Coastal Road", barangay: "Bancao-Bancao", type: "Widening", status: "For Bidding", progress: 0, budgetM: 38.9, funding: "FY2026 Annual Plan", contractor: "— (bid opening Mar 2026)", start: "2026-04-01", end: "2027-03-30", point: [9.7212, 118.7401] },
  { id: "pj-11", code: "RPIS-2026-007", name: "Iwahig Bridge Replacement", roadId: "rd-iwahig", roadName: "Iwahig Penal Colony Road", barangay: "Iwahig", type: "Bridge", status: "For Bidding", progress: 0, budgetM: 52.0, funding: "DPWH Convergence", contractor: "— (pre-qualification)", start: "2026-06-01", end: "2027-08-15", point: [9.7132, 118.7235] },
  { id: "pj-12", code: "RPIS-2026-003", name: "San Manuel Road Gravel-to-Concrete", roadId: "rd-sanman", roadName: "San Manuel Road", barangay: "San Manuel", type: "Concreting", status: "Planned", progress: 0, budgetM: 16.4, funding: "FY2026 Annual Plan", contractor: "— (for procurement)", start: "2026-07-01", end: "2027-02-28", point: [9.7501, 118.7282] },
  { id: "pj-13", code: "RPIS-2025-033", name: "Tagumpay Connector Widening", roadId: "rd-tagumpay", roadName: "Tagumpay–Sta. Monica Connector", barangay: "Tagumpay", type: "Widening", status: "Ongoing", progress: 12, budgetM: 22.1, funding: "General Fund", contractor: "HydroLine Builders", start: "2025-10-08", end: "2026-09-30", point: [9.7384, 118.7502] },
  { id: "pj-14", code: "RPIS-2024-052", name: "Burgos Street Sidewalk & Streetlighting", roadId: "rd-burgos", roadName: "Burgos Street", barangay: "San Pedro (Poblacion)", type: "Streetlighting", status: "Completed", progress: 100, budgetM: 9.6, funding: "General Fund", contractor: "LuzVolt Systems", start: "2024-07-15", end: "2024-12-10", point: [9.7352, 118.7385] },
  { id: "pj-15", code: "RPIS-2026-009", name: "Sicsican Road Grading & Gravel Surfacing", roadId: "rd-sicsican", roadName: "Sicsican Road", barangay: "Sicsican", type: "Grading", status: "Planned", progress: 0, budgetM: 12.8, funding: "20% Dev Fund", contractor: "— (for procurement)", start: "2026-08-03", end: "2027-01-31", point: [9.7938, 118.7788] },
];

export const statusMeta: Record<ProjectStatus, { color: string; soft: string; ring: string }> = {
  Ongoing: { color: "#f0a32b", soft: "rgba(240,163,43,0.14)", ring: "rgba(240,163,43,0.45)" },
  Planned: { color: "#4a70b0", soft: "rgba(74,112,176,0.14)", ring: "rgba(74,112,176,0.45)" },
  "For Bidding": { color: "#12897e", soft: "rgba(18,137,126,0.14)", ring: "rgba(18,137,126,0.45)" },
  Completed: { color: "#1e7a58", soft: "rgba(30,122,88,0.14)", ring: "rgba(30,122,88,0.45)" },
  Delayed: { color: "#de5a36", soft: "rgba(222,90,54,0.14)", ring: "rgba(222,90,54,0.45)" },
};

export const typeShort: Record<ProjectType, string> = {
  Rehabilitation: "REHAB", Concreting: "CONC", Widening: "WIDN", Drainage: "DRNG",
  Bridge: "BRDG", "Slope Protection": "SLOPE", Streetlighting: "LITE", Grading: "GRDG",
};

export const budgetByProgram = [
  { label: "Concreting", value: 186.0 },
  { label: "Rehabilitation", value: 88.0 },
  { label: "Widening", value: 181.0 },
  { label: "Bridges", value: 52.0 },
  { label: "Drainage", value: 6.9 },
  { label: "Slope Protection", value: 32.7 },
  { label: "Streetlighting", value: 9.6 },
  { label: "Grading", value: 12.8 },
].sort((a, b) => b.value - a.value);

export const activityFeed = [
  { ts: "2026-02-18 09:42", tag: "FIELD", text: "Progress update +6% posted for RPIS-2025-014 (Rizal Ave Ph. II) — geotagged at 9.7415N, 118.7383E" },
  { ts: "2026-02-17 16:05", tag: "GIS", text: "Drone orthomosaic for Brgy. Bacungan segment ingested into PostGIS raster store (2.1 GB, 4 cm/px)" },
  { ts: "2026-02-17 11:30", tag: "BIDS", text: "Bid opening scheduled for RPIS-2026-005 Libis Coastal Road Extension — 3 contractors pre-qualified" },
  { ts: "2026-02-16 14:22", tag: "INSP", text: "PCI survey completed on Tiniguiban Road — index dropped 34 → 31, flagged for FY2026 rehabilitation" },
  { ts: "2026-02-15 10:08", tag: "SYNC", text: "Nightly ST_SnapToGrid normalization ran on roads_road — 17 segments, 0 topology errors" },
  { ts: "2026-02-14 08:51", tag: "FIELD", text: "Concrete pour (Sta. 2+340 – 2+860) verified by OCE materials engineer on North Road Concreting" },
];
