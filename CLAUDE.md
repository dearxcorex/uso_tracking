# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack at http://localhost:3000
- `npm run build` - Run `prisma generate` then build production app with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npx prisma migrate dev` - Apply database migrations (development)
- `npx prisma generate` - Regenerate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio GUI

### Data Import
- `python scripts/import_data.py` - Import USO service points from `data_uso.xlsx` into PostgreSQL
  - Reads sheet "พท. รวมทั้งหมด (ใหม่)", filters for ชัยภูมิ province
  - Auto-installs openpyxl and psycopg2-binary
  - Reads DATABASE_URL from `.env`
  - Clears existing data before import, batch inserts (100 rows per batch)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (Neon, required). Format: `postgresql://user:password@host:port/database?sslmode=require`

## Architecture Overview

### Application Structure
USONet is a USO (Universal Service Obligation) service points dashboard and project tracker for NBTC, built with **Next.js 15**, **TypeScript**, **React 19**, **Tailwind CSS 4**, **Prisma ORM**, and **react-leaflet** for maps. It tracks USO service points across Chaiyaphum Province, Thailand.

### Routing
Single-page app on root `/`. No Next.js file-based routing for pages — all navigation is **client-side tab switching** managed by `Dashboard.tsx` via `activeTab` state. Six tabs: `dashboard`, `service-points`, `map`, `projects`, `tasks`, `settings`.

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Component Structure

- **`Dashboard.tsx`** — Main orchestrator: manages `activeTab`, fetches `/api/stats`, conditionally renders tab content
- **`NavSidebar.tsx`** — Desktop left sidebar, expand-on-hover (64px → 200px)
- **`client/AppHeader.tsx`** — Top bar with title, theme toggle, user avatar
- **`client/MobileNav.tsx`** — Mobile bottom nav (`lg:hidden`)
- **`dashboard/StatsCards.tsx`** — 6 stat cards (total points, Zone C+, Zone C, Wi-Fi หมู่บ้าน, Mobile, อื่นๆ)
- **`dashboard/ServicePointTable.tsx`** — Paginated table (50/page) with 5 filter dropdowns + search
- **`dashboard/ServicePointMap.tsx`** — React-Leaflet map with OpenStreetMap tiles, inspection status toggle, Google Maps navigation link
- **`dashboard/DistrictBreakdown.tsx`** — Horizontal bar chart by district
- **`dashboard/ProviderChart.tsx`** — CSS donut chart by provider (CAT, TOT, True Move H)
- **`dashboard/ProjectList.tsx`** — Project cards (uses mock data)
- **`dashboard/TaskBoard.tsx`** — 4-column Kanban (To Do, In Progress, Review, Done; mock data)
- **`dashboard/SettingsPanel.tsx`** — Theme toggle + about info
- **`dashboard/RecentActivity.tsx`** — Hardcoded activity timeline

### API Routes

| Endpoint | Methods | Description |
|---|---|---|
| `/api/stats` | GET | Aggregated USO stats: totals, grouped by zone/service/district/provider |
| `/api/service-points` | GET | Paginated service points with filtering (district, zone, service, provider, search; 50/page) |
| `/api/service-points/map` | GET | All service points with coordinates for map visualization |
| `/api/service-points/[id]/inspect` | PATCH | Toggle inspection status & `inspected_at` timestamp |
| `/api/projects` | GET, POST | List/create projects (DB-backed) |
| `/api/tasks` | GET, POST | List/create tasks with project relations (DB-backed) |

### Data Layer

**Prisma models** (`prisma/schema.prisma`):
- `project` — id, name, description, status, progress, deadline, tags[], tasks relation
- `task` — id, title, description, status, priority, assignee, due_date, project relation
- `uso_service_point` — service_type, service_name, network_type, electric_type, village, subdistrict, district, province, install_location, contract_area, contract_number, provider, latitude, longitude, zone, inspected (boolean), inspected_at. Indexed on: district, zone, service_name, provider, inspected

**Mock data** (`src/lib/mockData.ts`): `mockProjects` (6 projects) and `mockTasks` (10 tasks) used in the Projects and Tasks tabs. Dashboard and Service Points tabs fetch real data from the database.

### Type Definitions (`src/types/index.ts`)
- `ActiveTab`: `'dashboard' | 'service-points' | 'map' | 'projects' | 'tasks' | 'settings'`
- `ProjectStatus`: `'active' | 'completed' | 'on_hold' | 'cancelled'`
- `TaskStatus`: `'todo' | 'in_progress' | 'review' | 'done'`
- `TaskPriority`: `'low' | 'medium' | 'high' | 'urgent'`
- `USOZone`: `'USO Zone C' | 'USO Zone C+'`
- `ServiceName`: `'Wi-Fi หมู่บ้าน' | 'Mobile' | 'Wi-Fi โรงเรียน' | 'อาคาร USO Net' | 'ห้อง USO Wrap' | 'Wi-Fi รพ.สต.'`
- Interfaces: `Project`, `Task`, `DashboardStats`, `ServicePoint`, `MapServicePoint`, `USOStats`

### State Management
- React hooks (`useState`, `useEffect`, `useCallback`) — no external state library
- `ThemeContext` (`src/contexts/ThemeContext.tsx`) — dark/light toggle, persisted to `localStorage` key `usonet-theme`, applies `.dark` class to `<html>`
- Prisma client singleton (`src/lib/prisma.ts`) via `globalThis`

### Design System
- **Theme**: Dark mode default, light mode toggle. Class-based Tailwind dark mode via CSS variables in `globals.css`
- **Claymorphism**: `.clay-card`, `.clay-shadow` — rounded, soft-shadow cards
- **Fonts**: **Nunito** (body) and **Fredoka** (headings) via `next/font/google`
- **Colors**: CSS custom properties — primary indigo (`#4F46E5`/`#818CF8`), accent orange (`#F97316`/`#FB923C`), light bg `#EEF2FF`, dark bg `#1E1B4B`
- **Effects**: Gradient text, smooth hover transitions, color-coded badges for service types and providers
- **Responsive**: Desktop sidebar + mobile bottom nav. Breakpoint at `lg`. Custom `xs` breakpoint at 475px
- **Tailwind config**: Custom spacing values (18, 88, 100) defined in `tailwind.config.js`

## Rules
- Do not commit and push to GitHub — wait for explicit command
- Run Python scripts inside `uv venv`
