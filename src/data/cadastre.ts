/* ─────────────────────────────────────────────────────────────
   CADASTRAL LAYER — lots & road centerlines
   In production: lots come from the QGIS shapefile upload
   (LRA/NAMRIA cadastre), loaded into PostGIS `cadastre_lot`,
   joined to `brgy_boundary` via ST_Intersects.
   The sample below is a deterministic stand-in for the demo.
   ────────────────────────────────────────────────────────────── */

import {
  polygonAreaM2, centroidOf, nearestBarangay, clippedAreaM2, corridorPolygon,
  polygonAreaM2 as areaOf, toXY, toLatLng, type LatLng,
} from "../lib/geo";
import { BARANGAY_POINTS } from "./roads";

export type OwnerType = "Government" | "Private";

export interface Parcel {
  id: string;
  ring: LatLng[];
  owner: string;
  ownerType: OwnerType;
  barangay: string;
  areaM2: number;
}

export interface Centerline {
  id: string;
  name: string;
  line: LatLng[];
  radiusM: number;       // variable offset from the centerline
  projectId: string;     // linked project record ("" = unlinked)
  source: string;        // KML / GPX / drawn / shapefile
}

export interface AffectedLot {
  lotId: string;
  owner: string;
  ownerType: OwnerType;
  barangay: string;
  totalM2: number;
  affectedM2: number;
  pct: number;
}

/* ---------------- deterministic sample cadastre ---------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRIVATE_OWNERS = [
  "Dela Cruz, M.", "Santos, R.", "Reyes, A.", "Mendoza, J.", "Ramos, L.",
  "Alcantara, P.", "Bautista, E.", "Ocampo, V.", "Lim, K.", "Tan, S.",
  "Uy, D.", "Villanueva, C.", "Garcia, N.", "Torres, B.", "Navarro, F.",
];
const GOV_OWNERS = [
  "City Government of PPC", "DepEd — Schools Division", "Barangay LGU",
  "PSA Compound", "City Water District",
];

function makeParcel(id: string, ring: LatLng[], rnd: () => number, govChance: number): Parcel {
  const [la, ln] = centroidOf(ring);
  const gov = rnd() < govChance;
  return {
    id, ring,
    owner: gov ? GOV_OWNERS[Math.floor(rnd() * GOV_OWNERS.length)] : PRIVATE_OWNERS[Math.floor(rnd() * PRIVATE_OWNERS.length)],
    ownerType: gov ? "Government" : "Private",
    barangay: nearestBarangay(la, ln, BARANGAY_POINTS as Record<string, LatLng>),
    areaM2: Math.round(polygonAreaM2(ring)),
  };
}

function gridParcels(idPrefix: string, anchor: LatLng, blocksX: number, blocksY: number, rnd: () => number): Parcel[] {
  const out: Parcel[] = [];
  const bw = 0.0026, bh = 0.0023; // block in degrees (~280 × 250 m)
  let n = 0;
  for (let bx = 0; bx < blocksX; bx++) {
    for (let by = 0; by < blocksY; by++) {
      const x0 = anchor[1] + bx * bw, y0 = anchor[0] + by * bh;
      // each block → 6 lots (2 × 3) with jittered corners
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          n++;
          const jx = () => (rnd() - 0.5) * 0.00012;
          const w = bw / 2 - 0.00012, h = bh / 3 - 0.0001;
          const lx = x0 + i * (bw / 2) + 0.00006, ly = y0 + j * (bh / 3) + 0.00005;
          const ring: LatLng[] = [
            [ly + jx() * 0.4, lx + jx()],
            [ly + jx() * 0.4, lx + w + jx()],
            [ly + h + jx() * 0.4, lx + w + jx()],
            [ly + h + jx() * 0.4, lx + jx()],
          ];
          out.push(makeParcel(`${idPrefix}-${String(n).padStart(3, "0")}`, ring, rnd, 0.12));
        }
      }
    }
  }
  return out;
}

/** road-front lots flanking a centerline — guarantees lots inside the corridor */
function roadFrontParcels(idPrefix: string, line: LatLng[], rnd: () => number): Parcel[] {
  const lat0 = line.reduce((s, p) => s + p[0], 0) / line.length;
  const P = toXY(line);
  const out: Parcel[] = [];
  let n = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;      // along
    const nx = -uy, ny = ux;                 // across
    const count = Math.max(1, Math.floor(len / 52));
    for (let k = 0; k < count; k++) {
      for (const side of [1, -1]) {
        n++;
        const t0 = (k / count) * len + 4 + rnd() * 6;
        const t1 = Math.min(((k + 1) / count) * len - 4, t0 + 42);
        if (t1 - t0 < 12) continue;
        const inOff = 5 + rnd() * 4;   // inner edge 5–9 m from CL → corridor (8 m) clips a strip
        const depth = 24 + rnd() * 8;
        const quad: [number, number][] = [
          [ax + ux * t0 + nx * side * inOff, ay + uy * t0 + ny * side * inOff],
          [ax + ux * t1 + nx * side * inOff, ay + uy * t1 + ny * side * inOff],
          [ax + ux * t1 + nx * side * (inOff + depth), ay + uy * t1 + ny * side * (inOff + depth)],
          [ax + ux * t0 + nx * side * (inOff + depth), ay + uy * t0 + ny * side * (inOff + depth)],
        ];
        out.push(makeParcel(`${idPrefix}-${String(n).padStart(2, "0")}`, toLatLng(quad, lat0), rnd, 0.3));
      }
    }
  }
  return out;
}

