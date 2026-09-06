/* Technical catalogs — CRUD over every dropdown list, in three domains:
   project-record fields · technical specs · registries. */

import { useMemo, useState } from "react";
import { CATALOG_GROUPS, itemUsage, type CatalogGroup, type CatalogItem } from "../data/catalogs";
import { useStore, addCatalogItem, updateCatalogItem, deleteCatalogItem } from "../state/store";
import ConfirmDialog from "./confirm";
import { toast } from "./toast";
import { IconPlus, IconCheck, IconClose, IconTrash, IconEdit } from "./icons";

export default function CatalogManager() {
  const { catalogItems, records, roadsReg, barangays, admin } = useStore();
  const [adding, setAdding] = useState<CatalogGroup["key"] | null>(null);
  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [delItem, setDelItem] = useState<CatalogItem | null>(null);

  const byGroup = useMemo(() => {
    const m = new Map<CatalogGroup["key"], CatalogItem[]>();
    CATALOG_GROUPS.forEach((g) => m.set(g.key, catalogItems.filter((c) => c.group === g.key)));
    return m;
  }, [catalogItems]);

  const delUsage = delItem ? itemUsage(delItem.group, delItem.value, records, roadsReg, barangays) : 0;

  const commitAdd = (g: CatalogGroup) => {
    const v = draft.trim();
    if (!v) return;
    if (byGroup.get(g.key)!.some((c) => c.value.toLowerCase() === v.toLowerCase())) { toast(v, "info", "already in this list"); return; }
    addCatalogItem({ group: g.key, value: v });
    toast(v, "saved", `added to ${g.name}`);
    setAdding(null);
  };

  const commitEdit = (item: CatalogItem) => {
    const v = editVal.trim();
    if (!v || v === item.value) { setEditId(null); return; }
    updateCatalogItem(item.id, { value: v });
    toast(v, "updated", `renamed from “${item.value}”`);
    setEditId(null);
  };

  const card = (g: CatalogGroup) => {
    const items = byGroup.get(g.key) ?? [];
    return (
      <div key={g.key} className="rounded-[4px] border border-line-300 bg-paper-100 transition-shadow hover:shadow-[0_10px_28px_rgba(12,25,19,0.1)]">
        <div className="flex items-center justify-between gap-2 border-b border-line-300 bg-paper-200 px-3.5 py-2.5">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-900 uppercase">
              <span className="rounded-[2px] bg-ink-900 px-1.5 py-0.5 text-[8.5px] text-amber-400">{g.section}</span>
              {g.name}
            </p>
            <p className="mt-0.5 font-mono text-[8.5px] tracking-wider text-text-400 uppercase">{g.desc}</p>
          </div>
          <span className="shrink-0 rounded-[3px] bg-ink-900 px-2 py-1 font-mono text-[10px] font-bold text-amber-400">{items.length}</span>
        </div>
        <ul className="divide-y divide-line-300/70">
          {items.map((item) => {
            const used = itemUsage(item.group, item.value, records, roadsReg, barangays);
            return (
              <li key={item.id} className="group flex items-center gap-2 px-3.5 py-2 transition-colors hover:bg-paper-200/70">
                {editId === item.id ? (
                  <>
                    <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item); if (e.key === "Escape") setEditId(null); }}
                      className="flex-1 rounded-[3px] border border-amber-600 bg-white px-2 py-1 font-mono text-[11px] text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                    <button onClick={() => commitEdit(item)} className="cursor-pointer p-1 text-pine-600 hover:text-pine-500" title="Save"><IconCheck size={13} /></button>
                    <button onClick={() => setEditId(null)} className="cursor-pointer p-1 text-text-400 hover:text-coral-600" title="Cancel"><IconClose size={13} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-[12px] font-medium text-ink-900">{item.value}</span>
                    <span className={`shrink-0 rounded-[3px] px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-wider uppercase ${used ? "bg-pine-600/15 text-pine-600" : "bg-ink-900/8 text-text-400"}`}
                      title={`${used} record${used === 1 ? "" : "s"} reference this option`}>
                      {used ? `${used} in use` : "unused"}
                    </span>
                    <button onClick={() => { setEditId(item.id); setEditVal(item.value); }}
                      className="shrink-0 cursor-pointer p-1 text-text-400 opacity-0 transition-all group-hover:opacity-100 hover:text-amber-600" title="Rename option">
                      <IconEdit size={13} />
                    </button>
                    <button onClick={() => (admin ? setDelItem(item) : toast("Program-Admin mode required", "info", "toggle ADMIN on the top bar to remove catalog options"))}
                      className={`shrink-0 p-1 ${admin ? "cursor-pointer text-text-400 opacity-0 transition-all group-hover:opacity-100 hover:text-coral-600" : "cursor-not-allowed text-line-400 opacity-40"}`}
                      title={admin ? "Remove option (admin)" : "Requires program-admin mode"}>
                      <IconTrash size={13} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
          {items.length === 0 && <li className="px-3.5 py-2.5 font-mono text-[9.5px] text-text-400">Empty — add the first option below.</li>}
        </ul>
        <div className="border-t border-line-300 p-2.5">
          {adding === g.key ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitAdd(g); if (e.key === "Escape") setAdding(null); }}
                placeholder="New option…"
                className="flex-1 rounded-[3px] border border-amber-600 bg-white px-2 py-1.5 font-mono text-[11px] text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
              <button onClick={() => commitAdd(g)} className="cursor-pointer rounded-[3px] bg-pine-600 p-1.5 text-paper-100 transition-colors hover:bg-pine-500" title="Add"><IconCheck size={13} /></button>
              <button onClick={() => setAdding(null)} className="cursor-pointer rounded-[3px] border border-line-400 p-1.5 text-text-400 transition-colors hover:text-coral-600" title="Cancel"><IconClose size={13} /></button>
            </div>
          ) : (
            <button onClick={() => { setAdding(g.key); setDraft(""); }}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-line-400 py-1.5 font-mono text-[9px] font-bold tracking-[0.14em] text-text-400 uppercase transition-all hover:border-pine-600 hover:text-pine-600">
              <IconPlus size={11} /> Add option
            </button>
          )}
        </div>
      </div>
    );
  };

  const DOMAINS: { key: CatalogGroup["domain"]; title: string; note: string }[] = [
    { key: "record", title: "Project Record Fields", note: "Feed the project encoder — types, modes, funds" },
    { key: "specs", title: "Technical Specifications", note: "Feed the technical / revision / as-built encoders" },
    { key: "registry", title: "Registry Lists", note: "Feed the road & street and barangay registries" },
  ];

  return (
    <div className="anim-fade-in space-y-5">
      {DOMAINS.map((d) => (
        <div key={d.key}>
          <div className="mb-2.5 flex items-baseline gap-3">
            <h3 className="font-display text-2xl font-bold tracking-wide text-ink-900 uppercase">{d.title}</h3>
            <p className="font-mono text-[9px] tracking-[0.14em] text-text-400 uppercase">{d.note}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CATALOG_GROUPS.filter((g) => g.domain === d.key).map(card)}
          </div>
        </div>
      ))}

      {delItem && (
        <ConfirmDialog
          title="Remove catalog option"
          sheet="technical_catalogs · DELETE"
          confirmLabel="Remove option"
          message={
            <div>
              <p><b className="text-ink-900">{delItem.value}</b> will be removed from <b>{CATALOG_GROUPS.find((g) => g.key === delItem.group)?.name}</b>.</p>
              <p className="mt-2 rounded-[3px] border border-line-400 bg-paper-200 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-text-600 uppercase">
                {delUsage ? `${delUsage} record${delUsage > 1 ? "s" : ""} reference it — saved values keep their text; only the dropdown changes.` : "No records reference it — safe to remove."}
              </p>
            </div>
          }
          onConfirm={() => { deleteCatalogItem(delItem.id); toast(delItem.value, "deleted", "option removed from the catalog"); }}
          onClose={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
