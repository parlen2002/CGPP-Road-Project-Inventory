/* Authentication screen — sign in, sign up (joins as Personnel), and
   admin-verified password reset. Live clock, live role matrix. */

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { useAuth, login, loginGuest, signup, requestReset, ensureAuthReady } from "../state/authStore";
import { DIVISIONS, NAME_PREFIXES } from "../data/auth";
import { statusOf, STATUS_META, STATUS_LABELS, fmtPesoM } from "../data/registry";
import { itemsOf } from "../data/catalogs";
import { inputCls, labelCls } from "../components/projectForms";
import { CatalogSelect } from "../components/CatalogSelect";
import { SearchSelect } from "../components/SearchSelect";
import { Seal } from "../components/icons";

type Mode = "signin" | "signup" | "forgot";

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Manila" });
  const date = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "2-digit", year: "numeric", timeZone: "Asia/Manila" });
  return (
    <div className="text-right leading-tight">
      <p className="font-mono text-[15px] font-semibold text-amber-400 tabular">{time} PHT</p>
      <p className="font-mono text-[8.5px] tracking-[0.18em] text-paper-300/50 uppercase">{date} · UTC+8</p>
    </div>
  );
}

/* Live budget status by project status — mirrors the geospatial console KPIs. */
function BudgetPanel() {
  const { records } = useStore();
  const total = records.reduce((s, r) => s + r.contractedAmount, 0);
  const byStatus = STATUS_LABELS.map((label) => {
    const rows = records.filter((r) => statusOf(r).label === label);
    return { label, meta: STATUS_META[label], count: rows.length, amount: rows.reduce((s, r) => s + r.contractedAmount, 0) };
  }).filter((s) => s.count > 0);
  return (
    <div className="mt-6">
      <p className="mb-2 font-mono text-[9px] font-bold tracking-[0.22em] text-paper-300/50 uppercase">Programmed budget · by status</p>
      <div className="overflow-hidden rounded-[3px] border border-ink-700 bg-ink-950/60 p-3.5">
        <p className="font-display text-[30px] leading-none font-bold text-paper-100">{fmtPesoM(total)}</p>
        <p className="mt-1 font-mono text-[8.5px] tracking-[0.16em] text-paper-300/40 uppercase">{records.length} project records</p>
        <div className="mt-3 space-y-2">
          {byStatus.map((s) => {
            const pct = total ? (s.amount / total) * 100 : 0;
            return (
              <div key={s.label}>
                <div className="mb-0.5 flex items-center justify-between font-mono text-[8.5px] tracking-wider uppercase">
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: s.meta.color }}>
                    <i className="h-1.5 w-1.5 rounded-full" style={{ background: s.meta.color }} />{s.label} · {s.count}
                  </span>
                  <span className="text-paper-300/60 tabular">{fmtPesoM(s.amount)}</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.meta.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 font-mono text-[8.5px] tracking-wider text-paper-300/40 uppercase">
        Live from the project ledger · WGS 84 · EPSG 4326
      </p>
    </div>
  );
}

export default function AuthScreen() {
  const { catalogItems } = useStore();
  const { roles, ready } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void ensureAuthReady(); }, []);

  /* sign in */
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  /* sign up */
  const [su, setSu] = useState({
    prefix: "Engr.", firstName: "", middleName: "", lastName: "",
    email: "", password: "", confirm: "",
    division: DIVISIONS[0].name, position: "",
  });
  const [suDone, setSuDone] = useState("");

  /* forgot */
  const [fpEmail, setFpEmail] = useState("");
  const [fpReason, setFpReason] = useState("");
  const [fpDone, setFpDone] = useState("");

  const prefixOptions = useMemo(() => {
    const o = itemsOf(catalogItems, "prefixes").map((p) => p.value);
    return o.length ? o : [...NAME_PREFIXES];
  }, [catalogItems]);
  const positionOptions = useMemo(() => itemsOf(catalogItems, "positions").map((p) => p.value), [catalogItems]);
  const divisionCode = (name: string) =>
    itemsOf(catalogItems, "divisions").find((d) => d.value === name)?.code ?? DIVISIONS.find((d) => d.name === name)?.code ?? "";

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await login(email, pw);
      if (!r.ok) setError(r.error ?? "Sign-in failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed — please retry.");
    } finally {
      setBusy(false);
    }
  };

  const doSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    if (su.password !== su.confirm) { setBusy(false); setError("Passwords do not match."); return; }
    const r = await signup({
      prefix: su.prefix, firstName: su.firstName, middleName: su.middleName, lastName: su.lastName,
      email: su.email, password: su.password,
      division: su.division, divisionCode: divisionCode(su.division),
      position: su.position || positionOptions[0] || "Project Engineer",
      prc: "", phone: "",
    });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Registration failed."); return; }
    setSuDone(r.id ?? "");
    setSu({ prefix: "Engr.", firstName: "", middleName: "", lastName: "", email: "", password: "", confirm: "", division: DIVISIONS[0].name, position: "" });
  };

  const doForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = requestReset(fpEmail, fpReason);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Could not submit request."); return; }
    setFpDone(r.id ?? "");
  };

  const tabBtn = (m: Mode, label: string) => (
    <button onClick={() => { setMode(m); setError(""); }}
      className={`flex-1 cursor-pointer rounded-t-[3px] border-2 border-b-0 px-3 py-2.5 font-mono text-[10px] font-bold tracking-[0.16em] uppercase transition-colors ${
        mode === m ? "border-ink-800 bg-paper-100 text-ink-900" : "border-transparent text-text-400 hover:text-ink-900"
      }`}>
      {label}
    </button>
  );

  return (
    <div className="app-shell bg-grid-dark relative flex h-screen items-center justify-center overflow-y-auto bg-ink-950 p-6">
      {/* ambient contour lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.1]" preserveAspectRatio="none" viewBox="0 0 1200 800">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M-40 ${120 + i * 105} C 260 ${40 + i * 105}, 520 ${200 + i * 105}, 1240 ${80 + i * 105}`} fill="none" stroke="#3f6350" strokeWidth="1.2" />
        ))}
      </svg>

      <div className="anim-fade-up relative z-10 grid w-full max-w-4xl gap-6 lg:grid-cols-[1fr_380px]">
        {/* left — identity + role matrix */}
        <div className="hidden flex-col justify-between rounded-[4px] border-2 border-ink-700 bg-ink-900/70 p-7 backdrop-blur lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[3px] border-2 border-amber-500 bg-ink-950 text-amber-400">
                <Seal size={32} />
              </span>
              <div>
                <p className="font-mono text-[9px] tracking-[0.28em] text-amber-400/90 uppercase">Office of the City Engineer</p>
                <h1 className="font-display text-[34px] leading-none font-bold tracking-wide text-paper-100 uppercase">
                  Road Project<br />Inventory System
                </h1>
              </div>
            </div>
            <p className="mt-5 max-w-md font-mono text-[10.5px] leading-relaxed tracking-wider text-paper-300/60 uppercase">
              City of Puerto Princesa · Django 6.1 + PostGIS 3.5 · 21-field project registry,
              barangay-based locations, lot &amp; ROW analysis, A4 print sheets.
            </p>

            <BudgetPanel />
          </div>
          <LiveClock />
        </div>

        {/* right — form card */}
        <div className="rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl">
          <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-4">
            <div>
              <p className="font-mono text-[8.5px] tracking-[0.24em] text-amber-400 uppercase">secure console · EPSG 4326</p>
              <h2 className="font-display mt-0.5 text-[26px] leading-none font-bold tracking-wide text-paper-100 uppercase">
                {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
              </h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-[3px] border-2 border-amber-500 bg-ink-950 text-amber-400 lg:hidden">
              <Seal size={26} />
            </span>
          </div>

          <div className="flex bg-paper-200/80 px-2 pt-2">
            {tabBtn("signin", "Sign in")}
            {tabBtn("signup", "Sign up")}
            {tabBtn("forgot", "Reset")}
          </div>

          <div className="p-5">
            {!ready && (
              <p className="mb-3 rounded-[3px] border border-line-300 bg-paper-200/70 px-3 py-2 font-mono text-[9.5px] tracking-wider text-text-400 uppercase">
                Establishing secure session…
              </p>
            )}
            {error && (
              <p className="mb-3 rounded-[3px] border border-coral-500/60 bg-coral-500/10 px-3 py-2 font-mono text-[10px] font-bold text-coral-600">{error}</p>
            )}

            {mode === "signin" && (
              <form onSubmit={doSignIn} className="space-y-3">
                <div>
                  <label className={labelCls}>Official email</label>
                  <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@oce.puertoprincesa.gov.ph" />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input className={inputCls} type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
                </div>
                <button disabled={busy} type="submit"
                  className="w-full cursor-pointer rounded-[3px] bg-ink-900 py-3 font-mono text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase transition-all hover:bg-ink-800 hover:shadow-[0_10px_24px_rgba(12,25,19,0.45)] disabled:opacity-50">
                  {busy ? "Verifying…" : "Enter console"}
                </button>
                <button type="button" onClick={loginGuest}
                  className="w-full cursor-pointer rounded-[3px] border-2 border-dashed border-line-400 py-2.5 font-mono text-[10px] font-bold tracking-[0.16em] text-text-600 uppercase transition-colors hover:border-teal-500 hover:text-teal-500">
                  Continue as guest · read-only
                </button>
                <p className="rounded-[3px] border border-line-300 bg-paper-200/70 px-3 py-2 font-mono text-[9.5px] leading-relaxed text-text-600">
                  <b className="text-ink-900">Demo accounts</b> — admin <code>admin@oce.puertoprincesa.gov.ph</code> / <code>admin123</code> ·
                  executive <code>city.engineer@oce…</code> / <code>oce2026</code> · encoder/personnel <code>demo123</code>
                </p>
              </form>
            )}

            {mode === "signup" && suDone && (
              <div className="rounded-[3px] border border-pine-500/60 bg-pine-500/10 px-3 py-3">
                <p className="font-mono text-[10.5px] font-bold text-pine-600">Signup {suDone} submitted for verification.</p>
                <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-text-600">
                  A Program Administrator must confirm your account and assign a role before you can sign in. You will be
                  notified once it is activated.
                </p>
                <button type="button" onClick={() => { setSuDone(""); setMode("signin"); }}
                  className="mt-2 cursor-pointer rounded-[3px] bg-ink-900 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-amber-400 uppercase transition-colors hover:bg-ink-800">
                  Back to sign in
                </button>
              </div>
            )}

            {mode === "signup" && !suDone && (
              <form onSubmit={doSignUp} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Prefix</label>
                    <SearchSelect value={su.prefix} onChange={(v) => setSu({ ...su, prefix: v as string })}
                      options={prefixOptions.map((p) => ({ value: p, label: p }))} placeholder="— none —" />
                  </div>
                  <div>
                    <label className={labelCls}>First name *</label>
                    <input className={inputCls} required value={su.firstName} onChange={(e) => setSu({ ...su, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Middle name</label>
                    <input className={inputCls} value={su.middleName} onChange={(e) => setSu({ ...su, middleName: e.target.value })} placeholder="shown as initial" />
                  </div>
                  <div>
                    <label className={labelCls}>Surname *</label>
                    <input className={inputCls} required value={su.lastName} onChange={(e) => setSu({ ...su, lastName: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Official email *</label>
                    <input className={inputCls} type="email" required value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} placeholder="you@oce.puertoprincesa.gov.ph" />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <input className={inputCls} type="password" required value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} placeholder="min. 6 chars" />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm *</label>
                    <input className={inputCls} type="password" required value={su.confirm} onChange={(e) => setSu({ ...su, confirm: e.target.value })} placeholder="repeat password" />
                  </div>
                  <div>
                    <label className={labelCls}>Division *</label>
                    <CatalogSelect group="divisions" withCodes fallback={DIVISIONS.map((d) => d.name)} value={su.division} onChange={(v) => setSu({ ...su, division: v })} />
                    <p className="mt-1 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">Code {divisionCode(su.division) || "—"} stored on profile</p>
                  </div>
                  <div>
                    <label className={labelCls}>Position *</label>
                    <CatalogSelect group="positions" fallback={positionOptions.length ? positionOptions : ["Project Engineer"]} value={su.position} onChange={(v) => setSu({ ...su, position: v })} placeholder="— select position —" />
                  </div>
                </div>
                <button disabled={busy} type="submit"
                  className="w-full cursor-pointer rounded-[3px] bg-ink-900 py-3 font-mono text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:opacity-50">
                  {busy ? "Creating account…" : "Register — joins as Personnel"}
                </button>
                <p className="rounded-[3px] border border-line-300 bg-paper-200/70 px-3 py-2 font-mono text-[9px] leading-relaxed text-text-600">
                  Your signup is held for a Program Administrator to verify and assign a role. Once approved, it appears on
                  the Personnel Board and in User Accounts, and you can sign in.
                </p>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={doForgot} className="space-y-3">
                {fpDone ? (
                  <div className="rounded-[3px] border border-pine-500/60 bg-pine-500/10 px-3 py-3">
                    <p className="font-mono text-[10.5px] font-bold text-pine-600">Request {fpDone} submitted.</p>
                    <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-text-600">
                      A Program Administrator must verify the request and issue a temporary password. You will be able to
                      sign in with it and then change your password.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className={labelCls}>Account email</label>
                      <input className={inputCls} type="email" required value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@oce.puertoprincesa.gov.ph" />
                    </div>
                    <div>
                      <label className={labelCls}>Reason for reset</label>
                      <textarea rows={3} className={inputCls} value={fpReason} onChange={(e) => setFpReason(e.target.value)} placeholder="e.g. Forgot password after field assignment…" />
                    </div>
                    <button disabled={busy} type="submit"
                      className="w-full cursor-pointer rounded-[3px] bg-ink-900 py-3 font-mono text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase transition-all hover:bg-ink-800 disabled:opacity-50">
                      {busy ? "Submitting…" : "Request admin verification"}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
