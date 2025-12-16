# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Archi-Routes** is an architectural discovery and route planning platform built with Next.js 15 (App Router), React 19, TypeScript, Supabase, and Leaflet/Mapbox. Users can discover buildings, create architectural walking routes, write reviews with audio guides, and share experiences.

Always run "npm run dev" on http://localhost:3000/

### Basic Development
```bash
npm run dev              # Start development server on http://localhost:3000
npm run build            # Production build
npm run build:prod       # Production build with NODE_ENV=production
npm start                # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run type-check       # Run TypeScript type checking without emitting files
```

### Analysis & Optimization
```bash
npm run analyze          # Analyze bundle with webpack-bundle-analyzer
npm run analyze:server   # Analyze server bundle only
npm run analyze:browser  # Analyze browser bundle only
npm run analyze:prod     # Production bundle analysis
```

### Maintenance
```bash
npm run clean            # Remove .next, out, dist directories
npm run clean:all        # Remove build artifacts, node_modules, and reinstall
npm run audit            # Security audit (moderate level)
npm run audit:fix        # Fix security vulnerabilities
```

### Testing
```bash
# Test credentials for development:
# Email: testguide@archiroutes.com
# Password: TestGuide2024!

# Access test map at:
http://localhost:3000/test-map
```

## Architecture & Critical Patterns

### 1. Supabase Client Management (CRITICAL)

**ALWAYS use the factory function pattern** - never use the deprecated global singleton:

```typescript
// ✅ CORRECT - Use in React components
import { createClient } from '@/lib/supabase'
import { useMemo } from 'react'

export default function MyComponent() {
  const supabase = useMemo(() => createClient(), [])
  // Use supabase client...
}

// ✅ CORRECT - Use in utility functions
import { createClient } from '@/lib/supabase'

export async function myUtility() {
  const supabase = createClient()
  const { data } = await supabase.from('table').select()
  // ...
}

// ❌ WRONG - Do not use global singleton
import { supabase } from '@/lib/supabase' // Deprecated, causes connection leaks
```

**Why:** The global singleton causes Realtime subscription leaks and connection pool exhaustion. The factory pattern ensures proper cleanup and SSR compatibility with `@supabase/ssr`.

### 2. Realtime Subscriptions (CRITICAL)

Always clean up subscriptions in useEffect cleanup:

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)  // CRITICAL: Always clean up
  }
}, [supabase])  // CRITICAL: Include supabase in dependencies
```

### 3. Map Components Architecture

The app uses dynamic imports for map components to avoid SSR issues:

```typescript
// Always use dynamic imports with ssr: false for Leaflet components
const Map = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
})
```

**Map Components:**
- `LeafletMap` - Basic map display with markers
- `LeafletMapCreator` - Route creation with building selection
- `EnhancedMap` - Advanced map with clustering and filters
- `RouteViewerMiniMap` - Mini-map in route viewer modal

### 4. Route System Architecture

Routes are built using real routing services (Mapbox/OpenRouteService):

**Key Components:**
- `RouteCreator` - Form for creating routes with building selection
- `RouteViewerModal` - Full-featured route viewer with navigation
- `RouteCreationMethodModal` - Choose manual vs AI route creation
- `RoutePublicationRequest` - Request route publication workflow

**Data Flow:**
1. User selects buildings on map → stores in state
2. Submit creates `routes` record with route_geometry from routing service
3. Creates `route_points` records for each building
4. Routes display using polylines from route_geometry

**Critical Database Pattern:**
```typescript
// Route points use order_index (NOT order_in_route)
const points = selectedBuildings.map((building, idx) => ({
  route_id,
  building_id: building.id,
  order_index: idx,  // CRITICAL: Use order_index, not order_in_route
  title: building.name,
  latitude: building.latitude,
  longitude: building.longitude,
  point_type: 'building'
}))

