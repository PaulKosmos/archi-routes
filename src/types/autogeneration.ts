// src/types/autogeneration.ts - Типы для системы автогенерации маршрутов

// ======================================
// ОСНОВНЫЕ ТИПЫ АВТОГЕНЕРАЦИИ
// ======================================

export interface RouteTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  template_config: TemplateConfig
  generation_rules: GenerationRules
  ai_prompts?: AIPrompts
  default_transport_mode: TransportMode
  default_difficulty: DifficultyLevel
  min_points: number
  max_points: number
  estimated_duration_minutes: number
  target_cities: string[]
  target_audience?: string
  seasonal_availability?: SeasonalAvailability
  is_active: boolean
  priority: number
  created_by: string
  usage_count: number
  success_rate: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

export type TemplateCategory = 
  | 'seasonal' 
  | 'thematic' 
  | 'architectural_style' 
  | 'historical_period'
  | 'difficulty_based' 
  | 'duration_based' 
  | 'personalized' 
  | 'corporate'

export type TransportMode = 'walking' | 'cycling' | 'driving' | 'public_transport'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

// ======================================
// КОНФИГУРАЦИЯ ШАБЛОНОВ
// ======================================

export interface TemplateConfig {
  // Архитектурные критерии
  style?: string | string[]
  min_year?: number
  max_year?: number
  building_types?: string[]
  architectural_styles?: string[]
  
  // Географические параметры
  radius_km?: number
  center_point?: {
    latitude: number
    longitude: number
  }
  
  // Тематические критерии
  themes?: string[]
  keywords?: string[]
  
  // Сезонные параметры
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  weather_dependent?: boolean
  
  // Пользовательские предпочтения
  accessibility_required?: boolean
  family_friendly?: boolean
  photography_focus?: boolean
  
  // Корпоративные параметры
  corporate_sponsor?: string
  brand_alignment?: string[]
}

export interface GenerationRules {
  selection_criteria: {
    architectural_style?: string[]
    building_types?: string[]
    min_rating?: number
    max_rating?: number
    has_description?: boolean
    has_images?: boolean
    min_reviews?: number
    year_range?: {
      min: number
      max: number
    }
  }
  
  optimization: {
    prefer_walkable?: boolean
    max_distance_between_points?: number // метры
    logical_flow?: boolean
    avoid_backtracking?: boolean
    cluster_nearby_points?: boolean
    time_optimization?: boolean
  }
  
  constraints: {
    max_total_distance?: number // км
    max_walking_time?: number // минуты
    max_elevation_change?: number // метры
    avoid_areas?: string[]
    required_amenities?: string[] // ['parking', 'restroom', 'cafe']
  }
  
  quality_filters: {
    min_point_spacing?: number // метры
    max_point_spacing?: number // метры
    diversity_score_threshold?: number
    uniqueness_threshold?: number
  }
}

// ======================================
// AI ИНТЕГРАЦИЯ
// ======================================

export interface AIPrompts {
  title_prompt?: string
  description_prompt?: string
  point_description_prompt?: string
  instructions_prompt?: string
  tags_prompt?: string
  
  // Контекстные переменные для промптов
  variables?: {
    [key: string]: string | number | boolean
  }
}

export interface AIProvider {
  id: string
  name: string
  provider_type: AIProviderType
  api_config: AIConfig
  supported_models: string[]
  default_model: string
  max_tokens_per_request: number
  max_requests_per_minute: number
  cost_per_1k_tokens: number
  is_active: boolean
  priority: number
  total_requests: number
  total_tokens_used: number
  total_cost_usd: number
  created_at: string
  updated_at: string
}

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'local' | 'huggingface'

export interface AIConfig {
  endpoint?: string
  api_key?: string
  organization_id?: string
  timeout?: number
  mock?: boolean
  
  // Специфичные настройки провайдера
  [key: string]: any
}

// ======================================
// ГЕНЕРАЦИЯ И ЛОГИРОВАНИЕ
// ======================================

export interface RouteGenerationLog {
  id: string
  template_id?: string
  generated_route_id?: string
  triggered_by?: string
  generation_type: GenerationType
  status: GenerationStatus
  generation_params?: GenerationParams
  city?: string
  target_date?: string
  result_data?: GenerationResult
  error_message?: string
  processing_time_ms?: number
  points_generated?: number
  ai_tokens_used?: number
  ai_provider?: string
  ai_model?: string
  ai_cost_usd?: number
  started_at: string
  completed_at?: string
  created_at: string
}

export type GenerationType = 'manual' | 'scheduled' | 'api' | 'bulk' | 'test'
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface GenerationParams {
  template_id?: string
  city: string
  max_points?: number
  transport_mode?: TransportMode
  difficulty?: DifficultyLevel
  radius_km?: number
  custom_criteria?: any
  ai_provider?: string
  ai_model?: string
  
  // Пользовательские предпочтения
  user_preferences?: {
    interests?: string[]
    accessibility_needs?: boolean
    time_constraints?: number
    group_size?: number
  }
}

export interface GenerationResult {
  route_data: {
    title: string
    description: string
    points: GeneratedPoint[]
    total_distance?: number
    estimated_duration?: number
    transport_mode: TransportMode
    difficulty: DifficultyLevel
    tags?: string[]
  }
  
