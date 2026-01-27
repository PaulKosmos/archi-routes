'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Map, Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Динамический импорт MapLibre карты (миграция с Leaflet)
const MapLibreArticleMap = dynamic(() => import('./MapLibreArticleMap'), {
  ssr: false,
  loading: () => (
    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
      <div className="text-center text-gray-500">
        <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm">Loading map...</p>
      </div>
    </div>
  )
})

interface CollapsibleMapProps {
  buildings: any[]
  selectedBuildingId?: string
  selectedBuildings?: string[] // Массив выбранных зданий для маршрута
  onBuildingSelect?: (buildingId: string) => void
  onAddToRoute?: (building: any) => void
}

export default function CollapsibleMap({ 
  buildings, 
  selectedBuildingId, 
  selectedBuildings = [],
  onBuildingSelect,
  onAddToRoute 
}: CollapsibleMapProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const validBuildings = buildings.filter(b => 
    b.building && 
    b.building.latitude && 
    b.building.longitude
  )

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
    if (isFullscreen) {
      setIsFullscreen(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (isCollapsed) {
      setIsCollapsed(false)
    }
  }

  const handleAddToRoute = (building: any) => {
    if (onAddToRoute) {
      onAddToRoute(building)
    }
  }

  return (
    <>
      {/* Обычная карта в сайдбаре */}
      {!isFullscreen && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          
          {/* Заголовок с кнопками управления */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-2">
              <Map className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Карта зданий</h3>
              <span className="text-sm text-gray-500">({validBuildings.length})</span>
              {selectedBuildings.length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  {selectedBuildings.length} в маршруте
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              
              {/* Кнопка полного экрана */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                title="Полный экран"
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
              
              {/* Кнопка свернуть/развернуть */}
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                title={isCollapsed ? 'Развернуть' : 'Свернуть'}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Контент карты */}
          <div className={`transition-all duration-300 ${
            isCollapsed ? 'h-0 overflow-hidden' : 'h-auto'
          }`}>
            <div className="aspect-square p-4">
              <MapLibreArticleMap
                buildings={buildings}
                selectedBuildingId={selectedBuildingId}
                selectedBuildings={selectedBuildings}
                onBuildingSelect={onBuildingSelect}
                onAddToRoute={handleAddToRoute}
              />
            </div>
          </div>

          {/* Информация в свернутом состоянии */}
          {isCollapsed && (
            <div className="p-4 bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                {validBuildings.length} {validBuildings.length === 1 ? 'здание' : 'зданий'} на карте
                {selectedBuildings.length > 0 && (
                  <span className="block text-green-600 font-medium">
                    {selectedBuildings.length} в маршруте
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Полноэкранная карта */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white">
          
          {/* Заголовок полноэкранной карты */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Map className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Карта зданий статьи</h3>
              <span className="text-sm text-gray-500">({validBuildings.length} зданий)</span>
              {selectedBuildings.length > 0 && (
                <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  {selectedBuildings.length} в маршруте
                </span>
              )}
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="text-sm">Закрыть</span>
            </button>
          </div>

          {/* Полноэкранная карта */}
          <div className="pt-16 h-full">
            <MapLibreArticleMap
              buildings={buildings}
              selectedBuildingId={selectedBuildingId}
              selectedBuildings={selectedBuildings}
              onBuildingSelect={onBuildingSelect}
              onAddToRoute={handleAddToRoute}
            />
          </div>
        </div>
      )}
    </>
  )
}
