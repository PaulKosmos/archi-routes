'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Building2, Star, Eye, MapPin, Plus, Play, ChevronRight } from 'lucide-react'
import type { Building } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'

interface BuildingListProps {
  buildings: Building[]
  selectedBuilding: Building | null
  currentRouteBuildings: string[]
  onBuildingSelect: (building: Building) => void
  onBuildingDetails?: (buildingIdOrObject: string | Building) => void
  onAddToRoute: (buildingId: string) => void
  onStartRouteFrom: (buildingId: string) => void
  onRemoveFromRoute: (buildingId: string) => void
  title?: string
  maxHeight?: string
}

export default function BuildingList({
  buildings,
  selectedBuilding,
  currentRouteBuildings,
  onBuildingSelect,
  onBuildingDetails,
  onAddToRoute,
  onStartRouteFrom,
  onRemoveFromRoute,
  title = "🏛️ Buildings",
  maxHeight = "max-h-64"
}: BuildingListProps) {
  
  const handleAddToRoute = useCallback((e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation()
    onAddToRoute(buildingId)
  }, [onAddToRoute])

  const handleStartRouteFrom = useCallback((e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation()
    onStartRouteFrom(buildingId)
  }, [onStartRouteFrom])

  const handleRemoveFromRoute = useCallback((e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation()
    onRemoveFromRoute(buildingId)
  }, [onRemoveFromRoute])

  if (buildings.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>No buildings found</p>
          <p className="text-sm">Try changing filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2">
      <h3 className="font-medium font-display text-foreground mb-2">{title}</h3>
      <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
        {buildings.map(building => {
          const isSelected = selectedBuilding?.id === building.id
          const isInRoute = currentRouteBuildings.includes(building.id)
          
          return (
            <div
              key={building.id}
              onClick={() => onBuildingSelect(building)}
              className={`p-2 rounded-[var(--radius)] border transition-all duration-200 bg-card cursor-pointer ${
                isSelected
                  ? 'border-[hsl(var(--map-primary))] bg-[hsl(var(--map-primary))]/5 shadow-md'
                  : 'border-border hover:bg-muted hover:-translate-y-0.5 hover:shadow-md'
              } ${isInRoute ? 'ring-2 ring-[hsl(var(--map-primary))]/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Фото слева */}
                <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-[var(--radius)] bg-muted">
                  {building.image_url ? (
                    <Image
                      src={getStorageUrl(building.image_url, 'photos')}
                      alt={building.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Индикатор в маршруте */}
                  {isInRoute && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-[hsl(var(--map-primary))] rounded-full ring-2 ring-white"></div>
                  )}
                </div>

                {/* Информация по центру */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium font-display text-foreground text-sm mb-0.5 truncate">
                    {building.name}
                  </h4>

                  <div className="text-xs text-muted-foreground mb-0.5 truncate">
                    {building.architectural_style && (
                      <span className="font-medium">{building.architectural_style}</span>
                    )}
                    {building.architectural_style && building.city && <span className="mx-1">•</span>}
                    {building.city && <span>{building.city}</span>}
                  </div>

                  {/* Архитектор */}
                  {building.architect && (
                    <div className="text-xs text-muted-foreground mb-0.5 truncate">
                      <span className="opacity-75">by</span> <span className="font-medium">{building.architect}</span>
                    </div>
                  )}

                  {/* Статистика */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-metrics">
                    {(building.rating ?? 0) > 0 && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 mr-1 fill-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]" />
                        <span>{(building.rating ?? 0).toFixed(1)}</span>
                      </div>
                    )}

                    {(building.view_count ?? 0) > 0 && (
                      <div className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>{building.view_count}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Кнопка удаления из маршрута справа (только если в маршруте) */}
                {isInRoute && (
                  <button
                    onClick={(e) => handleRemoveFromRoute(e, building.id)}
                    className="flex items-center justify-center w-7 h-7 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full transition-colors flex-shrink-0"
                    title="Remove from Route"
                  >
                    <span className="text-sm font-bold">×</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
