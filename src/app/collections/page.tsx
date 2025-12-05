'use client'

export const dynamic = 'force-dynamic'



import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Plus, Search, Grid, List, BookOpen, Star, MapPin, Calendar, Users, Share2, Download, Trash2, Eye, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Collection {
  id: string
  name: string
  description: string | null
  is_public: boolean
  cover_image: string | null
  created_at: string
  updated_at: string
  building_count: number
  visited_count: number
  average_rating: number | null
  cities_count: number
  likes_count: number
}

type ViewMode = 'grid' | 'list'
type SortOption = 'updated' | 'created' | 'name' | 'size'

export default function CollectionsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Состояние интерфейса
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [showPublicOnly, setShowPublicOnly] = useState(false)
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Загрузка коллекций
  const fetchCollections = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .rpc('get_user_collections', { p_user_id: user.id })

      if (fetchError) throw fetchError

      setCollections(data || [])
    } catch (err) {
      console.error('Error fetching collections:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки коллекций')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchCollections()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  // Фильтрация и сортировка коллекций
  const filteredCollections = collections
    .filter(collection => {
      const matchesSearch = !searchQuery || 
        collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collection.description && collection.description.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesPublicFilter = !showPublicOnly || collection.is_public
      
      return matchesSearch && matchesPublicFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'size':
          return b.building_count - a.building_count
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

  // Функции для массовых операций
  const selectAllCollections = () => {
    if (selectedCollections.size === filteredCollections.length) {
      setSelectedCollections(new Set())
    } else {
      setSelectedCollections(new Set(filteredCollections.map(c => c.id)))
    }
  }

  const bulkDeleteCollections = async () => {
    if (selectedCollections.size === 0) return
    
    const confirmed = confirm(`Удалить ${selectedCollections.size} коллекций? Это действие нельзя отменить.`)
    if (!confirmed) return

    try {
      const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .in('id', Array.from(selectedCollections))

      if (deleteError) throw deleteError

      setSelectedCollections(new Set())
      fetchCollections()
    } catch (err) {
      console.error('Error deleting collections:', err)
      setError('Ошибка удаления коллекций')
    }
  }

  // Компонент карточки коллекции (grid view)
  const CollectionCard = ({ collection }: { collection: Collection }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
      {/* Чекбокс для выбора */}
      {showBulkActions && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={selectedCollections.has(collection.id)}
            onChange={(e) => {
              const newSelected = new Set(selectedCollections)
              if (e.target.checked) {
                newSelected.add(collection.id)
              } else {
                newSelected.delete(collection.id)
              }
              setSelectedCollections(newSelected)
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      )}

      {/* Обложка коллекции */}
      <div className="h-48 bg-gray-200 relative">
        {collection.cover_image ? (
          <Image
            src={collection.cover_image}
            alt={collection.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Статус публичности */}
        <div className="absolute top-3 right-3">
          {collection.is_public ? (
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Публичная
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Приватная
            </div>
          )}
        </div>
      </div>

      {/* Информация о коллекции */}
      <div className="p-4">
        <Link href={`/collections/${collection.id}`} className="block">
          <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
            {collection.name}
          </h3>
        </Link>
        
        {collection.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {collection.description}
          </p>
        )}

        {/* Статистика */}
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {collection.building_count}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {collection.cities_count}
            </span>
            {collection.average_rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {collection.average_rating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Обновлена {new Date(collection.updated_at).toLocaleDateString()}
            </span>
            {collection.is_public && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {collection.likes_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Компонент элемента списка (list view)
  const CollectionListItem = ({ collection }: { collection: Collection }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Чекбокс */}
        {showBulkActions && (
          <input
            type="checkbox"
            checked={selectedCollections.has(collection.id)}
            onChange={(e) => {
              const newSelected = new Set(selectedCollections)
              if (e.target.checked) {
                newSelected.add(collection.id)
              } else {
                newSelected.delete(collection.id)
              }
              setSelectedCollections(newSelected)
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        )}

        {/* Обложка */}
        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
          {collection.cover_image ? (
            <Image
              src={collection.cover_image}
              alt={collection.name}
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Информация */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/collections/${collection.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
              {collection.name}
            </Link>
            {collection.is_public ? (
              <Eye className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-gray-500 flex-shrink-0" />
            )}
          </div>

          {collection.description && (
            <p className="text-gray-600 text-sm mb-2 line-clamp-1">
              {collection.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{collection.building_count} зданий</span>
            <span>{collection.cities_count} городов</span>
            {collection.average_rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {collection.average_rating.toFixed(1)}
              </span>
            )}
            <span className="text-xs">
              {new Date(collection.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // Если пользователь не авторизован
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Войдите в систему</h2>
          <p className="text-gray-600 mb-4">Чтобы просматривать и создавать коллекции</p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    )
  }

  // Загрузка
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            {/* Скелетон заголовка */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-40"></div>
            </div>

            {/* Скелетон панели управления */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>

            {/* Скелетон карточек */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Навигация */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Мои коллекции</h1>
              <p className="text-gray-600 mt-1">
                {filteredCollections.length} {filteredCollections.length === 1 ? 'коллекция' : 'коллекций'}
              </p>
            </div>
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          {/* Кнопки действий */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showBulkActions ? 'Отменить' : 'Выбрать'}
              </button>
            </div>
            
            <Link
              href="/collections/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Создать коллекцию
            </Link>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            
            {/* Поиск */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по коллекциям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Фильтры и сортировка */}
            <div className="flex items-center gap-3">
              {/* Вид отображения */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Сортировка */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="updated">По дате изменения</option>
                <option value="created">По дате создания</option>
                <option value="name">По названию</option>
                <option value="size">По количеству зданий</option>
              </select>

              {/* Фильтр по типу */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showPublicOnly}
                  onChange={(e) => setShowPublicOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Только публичные
              </label>
            </div>
          </div>

          {/* Массовые действия */}
          {showBulkActions && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Выбрано: {selectedCollections.size}
                </span>
                <button
                  onClick={selectAllCollections}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedCollections.size === filteredCollections.length ? 'Снять выделение' : 'Выбрать все'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {/* TODO: Массовый экспорт */}}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled
                  title="Массовый экспорт (скоро)"
                >
                  Экспорт
                </button>
                <button
                  onClick={bulkDeleteCollections}
                  className="px-3 py-1 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Содержимое */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              <strong>Ошибка:</strong> {error}
            </div>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <div>
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-600 mb-4">
                  Попробуйте изменить поисковый запрос или фильтры
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Очистить поиск
                </button>
              </div>
            ) : (
              <div>
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Пока нет коллекций</h3>
                <p className="text-gray-600 mb-4">
                  Создайте свою первую коллекцию архитектурных зданий
                </p>
                <Link
                  href="/collections/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Создать коллекцию
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }>
            {filteredCollections.map(collection => (
              viewMode === 'grid' ? (
                <CollectionCard key={collection.id} collection={collection} />
              ) : (
                <CollectionListItem key={collection.id} collection={collection} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}