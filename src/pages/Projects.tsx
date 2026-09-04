import { useMemo, useState } from "react";
import {
  PROJECT_TYPES, STATUS_LABELS, STATUS_META, statusOf, typeShort,
  fmtPesoM, fmtDate, durationOf, projectPoint, barangayLabel, hasEvidence,
  type ProjectRecord, type Contractor, type Engineer, type StatusLabel,
} from "../data/registry";
import { useStore, setPercent, deleteRecord, deleteContractor, deleteEngineer } from "../state/store";
import { PageHeader, Reveal, CornerTicks, CountUp } from "../components/ui";
import { IconPlus, IconDownload, IconSearch, IconPin, IconEdit, IconTrash } from "../components/icons";
import { ProjectForm, ContractorForm, EngineerForm } from "../components/projectForms";
import ProjectDrawer from "../components/ProjectDrawer";
import ConfirmDialog from "../components/confirm";
import { toast } from "../components/toast";

type ModalState =
  | { kind: "project"; editing: ProjectRecord | null }
  | { kind: "contractor"; editing: Contractor | null }
  | { kind: "engineer"; editing: Engineer | null }
  | null;

type DeleteTarget =
  | { kind: "record"; id: string }
  | { kind: "contractor"; id: string }
  | { kind: "engineer"; id: string }
  | null;

type Tab = "ledger" | "implementors" | "personnel";

const selectCls =
  "rounded-[3px] border border-line-400 bg-paper-100 px-2.5 py-2 font-mono text-[11px] text-ink-900 cursor-pointer focus:border-amber-600 focus:outline-none";

