// src/lib/smart-route-filtering.ts
// Умная система фильтрации маршрутов для карты

import { supabase } from './supabase'
import type {
  Route,
  RouteWithUserData,
  SmartRouteFilterOptions,
  UserRouteFavorite,
  RoutePublicationRequest
} from '../types/route'

export class SmartRouteFilter {

  /**
   * Получает отфильтрованные маршруты для отображения на карте
   * Приоритизация:
   * 1. Featured маршруты (max 5)
   * 2. Корпоративные в текущем городе (max 5) 
   * 3. Популярные публичные (рейтинг > 4.0, max 10)
   * 4. Недавние от verified авторов (max 5)
   * 5. AI-generated тематические (max 5)
   */
  static async getRoutesForMap(options: SmartRouteFilterOptions): Promise<RouteWithUserData[]> {
    const {
      city = 'Berlin', // По умолчанию Берлин
      maxRoutes = 30,
      userLocation,
      userPreferences,
      mapBounds
    } = options

    console.log('🔍 Getting smart filtered routes for map:', { city, maxRoutes })

    try {
      // Используем нашу SQL функцию для получения приоритизированных маршрутов
      const { data, error } = await supabase
        .rpc('get_filtered_routes_for_map', {
          p_city: city,
          p_limit: maxRoutes
        })

      if (error) {
        console.error('Error getting filtered routes:', error)
        // Fallback к обычному запросу
        return this.getFallbackRoutes(city, maxRoutes)
      }

      if (!data || data.length === 0) {
        console.log('No routes found, trying fallback')
        return this.getFallbackRoutes(city, maxRoutes)
      }

      // Преобразуем данные и применяем дополнительные фильтры
      let routes = data.map((route: any) => ({
        ...route,
        profiles: null // Добавим профили отдельно если нужно
      })) as RouteWithUserData[]

      // Применяем дополнительные фильтры
      routes = this.applyUserPreferences(routes, userPreferences)
      routes = this.applyGeographicFilter(routes, mapBounds)
      routes = this.calculateRelevanceScores(routes, userLocation, userPreferences)

      console.log(`✅ Found ${routes.length} filtered routes`)
      return routes.slice(0, maxRoutes)

    } catch (error) {
      console.error('Exception in getRoutesForMap:', error)
      return this.getFallbackRoutes(city, maxRoutes)
    }
  }

