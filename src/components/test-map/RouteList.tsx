'use client'

import { useCallback } from 'react'
import { RouteIcon, Clock, Star, Eye, Car, Bike, Footprints, Bus, MapPin } from 'lucide-react'
import type { Route } from '@/types/building'

interface RouteListProps {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect: (route: Route) => void
  title?: string
  maxHeight?: string
}

export default function RouteList({
  routes,
  selectedRoute,
  onRouteSelect,
  title = "🛤️ Маршруты",
  maxHeight = "max-h-64"
}: RouteListProps) {
  
  const getTransportIcon = useCallback((mode?: string) => {
    switch (mode) {
      case 'walking': return <Footprints className="w-4 h-4" />
      case 'cycling': return <Bike className="w-4 h-4" />
      case 'driving': return <Car className="w-4 h-4" />
      case 'public_transport': return <Bus className="w-4 h-4" />
      default: return <Footprints className="w-4 h-4" />
    }
  }, [])

  const getDifficultyColor = useCallback((level?: string) => {
    switch (level) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }, [])

  const getDifficultyText = useCallback((level?: string) => {
    switch (level) {
      case 'easy': return 'Легкий'
      case 'medium': return 'Средний'
      case 'hard': return 'Сложный'
      default: return 'Не указано'
    }
  }, [])

  if (routes.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
        <div className="text-center py-8 text-gray-500">
          <RouteIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Маршруты не найдены</p>
          <p className="text-sm">Попробуйте изменить фильтры</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
      <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
        {routes.map(route => {
          const isSelected = selectedRoute?.id === route.id
          
          return (
            <div 
              key={route.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
              }`}
              onClick={() => onRouteSelect(route)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                    {route.title}
                  </h4>
                  
                  {route.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {route.description}
                    </p>
                  )}

                  {/* Метаданные маршрута */}
                  <div className="text-xs text-gray-600 mb-2 space-y-1">
                    {route.city && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{route.city}{route.country && `, ${route.country}`}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      {route.transport_mode && (
                        <div className="flex items-center">
                          {getTransportIcon(route.transport_mode)}
                          <span className="ml-1 capitalize">
                            {route.transport_mode === 'public_transport' ? 'Транспорт' : route.transport_mode}
                          </span>
                        </div>
                      )}
                      
                      {route.difficulty_level && (
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(route.difficulty_level)}`}>
                            {getDifficultyText(route.difficulty_level)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Статистика маршрута */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {route.estimated_duration_minutes && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{Math.round(route.estimated_duration_minutes / 60)}ч {route.estimated_duration_minutes % 60}м</span>
                      </div>
                    )}
                    
                    {route.distance_km && (
                      <div className="flex items-center">
                        <RouteIcon className="w-3 h-3 mr-1" />
                        <span>{route.distance_km.toFixed(1)} км</span>
                      </div>
                    )}
                    
                    {route.points_count && (
                      <div className="flex items-center">
                        <span className="font-medium">{route.points_count} точек</span>
                      </div>
                    )}
                  </div>

                  {/* Рейтинг и просмотры */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    {route.rating && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                        <span>{route.rating.toFixed(1)}</span>
                        {route.review_count && (
                          <span className="ml-1">({route.review_count})</span>
                        )}
                      </div>
                    )}
                    
                    {route.completion_count && (
                      <div className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>{route.completion_count} прохождений</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Индикатор статуса */}
                <div className="flex flex-col items-end space-y-1 ml-2">
                  {route.is_premium && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Premium
                    </span>
                  )}
                  
                  {!route.is_published && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Черновик
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
