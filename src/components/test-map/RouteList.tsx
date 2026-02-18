'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Route as RouteIcon, Clock, Eye, Car, Bike, Footprints, Bus } from 'lucide-react'
import type { Route } from '@/types/route'
import { getStorageUrl } from '@/lib/storage'

interface RouteListProps {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect: (route: Route) => void
  onRouteDetails?: (route: Route) => void
  title?: string
  maxHeight?: string
}

function GradientStar({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="star-grad-r" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="url(#star-grad-r)"
        stroke="#f59e0b"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function RouteList({
  routes,
  selectedRoute,
  onRouteSelect,
  onRouteDetails,
  title = "Routes",
}: RouteListProps) {

  const getTransportIcon = useCallback((mode?: string) => {
    switch (mode) {
      case 'walking': return <Footprints className="w-3.5 h-3.5" />
      case 'cycling': return <Bike className="w-3.5 h-3.5" />
      case 'driving': return <Car className="w-3.5 h-3.5" />
      case 'public_transport': return <Bus className="w-3.5 h-3.5" />
      default: return <Footprints className="w-3.5 h-3.5" />
    }
  }, [])

  const getDifficultyStyle = useCallback((level?: string) => {
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
      default: return level ?? ''
    }
  }, [])

  if (routes.length === 0) {
    return (
      <div className="p-4">
        {title && <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>}
        <div className="text-center py-6 text-muted-foreground">
          <RouteIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm">No routes found</p>
          <p className="text-xs mt-0.5">Try changing filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2">
      {title && <h3 className="font-medium font-display text-foreground mb-2 px-1">{title}</h3>}
      <div className="space-y-2">
        {routes.map(route => {
          const isSelected = selectedRoute?.id === route.id
          const rating = Number(route.rating ?? 0)

          return (
            <div
              key={route.id}
              onClick={() => onRouteSelect(route)}
              className={`relative flex gap-3 p-2.5 rounded-[var(--radius)] border cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'border-[hsl(var(--map-primary))] bg-[hsl(var(--map-primary))]/5 shadow-sm'
                  : 'border-border bg-card hover:bg-muted hover:shadow-sm'
              }`}
            >
              {/* Thumbnail — от края до края по высоте */}
              <div className="relative w-24 self-stretch flex-shrink-0 overflow-hidden rounded-l-[var(--radius)] bg-muted -my-2.5 -ml-2.5">
                {route.thumbnail_url ? (
                  <Image
                    src={getStorageUrl(route.thumbnail_url, 'routes')}
                    alt={route.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--map-primary))]/5">
                    <RouteIcon className="w-7 h-7 text-[hsl(var(--map-primary))]/30" />
                  </div>
                )}
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {/* Название */}
                <h4 className="font-medium text-foreground text-sm leading-tight truncate">
                  {route.title}
                </h4>

                {/* Транспорт + сложность + город */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {route.transport_mode && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--map-primary))]/10 text-[hsl(var(--map-primary))]">
                      {getTransportIcon(route.transport_mode)}
                      <span className="capitalize">
                        {route.transport_mode === 'public_transport' ? 'Transit' : route.transport_mode}
                      </span>
                    </span>
                  )}
                  {route.difficulty_level && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getDifficultyStyle(route.difficulty_level)}`}>
                      {getDifficultyText(route.difficulty_level)}
                    </span>
                  )}
                  {route.city && (
                    <span className="text-[10px] text-muted-foreground/60 truncate">{route.city}</span>
                  )}
                </div>

                {/* Статистика + кнопка Details — одна строка внизу */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-metrics min-w-0">
                    {route.estimated_duration_minutes && route.estimated_duration_minutes > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>
                          {Math.floor(route.estimated_duration_minutes / 60) > 0
                            ? `${Math.floor(route.estimated_duration_minutes / 60)}h `
                            : ''}
                          {route.estimated_duration_minutes % 60 > 0
                            ? `${route.estimated_duration_minutes % 60}m`
                            : ''}
                        </span>
                      </div>
                    )}
                    {route.distance_km && (
                      <div className="flex items-center gap-1 shrink-0 opacity-70">
                        <RouteIcon className="w-3 h-3" />
                        <span>{route.distance_km.toFixed(1)} km</span>
                      </div>
                    )}
                    {route.points_count && route.points_count > 0 && (
                      <span className="shrink-0 opacity-50">{route.points_count} pts</span>
                    )}
                    {rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <GradientStar size={10} />
                        <span className="font-medium text-foreground/80">{rating.toFixed(1)}</span>
                      </div>
                    )}
                    {(route.completion_count ?? 0) > 0 && (
                      <div className="flex items-center gap-1 shrink-0 opacity-50">
                        <Eye className="w-3 h-3" />
                        <span>{route.completion_count}</span>
                      </div>
                    )}
                  </div>

                  {onRouteDetails && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRouteDetails(route)
                      }}
                      className="shrink-0 px-2.5 py-0.5 text-xs font-medium bg-[hsl(var(--map-primary))] text-white rounded hover:opacity-90 transition-opacity"
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
