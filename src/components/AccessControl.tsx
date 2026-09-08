/* Access control console — Roles & Permissions + User Accounts.
   User accounts ARE the personnel dataset (one table), so this panel and the
   Personnel Board tab always show the identical rows. */

import { useMemo, useState } from "react";
import { useStore, updateRoleCaps, addRole, deleteRole } from "../state/store";
import { useAuth, setPersonRole, deletePerson, verifyPerson, denyPerson } from "../state/authStore";
import { CAP_KEYS, type Capability, type RoleDef } from "../data/auth";
import type { Person } from "../data/registry";
import { toast } from "./toast";
import ConfirmDialog from "./confirm";
import { IconClose, IconPlus, IconTrash, IconEdit, IconLock, IconPalette } from "./icons";
import { PersonForm, ChangePasswordForm } from "./profileForms";
import {
  useUiPrefs, setPrefs, DISPLAY_FONTS, BODY_FONTS, FONT_SCALES, THEMES,
} from "../state/uiPrefs";

const PALETTE = ["#f0a32b", "#1ea899", "#de5a36", "#6f93cf", "#2f9a70", "#ef7450", "#8a6d3b", "#4a70b0"];

/* one pending signup — admin assigns the role, then confirms or denies */
function VerifyRow({ person }: { person: Person }) {
  const { roles } = useAuth();
  const [role, setRole] = useState("personnel");
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-ink-900">{person.name}</p>
        <p className="font-mono text-[9px] text-text-400">
          {person.email} · {person.divisionCode ? `${person.divisionCode} · ` : ""}{person.division} · {person.position}
        </p>
      </div>
      <label className="flex items-center gap-2">
        <span className="font-mono text-[8.5px] font-bold tracking-[0.14em] text-text-400 uppercase">Assign role</span>
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="cursor-pointer rounded-[3px] border border-line-400 bg-white px-2 py-1.5 font-mono text-[10.5px] font-bold text-ink-900 focus:border-amber-600 focus:outline-none">
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <div className="flex gap-1.5">
        <button onClick={() => verifyPerson(person.id, role)}
          className="cursor-pointer rounded-[3px] bg-pine-600 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-paper-100 uppercase transition-colors hover:bg-pine-500">
          Verify & activate
        </button>
        <button onClick={() => denyPerson(person.id)}
          className="cursor-pointer rounded-[3px] border border-coral-500 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-coral-600 uppercase transition-colors hover:bg-coral-500 hover:text-paper-100">
          Deny
        </button>
      </div>
    </div>
  );
}

