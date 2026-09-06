/* Auth layer — sits directly on the unified store. Personnel and accounts are
   the SAME dataset, so there is nothing to sync and signatories always resolve
   from live rows. */

import {
  useStore, commit, getSnapshotState,
  type ResetRequest,
} from "./store";
import {
  hashPassword, genSalt, genTempPassword, validEmail, joinName,
  GUEST_ROLE, type RoleDef, type Capability, type NameParts,
} from "../data/auth";
import { DEMO_PASSWORDS, type Person } from "../data/registry";
import { toast } from "../components/toast";

/* ---------- readiness: hash demo passwords once ---------- */

let readyDone = false;
let readyPromise: Promise<void> | null = null;

export function ensureAuthReady(): Promise<void> {
  if (readyDone) return Promise.resolve();
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const s = getSnapshotState();
    const pending = DEMO_PASSWORDS.filter(([id]) => {
      const p = s.personnel.find((x) => x.id === id);
      return p && !p.passHash;
    });
    if (pending.length) {
      const updates = await Promise.all(pending.map(async ([id, pw]) => {
        const p = s.personnel.find((x) => x.id === id)!;
        const salt = genSalt();
        return { id, salt, passHash: await hashPassword(pw, salt) };
      }));
      commit({
        ...s,
        personnel: s.personnel.map((p) => {
          const u = updates.find((x) => x.id === p.id);
          return u ? { ...p, salt: u.salt, passHash: u.passHash } : p;
        }),
      });
    }
    readyDone = true;
  })();
  return readyPromise;
}

/* ---------- hook ---------- */

export interface AuthApi {
  ready: boolean;
  user: Person | null;
  role: string;
  roleDef: RoleDef;
  can: Capability;
  pendingResets: number;
  resets: ResetRequest[];
  users: Person[];
  roles: RoleDef[];
}

export function useAuth(): AuthApi {
  const s = useStore();
  const user = s.session === "guest"
    ? null
    : s.personnel.find((p) => p.id === s.session) ?? null;
  const isGuest = s.session === "guest";
  const role = user ? user.role : "guest";
  const roleDef = isGuest ? GUEST_ROLE : (s.roles.find((r) => r.id === role) ?? GUEST_ROLE);
  return {
    ready: true,
    user,
    role: isGuest ? "guest" : role,
    roleDef: isGuest ? GUEST_ROLE : roleDef,
    can: isGuest ? GUEST_ROLE.caps : roleDef.caps,
    pendingResets: s.resets.filter((r) => r.status === "pending").length,
    resets: s.resets,
    users: s.personnel,
    roles: s.roles,
  };
}

/* ---------- session ---------- */

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  await ensureAuthReady();
  const s = getSnapshotState();
  const p = s.personnel.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!p) return { ok: false, error: "No account with that email." };
  const hash = await hashPassword(password, p.salt);
  if (hash !== p.passHash) return { ok: false, error: "Incorrect password." };
  if (p.verified === false) {
    return { ok: false, error: "Account pending verification. A Program Administrator must confirm your signup and assign a role before you can sign in." };
  }
  commit({ ...s, session: p.id });
  toast(`Signed in — ${p.name}`, "info", `${p.position} · ${p.divisionCode || p.division}`);
  return { ok: true };
}

export function loginGuest() {
  commit({ ...getSnapshotState(), session: "guest" });
  toast("Guest session", "info", "read-only · printing disabled");
}

export function logout() {
  commit({ ...getSnapshotState(), session: null });
}

/* ---------- account / personnel CRUD (one dataset) ---------- */

export interface PersonInput extends NameParts {
  email: string;
  password?: string;      // required on create
  role: string;
  position: string;
  division: string;
  divisionCode: string;
  prc: string;
  phone: string;
}

