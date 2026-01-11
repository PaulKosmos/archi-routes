'use client'

export const dynamic = 'force-dynamic'

// src/app/profile/routes/page.tsx
// Страница управления личными маршрутами пользователя



import { useState, useEffect, useMemo, Suspense } from 'react'
import { Route as RouteIcon, Globe, Lock, Clock, MapPin, Users, Star, Eye, Edit, Trash2, FileText, Send, Plus, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { RoutePublicationSystem } from '@/lib/smart-route-filtering'
import { toast } from 'react-hot-toast'
// import { toast } from '@/lib/toast-fallback'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
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
        toast.error('Error loading routes')
        return
      }

      setRoutes(data || [])
    } catch (error) {
      console.error('Exception loading user routes:', error)
      toast.error('An error occurred')
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
    if (!confirm('Are you sure you want to delete this route?')) {
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

      toast.success('Route deleted')
      setRoutes(prev => prev.filter(route => route.id !== routeId))
    } catch (error) {
      console.error('Error deleting route:', error)
      toast.error('Error deleting route')
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
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
          <Header buildings={[]} />
        </Suspense>
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 pt-10">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded-[var(--radius)] w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-card border border-border rounded-[var(--radius)] p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
          <Header buildings={[]} />
        </Suspense>
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-card border border-border rounded-[var(--radius)] p-12 max-w-md mx-auto">
            <RouteIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">
              Sign In
            </h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to view routes
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
        <Header buildings={[]} />
      </Suspense>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pt-10">
          {/* Заголовок и кнопка создания */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                  <RouteIcon className="w-6 h-6" />
                  My Routes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your routes and publication requests
                </p>
              </div>

              <Link
                href="/routes/create"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Route
              </Link>
            </div>
          </div>

          {/* Табы */}
          <div className="bg-card border border-border rounded-[var(--radius)] mb-6">
            <div className="border-b border-border">
              <nav className="flex gap-8 px-6">
                {[
                  { key: 'all', label: 'All Routes', count: counts.all },
                  { key: 'private', label: 'Private', count: counts.private },
                  { key: 'pending', label: 'Pending', count: counts.pending },
                  { key: 'published', label: 'Published', count: counts.published }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabType)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
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
                  {routes.length === 0 ? 'No routes created' : 'No routes in this category'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {routes.length === 0
                    ? 'Create your first route to share it with the community'
                    : 'Try selecting another category'
                  }
                </p>
                {routes.length === 0 && (
                  <Link
                    href="/routes/create"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Route
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
      </main>

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
      <EnhancedFooter />
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
        case 'approved': return 'Published'
        case 'rejected': return 'Rejected'
        case 'pending': return 'На модерации'
      }
    }

    // Затем проверяем статус маршрута
    if (route.publication_status === 'published') return 'Published'
    if (route.publication_status === 'pending') return 'На модерации'
    if (route.route_visibility === 'private') return 'Private'
    return 'Draft'
  }

  const canRequestPublication = (route: Route, publicationRequest?: PublicationRequest) => {
    return route.route_visibility === 'private' &&
      route.publication_status !== 'pending' &&
      !publicationRequest &&
      route.publication_status !== 'published'
  }

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={`/routes/${route.id}`}
            className="text-base font-semibold hover:text-primary transition-colors line-clamp-1 flex-1"
          >
            {route.title}
          </Link>

          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${publicationRequest?.status === 'approved' || route.publication_status === 'published'
            ? 'bg-green-100 text-green-800'
            : publicationRequest?.status === 'rejected'
              ? 'bg-red-100 text-red-800'
              : publicationRequest?.status === 'pending' || route.publication_status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-muted text-muted-foreground'
            }`}>
            {getStatusIcon(publicationRequest?.status || route.publication_status)}
            <span className="ml-1">{getStatusText(route, publicationRequest)}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-xs mb-2 line-clamp-2 h-8">
          {route.description || 'No description'}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 h-4">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{route.city}</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{route.estimated_duration_minutes || 0} min</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3" />
            <span>{route.points_count || 0}</span>
          </div>
        </div>

        <div className="mb-2 h-8">
          {publicationRequest && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-[var(--radius)]">
              <div className="flex items-center gap-1 text-xs">
                <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-blue-900 truncate">
                  {publicationRequest.status === 'pending' ? 'Under Review' :
                    publicationRequest.status === 'approved' ? 'Approved' :
                      publicationRequest.status === 'rejected' ? 'Rejected' : publicationRequest.status}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Link
              href={`/routes/${route.id}`}
              className="inline-flex items-center px-2 py-1.5 text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Link>

            <button
              onClick={onEdit}
              className="inline-flex items-center px-2 py-1.5 text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </button>
          </div>

          <div className="flex items-center gap-1">
            {canRequestPublication(route, publicationRequest) ? (
              <button
                onClick={onRequestPublication}
                className="inline-flex items-center px-2 py-1.5 text-xs bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
              >
                <Send className="w-3 h-3 mr-1" />
                Publish
              </button>
            ) : (
              <button
                onClick={onDelete}
                className="inline-flex items-center px-2 py-1.5 text-xs border border-red-300 text-red-600 rounded-[var(--radius)] hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
