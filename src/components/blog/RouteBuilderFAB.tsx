'use client'

import { useState, useEffect } from 'react'
import { Route, MapPin, Clock, ArrowRight, X, Check } from 'lucide-react'

interface RouteBuilderFABProps {
  buildings: any[]
  onRouteCreate?: (buildings: any[]) => void
  position?: 'fixed' | 'article'
}

export default function RouteBuilderFAB({ buildings, onRouteCreate, position = 'fixed' }: RouteBuilderFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([])

  if (buildings.length < 2) return null

  // Добавляем визуальные индикаторы для выбранных зданий
  useEffect(() => {
    // Убираем предыдущие индикаторы
    document.querySelectorAll('.building-selection-indicator').forEach(el => el.remove())
    
    // Добавляем новые индикаторы для выбранных зданий
    selectedBuildings.forEach(buildingId => {
      const mentions = document.querySelectorAll(`[data-building-id="${buildingId}"]`)
      mentions.forEach(mention => {
        if (!mention.querySelector('.building-selection-indicator')) {
          const indicator = document.createElement('span')
          indicator.className = 'building-selection-indicator ml-1 text-green-600'
          indicator.innerHTML = '✓'
          indicator.title = 'Выбрано для маршрута'
          mention.appendChild(indicator)
        }
      })
    })

    // Cleanup function
    return () => {
      document.querySelectorAll('.building-selection-indicator').forEach(el => el.remove())
    }
  }, [selectedBuildings])

  const handleBuildingToggle = (buildingId: string) => {
    setSelectedBuildings(prev => 
      prev.includes(buildingId) 
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    )
  }

  const handleSelectAll = () => {
    const allIds = buildings.map(b => b.building?.id).filter(Boolean)
    setSelectedBuildings(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedBuildings([])
  }

  const handleCreateRoute = () => {
    const selectedBuildingObjects = buildings.filter(b => 
      selectedBuildings.includes(b.building?.id)
    )
    
    if (selectedBuildingObjects.length >= 2) {
      onRouteCreate?.(selectedBuildingObjects)
      alert(`Создаем маршрут из ${selectedBuildingObjects.length} зданий!`)
      setIsExpanded(false)
    }
  }

  const totalSelected = selectedBuildings.length
  const estimatedTime = Math.max(2, totalSelected * 1.5)

  // Позиционирование FAB
  const positionClasses = position === 'article' 
    ? 'absolute bottom-4 right-4' 
    : 'fixed bottom-6 right-6'

  return (
    <>
      {/* Основная кнопка */}
      <div className={`${positionClasses} z-40`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 flex items-center space-x-2 group route-fab"
          title="Создать маршрут из зданий статьи"
        >
          <Route className="w-6 h-6" />
          <span className="hidden group-hover:inline-block whitespace-nowrap transition-all duration-300 bg-blue-600 px-2 py-1 rounded">
            Создать маршрут
          </span>
          <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            {buildings.length}
          </span>
          {totalSelected > 0 && (
            <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold animate-pulse">
              {totalSelected}
            </span>
          )}
        </button>
      </div>

      {/* Расширенная панель */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-t-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Создать маршрут</h3>
                <p className="text-sm text-gray-600">
                  Выберите здания из статьи
                </p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Кнопки выбора всех/отмены */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="flex-1 py-2 px-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Выбрать все
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="flex-1 py-2 px-3 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отменить все
                </button>
              </div>
              
              {totalSelected > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-sm text-blue-600 font-medium">
                    Выбрано: {totalSelected} из {buildings.length}
                  </span>
                </div>
              )}
            </div>

            {/* Список зданий */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {buildings.map((buildingData, index) => {
                  const building = buildingData.building
                  if (!building) return null

                  const isSelected = selectedBuildings.includes(building.id)

                  return (
                    <div
                      key={building.id}
                      className={`building-selection-item p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-sm selected' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleBuildingToggle(building.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {isSelected ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {building.name}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{building.city}</span>
                            {building.year_built && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{building.year_built}</span>
                              </>
                            )}
                          </div>
                          {building.architectural_style && (
                            <div className="text-xs text-blue-600 mt-1">
                              {building.architectural_style}
                            </div>
                          )}
                        </div>

                        {/* Визуальный индикатор выбора */}
                        <div className="flex-shrink-0">
                          <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-600' 
                              : 'border-gray-300'
                          } flex items-center justify-center`}>
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Информация о маршруте */}
            {totalSelected >= 2 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{totalSelected} зданий</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>~{estimatedTime.toFixed(1)} часов</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  📍 Маршрут будет оптимизирован по расстоянию
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateRoute}
                  disabled={totalSelected < 2}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Создать маршрут</span>
                  {totalSelected >= 2 && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
              
              {totalSelected < 2 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Выберите минимум 2 здания для создания маршрута
                </p>
              )}
              
              {totalSelected >= 2 && (
                <p className="text-xs text-green-600 text-center mt-2 font-medium">
                  ✓ Готово к созданию маршрута
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}