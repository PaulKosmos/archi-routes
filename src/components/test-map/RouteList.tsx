'use client'

import { useCallback } from 'react'
import { RouteIcon, Clock, Star, Eye, Car, Bike, Footprints, Bus, MapPin, ChevronRight } from 'lucide-react'
import type { Route } from '@/types/route'

interface RouteListProps {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect: (route: Route) => void
  onRouteDetails?: (route: Route) => void
  title?: string
  maxHeight?: string
}

export default function RouteList({
  routes,
  selectedRoute,
  onRouteSelect,
  onRouteDetails,
  title = "🛤️ Routes",
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
      default: return 'text-muted-foreground bg-muted'
    }
  }, [])

  const getDifficultyText = useCallback((level?: string) => {
    switch (level) {
      case 'easy': return 'Easy'
      case 'medium': return 'Medium'
      case 'hard': return 'Hard'
      default: return 'Not specified'
    }
  }, [])

  if (routes.length === 0) {
    return (
      <div className="p-1 md:p-4">
        <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>
        <div className="text-center py-4 md:py-8 text-muted-foreground">
          <RouteIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>No routes found</p>
          <p className="text-sm">Try changing filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-1 md:p-4">
      {title && <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>}
      <div className={`space-y-1.5 md:space-y-2 overflow-y-auto ${maxHeight}`}>
        {routes.map(route => {
          const isSelected = selectedRoute?.id === route.id

          return (
            <div
              key={route.id}
              className={`p-2 md:p-3 rounded-[var(--radius)] border transition-all duration-200 bg-card relative ${isSelected
                ? 'border-[hsl(var(--map-primary))] bg-[hsl(var(--map-primary))]/5 shadow-md'
                : 'border-border hover:bg-muted hover:-translate-y-0.5 hover:shadow-md'
                }`}
            >
              <div className="flex items-start justify-between" onClick={() => onRouteSelect(route)}>
                <div className="flex-1 min-w-0 cursor-pointer pr-2">
                  <h4 className="font-medium font-display text-foreground text-sm md:text-base mb-1 truncate">
                    {route.title}
                  </h4>

                  {route.description && (
                    <p className="text-xs text-muted-foreground mb-1 md:mb-2 line-clamp-1 md:line-clamp-2">
                      {route.description}
                    </p>
                  )}

                  {/* Метаданные маршрута */}
                  <div className="text-xs text-muted-foreground mb-1 md:mb-2 space-y-0.5 md:space-y-1">
                    {route.city && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{route.city}{route.country && `, ${route.country}`}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      {route.transport_mode && (
                        <div className="flex items-center text-[hsl(var(--map-primary))]">
                          {getTransportIcon(route.transport_mode)}
                          <span className="ml-1 capitalize">
                            {route.transport_mode === 'public_transport' ? 'Transit' : route.transport_mode}
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
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground font-metrics">
                    {route.estimated_duration_minutes && route.estimated_duration_minutes > 0 && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>
                          {Math.round(route.estimated_duration_minutes / 60) > 0 && `${Math.round(route.estimated_duration_minutes / 60)}h `}
                          {route.estimated_duration_minutes % 60 > 0 && `${route.estimated_duration_minutes % 60}m`}
                        </span>
                      </div>
                    )}

                    {route.distance_km && (
                      <div className="flex items-center">
                        <RouteIcon className="w-3 h-3 mr-1" />
                        <span>{route.distance_km.toFixed(1)} km</span>
                      </div>
                    )}

                    {route.points_count && route.points_count > 0 && (
                      <div className="flex items-center">
                        <span className="font-medium">{route.points_count} points</span>
                      </div>
                    )}
                  </div>

                  {/* Рейтинг и просмотры */}
                  {(((route.rating ?? 0) > 0) || ((route.completion_count ?? 0) > 0)) && (
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground font-metrics mt-1">
                      {route.rating && route.rating > 0 && (
                        <div className="flex items-center">
                          <Star className="w-3 h-3 mr-1" style={{ fill: '#facc15', color: '#facc15' }} />
                          <span>{route.rating.toFixed(1)}</span>
                          {route.review_count && route.review_count > 0 && (
                            <span className="ml-1">({route.review_count})</span>
                          )}
                        </div>
                      )}

                      {route.completion_count && route.completion_count > 0 && (
                        <div className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          <span>{route.completion_count} completions</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Индикатор статуса и кнопка "Подробнее" */}
                <div className="flex flex-col justify-between items-end ml-2 self-stretch">
                  <div className="flex flex-col items-end space-y-1">
                    {route.is_premium && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        Premium
                      </span>
                    )}

                    {!route.is_published && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Кнопка "Подробнее" */}
                  {onRouteDetails && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRouteDetails(route)
                      }}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      Details
                    </button>
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
