'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Building2, MapPin, Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'

interface Building {
  id: string
  name: string
  city: string
  country: string
  architect?: string
  year_built?: number
  architectural_style?: string
  image_url?: string
}

interface BuildingSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (building: Building) => void
  onCreateNew: () => void
}

export default function BuildingSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  onCreateNew 
}: BuildingSelectorProps) {
  const supabase = useMemo(() => createClient(), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  useEffect(() => {
    if (isOpen) {
      searchBuildings('')
    }
  }, [isOpen])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2 || searchQuery.length === 0) {
        searchBuildings(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const searchBuildings = async (query: string) => {
    setLoading(true)
    try {
      let supabaseQuery = supabase
        .from('buildings')
        .select('id, name, city, country, architect, year_built, architectural_style, image_url')
        .order('name')
        .limit(20)

      if (query) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%, city.ilike.%${query}%, architect.ilike.%${query}%`)
      }

      const { data, error } = await supabaseQuery

      if (error) throw error
      setBuildings(data || [])
    } catch (error) {
      console.error('Error searching buildings:', error)
      setBuildings([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (building: Building) => {
    setSelectedBuilding(building)
  }

  const confirmSelection = () => {
    if (selectedBuilding) {
      onSelect(selectedBuilding)
      onClose()
      setSelectedBuilding(null)
      setSearchQuery('')
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedBuilding(null)
    setSearchQuery('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Выберите здание
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Create */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск зданий по названию, городу или архитектору..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Создать здание
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-96 overflow-y-auto">
              {buildings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Building2 className="w-12 h-12 mb-4" />
                  <p className="text-lg mb-2">
                    {searchQuery ? 'Здания не найдены' : 'Начните поиск или создайте новое здание'}
                  </p>
                  <p className="text-sm">
                    {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Введите название или город для поиска'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      onClick={() => handleSelect(building)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedBuilding?.id === building.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {building.image_url ? (
                            <img
                              src={getStorageUrl(building.image_url, 'photos')}
                              alt={building.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {building.name}
                          </h3>
                          
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {building.city}, {building.country}
                            </span>
                          </div>
                          
                          {building.architect && (
                            <div className="text-sm text-gray-600 mt-1 truncate">
                              <strong>Архитектор:</strong> {building.architect}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            {building.year_built && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="w-3 h-3 mr-1" />
                                {building.year_built}
                              </div>
                            )}
                            
                            {building.architectural_style && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded truncate max-w-32">
                                {building.architectural_style}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {selectedBuilding?.id === building.id && (
                          <div className="flex-shrink-0 text-blue-600">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedBuilding && (
              <span>Выбрано: <strong>{selectedBuilding.name}</strong></span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={confirmSelection}
              disabled={!selectedBuilding}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вставить здание
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}