'use client'

import { useState, useEffect } from 'react'
import { X, GripVertical, Trash2 } from 'lucide-react'
import { Building } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'

interface PersonalRouteCreationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBuildings: Building[]
  onRemoveBuilding: (buildingId: string) => void
  onReorderBuildings: (buildingIds: string[]) => void
  onSave: (routeName: string) => Promise<void>
}

export default function PersonalRouteCreationModal({
  isOpen,
  onClose,
  selectedBuildings,
  onRemoveBuilding,
  onReorderBuildings,
  onSave
}: PersonalRouteCreationModalProps) {
  const [routeName, setRouteName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [localBuildings, setLocalBuildings] = useState<Building[]>(selectedBuildings)

  // Синхронизируем локальное состояние с входящими зданиями
  useEffect(() => {
    setLocalBuildings(selectedBuildings)
  }, [selectedBuildings])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!routeName.trim()) {
      alert('Пожалуйста, введите название маршрута')
      return
    }

    if (localBuildings.length < 2) {
      alert('Добавьте минимум 2 здания для создания маршрута')
      return
    }

    setIsSaving(true)
    try {
      // Сохраняем текущий порядок перед сохранением
      onReorderBuildings(localBuildings.map(b => b.id))
      await onSave(routeName)
      setRouteName('')
      onClose()
    } catch (error) {
      console.error('Error saving route:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    const newBuildings = [...localBuildings]
    const draggedBuilding = newBuildings[draggedIndex]
    newBuildings.splice(draggedIndex, 1)
    newBuildings.splice(index, 0, draggedBuilding)

    setLocalBuildings(newBuildings)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }
  
  const handleRemove = (buildingId: string) => {
    setLocalBuildings(prev => prev.filter(b => b.id !== buildingId))
    onRemoveBuilding(buildingId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center space-x-2">
            <span>📍</span>
            <span>Создание личного маршрута</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Список выбранных зданий */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Выбрано зданий: {localBuildings.length}
              </h3>
              {localBuildings.length > 1 && (
                <p className="text-xs text-gray-500">
                  💡 Перетащите для изменения порядка
                </p>
              )}
            </div>

            <div className="space-y-2">
              {localBuildings.map((building, index) => (
                <div
                  key={building.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-all cursor-move ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  {/* Grip icon */}
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />

                  {/* Number */}
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Image */}
                  {building.image_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={getStorageUrl(building.image_url, 'photos')}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{building.name}</h4>
                    <p className="text-xs text-gray-500 truncate">
                      {building.city}, {building.country}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleRemove(building.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Удалить из маршрута"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Форма */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название маршрута <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Например: Моя прогулка по Берлину"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 flex items-center">
                <span className="mr-2">ℹ️</span>
                <span>Это личный маршрут, только для вас. Вы сможете отредактировать его позже.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Отменить
          </button>
          <button
            onClick={handleSave}
            disabled={!routeName.trim() || localBuildings.length < 2 || isSaving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Создание...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Создать</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


