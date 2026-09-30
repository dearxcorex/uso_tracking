# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack at http://localhost:3000
- `npm run build` - Run `prisma generate` then build production app with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest unit tests (`src/**/*.test.ts(x)`)

### Database
- `npx prisma migrate dev` - Create/apply migrations (development; interactive only)
- Non-interactive: write SQL with `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` into a new `prisma/migrations/<timestamp>_<name>/migration.sql`, then `npx prisma migrate deploy`. Never pass the real `DATABASE_URL` as `--shadow-database-url` — Prisma wipes the shadow DB
- `npx prisma generate` - Regenerate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio GUI

### Data Import
Two steps, review in between:
1. `.venv/bin/python scripts/merge_departments.py` - Merge the department sheets (อภ./ตภ./บภ./ผภ.) of `data/USO net ระยะ 2 ใช้ ค.9.xlsx` and `ค.10.xlsx` into `data/merged_departments.xlsx` for review
   - `round` = workbook (ค.9/ค.10), `department` = sheet-name prefix, `dept_seq` = number in the "ครั้งที่" tag column
   - School phones come from `data/school_phones.csv` (keyed by `village_code`, with source URL and review note); Wi-Fi หมู่บ้าน rows have no phone
2. `.venv/bin/python scripts/import_visit_plan.py` - Load `data/merged_departments.xlsx` into `visit_plan`
   - Truncates `visit_plan`, then re-inserts (safe to re-run); `phone_note` is review-only and not loaded
   - Inspection status is carried over across re-imports, matched on (round, department, service_name, village_code)
   - Reads `DATABASE_URL` from `.env`; needs pandas, openpyxl, psycopg2 in `.venv`

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (Neon, required). Format: `postgresql://user:password@host:port/database?sslmode=require`

## Architecture Overview

USONet is a read-only viewer for the NBTC USO Net phase 2 visit plan (Wi-Fi หมู่บ้าน / Wi-Fi โรงเรียน sites in Chaiyaphum and Nakhon Ratchasima, split by department อภ./ตภ./บภ./ผภ. and round ค.9/ค.10), built with **Next.js 15**, **TypeScript**, **React 19**, **Tailwind CSS 4**, **Prisma ORM**, and **react-leaflet**.

### Routing & Data Flow
Single page on `/`. `src/app/page.tsx` (server component) loads all `visit_plan` rows (~80) via `src/lib/queries.ts` and passes them to `Dashboard.tsx`, which derives stats with `computeStats`. Navigation is **client-side tab switching** (`activeTab`): `dashboard`, `points`, `map`. Filtering happens client-side. Site detail is a slide-over panel rendered from the already-loaded row. The only write is inspection status: the map popup's ยังไม่ตรวจ/ตรวจแล้ว button calls `PATCH /api/sites/[id]/inspect` with `{ inspected: boolean }`, and `Dashboard` updates its in-memory list.

### Path Alias
`@/*` maps to `./src/*`.

### Components
- **`Dashboard.tsx`** — Tab orchestrator; owns `activeTab` and `selectedPointId` (opens `PointDetail`)
- **`navItems.tsx`** — Tab labels/subtitles/icons shared by `NavSidebar.tsx` (desktop, expand-on-hover) and `client/MobileNav.tsx` (slide-in drawer)
- **`client/AppHeader.tsx`** — Title, theme toggle
- **`dashboard/StatsCards.tsx`** — Total, one card per department, school vs village; footer with per-round counts and school phone coverage
- **`dashboard/DistrictBreakdown.tsx`** — Bar list by district
- **`dashboard/ProviderChart.tsx`** — CSS donut by provider (NT ex-CAT / ex-TOT)
- **`dashboard/PointList.tsx`** — Filterable list (cards on mobile, table on desktop), 50/page
- **`dashboard/ServicePointMap.tsx`** — Leaflet map with clustering, department-colored pins (check mark when inspected), inspection toggle in the popup, live location, Google Maps navigation
- **`dashboard/PointDetail.tsx`** — Slide-over with call button (plus phone source), location, and plan info
- **`dashboard/PointFilters.tsx`** (round, department, service, district, search), **`ServiceBadge.tsx`**, **`DepartmentBadge.tsx`**, **`PhoneLink.tsx`** (`tel:` link), **`InspectButton.tsx`** — Shared by list and map

### Lib
- `lib/queries.ts` — Prisma query mapping DB rows (snake_case) to the camelCase `VisitSite` type, sorted with `compareSites`
- `lib/points.ts` — Sorting, filtering, filter options, stats, formatting helpers (unit-tested)
- `lib/inspect.ts` — Inspect route helpers (ID/body parsing, update fields) and the ยังไม่ตรวจ/ตรวจแล้ว labels (unit-tested)
- `lib/services.ts` — Department list/colors (`DEPARTMENTS`, `DEPARTMENT_STYLES`), service colors (`SERVICE_STYLES`), provider short names

### Data Model (`prisma/schema.prisma`)
- `visit_plan` — round, department, dept_seq, service_type, service_name, village_code, village, subdistrict, district, province, install_location, provider, latitude, longitude, project, phone, phone_source, inspected, inspected_at (set from the app); unique on (round, department, service_name, village_code)
- The old `service_point`/`asset` tables were dropped on 2026-09-30; CSV backups are in `data/archive/backup_{service_point,asset}_2026-09-30.csv`

### Design System
- Dark mode default, light toggle (`ThemeContext`, persisted in `localStorage` key `usonet-theme`, `.dark` class on `<html>`)
- Claymorphism: `.clay-card`, `.clay-shadow`, `.card-hover`; teal primary via CSS variables in `globals.css`
- Fonts: Nunito (body), Fredoka (headings) via `next/font/google`
- Responsive: desktop sidebar + mobile drawer, breakpoint `lg`

## Rules
- Do not commit and push to GitHub — wait for explicit command
- Run Python scripts inside `uv venv` (`.venv`)
