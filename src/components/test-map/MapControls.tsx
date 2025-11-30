'use client'

import { useCallback } from 'react'
import { Building2, RouteIcon, Eye, Building2Icon, List } from 'lucide-react'

interface MapControlsProps {
  mapView: 'buildings' | 'routes' | 'all'
  showBuildings: boolean
  showRoutes: boolean
  onViewChange: (view: 'buildings' | 'routes' | 'all') => void
  currentRouteBuildings: string[]
  onCreateRoute: () => void
}

export default function MapControls({
  mapView,
  showBuildings,
  showRoutes,
  onViewChange,
  currentRouteBuildings,
  onCreateRoute
}: MapControlsProps) {
  
  const handleViewChange = useCallback((view: 'buildings' | 'routes' | 'all') => {
    onViewChange(view)
  }, [onViewChange])

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      {/* Переключатели вида карты */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleViewChange('buildings')}
          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
            mapView === 'buildings' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Показать только здания"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Здания
        </button>

        <button
          onClick={() => handleViewChange('routes')}
          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
            mapView === 'routes' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Показать только маршруты"
        >
          <RouteIcon className="w-4 h-4 mr-2" />
          Маршруты
        </button>

        <button
          onClick={() => handleViewChange('all')}
          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
            mapView === 'all' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Показать все объекты"
        >
          <Eye className="w-4 h-4 mr-2" />
          Все
        </button>
      </div>

      {/* Дополнительные действия */}
      <div className="flex items-center space-x-2">
        {/* Кнопка создания маршрута */}
        <button
          onClick={onCreateRoute}
          disabled={currentRouteBuildings.length === 0}
          className={`flex items-center px-4 py-2 rounded-lg border font-medium transition-colors ${
            currentRouteBuildings.length > 0
              ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
              : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          title={currentRouteBuildings.length > 0 ? `Создать маршрут из ${currentRouteBuildings.length} зданий` : "Добавьте здания в маршрут"}
        >
          <RouteIcon className="w-4 h-4 mr-2" />
          Создать маршрут
          {currentRouteBuildings.length > 0 && (
            <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-1">
              {currentRouteBuildings.length}
            </span>
          )}
        </button>

        {/* Кнопка показать/скрыть панель зданий */}
        <button
          onClick={() => onViewChange('buildings')}
          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
            showBuildings 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Показать/скрыть панель зданий"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Здания
        </button>

        {/* Кнопка показать/скрыть панель маршрутов */}
        <button
          onClick={() => onViewChange('routes')}
          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
            showRoutes 
              ? 'bg-purple-50 border-purple-200 text-purple-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
          title="Показать/скрыть панель маршрутов"
        >
          <RouteIcon className="w-4 h-4 mr-2" />
          Маршруты
        </button>
      </div>
    </div>
  )
}