export const RIZAL_GEOMETRY: LatLng[] = [
  [9.7282, 118.7338], [9.7315, 118.7349], [9.7348, 118.7359], [9.7382, 118.7371],
  [9.7415, 118.7383], [9.7448, 118.7394], [9.7495, 118.7408],
];

export function generateSampleCadastral(): Parcel[] {
  const rnd = mulberry32(20260221);
  const pob = gridParcels("LOT-POB", [9.7312, 118.7316], 5, 4, rnd);
  const mdr = gridParcels("LOT-MDR", [9.7436, 118.7452], 3, 2, rnd);
  const bac = gridParcels("LOT-BAC", [9.7668, 118.7462], 3, 2, rnd);
  const rzl = roadFrontParcels("LOT-RZL", RIZAL_GEOMETRY, rnd);
  return [...rzl, ...pob, ...mdr, ...bac];
}

export const seedCenterlines: Centerline[] = [
  {
    id: "CL-001",
    name: "Rizal Avenue — centerline",
    line: RIZAL_GEOMETRY,
    radiusM: 8,
    projectId: "RPIS-2025-014",
    source: "KML · Rizal_Ave_sidewalk_rev2.kml",
  },
];

/* ---------------- ROW analysis runner ---------------- */

export interface ROWResult {
  rows: AffectedLot[];
  corridorAreaM2: number;
  corridorRing: LatLng[];
}

export function runROWAnalysis(parcels: Parcel[], cl: Centerline): ROWResult {
  const corridorRing = corridorPolygon(cl.line, cl.radiusM);
  const rows: AffectedLot[] = [];
  for (const p of parcels) {
    const affected = clippedAreaM2(p.ring, cl.line, cl.radiusM);
    if (affected > 0.5) {
      rows.push({
        lotId: p.id, owner: p.owner, ownerType: p.ownerType, barangay: p.barangay,
        totalM2: p.areaM2, affectedM2: Math.round(affected),
        pct: Math.min(100, Math.round((affected / Math.max(1, p.areaM2)) * 100)),
      });
    }
  }
  rows.sort((a, b) => b.affectedM2 - a.affectedM2);
  return { rows, corridorAreaM2: Math.round(areaOf(corridorRing)), corridorRing };
}
