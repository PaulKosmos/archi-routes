'use client'

import { useMemo, useCallback } from 'react'
import { Building2, Star, Eye, MapPin, Plus, Play, X } from 'lucide-react'
import VirtualizedList, { useItemHeight, useOverscanCount } from './VirtualizedList'
import type { Building } from '@/types/building'

interface VirtualizedBuildingListProps {
  buildings: Building[]
  selectedBuilding: Building | null
  currentRouteBuildings: string[]
  onBuildingSelect: (building: Building) => void
  onAddToRoute: (buildingId: string) => void
  onStartRouteFrom: (buildingId: string) => void
  onRemoveFromRoute: (buildingId: string) => void
  title?: string
  maxHeight?: number
}

export default function VirtualizedBuildingList({
  buildings,
  selectedBuilding,
  currentRouteBuildings,
  onBuildingSelect,
  onAddToRoute,
  onStartRouteFrom,
  onRemoveFromRoute,
  title = "🏛️ Buildings",
  maxHeight = 400
}: VirtualizedBuildingListProps) {

  const itemHeight = useItemHeight(buildings, 120)
  const overscanCount = useOverscanCount(buildings)

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

  const renderItem = useCallback(({ index, style, item: building }: {
    index: number;
    style: React.CSSProperties;
    item: Building
  }) => {
    const isSelected = selectedBuilding?.id === building.id
    const isInRoute = currentRouteBuildings.includes(building.id)

    return (
      <div style={style} className="px-4 py-1">
        <div
          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
            } ${isInRoute ? 'ring-2 ring-green-200' : ''}`}
          onClick={() => onBuildingSelect(building)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                {building.name}
              </h4>

              <div className="text-xs text-gray-600 mb-2 space-y-1">
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
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {Number(building.rating) > 0 && (
                  <div className="flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                    <span>{Number(building.rating).toFixed(1)}</span>
                    {(building.review_count ?? 0) > 0 && (
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
                    className="flex items-center justify-center w-8 h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                    title="Add to route"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleStartRouteFrom(e, building.id)}
                    className="flex items-center justify-center w-8 h-8 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
                    title="Start route from this building"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => handleRemoveFromRoute(e, building.id)}
                  className="flex items-center justify-center w-8 h-8 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors"
                  title="Remove from route"
                >
                  <span className="text-xs font-bold">×</span>
                </button>
              )}
            </div>
          </div>

          {/* Индикатор в маршруте */}
          {isInRoute && (
            <div className="mt-2 pt-2 border-t border-green-200">
              <div className="flex items-center text-xs text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>В маршруте</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }, [selectedBuilding, currentRouteBuildings, onBuildingSelect, handleAddToRoute, handleStartRouteFrom, handleRemoveFromRoute])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">
          {buildings.length} зданий
        </div>
      </div>

      <VirtualizedList
        items={buildings}
        height={maxHeight}
        itemHeight={itemHeight}
        renderItem={renderItem}
        overscanCount={overscanCount}
        className="border border-gray-200 rounded-lg"
      />
    </div>
  )
}
