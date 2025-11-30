// src/types/route.ts - Combined types for routes
export type TransportMode = 'walking' | 'cycling' | 'driving' | 'public_transport'

export interface RouteGeometry {
  type: 'LineString'
  coordinates: [number, number][] // [longitude, latitude]
}

export interface RouteInstruction {
  instruction: string
  distance: number // meters
  duration: number // seconds
  type: string
  way_points: [number, number] // indices in geometry.coordinates
}

export interface RouteSummary {
  distance: number // meters
  duration: number // seconds
  ascent?: number // meters of ascent
  descent?: number // meters of descent
}

export interface RouteOptions {
  avoid_tolls?: boolean
  avoid_ferries?: boolean
  prefer_green?: boolean // for bicycles
  optimized?: boolean // was the route optimized
}

export interface RouteProfile {
  id: string
  username: string | null
  full_name: string | null
  role: string | null
  email: string | null
  avatar_url: string | null
}

export interface RouteBuilding {
  id: string
  name: string
  description: string | null
  architect: string | null
  year_built: number | null
  architectural_style: string | null
  address: string | null
  city: string
  country: string
  image_url: string | null
  building_type: string | null
}

export interface RoutePoint {
  id: string
  route_id: string
  building_id: string | null
  order_index: number
  title: string
  description: string | null
  audio_url: string | null
  audio_duration_seconds: number | null
  latitude: number | null
  longitude: number | null
  instructions: string | null
  estimated_time_minutes: number | null
  point_type: string | null
  buildings: RouteBuilding | null
}

export interface Route {
  id: string
  title: string
  description: string | null
  city: string
  country: string
  created_by: string
  
  // New fields for smart routing system
  route_visibility: 'private' | 'public' | 'featured'
  publication_status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
  route_source: 'user' | 'blog' | 'ai_generated' | 'corporate' | 'institutional'
  moderation_notes?: string | null
  moderated_by?: string | null
  moderated_at?: string | null
  published_at?: string | null
  featured_until?: string | null
  priority_score: number
  duplicate_of?: string | null
  auto_generated_params?: Record<string, any> | null
  corporate_sponsor?: string | null
  seasonal_availability?: Record<string, any> | null
  
  // Routing fields
  transport_mode?: TransportMode
  route_geometry?: RouteGeometry
  route_instructions?: RouteInstruction[]
  route_summary?: RouteSummary
  route_options?: RouteOptions
  
  // Existing fields
  route_type: string | null
  difficulty_level: string | null
  estimated_duration_minutes: number | null
  distance_km: number | null
  points_count: number | null
  thumbnail_url: string | null
  is_published: boolean | null
  is_premium: boolean | null
  price_credits: number | null
  language: string | null
  tags: string[] | null
  rating: number | null
  review_count: number | null
  completion_count: number | null
  created_at: string
  updated_at: string
  updated_by?: string
  edit_count?: number
  last_edited_at?: string
  
  // Related data
  profiles: RouteProfile | null
  route_points: RoutePoint[]
}

// UI helper types
export interface TransportModeOption {
  value: TransportMode
  label: string
  icon: string
  description: string
  avgSpeed: number // km/h for calculations
}

export const TRANSPORT_MODE_OPTIONS: TransportModeOption[] = [
  {
    value: 'walking',
    label: 'Walking',
    icon: '🚶',
    description: 'Pedestrian routes and sidewalks',
    avgSpeed: 5
  },
  {
    value: 'cycling',
    label: 'Cycling',
    icon: '🚴',
    description: 'Bike paths and safe routes',
    avgSpeed: 15
  },
  {
    value: 'driving',
    label: 'Driving',
    icon: '🚗',
    description: 'Vehicle roads',
    avgSpeed: 40
  },
  {
    value: 'public_transport',
    label: 'Public Transport',
    icon: '🚌',
    description: 'Transport stops and stations',
    avgSpeed: 25
  }
]

// Types for creating/editing routes
export interface CreateRouteData {
  title: string
  description?: string
  city: string
  country: string
  transport_mode: TransportMode
  route_options?: RouteOptions
  tags?: string[]
  is_published?: boolean
  points: CreateRoutePoint[]
}

export interface CreateRoutePoint {
  title: string
  description?: string
  latitude: number
  longitude: number
  building_id?: string
  point_type?: 'building' | 'custom'
  estimated_time_minutes?: number
  instructions?: string
}

// Utilities for working with transport types
export class TransportModeHelper {
  static getOption(mode: TransportMode): TransportModeOption {
    return TRANSPORT_MODE_OPTIONS.find(option => option.value === mode) || TRANSPORT_MODE_OPTIONS[0]
  }
  
  static getIcon(mode: TransportMode): string {
    return this.getOption(mode).icon
  }
  
  static getLabel(mode: TransportMode): string {
    return this.getOption(mode).label
  }
  
  static getDescription(mode: TransportMode): string {
    return this.getOption(mode).description
  }
  
  static estimateTime(distanceKm: number, mode: TransportMode): number {
    const speed = this.getOption(mode).avgSpeed
    return Math.round((distanceKm / speed) * 60) // minutes
  }
}

// Formatting for display
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function formatTransportMode(mode: TransportMode): string {
  return TransportModeHelper.getLabel(mode)
}

// New interfaces for smart routing system
export interface UserRouteFavorite {
  id: string
  user_id: string
  route_id: string
  notes?: string
  personal_rating?: number
  completed_at?: string
  completion_notes?: string
  created_at: string
  // Related route data when joined
  routes?: Route
}

export interface RoutePublicationRequest {
  id: string
  route_id: string
  requested_by: string
  request_type: 'publish' | 'feature' | 'corporate'
  justification: string
  target_audience?: string
  estimated_popularity?: number
  business_info?: Record<string, any>
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  created_at: string
  // Related data when joined
  routes?: Partial<Route>
  profiles?: RouteProfile
}

export interface AutoRouteTemplate {
  id: string
  template_name: string
  template_type: 'style' | 'architect' | 'period' | 'geographic' | 'seasonal'
  criteria: Record<string, any>
  title_template: string
  description_template: string
  min_buildings: number
  max_distance_km: number
  is_active: boolean
  created_by?: string
  last_generated_at?: string
  generation_frequency: 'daily' | 'weekly' | 'monthly'
  created_at: string
}

export interface AutoGeneratedRouteLog {
  id: string
  template_id?: string
  generated_route_id?: string
  buildings_found: number
  generation_success: boolean
  generation_notes?: string
  created_at: string
  // Related data
  auto_route_templates?: AutoRouteTemplate
  routes?: Partial<Route>
}

// Enhanced route interface with user data
export interface RouteWithUserData extends Route {
  is_favorite?: boolean
  user_rating?: number
  user_notes?: string
  completed_at?: string
  distance_from_user?: number
  relevance_score?: number
}

// Filtering options for smart route system
export interface SmartRouteFilterOptions {
  city?: string
  maxRoutes?: number
  userLocation?: [number, number] // [lat, lng]
  userPreferences?: {
    architectural_styles?: string[]
    difficulty_levels?: string[]
    transport_modes?: TransportMode[]
  }
  mapBounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  includePrivate?: boolean
  source_filter?: ('user' | 'blog' | 'ai_generated' | 'corporate' | 'institutional')[]
}
