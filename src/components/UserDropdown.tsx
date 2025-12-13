'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { 
  User, 
  Edit3, 
  MapPin, 
  Star, 
  Heart, 
  Settings, 
  LogOut, 
  Building2,
  MessageSquare,
  ChevronDown,
  BookOpen,
  Bot,
  Users,
  Shield
} from 'lucide-react'

interface UserStats {
  buildings_count: number
  reviews_count: number
  favorites_count: number
  routes_count: number
  collections_count: number
  liked_blogs_count: number
  saved_blogs_count: number
  pending_requests_count?: number // Для модераторов
}

export default function UserDropdown() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<UserStats>({
    buildings_count: 0,
    reviews_count: 0,
    favorites_count: 0,
    routes_count: 0,
    collections_count: 0,
    liked_blogs_count: 0,
    saved_blogs_count: 0,
    pending_requests_count: 0
  })
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Закрытие dropdown при клике вне
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Загрузка статистики пользователя
  useEffect(() => {
    if (user && isOpen) {
      loadUserStats()
    }
  }, [user, isOpen])

  const loadUserStats = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Основные параллельные запросы для статистики
      const basicRequests = [
        supabase
          .from('buildings')
          .select('id', { count: 'exact' })
          .eq('created_by', user.id),
        supabase
          .from('building_reviews')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('user_route_favorites')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('routes')
          .select('id', { count: 'exact' })
          .eq('created_by', user.id),
        supabase
          .from('collections')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
      ]

      // Отдельно считаем реакции на блоги с фильтрацией по опубликованным постам
      const [likedBlogsRes, savedBlogsRes] = await Promise.all([
        // Лайки на опубликованные посты
        (async () => {
          const { data: reactions } = await supabase
            .from('blog_post_reactions')
            .select('post_id')
            .eq('user_id', user.id)
            .eq('reaction_type', 'like')

          if (!reactions || reactions.length === 0) {
            return { count: 0 }
          }

          const postIds = reactions.map(r => r.post_id)
          const { count } = await supabase
            .from('blog_posts')
            .select('id', { count: 'exact', head: true })
            .in('id', postIds)
            .eq('status', 'published')

          return { count }
        })(),
        // Сохраненные посты
        (async () => {
          const { data: reactions } = await supabase
            .from('blog_post_reactions')
            .select('post_id')
            .eq('user_id', user.id)
            .eq('reaction_type', 'save')

          if (!reactions || reactions.length === 0) {
            return { count: 0 }
          }

          const postIds = reactions.map(r => r.post_id)
          const { count } = await supabase
            .from('blog_posts')
            .select('id', { count: 'exact', head: true })
            .in('id', postIds)
            .eq('status', 'published')

          return { count }
        })()
      ])

      // Добавляем запрос для модераторов
      const isModerator = profile && ['moderator', 'admin'].includes(profile.role || '')
      if (isModerator) {
        basicRequests.push(
          supabase
            .from('route_publication_requests')
            .select('id', { count: 'exact' })
            .eq('status', 'pending')
        )
      }

      const results = await Promise.all(basicRequests)
      const [buildingsRes, reviewsRes, favoritesRes, routesRes, collectionsRes, pendingRequestsRes] = results

      setStats({
        buildings_count: buildingsRes.count || 0,
        reviews_count: reviewsRes.count || 0,
        favorites_count: favoritesRes.count || 0,
        routes_count: routesRes.count || 0,
        collections_count: collectionsRes.count || 0,
        liked_blogs_count: likedBlogsRes.count || 0,
        saved_blogs_count: savedBlogsRes.count || 0,
        pending_requests_count: isModerator ? (pendingRequestsRes?.count || 0) : undefined
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user || !profile) return null

  const displayName = profile.display_name || profile.full_name || user.user_metadata?.full_name || 'Пользователь'
  const avatar = profile.avatar_url || user.user_metadata?.avatar_url

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'guest': 'Гость',
      'explorer': 'Исследователь', 
      'guide': 'Гид',
      'expert': 'Эксперт',
      'moderator': 'Модератор',
      'admin': 'Администратор'
    }
    return roleNames[role as keyof typeof roleNames] || 'Исследователь'
  }

  const getRoleColor = (role: string) => {
    const roleColors = {
      'guest': 'text-gray-500',
      'explorer': 'text-blue-600',
      'guide': 'text-green-600', 
      'expert': 'text-purple-600',
      'moderator': 'text-red-600',
      'admin': 'text-red-800 font-bold'
    }
    return roleColors[role as keyof typeof roleColors] || 'text-blue-600'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {/* Аватар */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
          {avatar ? (
            <img 
              src={avatar} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-medium text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Информация о пользователе (только на десктопе) */}
        <div className="hidden sm:block">
          <div className="text-sm font-medium text-gray-900 truncate max-w-32">
            {displayName}
          </div>
          <div className={`text-xs capitalize ${getRoleColor(profile.role || 'explorer')}`}>
            {getRoleDisplayName(profile.role || 'explorer')}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* Заголовок профиля */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 truncate">
                  {displayName}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {user.email}
                </div>
                <div className={`text-xs capitalize font-medium ${getRoleColor(profile.role || 'explorer')}`}>
                  {getRoleDisplayName(profile.role || 'explorer')}
                </div>
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Зданий:</span>
                <span className="font-medium">
                  {loading ? '...' : stats.buildings_count}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Маршрутов:</span>
                <span className="font-medium">
                  {loading ? '...' : stats.routes_count}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">Обзоров:</span>
                <span className="font-medium">
                  {loading ? '...' : stats.reviews_count}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-600" />
                <span className="text-gray-600">Избранное:</span>
                <span className="font-medium">
                  {loading ? '...' : stats.favorites_count}
                </span>
              </div>
            </div>
          </div>

          {/* Навигационное меню */}
          <div className="py-2">
            <a
              href="/profile"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              <span>Мой профиль</span>
            </a>
            
            <a
              href="/profile/edit"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Edit3 className="w-4 h-4" />
              <span>Редактировать профиль</span>
            </a>

            <a
              href="/profile/buildings"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Building2 className="w-4 h-4" />
              <span>Объекты</span>
              {stats.buildings_count > 0 && (
                <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  {stats.buildings_count}
                </span>
              )}
            </a>

            <a
              href="/profile/reviews"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Star className="w-4 h-4" />
              <span>Мои обзоры</span>
              {stats.reviews_count > 0 && (
                <span className="ml-auto text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  {stats.reviews_count}
                </span>
              )}
            </a>

            <a
              href="/profile/favorite-routes"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="w-4 h-4" />
              <span>Избранные маршруты</span>
              {stats.favorites_count > 0 && (
                <span className="ml-auto text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  {stats.favorites_count}
                </span>
              )}
            </a>

            <a
              href="/collections"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <BookOpen className="w-4 h-4" />
              <span>Мои коллекции</span>
              {stats.collections_count > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {stats.collections_count}
                </span>
              )}
            </a>

            <a
              href="/profile/routes"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <MapPin className="w-4 h-4" />
              <span>Мои маршруты</span>
              {stats.routes_count > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {stats.routes_count}
                </span>
              )}
            </a>

            <a
              href="/profile/liked-blogs"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="w-4 h-4" />
              <span>Избранные блоги</span>
              {stats.liked_blogs_count > 0 && (
                <span className="ml-auto text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  {stats.liked_blogs_count}
                </span>
              )}
            </a>

            <a
              href="/profile/saved-blogs"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <BookOpen className="w-4 h-4" />
              <span>Сохраненные блоги</span>
              {stats.saved_blogs_count > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {stats.saved_blogs_count}
                </span>
              )}
            </a>

            <a
              href="/profile/settings"
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              <span>Настройки</span>
            </a>
            
            {/* Модерация для модераторов и админов */}
            {profile && ['moderator', 'admin'].includes(profile.role || '') && (
              <>
                <a
                  href="/admin/moderation"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors border-t"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>Модерация</span>
                  {(stats.pending_requests_count || 0) > 0 && (
                    <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                      {loading ? '...' : stats.pending_requests_count}
                    </span>
                  )}
                </a>
                <a
                  href="/admin/autogeneration"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Bot className="w-4 h-4" />
                  <span>Автогенерация</span>
                </a>
                {profile.role === 'admin' && (
                  <a
                    href="/admin/users"
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    <span>Управление пользователями</span>
                  </a>
                )}
                
                {/* Панель модерации для модераторов и админов */}
                {(profile.role === 'moderator' || profile.role === 'admin') && (
                  <a
                    href="/admin/moderation"
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Модерация контента</span>
                  </a>
                )}
              </>
            )}
            
            {/* Управление контентом для авторов и выше */}
            {profile && ['author', 'guide', 'expert', 'editor', 'moderator', 'admin'].includes(profile.role || '') && (
              <a
                href="/admin/news"
                className="flex items-center space-x-3 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Управление новостями</span>
              </a>
            )}
          </div>

          {/* Кнопка выхода */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
