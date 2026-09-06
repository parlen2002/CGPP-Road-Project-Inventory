/* Print engine — renders sheets into #print-root and triggers window.print().
   Ledger & inventory are A4 LANDSCAPE; the project detail sheet is A4 PORTRAIT
   and carries the map snapshot, full field list, specs, orders and photos. */

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  statusOf, fmtPesoM, fmtDate, durationOf, typeAbbr,
  type ProjectRecord, type Contractor, type Engineer,
} from "../data/registry";
import { SPEC_ROWS, filledCount, voTimeExt, soDaysUsed, voAmount, type TechSpecs } from "../data/specs";
import { TREATMENT_SHORT, TREATMENT_COLOR, type Treatment } from "../data/roads";
import type { RoadReg } from "../data/roadsRegistry";
import { fmtArea } from "../lib/geo";
import { runROWAnalysis } from "../data/cadastre";
import { useStore } from "../state/store";

export function PrintPortal({ children }: { children: ReactNode }) {
  const el = typeof document !== "undefined" ? document.getElementById("print-root") : null;
  if (!el) return null;
  return createPortal(children, el);
}

export function usePrintSession(active: boolean, onDone: () => void) {
  const fired = useRef(false);
  useEffect(() => {
    if (!active) { fired.current = false; return; }
    if (fired.current) return;
    fired.current = true;
    const t = setTimeout(() => {
      window.print();
      onDone();
    }, 350);
    return () => clearTimeout(t);
  }, [active, onDone]);
}

const INK = "#0c1913";
const AMBER = "#f0a32b";

