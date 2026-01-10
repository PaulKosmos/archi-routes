'use client'

import { useCallback } from 'react'
import { RouteIcon, X, Trash2, MapPin, Plus, Play } from 'lucide-react'
import type { Building } from '@/types/building'

interface CurrentRoutePanelProps {
  routeBuildings: string[]
  buildings: Building[]
  onRemove: (buildingId: string) => void
  onClear: () => void
  onCreateRoute: () => void
  title?: string
}

export default function CurrentRoutePanel({
  routeBuildings,
  buildings,
  onRemove,
  onClear,
  onCreateRoute,
  title = "🗺️ Current Route"
}: CurrentRoutePanelProps) {
  
  const handleRemove = useCallback((e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation()
    onRemove(buildingId)
  }, [onRemove])

  const handleClear = useCallback(() => {
    if (window.confirm('Clear entire route?')) {
      onClear()
    }
  }, [onClear])

  // Получаем полные данные о зданиях в маршруте
  const routeBuildingsData = buildings.filter(building => 
    routeBuildings.includes(building.id)
  )

  if (routeBuildings.length === 0) {
    return (
      <div className="p-4 bg-card border-2 border-border rounded-[var(--radius)]">
        <h3 className="font-medium font-display text-foreground mb-3">{title}</h3>
        <div className="text-center py-8 text-muted-foreground">
          <RouteIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>Route is empty</p>
          <p className="text-sm">Add buildings to create a route</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {routeBuildings.length} buildings
          </span>
          <button
            onClick={handleClear}
            className="flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Clear route"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </button>
        </div>
      </div>

      {/* Список зданий в маршруте */}
      <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
        {routeBuildingsData.map((building, index) => (
          <div 
            key={building.id}
            className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            {/* Порядковый номер */}
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center justify-center mr-3">
              {index + 1}
            </div>

            {/* Информация о здании */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {building.name}
              </h4>
              <div className="text-xs text-gray-600 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate">{building.city}</span>
              </div>
            </div>

            {/* Кнопка удаления */}
            <button
              onClick={(e) => handleRemove(e, building.id)}
              className="flex-shrink-0 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"
              title="Remove from route"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Действия с маршрутом */}
      <div className="space-y-2">
        <button
          onClick={onCreateRoute}
          className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
        >
          <RouteIcon className="w-4 h-4 mr-2" />
          Create Route
        </button>

        {/* Дополнительная информация */}
        <div className="text-xs text-gray-500 text-center">
          <p>Route will be created using real roads</p>
          <p>and optimal building visit order</p>
        </div>
      </div>

      {/* Статистика маршрута */}
      {routeBuildingsData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Cities:</span>
              <div className="font-medium text-gray-900">
                {[...new Set(routeBuildingsData.map(b => b.city))].length}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Styles:</span>
              <div className="font-medium text-gray-900">
                {[...new Set(routeBuildingsData.map(b => b.architectural_style).filter(Boolean))].length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
