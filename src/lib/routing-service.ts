// lib/routing-service.ts
// Note: Fallback key for local development only. Set NEXT_PUBLIC_ORS_API_KEY in production.
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjAyNThmM2VhMjMxYzQwNGFiMTcyYjc2NDVlNjUyYWJkIiwiaCI6Im11cm11cjY0In0='
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2'

// Интерфейсы для OpenRouteService API
interface ORSStep {
  instruction: string
  distance: number
  duration: number
  type: string
  way_points: [number, number]
}

interface ORSSegment {
  steps: ORSStep[]
}

interface ORSProperties {
  summary: {
    distance: number
    duration: number
  }
  segments: ORSSegment[]
  ascent?: number
  descent?: number
}

interface ORSFeature {
  geometry: GeoJSON.LineString
  properties: ORSProperties
}

interface ORSResponse {
  features: ORSFeature[]
}

// Интерфейсы для Optimization API
interface OptimizationStep {
  type: string
  job?: number
}

interface OptimizationRoute {
  steps: OptimizationStep[]
}

interface OptimizationResponse {
  routes: OptimizationRoute[]
}

export interface RoutePoint {
  latitude: number
  longitude: number
  title?: string
}

export interface RouteOptions {
  transportMode: 'walking' | 'cycling' | 'driving' | 'public_transport'
  avoidTolls?: boolean
  avoidFerries?: boolean
  preferGreen?: boolean // Для велосипедов - предпочитать парки/зеленые зоны
}

export interface RouteResult {
  geometry: GeoJSON.LineString
  distance: number // в метрах
  duration: number // в секундах
  instructions: RouteInstruction[]
  summary: {
    distance: number
    duration: number
    ascent?: number
    descent?: number
  }
}

export interface RouteInstruction {
  instruction: string
  distance: number
  duration: number
  type: string
  way_points: [number, number] // индексы в geometry.coordinates
}

// Маппинг наших типов транспорта в профили ORS
const TRANSPORT_PROFILES = {
  walking: 'foot-walking',
  cycling: 'cycling-regular',
  driving: 'driving-car',
  public_transport: 'foot-walking' // Fallback, ORS не поддерживает общественный транспорт напрямую
}

/**
 * Построить маршрут между точками используя OpenRouteService
 */
export async function buildRoute(
  points: RoutePoint[],
  options: RouteOptions = { transportMode: 'walking' }
): Promise<RouteResult> {
  if (points.length < 2) {
    throw new Error('At least 2 points required to build a route')
  }

  console.log('🛣️ Building route with ORS:', {
    points: points.length,
    transportMode: options.transportMode
  })

  // ВРЕМЕННО: отключаем API и используем fallback
  console.log('⚠️ Using fallback route calculation (API disabled for testing)')
  return buildStraightLineRoute(points, options)
}

/**
 * Fallback: построить маршрут по прямым линиям
 */
function buildStraightLineRoute(
  points: RoutePoint[],
  options: RouteOptions
): RouteResult {
  const coordinates = points.map(point => [point.longitude, point.latitude])

  // Приблизительный расчет расстояния
  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    const dist = haversineDistance(
      coordinates[i][1], coordinates[i][0],
      coordinates[i + 1][1], coordinates[i + 1][0]
    )
    totalDistance += dist
  }

  // Приблизительная скорость по типу транспорта
  const speeds = {
    walking: 5, // км/ч
    cycling: 15,
    driving: 40,
    public_transport: 25
  }

  const duration = (totalDistance / 1000) / speeds[options.transportMode] * 3600 // в секундах

  return {
    geometry: {
      type: 'LineString',
      coordinates
    },
    distance: totalDistance,
    duration,
    instructions: [{
      instruction: `Follow ${totalDistance > 1000 ? (totalDistance / 1000).toFixed(1) + ' km' : Math.round(totalDistance) + ' m'} to destination`,
      distance: totalDistance,
      duration,
      type: 'depart',
      way_points: [0, coordinates.length - 1]
    }],
    summary: {
      distance: totalDistance,
      duration
    }
  }
}

/**
 * Рассчитать расстояние между двумя точками по формуле гаверсинусов
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // радиус Земли в метрах
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Получить оптимизированный маршрут для нескольких точек
 * (решение задачи коммивояжера для небольшого количества точек)
 */
export async function optimizeRoute(
  points: RoutePoint[],
  options: RouteOptions = { transportMode: 'walking' }
): Promise<{ optimizedPoints: RoutePoint[], route: RouteResult }> {
  if (points.length <= 3) {
    // Для малого количества точек оптимизация не нужна
    const route = await buildRoute(points, options)
    return { optimizedPoints: points, route }
  }

  console.log('🔄 Optimizing route for', points.length, 'points')

  try {
    const coordinates = points.map(point => [point.longitude, point.latitude])
    const profile = TRANSPORT_PROFILES[options.transportMode]

    const response = await fetch(`${ORS_BASE_URL}/optimization`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobs: coordinates.slice(1, -1).map((coord, index) => ({
          id: index + 1,
          location: coord
        })),
        vehicles: [{
          id: 0,
          profile,
          start: coordinates[0],
          end: coordinates[coordinates.length - 1]
        }],
        options: {
          g: true // return geometry
        }
      })
    })

    if (response.ok) {
      const data = await response.json()
      const optimizedIndices = data.routes[0].steps
        .filter((step: any) => step.type === 'job')
        .map((step: any) => step.job + 1) // +1 because we excluded start point

      const optimizedPoints = [
        points[0], // start point
        ...optimizedIndices.map((index: number) => points[index]),
        points[points.length - 1] // end point
      ]

      const route = await buildRoute(optimizedPoints, options)
      return { optimizedPoints, route }
    }
  } catch (error) {
    console.log('⚠️ Route optimization failed, using original order')
  }

  // Fallback к обычному маршруту
  const route = await buildRoute(points, options)
  return { optimizedPoints: points, route }
}

/**
 * Форматирование времени для отображения
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

/**
 * Форматирование расстояния для отображения
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}