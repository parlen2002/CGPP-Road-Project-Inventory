/* Project registry — 21-field ledger, implementors, the unified personnel
   board, and the technical catalogs. Role-gated tabs & actions. */

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Reveal, CornerTicks, CountUp } from "../components/ui";
import {
  statusOf, STATUS_META, STATUS_LABELS, fmtPesoM, fmtDate, durationOf, typeAbbr,
  type ProjectRecord, type Contractor, type Person,
} from "../data/registry";
import { useStore, deleteRecord, deleteContractor } from "../state/store";
import { useAuth, deletePerson } from "../state/authStore";
import { ProjectForm } from "../components/projectForms";
import { ContractorForm, PersonForm, ChangePasswordForm } from "../components/profileForms";
import CatalogManager from "../components/CatalogManager";
import ProjectDrawer from "../components/ProjectDrawer";
import ConfirmDialog from "../components/confirm";
import { toast } from "../components/toast";
import { IconPlus, IconDownload, IconSearch, IconPin, IconEdit, IconTrash, IconPrinter, IconLock } from "../components/icons";
import { PrintPortal, LedgerSheet, usePrintSession } from "../print/PrintSheets";

type Tab = "ledger" | "implementors" | "personnel" | "catalogs";

export default function Projects({ onLocate, onOpenRoad, onOpenCadastre }: {
  onLocate: (point: [number, number], zoom?: number) => void;
  onOpenRoad: (roadId: string) => void;
  onOpenCadastre: (centerlineId?: string) => void;
}) {
  const { records, contractors, personnel, catalogItems } = useStore();
  const { can, role, user, roles } = useAuth();
  const [tab, setTab] = useState<Tab>("ledger");
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<"All" | (typeof STATUS_LABELS)[number]>("All");
  const [typeF, setTypeF] = useState("All");
  const [modeF, setModeF] = useState("All");
  const [implF, setImplF] = useState("All");
  const [modal, setModal] = useState<null | { kind: "project"; editing: ProjectRecord | null }>(null);
  const [ctrModal, setCtrModal] = useState<null | { editing: Contractor | null }>(null);
  const [personModal, setPersonModal] = useState<null | { editing: Person | null; own: boolean }>(null);
  const [pwFor, setPwFor] = useState<null | { id: string; own: boolean }>(null);
  const [del, setDel] = useState<null | { kind: "record" | "contractor" | "person"; id: string }>(null);
  const [printing, setPrinting] = useState(false);
  usePrintSession(printing, () => setPrinting(false));

  const showRegistryTabs = role !== "guest";
  const showCatalogs = can.catalog;
  const canManageProfiles = role === "admin" || role === "encoder" || role === "executive";

  useEffect(() => {
    if (!showRegistryTabs && tab !== "ledger") setTab("ledger");
    else if (!showCatalogs && tab === "catalogs") setTab("ledger");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const impl = contractors.find((c) => c.id === r.implementorId)?.name ?? "";
      return (
        (statusF === "All" || statusOf(r).label === statusF) &&
        (typeF === "All" || r.type === typeF) &&
        (modeF === "All" || r.mode === modeF) &&
        (implF === "All" || r.implementorId === implF) &&
        (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.folderNo.toLowerCase().includes(q) || impl.toLowerCase().includes(q))
      );
    });
  }, [records, contractors, search, statusF, typeF, modeF, implF]);

  const [openId, setOpenId] = useState<string | null>(null);
  const open = records.find((r) => r.id === openId) ?? null;

  const totalContracted = records.reduce((s, r) => s + r.contractedAmount, 0);
  const totalActual = records.reduce((s, r) => s + r.actualAmount, 0);
  const weightedPct = totalContracted ? Math.round(records.reduce((s, r) => s + r.percent * r.contractedAmount, 0) / totalContracted) : 0;

  const cName = (id: string) => contractors.find((c) => c.id === id)?.name ?? "—";
  const eName = (id: string) => personnel.find((p) => p.id === id)?.name ?? "—";
  const isOwn = (p: Person) => !!user && user.id === p.id;

  const exportCsv = () => {
    const head = "project_id,name,type,mode,fund,object_code,folder_no,implementor,incharge,barangays,linear_length,contracted,actual,bid_year,contracted_start,contracted_completion,actual_start,actual_completion,percent,status,notes";
    const rows = filtered.map((r) => [
      r.id, `"${r.name}"`, r.type, r.mode, `"${r.fund}"`, r.objectCode, r.folderNo,
      `"${cName(r.implementorId)}"`, `"${eName(r.inchargeId)}"`,
      `"${r.location.barangays.join("; ")}"`,
      r.linearLength, r.contractedAmount, r.actualAmount, r.bidYear,
      r.contractedStart, r.contractedCompletion, r.actualStart ?? "", r.actualCompletion ?? "",
      r.percent, statusOf(r).label, `"${(r.notes ?? "").replace(/"/g, "'")}"`,
    ].join(","));
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rpis_project_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const TabBtn = ({ id, label, count }: { id: Tab; label: string; count: number }) => (
    <button onClick={() => setTab(id)}
      className={`relative cursor-pointer px-4 py-3 font-display text-lg font-bold tracking-wider uppercase transition-colors sm:text-xl ${
        tab === id ? "bg-paper-100 text-ink-900" : "bg-ink-800 text-paper-300/60 hover:text-paper-100"
      }`}>
      {label}
      <span className={`ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${tab === id ? "bg-amber-500 text-ink-950" : "bg-ink-950 text-amber-400"}`}>{count}</span>
      {tab === id && <span className="absolute inset-x-0 top-0 h-[3px] bg-amber-500" />}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6">
      <PageHeader
        sheet="RPIS-PRJ-03"
        title="Project Registry"
        subtitle="The 21-field project ledger plus its FK registries. Implementors and the personnel board are one dataset with the user accounts — create an account and the person is instantly available as an in-charge."
      />

      {/* KPI strip */}
      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border-2 border-ink-800 bg-ink-800 sm:grid-cols-4">
          {[
            { k: "Registered projects", node: <CountUp value={records.length} />, s: "project_records rows" },
            { k: "Contracted total", node: <CountUp value={totalContracted / 1e6} decimals={1} prefix="₱" suffix="M" />, s: "approved appropriations" },
            { k: "Actual to date", node: <CountUp value={totalActual / 1e6} decimals={1} prefix="₱" suffix="M" />, s: `${Math.round((totalActual / (totalContracted || 1)) * 100)}% of contracted` },
            { k: "Weighted completion", node: <CountUp value={weightedPct} suffix="%" />, s: "by contracted value" },
          ].map((x) => (
            <div key={x.k} className="bg-ink-900 px-4 py-4 transition-colors hover:bg-ink-850">
              <p className="font-mono text-[9px] tracking-[0.2em] text-paper-300/50 uppercase">{x.k}</p>
              <p className="font-display mt-1.5 text-4xl leading-none font-bold text-paper-100">{x.node}</p>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-amber-400/80 uppercase">{x.s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* tabs */}
      <Reveal className="mt-6" delay={70}>
        <div className="flex flex-wrap overflow-hidden rounded-t-[4px] border-2 border-b-0 border-ink-800">
          <TabBtn id="ledger" label="Project Ledger" count={records.length} />
          {showRegistryTabs && <TabBtn id="implementors" label="Implementors" count={contractors.length} />}
          {showRegistryTabs && <TabBtn id="personnel" label="Personnel Board" count={personnel.length} />}
          {showCatalogs && <TabBtn id="catalogs" label="Technical Catalogs" count={catalogItems.length} />}
          {can.create && tab === "ledger" && (
            <button onClick={() => setModal({ kind: "project", editing: null })}
              className="ml-auto flex cursor-pointer items-center gap-2 self-stretch border-l-2 border-ink-800 bg-amber-500 px-4 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400 sm:px-6">
              <IconPlus size={14} /> Encode project
            </button>
          )}
          {canManageProfiles && tab === "implementors" && (
            <button onClick={() => setCtrModal({ editing: null })}
              className="ml-auto flex cursor-pointer items-center gap-2 self-stretch border-l-2 border-ink-800 bg-amber-500 px-4 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400 sm:px-6">
              <IconPlus size={14} /> Encode implementor
            </button>
          )}
          {(canManageProfiles || tab === "personnel") && tab === "personnel" && can.create && (
            <button onClick={() => setPersonModal({ editing: null, own: false })}
              className="ml-auto flex cursor-pointer items-center gap-2 self-stretch border-l-2 border-ink-800 bg-amber-500 px-4 font-mono text-[10px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400 sm:px-6">
              <IconPlus size={14} /> Encode account
            </button>
          )}
        </div>
      </Reveal>

      {/* ── LEDGER ── */}
      {tab === "ledger" && (
        <div className="anim-fade-in">
          <div className="relative flex flex-wrap items-center gap-2 rounded-b-[4px] border-2 border-t-0 border-ink-800 bg-paper-200/80 p-3">
            <div className="relative min-w-[200px] flex-1">
              <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, folder no., implementor…"
                className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["All", ...STATUS_LABELS] as const).map((s) => {
                const n = s === "All" ? records.length : records.filter((r) => statusOf(r).label === s).length;
                const m = s === "All" ? null : STATUS_META[s];
                return (
                  <button key={s} onClick={() => setStatusF(s)}
                    className={`cursor-pointer rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-all ${
                      statusF === s ? "border-ink-900 bg-ink-900 text-amber-400" : "border-line-400 text-text-600 hover:border-ink-800 hover:text-ink-900"
                    }`}>
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: m?.color ?? "#71826f" }} />
                    {s} <b className="opacity-70">{n}</b>
                  </button>
                );
              })}
            </div>
            <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
              <option value="All">All types</option>
              {Array.from(new Set(records.map((r) => r.type))).map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={modeF} onChange={(e) => setModeF(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
              {["All", "By Contract", "By Administration"].map((m) => <option key={m}>{m === "All" ? "Both modes" : m}</option>)}
            </select>
            <select value={implF} onChange={(e) => setImplF(e.target.value)} className="cursor-pointer rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 focus:border-amber-600 focus:outline-none">
              <option value="All">All implementors</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {can.print && (
              <button onClick={() => setPrinting(true)}
                className="flex cursor-pointer items-center gap-2 rounded-[3px] border-2 border-ink-800 px-3.5 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] text-ink-900 uppercase transition-all hover:bg-ink-900 hover:text-amber-400">
                <IconPrinter size={14} /> Print
              </button>
            )}
            {can.print && (
              <button onClick={exportCsv}
                className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800">
                <IconDownload size={13} /> CSV
              </button>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
            <div className="thick-scroll max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[1280px] border-collapse">
                <thead className="bg-ink-900 text-paper-300">
                  <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-ink-900 [&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9.5px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                    <th>Project / Folder</th><th>Type</th><th>Mode</th><th>Implementor</th><th>In-Charge</th>
                    <th>Location (Brgy)</th><th className="!text-right">Lin. (m)</th><th className="!text-right">Contracted</th>
                    <th className="!text-right">Actual</th><th>Status · %</th><th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-300">
                  {filtered.map((r) => {
                    const m = statusOf(r);
                    return (
                      <tr key={r.id} onClick={() => setOpenId(r.id)} className="group cursor-pointer transition-colors hover:bg-ink-900/[0.045]">
                        <td className="px-3 py-2.5">
                          <p className="font-mono text-[9px] font-bold tracking-wide text-teal-500">{r.id} · {r.folderNo}</p>
                          <p className="text-[12.5px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                        </td>
                        <td className="px-3 py-2.5"><span className="rounded-[3px] border border-ink-800/25 bg-ink-900/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider uppercase">{typeAbbr(r.type)}</span></td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-text-600 uppercase">{r.mode.replace("By ", "")}</td>
                        <td className="max-w-[170px] truncate px-3 py-2.5 text-[11.5px] text-text-600">{cName(r.implementorId)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-[11.5px] text-text-600">{eName(r.inchargeId)}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-text-600">{r.location.barangays.join(", ")}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11.5px] font-semibold text-ink-900 tabular">{r.linearLength.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11.5px] font-semibold text-ink-900 tabular">{fmtPesoM(r.contractedAmount)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[11px] text-text-600 tabular">{r.actualAmount ? fmtPesoM(r.actualAmount) : "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex w-32 items-center gap-2">
                            <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-ink-900/10">
                              <span className="block h-full rounded-full" style={{ width: `${r.percent}%`, background: m.color }} />
                            </span>
                            <span className="font-mono text-[9.5px] font-bold uppercase" style={{ color: m.color }}>{m.label.slice(0, 3)} {r.percent}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => onLocate([9.744, 118.741], 14)} title="Locate on map"
                              className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-teal-500 hover:text-teal-500">
                              <IconPin size={13} />
                            </button>
                            {can.update && (
                              <button onClick={() => setModal({ kind: "project", editing: r })} title="Edit"
                                className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600">
                                <IconEdit size={13} />
                              </button>
                            )}
                            {can.del && (
                              <button onClick={() => setDel({ kind: "record", id: r.id })} title="Delete (admin)"
                                className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:border-coral-500 hover:text-coral-600">
                                <IconTrash size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} className="px-4 py-10 text-center font-mono text-[12px] text-text-400">— 0 records match the current filters —</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line-300 bg-paper-200 px-4 py-2 font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">
              {filtered.length} of {records.length} records · click a row for the full record · draft edits save only on Save/Update
            </p>
          </div>
        </div>
      )}

      {/* ── IMPLEMENTORS ── */}
      {tab === "implementors" && showRegistryTabs && (
        <div className="anim-fade-in mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {contractors.map((c) => {
            const jobs = records.filter((r) => r.implementorId === c.id);
            const book = jobs.reduce((s, r) => s + r.contractedAmount, 0);
            return (
              <div key={c.id} className="group relative rounded-[4px] border border-line-300 bg-paper-100 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-800 hover:shadow-[0_14px_34px_rgba(12,25,19,0.14)]">
                <CornerTicks color="border-ink-800/0 group-hover:border-amber-500/70" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.18em] text-teal-500 uppercase">{c.id} · contractor profile</p>
                    <h3 className="font-display mt-1 text-2xl leading-tight font-bold text-ink-900 uppercase">{c.name}</h3>
                  </div>
                  <span className="shrink-0 rounded-[3px] bg-ink-900 px-2 py-1 font-mono text-[10px] font-bold text-amber-400">PCAB {c.pcab}</span>
                </div>
                <p className="mt-1 font-mono text-[10.5px] tracking-wider text-text-600 uppercase">{c.category}</p>
                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line-300 bg-line-300 text-[11px]">
                  <div className="bg-paper-100 px-3 py-2"><p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Awarded projects</p><p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{jobs.length}</p></div>
                  <div className="bg-paper-100 px-3 py-2"><p className="font-mono text-[8.5px] tracking-[0.14em] text-text-400 uppercase">Contract book</p><p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{fmtPesoM(book)}</p></div>
                </div>
                <p className="mt-3 font-mono text-[10.5px] text-text-600">{c.contactPerson} · {c.phone}</p>
                <div className="mt-3 flex items-center gap-3">
                  {canManageProfiles && (
                    <button onClick={() => setCtrModal({ editing: c })}
                      className="flex cursor-pointer items-center gap-1.5 font-mono text-[9px] font-bold tracking-wider text-pine-600 uppercase transition-colors hover:text-pine-500">
                      <IconEdit size={11} /> Edit
                    </button>
                  )}
                  {can.del && (
                    <button onClick={() => setDel({ kind: "contractor", id: c.id })}
                      className="flex cursor-pointer items-center gap-1.5 font-mono text-[9px] font-bold tracking-wider text-coral-600 uppercase transition-colors hover:text-coral-500">
                      <IconTrash size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PERSONNEL BOARD (unified with user accounts) ── */}
      {tab === "personnel" && showRegistryTabs && (
        <div className="anim-fade-in mt-4">
          <p className="mb-3 rounded-[3px] border border-teal-500/50 bg-teal-500/10 px-3 py-2 font-mono text-[9.5px] tracking-wider text-teal-500 uppercase">
            One dataset — every row is also a login account. Creating an account here creates the personnel profile, and vice versa.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {personnel.map((p) => {
              const jobs = records.filter((r) => r.inchargeId === p.id);
              const own = isOwn(p);
              const canEditThis = canManageProfiles || own;
              const def = roles.find((r) => r.id === p.role);
              return (
                <div key={p.id} className="group relative rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(7,17,12,0.5)]">
                  <CornerTicks />
                  <div className="flex items-center gap-3.5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[3px] border-2 border-amber-500 bg-ink-950 font-display text-2xl font-bold text-amber-400">
                      {(p.firstName?.[0] ?? "") + (p.lastName?.[0] ?? "")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] tracking-[0.18em] text-teal-400 uppercase">{p.id} · account + profile{own ? " · you" : ""}</p>
                      <h3 className="font-display truncate text-[22px] leading-tight font-bold text-paper-100 uppercase">{p.name}</h3>
                      <p className="font-mono text-[10px] tracking-wider text-paper-300/60 uppercase">{p.position}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="font-mono text-[10px] text-paper-300/60">{p.divisionCode ? `${p.divisionCode} · ` : ""}{p.division} · PRC {p.prc || "—"}</p>
                    <span className="rounded-[3px] px-2 py-1 font-mono text-[9px] font-bold uppercase" style={{ color: def?.color ?? "#71826f", background: `${def?.color ?? "#71826f"}22` }}>
                      {def?.label ?? p.role}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-mono text-[9.5px] text-paper-300/45">{p.email}</p>
                    <span className="rounded-[3px] bg-ink-950 px-2 py-1 font-mono text-[10px] font-bold text-amber-400">{jobs.length} assigned</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-700 pt-3">
                    {canEditThis && (
                      <button onClick={() => setPersonModal({ editing: p, own })}
                        className="flex cursor-pointer items-center gap-1.5 font-mono text-[9px] font-bold tracking-wider text-teal-400 uppercase transition-colors hover:text-teal-500">
                        <IconEdit size={11} /> {own ? "Edit my profile" : "Edit"}
                      </button>
                    )}
                    {own && (
                      <button onClick={() => setPwFor({ id: p.id, own: true })}
                        className="flex cursor-pointer items-center gap-1.5 font-mono text-[9px] font-bold tracking-wider text-amber-400 uppercase transition-colors hover:text-amber-500">
                        <IconLock size={11} /> Change password
                      </button>
                    )}
                    {can.del && (
                      <button onClick={() => (own ? toast("You cannot delete your own account", "info") : setDel({ kind: "person", id: p.id }))}
                        className={`flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-wider uppercase transition-colors ${own ? "cursor-not-allowed text-paper-300/30" : "cursor-pointer text-coral-400 hover:text-coral-500"}`}>
                        <IconTrash size={11} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CATALOGS ── */}
      {tab === "catalogs" && showCatalogs && (
        <div className="anim-fade-in mt-4">
          <CatalogManager />
        </div>
      )}

      {/* drawer + modals */}
      <ProjectDrawer
        record={open}
        onClose={() => setOpenId(null)}
        onLocate={onLocate}
        onEdit={can.update ? (r) => { setOpenId(null); setModal({ kind: "project", editing: r }); } : undefined}
        onDelete={can.del ? (r) => { setOpenId(null); setDel({ kind: "record", id: r.id }); } : undefined}
        onOpenCadastre={onOpenCadastre}
      />
      {modal?.kind === "project" && <ProjectForm onClose={() => setModal(null)} editing={modal.editing} />}
      {ctrModal && <ContractorForm onClose={() => setCtrModal(null)} editing={ctrModal.editing} />}
      {personModal && <PersonForm onClose={() => setPersonModal(null)} editing={personModal.editing} lockRole={personModal.own} />}
      {pwFor && <ChangePasswordForm userId={pwFor.id} onClose={() => setPwFor(null)} adminOverride={!pwFor.own} />}

      {del && (
        <ConfirmDialog
          title={del.kind === "record" ? "Delete project record" : del.kind === "contractor" ? "Delete implementor" : "Delete account"}
          sheet={del.kind === "record" ? "project_records · DELETE" : del.kind === "contractor" ? "contractors · DELETE" : "personnel · DELETE"}
          confirmLabel={del.kind === "record" ? "Delete record" : del.kind === "contractor" ? "Delete & unlink" : "Delete & unlink"}
          message={
            del.kind === "record"
              ? <p>The record <b className="text-ink-900">{del.id}</b> and its detail records will be permanently removed. Linked centerlines are unlinked, not deleted.</p>
              : del.kind === "contractor"
                ? <p><b className="text-ink-900">{cName(del.id)}</b> will be removed; projects referencing it will show an unlinked implementor.</p>
                : <p><b className="text-ink-900">{eName(del.id)}</b> will be removed from the personnel dataset; records they are in-charge of will be unlinked.</p>
          }
          onConfirm={() => {
            if (del.kind === "record") { deleteRecord(del.id); toast(del.id, "deleted", "project record removed"); }
            else if (del.kind === "contractor") { deleteContractor(del.id); toast(cName(del.id), "deleted", "implementor removed · records unlinked"); }
            else { const res = deletePerson(del.id); if (res.ok) toast(eName(del.id), "deleted", "account removed · records unlinked"); else toast("Not deleted", "info", res.error); }
          }}
          onClose={() => setDel(null)}
        />
      )}

      {printing && (
        <PrintPortal orientation="landscape">
          <LedgerSheet rows={filtered} scopeNote="All registered project records" contractors={contractors} personnel={personnel} />
        </PrintPortal>
      )}
    </div>
  );
}
