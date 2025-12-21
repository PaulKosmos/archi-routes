'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
ArrowLeft, Search, Plus, Star, MapPin, User, Calendar, Building2, BookOpen, 
Globe, Lock, Edit3, Download, Share2, Trash2, SortAsc, SortDesc 
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
Collection, 
CollectionBuilding, 
formatCollectionDate, 
getCollectionStats, 
sortCollectionBuildings, 
searchInCollection,
CollectionSortOption 
} from '@/utils/collectionsUtils'
import { exportCollectionToPDF, generateCollectionShareLink, generateSocialShareText } from '@/utils/pdfExport'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

interface CollectionWithBuildings extends Collection {
  buildings: (CollectionBuilding & {
    building: {
      id: string
      name: string
      architect?: string
      city: string
      country: string
      year_built?: number
      image_url?: string
      rating: number
    }
  })[]
}

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const router = useRouter()
  const resolvedParams = use(params)
  const [collection, setCollection] = useState<CollectionWithBuildings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Состояние интерфейса
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<CollectionSortOption>('added')
  const [sortAscending, setSortAscending] = useState(false)
  const [showVisitedOnly, setShowVisitedOnly] = useState(false)
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  const isOwner = user && collection && user.id === collection.user_id

  // Загрузка коллекции
  const fetchCollection = async () => {
    try {
      setLoading(true)
      setError(null)

      // Загружаем коллекцию с полной информацией о зданиях
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()

      if (collectionError) throw collectionError

      // Проверяем права доступа
      if (!collectionData.is_public && (!user || collectionData.user_id !== user.id)) {
        setError('У вас нет доступа к этой коллекции')
        return
      }

      // Загружаем здания коллекции
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('collection_buildings')
        .select(`
          *,
          building:buildings (
            id,
            name,
            architect,
            city,
            country,
            year_built,
            image_url,
            rating
          )
        `)
        .eq('collection_id', resolvedParams.id)

      if (buildingsError) throw buildingsError

      setCollection({
        ...collectionData,
        buildings: buildingsData || []
      })

    } catch (err) {
      console.error('Error fetching collection:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки коллекции')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollection()
  }, [resolvedParams.id, user])

  // Фильтрация и сортировка зданий
  const filteredBuildings = collection?.buildings ? 
    sortCollectionBuildings(
      searchInCollection(
        collection.buildings.filter(cb => !showVisitedOnly || cb.visit_date),
        searchQuery
      ),
      sortBy,
      sortAscending
    ) : []

  // Удаление здания из коллекции
  const removeBuilding = async (buildingId: string) => {
    if (!collection || !isOwner) return
    
    const confirmed = confirm('Удалить здание из коллекции?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .rpc('remove_building_from_collection', {
          p_collection_id: collection.id,
          p_building_id: buildingId
        })

      if (error) throw error

      // Обновляем локальное состояние
      setCollection(prev => prev ? {
        ...prev,
        buildings: prev.buildings.filter(cb => cb.building_id !== buildingId)
      } : null)

    } catch (err) {
      console.error('Error removing building:', err)
      alert('Ошибка удаления здания из коллекции')
    }
  }
  // Массовое удаление зданий
  const bulkRemoveBuildings = async () => {
    if (selectedBuildings.size === 0 || !collection || !isOwner) return
    
    const confirmed = confirm(`Удалить ${selectedBuildings.size} зданий из коллекции?`)
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('collection_buildings')
        .delete()
        .eq('collection_id', collection.id)
        .in('building_id', Array.from(selectedBuildings))

      if (error) throw error

      // Обновляем локальное состояние
      setCollection(prev => prev ? {
        ...prev,
        buildings: prev.buildings.filter(cb => !selectedBuildings.has(cb.building_id))
      } : null)

      setSelectedBuildings(new Set())
      setShowBulkActions(false)

    } catch (err) {
      console.error('Error bulk removing buildings:', err)
      alert('Ошибка удаления зданий из коллекции')
    }
  }

  // Выбор всех зданий
  const selectAllBuildings = () => {
    if (selectedBuildings.size === filteredBuildings.length) {
      setSelectedBuildings(new Set())
    } else {
      setSelectedBuildings(new Set(filteredBuildings.map(cb => cb.building_id)))
    }
  }

  // Экспорт в текстовый формат
  const handleExportPDF = async () => {
    if (!collection) return
    
    try {
      // Подготавливаем текстовые данные
      const textContent = `
КОЛЛЕКЦИЯ: ${collection.name}
${collection.description ? collection.description : 'Описание отсутствует'}

Создана: ${formatCollectionDate(collection.created_at)}
Зданий в коллекции: ${collection.buildings?.length || 0}
Экспортировано: ${new Date().toLocaleDateString('ru-RU')}

${
  collection.buildings && collection.buildings.length > 0 
    ? 'СПИСОК ЗДАНИЙ:\n\n' + collection.buildings.map((cb, index) => {
        const building = cb.building
        return `${index + 1}. ${building?.name || 'Неизвестное здание'}
${
  [
    building?.architect ? `   Архитектор: ${building.architect}` : null,
    building?.city ? `   Город: ${building.city}` : null,
    building?.year_built ? `   Год постройки: ${building.year_built}` : null,
    building?.rating ? `   Рейтинг: ${building.rating}/5` : null,
    cb.visit_date ? `   Посещено: ${formatCollectionDate(cb.visit_date)}` : null,
    cb.personal_note ? `   Заметка: ${cb.personal_note}` : null,
    `   Добавлено: ${formatCollectionDate(cb.added_at)}`
  ].filter(Boolean).join('\n')
}`
      }).join('\n\n')
    : 'Коллекция пуста'
}

Создано с помощью ArchiRoutes
      `
      
      const dataBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dataBlob)
      link.download = `${collection.name.replace(/[^a-zA-Z0-9а-яё\s]/gi, '')}.txt`
      link.click()
      
      URL.revokeObjectURL(link.href)
      
      alert('Коллекция экспортирована в текстовом формате')
      
    } catch (error) {
      console.error('Error exporting collection:', error)
      alert('Ошибка экспорта коллекции')
    }
  }

  // Поделиться коллекцией
  const handleShare = async () => {
    if (!collection) return
    
    const shareUrl = generateCollectionShareLink(collection.id, collection.name)
    const socialText = generateSocialShareText(collection, shareUrl)
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: collection.name,
          text: socialText.facebook,
          url: shareUrl
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Копируем ссылку в буфер обмена
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Ссылка скопирована в буфер обмена!')
      } catch (error) {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Ссылка скопирована в буфер обмена!')
      }
    }
  }

  // Удаление коллекции
  const deleteCollection = async () => {
    if (!collection || !isOwner) return
    
    const confirmed = confirm('Удалить коллекцию? Это действие нельзя отменить.')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collection.id)

      if (error) throw error

      router.push('/collections')

    } catch (err) {
      console.error('Error deleting collection:', err)
      alert('Ошибка удаления коллекции')
    }
  }

  // Компонент карточки здания
  const BuildingCard = ({ collectionBuilding }: { collectionBuilding: CollectionWithBuildings['buildings'][0] }) => {
    const building = collectionBuilding.building
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group relative">
        {/* Чекбокс для выбора */}
        {isOwner && showBulkActions && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={selectedBuildings.has(building.id)}
              onChange={(e) => {
                const newSelected = new Set(selectedBuildings)
                if (e.target.checked) {
                  newSelected.add(building.id)
                } else {
                  newSelected.delete(building.id)
                }
                setSelectedBuildings(newSelected)
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        )}

        {/* Изображение здания */}
        <div className="relative h-48 bg-gray-200">
          {building.image_url ? (
            <Image
              src={building.image_url}
              alt={building.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <Building2 className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {/* Индикаторы */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {collectionBuilding.visit_date && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Посещено
              </span>
            )}
            {building.rating > 0 && (
              <span className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-yellow-400" />
                {building.rating}
              </span>
            )}
          </div>

          {/* Кнопка удаления */}
          {isOwner && !showBulkActions && (
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => removeBuilding(building.id)}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Удалить из коллекции"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Информация о здании */}
        <div className="p-4">
          <Link 
            href={`/buildings/${building.id}`}
            className="block group"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
              {building.name}
            </h3>
          </Link>

          {/* Архитектор и год */}
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            {building.architect && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{building.architect}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{building.city}</span>
              {building.year_built && (
                <>
                  <span className="mx-1">•</span>
                  <span>{building.year_built}</span>
                </>
              )}
            </div>
          </div>

          {/* Личная заметка */}
          {collectionBuilding.personal_note && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-blue-800 line-clamp-3">
                {collectionBuilding.personal_note}
              </p>
            </div>
          )}

          {/* Даты */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Добавлено {formatCollectionDate(collectionBuilding.added_at)}</span>
            </div>
            {collectionBuilding.visit_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Посещено {formatCollectionDate(collectionBuilding.visit_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Коллекция не найдена'}
          </h2>
          <p className="text-gray-600 mb-4">
            Возможно, коллекция была удалена или у вас нет доступа к ней
          </p>
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к коллекциям
          </Link>
        </div>
      </div>
    )
  }

  const stats = getCollectionStats(collection)

  return (
    <>
      <Header buildings={[]} />
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Навигация */}
        <div className="mb-6">
          <Link 
            href="/collections"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к коллекциям
          </Link>
        </div>

        {/* Заголовок коллекции */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          {/* Обложка */}
          <div className="relative h-64 lg:h-80 bg-gray-100 rounded-t-lg overflow-hidden">
            {collection.cover_image ? (
              <Image 
                src={collection.cover_image} 
                alt={collection.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <BookOpen className="w-16 h-16 text-gray-400" />
              </div>
            )}
            
            {/* Overlay с информацией */}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
              <div className="p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  {collection.is_public ? (
                    <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      Публичная
                    </span>
                  ) : (
                    <span className="bg-gray-600 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      Приватная
                    </span>
                  )}
                  
                  <span className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full">
                    {collection.buildings?.length || 0} зданий
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  {collection.name}
                </h1>
                
                {collection.description && (
                  <p className="text-lg text-gray-200 max-w-2xl line-clamp-3">
                    {collection.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Действия и статистика */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              
              {/* Статистика */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Зданий</div>
                  <div className="font-semibold text-lg">{stats.totalBuildings}</div>
                </div>
                <div>
                  <div className="text-gray-500">Городов</div>
                  <div className="font-semibold text-lg">{stats.citiesCount}</div>
                </div>
                <div>
                  <div className="text-gray-500">Посещено</div>
                  <div className="font-semibold text-lg">{stats.visitedCount}</div>
                </div>
                <div>
                  <div className="text-gray-500">Средний рейтинг</div>
                  <div className="font-semibold text-lg flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current text-yellow-400" />
                    {stats.averageRating}
                  </div>
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {showBulkActions ? 'Отменить' : 'Выбрать'}
                    </button>
                    
                    <button
                      onClick={handleExportPDF}
                      className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Сохранить
                    </button>

                    <button
                      onClick={deleteCollection}
                      className="inline-flex items-center gap-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </>
                )}

                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Поделиться
                </button>
              </div>
            </div>

            {/* Дополнительная информация */}
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Создана {formatCollectionDate(collection.created_at)}</span>
                <span>•</span>
                <span>Обновлена {formatCollectionDate(collection.updated_at)}</span>
                {stats.oldestYear && stats.newestYear && (
                  <>
                    <span>•</span>
                    <span>Здания {stats.oldestYear}–{stats.newestYear} гг.</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Панель управления зданиями */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            
            {/* Поиск */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск зданий в коллекции..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Фильтры и сортировка */}
            <div className="flex items-center gap-3">
              {/* Фильтр по посещенным */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showVisitedOnly}
                  onChange={(e) => setShowVisitedOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Только посещенные
              </label>

              {/* Сортировка */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CollectionSortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="added">По дате добавления</option>
                <option value="name">По названию</option>
                <option value="year">По году постройки</option>
                <option value="rating">По рейтингу</option>
                <option value="city">По городу</option>
                <option value="visited">По дате посещения</option>
              </select>

              {/* Направление сортировки */}
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortAscending ? 'Сортировка по возрастанию' : 'Сортировка по убыванию'}
              >
                {sortAscending ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </button>

              {/* Добавить здания */}
              {isOwner && (
                <Link
                  href={`/search?collection=${resolvedParams.id}`}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить здания
                </Link>
              )}
            </div>
          </div>

          {/* Массовые действия */}
          {isOwner && showBulkActions && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Выбрано: {selectedBuildings.size}
                </span>
                <button
                  onClick={selectAllBuildings}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedBuildings.size === filteredBuildings.length ? 'Снять выделение' : 'Выбрать все'}
                </button>
              </div>

              <button
                onClick={bulkRemoveBuildings}
                className="px-3 py-1 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Удалить из коллекции
              </button>
            </div>
          )}
        </div>

        {/* Список зданий */}
        {filteredBuildings.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery || showVisitedOnly ? (
              <div>
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-600 mb-4">
                  Попробуйте изменить критерии поиска или фильтры
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setShowVisitedOnly(false)
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div>
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Коллекция пуста</h3>
                <p className="text-gray-600 mb-4">
                  Добавьте здания из результатов поиска или страниц зданий
                </p>
                {isOwner && (
                  <Link
                    href={`/search?collection=${resolvedParams.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить здания
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBuildings.map(collectionBuilding => (
              <BuildingCard 
                key={collectionBuilding.building_id} 
                collectionBuilding={collectionBuilding} 
              />
            ))}
          </div>
        )}
      </div>
      </div>
      <EnhancedFooter />
    </>
  )
}