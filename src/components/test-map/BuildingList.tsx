'use client'

import { useCallback } from 'react'
import { Building2, Star, Eye, MapPin, Plus, Play } from 'lucide-react'
import type { Building } from '@/types/building'

interface BuildingListProps {
  buildings: Building[]
  selectedBuilding: Building | null
  currentRouteBuildings: string[]
  onBuildingSelect: (building: Building) => void
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
        <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Здания не найдены</p>
          <p className="text-sm">Попробуйте изменить фильтры</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
      <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
        {buildings.map(building => {
          const isSelected = selectedBuilding?.id === building.id
          const isInRoute = currentRouteBuildings.includes(building.id)
          
          return (
            <div 
              key={building.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                isSelected 
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
                    {building.rating && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
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
                        className="flex items-center justify-center w-8 h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                        title="Добавить в маршрут"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={(e) => handleStartRouteFrom(e, building.id)}
                        className="flex items-center justify-center w-8 h-8 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
                        title="Начать маршрут с этого здания"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => handleRemoveFromRoute(e, building.id)}
                      className="flex items-center justify-center w-8 h-8 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors"
                      title="Удалить из маршрута"
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
          )
        })}
      </div>
    </div>
  )
}
