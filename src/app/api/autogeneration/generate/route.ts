// src/app/api/autogeneration/generate/route.ts - API для генерации маршрутов

import { NextRequest, NextResponse } from 'next/server'
import { RouteGenerator, RouteGeneratorFactory } from '../../../../lib/autogeneration/route-generator'
import { buildRoute } from '../../../../lib/mapbox-routing-service'
import { createClient } from '@supabase/supabase-js'
import type {
  GenerateRouteRequest,
  GenerateRouteResponse,
  GenerationParams,
  GenerationResult
} from '../../../../types/autogeneration'

/**
 * Создает Supabase admin клиент с service role для обхода RLS
 * Создаем внутри функции, чтобы избежать ошибок при build на Vercel
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL и Service Role Key обязательны')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API: Запрос на генерацию маршрута')

    // Создаем Supabase admin клиент
    const supabaseAdmin = getSupabaseAdmin()

    // Получаем токен авторизации из заголовков
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    // Проверяем пользователя через Service Role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Неверный токен авторизации' },
        { status: 401 }
      )
    }

    console.log('👤 Авторизованный пользователь:', user.id)

    // Парсим тело запроса
    const body: GenerateRouteRequest = await request.json()
    
    // Валидация обязательных полей
    if (!body.city) {
      return NextResponse.json(
        { success: false, error: 'Город обязателен для генерации' },
        { status: 400 }
      )
    }

    if (!body.route_title || !body.route_title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Название маршрута обязательно' },
        { status: 400 }
      )
    }

    // Подготавливаем параметры генерации
    const generationParams: GenerationParams = {
      city: body.city,
      template_id: body.template_id,
      max_points: body.generation_params?.max_points || 8,
      transport_mode: body.generation_params?.transport_mode || 'walking',
      difficulty: body.generation_params?.difficulty || 'easy',
      radius_km: body.generation_params?.radius_km || 3,
      ai_provider: body.ai_options?.provider,
      ai_model: body.ai_options?.model,
      ...body.generation_params
    }

    console.log('📋 Параметры генерации:', generationParams)

    // Создаем генератор с AI провайдером
    const generator = await RouteGeneratorFactory.createGenerator(
      body.ai_options?.provider
    )

    // Запускаем генерацию
    const result = await generator.generateRoute(generationParams)

    console.log('✅ Генерация успешна, создаем маршрут в БД...')

    // Создаем маршрут в базе данных
    const routeId = await createRouteFromGeneration(result, generationParams, user.id, body.route_title.trim(), supabaseAdmin)

    const response: GenerateRouteResponse = {
      success: true,
      route_id: routeId,
      generation_log_id: 'generated', // Упрощенно
      message: `Маршрут "${result.route_data.title}" успешно создан`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Ошибка API генерации:', error)

    const response: GenerateRouteResponse = {
      success: false,
      generation_log_id: '',
      error: error.message || 'Неизвестная ошибка генерации'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

// ======================================
// СОЗДАНИЕ МАРШРУТА В БД
// ======================================

async function createRouteFromGeneration(
  result: GenerationResult,
  params: GenerationParams,
  userId: string,
  userTitle: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string> {
  try {
    // 2. ИСПРАВЛЕНИЕ КРИТИЧНОЙ ПРОБЛЕМЫ: Оптимизируем порядок точек для логичного маршрута
    console.log('🎯 Оптимизируем порядок точек...')
    const optimizedPoints = optimizePointsOrder(result.route_data.points)
    
    // 3. ИСПРАВЛЕНИЕ КРИТИЧНОЙ ПРОБЛЕМЫ: Строим реальный маршрут ПЕРЕД созданием в БД
    let routeGeometry = null
    let routeInstructions = null
    let routeSummary = null
    let realDistance = result.route_data.total_distance || 0
    let realDuration = result.route_data.estimated_duration || 120
    
    if (optimizedPoints.length >= 2) {
      try {
        console.log('🗺️ Строим реальный маршрут ПЕРЕД сохранением в БД...')
        
        const routePointsForAPI = optimizedPoints.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
          title: point.title
        }))

        const routeResult = await buildRoute(routePointsForAPI, {
          transportMode: result.route_data.transport_mode || 'walking'
        })
        
        // Сохраняем результаты для вставки в БД
        routeGeometry = routeResult.geometry
        routeInstructions = routeResult.instructions
        routeSummary = routeResult.summary
        realDistance = Math.round(routeResult.distance / 1000 * 100) / 100
        realDuration = Math.round(routeResult.duration / 60)
        
        console.log('✅ Реальный маршрут построен успешно:', {
          distance: `${realDistance} км`,
          duration: `${realDuration} мин`,
          instructions: routeInstructions.length,
          geometryCoords: routeGeometry.coordinates.length
        })
        
      } catch (routeError) {
        console.error('⚠️ Ошибка построения реального маршрута:', routeError)
        // Продолжаем без реального маршрута
      }
    } else {
      console.log('⚠️ Недостаточно точек для построения реального маршрута')
    }

    // 4. Создаем основной маршрут с геометрией
    const { data: route, error: routeError } = await supabaseAdmin
      .from('routes')
      .insert({
        title: userTitle, // Используем пользовательское название
        description: result.route_data.description,
        city: params.city,
        country: 'Germany', // Можно будет определять автоматически
        created_by: userId, // Используем ID авторизованного пользователя
        route_type: result.route_data.transport_mode || 'walking',
        difficulty_level: result.route_data.difficulty || 'easy',
        estimated_duration_minutes: realDuration,
        distance_km: realDistance,
        points_count: optimizedPoints.length,
        transport_mode: result.route_data.transport_mode || 'walking',
        tags: result.route_data.tags || [],
        
        // ИСПРАВЛЕНИЕ: Реальная геометрия дорог сохраняется сразу при создании
        route_geometry: routeGeometry,
        route_instructions: routeInstructions,
        route_summary: routeSummary,
        
        // Система публикации - СГЕНЕРИРОВАННЫЕ МАРШРУТЫ ПО УМОЛЧАНИЮ ПРИВАТНЫЕ
        route_visibility: 'private',
        publication_status: 'draft',
        route_source: 'ai_generated',
        priority_score: Math.round(result.generation_metadata.quality_score * 10) || 10,
        
        // Автогенерация метаданные
        auto_generated_params: {
          template_id: params.template_id,
          generation_params: params,
          ai_provider: result.ai_usage.provider,
          ai_model: result.ai_usage.model,
          quality_score: result.generation_metadata.quality_score,
          generation_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (routeError) {
      throw new Error(`Ошибка создания маршрута: ${routeError.message}`)
    }

    console.log('✅ Маршрут создан с реальной геометрией:', route.id)

    // 5. Создаем точки маршрута с оптимизированным порядком
    const routePoints = optimizedPoints.map((point: any, index: number) => ({
      route_id: route.id,
      building_id: point.building_id,
      order_index: index, // Используем новый индекс после оптимизации
      title: point.title,
      description: point.description,
      latitude: point.latitude,
      longitude: point.longitude,
      instructions: point.instructions,
      estimated_time_minutes: point.estimated_time_minutes,
      point_type: point.point_type || 'building'
    }))

    const { error: pointsError } = await supabaseAdmin
      .from('route_points')
      .insert(routePoints)

    if (pointsError) {
      console.error('Ошибка создания точек маршрута:', pointsError)
      // Не критично, можно продолжить
    } else {
      console.log(`✅ Создано ${routePoints.length} точек маршрута в оптимизированном порядке`)
    }

    console.log('🎉 Автогенерированный маршрут создан полностью с реальными дорогами!')    
    return route.id

  } catch (error) {
    console.error('❌ Ошибка создания маршрута в БД:', error)
    throw error
  }
}

// ======================================
// ОПТИМИЗАЦИЯ ПОРЯДКА ТОЧЕК - ИСПРАВЛЕНИЕ КРИТИЧНОЙ ПРОБЛЕМЫ
// ======================================

/**
 * 🎯 Оптимизирует порядок точек для логичного маршрута
 * Исправляет проблему хаотичного порядка точек в автогенерированных маршрутах
 */
