/**
 * Утилиты для проверки дубликатов зданий
 * @module lib/duplicateDetection
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface DuplicateCandidate {
  id: string
  name: string
  city: string
  address?: string
  latitude: number
  longitude: number
  distance_meters?: number
  similarity_score?: number
  match_type: 'exact_location' | 'exact_name' | 'similar_name'
  confidence: 'high' | 'medium' | 'low'
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  duplicates: DuplicateCandidate[]
  highestConfidence: 'high' | 'medium' | 'low'
}

/**
 * Проверка здания на дубликаты
 * Использует SQL функцию check_building_duplicates из миграции 051
 */
export async function checkBuildingDuplicates(
  supabase: SupabaseClient,
  buildingData: {
    name: string
    city: string
    latitude: number
    longitude: number
  }
): Promise<DuplicateCheckResult> {
  try {
    console.log('🔍 Проверка на дубликаты:', buildingData)

    // Вызываем SQL функцию для проверки
    const { data, error } = await supabase.rpc('check_building_duplicates', {
      building_name: buildingData.name,
      building_city: buildingData.city,
      building_lat: buildingData.latitude,
      building_lng: buildingData.longitude
    })

    if (error) {
      console.error('❌ Ошибка проверки дубликатов:', error)
      // Не блокируем создание если проверка не удалась
      return {
        isDuplicate: false,
        duplicates: [],
        highestConfidence: 'low'
      }
    }

    console.log('✅ Результаты проверки:', data)

    if (!data || data.length === 0) {
      return {
        isDuplicate: false,
        duplicates: [],
        highestConfidence: 'low'
      }
    }

    // Преобразуем результаты
    const duplicates: DuplicateCandidate[] = data.map((item: any) => ({
      id: item.duplicate_id,
      name: item.duplicate_name,
      city: buildingData.city,
      address: item.duplicate_address,
      latitude: 0, // Не возвращается из функции
      longitude: 0,
      distance_meters: item.distance_meters,
      similarity_score: item.similarity_score,
      match_type: item.match_type,
      confidence: item.confidence
    }))

    // Определяем наивысший уровень уверенности
    const highestConfidence = duplicates.reduce((highest, dup) => {
      if (dup.confidence === 'high') return 'high'
      if (dup.confidence === 'medium' && highest !== 'high') return 'medium'
      return highest
    }, 'low' as 'high' | 'medium' | 'low')

    const isDuplicate = duplicates.length > 0

    return {
      isDuplicate,
      duplicates,
      highestConfidence
    }
  } catch (error) {
    console.error('💥 Исключение при проверке дубликатов:', error)
    return {
      isDuplicate: false,
      duplicates: [],
      highestConfidence: 'low'
    }
  }
}

/**
 * Простой поиск похожих зданий по названию и городу
 * Для frontend autocomplete при вводе
 */
export async function searchSimilarBuildings(
  supabase: SupabaseClient,
  query: {
    name: string
    city?: string
    limit?: number
  }
): Promise<DuplicateCandidate[]> {
  try {
    if (query.name.length < 3) {
      return []
    }

    let queryBuilder = supabase
      .from('buildings')
      .select('id, name, city, address, latitude, longitude')
      .ilike('name', `%${query.name}%`)
      .in('moderation_status', ['approved', 'pending'])
      .limit(query.limit || 5)

    if (query.city) {
      queryBuilder = queryBuilder.eq('city', query.city)
    }

    const { data, error } = await queryBuilder

    if (error || !data) {
      console.error('Ошибка поиска похожих зданий:', error)
      return []
    }

    return data.map(building => ({
      id: building.id,
      name: building.name,
      city: building.city,
      address: building.address,
      latitude: building.latitude,
      longitude: building.longitude,
      match_type: 'similar_name' as const,
      confidence: 'medium' as const
    }))
  } catch (error) {
    console.error('💥 Ошибка searchSimilarBuildings:', error)
    return []
  }
}

/**
 * Поиск зданий в радиусе от точки
 */
export async function findNearbyBuildings(
  supabase: SupabaseClient,
  location: {
    latitude: number
    longitude: number
    radiusMeters?: number
  }
): Promise<DuplicateCandidate[]> {
  try {
    const { data, error } = await supabase.rpc('find_nearby_buildings', {
      lat: location.latitude,
      lng: location.longitude,
      radius_meters: location.radiusMeters || 50
    })

    if (error || !data) {
      console.error('Ошибка поиска ближайших зданий:', error)
      return []
    }

    return data.map((building: any) => ({
      id: building.id,
      name: building.name,
      city: building.city,
      address: building.address,
      latitude: building.latitude,
      longitude: building.longitude,
      distance_meters: building.distance_meters,
      match_type: 'exact_location' as const,
      confidence: building.distance_meters < 20 ? 'high' as const : 'medium' as const
    }))
  } catch (error) {
    console.error('💥 Ошибка findNearbyBuildings:', error)
    return []
  }
}

/**
 * Функция для вычисления схожести строк (Levenshtein distance)
 * Используется на клиенте для предварительной проверки
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
