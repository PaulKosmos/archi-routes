// src/utils/building-debug.ts - Утилиты для отладки зданий

import { createClient } from '@/lib/supabase'

export interface BuildingDebugInfo {
  total: number
  buildings: Array<{
    id: string
    name: string
    created_by?: string
    created_at: string
  }>
  currentUrl?: string
  extractedId?: string
}

/**
 * Получает список всех зданий для отладки
 */
export async function getAllBuildings(): Promise<BuildingDebugInfo> {
  const supabase = createClient()
  
  try {
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    return {
      total: buildings?.length || 0,
      buildings: buildings || [],
      currentUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      extractedId: typeof window !== 'undefined' ? extractIdFromUrl(window.location.href) ?? undefined : undefined
    }
  } catch (error) {
    console.error('Error getting buildings for debug:', error)
    return {
      total: 0,
      buildings: [],
      currentUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      extractedId: typeof window !== 'undefined' ? extractIdFromUrl(window.location.href) ?? undefined : undefined
    }
  }
}

/**
 * Извлекает ID здания из URL
 */
export function extractIdFromUrl(url: string): string | null {
  const matches = url.match(/\/buildings\/([^\/]+)/)
  return matches ? matches[1] : null
}

/**
 * Проверяет существование конкретного здания
 */
export async function checkBuildingExists(id: string): Promise<{
  exists: boolean
  building?: any
  error?: string
}> {
  const supabase = createClient()
  
  try {
    if (!id || id.trim() === '') {
      return {
        exists: false,
        error: 'Empty or invalid ID'
      }
    }

    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return {
        exists: false,
        error: error.message
      }
    }

    return {
      exists: true,
      building
    }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Поиск зданий по частичному совпадению ID или названия
 */
export async function searchBuildings(query: string): Promise<any[]> {
  const supabase = createClient()
  
  try {
    if (!query || query.trim() === '') {
      return []
    }

    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, created_at')
      .or(`id.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(5)

    if (error) {
      throw error
    }

    return buildings || []
  } catch (error) {
    console.error('Error searching buildings:', error)
    return []
  }
}