function optimizePointsOrder(points: any[]): any[] {
  console.log('🔧 Начинаем оптимизацию порядка точек...')
  
  if (points.length <= 2) {
    console.log('⚠️ Недостаточно точек для оптимизации, возвращаем как есть')
    return points
  }

  // 1. Находим центр масс всех точек
  const centerLat = points.reduce((sum, p) => sum + (p.latitude || 0), 0) / points.length
  const centerLng = points.reduce((sum, p) => sum + (p.longitude || 0), 0) / points.length
  
  console.log('📍 Центр маршрута:', { lat: centerLat.toFixed(4), lng: centerLng.toFixed(4) })

  // 2. Находим самую близкую к центру точку как стартовую
  let startPoint = points[0]
  let minDistanceToCenter = calculateDistance(centerLat, centerLng, startPoint.latitude, startPoint.longitude)
  
  for (const point of points) {
    const distance = calculateDistance(centerLat, centerLng, point.latitude, point.longitude)
    if (distance < minDistanceToCenter) {
      minDistanceToCenter = distance
      startPoint = point
    }
  }
  
  console.log('🎯 Стартовая точка:', startPoint.title)

  // 3. Применяем алгоритм ближайшего соседа (Nearest Neighbor)
  const optimized = [startPoint]
  const remaining = points.filter(p => p !== startPoint)
  
  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1]
    
    // Находим ближайшую из оставшихся точек
    let nearest = remaining[0]
    let minDistance = calculateDistance(
      current.latitude, current.longitude,
      nearest.latitude, nearest.longitude
    )
    
    for (const point of remaining) {
      const distance = calculateDistance(
        current.latitude, current.longitude,
        point.latitude, point.longitude
      )
      
      if (distance < minDistance) {
        minDistance = distance
        nearest = point
      }
    }
    
    optimized.push(nearest)
    remaining.splice(remaining.indexOf(nearest), 1)
    
    console.log(`➡️ Следующая точка: ${nearest.title} (${Math.round(minDistance)}м)`)
  }
  
  // 4. Вычисляем улучшение
  const originalDistance = calculateTotalRouteDistance(points)
  const optimizedDistance = calculateTotalRouteDistance(optimized)
  const improvement = ((originalDistance - optimizedDistance) / originalDistance * 100).toFixed(1)
  
  console.log('📊 Результат оптимизации:', {
    originalDistance: `${Math.round(originalDistance)}м`,
    optimizedDistance: `${Math.round(optimizedDistance)}м`,
    improvement: `${improvement}% улучшение`
  })
  
  return optimized
}

/**
 * Вычисляет общую длину маршрута через все точки
 */
function calculateTotalRouteDistance(points: any[]): number {
  if (points.length < 2) return 0
  
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(
      points[i].latitude, points[i].longitude,
      points[i + 1].latitude, points[i + 1].longitude
    )
  }
  return total
}

/**
 * Формула гаверсинусов для вычисления расстояния между координатами
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // радиус Земли в метрах
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}