await supabase.from('route_points').insert(points)
```

### 6. Modal Architecture

The app uses several modal patterns:

**Building Modals:**
- `BuildingModalNew` - Main building detail modal (preferred)
- `BuildingModalContent` - Content component with tabs (Reviews, Routes, News)
- `BuildingModal` - Wrapper component

**Route Modals:**
- `RouteViewerModal` - Route navigation with review selection and audio player
- `RouteCreationMethodModal` - Choose creation method

**Review Modals:**
- `AddReviewModal` - Create new review with photo/audio upload

### 7. Type System Structure

**Core Types:** (`src/types/`)
- `building.ts` - Building, BuildingReview, Profile types
- `route.ts` - Route, RoutePoint, transport mode types
- `blog.ts` - Blog and news post types
- `autogeneration.ts` - AI route generation types

**Key Type Patterns:**
```typescript
// Extended types with relations
interface BuildingWithReviews extends Building {
  building_reviews: BuildingReviewWithProfile[]
}

interface RouteWithPoints extends Route {
  route_points: RoutePoint[]
  profiles?: Profile
}
```

### 8. File Upload Pattern

Use the storage utilities from `src/lib/supabase.ts`:

```typescript
import { uploadImage, uploadAudio } from '@/lib/supabase'

// Image upload
const { url } = await uploadImage(file, 'buildings', 'images')

// Audio upload
const { url } = await uploadAudio(audioFile, buildingId, reviewId)
```

**Storage Buckets:**
- `buildings` - Building images
- `audio` - Review audio files
- `avatars` - User avatars
- `routes` - Route thumbnails

### 9. Moderation System

Content goes through moderation workflow:

**Statuses:** `pending` → `approved` / `rejected`

**Moderated Entities:**
- Buildings (`buildings.moderation_status`)
- Routes (`routes.publication_status`)
- Reviews (via `building_reviews.is_verified`)

**Admin Tools:**
- `/admin` - Main admin dashboard
- `/admin/moderation` - Moderation queue
- `/admin/users` - User management

### 10. Smart Route Filtering

Routes have advanced visibility and publication workflow:

```typescript
interface Route {
  route_visibility: 'private' | 'public' | 'featured'
  publication_status: 'draft' | 'pending' | 'published' | 'rejected'
  route_source: 'user' | 'blog' | 'ai_generated' | 'corporate'
  priority_score: number  // For ranking
}
```

Users request publication via `RoutePublicationRequest` component.

## Common Pitfalls

1. **NEVER use `async` in `onAuthStateChange`** - ⚠️ CRITICAL: Using `async/await` inside `onAuthStateChange` callback causes complete Supabase deadlock in production. Use `.then()/.catch()` instead. See `TROUBLESHOOTING.md` for details.
2. **Don't use `building.rating`** - It's deprecated. Use `building_reviews.user_rating_avg`
3. **Don't use `order_in_route`** - Route points use `order_index`
4. **Don't forget dynamic imports** - All map components need `ssr: false`
5. **Don't use global supabase client** - Always use `createClient()`
6. **Don't forget cleanup** - Realtime subscriptions must be removed in useEffect cleanup
7. **Don't skip useMemo** - Wrap `createClient()` in `useMemo(() => createClient(), [])`

## Key Files to Read

When working on specific features, read these first:

**Route System:**
- `src/app/test-map/page.tsx` - Main map interface
- `src/components/RouteViewerModal.tsx` - Route viewer
- `src/types/route.ts` - Route type definitions

**Building System:**
- `src/components/BuildingModalNew.tsx` - Building detail modal
- `src/types/building.ts` - Building type definitions

**Review System:**
- `src/components/BuildingReviewsList.tsx` - Review display
- `src/components/AddReviewModal.tsx` - Review creation

**Authentication:**
- `src/hooks/useAuth.ts` - Auth hook
- `src/components/AuthModal.tsx` - Login/signup modal

## Documentation Files

High-level system documentation:
- `TROUBLESHOOTING.md` - **Known issues and solutions** ⚠️ READ THIS FIRST when encountering production issues
- `ROUTE_SYSTEM_COMPLETE.md` - Complete route system documentation
- `BUILDING_MODAL_REDESIGN_COMPLETE.md` - Building modal architecture
- `FULL_MIGRATION_COMPLETE.md` - Supabase SSR migration details
- `QUICK_START_GUIDE.md` - Testing and setup guide