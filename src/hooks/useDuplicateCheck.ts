/**
 * Hook для проверки дубликатов зданий
 * @module hooks/useDuplicateCheck
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  checkBuildingDuplicates,
  searchSimilarBuildings,
  type DuplicateCandidate,
  type DuplicateCheckResult
} from '@/lib/duplicateDetection'

interface UseDuplicateCheckProps {
  name: string
  city: string
  latitude?: number
  longitude?: number
  debounceMs?: number
}

export function useDuplicateCheck({
  name,
  city,
  latitude = 0,
  longitude = 0,
  debounceMs = 500
}: UseDuplicateCheckProps) {
  const supabase = useMemo(() => createClient(), [])
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<DuplicateCheckResult | null>(null)
  const [quickResults, setQuickResults] = useState<DuplicateCandidate[]>([])

  // Быстрая проверка при вводе названия (без координат)
  useEffect(() => {
    if (!name || name.length < 3 || !city) {
      setQuickResults([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await searchSimilarBuildings(supabase, {
        name,
        city,
        limit: 5
      })
      setQuickResults(results)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [name, city, supabase, debounceMs])

  // Полная проверка с координатами
  const performFullCheck = useCallback(async () => {
    if (!name || !city || !latitude || !longitude) {
      console.warn('Недостаточно данных для полной проверки дубликатов')
      return null
    }

    setChecking(true)
    try {
      const checkResult = await checkBuildingDuplicates(supabase, {
        name,
        city,
        latitude,
        longitude
      })

      setResult(checkResult)
      return checkResult
    } catch (error) {
      console.error('Ошибка проверки дубликатов:', error)
      return null
    } finally {
      setChecking(false)
    }
  }, [name, city, latitude, longitude, supabase])

  // Автоматическая полная проверка при наличии всех данных
  useEffect(() => {
    if (name && city && latitude !== 0 && longitude !== 0) {
      performFullCheck()
    }
  }, [name, city, latitude, longitude, performFullCheck])

  const hasHighConfidenceDuplicates = useMemo(() => {
    return result?.highestConfidence === 'high'
  }, [result])

  const hasDuplicates = useMemo(() => {
    return (result?.duplicates.length ?? 0) > 0 || quickResults.length > 0
  }, [result, quickResults])

  const reset = useCallback(() => {
    setResult(null)
    setQuickResults([])
    setChecking(false)
  }, [])

  return {
    // Состояние
    checking,
    hasDuplicates,
    hasHighConfidenceDuplicates,

    // Результаты
    fullCheckResult: result,
    quickResults,

    // Методы
    performFullCheck,
    reset
  }
}
