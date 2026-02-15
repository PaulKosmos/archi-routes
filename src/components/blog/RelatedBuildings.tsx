'use client'

import { useState } from 'react'
import { Building2, MapPin, Calendar, Star, ExternalLink, Route } from 'lucide-react'
import Link from 'next/link'

interface RelatedBuildingsProps {
  buildings: any[]
}

export default function RelatedBuildings({ buildings }: RelatedBuildingsProps) {
  const [showAll, setShowAll] = useState(false)

  const displayedBuildings = showAll ? buildings : buildings.slice(0, 3)

  const formatDate = (year?: number) => {
    return year ? year.toString() : 'Неизвестно'
  }

  if (buildings.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Здания в статье
        </h3>
        <span className="text-sm text-gray-500">
          {buildings.length} {buildings.length === 1 ? 'здание' : buildings.length < 5 ? 'здания' : 'зданий'}
        </span>
      </div>

      <div className="space-y-4">
        {displayedBuildings.map((buildingData, index) => {
          const building = buildingData.building
          if (!building) return null

          return (
            <div key={building.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start space-x-3">
                {/* Номер и изображение */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mb-2">
                    {index + 1}
                  </div>
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                    {building.image_url ? (
                      <img
                        src={building.image_url}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Информация о здании */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                    {building.name}
                  </h4>

                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{building.city}</span>
                    </div>

                    {building.architect && (
                      <div className="flex items-center">
                        <span className="font-medium mr-1">Архитектор:</span>
                        <span className="truncate">{building.architect}</span>
                      </div>
                    )}

                    {building.year_built && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span>{formatDate(building.year_built)}</span>
                      </div>
                    )}

                    {building.architectural_style && (
                      <div className="text-blue-600 font-medium">
                        {building.architectural_style}
                      </div>
                    )}

                    {Number(building.rating) > 0 && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                        <span>{Number(building.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Контекст упоминания */}
                  {buildingData.context && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
                      "{buildingData.context.length > 100 
                        ? buildingData.context.substring(0, 100) + '...' 
                        : buildingData.context}"
                    </div>
                  )}

                  {/* Ссылка на здание */}
                  <Link
                    href={`/buildings/${building.id}`}
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Подробнее
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Кнопка "Показать все" */}
      {buildings.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {showAll ? 'Скрыть' : `Показать все ${buildings.length} зданий`}
        </button>
      )}

      {/* Кнопка создания маршрута */}
      {buildings.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              // TODO: Реализовать создание маршрута из зданий статьи
              alert('Route creation feature coming soon!')
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Route className="w-4 h-4" />
            <span>Создать маршрут из зданий</span>
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Посетите все здания из статьи по оптимальному маршруту
          </p>
        </div>
      )}
    </div>
  )
}
