/* ─────────────────────────────────────────────────────────────
   LINKED DETAIL RECORDS — rendered inside the project drawer.
     · spec comparison table  (as-designed / revised / as-built)
     · variation orders       → adjust contract value + completion
     · suspension orders      → consume calendar days
   Every row is readable here; create / update / delete open the
   dedicated encoder windows (specForms).
   ────────────────────────────────────────────────────────────── */

import { Fragment, useState } from "react";

/* section code → full name for the table group headers */
const SECTION_NAME: Record<string, string> = {
  RD: "Road",
  SHLD: "Road Shoulder",
  SWLK: "Sidewalk",
  DRNG: "Drainage System",
  SLP: "Slope Protection",
  LITE: "Street Lights",
};
import {
  SPEC_ROWS, VARIANT_META, fmtShortDate,
  adjustedContract, adjustedCompletion, voAmount, voTimeExt, soDaysUsed,
  type SpecVariant, type SuspensionOrder, type VariationOrder,
} from "../data/specs";
import type { ProjectRecord } from "../data/registry";
import { fmtPesoM } from "../data/registry";
import { useStore, specOf, deleteOrder } from "../state/store";
import { SpecForm, SOForm, VOForm } from "./specForms";
import { toast } from "./toast";
import ConfirmDialog from "./confirm";
import { IconPlus, IconEdit, IconTrash } from "./icons";

type Modal =
  | { kind: "spec"; variant: SpecVariant }
  | { kind: "so"; editing: SuspensionOrder | null }
  | { kind: "vo"; editing: VariationOrder | null }
  | null;