  generation_metadata: {
    buildings_considered: number
    points_filtered: number
    ai_calls_made: number
    optimization_iterations: number
    quality_score: number
  }
  
  ai_usage: {
    provider: string
    model: string
    tokens_used: number
    cost_usd: number
    response_time_ms: number
  }
}

export interface GeneratedPoint {
  building_id?: string
  title: string
  description: string
  instructions?: string
  latitude: number
  longitude: number
  order_index: number
  estimated_time_minutes: number
  point_type: 'building' | 'waypoint' | 'rest_stop'
  
  // Дополнительные данные от AI
  ai_generated_content?: {
    description: string
    historical_context?: string
    architectural_notes?: string
    photo_tips?: string
  }
}

// ======================================
// РАСПИСАНИЕ ГЕНЕРАЦИИ
// ======================================

export interface RouteGenerationSchedule {
  id: string
  template_id: string
  created_by: string
  name: string
  description?: string
  cron_expression: string
  timezone: string
  generation_params?: GenerationParams
  max_routes_per_run: number
  target_cities: string[]
  is_active: boolean
  priority: number
  total_runs: number
  successful_runs: number
  last_run_at?: string
  next_run_at?: string
  created_at: string
  updated_at: string
}

// ======================================
// СЕЗОННАЯ ДОСТУПНОСТЬ
// ======================================

export interface SeasonalAvailability {
  spring?: {
    available: boolean
    best_months?: number[]
    special_notes?: string
  }
  summer?: {
    available: boolean
    best_months?: number[]
    special_notes?: string
  }
  autumn?: {
    available: boolean
    best_months?: number[]
    special_notes?: string
  }
  winter?: {
    available: boolean
    best_months?: number[]
    special_notes?: string
  }
}

// ======================================
// API ИНТЕРФЕЙСЫ
// ======================================

export interface GenerateRouteRequest {
  template_id?: string
  city: string
  route_title: string // Название маршрута от пользователя
  generation_params?: Partial<GenerationParams>
  ai_options?: {
    provider?: string
    model?: string
    enhance_descriptions?: boolean
  }
}

export interface GenerateRouteResponse {
  success: boolean
  route_id?: string
  generation_log_id: string
  message?: string
  error?: string
  
  // Предварительные данные (если генерация async)
  estimated_completion_time?: number
  status_endpoint?: string
}

export interface TemplateTestRequest {
  template_id: string
  city: string
  dry_run?: boolean
}

export interface TemplateTestResponse {
  success: boolean
  viable_buildings: number
  estimated_points: number
  estimated_quality_score: number
  potential_issues: string[]
  suggestions: string[]
}

// ======================================
// СТАТИСТИКА И АНАЛИТИКА
// ======================================

export interface AutogenerationStats {
  total_templates: number
  active_templates: number
  total_generations: number
  successful_generations: number
  success_rate: number
  
  // По категориям
  by_category: {
    [category in TemplateCategory]?: {
      templates: number
      generations: number
      success_rate: number
    }
  }
  
  // По городам
  by_city: {
    [city: string]: {
      generations: number
      success_rate: number
      avg_quality_score: number
    }
  }
  
  // AI использование
  ai_usage: {
    total_tokens: number
    total_cost_usd: number
    by_provider: {
      [provider: string]: {
        requests: number
        tokens: number
        cost_usd: number
      }
    }
  }
  
  // Временные метрики
  generation_times: {
    avg_processing_time_ms: number
    median_processing_time_ms: number
    max_processing_time_ms: number
  }
}

// ======================================
// УТИЛИТЫ И ХЕЛПЕРЫ
// ======================================

export class TemplateHelper {
  static getCategoryLabel(category: TemplateCategory): string {
    const labels: Record<TemplateCategory, string> = {
      seasonal: 'Сезонные маршруты',
      thematic: 'Тематические маршруты',
      architectural_style: 'По архитектурному стилю',
      historical_period: 'По историческому периоду',
      difficulty_based: 'По уровню сложности',
      duration_based: 'По продолжительности',
      personalized: 'Персонализированные',
      corporate: 'Корпоративные'
    }
    return labels[category]
  }
  
  static getStatusColor(status: GenerationStatus): string {
    const colors: Record<GenerationStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status]
  }
  
  static getStatusLabel(status: GenerationStatus): string {
    const labels: Record<GenerationStatus, string> = {
      pending: 'Ожидает',
      processing: 'Обрабатывается',
      completed: 'Завершено',
      failed: 'Ошибка',
      cancelled: 'Отменено'
    }
    return labels[status]
  }
  
  static validateCronExpression(cron: string): boolean {
    // Упрощенная валидация cron выражения
    const parts = cron.split(' ')
    return parts.length === 5 // минута час день месяц день_недели
  }
  
  static estimateGenerationTime(points: number, aiEnabled: boolean): number {
    // Базовое время + время на AI запросы
    const baseTime = points * 500 // 500мс на точку
    const aiTime = aiEnabled ? points * 2000 : 0 // 2сек на AI запрос
    return baseTime + aiTime
  }
}

export default {
  TemplateHelper
}