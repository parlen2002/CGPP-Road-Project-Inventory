/* RPIS store — single source of truth, persisted to localStorage.
   Raw file archives live in SEPARATE keys so the snapshot stays lean. */

import { useSyncExternalStore } from "react";
import {
  seedRecords, seedContractors, seedEngineers,
  type ProjectRecord, type Contractor, type Engineer, type Attachment,
  projectPoint, geotagOf,
} from "../data/registry";
import { generateSampleCadastral, seedCenterlines, type Parcel, type Centerline } from "../data/cadastre";
import { seedBarangays, type Barangay } from "../data/barangays";
import { seedRoadsReg, type RoadReg } from "../data/roadsRegistry";
import { seedCatalogItems, backfillCatalogs, type CatalogItem } from "../data/catalogs";

export interface Snapshot {
  records: ProjectRecord[];
  contractors: Contractor[];
  engineers: Engineer[];
  parcels: Parcel[];
  centerlines: Centerline[];
  barangays: Barangay[];
  roadsReg: RoadReg[];
  catalogItems: CatalogItem[];
  admin: boolean;
}

const KEY = "rpis-store-v14";
const RAW_PREFIX = "rpis-raw:";

function saveRawArchive(id: string, raw: string): boolean {
  try { localStorage.setItem(RAW_PREFIX + id, raw); return true; } catch { return false; }
}
function loadRawArchive(id: string): string | null {
  try { return localStorage.getItem(RAW_PREFIX + id); } catch { return null; }
}
function deleteRawArchive(id: string) {
  try { localStorage.removeItem(RAW_PREFIX + id); } catch { /* noop */ }
}

const normalizeRecord = (r: ProjectRecord): ProjectRecord => ({
  ...r,
  attachments: r.attachments ?? [],
  technical: r.technical ?? null,
  revision: r.revision ?? null,
  actual: r.actual ?? null,
  suspensions: r.suspensions ?? [],
  variations: r.variations ?? [],
});

function rehydrateRaw(p: Snapshot): Snapshot {
  return {
    ...p,
    records: p.records.map((r) => ({
      ...r,
      attachments: (r.attachments ?? []).map((a) =>
        a.raw ? a : { ...a, raw: loadRawArchive(a.id) ?? undefined }),
    })),
  };
}

function load(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Snapshot;
      if (
        p && Array.isArray(p.records) && p.records.length &&
        Array.isArray(p.records[0]?.location?.barangays) &&
        Array.isArray(p.records[0]?.attachments) &&
        Array.isArray(p.contractors) && Array.isArray(p.engineers) &&
        Array.isArray(p.parcels) && Array.isArray(p.centerlines) &&
        Array.isArray(p.barangays) && Array.isArray(p.roadsReg) &&
        Array.isArray(p.catalogItems) && typeof p.admin === "boolean"
      ) return rehydrateRaw({ ...p, records: p.records.map(normalizeRecord), catalogItems: backfillCatalogs(p.catalogItems) });
    }
  } catch { /* corrupted → reseed */ }
  return rehydrateRaw({
    records: seedRecords.map(normalizeRecord), contractors: seedContractors, engineers: seedEngineers,
    parcels: generateSampleCadastral(), centerlines: seedCenterlines,
    barangays: seedBarangays, roadsReg: seedRoadsReg, catalogItems: backfillCatalogs([]), admin: false,
  });
}

let snapshot: Snapshot = load();
const listeners = new Set<() => void>();

