import { useEffect, useRef, useState } from "react";
import { Seal, IconUser, IconLogout, IconBell, IconGear } from "./icons";
import { useAuth, logout, approveReset, denyReset } from "../state/authStore";
import { toast } from "./toast";
import AccessControl from "./AccessControl";

function ResetPanel({ onClose }: { onClose: () => void }) {
  const { resets, user } = useAuth();
  const [issued, setIssued] = useState<Record<string, string>>({});
  const pending = resets.filter((r) => r.status === "pending");
  const handled = resets.filter((r) => r.status !== "pending");

  return (
    <div className="anim-fade-in fixed inset-0 z-[60] grid place-items-center bg-ink-950/70 p-4" onClick={onClose}>
      <div className="anim-fade-up w-full max-w-lg rounded-[4px] border-2 border-ink-800 bg-paper-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-ink-800 bg-ink-900 px-5 py-3.5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-amber-400 uppercase">admin verification</p>
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide text-paper-100 uppercase">Password Reset Requests</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer font-mono text-[11px] text-paper-300/60 hover:text-amber-400">✕</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          <p className="mb-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-ink-900 uppercase">Pending · {pending.length}</p>
          {pending.length === 0 && (
            <p className="rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[10px] text-text-400">No pending requests.</p>
          )}
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="rounded-[3px] border border-line-300 bg-white/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] font-bold text-ink-900">{r.id} · {r.email}</p>
                  <span className="rounded-[3px] bg-amber-500/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-amber-600 uppercase">pending</span>
                </div>
                <p className="mt-1 font-mono text-[9.5px] text-text-600">“{r.reason}” · {new Date(r.requestedAt).toLocaleString("en-PH")}</p>
                {issued[r.id] ? (
                  <p className="mt-2 rounded-[3px] border border-pine-500/60 bg-pine-500/10 px-3 py-2 font-mono text-[10.5px] font-bold text-pine-600">
                    Temp password issued: <code className="text-ink-900">{issued[r.id]}</code> — relay to the user.
                  </p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => {
                      const res = approveReset(r.id, user?.name ?? "admin");
                      if (res) { setIssued((s) => ({ ...s, [r.id]: res.temp })); toast(`${r.id} approved`, "updated", "temporary password issued"); }
                    }}
                      className="cursor-pointer rounded-[3px] bg-pine-600 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-wider text-paper-100 uppercase transition-colors hover:bg-pine-500">
                      Approve & issue temp
                    </button>
                    <button onClick={() => { denyReset(r.id, user?.name ?? "admin"); toast(`${r.id} denied`, "deleted"); }}
                      className="cursor-pointer rounded-[3px] border border-coral-500 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-wider text-coral-600 uppercase transition-colors hover:bg-coral-500 hover:text-paper-100">
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {handled.length > 0 && (<>
            <p className="mt-4 mb-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-text-400 uppercase">Handled · {handled.length}</p>
            <div className="space-y-1.5">
              {handled.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-[3px] border border-line-300/60 bg-paper-200/50 px-3 py-2">
                  <p className="font-mono text-[9.5px] text-text-600">{r.id} · {r.email}</p>
                  <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase ${r.status === "approved" ? "bg-pine-500/15 text-pine-600" : "bg-coral-500/15 text-coral-600"}`}>
                    {r.status}{r.tempPassword ? ` · ${r.tempPassword}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const { user, roleDef, can, pendingResets } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [resetOpen, setResetOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  /* auto-notify the admin when a new password reset request lands */
  const prevPending = useRef(pendingResets);
  useEffect(() => {
    if (pendingResets > prevPending.current) {
      toast("Password reset requested", "info", `${pendingResets} pending — open the bell to verify`);
    }
    prevPending.current = pendingResets;
  }, [pendingResets]);

  /* close the account menu on outside click / Escape */
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const time = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Manila" });
  const date = now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Manila" });

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b-2 border-ink-800 bg-ink-900 px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[3px] border-2 border-amber-500 bg-ink-950 text-amber-400">
          <Seal size={24} />
        </span>
        <div className="hidden leading-tight md:block">
          <p className="font-display text-[17px] font-bold tracking-[0.08em] text-paper-100 uppercase">Road Project Inventory System</p>
          <p className="font-mono text-[8.5px] tracking-[0.24em] text-amber-400/90 uppercase">Office of the City Engineer · Puerto Princesa City</p>
        </div>
      </div>

      <span className="ml-auto" />

      {/* notification bell — password reset requests (admin only) */}
      {can.users && (
        <button onClick={() => setResetOpen(true)}
          className={`relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border transition-all hover:scale-105 ${
            pendingResets > 0
              ? "border-amber-500/70 bg-amber-500/15 text-amber-400 shadow-[0_0_14px_rgba(240,163,43,0.25)]"
              : "border-ink-600 bg-ink-950/70 text-paper-300/70 hover:border-amber-500/50 hover:text-amber-400"
          }`}
          title={pendingResets > 0 ? `${pendingResets} password reset request${pendingResets > 1 ? "s" : ""} awaiting verification` : "Notifications"}>
          <IconBell size={16} />
          {pendingResets > 0 && (
            <>
              <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-ink-900 bg-coral-500 px-1 font-mono text-[8.5px] font-bold text-paper-100">{pendingResets}</span>
              <span className="ring-ping absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-coral-400" aria-hidden />
            </>
          )}
        </button>
      )}

      <div className="relative shrink-0" ref={menuRef}>
        <button onClick={() => setMenuOpen((o) => !o)} title="Account menu"
          className="flex cursor-pointer items-center gap-2 rounded-[3px] border border-ink-600 bg-ink-950/70 py-1.5 pr-2 pl-2 transition-colors hover:border-amber-500/50">
          <span className="grid h-6 w-6 place-items-center rounded-[3px] text-paper-100" style={{ background: roleDef.color }}>
            <IconUser size={14} />
          </span>
          <span className="hidden max-w-[140px] truncate font-mono text-[9.5px] font-semibold text-paper-100 md:block">
            {user?.name ?? "Guest Viewer"}
          </span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
            className={`text-paper-300/60 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div className="anim-fade-up absolute right-0 top-full z-[70] mt-2 w-60 overflow-hidden rounded-[4px] border-2 border-ink-700 bg-ink-900 shadow-[0_18px_40px_rgba(7,17,12,0.55)]">
            {/* sign out at the top */}
            <button onClick={() => { setMenuOpen(false); logout(); }}
              className="flex w-full cursor-pointer items-center gap-2.5 border-b border-ink-700 bg-coral-500/10 px-4 py-3 text-left font-mono text-[10px] font-bold tracking-[0.16em] text-coral-400 uppercase transition-colors hover:bg-coral-500/20">
              <IconLogout size={14} /> Sign out
            </button>
            <div className="px-4 py-3">
              <p className="font-display text-lg leading-tight font-bold text-paper-100">{user?.name ?? "Guest Viewer"}</p>
              <p className="mt-0.5 font-mono text-[8.5px] font-bold tracking-[0.16em] uppercase" style={{ color: roleDef.color }}>{roleDef.label}</p>
              <div className="mt-2.5 space-y-1.5 border-t border-ink-700 pt-2.5">
                <p className="flex justify-between font-mono text-[9px] text-paper-300/60"><span>Division</span><span className="text-paper-100">{user?.divisionCode || user?.division || "—"}</span></p>
                <p className="flex justify-between gap-3 font-mono text-[9px] text-paper-300/60"><span>Position</span><span className="truncate text-paper-100">{user?.position || "View-only"}</span></p>
                <p className="flex justify-between gap-3 font-mono text-[9px] text-paper-300/60"><span>Account</span><span className="truncate text-paper-100">{user?.id ?? "guest"}</span></p>
              </div>
            </div>
            {can.users && (
              <button onClick={() => { setMenuOpen(false); setAccessOpen(true); }}
                className="flex w-full cursor-pointer items-center gap-2.5 border-t border-ink-700 bg-ink-950/60 px-4 py-3 text-left font-mono text-[10px] font-bold tracking-[0.16em] text-amber-400 uppercase transition-colors hover:bg-ink-950">
                <IconGear size={14} /> Settings · roles & look
                {pendingResets > 0 && (
                  <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-coral-500 px-1 font-mono text-[8.5px] font-bold text-paper-100">{pendingResets}</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 rounded-[3px] border border-ink-600 bg-ink-950/70 px-2.5 py-1.5 xl:flex">
        <span className="dot-live h-2 w-2 rounded-full bg-pine-400" />
        <div className="leading-none">
          <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-pine-400 uppercase">PostGIS 3.5 · live</p>
          <p className="mt-0.5 font-mono text-[8.5px] tracking-[0.12em] text-paper-300/45 uppercase">rpis_db@10.11.4.2 · 4326</p>
        </div>
      </div>

      <div className="hidden shrink-0 text-right leading-tight lg:block">
        <p className="font-mono text-[13px] font-semibold text-amber-400 tabular">{time} PHT</p>
        <p className="font-mono text-[8.5px] tracking-[0.18em] text-paper-300/50 uppercase">{date} · UTC+8</p>
      </div>

      {resetOpen && can.users && <ResetPanel onClose={() => setResetOpen(false)} />}
      {accessOpen && can.users && <AccessControl onClose={() => setAccessOpen(false)} />}
    </header>
  );
}
