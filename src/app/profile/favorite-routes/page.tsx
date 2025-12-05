// src/app/profile/favorite-routes/page.tsx
// Страница избранных маршрутов пользователя

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Heart, Route as RouteIcon, MapPin, Clock, Star, Filter, Grid, List, Download, Search, Trash2, ExternalLink } from 'lucide-react'
import { UserRouteFavorites } from '@/lib/smart-route-filtering'
import { useAuth } from '@/hooks/useAuth'
import { RouteWithUserData, formatDistance, formatDuration } from '@/types/route'
import Header from '@/components/Header'
import { toast } from 'react-hot-toast'
// import { toast } from '@/lib/toast-fallback'
import Link from 'next/link'

type ViewMode = 'grid' | 'list'
type FilterMode = 'all' | 'favorites' | 'completed' | 'to_visit'

export default function FavoriteRoutesPage() {
  const { user, loading } = useAuth()
  const [routes, setRoutes] = useState<RouteWithUserData[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<RouteWithUserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadFavoriteRoutes()
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [user, loading])

  useEffect(() => {
    applyFilters()
  }, [routes, filterMode, searchQuery])

  const loadFavoriteRoutes = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const favoriteRoutes = await UserRouteFavorites.getUserFavorites(user.id)
      setRoutes(favoriteRoutes)
    } catch (error) {
      console.error('Error loading favorite routes:', error)
      toast.error('Ошибка при загрузке избранных маршрутов')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = routes

    // Фильтр по категории
    switch (filterMode) {
      case 'completed':
        filtered = filtered.filter(route => route.completed_at)
        break
      case 'favorites':
        filtered = filtered.filter(route => !route.completed_at)
        break
      // 'all' и 'to_visit' показывают все маршруты
    }

    // Поиск по названию
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(route => 
        route.title.toLowerCase().includes(query) ||
        route.description?.toLowerCase().includes(query) ||
        route.city?.toLowerCase().includes(query)
      )
    }

    setFilteredRoutes(filtered)
  }

  const handleRemoveFromFavorites = async (routeId: string) => {
    if (!user) return

    try {
      const success = await UserRouteFavorites.removeFromFavorites(user.id, routeId)
      if (success) {
        setRoutes(prev => prev.filter(route => route.id !== routeId))
        toast.success('Маршрут удален из избранного')
        setShowDeleteConfirm(null)
      } else {
        toast.error('Ошибка при удалении')
      }
    } catch (error) {
      console.error('Error removing from favorites:', error)
      toast.error('Произошла ошибка')
    }
  }

  const exportFavorites = () => {
    if (filteredRoutes.length === 0) {
      toast.error('Нет маршрутов для экспорта')
      return
    }

    const data = filteredRoutes.map(route => ({
      название: route.title,
      город: route.city,
      продолжительность: route.estimated_duration_minutes ? `${route.estimated_duration_minutes} мин` : 'N/A',
      рейтинг: route.rating || 'N/A',
      статус: route.completed_at ? 'Пройден' : 'В избранном',
      дата_добавления: route.created_at ? new Date(route.created_at).toLocaleDateString('ru-RU') : 'N/A',
      ссылка: `${window.location.origin}/routes/${route.id}`
    }))

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'favorite_routes.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Список избранных маршрутов экспортирован')
  }

  const getFilterCounts = () => {
    return {
      all: routes.length,
      favorites: routes.filter(r => !r.completed_at).length,
      completed: routes.filter(r => r.completed_at).length,
      to_visit: routes.length // Все маршруты - это потенциальные для посещения
    }
  }

  const counts = getFilterCounts()

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="bg-white rounded-lg shadow-sm p-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Войдите в систему
            </h1>
            <p className="text-gray-600 mb-6">
              Для просмотра избранных маршрутов необходимо войти в свою учетную запись
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок и статистика */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500" />
                Мои маршруты
              </h1>
              <p className="text-gray-600 mt-2">
                Управляйте своими избранными и пройденными маршрутами
              </p>
            </div>

            {filteredRoutes.length > 0 && (
              <button
                onClick={exportFavorites}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Экспорт
              </button>
            )}
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{counts.all}</div>
              <div className="text-sm text-gray-600">Всего маршрутов</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{counts.favorites}</div>
              <div className="text-sm text-gray-600">В избранном</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{counts.completed}</div>
              <div className="text-sm text-gray-600">Пройдено</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((counts.completed / (counts.all || 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Завершено</div>
            </div>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Поиск */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Поиск маршрутов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              {/* Фильтры */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Все ({counts.all})</option>
                  <option value="favorites">В избранном ({counts.favorites})</option>
                  <option value="completed">Пройденные ({counts.completed})</option>
                </select>
              </div>

              {/* Переключатель вида */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Список маршрутов */}
        {filteredRoutes.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-12">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {routes.length === 0 ? 'Нет избранных маршрутов' : 'Нет маршрутов по заданным фильтрам'}
              </h3>
              <p className="text-gray-600 mb-6">
                {routes.length === 0 
                  ? 'Добавьте интересные маршруты в избранное, чтобы они появились здесь'
                  : 'Попробуйте изменить фильтры или поисковый запрос'
                }
              </p>
              {routes.length === 0 && (
                <Link
                  href="/routes"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RouteIcon className="w-4 h-4 mr-2" />
                  Найти маршруты
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className={`${viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }`}>
            {filteredRoutes.map((route) => (
              <RouteCard 
                key={route.id} 
                route={route} 
                viewMode={viewMode}
                onRemove={() => setShowDeleteConfirm(route.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Удалить из избранного?
            </h3>
            <p className="text-gray-600 mb-6">
              Маршрут будет удален из вашего списка избранных. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => showDeleteConfirm && handleRemoveFromFavorites(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент карточки маршрута
function RouteCard({ 
  route, 
  viewMode, 
  onRemove 
}: { 
  route: RouteWithUserData
  viewMode: ViewMode
  onRemove: () => void
}) {
  const isCompleted = !!route.completed_at

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link 
                  href={`/routes/${route.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {route.title}
                </Link>
                
                {isCompleted && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Пройден
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{route.city}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{route.estimated_duration_minutes || 'N/A'} мин</span>
                </div>
                
                {route.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{route.rating}/5</span>
                  </div>
                )}
              </div>

              {route.description && (
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                  {route.description}
                </p>
              )}

              {route.user_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="text-xs font-medium text-blue-800 mb-1">Мои заметки:</div>
                  <div className="text-sm text-blue-900">{route.user_notes}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Link
                href={`/routes/${route.id}`}
                className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Открыть
              </Link>
              
              <button
                onClick={onRemove}
                className="inline-flex items-center px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Link 
            href={`/routes/${route.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
          >
            {route.title}
          </Link>
          
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4" />
          <span>{route.city}</span>
          
          {isCompleted && (
            <span className="ml-auto inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Пройден
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center justify-between">
            <span>Продолжительность:</span>
            <span className="font-medium">{route.estimated_duration_minutes || 'N/A'} мин</span>
          </div>
          
          {route.rating && (
            <div className="flex items-center justify-between">
              <span>Рейтинг:</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="font-medium">{route.rating}/5</span>
              </div>
            </div>
          )}
        </div>

        {route.user_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-xs font-medium text-blue-800 mb-1">Мои заметки:</div>
            <div className="text-sm text-blue-900 line-clamp-3">{route.user_notes}</div>
          </div>
        )}

        <Link
          href={`/routes/${route.id}`}
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Открыть маршрут
        </Link>
      </div>
    </div>
  )
}
