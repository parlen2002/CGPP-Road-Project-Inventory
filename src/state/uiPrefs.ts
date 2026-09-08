/* Look & feel preferences — theme mode, display/body font faces and UI font
   scale. Managed by the Program Admin under Access Control. Applied to
   document.documentElement and persisted. Print output is unaffected (it uses
   its own fixed styles inside #print-root). */

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "pastel" | "highend" | "cartoon" | "vibrant";

export interface UiPrefs {
  mode: ThemeMode;
  displayFont: string;  // css font-family value
  bodyFont: string;
  fontScale: number;    // 0.9 – 1.2
}

export interface ThemeMeta { id: ThemeMode; label: string; desc: string; sw: [string, string, string]; }

export const THEMES: ThemeMeta[] = [
  { id: "light", label: "Light", desc: "Paper & ink · the field standard", sw: ["#f5f7f0", "#0c1913", "#f0a32b"] },
  { id: "dark", label: "Dark", desc: "Slate shell · low-light offices", sw: ["#1b241e", "#e9efe6", "#ffc24d"] },
  { id: "pastel", label: "Pastel", desc: "Soft sage · gentle on the eyes", sw: ["#f3f6ea", "#3d5044", "#d9a83f"] },
  { id: "highend", label: "High-End", desc: "Porcelain & brass · executive finish", sw: ["#f6f3ea", "#241f18", "#c9a227"] },
  { id: "cartoon", label: "Cartoon", desc: "Bold ink & primary pop", sw: ["#fdf7e9", "#253a5e", "#ff6b35"] },
  { id: "vibrant", label: "Vibrant", desc: "Saturated signal colors", sw: ["#f4f7fd", "#1b2a4a", "#ff8f00"] },
];

export const DISPLAY_FONTS: { label: string; value: string }[] = [
  { label: "Barlow Condensed (default)", value: `"Barlow Condensed", "Arial Narrow", sans-serif` },
  { label: "Oswald", value: `"Oswald", "Arial Narrow", sans-serif` },
  { label: "Anton", value: `"Anton", "Arial Narrow", sans-serif` },
  { label: "Big Shoulders Display", value: `"Big Shoulders Display", "Arial Narrow", sans-serif` },
];

export const BODY_FONTS: { label: string; value: string }[] = [
  { label: "IBM Plex Sans (default)", value: `"IBM Plex Sans", system-ui, sans-serif` },
  { label: "Manrope", value: `"Manrope", system-ui, sans-serif` },
  { label: "Source Sans 3", value: `"Source Sans 3", system-ui, sans-serif` },
  { label: "Public Sans", value: `"Public Sans", system-ui, sans-serif` },
];

export const FONT_SCALES: { label: string; value: number }[] = [
  { label: "Small · 90%", value: 0.9 },
  { label: "Default · 100%", value: 1 },
  { label: "Comfortable · 110%", value: 1.1 },
  { label: "Large · 120%", value: 1.2 },
];

const KEY = "rpis-uiprefs-v1";
const DEFAULTS: UiPrefs = {
  mode: "light",
  displayFont: DISPLAY_FONTS[0].value,
  bodyFont: BODY_FONTS[0].value,
  fontScale: 1,
};

let prefs: UiPrefs = load();
const listeners = new Set<() => void>();

function load(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<UiPrefs>;
      return { ...DEFAULTS, ...p };
    }
  } catch { /* use defaults */ }
  return { ...DEFAULTS };
}

export function applyPrefs(p: UiPrefs) {
  const el = document.documentElement;
  el.dataset.theme = p.mode;
  el.style.setProperty("--font-display", p.displayFont);
  el.style.setProperty("--font-body", p.bodyFont);
  el.style.setProperty("--ui-zoom", String(p.fontScale));
}

export function getPrefs(): UiPrefs {
  return prefs;
}

export function setPrefs(patch: Partial<UiPrefs>) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  applyPrefs(prefs);
  listeners.forEach((l) => l());
}

export function useUiPrefs(): UiPrefs {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    applyPrefs(prefs); // ensure applied on mount
    l();
    return () => { listeners.delete(l); };
  }, []);
  return prefs;
}

/* apply once as early as possible (before first paint) */
if (typeof document !== "undefined") applyPrefs(prefs);
