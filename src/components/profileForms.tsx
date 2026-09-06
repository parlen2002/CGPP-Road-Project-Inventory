/* Profile forms for the unified personnel dataset: contractor encoder,
   person (account + profile) encoder, change-password, and the shared
   split-name editor. */

import { useMemo, useState } from "react";
import type { Contractor } from "../data/registry";
import type { Person } from "../data/registry";
import { useStore, addContractor, updateContractor } from "../state/store";
import { addPerson, updatePerson, setPersonPassword } from "../state/authStore";
import { useAuth } from "../state/authStore";
import { joinName, splitDisplayName, NAME_PREFIXES, DIVISIONS, type NameParts } from "../data/auth";
import { optionsOf, itemsOf } from "../data/catalogs";
import { toast } from "./toast";
import { Modal, inputCls, labelCls, saveBtnCls } from "./projectForms";
import { CatalogSelect } from "./CatalogSelect";
import { SearchSelect } from "./SearchSelect";

const PCAB_CATEGORIES = ["AAAA", "AAA", "AA", "A", "B", "C", "D", "E", "—"];

/* ---------------- shared split-name editor ---------------- */

export function NameFieldsEditor({ value, onChange, prefixOptions }: {
  value: NameParts;
  onChange: (v: NameParts) => void;
  prefixOptions: string[];
}) {
  const set = (patch: Partial<NameParts>) => onChange({ ...value, ...patch });
  const display = joinName(value);
  return (
    <div className="col-span-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Prefix</label>
          <SearchSelect value={value.prefix} onChange={(v) => set({ prefix: v as string })}
            options={[{ value: "", label: "— none —" }, ...prefixOptions.map((p) => ({ value: p, label: p }))]} />
        </div>
        <div>
          <label className={labelCls}>First name *</label>
          <input className={inputCls} required value={value.firstName} onChange={(e) => set({ firstName: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Middle name</label>
          <input className={inputCls} value={value.middleName} onChange={(e) => set({ middleName: e.target.value })} placeholder="shown as initial" />
        </div>
        <div>
          <label className={labelCls}>Surname *</label>
          <input className={inputCls} required value={value.lastName} onChange={(e) => set({ lastName: e.target.value })} />
        </div>
      </div>
      <div className="mt-2 rounded-[3px] border border-line-300 bg-paper-200/70 px-3 py-2">
        <p className="font-mono text-[8.5px] tracking-[0.16em] text-text-400 uppercase">Displayed as</p>
        <p className="font-display mt-0.5 text-lg leading-none font-bold text-pine-700">{display || "—"}</p>
      </div>
    </div>
  );
}

/* ---------------- contractor ---------------- */

export function ContractorForm({ onClose, editing }: { onClose: () => void; editing?: Contractor | null }) {
  const [f, setF] = useState(() => editing ? {
    name: editing.name, pcab: editing.pcab, category: editing.category, address: editing.address,
    contactPerson: editing.contactPerson, phone: editing.phone, email: editing.email,
  } : {
    name: "", pcab: "A", category: "", address: "", contactPerson: "", phone: "", email: "",
  });
  const valid = f.name.trim().length > 2;
  const submit = () => {
    if (editing) { updateContractor(editing.id, f); toast(f.name, "updated", `${editing.id} · implementor profile`); }
    else { const id = addContractor(f); toast(f.name, "saved", `${id} · implementor profile`); }
    onClose();
  };
  return (
    <Modal title={editing ? "Edit Implementor" : "Encode Implementor"} sheet={`contractors · ${editing ? editing.id : "new"}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className={labelCls}>Contractor / firm name *</label>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Bayanihan Civil Works Corp." /></div>
        <div><label className={labelCls}>PCAB license category</label>
          <select className={inputCls} value={f.pcab} onChange={(e) => setF({ ...f, pcab: e.target.value })}>
            {PCAB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></div>
        <div><label className={labelCls}>Trade / category</label>
          <input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Infrastructure / Roads" /></div>
        <div className="col-span-2"><label className={labelCls}>Office address</label>
          <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Brgy., Puerto Princesa City" /></div>
        <div><label className={labelCls}>Contact person</label>
          <input className={inputCls} value={f.contactPerson} onChange={(e) => setF({ ...f, contactPerson: e.target.value })} /></div>
        <div><label className={labelCls}>Phone</label>
          <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(048) …" /></div>
        <div className="col-span-2"><label className={labelCls}>Email</label>
          <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      </div>
      <div className="mt-5 flex justify-end border-t border-line-300 pt-4">
        <button disabled={!valid} onClick={submit} className={saveBtnCls}>{editing ? "Save changes" : "Encode implementor"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- person (account + personnel profile, one dataset) ---------------- */

export function PersonForm({ onClose, editing, lockRole = false }: {
  onClose: () => void;
  editing?: Person | null;
  /** true when a user edits their OWN profile — role stays fixed */
  lockRole?: boolean;
}) {
  const { catalogItems, roles } = useStore();
  const { can } = useAuth();

  const prefixOptions = useMemo(() => {
    const o = optionsOf(catalogItems, "prefixes");
    return o.length ? o : [...NAME_PREFIXES];
  }, [catalogItems]);

  const initialParts = useMemo<NameParts>(() => {
    if (editing) return { prefix: editing.prefix ?? "", firstName: editing.firstName ?? "", middleName: editing.middleName ?? "", lastName: editing.lastName ?? "" };
    return { prefix: "Engr.", firstName: "", middleName: "", lastName: "" };
  }, [editing]);

  const [parts, setParts] = useState<NameParts>(initialParts);
  const [f, setF] = useState(() => editing ? {
    email: editing.email, role: editing.role, position: editing.position,
    division: editing.division, prc: editing.prc, phone: editing.phone,
  } : {
    email: "", role: "personnel", position: "", division: DIVISIONS[0].name, prc: "", phone: "",
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const divisionCode = useMemo(() => {
    const items = itemsOf(catalogItems, "divisions");
    return items.find((d) => d.value === f.division)?.code
      ?? DIVISIONS.find((d) => d.name === f.division)?.code ?? "";
  }, [catalogItems, f.division]);

  const positionOptions = useMemo(() => optionsOf(catalogItems, "positions"), [catalogItems]);

  const valid = parts.firstName.trim().length > 0 && parts.lastName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) &&
    (!editing ? password.length >= 6 : true);

  const submit = async () => {
    setError("");
    const base = {
      ...parts,
      email: f.email, role: f.role, position: f.position || positionOptions[0] || "Project Engineer",
      division: f.division, divisionCode, prc: f.prc, phone: f.phone,
    };
    if (editing) {
      updatePerson(editing.id, base);
      toast(joinName(parts), "updated", `${editing.id} · personnel profile`);
      onClose();
      return;
    }
    const res = await addPerson({ ...base, password });
    if (!res.ok) { setError(res.error ?? "Could not create account."); return; }
    toast(joinName(parts), "saved", `${res.id} · account + personnel profile created`);
    onClose();
  };

  return (
    <Modal title={editing ? "Edit Personnel / Account" : "Encode New Account"} sheet={`personnel · ${editing ? editing.id : "new"}`} onClose={onClose} wide>
      <p className="mb-3 rounded-[3px] border border-teal-500/50 bg-teal-500/10 px-3 py-2 font-mono text-[9.5px] leading-relaxed tracking-wider text-teal-500 uppercase">
        One dataset — creating an account also creates the in-charge personnel profile, and vice versa.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <NameFieldsEditor value={parts} onChange={setParts} prefixOptions={prefixOptions} />
        <div><label className={labelCls}>Official email *</label>
          <input className={inputCls} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@oce.puertoprincesa.gov.ph" /></div>
        {!editing && (
          <div><label className={labelCls}>Password * (min. 6 chars)</label>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="initial password" /></div>
        )}
        <div><label className={labelCls}>Role {lockRole ? "(fixed)" : ""}</label>
          {lockRole || !can.users ? (
            <input className={inputCls} value={roles.find((r) => r.id === f.role)?.label ?? f.role} readOnly tabIndex={-1} style={{ opacity: 0.7 }} />
          ) : (
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          )}
        </div>
        <div><label className={labelCls}>Position / designation</label>
          <CatalogSelect group="positions" fallback={positionOptions} value={f.position} onChange={(v) => setF({ ...f, position: v })} placeholder="— select position —" /></div>
        <div><label className={labelCls}>Division</label>
          <CatalogSelect group="divisions" withCodes fallback={DIVISIONS.map((d) => d.name)} value={f.division} onChange={(v) => setF({ ...f, division: v })} placeholder="— select division —" />
          <p className="mt-1 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">Code {divisionCode || "—"} stored on profile</p></div>
        <div><label className={labelCls}>PRC license no.</label>
          <input className={inputCls} value={f.prc} onChange={(e) => setF({ ...f, prc: e.target.value })} placeholder="7 digits" /></div>
        <div><label className={labelCls}>Phone</label>
          <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(048) …" /></div>
      </div>
      {error && <p className="mt-3 rounded-[3px] border border-coral-500/60 bg-coral-500/10 px-3 py-2 font-mono text-[10px] font-bold text-coral-600">{error}</p>}
      <div className="mt-5 flex justify-end border-t border-line-300 pt-4">
        <button disabled={!valid} onClick={() => void submit()} className={saveBtnCls}>
          {editing ? "Save changes" : "Create account & profile"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- change password ---------------- */

export function ChangePasswordForm({ userId, onClose, adminOverride = false }: {
  userId: string;
  onClose: () => void;
  /** admin setting someone else's password — no current-password check */
  adminOverride?: boolean;
}) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (next.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setError("New passwords do not match."); return; }
    if (adminOverride) {
      const res = await setPersonPassword(userId, next);
      if (!res.ok) { setError(res.error ?? "Could not set password."); return; }
      toast("Password set", "updated", "relay the new password securely");
      onClose();
      return;
    }
    const { changePassword } = await import("../state/authStore");
    const res = await changePassword(userId, cur, next);
    if (!res.ok) { setError(res.error ?? "Could not change password."); return; }
    toast("Password changed", "updated", "use the new password next sign-in");
    onClose();
  };

  return (
    <Modal title={adminOverride ? "Set Account Password" : "Change My Password"} sheet="credentials" onClose={onClose}>
      <div className="space-y-3">
        {!adminOverride && (
          <div><label className={labelCls}>Current password</label>
            <input className={inputCls} type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        )}
        <div><label className={labelCls}>New password (min. 6 chars)</label>
          <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
        <div><label className={labelCls}>Confirm new password</label>
          <input className={inputCls} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {error && <p className="rounded-[3px] border border-coral-500/60 bg-coral-500/10 px-3 py-2 font-mono text-[10px] font-bold text-coral-600">{error}</p>}
      </div>
      <div className="mt-5 flex justify-end border-t border-line-300 pt-4">
        <button onClick={() => void submit()} className={saveBtnCls}>{adminOverride ? "Set password" : "Change password"}</button>
      </div>
    </Modal>
  );
}
