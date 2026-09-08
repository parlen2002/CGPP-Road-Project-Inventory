/* RPIS store — single source of truth. Personnel and user accounts are ONE
   dataset (`personnel`), so the personnel board, the admin's user accounts,
   record in-charge links and print signatories can never drift apart.
   Raw file archives live in separate keys so writes stay instant. */

import { useSyncExternalStore } from "react";
import {
  seedRecords, seedContractors, seedPersonnel,
  type ProjectRecord, type Contractor, type Person, type Attachment,
} from "../data/registry";
import { generateSampleCadastral, seedCenterlines, type Parcel, type Centerline } from "../data/cadastre";
import { seedBarangays, type Barangay } from "../data/barangays";
import { seedRoadsReg, type RoadReg } from "../data/roadsRegistry";
import { seedCatalogItems, backfillCatalogs, type CatalogItem } from "../data/catalogs";
import { SEED_ROLES, GUEST_ROLE, type RoleDef, type Capability } from "../data/auth";

export interface ResetRequest {
  id: string; email: string; reason: string; requestedAt: string;
  status: "pending" | "approved" | "denied";
  decidedBy?: string; tempPassword?: string;
}

export interface Snapshot {
  records: ProjectRecord[];
  contractors: Contractor[];
  personnel: Person[];          // unified accounts + personnel profiles
  parcels: Parcel[];
  centerlines: Centerline[];
  barangays: Barangay[];
  roadsReg: RoadReg[];
  catalogItems: CatalogItem[];
  roles: RoleDef[];
  resets: ResetRequest[];
  session: string | null;       // Person id, "guest", or null (signed out)
}

const KEY = "rpis-store-v30";
const RAW_PREFIX = "rpis-raw:";

/* ---------- raw file archives ---------- */

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
        Array.isArray(p.personnel) && Array.isArray(p.contractors) &&
        Array.isArray(p.parcels) && Array.isArray(p.centerlines) &&
        Array.isArray(p.barangays) && Array.isArray(p.roadsReg) &&
        Array.isArray(p.catalogItems) && Array.isArray(p.roles)
      ) return rehydrateRaw(p);
    }
  } catch { /* corrupted → reseed */ }
  return rehydrateRaw({
    records: seedRecords.map(normalizeRecord),
    contractors: seedContractors,
    personnel: seedPersonnel(),
    parcels: generateSampleCadastral(),
    centerlines: seedCenterlines,
    barangays: seedBarangays,
    roadsReg: seedRoadsReg,
    catalogItems: backfillCatalogs([]),
    roles: SEED_ROLES,
    resets: [],
    session: null,
  });
}

let snapshot: Snapshot = load();
const listeners = new Set<() => void>();

