/* ─────────────────────────────────────────────────────────────
   BARANGAY REGISTRY — administrative basis of project locations
   Fields per barangay (per OCE encoding standard):
     · psgc        — Ten-Digit PSGC Code (region-province-city-serial-class)
     · name        — Barangay Name
     · dataSource  — where the record / geometry came from
     · lat, lng    — centroid used for map pins & spatial joins
   The registry is live in the store: encode, edit, remove.
   ────────────────────────────────────────────────────────────── */

export interface Barangay {
  id: string;        // internal key — BRGY-###
  psgc: string;      // Ten-Digit Code of the Barangay
  name: string;      // Barangay Name
  dataSource: string; // Data Source
  lat: number;
  lng: number;
}

export const DATA_SOURCES = [
  "PSA PSGC 2024", "NAMRIA 1:10K 2022", "PPC-CPDO digitized 2023",
  "PSA Census 2020", "LRA cadastral join 2024", "Field validation 2025",
];

/** Puerto Princesa PSGC prefix — 17 (Mimaropa) 69 (Palawan) 01 (PPC) */
const PSGC_PREFIX = "176901";
const code = (serial: number, urban: boolean) =>
  `${PSGC_PREFIX}${String(serial).padStart(3, "0")}${urban ? 1 : 2}`;

export const seedBarangays: Barangay[] = [
  { id: "BRGY-001", psgc: code(1, true), name: "San Pedro (Poblacion)", dataSource: "PSA PSGC 2024", lat: 9.7362, lng: 118.7386 },
  { id: "BRGY-002", psgc: code(2, true), name: "San Jose", dataSource: "PSA PSGC 2024", lat: 9.7435, lng: 118.7435 },
  { id: "BRGY-003", psgc: code(3, true), name: "Liwanag", dataSource: "NAMRIA 1:10K 2022", lat: 9.7385, lng: 118.731 },
  { id: "BRGY-004", psgc: code(4, true), name: "Mandaragat", dataSource: "PSA PSGC 2024", lat: 9.7455, lng: 118.7495 },
  { id: "BRGY-005", psgc: code(5, true), name: "Tagumpay", dataSource: "NAMRIA 1:10K 2022", lat: 9.7395, lng: 118.7535 },
  { id: "BRGY-006", psgc: code(6, true), name: "Santa Monica", dataSource: "PSA PSGC 2024", lat: 9.7285, lng: 118.7545 },
  { id: "BRGY-007", psgc: code(7, true), name: "San Manuel", dataSource: "PPC-CPDO digitized 2023", lat: 9.7535, lng: 118.7265 },
  { id: "BRGY-008", psgc: code(8, true), name: "Tiniguiban", dataSource: "NAMRIA 1:10K 2022", lat: 9.7565, lng: 118.7335 },
  { id: "BRGY-009", psgc: code(9, true), name: "Bancao-Bancao", dataSource: "PSA PSGC 2024", lat: 9.721, lng: 118.7415 },
  { id: "BRGY-010", psgc: code(10, true), name: "Santa Lourdes", dataSource: "PPC-CPDO digitized 2023", lat: 9.751, lng: 118.7205 },
  { id: "BRGY-011", psgc: code(11, false), name: "Bacungan", dataSource: "PSA Census 2020", lat: 9.769, lng: 118.749 },
  { id: "BRGY-012", psgc: code(12, false), name: "Iwahig", dataSource: "PSA Census 2020", lat: 9.7095, lng: 118.729 },
  { id: "BRGY-013", psgc: code(13, false), name: "Irawan", dataSource: "LRA cadastral join 2024", lat: 9.718, lng: 118.7235 },
  { id: "BRGY-014", psgc: code(14, false), name: "Sicsican", dataSource: "PSA Census 2020", lat: 9.7955, lng: 118.7805 },
  { id: "BRGY-015", psgc: code(15, false), name: "San Rafael", dataSource: "NAMRIA 1:10K 2022", lat: 9.7835, lng: 118.77 },
  { id: "BRGY-016", psgc: code(16, false), name: "Irigang", dataSource: "PSA Census 2020", lat: 9.7005, lng: 118.7215 },
  { id: "BRGY-017", psgc: code(17, false), name: "Balile", dataSource: "LRA cadastral join 2024", lat: 9.774, lng: 118.7395 },
  { id: "BRGY-018", psgc: code(18, false), name: "Salvacion", dataSource: "PSA Census 2020", lat: 9.789, lng: 118.7525 },
  { id: "BRGY-019", psgc: code(19, false), name: "Tinigban", dataSource: "NAMRIA 1:10K 2022", lat: 9.7612, lng: 118.7312 },
  { id: "BRGY-020", psgc: code(20, false), name: "Tanglaw", dataSource: "PSA Census 2020", lat: 9.7795, lng: 118.759 },
  { id: "BRGY-021", psgc: code(21, false), name: "Bagong Sikat", dataSource: "Field validation 2025", lat: 9.7682, lng: 118.7275 },
  { id: "BRGY-022", psgc: code(22, false), name: "Bagong Bayan", dataSource: "Field validation 2025", lat: 9.7648, lng: 118.735 },
  { id: "BRGY-023", psgc: code(23, false), name: "Iwahig Colony", dataSource: "LRA cadastral join 2024", lat: 9.7095, lng: 118.729 },
  { id: "BRGY-024", psgc: code(24, false), name: "Manalo", dataSource: "PSA Census 2020", lat: 9.7715, lng: 118.724 },
  { id: "BRGY-025", psgc: code(25, false), name: "Montoble", dataSource: "NAMRIA 1:10K 2022", lat: 9.7855, lng: 118.7455 },
  { id: "BRGY-026", psgc: code(26, false), name: "Alvarez", dataSource: "PSA Census 2020", lat: 9.7762, lng: 118.749 },
  { id: "BRGY-027", psgc: code(27, false), name: "Langogan", dataSource: "LRA cadastral join 2024", lat: 9.7918, lng: 118.7662 },
  { id: "BRGY-028", psgc: code(28, false), name: "Maoyod", dataSource: "NAMRIA 1:10K 2022", lat: 9.7865, lng: 118.7595 },
  { id: "BRGY-029", psgc: code(29, false), name: "Magsaysay", dataSource: "PSA Census 2020", lat: 9.7945, lng: 118.758 },
  { id: "BRGY-030", psgc: code(30, false), name: "Marufinas", dataSource: "PSA Census 2020", lat: 9.7998, lng: 118.7515 },
  { id: "BRGY-031", psgc: code(31, false), name: "San Isidro", dataSource: "Field validation 2025", lat: 9.7698, lng: 118.7402 },
];

/** name → centroid map (static mirror of the seed; live lookups use the store) */
export const BARANGAY_POINTS: Record<string, [number, number]> = Object.fromEntries(
  seedBarangays.map((b) => [b.name, [b.lat, b.lng] as [number, number]])
);
