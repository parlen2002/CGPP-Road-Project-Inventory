/* Cadastre + centerline model and the ROW impact engine
   (clipping lots against a flat-sided corridor buffer). */

import { corridorPolygon, clippedAreaM2, polygonAreaM2, nearestBarangay, type LatLng } from "../lib/geo";
import { BARANGAY_POINTS } from "./barangays";

export type OwnerType = "Government" | "Private";

export interface Parcel {
  id: string; ring: LatLng[]; owner: string; ownerType: OwnerType;
  barangay: string; areaM2: number; valuePerM2: number;
}

export interface Centerline {
  id: string; name: string; source: "KML" | "GPX" | "Drawn"; ref: string;
  projectId: string | null; radiusM: number; line: LatLng[];
}

export interface AffectedLot {
  lotId: string; owner: string; ownerType: OwnerType; barangay: string;
  totalM2: number; affectedM2: number; pct: number; valuePerM2: number; cost: number;
}

export interface ROWResult {
  rows: AffectedLot[]; corridorAreaM2: number; corridorRing: LatLng[];
  govM2: number; privM2: number; totalCost: number;
}

const GOV_OWNERS = ["City Government of Puerto Princesa", "DENR — Foreshore", "DPWH Right-of-Way", "National Housing Authority"];
const PRIVATE_OWNERS = ["Dela Cruz Family", "Reyes Heirs", "Santos Estate", "Uy Commercial Lots", "Mendoza Residence", "Garcia Farmholdings"];

const rndOf = (seed: number) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

export function generateSampleCadastral(): Parcel[] {
  const rnd = rndOf(42);
  const parcels: Parcel[] = [];
  const hubs: [number, number, string, number][] = [
    [9.738, 118.738, "San Pedro", 60],
    [9.746, 118.749, "Mandaragat", 40],
    [9.769, 118.749, "Bacungan", 30],
    [9.736, 118.751, "Tagumpay", 26],
  ];
  let n = 0;
  for (const [la0, ln0, brgy, count] of hubs) {
    for (let i = 0; i < count; i++) {
      const la = la0 + (rnd() - 0.5) * 0.012;
      const ln = ln0 + (rnd() - 0.5) * 0.012;
      const w = (0.0006 + rnd() * 0.0008) * (0.6 + rnd() * 0.8);
      const h = (0.0006 + rnd() * 0.0008) * (0.6 + rnd() * 0.8);
      const ring: LatLng[] = [
        [la - h / 2, ln - w / 2], [la - h / 2, ln + w / 2],
        [la + h / 2, ln + w / 2], [la + h / 2, ln - w / 2],
      ];
      const gov = rnd() < 0.18;
      parcels.push({
        id: `LOT-${brgy.slice(0, 3).toUpperCase()}-${String(++n).padStart(3, "0")}`,
        ring,
        owner: gov ? GOV_OWNERS[Math.floor(rnd() * GOV_OWNERS.length)] : PRIVATE_OWNERS[Math.floor(rnd() * PRIVATE_OWNERS.length)],
        ownerType: gov ? "Government" : "Private",
        barangay: nearestBarangay(la, ln, BARANGAY_POINTS as Record<string, LatLng>),
        areaM2: Math.round(polygonAreaM2(ring)),
        valuePerM2: gov ? 0 : Math.round((3500 + rnd() * 9500) / 100) * 100,
      });
    }
  }
  return parcels;
}

export const seedCenterlines: Centerline[] = [
  { id: "CL-001", name: "Rizal Avenue axis", source: "KML", ref: "Rizal_Ave_sidewalk_rev2.kml", projectId: "RPIS-2025-014", radiusM: 6,
    line: [[9.7452, 118.7362], [9.7428, 118.7371], [9.7402, 118.738], [9.7375, 118.7388], [9.7348, 118.7394], [9.7318, 118.7398]] },
  { id: "CL-002", name: "Bacungan Spur axis", source: "GPX", ref: "bacungan_spur_seg3.gpx", projectId: "RPIS-2024-036", radiusM: 8,
    line: [[9.7642, 118.7532], [9.7665, 118.7508], [9.7688, 118.7485], [9.7712, 118.7462]] },
  { id: "CL-003", name: "Iwahig Drainage axis", source: "KML", ref: "iwahig_drainage.kml", projectId: "RPIS-2025-008", radiusM: 5,
    line: [[9.7162, 118.7308], [9.7138, 118.7292], [9.7112, 118.7275], [9.7088, 118.7258]] },
];

export function runROWAnalysis(parcels: Parcel[], cl: Centerline): ROWResult {
  const corridorRing = corridorPolygon(cl.line, cl.radiusM);
  const rows: AffectedLot[] = [];
  let govM2 = 0, privM2 = 0, totalCost = 0;
  for (const p of parcels) {
    const affected = clippedAreaM2(p.ring, cl.line, cl.radiusM);
    if (affected > 0.5) {
      const affectedM2 = Math.round(affected);
      const cost = Math.round(affectedM2 * p.valuePerM2);
      if (p.ownerType === "Government") govM2 += affectedM2;
      else { privM2 += affectedM2; totalCost += cost; }
      rows.push({
        lotId: p.id, owner: p.owner, ownerType: p.ownerType, barangay: p.barangay,
        totalM2: p.areaM2, affectedM2,
        pct: Math.min(100, Math.round((affected / Math.max(1, p.areaM2)) * 100)),
        valuePerM2: p.valuePerM2, cost,
      });
    }
  }
  rows.sort((a, b) => b.affectedM2 - a.affectedM2);
  return { rows, corridorAreaM2: Math.round(polygonAreaM2(corridorRing)), corridorRing, govM2, privM2, totalCost };
}
