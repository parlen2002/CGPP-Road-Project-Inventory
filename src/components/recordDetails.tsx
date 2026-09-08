/* Record details — technical/revision/as-built comparison, variation &
   suspension orders and their impact on adjusted amount & completion. */

import { Fragment, useState } from "react";
import {
  SPEC_ROWS, filledCount, voTimeExt, soDaysUsed, voAmount,
  type SpecVariant, type SuspensionOrder, type VariationOrder,
} from "../data/specs";
import { fmtPesoM, fmtDate, type ProjectRecord } from "../data/registry";
import { useStore, deleteOrder } from "../state/store";
import { useAuth } from "../state/authStore";
import { SpecForm, OrderForm } from "./specForms";
import ConfirmDialog from "./confirm";
import { toast } from "./toast";
import { IconEdit, IconPlus, IconTrash, IconCalendar } from "./icons";

const SECTION_NAME: Record<string, string> = {
  RD: "Road", SHLD: "Road Shoulder", SWLK: "Sidewalk", DRNG: "Drainage System", SLP: "Slope Protection", LITE: "Street Lights",
};

type ModalState =
  | { kind: "spec"; variant: SpecVariant }
  | { kind: "order"; order: "suspensions" | "variations" }
  | null;

export default function RecordDetails({ record }: { record: ProjectRecord }) {
  const { can, role } = useAuth();
  const [modal, setModal] = useState<ModalState>(null);
  const [delOrder, setDelOrder] = useState<{ kind: "suspensions" | "variations"; id: string; label: string } | null>(null);

  const tech = record.technical;
  const rev = record.revision?.specs ?? null;
  const act = record.actual?.specs ?? null;
  const hasSpecs = !!(tech || rev || act);

  const extDays = voTimeExt(record) + soDaysUsed(record);
  const adjustedAmount = record.contractedAmount + voAmount(record);
  const adjustedCompletion = extDays > 0
    ? (() => { const t = new Date(record.contractedCompletion); t.setDate(t.getDate() + extDays); return t.toISOString().slice(0, 10); })()
    : null;

  const variantBtn = (variant: SpecVariant, filled: number, label: string) => (
    <button onClick={() => (can.update ? setModal({ kind: "spec", variant }) : toast("Read-only role", "info", `signed in as ${role}`))}
      className={`group flex flex-1 items-center justify-between gap-2 rounded-[3px] border border-line-400 bg-white/60 px-3 py-2 transition-all ${can.update ? "cursor-pointer hover:border-ink-800 hover:bg-paper-200" : "cursor-not-allowed opacity-70"}`}>
      <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink-900 uppercase">{label}</span>
      <span className="flex items-center gap-2">
        <span className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[8.5px] font-bold ${filled ? "bg-pine-600/15 text-pine-600" : "bg-ink-900/8 text-text-400"}`}>
          {filled ? `${filled}/24` : "empty"}
        </span>
        <IconEdit size={12} className="text-text-400 transition-colors group-hover:text-amber-600" />
      </span>
    </button>
  );

  return (
    <div className="mt-4 rounded-[3px] border-2 border-ink-800 bg-paper-100">
      <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-ink-900 px-4 py-2.5">
        <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold tracking-[0.18em] text-paper-100 uppercase">
          <IconCalendar size={13} className="text-amber-400" /> Detail records — technical · revision · as-built
        </p>
        <p className="font-mono text-[8.5px] tracking-[0.14em] text-paper-300/50 uppercase">linked to {record.id}</p>
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          {variantBtn("technical", filledCount(tech), "Technical (as-designed)")}
          {variantBtn("revision", filledCount(rev), "Revision")}
          {variantBtn("actual", filledCount(act), "Actual (as-built)")}
        </div>
        {record.revision && (
          <p className="mt-2 font-mono text-[9px] tracking-wider text-text-400 uppercase">
            Rev {record.revision.meta.revisionNo} · {fmtDate(record.revision.meta.date)}{record.revision.meta.reason ? ` — ${record.revision.meta.reason}` : ""}
          </p>
        )}
        {record.actual && (
          <p className="mt-1 font-mono text-[9px] tracking-wider text-text-400 uppercase">
            As-built certified {fmtDate(record.actual.meta.date)} by {record.actual.meta.certifiedBy || "—"}
          </p>
        )}

        {hasSpecs ? (
          <div className="mt-3 overflow-hidden rounded-[3px] border border-line-400">
            <table className="w-full border-collapse">
              <thead className="bg-ink-900 text-paper-300">
                <tr className="[&>th]:border-b-2 [&>th]:border-amber-500/70 [&>th]:px-2.5 [&>th]:py-2 [&>th]:text-left [&>th]:font-mono [&>th]:text-[9px] [&>th]:font-semibold [&>th]:tracking-[0.14em] [&>th]:uppercase">
                  <th>Item</th><th>As-designed</th><th>Revised</th><th>As-built</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-300">
                {(() => {
                  const visible = SPEC_ROWS
                    .map((row) => ({ row, tv: tech ? row.get(tech) : "", rv: rev ? row.get(rev) : "", av: act ? row.get(act) : "" }))
                    .filter((x) => x.tv || x.rv || x.av);
                  let prevSection = "";
                  return visible.map(({ row, tv, rv, av }) => {
                    const diff = (v: string) => v !== "" && tv !== "" && v !== tv;
                    const isNew = row.section !== prevSection;
                    prevSection = row.section;
                    return (
                      <Fragment key={row.section + row.label}>
                        {isNew && (
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
          <p className="mt-3 rounded-[3px] border border-dashed border-line-400 px-3 py-3 font-mono text-[9.5px] leading-relaxed text-text-400">
            No technical detail yet — encode the as-designed specs, then track revisions and as-built values against them.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["variations", "suspensions"] as const).map((kind) => {
            const list = record[kind];
            const isVO = kind === "variations";
            return (
              <div key={kind} className="rounded-[3px] border border-line-400 bg-white/60">
                <div className="flex items-center justify-between border-b border-line-300 px-3 py-2">
                  <p className="font-mono text-[9px] font-bold tracking-[0.16em] text-ink-900 uppercase">
                    {isVO ? "Variation orders" : "Suspension orders"}
                    <span className="ml-1.5 rounded-[3px] bg-ink-900 px-1.5 py-0.5 text-amber-400">{list.length}</span>
                  </p>
                  <button onClick={() => (can.update ? setModal({ kind: "order", order: kind }) : toast("Read-only role", "info", `signed in as ${role}`))}
                    className={`flex items-center gap-1 font-mono text-[8.5px] font-bold tracking-wider uppercase transition-colors ${can.update ? "cursor-pointer text-pine-600 hover:text-pine-500" : "cursor-not-allowed text-line-400"}`}>
                    <IconPlus size={9} /> New {isVO ? "VO" : "SO"}
                  </button>
                </div>
                {list.length === 0 ? (
                  <p className="px-3 py-2.5 font-mono text-[9px] text-text-400">None recorded.</p>
                ) : (
                  <ul className="divide-y divide-line-300">
                    {list.map((o) => {
                      const vo = o as VariationOrder;
                      const so = o as SuspensionOrder;
                      return (
                        <li key={o.id} className="flex items-center gap-2 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10px] font-bold text-ink-900">{o.orderNo}</p>
                            <p className="font-mono text-[8.5px] tracking-wider text-text-400 uppercase">
                              {isVO
                                ? `${vo.revisedAmount >= 0 ? "+" : ""}${fmtPesoM(vo.revisedAmount)} · +${vo.timeExtensionDays} d · appr ${fmtDate(vo.dateApproved)}`
                                : `${fmtDate(so.dateSuspended)} → ${fmtDate(so.dateResumed)} · ${so.daysUsed} d used`}
                            </p>
                            {o.remarks && <p className="mt-0.5 truncate text-[10px] text-text-600" title={o.remarks}>{o.remarks}</p>}
                          </div>
                          {can.del && (
                            <button onClick={() => setDelOrder({ kind, id: o.id, label: o.orderNo })}
                              className="shrink-0 cursor-pointer p-1 text-text-400 transition-colors hover:text-coral-600" title="Delete order (admin)">
                              <IconTrash size={12} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {(record.variations.length > 0 || record.suspensions.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[3px] border border-amber-500/50 bg-amber-500/10 px-3 py-2">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-amber-600 uppercase">Adjusted contract value</p>
              <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{fmtPesoM(adjustedAmount)}</p>
            </div>
            <div className="rounded-[3px] border border-coral-500/50 bg-coral-500/10 px-3 py-2">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-coral-600 uppercase">Adjusted completion</p>
              <p className="font-display mt-0.5 text-xl leading-none font-bold text-ink-900">{adjustedCompletion ? fmtDate(adjustedCompletion) : fmtDate(record.contractedCompletion)}</p>
            </div>
          </div>
        )}
      </div>

      {modal?.kind === "spec" && <SpecForm record={record} variant={modal.variant} onClose={() => setModal(null)} />}
      {modal?.kind === "order" && <OrderForm record={record} kind={modal.order} onClose={() => setModal(null)} />}

      {delOrder && (
        <ConfirmDialog
          title={delOrder.kind === "variations" ? "Delete variation order" : "Delete suspension order"}
          sheet={`project_records · ${record.id} · DELETE`}
          confirmLabel="Delete order"
          message={<p>Order <b className="text-ink-900">{delOrder.label}</b> will be removed and the adjusted contract / completion recalculated.</p>}
          onConfirm={() => { deleteOrder(record.id, delOrder.kind, delOrder.id); toast(delOrder.label, "deleted", "order removed — impact recalculated"); }}
          onClose={() => setDelOrder(null)}
        />
      )}
    </div>
  );
}
