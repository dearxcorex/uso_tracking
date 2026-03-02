# USONet Optimization Plan — Performance & Minimalist Redesign

## Overview

Incremental optimization of USONet dashboard: improve performance and shift from claymorphism to a clean, minimalist design focused on data clarity.

**Target users**: NBTC office staff (desktop) + field inspectors (mobile)
**Deployment**: Vercel with CDN caching
**Data scale**: 500–2,000 service points

---

## Phase 1: Performance Optimizations

### 1.1 API Response Caching

Add HTTP cache headers to stable endpoints:

| Endpoint | Cache Strategy |
|---|---|
| `/api/stats` | `s-maxage=60, stale-while-revalidate=300` |
| `/api/service-points/map` | `s-maxage=60, stale-while-revalidate=300` |
| `/api/service-points` | `s-maxage=30, stale-while-revalidate=120` |

**Files**: `src/app/api/stats/route.ts`, `src/app/api/service-points/route.ts`, `src/app/api/service-points/map/route.ts`

### 1.2 Lazy-Load Tab Components

Extend dynamic imports to all heavy tabs (currently only Map uses dynamic import):

- `ServicePointTable` → dynamic import
- `ProjectList` → dynamic import
- `TaskBoard` → dynamic import
- `DistrictBreakdown` → dynamic import
- `ProviderChart` → dynamic import

**File**: `src/components/Dashboard.tsx`

### 1.3 React Suspense + Loading Skeletons

Wrap each tab content with `<Suspense fallback={<Skeleton />}>` to show loading states instead of blank content during data fetches.

**Files**: `src/components/Dashboard.tsx`, new skeleton components

### 1.4 Search Debounce

Add 300ms debounce to the search input in ServicePointTable to reduce API calls while typing.

**File**: `src/components/dashboard/ServicePointTable.tsx`

### 1.5 Map Marker Clustering

Install `react-leaflet-markercluster` to group nearby markers at lower zoom levels. Improves rendering performance for 500+ points.

**File**: `src/components/dashboard/ServicePointMap.tsx`

### 1.6 Bundle Analysis

Add `@next/bundle-analyzer` as dev dependency to identify and reduce heavy modules.

---

## Phase 2: Minimalist Design Redesign

### 2.1 Color Palette

Replace current purple/orange theme with professional slate-based palette:

**Light Mode:**
- Background: `#F8FAFC` (slate-50)
- Card: `#FFFFFF`
- Border: `#E2E8F0` (slate-200)
- Text primary: `#0F172A` (slate-900)
- Text secondary: `#64748B` (slate-500)
- Primary: `#3B82F6` (blue-500)
- Success: `#22C55E` (green-500)
- Warning: `#F59E0B` (amber-500)
- Accent: `#8B5CF6` (violet-500)

**Dark Mode:**
- Background: `#0F172A` (slate-900)
- Card: `#1E293B` (slate-800)
- Border: `#334155` (slate-700)
- Text primary: `#F1F5F9` (slate-100)
- Text secondary: `#94A3B8` (slate-400)
- Primary: `#60A5FA` (blue-400)
- Success: `#4ADE80` (green-400)
- Warning: `#FBBF24` (amber-400)
- Accent: `#A78BFA` (violet-400)

**File**: `src/app/globals.css`

### 2.2 Typography

Replace Nunito/Fredoka with Inter for a clean, data-optimized feel:

- **Body**: Inter (400, 500 weights)
- **Headings**: Inter (600 weight)
- **Data/Numbers**: JetBrains Mono (optional, for tabular data)

**File**: `src/app/layout.tsx`

### 2.3 Card Style Overhaul

| Property | Current | New |
|---|---|---|
| Border | 3px solid colored | 1px solid border token |
| Border radius | 20px | 12px |
| Shadow | Heavy inset + drop | `0 1px 3px rgba(0,0,0,0.08)` or none |
| Hover | Scale + glow | Subtle border-color transition |
| Padding | Variable | Consistent 20px / 24px |

**File**: `src/app/globals.css` (replace `.clay-card`, `.clay-shadow`, `.card-hover`)

### 2.4 Component-Level Changes

**StatsCards** (`dashboard/StatsCards.tsx`):
- Remove gradient backgrounds
- Clean number + label layout
- Small colored accent line on left or top
- Muted icon, not colored background

**NavSidebar** (`NavSidebar.tsx`):
- Remove gradient hover effects
- Thin left border accent on active tab
- Clean icon + text layout
- Consistent padding

**ServicePointTable** (`dashboard/ServicePointTable.tsx`):
- Cleaner filter bar (inline pills or minimal dropdowns)
- Alternating row backgrounds (subtle)
- Simplified badges — flat with light background

**Charts** (`dashboard/DistrictBreakdown.tsx`, `dashboard/ProviderChart.tsx`):
- Solid muted colors instead of gradients
- Cleaner labels and legends
- More whitespace

**Map** (`dashboard/ServicePointMap.tsx`):
- Simpler pin design (circle markers)
- Cleaner popup styling
- Filter pills instead of buttons

**AppHeader** (`client/AppHeader.tsx`):
- Remove gradient text
- Clean typography for title
- Subtle separator below header

**MobileNav** (`client/MobileNav.tsx`):
- Clean bottom bar, no colored backgrounds
- Thin top border, simple active indicator

---

## Phase 3: Polish & Final Touches

### 3.1 Smooth Transitions
- Add `transition-colors duration-200` on theme toggle
- Subtle fade-in on tab switch

### 3.2 Empty States
- Add clean empty state illustrations/messages for filtered results with no matches

### 3.3 Responsive Refinement
- Verify all changes work on mobile (375px+)
- Test map usability on small screens
- Ensure filter dropdowns work on mobile

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale |
|---|---|---|---|
| 1 | Incremental optimization | Component redesign, Full architecture shift | Low risk, ship incrementally |
| 2 | Minimalist design | Keep claymorphism, glassmorphism, bento | Better for data-heavy govt dashboard |
| 3 | Inter font | Keep Nunito/Fredoka, system fonts | Purpose-built for UI/data |
| 4 | Slate + blue palette | Purple primary, green/teal | Professional, neutral, readable |
| 5 | HTTP cache headers | No caching, Redis | Simple, leverages Vercel CDN |
| 6 | Lazy-load heavy tabs | Load all upfront | Reduces initial bundle |
| 7 | Client-side map clustering | No clustering, server-side | Handles 500-2000 points well |
| 8 | Keep SPA tab architecture | Convert to Next.js routes | Lower risk, same UX |

---

## Implementation Order

1. Performance first (Phase 1) — measurable improvements
2. Global styles (Phase 2.1–2.3) — color, fonts, card base
3. Component redesign (Phase 2.4) — one component at a time
4. Polish (Phase 3) — transitions, empty states, responsive
