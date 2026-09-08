# CGPP-Road-Project-Inventory
Django PostGIS Road Inventory System

**Version:** 3.0 (Rev C)  
**Client:** Office of the City Engineer (OCE) · GIS Unit  
**Location:** Puerto Princesa City · Palawan · Republic of the Philippines  

RPIS is a comprehensive, local-first Geographic Information System (GIS) dashboard designed for municipal infrastructure management. It provides city engineers and planners with real-time spatial data, road inventory tracking, cadastre analysis, and project monitoring, featuring a highly responsive, offline-capable architecture.

---

## 🌟 Key Features

- **Interactive GIS Mapping:** High-performance spatial visualization using `react-leaflet`, with dynamic focus, zoom, and custom WMS layer integration.
- **Drag-and-Drop Management:** Intuitive reordering of project records, attachments, and inventory items using `@dnd-kit`.
- **Unified Data Model:** A single source of truth for personnel, user accounts, contractors, and project records, preventing data drift and ensuring referential integrity.
- **Advanced Analytics:** Data visualization and reporting dashboards powered by `recharts`.
- **Report Generation:** Client-side map and document export capabilities using `html2canvas` for official signatories and printing.
- **Resilient Local-First Architecture:** Custom `useSyncExternalStore` engine that persists state to `localStorage` instantly, splitting large raw file archives to prevent quota limits, with optional Supabase synchronization.

---

## 🛠️ Tech Stack

### Core Frontend
- **Framework:** React 18 + TypeScript (ES Modules)
- **Build Tool:** Vite 6.3
- **Styling:** Tailwind CSS v4 (with custom technical/brutalist theme)
- **Animations:** Framer Motion

### Mapping & Visualization
- **GIS Engine:** Leaflet + `react-leaflet`
- **Charts:** Recharts

### Backend & Services
- **Authentication / Database:** Supabase (`@supabase/supabase-js`)
- **Local Persistence:** Custom `localStorage` snapshot engine with raw archive separation

### Utilities
- **Routing:** React Router DOM (with custom state-based fallbacks)
- **Icons:** Lucide React + Custom SVGs
- **Data/Time:** `date-fns`, `uuid`
- **Export:** `html2canvas`, `canvas-confetti` (for UX feedback)

---

## 📂 Project Structure

```text
src/
├── App.tsx                 # Main application shell, error boundaries, and layout
├── components/             # Reusable UI components
│   ├── MapView.tsx         # Core React-Leaflet map implementation
│   ├── Sidebar.tsx         # Navigation (with dnd-kit capabilities if applicable)
│   ├── TopBar.tsx          # Header, user controls, and global actions
│   ├── toast.tsx           # Notification system
│   └── icons.tsx           # Custom SVG icons (e.g., OCE Seal)
├── data/                   # Domain logic, seed data, and TypeScript definitions
│   ├── auth.ts             # Roles, capabilities, and guest definitions
│   ├── barangays.ts        # Geographic data for districts
│   ├── cadastre.ts         # Parcels and road centerlines
│   ├── catalogs.ts         # Standardized materials and templates
│   ├── registry.ts         # Core project records, contractors, personnel
│   └── roadsRegistry.ts    # Road network definitions
├── state/                  # Global state management
│   ├── authStore.ts        # Supabase authentication and session logic
│   └── store.ts            # Centralized local-first state store (Snapshot, Mutations)
└── pages/                  # Feature modules
    ├── AuthScreen.tsx      # Secure Supabase login/session establishment
    ├── Overview.tsx        # Main GIS dashboard (Map + Ticker)
    ├── Inventory.tsx       # Road inventory details (with drag-and-drop)
    ├── Projects.tsx        # Infrastructure projects lifecycle
    ├── LotAnalysis.tsx     # Cadastre and lot mapping
    ├── Analytics.tsx       # Recharts data reporting
    └── System.tsx          # Admin, roles, and settings
├── state/                  # Global state management
│   ├── authStore.ts        # Authentication and session logic
│   └── store.ts            # Centralized state store (Snapshot, Mutations, Persistence)
└── pages/                  # Feature modules (Overview, Inventory, Projects, Analytics, etc.)