export default function AccessControl({ onClose }: { onClose: () => void }) {
  const { roles, users, user: me } = useAuth();
  const prefs = useUiPrefs();
  const [tab, setTab] = useState<"roles" | "users" | "theme">("roles");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [delRole, setDelRole] = useState<RoleDef | null>(null);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [delPerson, setDelPerson] = useState<Person | null>(null);

  const toggleCap = (r: RoleDef, key: keyof Capability) => {
    const next = { ...r.caps, [key]: !r.caps[key] };
    updateRoleCaps(r.id, next);
    toast(r.label, "updated", `${CAP_KEYS.find((c) => c.key === key)?.label} → ${next[key] ? "granted" : "revoked"}`);
  };

  const commitAdd = () => {
    const color = PALETTE[roles.length % PALETTE.length];
    const res = addRole(newName, color);
    if (!res.ok) { toast("Role not created", "info", res.error); return; }
    toast(newName.trim(), "saved", "custom role added — set its permissions");
    setNewName("");
    setAdding(false);
  };

  const assignedCount = (roleId: string) => users.filter((u) => u.role === roleId).length;
  const linkedRecords = useMemo(() => {
    const { records } = { records: [] as { inchargeId: string }[] };
    void records;
    return (_id: string) => 0;
  }, []);

  return (
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-950/70 p-4" onClick={onClose}>
      <div className="anim-fade-up relative my-6 w-full max-w-4xl rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">access control · program admin</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">Roles, Permissions & Accounts</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1.5 text-paper-300/60 transition-colors hover:text-amber-400"><IconClose size={18} /></button>
        </div>

        <div className="flex gap-1 border-b border-line-300 bg-paper-200/70 px-5 pt-3">
          {([["roles", "Roles & Permissions"], ["users", `User Accounts · ${users.length}`], ["theme", "Look & Feel"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`cursor-pointer rounded-t-[3px] border-2 border-b-0 px-4 py-2 font-mono text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
                tab === id ? "border-ink-800 bg-paper-100 text-ink-900" : "border-transparent text-text-400 hover:text-text-600"}`}>
              {id === "theme" ? <span className="flex items-center gap-1.5"><IconPalette size={13} />{label}</span> : label}
            </button>
          ))}
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          {tab === "roles" && (<>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-900 uppercase">Role definitions · {roles.length}</p>
              {!adding ? (
                <button onClick={() => setAdding(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-ink-900 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-colors hover:bg-ink-800">
                  <IconPlus size={12} /> New role
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") setAdding(false); }}
                    placeholder="Role name…"
                    className="w-40 rounded-[3px] border border-amber-600 bg-white px-2 py-1.5 font-mono text-[10.5px] text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                  <button onClick={commitAdd} className="cursor-pointer rounded-[3px] bg-pine-600 p-1.5 text-paper-100 hover:bg-pine-500"><IconPlus size={12} /></button>
                  <button onClick={() => setAdding(false)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 hover:text-coral-600"><IconClose size={12} /></button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[4px] border border-line-300">
              <table className="w-full border-collapse">
                <thead className="bg-ink-900 text-paper-300">
                  <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                    <th>Role</th>
                    {CAP_KEYS.map((c) => <th key={c.key} className="!text-center">{c.label}</th>)}
                    <th className="!text-right">Accounts</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-300">
                  {roles.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-paper-200/60">
                      <td className="px-3 py-2.5">
                        <p className="flex items-center gap-2 font-mono text-[11px] font-bold" style={{ color: r.color }}>
                          <i className="h-2 w-2 rounded-full" style={{ background: r.color }} />{r.label}
                          {r.builtin && <span className="rounded-[2px] bg-ink-900/8 px-1 font-mono text-[7.5px] text-text-400">CORE</span>}
                        </p>
                        <p className="mt-0.5 max-w-[220px] text-[9.5px] leading-snug text-text-400">{r.desc}</p>
                      </td>
                      {CAP_KEYS.map((c) => (
                        <td key={c.key} className="px-1 py-2.5 text-center">
                          <button onClick={() => toggleCap(r, c.key)}
                            className={`mx-auto grid h-6 w-6 cursor-pointer place-items-center rounded-[3px] border transition-all ${
                              r.caps[c.key] ? "border-pine-600 bg-pine-600 text-paper-100" : "border-line-400 bg-white text-line-400 hover:border-pine-500"
                            }`}
                            title={`${c.label} — click to ${r.caps[c.key] ? "revoke" : "grant"}`}>
                            {r.caps[c.key] ? "✓" : "—"}
                          </button>
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] font-bold text-ink-900">{assignedCount(r.id)}</td>
                      <td className="px-2 py-2.5 text-right">
                        {!r.builtin && (
                          <button onClick={() => (assignedCount(r.id) === 0 ? setDelRole(r) : toast("Role in use", "info", "reassign those accounts first"))}
                            className="cursor-pointer p-1 text-text-400 transition-colors hover:text-coral-600" title="Delete custom role">
                            <IconTrash size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-[9px] tracking-wider text-text-400 uppercase">
              Click any cell to grant / revoke · new signups join as <b className="text-pine-600">Personnel</b>
            </p>
          </>)}

          {tab === "users" && (
            <div>
              <p className="mb-2 font-mono text-[9.5px] leading-relaxed tracking-wider text-text-400 uppercase">
                One dataset — these rows are the same accounts shown on the Personnel Board. Create an account and the
                person appears in both places instantly. New signups wait here for verification.
              </p>

              {/* pending signups awaiting admin verification */}
              {users.some((u) => u.verified === false) && (
                <div className="mb-4 overflow-hidden rounded-[4px] border-2 border-amber-500/70">
                  <div className="flex items-center gap-2 bg-amber-500/15 px-3 py-2">
                    <span className="dot-live h-2 w-2 rounded-full bg-amber-500" />
                    <p className="font-mono text-[9.5px] font-bold tracking-[0.16em] text-amber-600 uppercase">
                      Pending verification · {users.filter((u) => u.verified === false).length}
                    </p>
                  </div>
                  <div className="divide-y divide-line-300 bg-paper-100">
                    {users.filter((u) => u.verified === false).map((u) => (
                      <VerifyRow key={u.id} person={u} />
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-[4px] border border-line-300">
                <table className="w-full border-collapse">
                  <thead className="bg-ink-900 text-paper-300">
                    <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                      <th>Account</th><th>Division</th><th>Position</th><th>Role</th><th className="!text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-300">
                    {users.filter((u) => u.verified !== false).map((u) => {
                      const def = roles.find((r) => r.id === u.role);
                      return (
                        <tr key={u.id} className="transition-colors hover:bg-paper-200/60">
                          <td className="px-3 py-2">
                            <p className="text-[12px] font-semibold text-ink-900">
                              {u.name}
                              {u.id === me?.id && <span className="ml-1.5 rounded-[2px] bg-amber-500/20 px-1 font-mono text-[8px] font-bold text-amber-600">YOU</span>}
                            </p>
                            <p className="font-mono text-[9px] text-text-400">{u.email}</p>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-text-600">{u.divisionCode ? `${u.divisionCode} · ` : ""}{u.division}</td>
                          <td className="px-3 py-2 text-[11px] text-text-600">{u.position}</td>
                          <td className="px-3 py-2">
                            <select value={u.role} onChange={(e) => { setPersonRole(u.id, e.target.value); toast(u.name, "updated", `role → ${roles.find((r) => r.id === e.target.value)?.label ?? e.target.value}`); }}
                              className="cursor-pointer rounded-[3px] border border-line-400 bg-white px-2 py-1.5 font-mono text-[10.5px] font-bold text-ink-900 focus:border-amber-600 focus:outline-none"
                              style={{ color: def?.color }}>
                              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setEditPerson(u)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600" title="Edit account">
                                <IconEdit size={13} />
                              </button>
                              <button onClick={() => setPwFor(u.id)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-teal-500 hover:text-teal-500" title="Set password">
                                <IconLock size={13} />
                              </button>
                              <button onClick={() => setDelPerson(u)}
                                className={`rounded-[3px] border p-1.5 transition-colors ${u.id === me?.id ? "cursor-not-allowed border-line-300 text-line-400" : "cursor-pointer border-line-400 text-text-400 hover:border-coral-500 hover:text-coral-600"}`}
                                title={u.id === me?.id ? "Cannot delete your own account" : "Delete account"}>
                                <IconTrash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "theme" && (
            <div className="space-y-6">
              {/* theme mode */}
              <div>
                <p className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.18em] text-ink-900 uppercase">Console theme · {THEMES.length} palettes</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => { setPrefs({ mode: t.id }); toast(`${t.label} theme`, "updated", "applied to the console"); }}
                      className={`cursor-pointer rounded-[4px] border-2 p-3 text-left transition-all hover:-translate-y-0.5 ${
                        prefs.mode === t.id ? "border-amber-500 shadow-[0_8px_20px_rgba(240,163,43,0.2)]" : "border-line-300 hover:border-ink-600"}`}>
                      <div className="flex gap-1">
                        {t.sw.map((c, i) => <span key={i} className="h-6 flex-1 rounded-[2px] border border-ink-900/10" style={{ background: c }} />)}
                      </div>
                      <p className="mt-2.5 font-display text-lg leading-none font-bold text-ink-900 uppercase">{t.label}</p>
                      <p className="mt-1 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">{t.desc}</p>
                      {prefs.mode === t.id && <p className="mt-1.5 font-mono text-[8.5px] font-bold tracking-wider text-amber-600 uppercase">● Active</p>}
                    </button>
                  ))}
                </div>
              </div>

              {/* fonts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.18em] text-ink-900 uppercase">Display face — headings</p>
                  <div className="space-y-1.5">
                    {DISPLAY_FONTS.map((f) => (
                      <button key={f.value} onClick={() => { setPrefs({ displayFont: f.value }); toast(f.label, "updated", "display face changed"); }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-[3px] border px-3 py-2 transition-colors ${
                          prefs.displayFont === f.value ? "border-amber-500 bg-amber-500/10" : "border-line-300 hover:border-ink-600"}`}>
                        <span style={{ fontFamily: f.value }} className="text-lg font-bold text-ink-900">Road Project Inventory</span>
                        {prefs.displayFont === f.value && <span className="font-mono text-[8.5px] font-bold text-amber-600 uppercase">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.18em] text-ink-900 uppercase">Body face — labels & text</p>
                  <div className="space-y-1.5">
                    {BODY_FONTS.map((f) => (
                      <button key={f.value} onClick={() => { setPrefs({ bodyFont: f.value }); toast(f.label, "updated", "body face changed"); }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-[3px] border px-3 py-2 transition-colors ${
                          prefs.bodyFont === f.value ? "border-amber-500 bg-amber-500/10" : "border-line-300 hover:border-ink-600"}`}>
                        <span style={{ fontFamily: f.value }} className="text-[13px] font-semibold text-ink-900">Office of the City Engineer</span>
                        {prefs.bodyFont === f.value && <span className="font-mono text-[8.5px] font-bold text-amber-600 uppercase">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* scale */}
              <div>
                <p className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.18em] text-ink-900 uppercase">Interface size</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FONT_SCALES.map((s) => (
                    <button key={s.value} onClick={() => { setPrefs({ fontScale: s.value }); toast(s.label, "updated", "interface size changed"); }}
                      className={`cursor-pointer rounded-[3px] border px-3 py-2.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors ${
                        prefs.fontScale === s.value ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-line-300 text-text-600 hover:border-ink-600"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="rounded-[3px] border border-line-300 bg-paper-200/70 px-3 py-2.5 font-mono text-[9px] leading-relaxed tracking-wider text-text-600 uppercase">
                These settings apply to the on-screen console only and are saved per browser. Printed sheets (A4
                ledger, inventory &amp; project detail) always use the fixed drafting style, so paper output is never affected.
              </p>
            </div>
          )}
        </div>
      </div>

      {delRole && (
        <ConfirmDialog
          title="Delete role"
          sheet="role_definitions · DELETE"
          confirmLabel="Delete role"
          message={<p>The custom role <b className="text-ink-900">{delRole.label}</b> will be permanently removed. No accounts are currently assigned to it.</p>}
          onConfirm={() => {
            const res = deleteRole(delRole.id);
            if (res.ok) toast(delRole.label, "deleted", "custom role removed");
            else toast("Role not deleted", "info", res.error);
          }}
          onClose={() => setDelRole(null)}
        />
      )}

      {editPerson && <PersonForm editing={editPerson} onClose={() => setEditPerson(null)} />}
      {pwFor && <ChangePasswordForm userId={pwFor} adminOverride onClose={() => setPwFor(null)} />}

      {delPerson && (
        <ConfirmDialog
          title="Delete account"
          sheet="personnel · DELETE"
          confirmLabel="Delete account"
          message={
            <p>
              <b className="text-ink-900">{delPerson.name}</b> will be removed from the personnel dataset — records they
              are in-charge of will be unlinked. This cannot be undone.
            </p>
          }
          onConfirm={() => {
            const res = deletePerson(delPerson.id);
            if (res.ok) toast(delPerson.name, "deleted", "account removed · records unlinked");
            else toast("Account not deleted", "info", res.error);
          }}
          onClose={() => setDelPerson(null)}
        />
      )}
    </div>
  );
}
