'use client'

import { useCallback } from 'react'
import { Building2, Star, Eye, MapPin, Plus, Play, ChevronRight } from 'lucide-react'
import type { Building } from '@/types/building'

interface BuildingListProps {
  buildings: Building[]
  selectedBuilding: Building | null
  currentRouteBuildings: string[]
  onBuildingSelect: (building: Building) => void
  onBuildingDetails?: (building: Building) => void
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
  title = "🏛️ Здания",
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
          <p>Здания не найдены</p>
          <p className="text-sm">Попробуйте изменить фильтры</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>
      <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
        {buildings.map(building => {
          const isSelected = selectedBuilding?.id === building.id
          const isInRoute = currentRouteBuildings.includes(building.id)
          
          return (
            <div
              key={building.id}
              className={`p-2 md:p-3 rounded-[var(--radius)] border transition-all duration-200 bg-card ${
                isSelected
                  ? 'border-[hsl(var(--map-primary))] bg-[hsl(var(--map-primary))]/5 shadow-md'
                  : 'border-border hover:border-[hsl(var(--map-primary))]/50 hover:bg-muted hover:-translate-y-0.5 hover:shadow-md'
              } ${isInRoute ? 'ring-2 ring-[hsl(var(--map-primary))]/30' : ''}`}
            >
              <div className="flex items-start justify-between" onClick={() => onBuildingSelect(building)}>
                <div className="flex-1 min-w-0 cursor-pointer">
                  <h4 className="font-medium font-display text-foreground text-sm md:text-base mb-1 truncate">
                    {building.name}
                  </h4>

                  <div className="text-xs text-muted-foreground mb-1 md:mb-2 space-y-0.5 md:space-y-1">
                    {building.architectural_style && (
                      <div className="flex items-center">
                        <span className="font-medium">Стиль:</span>
                        <span className="ml-1">{building.architectural_style}</span>
                      </div>
                    )}
                    
                    {building.architect && (
                      <div className="flex items-center">
                        <span className="font-medium">Архитектор:</span>
                        <span className="ml-1 truncate">{building.architect}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{building.city}, {building.country}</span>
                    </div>
                  </div>

                  {/* Статистика */}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground font-metrics">
                    {building.rating && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 mr-1 fill-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]" />
                        <span>{building.rating.toFixed(1)}</span>
                        {building.review_count && (
                          <span className="ml-1">({building.review_count})</span>
                        )}
                      </div>
                    )}

                    {building.view_count && (
                      <div className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>{building.view_count}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Действия */}
                <div className="flex flex-col space-y-1 ml-2">
                  {!isInRoute ? (
                    <>
                      <button
                        onClick={(e) => handleAddToRoute(e, building.id)}
                        className="flex items-center justify-center w-8 h-8 bg-[hsl(var(--map-primary))]/10 hover:bg-[hsl(var(--map-primary))]/20 text-[hsl(var(--map-primary))] rounded-full transition-colors"
                        title="Добавить в маршрут"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleStartRouteFrom(e, building.id)}
                        className="flex items-center justify-center w-8 h-8 bg-[hsl(var(--map-primary))]/10 hover:bg-[hsl(var(--map-primary))]/20 text-[hsl(var(--map-primary))] rounded-full transition-colors"
                        title="Начать маршрут с этого здания"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => handleRemoveFromRoute(e, building.id)}
                      className="flex items-center justify-center w-8 h-8 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full transition-colors"
                      title="Удалить из маршрута"
                    >
                      <span className="text-xs font-bold">×</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Индикатор в маршруте */}
              {isInRoute && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex items-center text-xs text-[hsl(var(--map-primary))] font-metrics">
                    <div className="w-2 h-2 bg-[hsl(var(--map-primary))] rounded-full mr-2"></div>
                    <span>В маршруте</span>
                  </div>
                </div>
              )}

              {/* Кнопка "Подробнее" */}
              {onBuildingDetails && (
                <div className="mt-2 pt-2 border-t border-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onBuildingDetails(building)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[hsl(var(--map-primary))] hover:bg-[hsl(var(--map-primary))]/5 rounded-[var(--radius)] transition-colors"
                  >
                    Подробнее
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
