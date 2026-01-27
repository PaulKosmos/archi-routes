# MapLibre Migration Progress

**Start Date:** 2026-01-25
**Status:** In Progress
**Target:** Replace all Leaflet components with MapLibre GL JS

---

## Overview

Migration from Leaflet (raster tiles, Canvas) to MapLibre GL JS (vector tiles, WebGL) for improved performance and smoother user experience.

### Key Benefits
- WebGL rendering (GPU acceleration)
- Vector tiles (smaller, scalable)
- Smooth continuous zoom
- Better mobile performance
- 3D terrain support (future)

---

## Phase 1: Core MapLibre Component ✅ COMPLETED

### 1.1 Basic MapLibreMap Component
- [x] Create `src/components/MapLibreMap.tsx`
- [x] Basic map rendering with react-map-gl
- [x] Building markers
- [x] Popup with building info
- [x] Map style switching (Light, Dark, Bright, OSM, Demo)
- [x] Navigation controls
- [x] Scale control

### 1.2 Test Page
- [x] Create `src/app/test-maplibre/page.tsx`
- [x] Create `src/app/test-maplibre/TestMapLibreClient.tsx`
- [x] Load buildings from Supabase
- [x] Display comparison with Leaflet

---

## Phase 2: Enhanced MapLibre Component ✅ COMPLETED

### 2.1 Custom Markers System
- [x] Port SVG marker icons from EnhancedMapIcons.tsx
- [x] Implement marker states (normal, hovered, selected, in-route)
- [x] Marker sizing based on state
- [x] Coral/orange gradient color scheme

### 2.2 Two-Level Popup System
- [x] Hover popup (compact info)
- [x] Click popup (detailed info with image)
- [x] Double-click for full details (desktop)
- [x] Single-click for full details (mobile)
- [x] Popup z-index management
- [x] Auto-pan disabled for hover popups

### 2.3 Route Visualization
- [x] Route polylines with GeoJSON LineString
- [x] Transport mode colors (walking, cycling, driving, public_transport)
- [x] Dashed lines for walking routes
- [x] Start marker (green)
- [x] End marker (red)
- [x] Route point markers with numbers

### 2.4 Interactive Features
- [x] Radius search circle overlay
- [x] User location marker with pulsing animation
- [x] Add building mode (click on map)
- [x] Route creation mode
- [x] Selected buildings highlighting

### 2.5 Ref Methods (imperative API)
- [x] `centerOnRoute(routeId)` - center map on route
- [x] `centerOnBuilding(buildingId)` - center map on building
- [x] `openBuildingPopup(buildingId)` - open popup programmatically

### 2.6 Mobile Optimization
- [x] Bottom sheet offset calculation
- [x] Shifted camera positioning for visible area
- [x] Touch-friendly popups
- [x] Responsive controls

---

## Phase 3: Specialized Components ✅ COMPLETED

### 3.1 MapLibreMapCreator (route creation) ✅ COMPLETED
- [x] Building selection with click/hover
- [x] Route line visualization (dashed)
- [x] Cursor state changes
- [x] Building addition callbacks
- [x] Legend and info panels
- [x] Style switching

### 3.2 RouteViewerMiniMap (MapLibre version) ✅ COMPLETED
- [x] Compact route visualization
- [x] Progressive point indicators (✓ passed, number for future)
- [x] User geolocation tracking with pulsing marker
- [x] Automatic view centering on current point
- [x] Current point info panel

### 3.3 Blog/Article Maps ✅ COMPLETED
- [x] ArticleMap → MapLibreArticleMap
- [x] Building markers with numbering
- [x] Popup with building details
- [x] Add to route functionality
- [x] BlogArticleMap integration (uses dynamic import)
- [x] CollapsibleMap wrapper (uses dynamic import)
- [ ] SimpleInteractiveMap replacement (later phase)

### 3.4 Homepage/Building Maps ✅ COMPLETED
- [x] RoutePreviewMap → MapLibreRoutePreview
- [x] BuildingMap → MapLibreBuildingMap
- [x] LocationPicker → MapLibreLocationPicker
- [x] NewsObjectsMap → MapLibreNewsMap

---

## Phase 4: Integration & Migration ✅ COMPLETED

### 4.1 Main Map Page ✅ COMPLETED
- [x] Update `src/app/map/MapClient.tsx`
- [x] Replace EnhancedMap import with MapLibreEnhanced
- [ ] Test all filter interactions
- [ ] Test mobile bottom sheets
- [ ] Test route creation flow

