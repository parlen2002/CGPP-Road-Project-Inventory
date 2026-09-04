interface P {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const base = (p: P) => ({
  width: p.size ?? 18,
  height: p.size ?? 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  "aria-hidden": true,
});

/* Seal of the City Engineer — road converging to horizon with survey rays */
export const Seal = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14.4" strokeWidth="1.4" />
    <circle cx="16" cy="16" r="11.2" strokeWidth="0.8" opacity="0.55" />
    <path d="M10.5 24 L14.2 11 M21.5 24 L17.8 11" strokeWidth="1.5" />
    <path d="M16 24 L16 11.6" strokeDasharray="1.6 2.2" strokeWidth="1.3" />
    <path d="M8.2 9.4 L13 12.4 M23.8 9.4 L19 12.4 M16 5.6 L16 10.6" strokeWidth="1.2" opacity="0.8" />
    <circle cx="16" cy="11" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

export const IconMap = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const IconRoad = (p: P) => (
  <svg {...base(p)}>
    <path d="M5.5 20.5 9.5 3.5h1.6l1 8.5-1 8.5H5.5Z M18.5 20.5l-4-17h-1.6" />
    <path d="M12.6 6.5v2M12.3 11v2M12 15.5v2" strokeWidth="1.5" />
    <path d="M17.8 20.5 15 8.5" opacity="0" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
    <path d="m3.5 12 8.5 4.5 8.5-4.5" />
    <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
  </svg>
);

export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4v16h16" />
    <path d="M8 16v-5M12 16V7M16 16v-8M20 16V4" strokeWidth="2" />
  </svg>
);

export const IconStack = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
    <path d="M4.5 11.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
  </svg>
);

export const IconCrosshair = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);

export const IconFilter = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16l-6.2 7.2V19l-3.6-1.8v-5L4 5Z" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v11M7.5 9.5 12 14l4.5-4.5" />
    <path d="M4 16.5V20h16v-3.5" />
  </svg>
);

export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.5-5.8-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21Z" />
    <circle cx="12" cy="10.3" r="2.3" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.2l3.4 2" />
  </svg>
);

export const IconRuler = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.8" y="9" width="18.4" height="6" rx="0.5" />
    <path d="M6.5 9v2.6M10.2 9v3.8M13.8 9v2.6M17.5 9v3.8" />
  </svg>
);

export const IconCompass = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2.2 5-5 2.2 2.2-5 5-2.2Z" />
  </svg>
);

export const IconTerminal = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="15" rx="1" />
    <path d="m7 9.5 3 2.8-3 2.8M12.5 15.5H17" />
  </svg>
);

export const IconSort = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 4v16M8 20l-3-3M8 20l3-3M16 20V4M16 4l-3 3M16 4l3 3" />
  </svg>
);

export const IconEdit = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19.3 8.7a2.12 2.12 0 0 0-3-3L5 17l-1 3Z" />
    <path d="m13.8 7.2 3 3" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9.2 7V4.8h5.6V7M6.3 7l1 13.2h9.4L17.7 7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconSave = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4h11l3.5 3.5V20H5V4Z" />
    <path d="M8 4v5h7V4M8 20v-6h8v6" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconUser = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconCamera = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const IconFolder = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

export const NorthArrow = (p: P) => (
  <svg {...base(p)} viewBox="0 0 24 24">
    <path d="M12 2.8 16.4 19l-4.4-3.2L7.6 19 12 2.8Z" fill="currentColor" stroke="none" opacity="0.9" />
    <text x="12" y="23.4" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontFamily="IBM Plex Mono, monospace">N</text>
  </svg>
);