export async function addPerson(input: PersonInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  await ensureAuthReady();
  const s = getSnapshotState();
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (s.personnel.some((p) => p.email.toLowerCase() === email)) return { ok: false, error: "An account with that email already exists." };
  if (!input.password || input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (!input.firstName.trim() || !input.lastName.trim()) return { ok: false, error: "First name and surname are required." };
  const salt = genSalt();
  const id = `USR-${String(s.personnel.length + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
  const person: Person = {
    id,
    prefix: input.prefix, firstName: input.firstName, middleName: input.middleName, lastName: input.lastName,
    name: joinName(input),
    email, passHash: await hashPassword(input.password, salt), salt,
    role: input.role, position: input.position, division: input.division,
    divisionCode: input.divisionCode, prc: input.prc, phone: input.phone,
    createdAt: new Date().toISOString(),
    verified: false, // held for Program Admin verification + role assignment
  };
  commit({ ...s, personnel: [...s.personnel, person] });
  return { ok: true, id };
}

/** Program Admin confirms a pending signup and assigns its role. */
export function verifyPerson(id: string, roleId: string): { ok: boolean; error?: string } {
  const s = getSnapshotState();
  const p = s.personnel.find((x) => x.id === id);
  if (!p) return { ok: false, error: "Account not found." };
  commit({
    ...s,
    personnel: s.personnel.map((x) => (x.id === id ? { ...x, verified: true, role: roleId } : x)),
  });
  toast(`${p.name} verified`, "updated", `role assigned · sign-in enabled`);
  return { ok: true };
}

/** Program Admin rejects a pending signup — the account is removed. */
export function denyPerson(id: string): { ok: boolean; error?: string } {
  const s = getSnapshotState();
  const p = s.personnel.find((x) => x.id === id);
  if (!p) return { ok: false, error: "Account not found." };
  commit({ ...s, personnel: s.personnel.filter((x) => x.id !== id) });
  toast(`${p.name} signup denied`, "deleted", "account removed");
  return { ok: true };
}

export function updatePerson(id: string, patch: Partial<Omit<Person, "id" | "passHash" | "salt">>) {
  const s = getSnapshotState();
  commit({
    ...s,
    personnel: s.personnel.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.prefix !== undefined || patch.firstName !== undefined || patch.middleName !== undefined || patch.lastName !== undefined) {
        next.name = joinName(next);
      }
      return next;
    }),
  });
}

export async function setPersonPassword(id: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const s = getSnapshotState();
  const salt = genSalt();
  const hash = await hashPassword(newPassword, salt);
  commit({ ...s, personnel: s.personnel.map((p) => (p.id === id ? { ...p, salt, passHash: hash } : p)) });
  return { ok: true };
}

export async function changePassword(userId: string, current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const s = getSnapshotState();
  const p = s.personnel.find((x) => x.id === userId);
  if (!p) return { ok: false, error: "Account not found." };
  const hash = await hashPassword(current, p.salt);
  if (hash !== p.passHash) return { ok: false, error: "Current password is incorrect." };
  return setPersonPassword(userId, next);
}

export function setPersonRole(id: string, role: string) {
  updatePerson(id, { role });
}

/** Unlinks record in-charge references; guards self-deletion and the last admin. */
export function deletePerson(id: string): { ok: boolean; error?: string } {
  const s = getSnapshotState();
  const p = s.personnel.find((x) => x.id === id);
  if (!p) return { ok: false, error: "Account not found." };
  if (s.session === id) return { ok: false, error: "You cannot delete the account you are signed in with." };
  if (p.role === "admin" && s.personnel.filter((x) => x.role === "admin").length <= 1) {
    return { ok: false, error: "At least one Program Admin must remain." };
  }
  commit({
    ...s,
    personnel: s.personnel.filter((x) => x.id !== id),
    records: s.records.map((r) => (r.inchargeId === id ? { ...r, inchargeId: "" } : r)),
  });
  return { ok: true };
}

/* ---------- signup (joins as Personnel — admin elevates later) ---------- */

export async function signup(input: Omit<PersonInput, "role">): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await addPerson({ ...input, role: "personnel" });
  if (res.ok) {
    // no session is created — the account stays locked until a Program Admin
    // verifies the signup and assigns a role.
    toast(`Signup submitted — ${joinName(input)}`, "saved", "awaiting Program Admin verification");
  }
  return { ok: res.ok, id: res.id, error: res.error };
}

/* ---------- password reset (admin-verified) ---------- */

export function requestReset(email: string, reason: string): { ok: boolean; id?: string; error?: string } {
  const s = getSnapshotState();
  const p = s.personnel.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!p) return { ok: false, error: "No account with that email." };
  if (s.resets.some((r) => r.status === "pending" && r.email.toLowerCase() === email.trim().toLowerCase())) {
    return { ok: false, error: "A pending request already exists for that account." };
  }
  const id = `RST-${Date.now().toString(36).toUpperCase()}`;
  const req: ResetRequest = { id, email: p.email, reason: reason.trim() || "No reason given", requestedAt: new Date().toISOString(), status: "pending" };
  commit({ ...s, resets: [req, ...s.resets] });
  return { ok: true, id };
}

export function approveReset(id: string, byName: string): { temp: string } | null {
  const s = getSnapshotState();
  const req = s.resets.find((r) => r.id === id);
  if (!req || req.status !== "pending") return null;
  const p = s.personnel.find((x) => x.email.toLowerCase() === req.email.toLowerCase());
  if (!p) return null;
  const temp = genTempPassword();
  const salt = genSalt();
  void hashPassword(temp, salt).then((passHash) => {
    const cur = getSnapshotState();
    commit({ ...cur, personnel: cur.personnel.map((x) => (x.id === p.id ? { ...x, salt, passHash } : x)) });
  });
  commit({
    ...s,
    resets: s.resets.map((r) => (r.id === id ? { ...r, status: "approved" as const, decidedBy: byName, tempPassword: temp } : r)),
  });
  return { temp };
}

export function denyReset(id: string, byName: string) {
  const s = getSnapshotState();
  commit({ ...s, resets: s.resets.map((r) => (r.id === id ? { ...r, status: "denied" as const, decidedBy: byName } : r)) });
}
