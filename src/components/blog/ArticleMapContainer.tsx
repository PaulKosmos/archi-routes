'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Building2, Map, ChevronDown, ChevronUp } from 'lucide-react'
import MapErrorBoundary from './MapErrorBoundary'

// Динамически импортируем ArticleMap с fallback
const ArticleMap = dynamic(() => import('./ArticleMap'), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-gray-200 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Загрузка карты...</p>
      </div>
    </div>
  )
})

interface ArticleMapContainerProps {
  buildings: any[]
  content: any
  className?: string
}

export default function ArticleMapContainer({ 
  buildings, 
  content, 
  className = '' 
}: ArticleMapContainerProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [isMapVisible, setIsMapVisible] = useState(true)
  const [highlightedMentions, setHighlightedMentions] = useState<string[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Фильтруем здания с координатами
  const validBuildings = buildings.filter(b => 
    b.building && 
    b.building.latitude && 
    b.building.longitude
  )

  const handleBuildingSelect = (building: any) => {
    console.log('🏗️ Building selected:', building.name)
    setSelectedBuildingId(building.id)
    
    // Отправляем событие для уведомления других компонентов
    window.dispatchEvent(new CustomEvent('map-building-selected', {
      detail: { building, buildingId: building.id }
    }))
    
    // Прокручиваем к карте если нужно
    scrollToMapContainer()
  }

  const scrollToMapContainer = () => {
    setTimeout(() => {
      mapContainerRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      })
    }, 100)
  }

  const clearSelection = () => {
    setSelectedBuildingId(null)
    setHighlightedMentions([])
    
    // Отправляем событие об очистке выбора
    window.dispatchEvent(new CustomEvent('map-selection-cleared'))
  }

  const toggleMapVisibility = () => {
    setIsMapVisible(!isMapVisible)
  }

  // Слушаем события выбора зданий из текста
  useEffect(() => {
    const handleBuildingSelected = (event: CustomEvent) => {
      const { building, buildingId } = event.detail
      console.log('📝 Building selected from text:', building?.name)
      
      setSelectedBuildingId(buildingId)
      
      // Показываем карту, если она скрыта
      if (!isMapVisible) {
        setIsMapVisible(true)
      }
      
      // Прокручиваем к карте
      scrollToMapContainer()
    }

    const handleSelectionCleared = () => {
      setSelectedBuildingId(null)
      setHighlightedMentions([])
    }

    window.addEventListener('building-selected', handleBuildingSelected as EventListener)
    window.addEventListener('text-selection-cleared', handleSelectionCleared as EventListener)
    
    return () => {
      window.removeEventListener('building-selected', handleBuildingSelected as EventListener)
      window.removeEventListener('text-selection-cleared', handleSelectionCleared as EventListener)
    }
  }, [isMapVisible])

  // Если нет зданий с координатами, не показываем карту
  if (validBuildings.length === 0) {
    return null
  }

  return (
    <div ref={mapContainerRef} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
      {/* Заголовок с управлением */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Интерактивная карта статьи</h3>
              <p className="text-sm text-gray-600">
                {validBuildings.length} {validBuildings.length === 1 ? 'здание' : validBuildings.length < 5 ? 'здания' : 'зданий'} • 
                Кликните на здание в тексте или на карте для синхронизации
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedBuildingId && (
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Сбросить выбор
              </button>
            )}
            
            <button
              onClick={toggleMapVisibility}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={isMapVisible ? "Скрыть карту" : "Показать карту"}
            >
              {isMapVisible ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Информация о выбранном здании */}
        {selectedBuildingId && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
            {(() => {
              const building = validBuildings.find(b => b.building.id === selectedBuildingId)?.building
              if (!building) return null

              return (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {validBuildings.findIndex(b => b.building.id === selectedBuildingId) + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{building.name}</h4>
                    <div className="text-sm text-gray-600 flex items-center space-x-3">
                      <span>{building.city}</span>
                      {building.year_built && (
                        <>
                          <span>•</span>
                          <span>{building.year_built}</span>
                        </>
                      )}
                      {building.architectural_style && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600">{building.architectural_style}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Карта с защитой от ошибок */}
      {isMapVisible && (
        <MapErrorBoundary>
          <ArticleMap
            buildings={validBuildings}
            onBuildingSelect={handleBuildingSelect}
            selectedBuildingId={selectedBuildingId}
          />
        </MapErrorBoundary>
      )}

      {/* Инструкции для пользователя */}
      {!selectedBuildingId && isMapVisible && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Building2 className="w-4 h-4" />
            <span>
              💡 <strong>Совет:</strong> Кликните на любое упоминание здания в тексте статьи, чтобы увидеть его на карте
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