### 4.2 Route Viewer Modal ✅ COMPLETED
- [x] Update RouteViewerModal to use MapLibre mini-map
- [ ] Test navigation features

### 4.3 Building Modal ✅ COMPLETED
- [x] Update BuildingModalContent map integration
- [x] Update BuildingDetailClient map integration

### 4.4 Blog System ✅ COMPLETED
- [x] Update blog article map components
- [x] Update collapsible maps

### 4.5 Route System ✅ COMPLETED
- [x] RouteCreator - uses MapLibreMapCreator
- [x] RouteEditClient - uses MapLibreMapCreator
- [x] RouteDetailClient - uses MapLibreRouteMap
- [x] FeaturedRoutesSection - uses MapLibreRoutePreview

### 4.6 Other Components ✅ COMPLETED
- [x] AddBuildingClient - uses MapLibreLocationPicker
- [x] NewsObjectsMap - uses MapLibreNewsMap

---

## Phase 5: Cleanup & Optimization ✅ COMPLETED

### 5.1 Remove Leaflet ✅ COMPLETED
- [x] Remove leaflet package
- [x] Remove react-leaflet package
- [x] Remove leaflet-polylinedecorator package
- [x] Remove @types/leaflet package
- [x] Delete old Leaflet components:
  - LeafletMap.tsx
  - LeafletMapCreator.tsx
  - EnhancedMap.tsx
  - EnhancedMapIcons.tsx
  - RouteViewerMiniMap.tsx
  - LocationPicker.tsx
  - LeafletNewsMap.tsx
  - ArticleMap.tsx
  - RoutePreviewMap.tsx
  - BuildingMap.tsx
  - RouteMap.tsx
- [x] Update imports in dependent components
- [x] Update package.json

### 5.2 Attribution Added ✅ COMPLETED
- [x] Added MapLibre + OpenStreetMap attribution to all 10 MapLibre components
- [x] Attribution styled consistently across components

### 5.3 Performance Testing
- [ ] Bundle size comparison
- [ ] Load time measurements
- [ ] Mobile performance testing
- [ ] Memory usage monitoring

### 5.4 Documentation
- [ ] Update CLAUDE.md
- [ ] Update component documentation
- [ ] Create MapLibre usage guide

---

## File Mapping (Leaflet → MapLibre)

| Leaflet Component | MapLibre Replacement | Status |
|-------------------|---------------------|--------|
| LeafletMap.tsx | MapLibreMap.tsx | ✅ Complete |
| EnhancedMap.tsx | MapLibreEnhanced.tsx | ✅ Complete |
| LeafletMapCreator.tsx | MapLibreMapCreator.tsx | ✅ Complete |
| RouteViewerMiniMap.tsx | MapLibreRouteViewer.tsx | ✅ Complete |
| ArticleMap.tsx | MapLibreArticleMap.tsx | ✅ Complete |
| RoutePreviewMap.tsx | MapLibreRoutePreview.tsx | ✅ Complete |
| BuildingMap.tsx | MapLibreBuildingMap.tsx | ✅ Complete |
| LocationPicker.tsx | MapLibreLocationPicker.tsx | ✅ Complete |
| LeafletNewsMap.tsx | MapLibreNewsMap.tsx | ✅ Complete |
| RouteMap.tsx | MapLibreRouteMap.tsx | ✅ Complete |
| EnhancedMapIcons.tsx | (integrated) | ✅ Complete |

---

## Technical Notes

### Map Styles (Free, No API Key)
```typescript
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  osm: 'https://tiles.openfreemap.org/styles/liberty',
  demo: 'https://demotiles.maplibre.org/style.json'
}
```

### Transport Mode Colors
```typescript
const TRANSPORT_COLORS = {
  walking: '#10B981',    // green
  cycling: '#3B82F6',    // blue
  driving: '#EF4444',    // red
  public_transport: '#8B5CF6'  // purple
}
```

### Marker Color Scheme (Coral Palette)
```typescript
const colors = {
  normal: { core: '#F26438', gradient: '#F57C53' },
  hovered: { core: '#F57C53', gradient: '#F89470' },
  selected: { core: '#F89470', gradient: '#FBA98B' },
  route: { core: '#E64D20', gradient: '#F26438' }
}
```

---

## Current Progress Summary

**Completed:**
- Phase 1 (Basic MapLibre component) ✅
- Phase 2 (Enhanced MapLibre component with all features) ✅
- Phase 3 (All specialized components) ✅
- Phase 4 (Integration into main app) ✅
- Phase 5.1 (Leaflet removal) ✅
- Phase 5.2 (Attribution) ✅

