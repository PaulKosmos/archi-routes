'use client'

import { 
  Building2, 
  Route, 
  MapPin, 
  TrendingUp, 
  Users, 
  Star,
  Eye,
  Heart,
  Navigation,
  Clock,
  Filter
} from 'lucide-react'

interface MapStatsPanelProps {
  buildingsCount: number
  routesCount: number
  totalViews: number
  averageRating: number
  topCity?: string
  onQuickFilter: (filter: string, value: string) => void
  className?: string
}

export default function MapStatsPanel({
  buildingsCount,
  routesCount,
  totalViews,
  averageRating,
  topCity,
  onQuickFilter,
  className = ''
}: MapStatsPanelProps) {
  
  const quickFilters = [
    { label: 'Топ рейтинг', icon: Star, filter: 'rating', value: '4+' },
    { label: 'Популярные', icon: TrendingUp, filter: 'popular', value: 'high' },
    { label: 'Недавние', icon: Clock, filter: 'recent', value: 'week' },
    { label: 'С фото', icon: Eye, filter: 'has_images', value: 'true' }
  ]

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-6 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Статистика карты</h2>
        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="w-4 h-4 mr-1" />
          {topCity || 'Берлин'}
        </div>
      </div>

      {/* Основная статистика */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Здания</p>
              <p className="text-2xl font-bold text-blue-700">{buildingsCount}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Маршруты</p>
              <p className="text-2xl font-bold text-green-700">{routesCount}</p>
            </div>
            <Route className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Просмотры</p>
              <p className="text-2xl font-bold text-purple-700">{totalViews.toLocaleString()}</p>
            </div>
            <Eye className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900">Рейтинг</p>
              <p className="text-2xl font-bold text-yellow-700">{averageRating.toFixed(1)}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Быстрые фильтры */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Быстрые фильтры</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickFilters.map((filter, index) => (
            <button
              key={index}
              onClick={() => onQuickFilter(filter.filter, filter.value)}
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <filter.icon className="w-4 h-4 text-gray-600 mr-2 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700 group-hover:text-blue-700">{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Дополнительная информация */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Обновлено</span>
          <span>{new Date().toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
        </div>
        
        <div className="mt-2 flex items-center text-xs text-gray-500">
          <Filter className="w-3 h-3 mr-1" />
          <span>Используйте фильтры для уточнения поиска</span>
        </div>
      </div>
    </div>
  )
}

