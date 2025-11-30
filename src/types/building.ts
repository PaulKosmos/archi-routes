// src/types/building.ts - Обновленная версия с поддержкой обзоров

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
  // Поля модерации
  moderation_status?: 'pending' | 'approved' | 'rejected'
  moderated_by?: string
  moderated_at?: string
  rejection_reason?: string
  updated_by?: string
  edit_count?: number
  last_edited_at?: string
  last_reviewed_at?: string
  featured_review_id?: string
  content_score?: number
  visit_difficulty?: string
  best_visit_time?: string
  nearby_transport?: string[]
  style: string // Для обратной совместимости
}

// Новые типы для обзоров зданий
export interface BuildingReview {
  id: string
  building_id: string
  user_id: string
  rating: number // Старое поле (deprecated, не используется)
  title?: string
  content?: string
  photos?: string[]
  visit_date?: string
  is_verified: boolean
  helpful_count: number
  created_at: string
  updated_at: string
  review_type: 'general' | 'expert' | 'historical' | 'amateur'
  audio_url?: string
  audio_duration_seconds?: number
  tags?: string[]
  is_featured: boolean
  language: string
  source_type: 'user' | 'import' | 'ai'
  // Новые поля для рейтинга от пользователей
  user_rating_avg: number
  user_rating_count: number
}

export interface BuildingReviewWithProfile extends BuildingReview {
  profiles: {
    id: string
    username?: string
    full_name?: string
    avatar_url?: string
    role?: string
  }
}

export interface BuildingWithReviews extends Building {
  building_reviews: BuildingReviewWithProfile[]
  featured_review?: BuildingReviewWithProfile
}

export interface UserBuildingFavorite {
  id: string
  user_id: string
  building_id: string
  notes?: string
  personal_rating?: number
  visit_status: 'want_to_visit' | 'visited' | 'favorite'
  visited_at?: string
  created_at: string
}

export interface BlogPostBuilding {
  id: string
  blog_post_id: string
  building_id: string
  context_description?: string
  is_primary_focus: boolean
  order_index: number
  created_at: string
}

export interface NewsPostBuilding {
  id: string
  news_post_id: string
  building_id: string
  context_description?: string
  created_at: string
}

// Тип профиля (расширенный)
export interface Profile {
  id: string
  email?: string
  username?: string
  full_name: string | null
  display_name?: string | null
  role: 'guest' | 'explorer' | 'guide' | 'expert' | 'moderator' | 'admin'
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
  updated_by?: string
  edit_count?: number
  last_edited_at?: string
  transport_mode?: 'walking' | 'cycling' | 'driving' | 'public_transport'
  route_geometry?: Record<string, any>
  route_instructions?: Record<string, any>
  route_summary?: Record<string, any>
  route_options?: Record<string, any>
  route_visibility?: 'private' | 'public' | 'featured'
  
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
  
  // Связанные данные о здании
  buildings?: Building
}

// Расширенный Route с точками и зданиями
export interface RouteWithPoints extends Route {
  route_points: RoutePoint[]
  created_by_profile?: {
    id: string
    username?: string
    full_name?: string
    avatar_url?: string
  }
}

// Типы для форм
export interface CreateBuildingReviewForm {
  building_id: string
  rating: number
  title: string
  content: string
  review_type: 'general' | 'expert' | 'historical' | 'amateur'
  photos?: File[]
  audio?: File
  visit_date?: string
  tags?: string[]
  language?: string
}

export interface UpdateBuildingForm {
  name?: string
  description?: string
  architect?: string
  year_built?: number
  architectural_style?: string
  address?: string
  image_url?: string
  website_url?: string
  entry_fee?: string
  accessibility_info?: string
  historical_significance?: string
  building_type?: string
  visit_difficulty?: string
  best_visit_time?: string
}

// Типы для поиска и фильтрации
export interface BuildingSearchFilters {
  city?: string
  country?: string
  architectural_style?: string[]
  year_built_from?: number
  year_built_to?: number
  architect?: string
  building_type?: string[]
  has_audio?: boolean
  min_rating?: number
  verified_only?: boolean
  visit_difficulty?: string[]
}

export interface BuildingSearchResult {
  buildings: Building[]
  total_count: number
  filters_applied: BuildingSearchFilters
  page: number
  per_page: number
}

// Константы
export const REVIEW_TYPES = {
  GENERAL: 'general',
  EXPERT: 'expert', 
  HISTORICAL: 'historical',
  AMATEUR: 'amateur'
} as const

export const VISIT_STATUS = {
  WANT_TO_VISIT: 'want_to_visit',
  VISITED: 'visited',
  FAVORITE: 'favorite'
} as const

export const VISIT_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  RESTRICTED: 'restricted'
} as const

export const BUILDING_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  RELIGIOUS: 'religious',
  EDUCATIONAL: 'educational',
  CULTURAL: 'cultural',
  INDUSTRIAL: 'industrial',
  GOVERNMENT: 'government',
  MIXED: 'mixed'
} as const

export const ARCHITECTURAL_STYLES = {
  GOTHIC: 'gothic',
  RENAISSANCE: 'renaissance',
  BAROQUE: 'baroque',
  NEOCLASSICAL: 'neoclassical',
  ART_NOUVEAU: 'art_nouveau',
  MODERNIST: 'modernist',
  BAUHAUS: 'bauhaus',
  BRUTALIST: 'brutalist',
  POSTMODERN: 'postmodern',
  CONTEMPORARY: 'contemporary',
  CONSTRUCTIVIST: 'constructivist',
  STALINIST: 'stalinist'
} as const
