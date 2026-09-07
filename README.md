# CGPP-Road-Project-Inventory
Django PostGIS Road Inventory System

# RPIS (Road & Property Information System)

**Version:** 3.0 (Rev C)  
**Client:** Office of the City Engineer (OCE) · GIS Unit  
**Location:** Puerto Princesa City · Palawan · Republic of the Philippines  

RPIS is a comprehensive, enterprise-grade Geographic Information System (GIS) dashboard designed for municipal infrastructure management. It provides city engineers and planners with real-time spatial data, road inventory tracking, cadastre analysis, and project monitoring.

---

## 🌟 Key Features

- **Interactive GIS Overview:** High-performance map view with dynamic focus, zoom, and spatial querying.
- **Road & Project Lifecycle Management:** Detailed tracking of road networks, infrastructure projects, suspensions, and variation orders.
- **Unified Personnel & Accounts:** System users, project signatories, and personnel board profiles share a single dataset, preventing data drift.
- **Cadastre & Lot Analysis:** Spatial analysis tools for property lines, parcels, and centerline mapping.
- **Granular RBAC:** Role-Based Access Control with specific capabilities (Create, Read, Update, Delete, Catalog, Users, Print).
- **Resilient UI:** Custom Error Boundaries to prevent silent white-screen failures, with built-in data reseeding capabilities.

---

## 🏗️ Architecture & Data Model

RPIS operates as a highly responsive, offline-capable client application backed by a custom state-management engine.

- **Single Source of Truth (`Snapshot`):** The entire application state is held in a centralized `Snapshot` object managed via React's `useSyncExternalStore`.
- **High-Performance Persistence:** State is persisted to `localStorage`. To ensure UI mutations remain instant and to avoid quota limits, large file attachments (Raw Archives) are split and stored in separate `localStorage` keys (`rpis-raw:*`), rehydrating only when needed.
- **Referential Integrity:** Deleting a contractor, barangay, or road registry item automatically cascades through the database, unlinking or cleaning up associated project records.

### Core Domain Entities
| Entity | Description |
| :--- | :--- |
| `ProjectRecord` | Infrastructure projects with technical specs, revisions, actuals, suspensions, and variations. |
| `Person` / `Contractor` | Unified personnel/user accounts and external implementors. |
| `Parcel` / `Centerline` | Cadastral lots and road centerlines for spatial mapping. |
| `Barangay` / `RoadReg` | Geographic and administrative district/street registries. |
| `CatalogItem` | Standardized materials, specs, or project templates. |

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Styling:** TailwindCSS (Custom "Technical/Brutalist" Theme)
- **State Management:** Custom `useSyncExternalStore` implementation with `localStorage` persistence
- **Build Tool:** Vite (inferred)

### Backend & GIS Infrastructure
- **Backend API:** Django 6.1
- **Spatial Database:** PostGIS 3.5
- **Geospatial Libraries:** GDAL 3.10
- **Map Services:** GeoServer WMS
- **Coordinate Systems:** EPSG:4326 / EPSG:3857

---

## 📂 Project Structure

```text
src/
├── App.tsx                 # Main application shell, routing, and layout
├── components/             # Reusable UI components (TopBar, Sidebar, MapView, Toast)
├── data/                   # Domain logic, seed data, and type definitions
│   ├── auth.ts             # Roles, capabilities, and guest definitions
│   ├── barangays.ts        # Barangay geographic data and types
│   ├── cadastre.ts         # Parcels and centerlines generation
│   ├── catalogs.ts         # Standardized catalog items
│   ├── registry.ts         # Core project records, contractors, personnel
│   └── roadsRegistry.ts    # Road network definitions
├── state/                  # Global state management
│   ├── authStore.ts        # Authentication and session logic
│   └── store.ts            # Centralized state store (Snapshot, Mutations, Persistence)
└── pages/                  # Feature modules (Overview, Inventory, Projects, Analytics, etc.)
