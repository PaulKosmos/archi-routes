'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
  User,
  Edit3,
  MapPin,
  Heart,
  Settings,
  LogOut,
  Building2,
  MessageSquare,
  BookOpen,
  Shield,
  Folder,
  Users
} from 'lucide-react'

interface UserStats {
  buildings_count: number
  reviews_count: number
  favorites_count: number
  routes_count: number
  collections_count: number
  articles_count: number
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
    articles_count: 0,
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
  const loadUserStats = useCallback(async () => {
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
          .from('routes')
          .select('id', { count: 'exact' })
          .eq('created_by', user.id),
        supabase
          .from('user_collections')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('blog_posts')
          .select('id', { count: 'exact' })
          .eq('author_id', user.id)
      ]

      // Считаем общее избранное (лайки из всех источников)
      const [blogLikesRes, newsLikesRes, routeFavoritesRes, buildingFavoritesRes] = await Promise.all([
        supabase
          .from('blog_post_reactions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('reaction_type', 'like'),
        supabase
          .from('news_reactions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('reaction_type', 'like'),
        supabase
          .from('user_route_favorites')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('building_favorites')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
      ])

      const totalFavorites =
        (blogLikesRes.count || 0) +
        (newsLikesRes.count || 0) +
        (routeFavoritesRes.count || 0) +
        (buildingFavoritesRes.count || 0)

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
      const [buildingsRes, reviewsRes, routesRes, collectionsRes, articlesRes, pendingRequestsRes] = results

      setStats({
        buildings_count: buildingsRes.count || 0,
        reviews_count: reviewsRes.count || 0,
        favorites_count: totalFavorites,
        routes_count: routesRes.count || 0,
        collections_count: collectionsRes.count || 0,
        articles_count: articlesRes.count || 0,
        pending_requests_count: isModerator ? (pendingRequestsRes?.count || 0) : undefined
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    } finally {
      setLoading(false)
    }
  }, [user, profile, supabase])

  useEffect(() => {
    if (user && isOpen) {
      loadUserStats()
    }
  }, [user, isOpen, loadUserStats])

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user || !profile) return null

  const displayName = profile.display_name || profile.full_name || user.user_metadata?.full_name || 'User'
  const avatar = profile.avatar_url || user.user_metadata?.avatar_url

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center p-2 rounded-[var(--radius)] hover:bg-muted transition-colors"
        title={displayName}
      >
        {/* Аватар */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center ring-2 ring-border">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary-foreground font-medium text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-[var(--radius)] shadow-lg py-2 z-50">
          {/* Заголовок профиля */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary flex items-center justify-center ring-2 ring-border/50">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary-foreground font-medium text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">
                  {displayName}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {user.email}
                </div>
                <div className="text-xs text-primary font-medium mt-0.5">
                  {getRoleDisplayName(profile.role || 'explorer')}
                </div>
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Buildings:</span>
                <span className="font-metrics font-semibold text-foreground ml-auto">
                  {loading ? '...' : stats.buildings_count}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Routes:</span>
                <span className="font-metrics font-semibold text-foreground ml-auto">
                  {loading ? '...' : stats.routes_count}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Reviews:</span>
                <span className="font-metrics font-semibold text-foreground ml-auto">
                  {loading ? '...' : stats.reviews_count}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Favorites:</span>
                <span className="font-metrics font-semibold text-foreground ml-auto">
                  {loading ? '...' : stats.favorites_count}
                </span>
              </div>
            </div>
          </div>

          {/* Навигационное меню */}
          <div className="py-1">
            {/* Основные действия */}
            <a
              href="/profile"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4 text-muted-foreground" />
              <span>My Profile</span>
            </a>

            <a
              href="/profile/edit"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span>Edit Profile</span>
            </a>

            {/* Разделитель */}
            <div className="my-1 border-t border-border" />

            {/* Мой контент */}
            <a
              href="/profile/buildings"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <Building2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">My Buildings</span>
              {stats.buildings_count > 0 && (
                <span className="text-xs font-metrics text-muted-foreground">
                  {stats.buildings_count}
                </span>
              )}
            </a>

            <a
              href="/profile/routes"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <MapPin className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">My Routes</span>
              {stats.routes_count > 0 && (
                <span className="text-xs font-metrics text-muted-foreground">
                  {stats.routes_count}
                </span>
              )}
            </a>

            <a
              href="/profile/reviews"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">My Reviews</span>
              {stats.reviews_count > 0 && (
                <span className="text-xs font-metrics text-muted-foreground">
                  {stats.reviews_count}
                </span>
              )}
            </a>

            <a
              href="/profile/articles"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">My Blogs</span>
              {stats.articles_count > 0 && (
                <span className="text-xs font-metrics text-muted-foreground">
                  {stats.articles_count}
                </span>
              )}
            </a>

            {/* Разделитель */}
            <div className="my-1 border-t border-border" />

            {/* Избранное и коллекции */}
            <a
              href="/profile/favorites"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">Favorites</span>
              {stats.favorites_count > 0 && (
                <span className="text-xs font-metrics text-muted-foreground">
                  {stats.favorites_count}
                </span>
              )}
            </a>

            <a
              href="/profile/collections"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">Collections</span>
              {stats.collections_count > 0 && (
                <span className="text-xs font-metrics text-muted-foreground">
                  {stats.collections_count}
                </span>
              )}
            </a>

            <a
              href="/profile/following"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">Subscriptions</span>
            </a>

            {/* Разделитель */}
            <div className="my-1 border-t border-border" />

            {/* Настройки */}
            <a
              href="/profile/settings"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Settings</span>
            </a>

            {/* Админ панель для модераторов и админов */}
            {profile && ['moderator', 'admin'].includes(profile.role || '') && (
              <a
                href="/admin"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span>Admin Panel</span>
                {(stats.pending_requests_count || 0) > 0 && (
                  <span className="ml-auto text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                    {loading ? '...' : stats.pending_requests_count}
                  </span>
                )}
              </a>
            )}
          </div>

          {/* Кнопка выхода */}
          <div className="border-t border-border pt-1 mt-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left rounded-[var(--radius)]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