function persist(next: Snapshot) {
  try {
    const slim: Snapshot = {
      ...next,
      records: next.records.map((r) => ({
        ...r,
        attachments: (r.attachments ?? []).map((a) => ({ ...a, raw: undefined })),
      })),
    };
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch { /* quota — keep in memory */ }
}

function notify() { listeners.forEach((l) => l()); }

export function mutate(next: Snapshot) {
  snapshot = next;
  persist(next);
  notify();
}

/** low-level commit used by the auth layer (person actions) */
export function commit(next: Snapshot) { mutate(next); }
export const getSnapshotState = (): Snapshot => snapshot;

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnap = () => snapshot;

export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

/* ---------- id helpers ---------- */

export function nextId(prefix: string, existing: string[]): string {
  const n = existing.map((x) => parseInt(x.replace(`${prefix}-`, ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(n + 1).padStart(3, "0")}`;
}

export function nextRecordId(records: ProjectRecord[]): string {
  const year = new Date().getFullYear();
  const n = records
    .map((r) => { const [y, num] = r.id.replace("RPIS-", "").split("-").map(Number); return y === year ? num : 0; })
    .reduce((a, b) => Math.max(a, b), 0);
  return `RPIS-${year}-${String(n + 1).padStart(3, "0")}`;
}

export function nextAttachmentId(recordId: string): string {
  const rec = snapshot.records.find((r) => r.id === recordId);
  const n = (rec?.attachments ?? [])
    .map((a) => parseInt(a.id.replace("ATT-", ""), 10))
    .filter((x) => !Number.isNaN(x))
    .reduce((a, b) => Math.max(a, b), 0);
  return `ATT-${String(n + 1).padStart(3, "0")}`;
}

/* ---------- records ---------- */

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
export function setActualDates(id: string, actualStart: string | null, actualCompletion: string | null) {
  updateRecord(id, { actualStart, actualCompletion });
}

export function setSpecVariant(id: string, variant: "technical" | "revision" | "actual", value: ProjectRecord["technical"] | ProjectRecord["revision"] | ProjectRecord["actual"]) {
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

/* ---------- attachments ---------- */

export function addAttachment(recordId: string, att: Attachment): boolean {
  let archived = false;
  let a = att;
  if (att.raw) {
    archived = saveRawArchive(att.id, att.raw);
    if (!archived) a = { ...att, raw: undefined };
  }
  mutate({
    ...snapshot,
    records: snapshot.records.map((r) =>
      r.id === recordId ? { ...r, attachments: [...(r.attachments ?? []), a] } : r),
  });
  return archived;
}

export function deleteAttachment(recordId: string, attId: string) {
  deleteRawArchive(attId);
  mutate({
    ...snapshot,
    records: snapshot.records.map((r) =>
      r.id === recordId ? { ...r, attachments: (r.attachments ?? []).filter((x) => x.id !== attId) } : r),
  });
}

/* ---------- contractors ---------- */

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
    ...snapshot,
    contractors: snapshot.contractors.filter((c) => c.id !== id),
    records: snapshot.records.map((r) => (r.implementorId === id ? { ...r, implementorId: "" } : r)),
  });
  return linked;
}

/* ---------- cadastre + centerlines ---------- */

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

/* ---------- barangay registry ---------- */

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
export function barangayPoints(brgs: Barangay[]): Record<string, [number, number]> {
  return Object.fromEntries(brgs.map((b) => [b.name, [b.lat, b.lng] as [number, number]]));
}

/* ---------- road & street registry ---------- */

export function addRoadReg(r: Omit<RoadReg, "id">): string {
  const id = nextRoadRegIdLocal(snapshot.roadsReg);
  mutate({ ...snapshot, roadsReg: [...snapshot.roadsReg, { ...r, id }] });
  return id;
}
function nextRoadRegIdLocal(list: RoadReg[]): string {
  const n = list.map((r) => parseInt(r.id.replace("rd-", "").replace(/\D/g, ""), 10)).filter((x) => !Number.isNaN(x)).reduce((a, b) => Math.max(a, b), 0);
  return `rd-${String(n + 1).padStart(3, "0")}`;
}
export function updateRoadReg(id: string, patch: Partial<Omit<RoadReg, "id">>) {
  mutate({ ...snapshot, roadsReg: snapshot.roadsReg.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}
export function deleteRoadReg(id: string): number {
  const linked = snapshot.records.filter((r) => r.roadId === id).length;
  mutate({
    ...snapshot,
    roadsReg: snapshot.roadsReg.filter((r) => r.id !== id),
    records: snapshot.records.map((r) => (r.roadId === id ? { ...r, roadId: undefined } : r)),
  });
  return linked;
}

/* ---------- catalogs ---------- */

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

/* ---------- roles ---------- */

export function updateRoleCaps(roleId: string, caps: Capability) {
  mutate({ ...snapshot, roles: snapshot.roles.map((r) => (r.id === roleId ? { ...r, caps } : r)) });
}
export function addRole(label: string, color: string): { ok: boolean; error?: string } {
  const name = label.trim();
  if (!name) return { ok: false, error: "Role name required." };
  if (snapshot.roles.some((r) => r.label.toLowerCase() === name.toLowerCase())) return { ok: false, error: "A role with that name exists." };
  const id = `role-${Date.now().toString(36)}`;
  mutate({
    ...snapshot,
    roles: [...snapshot.roles, { id, label: name, color, desc: "Custom role", builtin: false, caps: { create: false, read: true, update: false, del: false, catalog: false, users: false, print: true } }],
  });
  return { ok: true };
}
export function deleteRole(roleId: string): { ok: boolean; error?: string } {
  const def = snapshot.roles.find((r) => r.id === roleId);
  if (!def) return { ok: false, error: "Role not found." };
  if (def.builtin) return { ok: false, error: "Built-in roles cannot be deleted." };
  if (snapshot.personnel.some((p) => p.role === roleId)) return { ok: false, error: "Accounts are still assigned to this role." };
  mutate({ ...snapshot, roles: snapshot.roles.filter((r) => r.id !== roleId) });
  return { ok: true };
}

export { GUEST_ROLE };
