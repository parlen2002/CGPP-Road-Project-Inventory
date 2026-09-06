/* Look & feel preferences — theme mode, display/body font faces and UI font
   scale. Managed by the Program Admin under Access Control. Applied to
   document.documentElement and persisted. Print output is unaffected (it uses
   its own fixed styles inside #print-root). */

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "pastel";

export interface UiPrefs {
  mode: ThemeMode;
  displayFont: string;  // css font-family value
  bodyFont: string;
  fontScale: number;    // 0.9 – 1.2
}

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
