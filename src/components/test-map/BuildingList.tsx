'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { Building2, Eye, X } from 'lucide-react'
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

function GradientStar({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="star-grad-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="url(#star-grad-b)"
        stroke="#f59e0b"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  title = "Objects",
}: BuildingListProps) {

  const handleRemoveFromRoute = useCallback((e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation()
    onRemoveFromRoute(buildingId)
  }, [onRemoveFromRoute])

  if (buildings.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm">No objects found</p>
          <p className="text-xs mt-0.5">Try changing filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2">
      <h3 className="font-medium font-display text-foreground mb-2 px-1">{title}</h3>
      <div className="space-y-2">
        {buildings.map(building => {
          const isSelected = selectedBuilding?.id === building.id
          const isInRoute = currentRouteBuildings.includes(building.id)
          const rating = Number(building.rating ?? 0)

          return (
            <div
              key={building.id}
              onClick={() => onBuildingSelect(building)}
              className={`relative flex gap-3 p-2.5 rounded-[var(--radius)] border cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'border-[hsl(var(--map-primary))] bg-[hsl(var(--map-primary))]/5 shadow-sm'
                  : 'border-border bg-card hover:bg-muted hover:shadow-sm'
              } ${isInRoute ? 'ring-1 ring-[hsl(var(--map-primary))]/40' : ''}`}
            >
              {/* Фото — от края до края по высоте */}
              <div className="relative w-24 self-stretch flex-shrink-0 overflow-hidden rounded-l-[var(--radius)] bg-muted -my-2.5 -ml-2.5">
                {building.image_url ? (
                  <Image
                    src={getStorageUrl(building.image_url, 'photos')}
                    alt={building.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                )}
                {isInRoute && (
                  <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-[hsl(var(--map-primary))] rounded-full ring-1 ring-white" />
                )}
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {/* Название */}
                <h4 className="font-medium text-foreground text-sm leading-tight truncate pr-7">
                  {building.name}
                </h4>

                {/* Тип + стиль + год — одна строка, год по левому краю */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {building.building_type && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--map-primary))]/10 text-[hsl(var(--map-primary))]">
                      {building.building_type}
                    </span>
                  )}
                  {building.architectural_style && (
                    <span className="text-[10px] text-muted-foreground/70 truncate">
                      {building.architectural_style}
                    </span>
                  )}
                  {building.year_built && (
                    <span className="text-[10px] text-muted-foreground/50 font-metrics tabular-nums">
                      {building.year_built}
                    </span>
                  )}
                </div>

                {/* Архитектор */}
                {building.architect && (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    <span className="opacity-50">by</span>{' '}
                    <span className="italic">{building.architect}</span>
                  </p>
                )}

                {/* Статистика + кнопка More details — одна строка внизу */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-metrics min-w-0">
                    {rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <GradientStar size={10} />
                        <span className="font-medium text-foreground/80">{rating.toFixed(1)}</span>
                        {(building.review_count ?? 0) > 0 && (
                          <span className="opacity-50">({building.review_count})</span>
                        )}
                      </div>
                    )}
                    {(building.view_count ?? 0) > 0 && (
                      <div className="flex items-center gap-1 opacity-50 shrink-0">
                        <Eye className="w-3 h-3" />
                        <span>{building.view_count}</span>
                      </div>
                    )}
                    {building.city && (
                      <span className="truncate opacity-40">{building.city}</span>
                    )}
                  </div>
                  {onBuildingDetails && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onBuildingDetails(building)
                      }}
                      className="shrink-0 px-2.5 py-0.5 text-xs font-medium bg-[hsl(var(--map-primary))] text-white rounded hover:opacity-90 transition-opacity"
                    >
                      More details
                    </button>
                  )}
                </div>
              </div>

              {/* Кнопка удаления из маршрута */}
              {isInRoute && (
                <button
                  onClick={(e) => handleRemoveFromRoute(e, building.id)}
                  className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full transition-colors"
                  title="Remove from Route"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
