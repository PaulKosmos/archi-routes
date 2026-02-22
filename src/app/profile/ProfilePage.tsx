'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import {
  User,
  MapPin,
  Calendar,
  Edit3,
  Building2,
  MessageSquare,
  Heart,
  Star,
  Clock,
  TrendingUp,
  Award,
  ArrowLeft,
  Folder
} from 'lucide-react'
import Link from 'next/link'

interface UserStats {
  buildings_count: number
  reviews_count: number
  favorites_count: number
  routes_count: number
  collections_count: number
  total_views: number
  avg_rating: number
}

interface RecentActivity {
  id: string
  type: 'building' | 'review' | 'favorite' | 'route'
  title: string
  description: string
  created_at: string
  url: string
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<UserStats>({
    buildings_count: 0,
    reviews_count: 0,
    favorites_count: 0,
    routes_count: 0,
    collections_count: 0,
    total_views: 0,
    avg_rating: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && profile) {
      loadProfileData()
    }
  }, [user, profile])

  const loadProfileData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Загружаем статистику
      await Promise.all([
        loadUserStats(),
        loadRecentActivity()
      ])
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async () => {
    if (!user) return

    try {
      // Параллельные запросы для статистики
      const [buildingsRes, reviewsRes, favoritesRes, routesRes, collectionsRes] = await Promise.all([
        supabase
          .from('buildings')
          .select('id, view_count', { count: 'exact' })
          .eq('created_by', user.id),
        supabase
          .from('building_reviews')
          .select('id, rating', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('user_building_favorites')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('routes')
          .select('id, completion_count', { count: 'exact' })
          .eq('created_by', user.id),
        supabase
          .from('user_collections')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
      ])

      // Рассчитываем общие просмотры и средний рейтинг
      const totalViews = buildingsRes.data?.reduce((sum, building) => sum + (building.view_count || 0), 0) || 0
      const reviewsData = reviewsRes.data || []
      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length
        : 0

      setStats({
        buildings_count: buildingsRes.count || 0,
        reviews_count: reviewsRes.count || 0,
        favorites_count: favoritesRes.count || 0,
        routes_count: routesRes.count || 0,
        collections_count: collectionsRes.count || 0,
        total_views: totalViews,
        avg_rating: Math.round(avgRating * 10) / 10
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const loadRecentActivity = async () => {
    if (!user) return

    try {
      // Загружаем последние активности (здания, обзоры, избранное)
      const [buildingsRes, reviewsRes, favoritesRes, routesRes] = await Promise.all([
        supabase
          .from('buildings')
          .select('id, name, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('building_reviews')
          .select('id, title, created_at, buildings!inner(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('user_building_favorites')
          .select('id, created_at, buildings!inner(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('routes')
          .select('id, title, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      // Объединяем и сортируем активности
      const activities: RecentActivity[] = [
        ...(buildingsRes.data?.map(building => ({
          id: building.id,
          type: 'building' as const,
          title: `Added object "${building.name}"`,
          description: 'New architectural discovery',
          created_at: building.created_at,
          url: `/buildings/${building.id}`
        })) || []),
        ...(reviewsRes.data?.map(review => ({
          id: review.id,
          type: 'review' as const,
          title: `Wrote review for "${(review.buildings as any).name}"`,
          description: review.title || 'New object review',
          created_at: review.created_at,
          url: `/buildings/${review.id}`
        })) || []),
        ...(favoritesRes.data?.map(favorite => ({
          id: favorite.id,
          type: 'favorite' as const,
          title: `Added to favorites "${(favorite.buildings as any).name}"`,
          description: 'New object in collection',
          created_at: favorite.created_at,
          url: `/buildings/${favorite.id}`
        })) || []),
        ...(routesRes.data?.map(route => ({
          id: route.id,
          type: 'route' as const,
          title: `Created route "${route.title}"`,
          description: 'New architecture route',
          created_at: route.created_at,
          url: `/routes/${route.id}`
        })) || [])
      ]

      // Сортируем по дате и берем последние 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      setRecentActivity(sortedActivities)
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'building': return <Building2 className="w-4 h-4 text-green-600" />
      case 'review': return <MessageSquare className="w-4 h-4 text-purple-600" />
      case 'favorite': return <Heart className="w-4 h-4 text-red-600" />
      case 'route': return <MapPin className="w-4 h-4 text-blue-600" />
      default: return <Star className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'guest': 'Guest',
      'explorer': 'Explorer',
      'guide': 'Guide',
      'expert': 'Expert',
      'moderator': 'Moderator',
      'admin': 'Administrator'
    }
    return roleNames[role as keyof typeof roleNames] || 'Explorer'
  }

  const getRoleColor = (role: string) => {
    const roleColors = {
      'guest': 'bg-gray-100 text-gray-800',
      'explorer': 'bg-blue-100 text-blue-800',
      'guide': 'bg-green-100 text-green-800',
      'expert': 'bg-purple-100 text-purple-800',
      'moderator': 'bg-red-100 text-red-800',
      'admin': 'bg-red-200 text-red-900 font-bold'
    }
    return roleColors[role as keyof typeof roleColors] || 'bg-blue-100 text-blue-800'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600 mb-6">You must sign in to view your profile</p>
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

  const displayName = profile?.display_name || profile?.full_name || user.user_metadata?.full_name || 'User'
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-8">
        {/* Навигация */}
        <div className="mb-2 sm:mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>To Home</span>
          </Link>
        </div>

        {/* Шапка профиля */}
        <div className="bg-white rounded-lg shadow-sm border p-2.5 sm:p-6 mb-2 sm:mb-6">
          <div className="flex sm:flex-row items-start justify-between gap-2 sm:gap-6">
            <div className="flex items-start gap-2.5 sm:gap-6 flex-1 min-w-0">
              {/* Аватар */}
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center flex-shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg sm:text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Основная информация */}
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">
                  {displayName}
                </h1>
                <p className="text-gray-600 text-xs sm:text-base break-all">{user.email}</p>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-1 sm:mt-2">
                  <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium ${getRoleColor(profile?.role || 'explorer')}`}>
                    {getRoleDisplayName(profile?.role || 'explorer')}
                  </span>

                  {profile?.city && (
                    <div className="flex items-center text-[10px] sm:text-sm text-gray-500">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5" />
                      {profile.city}
                    </div>
                  )}

                  <div className="flex items-center text-[10px] sm:text-sm text-gray-500">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5" />
                    <span className="hidden sm:inline">On platform since </span>
                    <span className="sm:hidden">Since </span>
                    {formatDate(profile?.created_at || user.created_at)}
                  </div>
                </div>

                {profile?.bio && (
                  <p className="text-gray-700 mt-1.5 sm:mt-3 max-w-2xl text-xs sm:text-base line-clamp-2 sm:line-clamp-none">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Кнопка редактирования */}
            <Link
              href="/profile/edit"
              className="bg-blue-600 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 sm:space-x-2 flex-shrink-0 text-xs sm:text-sm"
            >
              <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Edit</span>
            </Link>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-4 mb-2 sm:mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-green-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 sm:mb-0">
                <Building2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-gray-900 leading-tight">
                  {loading ? '...' : stats.buildings_count}
                </p>
                <p className="text-[9px] sm:text-sm text-gray-600 truncate leading-tight">Objects</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 sm:mb-0">
                <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-gray-900 leading-tight">
                  {loading ? '...' : stats.routes_count}
                </p>
                <p className="text-[9px] sm:text-sm text-gray-600 truncate leading-tight">Routes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-purple-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 sm:mb-0">
                <MessageSquare className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-gray-900 leading-tight">
                  {loading ? '...' : stats.reviews_count}
                </p>
                <p className="text-[9px] sm:text-sm text-gray-600 truncate leading-tight">Reviews</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-red-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 sm:mb-0">
                <Heart className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-gray-900 leading-tight">
                  {loading ? '...' : stats.favorites_count}
                </p>
                <p className="text-[9px] sm:text-sm text-gray-600 truncate leading-tight">Favorites</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-1.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 text-center sm:text-left">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-indigo-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 sm:mb-0">
                <Folder className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-gray-900 leading-tight">
                  {loading ? '...' : stats.collections_count}
                </p>
                <p className="text-[9px] sm:text-sm text-gray-600 truncate leading-tight">Collections</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-2 sm:gap-6">
          {/* Последняя активность */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-2.5 py-2 sm:p-6 border-b border-gray-200">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  Recent Activity
                </h2>
              </div>

              <div className="p-2 sm:p-6">
                {loading ? (
                  <div className="space-y-2 sm:space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-0.5 sm:space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-2 sm:space-x-3 p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.description} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                        <Link
                          href={activity.url}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-shrink-0"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                    <p className="text-gray-500 mb-4">Start creating routes and adding objects!</p>
                    <div className="space-x-3">
                      <Link
                        href="/buildings/new"
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Add Object</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Дополнительная статистика и навигация */}
          <div className="space-y-2 sm:space-y-6">
            {/* Дополнительные метрики */}
            <div className="bg-white rounded-lg shadow-sm border p-2.5 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                Statistics
              </h3>

              <div className="space-y-2 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Total Views</span>
                  <span className="font-semibold text-gray-900">
                    {loading ? '...' : stats.total_views.toLocaleString()}
                  </span>
                </div>

                {stats.reviews_count > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Rating</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-semibold text-gray-900">
                        {loading ? '...' : stats.avg_rating}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Быстрая навигация */}
            <div className="bg-white rounded-lg shadow-sm border p-2.5 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-4">My Sections</h3>

              <div className="space-y-0 sm:space-y-3">
                <Link
                  href="/profile/buildings"
                  className="flex items-center justify-between p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">Objects</span>
                  </div>
                  <span className="text-sm text-gray-500">{stats.buildings_count}</span>
                </Link>

                <Link
                  href="/profile/routes"
                  className="flex items-center justify-between p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">My Routes</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">{stats.routes_count}</span>
                </Link>

                <Link
                  href="/profile/reviews"
                  className="flex items-center justify-between p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">My Reviews</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">{stats.reviews_count}</span>
                </Link>

                <Link
                  href="/profile/favorites"
                  className="flex items-center justify-between p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">Favorites</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">{stats.favorites_count}</span>
                </Link>

                <Link
                  href="/profile/collections"
                  className="flex items-center justify-between p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">Collections</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">{stats.collections_count}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
