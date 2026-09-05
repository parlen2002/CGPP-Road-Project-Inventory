import { useSyncExternalStore } from "react";
import {
  seedRecords, seedContractors, seedEngineers, projectPoint,
  type ProjectRecord, type Contractor, type Engineer, type Attachment,
} from "../data/registry";
import {
  generateSampleCadastral, seedCenterlines,
  type Parcel, type Centerline,
} from "../data/cadastre";
import { seedBarangays, type Barangay } from "../data/barangays";
import { seedRoadsReg, suggestRoadId, type RoadReg } from "../data/roadsRegistry";
import {
  emptySpecs,
  type TechSpecs, type RevisionMeta, type ActualMeta,
  type SuspensionOrder, type VariationOrder,
} from "../data/specs";

export interface Snapshot {
  records: ProjectRecord[];
  contractors: Contractor[];
  engineers: Engineer[];
  parcels: Parcel[];         // cadastre (QGIS shapefile basis)
  centerlines: Centerline[]; // road centerlines (KML / GPX / drawn), linked to records
  barangays: Barangay[];     // barangay registry — editable administrative basis
  roadsReg: RoadReg[];       // road & street registry — the naming basis of the inventory
  admin: boolean;            // program-admin mode gates removal of uploaded files
}

const KEY = "rpis-store-v9"; // v9 = technical/revision/actual specs + suspension & variation orders; older snapshots are reseeded

/* guarantee every loaded record carries its detail collections */
const normalizeRecord = (r: ProjectRecord): ProjectRecord => ({
  ...r,
  technical: r.technical ?? null,
  revision: r.revision ?? null,
  actual: r.actual ?? null,
  suspensions: r.suspensions ?? [],
  variations: r.variations ?? [],
});

function load(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Snapshot;
      // validate shape so pre-migration snapshots can never crash the map
      if (
        p && Array.isArray(p.records) && p.records.length &&
        Array.isArray(p.records[0]?.location?.barangays) &&
        Array.isArray(p.records[0]?.attachments) &&
        Array.isArray(p.contractors) && Array.isArray(p.engineers) &&
        Array.isArray(p.parcels) && Array.isArray(p.centerlines) &&
        Array.isArray(p.barangays) && Array.isArray(p.roadsReg) &&
        typeof p.admin === "boolean"
      ) return { ...p, records: p.records.map(normalizeRecord) };
    }
  } catch { /* corrupted storage → fall back to seed */ }
  return {
    records: seedRecords.map(normalizeRecord), contractors: seedContractors, engineers: seedEngineers,
    parcels: generateSampleCadastral(), centerlines: seedCenterlines,
    barangays: seedBarangays, roadsReg: seedRoadsReg, admin: false,
  };
}

let snapshot: Snapshot = load();
const listeners = new Set<() => void>();

function mutate(next: Snapshot) {
  snapshot = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full/unavailable */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}

/* ---------------- actions ---------------- */

export function setPercent(id: string, percent: number) {
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === id ? { ...r, percent } : r)) });
}

export function setActualDates(id: string, actualStart: string | null, actualCompletion: string | null) {
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === id ? { ...r, actualStart, actualCompletion } : r)) });
}

export function addRecord(rec: ProjectRecord) {
  mutate({ ...snapshot, records: [rec, ...snapshot.records] });
}

