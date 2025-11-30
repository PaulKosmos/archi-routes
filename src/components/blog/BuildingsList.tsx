'use client'

import { Building2, MapPin, Calendar, Star, Plus } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'

interface BuildingsListProps {
  buildings: any[]
  postTitle: string
  selectedBuildings?: string[]
  onAddToRoute?: (building: any) => void
  onBuildingSelect?: (buildingId: string) => void
}

export default function BuildingsList({ 
  buildings, 
  postTitle, 
  selectedBuildings = [],
  onAddToRoute,
  onBuildingSelect
}: BuildingsListProps) {
  if (!buildings || buildings.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      
      {/* Заголовок */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Здания из статьи</h3>
          <p className="text-sm text-gray-600">
            {buildings.length} {buildings.length === 1 ? 'здание' : buildings.length < 5 ? 'здания' : 'зданий'} 
            упомянуто в статье "{postTitle}"
          </p>
        </div>
      </div>
      
      {/* Список зданий */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map((buildingData, index) => {
          const building = buildingData.building
          
          if (!building) return null
          
          return (
            <div
              key={building.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer group ${
                selectedBuildings.includes(building.id)
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => onBuildingSelect && onBuildingSelect(building.id)}
            >
              
              {/* Номер и изображение */}
              <div className="flex items-start space-x-3 mb-3">
                <div className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                  selectedBuildings.includes(building.id) ? 'bg-green-600' : 'bg-blue-600'
                }`}>
                  {selectedBuildings.includes(building.id) ? '✓' : index + 1}
                </div>
                
                {building.image_url && (
                  <div className="flex-1 aspect-video rounded-lg overflow-hidden">
                    <img
                      src={getStorageUrl(building.image_url, 'photos')}
                      alt={building.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
              </div>

              {/* Информация о здании */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {building.name}
                </h4>

                <div className="space-y-1 text-xs text-gray-600">
                  
                  {/* Местоположение */}
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{building.city}{building.country && `, ${building.country}`}</span>
                  </div>
                  
                  {/* Архитектор и год */}
                  {(building.architect || building.year_built) && (
                    <div className="flex items-center justify-between">
                      {building.architect && (
                        <span className="truncate mr-2">{building.architect}</span>
                      )}
                      {building.year_built && (
                        <div className="flex items-center flex-shrink-0">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{building.year_built}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Архитектурный стиль */}
                  {building.architectural_style && (
                    <div className="text-blue-600 font-medium">
                      {building.architectural_style}
                    </div>
                  )}
                  
                  {/* Рейтинг */}
                  {building.rating && building.rating > 0 && (
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                      <span className="font-medium">{building.rating.toFixed(1)}</span>
                      <span className="text-gray-400 ml-1">из 5</span>
                    </div>
                  )}
                </div>

                {/* Краткое описание */}
                {building.description && (
                  <p className="text-xs text-gray-700 line-clamp-2 mt-2">
                    {building.description}
                  </p>
                )}
              </div>

              {/* Действия */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                {selectedBuildings.includes(building.id) ? (
                  <div className="flex items-center space-x-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded">
                    <span>✓</span>
                    <span>В маршруте</span>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToRoute && onAddToRoute(building)
                    }}
                    className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>В маршрут</span>
                  </button>
                )}
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(`/buildings/${building.id}`, '_blank')
                  }}
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Подробнее →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Действия с группой зданий */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            💡 Добавляйте здания в маршрут для планирования прогулки
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                buildings.forEach(buildingData => {
                  const building = buildingData.building
                  if (building && !selectedBuildings.includes(building.id) && onAddToRoute) {
                    onAddToRoute(building)
                  }
                })
              }}
              className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
            >
              Добавить все в маршрут
            </button>
            <button 
              onClick={() => {
                // Прокручиваем к карте
                const mapElement = document.querySelector('.leaflet-container')
                if (mapElement) {
                  mapElement.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Показать на карте
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
