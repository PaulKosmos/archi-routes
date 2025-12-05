'use client'

export const dynamic = 'force-dynamic'

// src/app/profile/routes/page.tsx
// Страница управления личными маршрутами пользователя



import { useState, useEffect, useMemo, Suspense } from 'react'
import { Route as RouteIcon, Globe, Lock, Clock, MapPin, Users, Star, Eye, Edit, Trash2, FileText, Send, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { RoutePublicationSystem } from '@/lib/smart-route-filtering'
import { toast } from 'react-hot-toast'
// import { toast } from '@/lib/toast-fallback'
import Header from '@/components/Header'
import RoutePublicationRequest from '@/components/RoutePublicationRequest'
import Link from 'next/link'
import type { Route, RoutePublicationRequest as PublicationRequest } from '@/types/route'

type TabType = 'all' | 'private' | 'pending' | 'published'

export default function ProfileRoutesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading } = useAuth()
  const [routes, setRoutes] = useState<Route[]>([])
  const [publicationRequests, setPublicationRequests] = useState<PublicationRequest[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [showPublicationModal, setShowPublicationModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserRoutes()
      loadPublicationRequests()
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [user, loading])

  useEffect(() => {
    applyFilters()
  }, [routes, activeTab])

  const loadUserRoutes = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          profiles!routes_created_by_fkey (
            id, full_name, avatar_url
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading user routes:', error)
        toast.error('Ошибка при загрузке маршрутов')
        return
      }

      setRoutes(data || [])
    } catch (error) {
      console.error('Exception loading user routes:', error)
      toast.error('Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPublicationRequests = async () => {
    if (!user) return

    try {
      const requests = await RoutePublicationSystem.getUserRequests(user.id)
      setPublicationRequests(requests)
    } catch (error) {
      console.error('Error loading publication requests:', error)
    }
  }

  const applyFilters = () => {
    let filtered = routes

    switch (activeTab) {
      case 'private':
        filtered = routes.filter(route => 
          route.route_visibility === 'private' || route.publication_status === 'draft'
        )
        break
      case 'pending':
        filtered = routes.filter(route => route.publication_status === 'pending')
        break
      case 'published':
        filtered = routes.filter(route => route.publication_status === 'published')
        break
      // 'all' показывают все маршруты
    }

    setFilteredRoutes(filtered)
  }

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот маршрут?')) {
      return
    }

    try {
      // Удаляем точки маршрута
      await supabase
        .from('route_points')
        .delete()
        .eq('route_id', routeId)

      // Удаляем сам маршрут
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId)

      if (error) {
        throw error
      }

      toast.success('Маршрут удален')
      setRoutes(prev => prev.filter(route => route.id !== routeId))
    } catch (error) {
      console.error('Error deleting route:', error)
      toast.error('Ошибка при удалении маршрута')
    }
  }

  const handleRequestPublication = (route: Route) => {
    setSelectedRoute(route)
    setShowPublicationModal(true)
  }

  const handlePublicationSuccess = () => {
    loadPublicationRequests()
    // Обновляем статус маршрута
    loadUserRoutes()
  }

  const getTabCounts = () => {
    return {
      all: routes.length,
      private: routes.filter(r => r.route_visibility === 'private' || r.publication_status === 'draft').length,
      pending: routes.filter(r => r.publication_status === 'pending').length,
      published: routes.filter(r => r.publication_status === 'published').length
    }
  }

  const getPublicationRequestStatus = (routeId: string) => {
    return publicationRequests.find(req => req.route_id === routeId)
  }

  const counts = getTabCounts()

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div className="h-16 bg-white border-b" />}>
          <Header buildings={[]} />
        </Suspense>
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
        <Suspense fallback={<div className="h-16 bg-white border-b" />}>
          <Header buildings={[]} />
        </Suspense>
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="bg-white rounded-lg shadow-sm p-12">
            <RouteIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Войдите в систему
            </h1>
            <p className="text-gray-600 mb-6">
              Для просмотра маршрутов необходимо войти в свою учетную запись
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
      <Suspense fallback={<div className="h-16 bg-white border-b" />}>
        <Header buildings={[]} />
      </Suspense>
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок и кнопка создания */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RouteIcon className="w-8 h-8 text-blue-600" />
              Мои маршруты
            </h1>
            <p className="text-gray-600 mt-2">
              Управляйте своими маршрутами и заявками на публикацию
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать маршрут
          </Link>
        </div>

        {/* Табы */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'Все маршруты', count: counts.all },
                { key: 'private', label: 'Личные', count: counts.private },
                { key: 'pending', label: 'На модерации', count: counts.pending },
                { key: 'published', label: 'Опубликованные', count: counts.published }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Список маршрутов */}
        {filteredRoutes.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-12">
              <RouteIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {routes.length === 0 ? 'Нет созданных маршрутов' : 'Нет маршрутов в этой категории'}
              </h3>
              <p className="text-gray-600 mb-6">
                {routes.length === 0 
                  ? 'Создайте свой первый маршрут, чтобы поделиться им с сообществом'
                  : 'Попробуйте выбрать другую категорию'
                }
              </p>
              {routes.length === 0 && (
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первый маршрут
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((route) => (
              <RouteCard 
                key={route.id} 
                route={route}
                publicationRequest={getPublicationRequestStatus(route.id)}
                onEdit={() => window.open(`/routes/${route.id}/edit`, '_blank')}
                onDelete={() => handleDeleteRoute(route.id)}
                onRequestPublication={() => handleRequestPublication(route)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно заявки на публикацию */}
      {showPublicationModal && selectedRoute && (
        <RoutePublicationRequest
          route={selectedRoute}
          isOpen={showPublicationModal}
          onClose={() => {
            setShowPublicationModal(false)
            setSelectedRoute(null)
          }}
          onSuccess={handlePublicationSuccess}
        />
      )}
    </div>
  )
}

// Компонент карточки маршрута
function RouteCard({ 
  route, 
  publicationRequest,
  onEdit, 
  onDelete, 
  onRequestPublication 
}: { 
  route: Route
  publicationRequest?: PublicationRequest
  onEdit: () => void
  onDelete: () => void
  onRequestPublication: () => void
}) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'published': return <Globe className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      default: return <Lock className="w-4 h-4" />
    }
  }

  const getStatusText = (route: Route, publicationRequest?: PublicationRequest) => {
    // Проверяем сначала статус заявки
    if (publicationRequest) {
      switch (publicationRequest.status) {
        case 'approved': return 'Опубликован'
        case 'rejected': return 'Отклонен'
        case 'pending': return 'На модерации'
      }
    }
    
    // Затем проверяем статус маршрута
    if (route.publication_status === 'published') return 'Опубликован'
    if (route.publication_status === 'pending') return 'На модерации'
    if (route.route_visibility === 'private') return 'Личный'
    return 'Черновик'
  }

  const canRequestPublication = (route: Route, publicationRequest?: PublicationRequest) => {
    return route.route_visibility === 'private' && 
           route.publication_status !== 'pending' && 
           !publicationRequest &&
           route.publication_status !== 'published'
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
          
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            publicationRequest?.status === 'approved' || route.publication_status === 'published' 
              ? 'bg-green-100 text-green-800'
              : publicationRequest?.status === 'rejected'
              ? 'bg-red-100 text-red-800' 
              : publicationRequest?.status === 'pending' || route.publication_status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {getStatusIcon(publicationRequest?.status || route.publication_status)}
            <span className="ml-1">{getStatusText(route, publicationRequest)}</span>
          </div>
        </div>

        {route.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {route.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{route.city}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{route.estimated_duration_minutes || 0} мин</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{route.points_count || 0} точек</span>
          </div>
        </div>

        {publicationRequest && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Заявка на публикацию: {
                  publicationRequest.status === 'pending' ? 'рассматривается' : 
                  publicationRequest.status === 'approved' ? 'одобрена' :
                  publicationRequest.status === 'rejected' ? 'отклонена' : publicationRequest.status
                }
              </span>
            </div>
            {publicationRequest.review_notes && (
              <p className="text-xs text-blue-700 mt-1">{publicationRequest.review_notes}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/routes/${route.id}`}
              className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              Открыть
            </Link>
            
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4 mr-1" />
              Изменить
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canRequestPublication(route, publicationRequest) ? (
              <button
                onClick={onRequestPublication}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4 mr-1" />
                Опубликовать
              </button>
            ) : (
              <button
                onClick={onDelete}
                className="inline-flex items-center px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Удалить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
