// src/types/building.ts
export interface Building {
  id: string
  name: string
  description?: string
  architect?: string
  year_built?: number
  architectural_style?: string
  address?: string
  city: string
  country: string
  latitude: number
  longitude: number
  image_url?: string
  image_urls?: string[]
  website_url?: string
  opening_hours?: any
  entry_fee?: string
  accessibility_info?: string
  historical_significance?: string
  construction_materials?: string[]
  height_meters?: number
  building_type?: string
  conservation_status?: string
  created_by?: string
  verified?: boolean
  rating?: number
  review_count?: number
  view_count?: number
  created_at: string
  updated_at: string
  style: string
}

// Тип профиля (расширенный)
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'guest' | 'explorer' | 'guide' | 'expert' | 'moderator'
  avatar_url: string | null
  city: string | null
  country: string | null
  website_url: string | null
  bio: string | null
  total_routes: number
  total_followers: number
  total_following: number
  rating: number
  created_at: string
  updated_at: string
}

// Тип маршрута (под вашу реальную схему)
export interface Route {
  id: string
  title: string
  description: string | null
  city: string | null
  country: string | null
  created_by: string // UUID пользователя
  route_type: 'walking' | 'cycling' | 'driving' | 'public_transport' | null
  difficulty_level: 'easy' | 'medium' | 'hard' | null
  estimated_duration_minutes: number | null
  distance_km: number | null
  points_count: number | null
  thumbnail_url: string | null
  is_published: boolean
  is_premium: boolean
  price_credits: number | null
  language: string | null
  tags: string[] | null
  rating: number | null
  review_count: number | null
  completion_count: number | null
  created_at: string
  updated_at: string
  
  // Связанные данные
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  }
}

// Тип точки маршрута (ТОЧНО под схему БД)
export interface RoutePoint {
  id: string
  route_id: string
  building_id: string | null // UUID
  order_index: number
  title: string
  description: string | null
  audio_url: string | null
  audio_duration_seconds: number | null
  latitude: number
  longitude: number
  instructions: string | null
  estimated_time_minutes: number | null
  point_type: 'building' | 'landmark' | 'viewpoint' | 'info' | 'rest' | null
  created_at: string
  
  // Поле только для интерфейса
  duration_minutes?: number
}