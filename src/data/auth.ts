/* Roles, capability matrix, name handling, divisions, positions and hashing.
   The in-charge personnel registry and user accounts are ONE dataset
   (Person, in data/registry.ts); this module defines the role system that
   governs it, plus the fixed executive seats used by print signatories. */

export interface Capability {
  create: boolean;
  read: boolean;
  update: boolean;
  del: boolean;       // `delete` is reserved
  catalog: boolean;
  users: boolean;
  print: boolean;
}

export const CAP_KEYS: { key: keyof Capability; label: string }[] = [
  { key: "create", label: "Create" },
  { key: "read", label: "Read" },
  { key: "update", label: "Update" },
  { key: "del", label: "Delete" },
  { key: "catalog", label: "Catalogs" },
  { key: "users", label: "Users" },
  { key: "print", label: "Print" },
];

export interface RoleDef {
  id: string;
  label: string;
  color: string;
  desc: string;
  builtin: boolean;
  caps: Capability;
}

const caps = (p: Partial<Capability> = {}): Capability => ({
  create: false, read: true, update: false, del: false, catalog: false, users: false, print: true, ...p,
});

export const SEED_ROLES: RoleDef[] = [
  { id: "admin", label: "Program Admin", color: "#f0a32b", builtin: true, desc: "Full control — CRUD everywhere, roles, users, catalogs, resets.",
    caps: caps({ create: true, update: true, del: true, catalog: true, users: true }) },
  { id: "encoder", label: "Encoder", color: "#1ea899", builtin: true, desc: "Like the admin, but no delete capability.",
    caps: caps({ create: true, update: true, catalog: true }) },
  { id: "executive", label: "Executive", color: "#de5a36", builtin: true, desc: "CGPP Department Head II / Assistant — encoder-level access.",
    caps: caps({ create: true, update: true, catalog: true }) },
  { id: "divisionHead", label: "Division Head", color: "#6f93cf", builtin: true, desc: "Create, read and update — no catalog editing.",
    caps: caps({ create: true, update: true }) },
  { id: "personnel", label: "Personnel", color: "#2f9a70", builtin: true, desc: "Create, read and update — no catalog editing.",
    caps: caps({ create: true, update: true }) },
  { id: "guest", label: "Guest", color: "#71826f", builtin: true, desc: "View-only. No printing or export, so data cannot leak.",
    caps: caps({ print: false }) },
];

export const GUEST_ROLE: RoleDef = SEED_ROLES[SEED_ROLES.length - 1];

export const ROLE_FALLBACK: Record<string, Capability> = Object.fromEntries(
  SEED_ROLES.map((r) => [r.id, r.caps])
);

/* ---------------- name handling ---------------- */

export interface NameParts { prefix: string; firstName: string; middleName: string; lastName: string; }

export const NAME_PREFIXES = ["Mr.", "Ms.", "Mrs.", "Engr.", "Archt.", "Dr.", "Atty.", "Dir.", "Capt.", "Supt.", "Hon."];

/** "Prefix First M. Surname" — middle rendered as an initial */
export function joinName(p: NameParts): string {
  const mid = p.middleName.trim();
  const parts = [
    p.prefix.trim(),
    p.firstName.trim(),
    mid ? `${mid.charAt(0).toUpperCase()}.` : "",
    p.lastName.trim(),
  ].filter(Boolean);
  return parts.join(" ");
}

export function splitDisplayName(full: string): NameParts {
  const toks = full.trim().split(/\s+/).filter(Boolean);
  let prefix = "";
  if (toks.length && /^[A-Za-z]+\.$/.test(toks[0])) prefix = toks.shift()!;
  const firstName = toks.shift() ?? "";
  const lastName = toks.pop() ?? "";
  const middleName = toks.join(" ");
  return { prefix, firstName, middleName, lastName };
}

/* ---------------- OCE divisions (bracketed code stored, hidden in names) ---------------- */

export const DIVISIONS: { name: string; code: string }[] = [
  { name: "Construction Division", code: "CD" },
  { name: "Maintenance Division", code: "MD" },
  { name: "Public Services Division", code: "PSD" },
  { name: "Survey & Mapping Division", code: "SMD" },
  { name: "Electrical Division", code: "ED" },
  { name: "Materials Testing Quality Control Division", code: "MTQC" },
  { name: "Motorpool Division", code: "MPD" },
  { name: "Planning Design & Programming Division", code: "PDPD" },
  { name: "Administrative Division", code: "AD" },
];

export const POSITIONS: string[] = [
  "CGPP Department Head II (City Engineer)",
  "CGPP Assistant Department Head II (Assistant City Engineer)",
  "OCE Systems Administrator",
  "District Engineer",
  "Project Engineer",
  "Materials Engineer",
  "Planning & Design Chief",
  "Engineering Aide III",
  "Construction Supervisor",
];

export const EXECUTIVE_SEATS = [
  "CGPP Department Head II (City Engineer)",
  "CGPP Assistant Department Head II (Assistant City Engineer)",
];

/* ---------------- hashing (WebCrypto with a sync fallback) ---------------- */

export async function hashPassword(pw: string, salt: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const data = new TextEncoder().encode(`${salt}::${pw}`);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch { /* fall through */ }
  /* deterministic fallback for non-secure contexts */
  const s = `${salt}::${pw}`;
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = (h1 * 33) ^ c;
    h2 = (h2 * 31) ^ c;
  }
  return `fb-${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
}

export function genSalt(): string {
  try {
    const a = new Uint8Array(12);
    crypto.getRandomValues(a);
    return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "OCE-";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