**Current:** Phase 5.3-5.4 (Performance testing & Documentation)
**Status:** Migration functionally complete!

**Test page verified:** http://localhost:3000/test-maplibre - Working ✅

---

## Issues & Blockers

None currently.

---

## Testing Checklist

- [ ] Buildings display correctly
- [ ] Markers have correct states
- [ ] Popups open/close properly
- [ ] Routes render with geometry
- [ ] Mobile gestures work
- [ ] Style switching works
- [ ] Radius search works
- [ ] Route creation works
- [ ] Performance acceptable

---

## Created Components

| Component | Path | Description |
|-----------|------|-------------|
| MapLibreMap | `src/components/MapLibreMap.tsx` | Basic map with buildings |
| MapLibreEnhanced | `src/components/MapLibreEnhanced.tsx` | Full-featured map with routes, popups, mobile support |
| MapLibreMapCreator | `src/components/MapLibreMapCreator.tsx` | Route creation interface |
| MapLibreRouteViewer | `src/components/MapLibreRouteViewer.tsx` | Route navigation mini-map |
| MapLibreArticleMap | `src/components/blog/MapLibreArticleMap.tsx` | Blog article buildings map |
| MapLibreRoutePreview | `src/components/homepage/MapLibreRoutePreview.tsx` | Route preview for featured routes |
| MapLibreBuildingMap | `src/components/buildings/MapLibreBuildingMap.tsx` | Single building location map |
| MapLibreLocationPicker | `src/components/MapLibreLocationPicker.tsx` | Location picker for adding buildings |
| MapLibreNewsMap | `src/components/news/MapLibreNewsMap.tsx` | News-related buildings map |
| MapLibreRouteMap | `src/app/routes/[id]/MapLibreRouteMap.tsx` | Route detail page map |

---

## Updated Files (Integration Phase)

| File | Change |
|------|--------|
| `src/app/map/MapClient.tsx` | EnhancedMap → MapLibreEnhanced |
| `src/components/RouteViewerModal.tsx` | RouteViewerMiniMap → MapLibreRouteViewer |
| `src/components/blog/BlogArticleMap.tsx` | EnhancedMap → MapLibreEnhanced |
| `src/components/blog/CollapsibleMap.tsx` | ArticleMap → MapLibreArticleMap |
| `src/components/homepage/FeaturedRoutesSection.tsx` | RoutePreviewMap → MapLibreRoutePreview |
| `src/app/buildings/[id]/BuildingDetailClient.tsx` | BuildingMap → MapLibreBuildingMap |
| `src/components/BuildingModalContent.tsx` | BuildingMap → MapLibreBuildingMap |
| `src/app/buildings/new/AddBuildingClient.tsx` | LocationPicker → MapLibreLocationPicker |
| `src/components/news/NewsObjectsMap.tsx` | LeafletNewsMap → MapLibreNewsMap |
| `src/components/RouteCreator.tsx` | LeafletMapCreator → MapLibreMapCreator |
| `src/app/routes/[id]/edit/RouteEditClient.tsx` | LeafletMapCreator → MapLibreMapCreator |
| `src/app/routes/[id]/RouteDetailClient.tsx` | RouteMap → MapLibreRouteMap |

---

---

## Removed Files (Phase 5.1)

| File | Replacement |
|------|-------------|
| `src/components/LeafletMap.tsx` | MapLibreMap.tsx |
| `src/components/LeafletMapCreator.tsx` | MapLibreMapCreator.tsx |
| `src/components/EnhancedMap.tsx` | MapLibreEnhanced.tsx |
| `src/components/EnhancedMapIcons.tsx` | (integrated into MapLibre components) |
| `src/components/RouteViewerMiniMap.tsx` | MapLibreRouteViewer.tsx |
| `src/components/LocationPicker.tsx` | MapLibreLocationPicker.tsx |
| `src/components/news/LeafletNewsMap.tsx` | MapLibreNewsMap.tsx |
| `src/components/blog/ArticleMap.tsx` | MapLibreArticleMap.tsx |
| `src/components/homepage/RoutePreviewMap.tsx` | MapLibreRoutePreview.tsx |
| `src/components/buildings/BuildingMap.tsx` | MapLibreBuildingMap.tsx |
| `src/app/routes/[id]/RouteMap.tsx` | MapLibreRouteMap.tsx |

---

## Removed Packages

- `leaflet` (^1.9.4)
- `react-leaflet` (^5.0.0)
- `leaflet-polylinedecorator` (^1.6.0)
- `@types/leaflet` (^1.9.20)

---

*Last Updated: 2026-01-27*
