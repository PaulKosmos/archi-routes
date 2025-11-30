'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { BookmarkPlus, BookmarkCheck, Plus, Check, Search } from 'lucide-react'

interface Collection {
  id: string
  name: string
  description?: string
  is_public: boolean
  building_count?: number
}

interface AddToCollectionButtonProps {
  buildingId: string
  buildingName?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'button' | 'icon'
  onSuccess?: () => void
}

export default function AddToCollectionButton({
  buildingId,
  buildingName,
  size = 'md',
  variant = 'button',
  onSuccess
}: AddToCollectionButtonProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [buildingCollections, setBuildingCollections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка коллекций пользователя
  const fetchUserCollections = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Загружаем коллекции пользователя
      const { data: userCollections, error: collectionsError } = await supabase
        .rpc('get_user_collections', { p_user_id: user.id })

      if (collectionsError) throw collectionsError

      setCollections(userCollections || [])

      // Проверяем, в каких коллекциях уже есть это здание
      const { data: buildingInCollections, error: buildingError } = await supabase
        .from('collection_buildings')
        .select('collection_id')
        .eq('building_id', buildingId)
        .in('collection_id', (userCollections || []).map(c => c.id))

      if (buildingError) throw buildingError

      setBuildingCollections(new Set(buildingInCollections?.map(bc => bc.collection_id) || []))

    } catch (err: any) {
      console.error('Error fetching collections:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Загружаем коллекции при открытии dropdown
  useEffect(() => {
    if (showDropdown && user) {
      fetchUserCollections()
    }
  }, [showDropdown, user, buildingId])

  // Добавление/удаление здания из коллекции
  const toggleBuildingInCollection = async (collectionId: string) => {
    if (!user) return

    const isInCollection = buildingCollections.has(collectionId)

    try {
      if (isInCollection) {
        // Удаляем здание из коллекции
        const { error } = await supabase
          .rpc('remove_building_from_collection', {
            p_collection_id: collectionId,
            p_building_id: buildingId
          })

        if (error) throw error

        setBuildingCollections(prev => {
          const newSet = new Set(prev)
          newSet.delete(collectionId)
          return newSet
        })
      } else {
        // Добавляем здание в коллекцию
        const { error } = await supabase
          .rpc('add_building_to_collection', {
            p_collection_id: collectionId,
            p_building_id: buildingId
          })

        if (error) throw error

        setBuildingCollections(prev => new Set([...prev, collectionId]))
      }

      if (onSuccess) {
        onSuccess()
      }

    } catch (err: any) {
      console.error('Error toggling building in collection:', err)
      setError(err.message)
    }
  }

  // Создание новой коллекции
  const createNewCollection = async () => {
    if (!user) return

    const collectionName = prompt('Введите название новой коллекции:')
    if (!collectionName?.trim()) return

    try {
      const { data: newCollection, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: collectionName.trim(),
          is_public: false
        })
        .select()
        .single()

      if (error) throw error

      // Обновляем локальное состояние
      setCollections(prev => [newCollection, ...prev])
      setBuildingCollections(prev => new Set([...prev, newCollection.id]))

      // Добавляем здание в новую коллекцию
      await supabase
        .rpc('add_building_to_collection', {
          p_collection_id: newCollection.id,
          p_building_id: buildingId
        })

      if (onSuccess) {
        onSuccess()
      }

    } catch (err: any) {
      console.error('Error creating new collection:', err)
      setError(err.message)
    }
  }

  // Если пользователь не авторизован
  if (!user) {
    return (
      <button
        onClick={() => alert('Войдите в систему, чтобы добавлять здания в коллекции')}
        className={`inline-flex items-center gap-2 ${getSizeClasses(size)} text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors`}
      >
        <BookmarkPlus className={getIconSize(size)} />
        {variant !== 'icon' && 'В коллекцию'}
      </button>
    )
  }

  // Подсчитываем количество коллекций с этим зданием
  const collectionsCount = buildingCollections.size

  // Стили в зависимости от размера
  function getSizeClasses(size: string) {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-3 py-2 text-sm'
    }
  }

  function getIconSize(size: string) {
    switch (size) {
      case 'sm':
        return 'w-3 h-3'
      case 'lg':
        return 'w-5 h-5'
      default:
        return 'w-4 h-4'
    }
  }

  return (
    <div className="relative">
      {/* Кнопка */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`inline-flex items-center gap-2 ${getSizeClasses(size)} ${
          collectionsCount > 0
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'text-gray-700 border-gray-300 hover:bg-gray-50'
        } border rounded-lg transition-colors`}
      >
        {collectionsCount > 0 ? (
          <BookmarkCheck className={getIconSize(size)} />
        ) : (
          <BookmarkPlus className={getIconSize(size)} />
        )}
        
        {variant !== 'icon' && (
          <span>
            {collectionsCount > 0 
              ? `В ${collectionsCount} коллекциях`
              : 'В коллекцию'
            }
          </span>
        )}
      </button>

      {/* Выпадающее меню */}
      {showDropdown && (
        <>
          {/* Overlay для закрытия */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Меню */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-4">
              {/* Заголовок */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Добавить в коллекцию</h4>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Название здания */}
              {buildingName && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {buildingName}
                </p>
              )}

              {/* Ошибка */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Загрузка */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600 mt-2">Загрузка...</p>
                </div>
              ) : (
                <>
                  {/* Список коллекций */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {collections.length === 0 ? (
                      <div className="text-center py-4">
                        <BookmarkPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">У вас пока нет коллекций</p>
                      </div>
                    ) : (
                      collections.map(collection => {
                        const isInCollection = buildingCollections.has(collection.id)
                        
                        return (
                          <label
                            key={collection.id}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isInCollection}
                              onChange={() => toggleBuildingInCollection(collection.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {collection.name}
                                </span>
                                {isInCollection && (
                                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                              
                              {collection.description && (
                                <p className="text-xs text-gray-600 line-clamp-1">
                                  {collection.description}
                                </p>
                              )}
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>

                  {/* Кнопка создания новой коллекции */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={createNewCollection}
                      className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Создать новую коллекцию</span>
                    </button>
                  </div>

                  {/* Ссылка на управление коллекциями */}
                  <div className="mt-2">
                    <a
                      href="/collections"
                      onClick={() => setShowDropdown(false)}
                      className="block text-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Управление коллекциями →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Экспорт компонента с различными вариантами использования
export { AddToCollectionButton }

// Компонент только с иконкой
export function AddToCollectionIcon({ buildingId, buildingName, onSuccess }: 
  Pick<AddToCollectionButtonProps, 'buildingId' | 'buildingName' | 'onSuccess'>) {
  return (
    <AddToCollectionButton
      buildingId={buildingId}
      buildingName={buildingName}
      size="sm"
      variant="icon"
      onSuccess={onSuccess}
    />
  )
}

// Компонент для мобильных устройств
export function AddToCollectionMobile({ buildingId, buildingName, onSuccess }: 
  Pick<AddToCollectionButtonProps, 'buildingId' | 'buildingName' | 'onSuccess'>) {
  return (
    <AddToCollectionButton
      buildingId={buildingId}
      buildingName={buildingName}
      size="lg"
      variant="button"
      onSuccess={onSuccess}
    />
  )
}