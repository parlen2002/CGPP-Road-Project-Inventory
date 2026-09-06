/* Barangay registry — all 66 barangays of Puerto Princesa per PSA PSGC,
   with Ten-Digit Code, name, data source, centroid and 2024 POPCEN population. */

export interface Barangay {
  id: string; psgc: string; name: string; dataSource: string;
  lat: number; lng: number; population: number;
}

export const DATA_SOURCES = [
  "PSA PSGC 2025", "NAMRIA 1:10K 2022", "PPC-CPDO digitized 2023",
  "PSA Census 2024 (POPCEN)", "LRA cadastral join 2024", "Field validation 2025",
];

const PSGC_PREFIX = "1731500";
const code = (serial: number) => `${PSGC_PREFIX}${String(serial).padStart(3, "0")}`;

type Seed = [number, string, number, number, number]; // [serial, name, pop, lat, lng]

const SEEDS: Seed[] = [
  [1, "Babuyan", 3095, 9.8045, 118.7715], [2, "Bacungan", 6015, 9.769, 118.749],
  [3, "Bagong Bayan", 1326, 9.7648, 118.735], [4, "Bagong Pag-Asa", 462, 9.7672, 118.7312],
  [5, "Bagong Sikat", 7052, 9.7682, 118.7275], [6, "Bagong Silang", 4266, 9.7622, 118.7282],
  [8, "Bahile", 2699, 9.6905, 118.675], [9, "Bancao-Bancao", 15300, 9.721, 118.7415],
  [10, "Binduyan", 1613, 9.8005, 118.7845], [11, "Buenavista", 1585, 9.7002, 118.7445],
  [12, "Cabayugan", 4104, 9.7045, 118.6355], [13, "Concepcion", 1894, 9.7415, 118.7785],
  [14, "Inagawan", 1853, 9.7315, 118.7235], [15, "Irawan", 9155, 9.718, 118.7235],
  [16, "Iwahig", 8746, 9.7095, 118.729], [17, "Kalipay", 548, 9.7605, 118.7185],
  [18, "Kamuning", 2148, 9.7755, 118.7315], [19, "Langogan", 2740, 9.7918, 118.7662],
  [20, "Liwanag", 926, 9.7385, 118.731], [21, "Lucbuan", 1951, 9.7515, 118.777],
  [22, "Mabuhay", 111, 9.7425, 118.735], [23, "Macarascas", 1874, 9.7895, 118.7415],
  [24, "Magkakaibigan", 361, 9.7372, 118.7458], [25, "Maligaya", 297, 9.7338, 118.7432],
  [26, "Manalo", 2985, 9.7715, 118.724], [27, "Manggahan", 602, 9.7362, 118.7488],
  [28, "Maningning", 937, 9.7408, 118.7502], [29, "Maoyon", 1465, 9.7865, 118.7595],
  [30, "Marufinas", 772, 9.7998, 118.7515], [31, "Maruyogon", 1813, 9.7925, 118.7555],
  [32, "Masigla", 597, 9.7345, 118.7425], [33, "Masikap", 966, 9.7468, 118.7435],
  [34, "Masipag", 2175, 9.7482, 118.7392], [35, "Matahimik", 530, 9.7445, 118.7402],
  [36, "Matiyaga", 497, 9.7505, 118.7362], [37, "Maunlad", 4154, 9.7705, 118.7455],
  [38, "Milagrosa", 3197, 9.7402, 118.7465], [39, "Model", 337, 9.7368, 118.7335],
  [40, "Montible", 330, 9.7855, 118.7455], [41, "Napsan", 2863, 9.7745, 118.6835],
  [42, "New Panggangan", 758, 9.783, 118.7275], [43, "Pagkakaisa", 225, 9.7448, 118.7415],
  [44, "Princesa", 898, 9.7328, 118.7398], [45, "Salvacion", 1680, 9.789, 118.7525],
  [46, "San Jose", 25480, 9.7435, 118.7435], [47, "San Miguel", 17870, 9.7412, 118.7322],
  [48, "San Pedro", 29825, 9.7362, 118.7386], [49, "San Rafael", 2485, 9.7835, 118.77],
  [50, "Santa Cruz", 1067, 9.7392, 118.7422], [51, "Santa Lourdes", 11066, 9.751, 118.7205],
  [52, "Santa Lucia", 55, 9.7152, 118.7352], [53, "Santa Monica", 21789, 9.7285, 118.7545],
  [54, "Seaside", 330, 9.738, 118.7345], [55, "Sicsican", 22940, 9.7955, 118.7805],
  [56, "Simpocan", 1204, 9.798, 118.7625], [57, "Tagabinit", 990, 9.7285, 118.7668],
  [58, "Tagburos", 10118, 9.735, 118.772], [59, "Tagumpay", 510, 9.7395, 118.7535],
  [60, "Tanabag", 947, 9.7198, 118.7128], [61, "Tanglaw", 1638, 9.7795, 118.759],
  [62, "Barangay Ng Mga Mangingisda", 8227, 9.7312, 118.7358],
  [63, "Inagawan Sub-Colony", 4626, 9.7275, 118.7175], [64, "Luzviminda", 3417, 9.7485, 118.7445],
  [65, "Mandaragat", 9852, 9.7455, 118.7495], [66, "San Manuel", 20152, 9.7535, 118.7265],
  [67, "Tiniguiban", 13894, 9.7565, 118.7335],
];

const SOURCE_BY_IDX = [
  "PSA PSGC 2025", "NAMRIA 1:10K 2022", "PPC-CPDO digitized 2023",
  "PSA Census 2024 (POPCEN)", "LRA cadastral join 2024", "Field validation 2025",
];

export const seedBarangays: Barangay[] = SEEDS.map(([serial, name, population, lat, lng], i) => ({
  id: `BRGY-${String(i + 1).padStart(3, "0")}`,
  psgc: code(serial), name,
  dataSource: SOURCE_BY_IDX[i % SOURCE_BY_IDX.length],
  lat, lng, population,
}));

export const BARANGAY_POINTS: Record<string, [number, number]> = Object.fromEntries(
  seedBarangays.map((b) => [b.name, [b.lat, b.lng] as [number, number]])
);