export default function RecordDetails({ record }: { record: ProjectRecord }) {
  const { admin } = useStore();
  const [modal, setModal] = useState<Modal>(null);
  const [delSO, setDelSO] = useState<SuspensionOrder | null>(null);
  const [delVO, setDelVO] = useState<VariationOrder | null>(null);

  const tech = specOf(record, "technical");
  const rev = specOf(record, "revision");
  const act = specOf(record, "actual");
  const hasAnySpec = !!(tech || rev || act);

  const adjContract = adjustedContract(record);
  const adjCompletion = adjustedCompletion(record);
  const dContract = voAmount(record);
  const dDays = voTimeExt(record) + soDaysUsed(record);

  const requireAdmin = (fn: () => void) =>
    admin ? fn() : toast("Program-Admin mode required", "info", "toggle ADMIN on the top bar to delete orders");

  const SpecCell = ({ variant }: { variant: SpecVariant }) => {
    const s = specOf(record, variant);
    const exists = variant === "technical" ? !!tech : variant === "revision" ? !!rev : !!act;
    const meta = variant === "revision" ? record.revision?.meta : variant === "actual" ? record.actual?.meta : null;
    return (
      <div className="flex flex-col">
        <button
          onClick={() => setModal({ kind: "spec", variant })}
          className="cursor-pointer rounded-[3px] px-1.5 py-1 text-left font-mono text-[9px] font-bold tracking-wider uppercase transition-all hover:brightness-125"
          style={{ background: `${VARIANT_META[variant].color}1c`, color: VARIANT_META[variant].color }}
        >
          {exists ? <><IconEdit size={10} className="mr-1 inline" />edit</> : <><IconPlus size={10} className="mr-1 inline" />encode</>}
        </button>
        {meta && (
          <p className="mt-1 font-mono text-[8px] leading-snug text-text-400">
            {"revisionNo" in meta ? `${meta.revisionNo} · ${fmtShortDate(meta.date)}` : `${fmtShortDate(meta.date)} · ${meta.certifiedBy || "—"}`}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4">
      {/* ─────── order impact strip ─────── */}
      {(record.variations.length > 0 || record.suspensions.length > 0) && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border-2 border-ink-800 bg-ink-800">
          <div className="bg-ink-900 px-3.5 py-3">
            <p className="font-mono text-[8.5px] tracking-[0.16em] text-paper-300/50 uppercase">Adjusted contract value</p>
            <p className="font-display mt-1 text-[22px] leading-none font-bold text-paper-100">{fmtPesoM(adjContract)}</p>
            <p className={`mt-1 font-mono text-[9px] font-bold tracking-wider uppercase ${dContract >= 0 ? "text-pine-400" : "text-coral-400"}`}>
              {dContract >= 0 ? "+" : "−"}{fmtPesoM(Math.abs(dContract))} via {record.variations.length} VO
            </p>
          </div>
          <div className="bg-ink-900 px-3.5 py-3">
            <p className="font-mono text-[8.5px] tracking-[0.16em] text-paper-300/50 uppercase">Adjusted completion</p>
            <p className="font-display mt-1 text-[22px] leading-none font-bold text-paper-100">{fmtShortDate(adjCompletion)}</p>
            <p className="mt-1 font-mono text-[9px] font-bold tracking-wider text-amber-400 uppercase">+{dDays} d · VO ext + SO used</p>
          </div>
        </div>
      )}

      {/* ─────── spec comparison table ─────── */}
      <section className="overflow-hidden rounded-[4px] border-2 border-ink-800 bg-paper-100">
        <div className="flex items-center justify-between gap-2 border-b-2 border-ink-800 bg-ink-900 px-4 py-2.5">
          <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
            Technical · Revision · Actual <span className="rounded-[3px] bg-ink-950 px-1.5 py-0.5 text-amber-400">{hasAnySpec ? "specified" : "none yet"}</span>
          </p>
          <button onClick={() => setModal({ kind: "spec", variant: "technical" })}
            className="flex cursor-pointer items-center gap-1.5 rounded-[3px] border border-amber-500/50 px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-amber-400 uppercase transition-all hover:bg-amber-500 hover:text-ink-950">
            <IconPlus size={11} /> Technical specs
          </button>
        </div>

        {hasAnySpec ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-paper-200">
                <tr className="[&>th]:border-b border-line-300 [&>th]:px-2.5 [&>th]:py-2 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8.5px] [&>th]:font-bold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                  <th className="text-text-400">Item</th>
                  <th style={{ color: VARIANT_META.technical.color }}>{VARIANT_META.technical.tag}</th>
                  <th style={{ color: VARIANT_META.revision.color }}>{VARIANT_META.revision.tag}</th>
                  <th style={{ color: VARIANT_META.actual.color }}>{VARIANT_META.actual.tag}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300/70">
                {/* per-variant control row */}
                <tr className="bg-paper-200/50">
                  <td className="px-2.5 py-1.5 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">Controls</td>
                  {(["technical", "revision", "actual"] as SpecVariant[]).map((v) => <td key={v} className="px-2.5 py-1.5"><SpecCell variant={v} /></td>)}
                </tr>
                {(() => {
                  const visible = SPEC_ROWS
                    .map((row) => ({
                      row,
                      tv: tech ? row.get(tech) : "",
                      rv: rev ? row.get(rev) : "",
                      av: act ? row.get(act) : "",
                    }))
                    .filter((x) => x.tv || x.rv || x.av);
                  let prevSection = "";
                  return visible.map(({ row, tv, rv, av }) => {
                    const diff = (v: string) => v !== "" && tv !== "" && v !== tv;
                    const isNewSection = row.section !== prevSection;
                    prevSection = row.section;
                    return (
                      <Fragment key={row.section + row.label}>
                        {isNewSection && (
                          <tr className="bg-paper-200/70">
                            <td colSpan={4} className="px-2.5 py-1 font-mono text-[8px] font-bold tracking-[0.18em] text-pine-600 uppercase">
                              ▸ {SECTION_NAME[row.section] ?? row.section}
                            </td>
                          </tr>
                        )}
                        <tr className="transition-colors hover:bg-ink-900/[0.04]">
                          <td className="px-2.5 py-1.5">
                            <span className="mr-1.5 rounded-[2px] bg-ink-900/8 px-1 font-mono text-[8px] font-bold text-teal-500">{row.section}</span>
                            <span className="text-[11px] font-medium text-ink-900">{row.label}</span>
                          </td>
                          <td className="px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-ink-900">{tv || "—"}<span className="text-[8.5px] text-text-400"> {row.unit}</span></td>
                          <td className={`px-2.5 py-1.5 font-mono text-[10.5px] font-semibold ${diff(rv) ? "bg-amber-500/15 text-amber-600" : "text-text-600"}`}>{rv || "—"}{diff(rv) && " Δ"}<span className="text-[8.5px] text-text-400"> {row.unit}</span></td>
                          <td className={`px-2.5 py-1.5 font-mono text-[10.5px] font-semibold ${diff(av) ? "bg-pine-600/12 text-pine-600" : "text-text-600"}`}>{av || "—"}{diff(av) && " Δ"}<span className="text-[8.5px] text-text-400"> {row.unit}</span></td>
                        </tr>
                      </Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-4 font-mono text-[10px] text-text-400">
            No technical specifications encoded yet. Open <b className="text-ink-900">Technical specs</b> to describe the road, shoulder, sidewalk, drainage, slope protection and street lights — revisions and as-built details build on it.
          </p>
        )}
      </section>

      {/* ─────── variation orders ─────── */}
      <section className="overflow-hidden rounded-[4px] border border-line-300 bg-paper-100">
        <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-paper-200 px-4 py-2.5">
          <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-text-600 uppercase">
            Variation orders <span className="rounded-[3px] bg-ink-900 px-1.5 py-0.5 text-amber-400">{record.variations.length}</span>
          </p>
          <button onClick={() => setModal({ kind: "vo", editing: null })}
            className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-ink-900 px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-amber-400 uppercase transition-all hover:bg-ink-800">
            <IconPlus size={11} /> New VO
          </button>
        </div>
        {record.variations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-paper-200/60">
                <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8.5px] [&>th]:font-bold [&>th]:tracking-[0.12em] [&>th]:uppercase [&>th]:text-text-400">
                  <th>Order no.</th><th className="text-right">Revised amt</th><th className="text-right">Time ext</th><th>Requested</th><th>Approved</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300/70">
                {record.variations.map((v) => (
                  <tr key={v.id} className="group transition-colors hover:bg-ink-900/[0.04]">
                    <td className="px-2.5 py-2">
                      <p className="font-mono text-[10.5px] font-bold text-ink-900">{v.orderNo}</p>
                      {v.remarks && <p className="mt-0.5 max-w-[200px] truncate font-mono text-[8.5px] text-text-400" title={v.remarks}>{v.remarks}</p>}
                    </td>
                    <td className={`px-2.5 py-2 text-right font-mono text-[10.5px] font-bold tabular ${v.revisedAmount >= 0 ? "text-pine-600" : "text-coral-600"}`}>
                      {v.revisedAmount >= 0 ? "+" : "−"}{fmtPesoM(Math.abs(v.revisedAmount))}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-[10.5px] font-semibold text-ink-900 tabular">+{v.timeExtensionDays} d</td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-text-600">{fmtShortDate(v.dateRequested)}</td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-text-600">{fmtShortDate(v.dateApproved)}</td>
                    <td className="px-2.5 py-2">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setModal({ kind: "vo", editing: v })} className="cursor-pointer rounded-[3px] border border-line-400 p-1 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600" title="Edit VO"><IconEdit size={12} /></button>
                        <button onClick={() => requireAdmin(() => setDelVO(v))} className={`rounded-[3px] border p-1 transition-colors ${admin ? "cursor-pointer border-line-400 text-text-400 hover:border-coral-500 hover:text-coral-600" : "cursor-not-allowed border-line-300 text-line-400"}`} title="Delete VO"><IconTrash size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-3 font-mono text-[10px] text-text-400">No variation orders — contract value stands at {fmtPesoM(record.contractedAmount)}.</p>
        )}
      </section>

      {/* ─────── suspension orders ─────── */}
      <section className="overflow-hidden rounded-[4px] border border-line-300 bg-paper-100">
        <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-paper-200 px-4 py-2.5">
          <p className="font-mono text-[9.5px] font-bold tracking-[0.18em] text-text-600 uppercase">
            Suspension orders <span className="rounded-[3px] bg-ink-900 px-1.5 py-0.5 text-amber-400">{record.suspensions.length}</span>
          </p>
          <button onClick={() => setModal({ kind: "so", editing: null })}
            className="flex cursor-pointer items-center gap-1.5 rounded-[3px] bg-ink-900 px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-amber-400 uppercase transition-all hover:bg-ink-800">
            <IconPlus size={11} /> New SO
          </button>
        </div>
        {record.suspensions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-paper-200/60">
                <tr className="[&>th]:px-2.5 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-mono [&>th]:text-[8.5px] [&>th]:font-bold [&>th]:tracking-[0.12em] [&>th]:uppercase [&>th]:text-text-400">
                  <th>Order no.</th><th>Suspended → Resumed</th><th className="text-right">Duration</th><th className="text-right">Days used</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300/70">
                {record.suspensions.map((o) => (
                  <tr key={o.id} className="group transition-colors hover:bg-ink-900/[0.04]">
                    <td className="px-2.5 py-2">
                      <p className="font-mono text-[10.5px] font-bold text-ink-900">{o.orderNo}</p>
                      {o.remarks && <p className="mt-0.5 max-w-[200px] truncate font-mono text-[8.5px] text-text-400" title={o.remarks}>{o.remarks}</p>}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-text-600">{fmtShortDate(o.dateSuspended)} → {fmtShortDate(o.dateResumed)}</td>
                    <td className="px-2.5 py-2 text-right font-mono text-[10.5px] font-semibold text-ink-900 tabular">{o.durationDays} d</td>
                    <td className="px-2.5 py-2 text-right font-mono text-[10.5px] font-bold text-coral-600 tabular">{o.daysUsed} d</td>
                    <td className="px-2.5 py-2">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setModal({ kind: "so", editing: o })} className="cursor-pointer rounded-[3px] border border-line-400 p-1 text-text-400 transition-colors hover:border-amber-600 hover:text-amber-600" title="Edit SO"><IconEdit size={12} /></button>
                        <button onClick={() => requireAdmin(() => setDelSO(o))} className={`rounded-[3px] border p-1 transition-colors ${admin ? "cursor-pointer border-line-400 text-text-400 hover:border-coral-500 hover:text-coral-600" : "cursor-not-allowed border-line-300 text-line-400"}`} title="Delete SO"><IconTrash size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-3 font-mono text-[10px] text-text-400">No suspension orders — no calendar days consumed.</p>
        )}
      </section>

      {/* ─────── encoder windows ─────── */}
      {modal?.kind === "spec" && <SpecForm record={record} variant={modal.variant} onClose={() => setModal(null)} />}
      {modal?.kind === "so" && <SOForm record={record} editing={modal.editing} onClose={() => setModal(null)} />}
      {modal?.kind === "vo" && <VOForm record={record} editing={modal.editing} onClose={() => setModal(null)} />}

      {delSO && (
        <ConfirmDialog title="Delete suspension order" sheet="suspension_orders · DELETE" confirmLabel="Delete order"
          message={<p><b className="text-ink-900">{delSO.orderNo}</b> will be removed and its {delSO.daysUsed} consumed days released from the adjusted completion.</p>}
          onConfirm={() => { deleteOrder(record.id, "so", delSO.id); toast(delSO.orderNo, "deleted", "suspension order"); }}
          onClose={() => setDelSO(null)} />
      )}
      {delVO && (
        <ConfirmDialog title="Delete variation order" sheet="variation_orders · DELETE" confirmLabel="Delete order"
          message={<p><b className="text-ink-900">{delVO.orderNo}</b> will be removed; the contract value reverts by {fmtPesoM(Math.abs(delVO.revisedAmount))} and {delVO.timeExtensionDays} extension days are released.</p>}
          onConfirm={() => { deleteOrder(record.id, "vo", delVO.id); toast(delVO.orderNo, "deleted", "variation order"); }}
          onClose={() => setDelVO(null)} />
      )}
    </div>
  );
}
