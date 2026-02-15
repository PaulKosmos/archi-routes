'use client'

import { useState } from 'react'
import { 
  Route, 
  X, 
  MapPin, 
  Clock, 
  Ruler, 
  Save, 
  ChevronUp, 
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react'

interface Building {
  id: string
  name: string
  city: string
  architect?: string
  year_built?: number
  latitude: number
  longitude: number
  image_url?: string
}

interface RoutePanelProps {
  selectedBuildings: Building[]
  onRemoveBuilding: (buildingId: string) => void
  onClearRoute: () => void
  onSaveRoute: (routeData: any) => void
  onReorderBuildings?: (buildings: Building[]) => void
}

export default function RoutePanel({
  selectedBuildings,
  onRemoveBuilding,
  onClearRoute,
  onSaveRoute,
  onReorderBuildings
}: RoutePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [routeData, setRouteData] = useState({
    name: '',
    description: '',
    is_public: false
  })

  // Расчет примерного времени и расстояния
  const calculateRouteStats = () => {
    if (selectedBuildings.length === 0) return { time: 0, distance: 0 }
    
    // Примерные расчеты
    const avgTimePerBuilding = 25 // минут на здание
    const avgWalkingSpeed = 5 // км/ч
    const avgDistanceBetweenBuildings = 0.5 // км
    
    const totalTime = selectedBuildings.length * avgTimePerBuilding
    const totalDistance = Math.max(0, selectedBuildings.length - 1) * avgDistanceBetweenBuildings
    
    return { time: totalTime, distance: totalDistance }
  }

  const { time, distance } = calculateRouteStats()

  const handleSaveRoute = async () => {
    if (!routeData.name.trim()) {
      alert('Enter route name')
      return
    }

    try {
      await onSaveRoute({
        ...routeData,
        buildings: selectedBuildings,
        estimated_time_minutes: time,
        estimated_distance_km: distance
      })
      
      setShowSaveForm(false)
      setRouteData({ name: '', description: '', is_public: false })
      alert('Route saved!')
    } catch (error) {
      console.error('Error saving route:', error)
      alert('Error saving route')
    }
  }

  if (selectedBuildings.length === 0) {
    return null // Не показываем панель если нет выбранных зданий
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      
      {/* Заголовок панели маршрута */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Route className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ваш маршрут</h3>
              <p className="text-sm text-gray-600">
                {selectedBuildings.length} {selectedBuildings.length === 1 ? 'здание' : 'зданий'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            
            {/* Статистика маршрута */}
            <div className="text-right mr-3">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-3 h-3 mr-1" />
                <span>{Math.round(time / 60)}ч {time % 60}м</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Ruler className="w-3 h-3 mr-1" />
                <span>{distance.toFixed(1)} км</span>
              </div>
            </div>
            
            {/* Кнопка свернуть/развернуть */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded hover:bg-green-100 transition-colors"
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
      </div>

      {/* Контент панели маршрута */}
      <div className={`transition-all duration-300 ${
        isCollapsed ? 'h-0 overflow-hidden' : 'h-auto'
      }`}>
        
        {/* Список выбранных зданий */}
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {selectedBuildings.map((building, index) => (
            <div
              key={building.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Номер в маршруте */}
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {index + 1}
              </div>
              
              {/* Изображение здания */}
              {building.image_url ? (
                <img
                  src={building.image_url}
                  alt={building.name}
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  🏗️
                </div>
              )}
              
              {/* Информация о здании */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                  {building.name}
                </h4>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{building.city}</span>
                  </div>
                  {building.year_built && (
                    <div>📅 {building.year_built}</div>
                  )}
                </div>
              </div>
              
              {/* Кнопка удалить */}
              <button
                onClick={() => onRemoveBuilding(building.id)}
                className="p-1.5 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                title="Удалить из маршрута"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Форма сохранения маршрута */}
        {showSaveForm && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название маршрута *
                </label>
                <input
                  type="text"
                  value={routeData.name}
                  onChange={(e) => setRouteData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Архитектура центра Берлина"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={routeData.description}
                  onChange={(e) => setRouteData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание маршрута..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={routeData.is_public}
                  onChange={(e) => setRouteData(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">
                  Сделать маршрут публичным
                </label>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={handleSaveRoute}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Сохранить маршрут
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Действия с маршрутом */}
        {!showSaveForm && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            
            {/* Основные кнопки */}
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSaveForm(true)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить маршрут</span>
              </button>
              
              <button
                onClick={onClearRoute}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Очистить
              </button>
            </div>
            
            {/* Дополнительная информация */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>💡 Нажмите на здания в списке или на карте для добавления в маршрут</p>
              <p>🕒 Время рассчитано из расчета 25 мин на здание + перемещение</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