export function updateRecord(id: string, patch: Partial<Omit<ProjectRecord, "id">>) {
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

export function deleteRecord(id: string) {
  mutate({ ...snapshot, records: snapshot.records.filter((r) => r.id !== id) });
}

/* ---------------- spec variants (technical / revision / actual) ---------------- */

function patchOne(id: string, patch: Partial<Omit<ProjectRecord, "id">>) {
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

export function setSpecVariant(
  recordId: string,
  variant: "technical" | "revision" | "actual",
  value: TechSpecs | { specs: TechSpecs; meta: RevisionMeta } | { specs: TechSpecs; meta: ActualMeta } | null,
) {
  patchOne(recordId, { [variant]: value } as Partial<Omit<ProjectRecord, "id">>);
}

export const specOf = (r: ProjectRecord | undefined, v: "technical" | "revision" | "actual"): TechSpecs | null => {
  if (!r) return null;
  if (v === "technical") return r.technical ?? null;
  return r[v]?.specs ?? null;
};

/* ---------------- suspension & variation orders ---------------- */

function nextOrderId(prefix: string, existing: string[]): string {
  const n = existing
    .map((x) => parseInt(x.replace(`${prefix}-`, ""), 10))
    .filter((x) => !Number.isNaN(x))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(n + 1).padStart(3, "0")}`;
}

export function addOrder(recordId: string, kind: "so" | "vo", order: Omit<SuspensionOrder, "id"> | Omit<VariationOrder, "id">): string {
  const rec = snapshot.records.find((r) => r.id === recordId);
  if (!rec) return "";
  if (kind === "so") {
    const id = nextOrderId("SO", rec.suspensions.map((o) => o.id));
    patchOne(recordId, { suspensions: [...rec.suspensions, { ...(order as Omit<SuspensionOrder, "id">), id }] });
    return id;
  }
  const id = nextOrderId("VO", rec.variations.map((o) => o.id));
  patchOne(recordId, { variations: [...rec.variations, { ...(order as Omit<VariationOrder, "id">), id }] });
  return id;
}

export function updateOrder(recordId: string, kind: "so" | "vo", order: SuspensionOrder | VariationOrder) {
  const rec = snapshot.records.find((r) => r.id === recordId);
  if (!rec) return;
  if (kind === "so") patchOne(recordId, { suspensions: rec.suspensions.map((o) => (o.id === order.id ? (order as SuspensionOrder) : o)) });
  else patchOne(recordId, { variations: rec.variations.map((o) => (o.id === order.id ? (order as VariationOrder) : o)) });
}

export function deleteOrder(recordId: string, kind: "so" | "vo", orderId: string) {
  const rec = snapshot.records.find((r) => r.id === recordId);
  if (!rec) return;
  if (kind === "so") patchOne(recordId, { suspensions: rec.suspensions.filter((o) => o.id !== orderId) });
  else patchOne(recordId, { variations: rec.variations.filter((o) => o.id !== orderId) });
}

/* ---------------- attachments (geotagged images / PDFs) ---------------- */

export function addAttachment(recordId: string, att: Attachment) {
  mutate({
    ...snapshot,
    records: snapshot.records.map((r) =>
      r.id === recordId ? { ...r, attachments: [...(r.attachments ?? []), att] } : r),
  });
}

export function deleteAttachment(recordId: string, attId: string) {
  mutate({
    ...snapshot,
    records: snapshot.records.map((r) =>
      r.id === recordId ? { ...r, attachments: (r.attachments ?? []).filter((a) => a.id !== attId) } : r),
  });
}

/** Reads the live snapshot so batch uploads get sequential ids. */
export function nextAttachmentId(recordId: string): string {
  const rec = snapshot.records.find((r) => r.id === recordId);
  const n = (rec?.attachments ?? [])
    .map((a) => parseInt(a.id.replace(/\D/g, ""), 10))
    .filter((x) => !Number.isNaN(x))
    .reduce((a, b) => Math.max(a, b), 0);
  return `ATT-${String(n + 1).padStart(3, "0")}`;
}

/* ---------------- pin resolution ----------------
   1. geotagged image EXIF GPS  → exact station
   2. linked centerline (Lot & ROW) → its centroid
   3. barangay centroid(s) → fallback (projectPoint) */

export function linkedCenterline(r: ProjectRecord): Centerline | null {
  return snapshot.centerlines.find((c) => c.projectId === r.id) ?? null;
}

export function recordPoint(r: ProjectRecord): [number, number] {
  const geo = (r.attachments ?? []).find((a) => a.lat != null && a.lng != null);
  if (geo) return [geo.lat!, geo.lng!];
  const cl = linkedCenterline(r);
  if (cl && cl.line.length) {
    return [
      cl.line.reduce((s, p) => s + p[0], 0) / cl.line.length,
      cl.line.reduce((s, p) => s + p[1], 0) / cl.line.length,
    ];
  }
  /* tier 3 — live barangay-registry centroids (falls back to the static map) */
  const live = snapshot.barangays
    .filter((b) => r.location.barangays.includes(b.name))
    .map((b) => [b.lat, b.lng] as [number, number]);
  if (live.length) {
    return [
      live.reduce((s, p) => s + p[0], 0) / live.length,
      live.reduce((s, p) => s + p[1], 0) / live.length,
    ];
  }
  return projectPoint(r);
}

export function setAdmin(admin: boolean) {
  mutate({ ...snapshot, admin });
}

export type PinKind = "geotag" | "centerline" | "barangay";

export function pinSourceOf(r: ProjectRecord): { kind: PinKind; label: string } {
  const geo = (r.attachments ?? []).find((a) => a.lat != null && a.lng != null);
  if (geo) return { kind: "geotag", label: `Geotagged · ${geo.name}` };
  const cl = linkedCenterline(r);
  if (cl) return { kind: "centerline", label: `Centerline · ${cl.id} (Lot & ROW)` };
  return { kind: "barangay", label: "Barangay centroid — no field capture" };
}

export function addContractor(c: Omit<Contractor, "id">): string {
  const id = nextId("CTR", snapshot.contractors.map((x) => x.id));
  mutate({ ...snapshot, contractors: [...snapshot.contractors, { ...c, id }] });
  return id;
}

export function addEngineer(e: Omit<Engineer, "id">): string {
  const id = nextId("ENG", snapshot.engineers.map((x) => x.id));
  mutate({ ...snapshot, engineers: [...snapshot.engineers, { ...e, id }] });
  return id;
}

export function updateContractor(id: string, patch: Partial<Omit<Contractor, "id">>) {
  mutate({ ...snapshot, contractors: snapshot.contractors.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

/** Removes the contractor; any projects that reference it are set to UNLINKED so the ledger stays valid. */
export function deleteContractor(id: string): number {
  const linked = snapshot.records.filter((r) => r.implementorId === id).length;
  mutate({
    ...snapshot,
    contractors: snapshot.contractors.filter((c) => c.id !== id),
    records: snapshot.records.map((r) => (r.implementorId === id ? { ...r, implementorId: "" } : r)),
  });
  return linked;
}

export function updateEngineer(id: string, patch: Partial<Omit<Engineer, "id">>) {
  mutate({ ...snapshot, engineers: snapshot.engineers.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

/** Removes the employee; any projects they are in-charge of are set to UNLINKED. */
export function deleteEngineer(id: string): number {
  const linked = snapshot.records.filter((r) => r.inchargeId === id).length;
  mutate({
    ...snapshot,
    engineers: snapshot.engineers.filter((e) => e.id !== id),
    records: snapshot.records.map((r) => (r.inchargeId === id ? { ...r, inchargeId: "" } : r)),
  });
  return linked;
}

/* ---------------- cadastre + centerlines ---------------- */

export function setParcels(parcels: Parcel[]) {
  mutate({ ...snapshot, parcels });
}

export function resetCadastre() {
  mutate({ ...snapshot, parcels: generateSampleCadastral() });
}

export function addCenterline(cl: Omit<Centerline, "id">): string {
  const id = nextId("CL", snapshot.centerlines.map((x) => x.id));
  mutate({ ...snapshot, centerlines: [...snapshot.centerlines, { ...cl, id }] });
  return id;
}

export function updateCenterline(id: string, patch: Partial<Omit<Centerline, "id">>) {
  mutate({ ...snapshot, centerlines: snapshot.centerlines.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

export function deleteCenterline(id: string) {
  mutate({ ...snapshot, centerlines: snapshot.centerlines.filter((c) => c.id !== id) });
}

/** Replace the whole centerline collection (used by functional updaters). */
export function setCenterlinesAll(centerlines: Centerline[]) {
  mutate({ ...snapshot, centerlines });
}

export function nextId(prefix: string, existing: string[]): string {
  const n = existing
    .map((s) => parseInt(s.split("-").pop() ?? "0", 10))
    .filter((x) => !Number.isNaN(x))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(n + 1).padStart(3, "0")}`;
}

export function nextRecordId(records: ProjectRecord[]): string {
  const year = new Date().getFullYear();
  const n = records
    .map((r) => {
      const [y, num] = r.id.replace("RPIS-", "").split("-").map(Number);
      return y === year ? num : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return `RPIS-${year}-${String(n + 1).padStart(3, "0")}`;
}

/* ---------------- barangay registry ---------------- */

export function nextBarangayId(): string {
  const n = snapshot.barangays
    .map((b) => parseInt(b.id.replace("BRGY-", ""), 10))
    .filter((x) => !Number.isNaN(x))
    .reduce((a, b) => Math.max(a, b), 0);
  return `BRGY-${String(n + 1).padStart(3, "0")}`;
}

export function addBarangay(b: Omit<Barangay, "id">): string {
  const id = nextBarangayId();
  mutate({ ...snapshot, barangays: [...snapshot.barangays, { ...b, id }] });
  return id;
}

export function updateBarangay(id: string, patch: Partial<Omit<Barangay, "id">>) {
  mutate({ ...snapshot, barangays: snapshot.barangays.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
}

/**
 * Renames a barangay and propagates the new name to every project
 * record that references the old one.
 */
export function renameBarangay(id: string, from: string, to: string) {
  mutate({
    ...snapshot,
    barangays: snapshot.barangays.map((b) => (b.id === id ? { ...b, name: to } : b)),
    records: snapshot.records.map((r) =>
      r.location.barangays.includes(from)
        ? { ...r, location: { ...r.location, barangays: r.location.barangays.map((x) => (x === from ? to : x)) } }
        : r),
  });
}

/**
 * Removes a barangay and strips its name from every project record's
 * coverage. Returns the number of records that referenced it.
 */
export function deleteBarangay(id: string): number {
  const bgy = snapshot.barangays.find((b) => b.id === id);
  if (!bgy) return 0;
  const linked = snapshot.records.filter((r) => r.location.barangays.includes(bgy.name)).length;
  mutate({
    ...snapshot,
    barangays: snapshot.barangays.filter((b) => b.id !== id),
    records: snapshot.records.map((r) =>
      r.location.barangays.includes(bgy.name)
        ? { ...r, location: { ...r.location, barangays: r.location.barangays.filter((x) => x !== bgy.name) } }
        : r),
  });
  return linked;
}

/** name → centroid map built from the live registry */
export function barangayPoints(brgs: Barangay[]): Record<string, [number, number]> {
  return Object.fromEntries(brgs.map((b) => [b.name, [b.lat, b.lng] as [number, number]]));
}

/* ---------------- road & street registry ---------------- */

export function addRoadReg(r: Omit<RoadReg, "id">): string {
  const id = suggestRoadId(snapshot.roadsReg);
  mutate({ ...snapshot, roadsReg: [...snapshot.roadsReg, { ...r, id }] });
  return id;
}

export function updateRoadReg(id: string, patch: Partial<Omit<RoadReg, "id">>) {
  mutate({ ...snapshot, roadsReg: snapshot.roadsReg.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

/**
 * Removes a road from the registry and unlinks every project that
 * referenced it. Returns the number of unlinked records.
 */
export function deleteRoadReg(id: string): number {
  const linked = snapshot.records.filter((r) => r.roadId === id).length;
  mutate({
    ...snapshot,
    roadsReg: snapshot.roadsReg.filter((r) => r.id !== id),
    records: snapshot.records.map((r) => (r.roadId === id ? { ...r, roadId: undefined } : r)),
  });
  return linked;
}
