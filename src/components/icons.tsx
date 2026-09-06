/* Hand-drawn inline SVG icon set — 1.7px stroke, currentColor. */

interface P { size?: number; className?: string; }

const base = (p: P) => ({
  width: p.size ?? 18,
  height: p.size ?? 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  "aria-hidden": true,
});

export const Seal = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 4.8v2.4M12 16.8v2.4M4.8 12h2.4M16.8 12h2.4" />
    <path d="M8.2 15.4 12 7.4l3.8 8" />
    <path d="M9.6 13.4h4.8" />
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
    <path d="M5.5 20 9 4M18.5 20 15 4" />
    <path d="M12 5v2.6M12 11v2.6M12 17v2.6" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </svg>
);

export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4v16h16" />
    <path d="m7 14 3.5-4 3 2.5L18 7" />
  </svg>
);

export const IconStack = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="4.5" rx="1" />
    <rect x="4" y="10" width="16" height="4.5" rx="1" />
    <rect x="4" y="16" width="16" height="4.5" rx="1" />
    <path d="M7 6.2h.01M7 12.2h.01M7 18.2h.01" strokeWidth="2.4" />
  </svg>
);

export const IconParcels = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
  </svg>
);

export const IconBarangay = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 19.5 6.8v7.4L12 20.5l-7.5-6.3V6.8L12 3.5Z" />
    <path d="M9.2 13.5v-3l2.8-2.3 2.8 2.3v3h-2v-2.2h-1.6v2.2h-2Z" />
  </svg>
);

export const IconStreet = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20V4M20 20V4M4 9h16M4 15h16" />
    <path d="M8 4v5M15 9v6" strokeWidth="1.2" opacity="0.7" />
  </svg>
);

export const IconBoard = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4" width="17" height="13" rx="1" />
    <path d="M8 8h8M8 11h5M12 17v3M8.5 20h7" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconFilter = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8L4 5Z" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v10M12 14l-4-4M12 14l4-4M4.5 18.5h15" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 14V4M12 4 8 8M12 4l4 4M4.5 18.5h15" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
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

export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.8-5.6-6.8-10.6a6.8 6.8 0 1 1 13.6 0C18.8 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.2" r="2.4" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconUser = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="5.5" width="16" height="15" rx="1.5" />
    <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" />
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

export const IconCamera = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);

export const IconPrinter = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 8V3.5h10V8M7 17H4.5V9.5A1.5 1.5 0 0 1 6 8h12a1.5 1.5 0 0 1 1.5 1.5V17H17" />
    <rect x="7" y="14" width="10" height="6.5" />
    <path d="M16.5 10.8h.01" strokeWidth="2.4" />
  </svg>
);

export const IconLogout = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
    <path d="M9 8l-4 4 4 4M5 12h11" />
  </svg>
);

export const IconPalette = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.5-1.8-.3-.9.2-1.7 1.2-1.7h1.8c2 0 3-1.3 3-3.5 0-5-3.6-10-7.5-10Z" />
    <circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
