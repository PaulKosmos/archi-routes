'use client'

import { useState } from 'react'
import { 
  Route, 
  Building2, 
  Save, 
  Share2, 
  Trash2, 
  MapPin,
  Clock,
  Eye,
  EyeOff,
  X
} from 'lucide-react'

interface RouteBuilderProps {
  selectedBuildings: any[]
  onRemoveBuilding: (buildingId: string) => void
  onClearRoute: () => void
  onSaveRoute: (routeData: any) => void
}

export default function RouteBuilder({ 
  selectedBuildings, 
  onRemoveBuilding, 
  onClearRoute,
  onSaveRoute 
}: RouteBuilderProps) {
  const [routeName, setRouteName] = useState('')
  const [routeDescription, setRouteDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  if (selectedBuildings.length === 0) {
    return null
  }

  const estimatedTime = Math.max(selectedBuildings.length * 30, 60) // минимум час
  const estimatedDistance = selectedBuildings.length * 0.5 // примерно 500м между зданиями

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      alert('Введите название маршрута')
      return
    }

    setIsSaving(true)
    
    try {
      const routeData = {
        name: routeName,
        description: routeDescription,
        buildings: selectedBuildings,
        estimated_time_minutes: estimatedTime,
        estimated_distance_km: estimatedDistance,
        is_public: isPublic,
        created_from_blog: true
      }

      await onSaveRoute(routeData)
      
      // Сброс формы
      setRouteName('')
      setRouteDescription('')
      setIsPublic(false)
      setIsExpanded(false)
      
      alert('Маршрут успешно сохранен!')
    } catch (error) {
      console.error('Error saving route:', error)
      alert('Ошибка при сохранении маршрута')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Route className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ваш маршрут</h3>
              <p className="text-sm text-gray-600">
                {selectedBuildings.length} {selectedBuildings.length === 1 ? 'здание' : selectedBuildings.length < 5 ? 'здания' : 'зданий'} • 
                ~{estimatedTime} мин • ~{estimatedDistance.toFixed(1)} км
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? 'Свернуть' : 'Настроить'}
            </button>
            
            <button
              onClick={onClearRoute}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Очистить маршрут"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Список зданий */}
      <div className="p-4">
        <div className="space-y-2">
          {selectedBuildings.map((building, index) => (
            <div
              key={building.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{building.name}</h4>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{building.city}</span>
                    {building.year_built && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{building.year_built}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemoveBuilding(building.id)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Удалить из маршрута"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Быстрые действия */}
        {!isExpanded && (
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Сохранить маршрут
            </button>
            
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Архитектурный маршрут',
                    text: `Маршрут из ${selectedBuildings.length} зданий`,
                    url: window.location.href
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Ссылка скопирована!')
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Расширенная форма сохранения */}
        {isExpanded && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название маршрута *
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Например: Архитектурные жемчужины Берлина"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (необязательно)
              </label>
              <textarea
                value={routeDescription}
                onChange={(e) => setRouteDescription(e.target.value)}
                placeholder="Краткое описание маршрута..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none"
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`p-2 rounded-lg transition-colors ${
                    isPublic 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {isPublic ? 'Публичный маршрут' : 'Приватный маршрут'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isPublic 
                      ? 'Другие пользователи смогут найти и использовать ваш маршрут' 
                      : 'Маршрут будет доступен только вам'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveRoute}
                disabled={isSaving || !routeName.trim()}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Сохранить маршрут</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Информационная панель */}
      <div className="bg-green-50 border-t border-green-200 px-4 py-3">
        <div className="flex items-center space-x-4 text-sm text-green-700">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>~{estimatedTime} минут</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>~{estimatedDistance.toFixed(1)} км пешком</span>
          </div>
          <div className="flex items-center space-x-1">
            <Building2 className="w-4 h-4" />
            <span>{selectedBuildings.length} {selectedBuildings.length === 1 ? 'здание' : 'зданий'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
