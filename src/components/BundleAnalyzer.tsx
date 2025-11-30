'use client'

import { useState, useEffect } from 'react'
import { Package, Download, AlertCircle, CheckCircle } from 'lucide-react'

interface BundleInfo {
  name: string
  size: number
  gzippedSize?: number
  chunks: string[]
  modules: {
    name: string
    size: number
    percentage: number
  }[]
}

interface BundleAnalyzerProps {
  className?: string
}

export default function BundleAnalyzer({ className = '' }: BundleAnalyzerProps) {
  const [bundleInfo, setBundleInfo] = useState<BundleInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // В реальном проекте здесь был бы API вызов для получения информации о бандле
    // Пока используем моковые данные
    const mockBundleInfo: BundleInfo[] = [
      {
        name: 'main',
        size: 1024 * 1024, // 1MB
        gzippedSize: 256 * 1024, // 256KB
        chunks: ['main', 'vendor'],
        modules: [
          { name: 'react', size: 512 * 1024, percentage: 50 },
          { name: 'next.js', size: 256 * 1024, percentage: 25 },
          { name: 'leaflet', size: 128 * 1024, percentage: 12.5 },
          { name: 'other', size: 128 * 1024, percentage: 12.5 }
        ]
      },
      {
        name: 'vendor',
        size: 512 * 1024, // 512KB
        gzippedSize: 128 * 1024, // 128KB
        chunks: ['vendor'],
        modules: [
          { name: 'lodash', size: 256 * 1024, percentage: 50 },
          { name: 'moment', size: 128 * 1024, percentage: 25 },
          { name: 'other', size: 128 * 1024, percentage: 25 }
        ]
      }
    ]

    setTimeout(() => {
      setBundleInfo(mockBundleInfo)
      setIsLoading(false)
    }, 1000)
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getTotalSize = () => {
    return bundleInfo.reduce((total, bundle) => total + bundle.size, 0)
  }

  const getTotalGzippedSize = () => {
    return bundleInfo.reduce((total, bundle) => total + (bundle.gzippedSize || bundle.size), 0)
  }

  const getCompressionRatio = () => {
    const total = getTotalSize()
    const gzipped = getTotalGzippedSize()
    return total > 0 ? ((total - gzipped) / total * 100) : 0
  }

  const getSizeColor = (size: number) => {
    if (size > 1024 * 1024) return 'text-red-600' // > 1MB
    if (size > 512 * 1024) return 'text-yellow-600' // > 512KB
    return 'text-green-600' // < 512KB
  }

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Анализ бандла...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Ошибка анализа бандла: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Package className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="font-medium text-gray-900">Анализ бандла</h3>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatSize(getTotalSize())}</div>
            <div className="text-sm text-gray-500">Общий размер</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatSize(getTotalGzippedSize())}</div>
            <div className="text-sm text-gray-500">Gzipped</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{getCompressionRatio().toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Сжатие</div>
          </div>
        </div>
      </div>

      {/* Детали бандлов */}
      <div className="p-4">
        <div className="space-y-4">
          {bundleInfo.map((bundle, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{bundle.name}</h4>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`font-medium ${getSizeColor(bundle.size)}`}>
                      {formatSize(bundle.size)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {bundle.gzippedSize ? formatSize(bundle.gzippedSize) : '—'} gzipped
                    </div>
                  </div>
                </div>
              </div>

              {/* Прогресс бар */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(bundle.size / getTotalSize()) * 100}%` 
                  }}
                />
              </div>

              {/* Модули */}
              <div className="space-y-2">
                {bundle.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
                      <span className="text-gray-700">{module.name}</span>
                    </div>
                    <div className="text-gray-500">
                      {formatSize(module.size)} ({module.percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Рекомендации */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Рекомендации по оптимизации
          </h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Используйте code splitting для уменьшения initial bundle</li>
            <li>• Рассмотрите lazy loading для больших библиотек</li>
            <li>• Удалите неиспользуемые зависимости</li>
            <li>• Используйте tree shaking для оптимизации</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