  /**
   * Fallback метод для получения маршрутов если основная функция не работает
   */
  private static async getFallbackRoutes(city: string, maxRoutes: number): Promise<RouteWithUserData[]> {
    console.log('🔄 Using fallback route fetching')

    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        profiles!routes_created_by_fkey (
          id, full_name, avatar_url, role
        )
      `)
      .eq('publication_status', 'published')
      .in('route_visibility', ['public', 'featured'])
      .ilike('city', `%${city}%`)
      .order('priority_score', { ascending: false })
      .limit(maxRoutes)

    if (error) {
      console.error('Fallback route fetch error:', error)
      return []
    }

    return data || []
  }

  /**
   * Применяет пользовательские предпочтения
   */
  private static applyUserPreferences(
    routes: RouteWithUserData[],
    preferences?: SmartRouteFilterOptions['userPreferences']
  ): RouteWithUserData[] {
    if (!preferences) return routes

    return routes.filter(route => {
      // Фильтр по транспорту
      if (preferences.transport_modes?.length) {
        if (!preferences.transport_modes.includes(route.transport_mode as any)) {
          return false
        }
      }

      // Фильтр по уровню сложности
      if (preferences.difficulty_levels?.length) {
        if (!preferences.difficulty_levels.includes(route.difficulty_level || '')) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Применяет географический фильтр (только маршруты в видимой области карты)
   */
  private static applyGeographicFilter(
    routes: RouteWithUserData[],
    bounds?: SmartRouteFilterOptions['mapBounds']
  ): RouteWithUserData[] {
    if (!bounds) return routes

    return routes.filter(route => {
      if (!route.route_geometry?.coordinates) return true

      // Проверяем, пересекается ли маршрут с видимой областью карты
      const coordinates = route.route_geometry.coordinates

      for (const [lng, lat] of coordinates) {
        if (lat >= bounds.south && lat <= bounds.north &&
          lng >= bounds.west && lng <= bounds.east) {
          return true // хотя бы одна точка в области
        }
      }

      return false
    })
  }

  /**
   * Вычисляет релевантность маршрутов для пользователя
   */
  private static calculateRelevanceScores(
    routes: RouteWithUserData[],
    userLocation?: [number, number],
    preferences?: SmartRouteFilterOptions['userPreferences']
  ): RouteWithUserData[] {
    return routes.map(route => {
      let relevanceScore = route.priority_score || 0

      // Бонус за близость к пользователю
      if (userLocation && route.route_geometry?.coordinates?.length) {
        const routeStart = route.route_geometry.coordinates[0]
        const distance = this.calculateDistance(
          userLocation[0], userLocation[1],
          routeStart[1], routeStart[0] // lat, lng
        )

        route.distance_from_user = distance

        // Чем ближе, тем больше бонус (до 20 баллов)
        if (distance < 1) relevanceScore += 20
        else if (distance < 3) relevanceScore += 15
        else if (distance < 5) relevanceScore += 10
        else if (distance < 10) relevanceScore += 5
      }

      // Бонус за соответствие предпочтениям
      if (preferences?.transport_modes?.includes(route.transport_mode as any)) {
        relevanceScore += 10
      }

      // Бонус за тип маршрута
      if (route.route_visibility === 'featured') {
        relevanceScore += 30
      }

      route.relevance_score = relevanceScore
      return route
    })
  }

  /**
   * Вычисляет расстояние между двумя точками в километрах
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Радиус Земли в км
    const dLat = this.deg2rad(lat2 - lat1)
    const dLng = this.deg2rad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}

/**
 * API функции для работы с избранными маршрутами пользователя
 */
export class UserRouteFavorites {

  /**
   * Добавить маршрут в избранное
   */
  static async addToFavorites(userId: string, routeId: string, notes?: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_route_favorites')
      .insert({
        user_id: userId,
        route_id: routeId,
        notes: notes
      })

    if (error) {
      console.error('Error adding route to favorites:', error)
      return false
    }

    return true
  }

  /**
   * Удалить из избранного
   */
  static async removeFromFavorites(userId: string, routeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_route_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('route_id', routeId)

    if (error) {
      console.error('Error removing route from favorites:', error)
      return false
    }

    return true
  }

  /**
   * Проверить, в избранном ли маршрут
   */
  static async isFavorite(userId: string, routeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_route_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('route_id', routeId)
      .single()

    return !error && !!data
  }

  /**
   * Получить избранные маршруты пользователя
   */
  static async getUserFavorites(userId: string): Promise<RouteWithUserData[]> {
    const { data, error } = await supabase
      .from('user_route_favorites')
      .select(`
        routes (
          *,
          profiles!routes_created_by_fkey (full_name, avatar_url)
        ),
        notes,
        personal_rating,
        completed_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user favorites:', error)
      return []
    }

    return data?.map((item: any) => ({
      ...item.routes,
      user_notes: item.notes,
      user_rating: item.personal_rating,
      completed_at: item.completed_at
    })) || []
  }

  /**
   * Отметить маршрут как пройденный
   */
  static async markAsCompleted(
    userId: string,
    routeId: string,
    rating?: number,
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('user_route_favorites')
      .upsert({
        user_id: userId,
        route_id: routeId,
        completed_at: new Date().toISOString(),
        personal_rating: rating,
        completion_notes: notes
      })

    if (error) {
      console.error('Error marking route as completed:', error)
      return false
    }

    return true
  }
}

/**
 * Система заявок на публикацию маршрутов
 */
export class RoutePublicationSystem {

  /**
   * Подать заявку на публикацию маршрута
   */
  static async requestPublication(
    routeId: string,
    requestType: 'publish' | 'feature' | 'corporate',
    justification: string,
    businessInfo?: any
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('route_publication_requests')
      .insert({
        route_id: routeId,
        requested_by: user.id,
        request_type: requestType,
        justification: justification,
        business_info: businessInfo
      })

    if (error) {
      console.error('Error creating publication request:', error)
      return false
    }

    return true
  }

  /**
   * Получить заявки пользователя
   */
  static async getUserRequests(userId: string) {
    const { data, error } = await supabase
      .from('route_publication_requests')
      .select(`
        *,
        routes (id, title, description),
        profiles!route_publication_requests_reviewed_by_fkey (full_name)
      `)
      .eq('requested_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user requests:', error)
      return []
    }

    return data || []
  }
}

/**
 * Утилиты для форматирования
 */
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
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

/**
 * Константы для приоритетов маршрутов
 */
export const ROUTE_PRIORITIES = {
  FEATURED: 50,
  CORPORATE: 30,
  BLOG: 25,
  INSTITUTIONAL: 20,
  USER: 15,
  AI_GENERATED: 5
} as const

export const ROUTE_VISIBILITY = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  FEATURED: 'featured'
} as const

export const PUBLICATION_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
} as const

export const ROUTE_SOURCE = {
  USER: 'user',
  BLOG: 'blog',
  AI_GENERATED: 'ai_generated',
  CORPORATE: 'corporate',
  INSTITUTIONAL: 'institutional'
} as const