export default function Projects({ onLocate, onOpenRoad }: {
  onLocate: (point: [number, number], zoom?: number) => void;
  onOpenRoad: (roadId: string) => void;
}) {
  const { records, contractors, engineers } = useStore();
  const [tab, setTab] = useState<Tab>("ledger");
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<"All" | StatusLabel>("All");
  const [typeF, setTypeF] = useState("All");
  const [modeF, setModeF] = useState("All");
  const [implF, setImplF] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [del, setDel] = useState<DeleteTarget>(null);

  const confirmDelete = () => {
    if (!del) return;
    if (del.kind === "record") {
      const r = records.find((x) => x.id === del.id);
      deleteRecord(del.id);
      if (openId === del.id) setOpenId(null);
      toast(r ? `${r.id} — ${r.name}` : del.id, "deleted", "row removed from project_records");
    } else if (del.kind === "contractor") {
      const c = contractors.find((x) => x.id === del.id);
      const linked = deleteContractor(del.id);
      toast(c ? `${c.id} — ${c.name}` : del.id, "deleted", linked ? `implementor deleted · ${linked} link(s) set to UNLINKED` : "contractor profile deleted");
    } else {
      const e = engineers.find((x) => x.id === del.id);
      const linked = deleteEngineer(del.id);
      toast(e ? `${e.id} — ${e.name}` : del.id, "deleted", linked ? `employee deleted · ${linked} assignment(s) set to UNLINKED` : "employee profile deleted");
    }
  };

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

  const open = records.find((r) => r.id === openId) ?? null;
  const totalContracted = records.reduce((s, r) => s + r.contractedAmount, 0);
  const totalActual = records.reduce((s, r) => s + r.actualAmount, 0);
  const weightedPct = totalContracted
    ? Math.round(records.reduce((s, r) => s + r.percent * r.contractedAmount, 0) / totalContracted)
    : 0;

  const exportCsv = () => {
    const head = [
      "project_id", "name", "type", "mode_of_implementation", "source_of_fund", "object_account_code",
      "file_folder_no", "implementor_id", "implementor_name", "incharge_id", "incharge_name",
      "barangays", "pin_latitude", "pin_longitude", "evidence_source", "evidence_ref", "linear_length_m",
      "contracted_amount", "actual_amount", "bid_year", "contracted_start", "contracted_completion",
      "actual_start", "actual_completion", "actual_duration", "percent_completion", "status", "notes",
    ].join(",");
    const rows = filtered.map((r) => {
      const impl = contractors.find((c) => c.id === r.implementorId)?.name ?? "";
      const engr = engineers.find((e) => e.id === r.inchargeId)?.name ?? "";
      return [
        r.id, `"${r.name}"`, r.type, r.mode, `"${r.fund}"`, r.objectCode, r.folderNo,
        r.implementorId, `"${impl}"`, r.inchargeId, `"${engr}"`,
        `"${r.location.barangays.join("; ")}"`,
        r.location.evidence?.lat ?? "", r.location.evidence?.lng ?? "",
        r.location.evidence?.source ?? "none", r.location.evidence?.ref ?? "",
        r.linearLength,
        r.contractedAmount, r.actualAmount, r.bidYear, r.contractedStart, r.contractedCompletion,
        r.actualStart ?? "", r.actualCompletion ?? "", `"${durationOf(r)}"`, r.percent,
        statusOf(r).label, `"${r.notes.replace(/"/g, "'")}"`,
      ].join(",");
    });
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rpis_project_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const TabBtn = ({ id, label, count }: { id: Tab; label: string; count: number }) => (
    <button
      onClick={() => setTab(id)}
      className={`relative cursor-pointer px-4 py-3 font-display text-lg font-bold tracking-wider uppercase transition-colors sm:text-xl ${
        tab === id ? "bg-paper-100 text-ink-900" : "bg-ink-800 text-paper-300/60 hover:text-paper-100"
      }`}
    >
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
        subtitle="Master ledger of road projects per OCE encoding standard — 21 tracked fields per record, implementor and in-charge resolved as foreign keys to encoded profiles, location fixed from KML / GPX / geotagged field captures."
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
      <Reveal className="mt-6" delay={60}>
        <div className="flex overflow-hidden rounded-t-[4px] border-2 border-b-0 border-ink-800">
          <TabBtn id="ledger" label="Project Ledger" count={records.length} />
          <TabBtn id="implementors" label="Implementors" count={contractors.length} />
          <TabBtn id="personnel" label="In-Charge Personnel" count={engineers.length} />
          <button
            onClick={() => setModal(tab === "implementors" ? { kind: "contractor", editing: null } : tab === "personnel" ? { kind: "engineer", editing: null } : { kind: "project", editing: null })}
            className="group ml-auto flex cursor-pointer items-center gap-2 border-l-2 border-ink-800 bg-amber-500 px-4 font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink-950 uppercase transition-colors hover:bg-amber-400 sm:px-6"
          >
            <IconPlus size={14} className="transition-transform group-hover:rotate-90 duration-300" />
            {tab === "implementors" ? "Encode contractor" : tab === "personnel" ? "Encode employee" : "Encode project"}
          </button>
        </div>
      </Reveal>

      {/* ─────────────── LEDGER ─────────────── */}
      {tab === "ledger" && (
        <div className="anim-fade-in">
          <div className="relative rounded-b-[4px] border-2 border-ink-800 bg-paper-100 p-3">
            <CornerTicks />
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <IconSearch size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-400" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, project ID, folder no., implementor…"
                  className="w-full rounded-[3px] border border-line-400 bg-white/60 py-2 pr-3 pl-9 font-mono text-[11.5px] text-ink-900 placeholder:text-text-400/60 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["All", ...STATUS_LABELS] as const).map((s) => {
                  const n = s === "All" ? records.length : records.filter((r) => statusOf(r).label === s).length;
                  const m = s === "All" ? null : STATUS_META[s];
                  return (
                    <button
                      key={s} onClick={() => setStatusF(s)}
                      className={`cursor-pointer rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-all ${
                        statusF === s ? "border-ink-900 bg-ink-900 text-amber-400" : "border-line-400 text-text-600 hover:border-ink-800 hover:text-ink-900"
                      }`}
                    >
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: m?.color ?? "#71826f" }} />
                      {s} <b className="opacity-70">{n}</b>
                    </button>
                  );
                })}
              </div>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className={selectCls}>
                <option value="All">All types</option>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select value={modeF} onChange={(e) => setModeF(e.target.value)} className={selectCls}>
                {["All", "By Contract", "By Administration"].map((m) => <option key={m}>{m === "All" ? "Both modes" : m}</option>)}
              </select>
              <select value={implF} onChange={(e) => setImplF(e.target.value)} className={selectCls}>
                <option value="All">All implementors</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={exportCsv} className="ml-auto flex cursor-pointer items-center gap-2 rounded-[3px] bg-ink-900 px-3.5 py-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-amber-400 uppercase transition-all hover:bg-ink-800">
                <IconDownload size={13} /> CSV
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1480px] border-collapse">
                <thead className="bg-ink-900 text-paper-300">
                  <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70">
                    {["Project / Folder", "Type", "Mode", "Implementor", "In-Charge", "Location (Brgy)", "Lin. (m)", "Contracted", "Actual", "Bid", "Contracted Window", "Actual Window", "Duration", "Status · % Completion (drag)"].map((h, i) => (
                      <th key={h} className={`px-3 py-2.5 font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase ${i >= 6 && i <= 8 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-300">
                  {filtered.map((r) => {
                    const meta = statusOf(r);
                    const impl = contractors.find((c) => c.id === r.implementorId);
                    const engr = engineers.find((e) => e.id === r.inchargeId);
                    return (
                      <tr key={r.id} onClick={() => setOpenId(r.id)} className="group cursor-pointer transition-colors hover:bg-ink-900/[0.045]">
                        <td className="max-w-[300px] px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 font-mono text-[9.5px] font-bold tracking-wide text-teal-500">{r.id}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onLocate(projectPoint(r), hasEvidence(r) ? 15 : 13); }}
                              title="Locate on map"
                              className="shrink-0 cursor-pointer text-text-400 opacity-0 transition-all group-hover:opacity-100 hover:text-amber-600"
                            >
                              <IconPin size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setModal({ kind: "project", editing: r }); }}
                              title="Edit record"
                              className="shrink-0 cursor-pointer text-text-400 opacity-0 transition-all group-hover:opacity-100 hover:text-pine-600"
                            >
                              <IconEdit size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDel({ kind: "record", id: r.id }); }}
                              title="Delete record"
                              className="shrink-0 cursor-pointer text-text-400 opacity-0 transition-all group-hover:opacity-100 hover:text-coral-600"
                            >
                              <IconTrash size={12} />
                            </button>
                          </div>
                          <p className="mt-0.5 truncate text-[13px] font-semibold text-ink-900 group-hover:text-pine-700">{r.name}</p>
                          <p className="font-mono text-[9px] tracking-wider text-text-400 uppercase">{r.folderNo} · {r.fund}</p>
                        </td>
                        <td className="px-3 py-3"><span className="rounded-[3px] border border-ink-800/25 bg-ink-900/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider uppercase">{typeShort[r.type]}</span></td>
                        <td className="px-3 py-3 font-mono text-[10px] text-text-600 uppercase">{r.mode === "By Contract" ? "Contract" : "Admin"}</td>
                        <td className="max-w-[170px] px-3 py-3">
                          {r.implementorId ? (
                            <>
                              <p className="truncate text-[11.5px] font-semibold text-ink-900">{impl?.name ?? "—"}</p>
                              <p className="font-mono text-[9px] text-text-400 uppercase">PCAB {impl?.pcab ?? "—"}</p>
                            </>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setModal({ kind: "project", editing: r }); }}
                              className="cursor-pointer rounded-[3px] border border-coral-500/60 bg-coral-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-coral-600 uppercase transition-colors hover:bg-coral-600 hover:text-paper-100"
                              title="Implementor was deleted — click to relink"
                            >
                              ⚠ Unlinked · relink
                            </button>
                          )}
                        </td>
                        <td className="max-w-[160px] px-3 py-3">
                          {r.inchargeId ? (
                            <>
                              <p className="truncate text-[11.5px] font-semibold text-ink-900">{engr?.name ?? "—"}</p>
                              <p className="font-mono text-[9px] text-text-400 uppercase">{engr?.position ?? "—"}</p>
                            </>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setModal({ kind: "project", editing: r }); }}
                              className="cursor-pointer rounded-[3px] border border-coral-500/60 bg-coral-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-coral-600 uppercase transition-colors hover:bg-coral-600 hover:text-paper-100"
                              title="In-charge was deleted — click to relink"
                            >
                              ⚠ Unlinked · relink
                            </button>
                          )}
                        </td>
                        <td className="max-w-[150px] px-3 py-3">
                          <p className="truncate font-mono text-[10.5px] font-semibold text-ink-900" title={r.location.barangays.join(", ")}>
                            {barangayLabel(r)}
                          </p>
                          <p className="font-mono text-[8.5px] tracking-wider text-text-400 uppercase">
                            {hasEvidence(r) ? `${r.location.evidence!.source} pinpoint` : "centroid pin"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-ink-900 tabular">{r.linearLength.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-ink-900 tabular">{fmtPesoM(r.contractedAmount)}</td>
                        <td className="px-3 py-3 text-right font-mono text-[11.5px] text-text-600 tabular">{r.actualAmount ? fmtPesoM(r.actualAmount) : "—"}</td>
                        <td className="px-3 py-3 font-mono text-[11.5px] text-text-600 tabular">{r.bidYear}</td>
                        <td className="px-3 py-3 font-mono text-[10.5px] whitespace-nowrap text-text-600">{fmtDate(r.contractedStart)} → {fmtDate(r.contractedCompletion)}</td>
                        <td className="px-3 py-3 font-mono text-[10.5px] whitespace-nowrap text-text-600">{fmtDate(r.actualStart)} → {fmtDate(r.actualCompletion)}</td>
                        <td className="px-3 py-3 font-mono text-[10.5px] whitespace-nowrap text-text-600">{durationOf(r)}</td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="range" min={0} max={100} step={1} value={r.percent}
                              aria-label={`Completion for ${r.id}`}
                              onChange={(e) => setPercent(r.id, parseInt(e.target.value, 10))}
                              className="rpis-slider w-[130px]"
                              style={{ "--track": `linear-gradient(90deg, ${meta.color} ${r.percent}%, #e2e7d9 ${r.percent}%)` } as React.CSSProperties}
                            />
                            <span className="w-[74px] shrink-0 rounded-[3px] px-1.5 py-1 text-center font-mono text-[10px] font-bold tracking-wide tabular" style={{ color: meta.color, background: meta.soft }}>
                              {meta.label === "Not Started" ? "NOT START" : meta.label.toUpperCase()} {r.percent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={14} className="px-4 py-10 text-center font-mono text-[12px] text-text-400">— 0 records match the current filters —</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line-300 bg-paper-200 px-4 py-2 font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">
              {filtered.length} of {records.length} records · drag any status slider to encode latest field progress · click row for full record
            </p>
          </div>
        </div>
      )}

      {/* ─────────────── IMPLEMENTORS ─────────────── */}
      {tab === "implementors" && (
        <div className="anim-fade-in mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                <p className="font-mono text-[10px] text-text-400">{c.address} · {c.email}</p>
                <div className="mt-3 flex gap-2 border-t border-line-300 pt-3">
                  <button
                    onClick={() => setModal({ kind: "contractor", editing: c })}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-ink-800 px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink-900 uppercase transition-all hover:bg-ink-900 hover:text-amber-400"
                  >
                    <IconEdit size={11} /> Edit profile
                  </button>
                  <button
                    onClick={() => setDel({ kind: "contractor", id: c.id })}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-coral-500/50 px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-coral-600 uppercase transition-all hover:bg-coral-600 hover:text-paper-100"
                  >
                    <IconTrash size={11} /> Delete
                  </button>
                </div>
                {jobs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {jobs.slice(0, 4).map((j) => (
                      <button key={j.id} onClick={() => setOpenId(j.id)} className="cursor-pointer rounded-[3px] border border-line-400 px-1.5 py-0.5 font-mono text-[9px] text-text-600 transition-colors hover:border-amber-600 hover:text-amber-600">
                        {j.id.slice(-3)} · {statusOf(j).label}
                      </button>
                    ))}
                    {jobs.length > 4 && <span className="px-1 font-mono text-[9px] text-text-400">+{jobs.length - 4} more</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────── PERSONNEL ─────────────── */}
      {tab === "personnel" && (
        <div className="anim-fade-in mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {engineers.map((e) => {
            const jobs = records.filter((r) => r.inchargeId === e.id);
            const active = jobs.filter((j) => { const s = statusOf(j).label; return s === "Ongoing" || s === "Delayed"; });
            return (
              <div key={e.id} className="group relative rounded-[4px] border-2 border-ink-800 bg-ink-900 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(7,17,12,0.5)]">
                <CornerTicks />
                <div className="flex items-center gap-3.5">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[3px] border-2 border-amber-500 bg-ink-950 font-display text-2xl font-bold text-amber-400">
                    {e.name.replace("Engr. ", "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] tracking-[0.18em] text-teal-400 uppercase">{e.id} · employee profile</p>
                    <h3 className="font-display truncate text-[22px] leading-tight font-bold text-paper-100 uppercase">{e.name}</h3>
                    <p className="font-mono text-[10px] tracking-wider text-paper-300/60 uppercase">{e.position}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[3px] border border-ink-700 bg-ink-700 text-center">
                  <div className="bg-ink-950/60 px-2 py-2.5"><p className="font-display text-2xl leading-none font-bold text-amber-400">{jobs.length}</p><p className="mt-1 font-mono text-[8px] tracking-[0.12em] text-paper-300/50 uppercase">Assigned</p></div>
                  <div className="bg-ink-950/60 px-2 py-2.5"><p className="font-display text-2xl leading-none font-bold text-paper-100">{active.length}</p><p className="mt-1 font-mono text-[8px] tracking-[0.12em] text-paper-300/50 uppercase">Active</p></div>
                  <div className="bg-ink-950/60 px-2 py-2.5"><p className="font-display text-2xl leading-none font-bold text-pine-400">{jobs.filter((j) => statusOf(j).label === "Completed").length}</p><p className="mt-1 font-mono text-[8px] tracking-[0.12em] text-paper-300/50 uppercase">Done</p></div>
                </div>
                <p className="mt-3 font-mono text-[10px] text-paper-300/60">{e.unit} · PRC {e.prc}</p>
                <p className="font-mono text-[10px] text-paper-300/40">{e.email} · {e.phone}</p>
                <div className="mt-3 flex gap-2 border-t border-ink-700 pt-3">
                  <button
                    onClick={() => setModal({ kind: "engineer", editing: e })}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-amber-500/50 px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-amber-400 uppercase transition-all hover:bg-amber-500 hover:text-ink-950"
                  >
                    <IconEdit size={11} /> Edit profile
                  </button>
                  <button
                    onClick={() => setDel({ kind: "engineer", id: e.id })}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-coral-500/40 px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-coral-400 uppercase transition-all hover:bg-coral-600 hover:text-paper-100"
                  >
                    <IconTrash size={11} /> Delete
                  </button>
                </div>
                {active.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {active.slice(0, 3).map((j) => (
                      <button key={j.id} onClick={() => setOpenId(j.id)} className="cursor-pointer rounded-[3px] border border-ink-600 px-1.5 py-0.5 font-mono text-[9px] text-paper-300/70 transition-colors hover:border-amber-500 hover:text-amber-400">
                        {j.id.slice(-3)} · {j.percent}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* drawer + modals */}
      <ProjectDrawer
        record={open}
        onClose={() => setOpenId(null)}
        onLocate={onLocate}
        onEdit={(r) => { setOpenId(null); setModal({ kind: "project", editing: r }); }}
        onDelete={(r) => { setOpenId(null); setDel({ kind: "record", id: r.id }); }}
      />
      {modal?.kind === "project" && <ProjectForm onClose={() => setModal(null)} editing={modal.editing} />}
      {modal?.kind === "contractor" && <ContractorForm onClose={() => setModal(null)} editing={modal.editing} />}
      {modal?.kind === "engineer" && <EngineerForm onClose={() => setModal(null)} editing={modal.editing} />}

      {del && (
        <ConfirmDialog
          title={del.kind === "record" ? "Delete project record" : del.kind === "contractor" ? "Delete contractor" : "Delete employee"}
          sheet={del.kind === "record" ? "project_records · DELETE" : del.kind === "contractor" ? "contractors_contractor · DELETE" : "employees_employee · DELETE"}
          confirmLabel={
            del.kind === "record" ? "Delete record"
              : (del.kind === "contractor"
                  ? (records.some((r) => r.implementorId === del.id) ? "Delete & unlink" : "Delete contractor")
                  : (records.some((r) => r.inchargeId === del.id) ? "Delete & unlink" : "Delete employee"))
          }
          message={(() => {
            if (del.kind === "record") {
              const r = records.find((x) => x.id === del.id);
              return (
                <p>
                  <b className="text-ink-900">{del.id}</b> — “{r?.name}” will be permanently removed from the project
                  ledger. This write is committed immediately and cannot be undone.
                </p>
              );
            }
            if (del.kind === "contractor") {
              const c = contractors.find((x) => x.id === del.id);
              const n = records.filter((r) => r.implementorId === del.id).length;
              return (
                <div>
                  <p><b className="text-ink-900">{del.id}</b> — {c?.name} will be removed from the implementor registry.</p>
                  {n > 0 && (
                    <p className="mt-2 rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-coral-600 uppercase">
                      ⚠ {n} project{n > 1 ? "s" : ""} reference this implementor — the implementor field will be set to UNLINKED and must be re-encoded.
                    </p>
                  )}
                </div>
              );
            }
            const e = engineers.find((x) => x.id === del.id);
            const n = records.filter((r) => r.inchargeId === del.id).length;
            return (
              <div>
                <p><b className="text-ink-900">{del.id}</b> — {e?.name} will be removed from the personnel registry.</p>
                {n > 0 && (
                  <p className="mt-2 rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-coral-600 uppercase">
                    ⚠ {n} project{n > 1 ? "s" : ""} list this employee as in-charge — the assignment will be set to UNLINKED.
                  </p>
                )}
              </div>
            );
          })()}
          onConfirm={confirmDelete}
          onClose={() => setDel(null)}
        />
      )}
    </div>
  );
}