function persist(next: Snapshot) {
  try {
    const slim: Snapshot = {
      ...next,
      records: next.records.map((r) => ({
        ...r, attachments: (r.attachments ?? []).map((a) => ({ ...a, raw: undefined })),
      })),
    };
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch { /* quota — keep in memory */ }
}
function mutate(next: Snapshot) {
  snapshot = next;
  persist(next);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnap = () => snapshot;
export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

/* ---------------- ids ---------------- */
export function nextId(prefix: string, existing: string[]): string {
  const n = existing.map((x) => parseInt(x.replace(`${prefix}-`, ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(n + 1).padStart(3, "0")}`;
}
export function nextRecordId(records: ProjectRecord[]): string {
  const year = new Date().getFullYear();
  const n = records.map((r) => { const [y, num] = r.id.replace("RPIS-", "").split("-").map(Number); return y === year ? num : 0; }).reduce((a, b) => Math.max(a, b), 0);
  return `RPIS-${year}-${String(n + 1).padStart(3, "0")}`;
}
export function nextAttachmentId(recordId: string): string {
  const rec = snapshot.records.find((r) => r.id === recordId);
  const n = (rec?.attachments ?? []).map((a) => parseInt(a.id.replace("ATT-", ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  return `ATT-${String(n + 1).padStart(3, "0")}`;
}

/* ---------------- records ---------------- */
export function addRecord(r: ProjectRecord) { mutate({ ...snapshot, records: [...snapshot.records, normalizeRecord(r)] }); }
export function updateRecord(id: string, patch: Partial<ProjectRecord>) {
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === id ? normalizeRecord({ ...r, ...patch }) : r)) });
}
export function deleteRecord(id: string) {
  const rec = snapshot.records.find((r) => r.id === id);
  rec?.attachments?.forEach((a) => deleteRawArchive(a.id));
  mutate({
    ...snapshot,
    records: snapshot.records.filter((r) => r.id !== id),
    centerlines: snapshot.centerlines.map((c) => (c.projectId === id ? { ...c, projectId: null } : c)),
  });
}
export function setPercent(id: string, percent: number) { updateRecord(id, { percent }); }
export function setSpecVariant(id: string, variant: "technical" | "revision" | "actual", value: unknown) {
  updateRecord(id, { [variant]: value } as Partial<ProjectRecord>);
}
export function addOrder(id: string, kind: "suspensions" | "variations", order: unknown) {
  const rec = snapshot.records.find((r) => r.id === id);
  if (!rec) return;
  updateRecord(id, { [kind]: [...(rec[kind] as unknown[]), order] } as Partial<ProjectRecord>);
}
export function updateOrder(id: string, kind: "suspensions" | "variations", orderId: string, patch: Record<string, unknown>) {
  const rec = snapshot.records.find((r) => r.id === id);
  if (!rec) return;
  updateRecord(id, { [kind]: (rec[kind] as { id: string }[]).map((o) => (o.id === orderId ? { ...o, ...patch } : o)) } as Partial<ProjectRecord>);
}
export function deleteOrder(id: string, kind: "suspensions" | "variations", orderId: string) {
  const rec = snapshot.records.find((r) => r.id === id);
  if (!rec) return;
  updateRecord(id, { [kind]: (rec[kind] as { id: string }[]).filter((o) => o.id !== orderId) } as Partial<ProjectRecord>);
}

/* ---------------- attachments ---------------- */
export function addAttachment(recordId: string, att: Attachment): boolean {
  let archived = false;
  let a = att;
  if (att.raw) {
    archived = saveRawArchive(att.id, att.raw);
    if (!archived) a = { ...att, raw: undefined };
  }
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === recordId ? { ...r, attachments: [...(r.attachments ?? []), a] } : r)) });
  return archived;
}
export function deleteAttachment(recordId: string, attId: string) {
  deleteRawArchive(attId);
  mutate({ ...snapshot, records: snapshot.records.map((r) => (r.id === recordId ? { ...r, attachments: (r.attachments ?? []).filter((x) => x.id !== attId) } : r)) });
}

/* ---------------- FK registries ---------------- */
export function addContractor(c: Omit<Contractor, "id">): string {
  const id = nextId("CTR", snapshot.contractors.map((x) => x.id));
  mutate({ ...snapshot, contractors: [...snapshot.contractors, { ...c, id }] });
  return id;
}
export function updateContractor(id: string, patch: Partial<Omit<Contractor, "id">>) {
  mutate({ ...snapshot, contractors: snapshot.contractors.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}
export function deleteContractor(id: string): number {
  const linked = snapshot.records.filter((r) => r.implementorId === id).length;
  mutate({
    ...snapshot, contractors: snapshot.contractors.filter((c) => c.id !== id),
    records: snapshot.records.map((r) => (r.implementorId === id ? { ...r, implementorId: "" } : r)),
  });
  return linked;
}
export function addEngineer(e: Omit<Engineer, "id">): string {
  const id = nextId("ENG", snapshot.engineers.map((x) => x.id));
  mutate({ ...snapshot, engineers: [...snapshot.engineers, { ...e, id }] });
  return id;
}
export function updateEngineer(id: string, patch: Partial<Omit<Engineer, "id">>) {
  mutate({ ...snapshot, engineers: snapshot.engineers.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}
export function deleteEngineer(id: string): number {
  const linked = snapshot.records.filter((r) => r.inchargeId === id).length;
  mutate({
    ...snapshot, engineers: snapshot.engineers.filter((e) => e.id !== id),
    records: snapshot.records.map((r) => (r.inchargeId === id ? { ...r, inchargeId: "" } : r)),
  });
  return linked;
}

/* ---------------- cadastre + centerlines ---------------- */
export function setParcels(parcels: Parcel[]) { mutate({ ...snapshot, parcels }); }
export function resetCadastre() { mutate({ ...snapshot, parcels: generateSampleCadastral() }); }
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

export function setAdmin(admin: boolean) { mutate({ ...snapshot, admin }); }

/* ---------------- barangay registry ---------------- */
export function addBarangay(b: Omit<Barangay, "id">): string {
  const id = nextId("BRGY", snapshot.barangays.map((x) => x.id));
  mutate({ ...snapshot, barangays: [...snapshot.barangays, { ...b, id }] });
  return id;
}
export function updateBarangay(id: string, patch: Partial<Omit<Barangay, "id">>) {
  mutate({ ...snapshot, barangays: snapshot.barangays.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
}
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

/* ---------------- road & street registry ---------------- */
export function addRoadReg(r: Omit<RoadReg, "id">): string {
  const id = nextId("RD", snapshot.roadsReg.map((x) => x.id));
  mutate({ ...snapshot, roadsReg: [...snapshot.roadsReg, { ...r, id }] });
  return id;
}
export function updateRoadReg(id: string, patch: Partial<Omit<RoadReg, "id">>) {
  mutate({ ...snapshot, roadsReg: snapshot.roadsReg.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}
export function deleteRoadReg(id: string): number {
  const linked = snapshot.records.filter((r) => r.roadId === id).length;
  mutate({
    ...snapshot, roadsReg: snapshot.roadsReg.filter((r) => r.id !== id),
    records: snapshot.records.map((r) => (r.roadId === id ? { ...r, roadId: undefined } : r)),
  });
  return linked;
}

/* ---------------- catalogs ---------------- */
export function addCatalogItem(item: Omit<CatalogItem, "id">): string {
  const id = nextId("CAT", snapshot.catalogItems.map((x) => x.id));
  mutate({ ...snapshot, catalogItems: [...snapshot.catalogItems, { ...item, id }] });
  return id;
}
export function updateCatalogItem(id: string, patch: Partial<Omit<CatalogItem, "id">>) {
  mutate({ ...snapshot, catalogItems: snapshot.catalogItems.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}
export function deleteCatalogItem(id: string) {
  mutate({ ...snapshot, catalogItems: snapshot.catalogItems.filter((c) => c.id !== id) });
}

/* ---------------- pin resolution ----------------
   geotag EXIF → linked centerline centroid → barangay centroid(s) */
export function linkedCenterline(r: ProjectRecord): Centerline | null {
  return snapshot.centerlines.find((c) => c.projectId === r.id) ?? null;
}
export function recordPoint(r: ProjectRecord): [number, number] {
  const geo = geotagOf(r);
  if (geo) return [geo.lat!, geo.lng!];
  const cl = linkedCenterline(r);
  if (cl && cl.line.length) {
    return [cl.line.reduce((s, p) => s + p[0], 0) / cl.line.length, cl.line.reduce((s, p) => s + p[1], 0) / cl.line.length];
  }
  const live = snapshot.barangays.filter((b) => r.location.barangays.includes(b.name)).map((b) => [b.lat, b.lng] as [number, number]);
  if (live.length) return [live.reduce((s, p) => s + p[0], 0) / live.length, live.reduce((s, p) => s + p[1], 0) / live.length];
  return projectPoint(r);
}
export type PinKind = "geotag" | "centerline" | "barangay";
export function pinSourceOf(r: ProjectRecord): { kind: PinKind; label: string } {
  const geo = geotagOf(r);
  if (geo) return { kind: "geotag", label: `Geotagged · ${geo.name}` };
  const cl = linkedCenterline(r);
  if (cl) return { kind: "centerline", label: `Centerline · ${cl.id} (Lot & ROW)` };
  return { kind: "barangay", label: "Barangay centroid — no field capture" };
}
