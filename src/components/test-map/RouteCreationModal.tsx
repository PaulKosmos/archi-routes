'use client'

import { useState } from 'react'
import { X, MapPin, Route, Zap, Wrench, Plus, Trash2 } from 'lucide-react'
import type { Building } from '@/types/building'

interface RouteCreationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBuildings: Building[]
  onRemoveBuilding: (buildingId: string) => void
  onClearRoute: () => void
  onCreateManualRoute: () => void
  onCreateAutoRoute: () => void
}

export default function RouteCreationModal({
  isOpen,
  onClose,
  selectedBuildings,
  onRemoveBuilding,
  onClearRoute,
  onCreateManualRoute,
  onCreateAutoRoute
}: RouteCreationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Прозрачный фон */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Модальное окно */}
      <div className="relative w-11/12 max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Route className="w-6 h-6 mr-2 text-blue-600" />
            Создание маршрута
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Список выбранных зданий */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-green-600" />
              Выбранные объекты ({selectedBuildings.length})
            </h3>
            
            {selectedBuildings.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedBuildings.map((building, index) => (
                  <div 
                    key={building.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{building.name}</h4>
                        <p className="text-sm text-gray-600">{building.city}, {building.country}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveBuilding(building.id)}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      title="Удалить из маршрута"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Нет выбранных объектов</p>
                <p className="text-sm">Выберите объекты на карте для создания маршрута</p>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={onClearRoute}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить все
            </button>

            <div className="flex items-center space-x-4">
              {selectedBuildings.length > 0 && (
                <>
                  <button
                    onClick={onCreateManualRoute}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Wrench className="w-5 h-5 mr-2" />
                    Создать собственный маршрут
                  </button>
                  
                  <button
                    onClick={onCreateAutoRoute}
                    className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Автогенерация с ИИ
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Информация о маршруте */}
          {selectedBuildings.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Информация о маршруте</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <strong>Количество объектов:</strong> {selectedBuildings.length}
                </div>
                <div>
                  <strong>Примерное время:</strong> {Math.max(selectedBuildings.length * 30, 60)} мин
                </div>
                <div>
                  <strong>Примерное расстояние:</strong> {(selectedBuildings.length * 0.5).toFixed(1)} км
                </div>
                <div>
                  <strong>Города:</strong> {[...new Set(selectedBuildings.map(b => b.city))].join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

