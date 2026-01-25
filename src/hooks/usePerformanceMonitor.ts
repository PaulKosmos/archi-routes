import { useEffect, useState, useCallback } from 'react'

interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  tti: number | null // Time to Interactive
  memory: {
    used: number
    total: number
    limit: number
  } | null
}

interface PerformanceConfig {
  enableMemoryMonitoring?: boolean
  enableCoreWebVitals?: boolean
  enableResourceTiming?: boolean
  reportInterval?: number
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

/**
 * Хук для мониторинга производительности
 */
export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const {
    enableMemoryMonitoring = true,
    enableCoreWebVitals = true,
    enableResourceTiming = true,
    reportInterval = 5000,
    onMetricsUpdate
  } = config

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    tti: null,
    memory: null
  })

  const [isSupported, setIsSupported] = useState(false)

  // Проверяем поддержку Performance API
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 
                     'performance' in window &&
                     'PerformanceObserver' in window
    setIsSupported(supported)
  }, [])

  // Получаем Core Web Vitals
  const getCoreWebVitals = useCallback(() => {
    if (!isSupported || !enableCoreWebVitals) return

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
        }
      }
    })
    fcpObserver.observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming
        setMetrics(prev => ({ ...prev, fid: eventEntry.processingStart - eventEntry.startTime }))
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
          setMetrics(prev => ({ ...prev, cls: clsValue }))
        }
      }
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    return () => {
      fcpObserver.disconnect()
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [isSupported, enableCoreWebVitals])

  // Получаем Time to First Byte
  const getTTFB = useCallback(() => {
    if (!isSupported) return null

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return navigation ? navigation.responseStart - navigation.requestStart : null
  }, [isSupported])

  // Получаем Time to Interactive
  const getTTI = useCallback(() => {
    if (!isSupported) return null

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return navigation ? navigation.loadEventEnd - navigation.fetchStart : null
  }, [isSupported])

  // Получаем информацию о памяти
  const getMemoryInfo = useCallback(() => {
    if (!enableMemoryMonitoring || !('memory' in performance)) return null

    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
    }
  }, [enableMemoryMonitoring])

  // Обновляем метрики
  const updateMetrics = useCallback(() => {
    const newMetrics: Partial<PerformanceMetrics> = {}

    if (enableCoreWebVitals) {
      newMetrics.ttfb = getTTFB()
      newMetrics.tti = getTTI()
    }

    if (enableMemoryMonitoring) {
      newMetrics.memory = getMemoryInfo()
    }

    setMetrics(prev => {
      const updatedMetrics = { ...prev, ...newMetrics }
      
      if (onMetricsUpdate) {
        onMetricsUpdate(updatedMetrics)
      }
      
      return updatedMetrics
    })
  }, [enableCoreWebVitals, enableMemoryMonitoring, getTTFB, getTTI, getMemoryInfo, onMetricsUpdate])

  // Запускаем мониторинг
  useEffect(() => {
    if (!isSupported) return

    const cleanup = getCoreWebVitals()
    updateMetrics()

    const interval = setInterval(updateMetrics, reportInterval)

    return () => {
      if (cleanup) cleanup()
      clearInterval(interval)
    }
  }, [isSupported, getCoreWebVitals, updateMetrics, reportInterval])

  // Получаем детальную информацию о ресурсах
  const getResourceTiming = useCallback(() => {
    if (!isSupported || !enableResourceTiming) return []

    return performance.getEntriesByType('resource').map(entry => ({
      name: entry.name,
      duration: entry.duration,
      size: (entry as any).transferSize || 0,
      type: (entry as any).initiatorType
    }))
  }, [isSupported, enableResourceTiming])

  // Анализ производительности
  const getPerformanceAnalysis = useCallback(() => {
    const analysis = {
      score: 0,
      issues: [] as string[],
      recommendations: [] as string[]
    }

    // Анализируем FCP
    if (metrics.fcp !== null) {
      if (metrics.fcp > 3000) {
        analysis.issues.push('First Contentful Paint слишком медленный (>3s)')
        analysis.recommendations.push('Оптимизируйте критический путь рендеринга')
      } else if (metrics.fcp < 1800) {
        analysis.score += 25
      }
    }

    // Анализируем LCP
    if (metrics.lcp !== null) {
      if (metrics.lcp > 4000) {
        analysis.issues.push('Largest Contentful Paint слишком медленный (>4s)')
        analysis.recommendations.push('Оптимизируйте загрузку изображений и шрифтов')
      } else if (metrics.lcp < 2500) {
        analysis.score += 25
      }
    }

    // Анализируем FID
    if (metrics.fid !== null) {
      if (metrics.fid > 300) {
        analysis.issues.push('First Input Delay слишком большой (>300ms)')
        analysis.recommendations.push('Уменьшите JavaScript блокировки')
      } else if (metrics.fid < 100) {
        analysis.score += 25
      }
    }

    // Анализируем CLS
    if (metrics.cls !== null) {
      if (metrics.cls > 0.25) {
        analysis.issues.push('Cumulative Layout Shift слишком большой (>0.25)')
        analysis.recommendations.push('Фиксируйте размеры изображений и контейнеров')
      } else if (metrics.cls < 0.1) {
        analysis.score += 25
      }
    }

    // Анализируем память
    if (metrics.memory) {
      const memoryUsagePercent = (metrics.memory.used / metrics.memory.limit) * 100
      if (memoryUsagePercent > 80) {
        analysis.issues.push(`Использование памяти критично: ${memoryUsagePercent.toFixed(1)}%`)
        analysis.recommendations.push('Оптимизируйте использование памяти и добавьте очистку')
      }
    }

    return analysis
  }, [metrics])

  return {
    metrics,
    isSupported,
    getResourceTiming,
    getPerformanceAnalysis,
    updateMetrics
  }
}