function SheetHeader({ sheet, title, subtitle }: { sheet: string; title: string; subtitle: string }) {
  const today = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
  return (
    <div className="pavoid" style={{ border: `2px solid ${INK}`, borderBottom: "none", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
      <div>
        <p className="pmono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#cf8812", margin: 0 }}>
          Office of the City Engineer · Puerto Princesa City
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", margin: "2px 0 0", color: INK }}>{title}</h1>
        <p className="pmono" style={{ fontSize: 9.5, color: "#47584d", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{subtitle}</p>
      </div>
      <div className="pmono" style={{ textAlign: "right", fontSize: 9.5, color: "#47584d", lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}><b style={{ color: INK }}>DWG</b> {sheet}</p>
        <p style={{ margin: 0 }}><b style={{ color: INK }}>DATE</b> {today}</p>
        <p style={{ margin: 0 }}><b style={{ color: INK }}>SCALE</b> NTS · EPSG:4326</p>
      </div>
    </div>
  );
}

function SheetBar() {
  return <div style={{ display: "flex", height: 5, border: `2px solid ${INK}`, borderTop: "none" }}>
    <span style={{ flex: 3, background: AMBER }} /><span style={{ flex: 1, background: "#175c43" }} />
    <span style={{ flex: 1, background: INK }} /><span style={{ flex: 1, background: "#de5a36" }} />
  </div>;
}

/* ---------------- LEDGER (landscape) ---------------- */

export function LedgerSheet({ rows, scopeNote, contractors, engineers }: {
  rows: ProjectRecord[];
  scopeNote: string;
  contractors: Contractor[];
  engineers: Engineer[];
}) {
  const cName = (id: string) => contractors.find((c) => c.id === id)?.name ?? "—";
  const eName = (id: string) => engineers.find((e) => e.id === id)?.name ?? "—";
  return (
    <div className="print-sheet">
      <SheetHeader sheet="RPIS-PRJ-03" title="Project Ledger" subtitle={`${scopeNote} · ${rows.length} records`} />
      <SheetBar />
      <table className="ptable" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Project / Folder</th><th>Type</th><th>Mode</th><th>Implementor</th><th>In-Charge</th>
            <th>Location (Brgy)</th><th className="r">Lin. (m)</th><th className="r">Contracted</th>
            <th className="r">Actual</th><th>Status · %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = statusOf(r);
            return (
              <tr key={r.id}>
                <td>
                  <p className="pmono" style={{ fontSize: 8.5, color: "#12897e", fontWeight: 700, margin: 0 }}>{r.id} · {r.folderNo}</p>
                  <p style={{ fontWeight: 600, margin: "1px 0 0", fontSize: 11 }}>{r.name}</p>
                </td>
                <td className="pmono" style={{ whiteSpace: "nowrap", fontSize: 10 }}>{typeAbbr(r.type)}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: 10 }}>{r.mode.replace("By ", "")}</td>
                <td style={{ fontSize: 10 }}>{cName(r.implementorId)}</td>
                <td style={{ fontSize: 10, whiteSpace: "nowrap" }}>{eName(r.inchargeId)}</td>
                <td style={{ fontSize: 10 }}>{r.location.barangays.join(", ")}</td>
                <td className="r pmono" style={{ fontWeight: 600 }}>{r.linearLength.toLocaleString()}</td>
                <td className="r pmono" style={{ fontWeight: 600 }}>{fmtPesoM(r.contractedAmount)}</td>
                <td className="r pmono">{r.actualAmount ? fmtPesoM(r.actualAmount) : "—"}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div className="pbar" style={{ flex: 1, minWidth: 40 }}>
                      <div style={{ width: `${r.percent}%`, height: "100%", background: m.color }} />
                    </div>
                    <span className="pmono" style={{ fontSize: 9.5, fontWeight: 700, color: m.color, whiteSpace: "nowrap" }}>{m.label} {r.percent}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- INVENTORY (landscape) ---------------- */

export interface InventoryRow {
  r: { id: string; name: string; barangay: string; surface: string; condition: string; lengthKm: number; widthM: number; lanes: number; aadt: number; pci: number };
  treatment: Treatment; treatmentYear: number; byProjects: boolean; projCount: number;
}

export function InventorySheet({ rows, scopeNote, networkKm, ladder }: {
  rows: InventoryRow[];
  scopeNote: string;
  networkKm: number;
  ladder: Record<string, number>;
}) {
  const stages: { label: Treatment }[] = [
    { label: "Concreting" }, { label: "Asphalting" }, { label: "Road Graveling" }, { label: "Road Opening" },
  ];
  return (
    <div className="print-sheet">
      <SheetHeader sheet="RPIS-INV-02" title="Road Inventory" subtitle={`${scopeNote} · ${rows.length} segments · pavement ladder by latest works`} />
      <SheetBar />
      <div className="pavoid" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, border: `1.5px solid ${INK}`, padding: "8px 12px", background: "#f5f7f0" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: INK, margin: 0, whiteSpace: "nowrap" }}>
          {networkKm.toFixed(1)}<span style={{ fontSize: 12 }}> km opened</span>
        </p>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", height: 12, border: `1px solid ${INK}`, overflow: "hidden" }}>
            {stages.map((s) => (
              <div key={s.label} style={{ width: `${networkKm ? ((ladder[s.label] ?? 0) / networkKm) * 100 : 0}%`, background: TREATMENT_COLOR[s.label] }} />
            ))}
          </div>
        </div>
        <div className="pmono" style={{ display: "flex", gap: 10, fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "#47584d" }}>
          {stages.map((s) => (
            <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <i style={{ width: 8, height: 8, background: TREATMENT_COLOR[s.label], display: "inline-block" }} />
              {TREATMENT_SHORT[s.label]} <b style={{ color: INK }}>{(ladder[s.label] ?? 0).toFixed(1)}</b>
            </span>
          ))}
        </div>
      </div>
      <table className="ptable" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Segment</th><th>Barangay</th><th>Treatment</th><th>Surface</th><th>Condition · PCI</th>
            <th className="r">Length (km)</th><th className="r">Width (m)</th><th className="r">Lanes</th><th className="r">AADT</th><th className="r">Projects</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ r, treatment, treatmentYear, byProjects, projCount }) => (
            <tr key={r.id}>
              <td>
                <p className="pmono" style={{ fontSize: 8.5, color: "#12897e", fontWeight: 700, margin: 0 }}>{r.id}</p>
                <p style={{ fontWeight: 600, margin: "1px 0 0", fontSize: 11 }}>{r.name}</p>
              </td>
              <td style={{ fontSize: 10 }}>{r.barangay}</td>
              <td>
                <span className="pmono" style={{ fontSize: 9, fontWeight: 700, color: TREATMENT_COLOR[treatment], textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {TREATMENT_SHORT[treatment]}{treatmentYear ? ` · ${treatmentYear}` : ""}{byProjects ? "" : " · srv"}
                </span>
              </td>
              <td style={{ fontSize: 10 }}>{r.surface}</td>
              <td style={{ fontSize: 10 }}>{r.condition} · <b>{r.pci}</b></td>
              <td className="r pmono" style={{ fontWeight: 600 }}>{r.lengthKm.toFixed(1)}</td>
              <td className="r pmono">{r.widthM}</td>
              <td className="r pmono">{r.lanes}</td>
              <td className="r pmono">{r.aadt.toLocaleString()}</td>
              <td className="r pmono" style={{ fontWeight: 700 }}>{projCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- PROJECT DETAIL (portrait) ---------------- */

const SECTION_NAME: Record<string, string> = {
  RD: "Road", SHLD: "Road Shoulder", SWLK: "Sidewalk", DRNG: "Drainage System", SLP: "Slope Protection", LITE: "Street Lights",
};

export function ProjectSheet({ record, contractor, engineer, linkedRoad, mapShot }: {
  record: ProjectRecord;
  contractor?: Contractor;
  engineer?: Engineer;
  linkedRoad?: RoadReg;
  mapShot?: string | null;
}) {
  const { parcels, centerlines } = useStore();
  const m = statusOf(record);
  const axis = centerlines.find((c) => c.projectId === record.id) ?? null;
  const row = axis ? runROWAnalysis(parcels, axis) : null;

  const extDays = voTimeExt(record) + soDaysUsed(record);
  const adjustedAmount = record.contractedAmount + voAmount(record);
  const adjustedCompletion = extDays > 0
    ? (() => { const t = new Date(record.contractedCompletion); t.setDate(t.getDate() + extDays); return t.toISOString().slice(0, 10); })()
    : null;

  const tech = record.technical, rev = record.revision?.specs ?? null, act = record.actual?.specs ?? null;
  const specRows = SPEC_ROWS.map((rr) => ({
    rr, tv: tech ? rr.get(tech) : "", rv: rev ? rr.get(rev) : "", av: act ? rr.get(act) : "",
  })).filter((x) => x.tv || x.rv || x.av);

  const images = (record.attachments ?? []).filter((a) => a.kind === "Geotagged Image");

  const Field = ({ k, v }: { k: string; v: ReactNode }) => (
    <div style={{ display: "flex", gap: 12, padding: "5px 2px", borderBottom: "1px solid #e2e7d9", alignItems: "baseline" }}>
      <p className="pmono" style={{ flex: "0 0 168px", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#71826f", margin: 0 }}>{k}</p>
      <p style={{ flex: 1, fontSize: 12.5, fontWeight: 500, margin: 0, lineHeight: 1.45 }}>{v}</p>
    </div>
  );

  const SectionHead = ({ n, t }: { n: string; t: string }) => (
    <div className="phead pavoid" style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px" }}>
      <span style={{ width: 23, height: 23, background: INK, color: AMBER, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{n}</span>
      <p className="pmono" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, color: INK }}>{t}</p>
      <span style={{ flex: 1, height: 2, background: INK }} />
      <span style={{ width: 36, height: 2, background: AMBER }} />
    </div>
  );

  const Money = ({ label, value, tone = INK, sub }: { label: string; value: string; tone?: string; sub?: string }) => (
    <div style={{ flex: 1, background: "#f5f7f0", border: "1px solid #cbd4c2", padding: "8px 12px", minWidth: 0 }}>
      <p className="pmono" style={{ fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#71826f", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: tone, margin: "2px 0 0", lineHeight: 1 }}>{value}</p>
      {sub && <p className="pmono" style={{ fontSize: 8.5, color: "#71826f", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sub}</p>}
    </div>
  );

  let sec = 0;
  const no2 = () => String(++sec).padStart(2, "0");
  const idNo = no2(), partyNo = no2(), locNo = no2();
  const mapNo = mapShot ? no2() : "";
  const scopeNo = no2(), schedNo = no2();
  const techNo = specRows.length ? no2() : "";
  const rowNo = row ? no2() : "";
  const ordNo = record.variations.length || record.suspensions.length ? no2() : "";
  const photoNo = no2(), notesNo = no2();

  return (
    <div className="print-sheet print-portrait">
      <SheetHeader sheet={record.id} title={record.name} subtitle={`${typeAbbr(record.type)} · ${record.type} · ${record.mode} · ${record.fund}`} />
      <SheetBar />

      {/* status band */}
      <div className="pavoid" style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, background: INK, padding: "10px 14px" }}>
        <span className="pmono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: m.color, border: `1.5px solid ${m.color}`, padding: "3px 10px", background: m.soft }}>{m.label}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }} className="pmono">
            <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#cbd4c2" }}>Physical completion — encoded status</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{record.percent}%</span>
          </div>
          <div style={{ height: 10, marginTop: 5, background: "rgba(255,255,255,0.14)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${record.percent}%`, height: "100%", background: m.color }} />
          </div>
        </div>
        <div className="pmono" style={{ textAlign: "right" }}>
          <p style={{ fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#cbd4c2", margin: 0 }}>Object account · UACS</p>
          <p style={{ fontSize: 12, fontWeight: 700, margin: "2px 0 0", color: "#f5f7f0" }}>{record.objectCode}</p>
        </div>
      </div>

      <SectionHead n={idNo} t="Project Identification" />
      <div className="pavoid" style={{ border: `1.5px solid ${INK}`, padding: "4px 14px 8px" }}>
        <Field k="Project ID" v={<span className="pmono" style={{ fontWeight: 700 }}>{record.id}</span>} />
        <Field k="Name of road project" v={<span style={{ fontSize: 14, fontWeight: 700 }}>{record.name}</span>} />
        <Field k="Project type" v={`${record.type} (${typeAbbr(record.type)})`} />
        <Field k="Road treatment" v={record.treatment ? <b style={{ color: TREATMENT_COLOR[record.treatment] }}>{record.treatment}</b> : <span style={{ color: "#71826f" }}>— non-pavement work</span>} />
        <Field k="Mode of implementation" v={record.mode} />
        <Field k="Source of fund" v={record.fund} />
        <Field k="Object account code" v={<span className="pmono">{record.objectCode}</span>} />
        <Field k="File folder number" v={<span className="pmono" style={{ fontWeight: 700 }}>{record.folderNo}</span>} />
        <Field k="Year of project bid" v={String(record.bidYear)} />
      </div>

      <SectionHead n={partyNo} t="Parties & Linkages" />
      <div className="pavoid" style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, border: `1.5px solid ${INK}`, padding: "8px 12px" }}>
          <p className="pmono" style={{ fontSize: 8.5, letterSpacing: "0.16em", textTransform: "uppercase", color: AMBER, background: INK, margin: "-8px -12px 7px", padding: "4px 12px" }}>Project Implementor · FK</p>
          {contractor ? (<>
            <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0 }}>{contractor.name}</p>
            <p className="pmono" style={{ fontSize: 10, color: "#47584d", margin: "3px 0 0" }}>PCAB {contractor.pcab} · {contractor.category}</p>
            <p style={{ fontSize: 10.5, color: "#47584d", margin: "3px 0 0" }}>{contractor.address}</p>
            <p className="pmono" style={{ fontSize: 10, color: "#47584d", margin: "3px 0 0" }}>{contractor.contactPerson} · {contractor.phone}</p>
          </>) : <p style={{ fontSize: 11, color: "#71826f", margin: 0 }}>Not linked.</p>}
        </div>
        <div style={{ flex: 1, border: `1.5px solid ${INK}`, padding: "8px 12px" }}>
          <p className="pmono" style={{ fontSize: 8.5, letterSpacing: "0.16em", textTransform: "uppercase", color: AMBER, background: INK, margin: "-8px -12px 7px", padding: "4px 12px" }}>Project In-Charge · FK</p>
          {engineer ? (<>
            <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0 }}>{engineer.name}</p>
            <p className="pmono" style={{ fontSize: 10, color: "#47584d", margin: "3px 0 0" }}>{engineer.position} · {engineer.unit}</p>
            <p className="pmono" style={{ fontSize: 10, color: "#47584d", margin: "3px 0 0" }}>PRC {engineer.prc} · {engineer.phone}</p>
            <p className="pmono" style={{ fontSize: 10, color: "#47584d", margin: "3px 0 0" }}>{engineer.email}</p>
          </>) : <p style={{ fontSize: 11, color: "#71826f", margin: 0 }}>Not linked.</p>}
        </div>
      </div>
      <div className="pavoid" style={{ border: `1.5px solid ${INK}`, borderTop: "none", padding: "4px 14px 6px" }}>
        <Field k="Linked road / street" v={linkedRoad ? <><b>{linkedRoad.name}</b> <span className="pmono" style={{ color: "#47584d" }}>({linkedRoad.id} · {linkedRoad.roadClass} · {linkedRoad.surface})</span></> : <span style={{ color: "#71826f" }}>— none registered</span>} />
      </div>

      <SectionHead n={locNo} t="Location — Barangay Coverage" />
      <div className="pavoid" style={{ border: `1.5px solid ${INK}`, padding: "8px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {record.location.barangays.map((b) => (
            <span key={b} className="pmono" style={{ background: INK, color: "#f5f7f0", padding: "3px 9px", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em" }}>BRGY. {b.toUpperCase()}</span>
          ))}
          {record.location.barangays.length > 1 && (
            <span className="pmono" style={{ background: AMBER, color: INK, padding: "3px 9px", fontSize: 10.5, fontWeight: 700 }}>MULTI · {record.location.barangays.length} BRGYS</span>
          )}
        </div>
      </div>

      {mapNo && mapShot && (
        <>
          <SectionHead n={mapNo} t="Project Map — Location & Corridor" />
          <div className="pavoid" style={{ border: `2px solid ${INK}` }}>
            <img src={mapShot} alt={`${record.name} — location and corridor map`} style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "cover", objectPosition: "center" }} />
            <p className="pmono" style={{ fontSize: 9, color: "#47584d", padding: "5px 10px", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase", background: "#f5f7f0" }}>
              Lot &amp; ROW view · centerline axis {axis?.id ?? ""} · affected lots (green government / red private) · OpenStreetMap · EPSG:3857
            </p>
          </div>
        </>
      )}

      <SectionHead n={scopeNo} t="Scope & Financials" />
      <div className="pavoid" style={{ display: "flex", gap: 10 }}>
        <Money label="Linear length" value={`${record.linearLength.toLocaleString()} m`} sub="station extent" />
        <Money label="Contracted amount" value={fmtPesoM(record.contractedAmount)} />
        <Money label="Actual amount" value={record.actualAmount ? fmtPesoM(record.actualAmount) : "—"} sub={record.actualAmount ? `${Math.round((record.actualAmount / (record.contractedAmount || 1)) * 100)}% of contract` : "not yet billed"} />
        <Money label="Variance" value={fmtPesoM(record.contractedAmount - record.actualAmount)} tone={(record.contractedAmount - record.actualAmount) >= 0 ? "#175c43" : "#b84423"} />
      </div>

      <SectionHead n={schedNo} t="Schedule & Status" />
      <div className="pavoid" style={{ border: `1.5px solid ${INK}`, padding: "4px 14px 8px" }}>
        <Field k="Contracted start" v={fmtDate(record.contractedStart)} />
        <Field k="Contracted completion" v={fmtDate(record.contractedCompletion)} />
        <Field k="Actual start" v={fmtDate(record.actualStart)} />
        <Field k="Actual completion" v={fmtDate(record.actualCompletion)} />
        <Field k="Actual project duration" v={<b>{durationOf(record)}</b>} />
        {adjustedCompletion && (
          <Field k="Adjusted completion" v={<><b style={{ color: "#cf8812" }}>{fmtDate(adjustedCompletion)}</b> <span className="pmono" style={{ color: "#47584d" }}>(+{extDays} d from orders) · adjusted contract {fmtPesoM(adjustedAmount)}</span></>} />
        )}
      </div>

      {techNo && specRows.length > 0 && (
        <>
          <SectionHead n={techNo} t="Technical Detail — Designed / Revised / As-Built" />
          <table className="ptable">
            <thead><tr><th style={{ width: "40%" }}>Item</th><th>As-designed</th><th>Revised</th><th>As-built</th></tr></thead>
            <tbody>
              {(() => {
                let prev = "";
                return specRows.map(({ rr, tv, rv, av }) => {
                  const diff = (v: string) => v !== "" && tv !== "" && v !== tv;
                  const isNew = rr.section !== prev;
                  prev = rr.section;
                  return (
                    <FragmentRow key={rr.section + rr.label} head={isNew ? SECTION_NAME[rr.section] ?? rr.section : null}>
                      <td>
                        <span className="pmono" style={{ fontSize: 9, color: "#12897e", fontWeight: 700, marginRight: 6 }}>{rr.section}</span>
                        {rr.label}{rr.unit ? <span style={{ color: "#71826f" }}> ({rr.unit})</span> : null}
                      </td>
                      <td className="pmono">{tv || "—"}</td>
                      <td className="pmono" style={diff(rv) ? { color: "#cf8812", fontWeight: 700 } : undefined}>{rv || "—"}{diff(rv) ? " Δ" : ""}</td>
                      <td className="pmono" style={diff(av) ? { color: "#175c43", fontWeight: 700 } : undefined}>{av || "—"}{diff(av) ? " Δ" : ""}</td>
                    </FragmentRow>
                  );
                });
              })()}
            </tbody>
          </table>
        </>
      )}

      {rowNo && row && axis && (
        <>
          <SectionHead n={rowNo} t="Lot Overlap & Right-of-Way Impact" />
          <div className="pavoid" style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <Money label="Lots overlapped" value={String(row.rows.length)} sub={`${row.rows.filter((x) => x.ownerType === "Government").length} govt · ${row.rows.filter((x) => x.ownerType === "Private").length} private`} />
            <Money label="Corridor area" value={fmtArea(row.corridorAreaM2)} sub={`axis ${axis.id} · ±${axis.radiusM} m`} />
            <Money label="Private affected" value={fmtArea(row.privM2)} tone="#b84423" sub="subject to acquisition" />
            <Money label="ROW acquisition cost" value={fmtPesoM(row.totalCost)} tone="#b84423" />
          </div>
          {row.rows.length > 0 && (
            <table className="ptable">
              <thead><tr><th>Lot</th><th>Owner</th><th>Type</th><th className="r">Affected</th><th className="r">%</th><th className="r">ROW cost</th></tr></thead>
              <tbody>
                {row.rows.map((x) => (
                  <tr key={x.lotId}>
                    <td className="pmono" style={{ fontWeight: 700 }}>{x.lotId}</td>
                    <td>{x.owner}</td>
                    <td><span className="pmono" style={{ fontSize: 9, fontWeight: 700, color: x.ownerType === "Government" ? "#175c43" : "#b84423", textTransform: "uppercase" }}>{x.ownerType}</span></td>
                    <td className="r pmono" style={{ fontWeight: 700 }}>{fmtArea(x.affectedM2)}</td>
                    <td className="r pmono">{x.pct}%</td>
                    <td className="r pmono" style={{ fontWeight: 700, color: x.cost ? "#b84423" : "#175c43" }}>{x.cost ? fmtPesoM(x.cost) : "₱0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {ordNo && (record.variations.length > 0 || record.suspensions.length > 0) && (
        <>
          <SectionHead n={ordNo} t="Variation & Suspension Orders" />
          {record.variations.length > 0 && (
            <table className="ptable" style={{ marginBottom: 8 }}>
              <thead><tr><th>Variation · OO No.</th><th className="r">Revised amount</th><th className="r">Time ext.</th><th>Requested</th><th>Approved</th></tr></thead>
              <tbody>
                {record.variations.map((v) => (
                  <tr key={v.id}>
                    <td className="pmono" style={{ fontWeight: 700 }}>{v.orderNo}{v.remarks ? <span style={{ display: "block", fontWeight: 400, color: "#47584d", fontSize: 9.5 }}>{v.remarks}</span> : null}</td>
                    <td className="r pmono" style={{ fontWeight: 700, color: v.revisedAmount >= 0 ? "#175c43" : "#b84423" }}>{v.revisedAmount >= 0 ? "+" : ""}{fmtPesoM(v.revisedAmount)}</td>
                    <td className="r pmono">{v.timeExtensionDays ? `+${v.timeExtensionDays} d` : "—"}</td>
                    <td>{fmtDate(v.dateRequested)}</td>
                    <td>{fmtDate(v.dateApproved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {record.suspensions.length > 0 && (
            <table className="ptable">
              <thead><tr><th>Suspension · OO No.</th><th>Suspended</th><th>Resumed</th><th className="r">Duration</th><th className="r">Days used</th></tr></thead>
              <tbody>
                {record.suspensions.map((s) => (
                  <tr key={s.id}>
                    <td className="pmono" style={{ fontWeight: 700 }}>{s.orderNo}{s.remarks ? <span style={{ display: "block", fontWeight: 400, color: "#47584d", fontSize: 9.5 }}>{s.remarks}</span> : null}</td>
                    <td>{fmtDate(s.dateSuspended)}</td>
                    <td>{fmtDate(s.dateResumed)}</td>
                    <td className="r pmono">{s.durationDays} d</td>
                    <td className="r pmono" style={{ fontWeight: 700 }}>{s.daysUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <SectionHead n={photoNo} t={`Field Photo Attachments · ${images.length}`} />
      {images.length === 0 ? (
        <p className="pavoid" style={{ fontSize: 11, color: "#71826f", border: "1px dashed #cbd4c2", padding: "8px 12px", margin: 0 }}>
          No geotagged image attachments on this record. PDF supporting documents are excluded from the printed copy.
        </p>
      ) : (
        <div className="pavoid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {images.map((a) => (
            <div key={a.id} style={{ border: `1.5px solid ${INK}`, background: "#f5f7f0" }}>
              {(a.thumb || a.raw)
                ? <img src={a.raw || a.thumb} alt={a.name} style={{ width: "100%", height: 150, objectFit: "cover", display: "block", borderBottom: `1.5px solid ${INK}` }} />
                : <div style={{ height: 150, display: "grid", placeItems: "center", color: "#71826f", fontFamily: "var(--font-mono)", fontSize: 10, borderBottom: `1.5px solid ${INK}` }}>no preview archived</div>}
              <div style={{ padding: "6px 9px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                <p className="pmono" style={{ fontSize: 9.5, color: "#47584d", margin: "2px 0 0" }}>
                  {a.lat != null ? <b>{a.lat.toFixed(5)}N · {a.lng!.toFixed(5)}E</b> : "no GPS metadata"} · captured {a.uploadedAt.slice(0, 10)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionHead n={notesNo} t="Notes & Remarks" />
      <div className="pavoid" style={{ border: `1.5px solid ${INK}`, background: "#f5f7f0", padding: "8px 14px", minHeight: 40 }}>
        <p style={{ fontSize: 12, margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{record.notes?.trim() || "—"}</p>
      </div>

      <div style={{ display: "flex", marginTop: 26 }}>
        <SigBlock role="Prepared by" name={engineer?.name ?? "Project In-Charge"} note={engineer?.position} />
        <SigBlock role="Checked by" name="Engr. Maria L. Fernandez" note="Assistant City Engineer" />
        <SigBlock role="Approved by" name="Engr. Ramon C. Villanueva" note="City Engineer" />
      </div>
    </div>
  );
}

function FragmentRow({ head, children }: { head: string | null; children: ReactNode }) {
  return (
    <>
      {head && (
        <tr style={{ background: "#edf0e6" }}>
          <td colSpan={4} className="pmono" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#175c43" }}>▸ {head}</td>
        </tr>
      )}
      <tr>{children}</tr>
    </>
  );
}

function SigBlock({ role, name, note }: { role: string; name: string; note?: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "0 8px" }}>
      <div style={{ borderTop: `1.5px solid ${INK}`, marginTop: 34, paddingTop: 5 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, margin: 0 }}>{name}</p>
        <p className="pmono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#47584d", margin: "2px 0 0" }}>{role}</p>
        {note && <p className="pmono" style={{ fontSize: 8.5, color: "#71826f", margin: "1px 0 0" }}>{note}</p>}
      </div>
    </div>
  );
}


