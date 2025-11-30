'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'

interface PerformanceMonitorProps {
  showDetails?: boolean
  className?: string
}

export default function PerformanceMonitor({ 
  showDetails = false, 
  className = '' 
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const { metrics, isSupported, getPerformanceAnalysis } = usePerformanceMonitor({
    enableMemoryMonitoring: true,
    enableCoreWebVitals: true,
    reportInterval: 10000
  })

  if (!isSupported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center text-yellow-800">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="text-sm">Performance API не поддерживается</span>
        </div>
      </div>
    )
  }

  const analysis = getPerformanceAnalysis()

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="w-4 h-4" />
    if (score >= 50) return <TrendingUp className="w-4 h-4" />
    return <TrendingDown className="w-4 h-4" />
  }

  const formatMetric = (value: number | null, unit: string = 'ms') => {
    if (value === null) return '—'
    if (unit === 'ms') return `${Math.round(value)}ms`
    if (unit === 'MB') return `${value}MB`
    if (unit === 'score') return `${value}/100`
    return `${value}${unit}`
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Заголовок */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="font-medium text-gray-900">Производительность</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center ${getScoreColor(analysis.score)}`}>
            {getScoreIcon(analysis.score)}
            <span className="ml-1 font-medium">{analysis.score}/100</span>
          </div>
          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <TrendingDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">First Contentful Paint</div>
            <div className="font-medium text-gray-900">
              {formatMetric(metrics.fcp)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Largest Contentful Paint</div>
            <div className="font-medium text-gray-900">
              {formatMetric(metrics.lcp)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">First Input Delay</div>
            <div className="font-medium text-gray-900">
              {formatMetric(metrics.fid)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Layout Shift</div>
            <div className="font-medium text-gray-900">
              {formatMetric(metrics.cls, '')}
            </div>
          </div>
        </div>

        {/* Информация о памяти */}
        {metrics.memory && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">Использование памяти</div>
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-sm text-gray-600">Использовано:</span>
                <span className="ml-1 font-medium">{formatMetric(metrics.memory.used, 'MB')}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Лимит:</span>
                <span className="ml-1 font-medium">{formatMetric(metrics.memory.limit, 'MB')}</span>
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  (metrics.memory.used / metrics.memory.limit) > 0.8 
                    ? 'bg-red-500' 
                    : (metrics.memory.used / metrics.memory.limit) > 0.6 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                }`}
                style={{ 
                  width: `${Math.min((metrics.memory.used / metrics.memory.limit) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Детальная информация */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Проблемы */}
          {analysis.issues.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Проблемы производительности
              </h4>
              <ul className="space-y-1">
                {analysis.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Рекомендации */}
          {analysis.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Рекомендации
              </h4>
              <ul className="space-y-1">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-blue-600 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Дополнительные метрики */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Time to First Byte:</span>
              <span className="ml-2 font-medium">{formatMetric(metrics.ttfb)}</span>
            </div>
            <div>
              <span className="text-gray-500">Time to Interactive:</span>
              <span className="ml-2 font-medium">{formatMetric(metrics.tti)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
