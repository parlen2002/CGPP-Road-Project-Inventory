import { useSyncExternalStore } from "react";
import {
  seedRecords, seedContractors, seedEngineers,
  type ProjectRecord, type Contractor, type Engineer,
} from "../data/registry";

export interface Snapshot {
  records: ProjectRecord[];
  contractors: Contractor[];
  engineers: Engineer[];
}

const KEY = "rpis-store-v2";

function load(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Snapshot;
      if (p && Array.isArray(p.records) && p.records.length) return p;
    }
  } catch { /* corrupted storage → fall back to seed */ }
  return { records: seedRecords, contractors: seedContractors, engineers: seedEngineers };
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
