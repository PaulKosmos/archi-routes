'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import {
  MapPin,
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Star,
  Eye,
  Calendar,
  Clock,
  Filter,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Users,
  Route
} from 'lucide-react'
import Link from 'next/link'
import { RouteWithPoints } from '@/types/building'

interface RouteWithStats extends RouteWithPoints {
  completion_count: number
  view_count: number
}

export default function ProfileRoutesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const [routes, setRoutes] = useState<RouteWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'rating' | 'completion_count'>('created_at')
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadUserRoutes()
    }
  }, [user, sortBy])

  const loadUserRoutes = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          route_points(count)
        `)
        .eq('created_by', user.id)
        .order(sortBy, { ascending: false })

      if (error) throw error

      const processedRoutes = data.map(route => ({
        ...route,
        completion_count: route.completion_count || 0,
        view_count: 0,
        route_points: route.route_points || []
      }))

      setRoutes(processedRoutes)
    } catch (error) {
      console.error('Error loading routes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId)
        .eq('created_by', user?.id)

      if (error) throw error

      setRoutes(prev => prev.filter(r => r.id !== routeId))
      setSelectedRoute(null)
    } catch (error) {
      console.error('Error deleting route:', error)
      alert('Error deleting route')
    }
  }

  const togglePublishStatus = async (routeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ is_published: !currentStatus })
        .eq('id', routeId)
        .eq('created_by', user?.id)

      if (error) throw error

      setRoutes(prev => prev.map(route =>
        route.id === routeId
          ? { ...route, is_published: !currentStatus }
          : route
      ))
    } catch (error) {
      console.error('Error updating publish status:', error)
      alert('Error updating publish status')
    }
  }

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.city?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = !filterType || route.route_type === filterType
    const matchesDifficulty = !filterDifficulty || route.difficulty_level === filterDifficulty

    return matchesSearch && matchesType && matchesDifficulty
  })

  const uniqueTypes = Array.from(new Set(routes.map(r => r.route_type).filter(Boolean)))
  const uniqueDifficulties = Array.from(new Set(routes.map(r => r.difficulty_level).filter(Boolean)))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Not specified'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) return `${mins} min`
    if (mins === 0) return `${hours} h`
    return `${hours} h ${mins} min`
  }

  const formatDistance = (km: number | null) => {
    if (!km) return 'Not specified'

    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1)} km`
  }

  const getDifficultyColor = (difficulty: string | null) => {
    const colors = {
      'easy': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'hard': 'bg-red-100 text-red-800'
    }
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getDifficultyDisplayName = (difficulty: string | null) => {
    const names = {
      'easy': 'Easy',
      'medium': 'Medium',
      'hard': 'Hard'
    }
    return names[difficulty as keyof typeof names] || 'Not specified'
  }

  const getRouteTypeDisplayName = (type: string | null) => {
    const names = {
      'walking': 'Walking',
      'cycling': 'Cycling',
      'driving': 'Car',
      'public_transport': 'Public Transport'
    }
    return names[type as keyof typeof names] || 'Not specified'
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return null

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Route className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600 mb-6">You must sign in to view your routes</p>
          <Link
            href="/auth"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Route className="w-6 h-6 mr-2" />
                My Routes
              </h1>
              <p className="text-gray-600">
                {routes.length} {routes.length === 1 ? 'route' : 'routes'}
              </p>
            </div>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              onClick={() => {
                alert('Route creation feature will be available after RouteCreator integration')
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Route</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, description or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{getRouteTypeDisplayName(type)}</option>
                  ))}
                </select>
              </div>

              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Difficulties</option>
                {uniqueDifficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>{getDifficultyDisplayName(difficulty)}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">By Date Created</option>
                <option value="rating">By Rating</option>
                <option value="completion_count">By Popularity</option>
              </select>

              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500'} rounded-l-lg transition-colors`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500'} rounded-r-lg transition-colors`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="h-48 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-12">
            <Route className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            {routes.length === 0 ? (
              <>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Routes Yet</h3>
                <p className="text-gray-500 mb-6">Create your first architectural route!</p>
                <button
                  onClick={() => alert('Route creation feature will be available after RouteCreator integration')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Route</span>
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Nothing Found</h3>
                <p className="text-gray-500 mb-6">Try changing search parameters or filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterType('')
                    setFilterDifficulty('')
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reset Filters
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((route) => (
              <div key={route.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48 bg-gradient-to-br from-blue-400 to-purple-500">
                  {route.thumbnail_url ? (
                    <img
                      src={route.thumbnail_url}
                      alt={route.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Route className="w-12 h-12 text-white" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${route.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {route.is_published ? 'Published<' : 'Draft'}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
                        className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {selectedRoute === route.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-10">
                          <Link
                            href={`/routes/${route.id}`}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setSelectedRoute(null)}
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </Link>
                          <Link
                            href={`/routes/${route.id}/edit`}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setSelectedRoute(null)}
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </Link>
                          <button
                            onClick={() => {
                              togglePublishStatus(route.id, route.is_published)
                              setSelectedRoute(null)
                            }}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>{route.is_published ? 'Unpublish' : 'Publish'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(route.id)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {route.title}
                  </h3>

                  {route.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {route.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{route.city || 'Not specified'}</span>
                      </div>

                      {route.difficulty_level && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(route.difficulty_level)}`}>
                          {getDifficultyDisplayName(route.difficulty_level)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(route.estimated_duration_minutes)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Route className="w-4 h-4" />
                        <span>{formatDistance(route.distance_km)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{route.completion_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{route.points_count || 0} points</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        {formatDate(route.created_at)}
                      </div>
                    </div>

                    {route.rating && (
                      <div className="mt-2">
                        {renderStars(route.rating)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredRoutes.map((route) => (
                <div key={route.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg overflow-hidden flex-shrink-0">
                      {route.thumbnail_url ? (
                        <img
                          src={route.thumbnail_url}
                          alt={route.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Route className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {route.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${route.is_published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {route.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>

                          {route.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {route.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{route.city || 'City not specified'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(route.estimated_duration_minutes)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{route.completion_count} completions</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(route.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Link
                            href={`/routes/${route.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/routes/${route.id}/edit`}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => togglePublishStatus(route.id, route.is_published)}
                            className={`p-2 rounded-lg transition-colors ${route.is_published
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                              }`}
                            title={route.is_published ? 'Unpublish' : 'Publish'}
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(route.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
