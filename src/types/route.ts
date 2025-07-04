// src/types/route.ts
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
  profiles: RouteProfile | null
  route_points: RoutePoint[]
}