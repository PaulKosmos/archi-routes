// components/LikeButton.tsx
// Универсальная кнопка "Лайк" для всех типов контента

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ============================================================
// ТИПЫ
// ============================================================

type ContentType = 'blog' | 'news' | 'route' | 'building'

interface LikeButtonProps {
  type: ContentType
  itemId: string
  initialLiked?: boolean
  initialCount?: number
  variant?: 'default' | 'compact'
  showCount?: boolean
  className?: string
  onLikeChange?: (liked: boolean, count: number) => void
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function LikeButton({
  type,
  itemId,
  initialLiked = false,
  initialCount = 0,
  variant = 'default',
  showCount = true,
  className = '',
  onLikeChange
}: LikeButtonProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()

  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Загружает текущий статус лайка и счетчик
   */
  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!user) {
        setIsLiked(false)
        return
      }

      try {
        // Проверяем, лайкнул ли пользователь
        const userLiked = await checkUserLiked()
        setIsLiked(userLiked)

        // Загружаем общее количество лайков
        const count = await getLikeCount()
        setLikeCount(count)
      } catch (error) {
        console.error('Error loading like status:', error)
      }
    }

    loadLikeStatus()
  }, [user, itemId, type])

  /**
   * Проверяет, лайкнул ли текущий пользователь
   */
  const checkUserLiked = async (): Promise<boolean> => {
    if (!user) return false

    try {
      switch (type) {
        case 'blog': {
          const { data } = await supabase
            .from('blog_post_reactions')
            .select('id')
            .eq('post_id', itemId)
            .eq('user_id', user.id)
            .eq('reaction_type', 'like')
            .maybeSingle()
          return !!data
        }
        case 'news': {
          const { data } = await supabase
            .from('news_reactions')
            .select('id')
            .eq('news_id', itemId)
            .eq('user_id', user.id)
            .eq('reaction_type', 'like')
            .maybeSingle()
          return !!data
        }
        case 'route': {
          const { data } = await supabase
            .from('user_route_favorites')
            .select('id')
            .eq('route_id', itemId)
            .eq('user_id', user.id)
            .maybeSingle()
          return !!data
        }
        case 'building': {
          const { data } = await supabase
            .from('building_favorites')
            .select('id')
            .eq('building_id', itemId)
            .eq('user_id', user.id)
            .maybeSingle()
          return !!data
        }
        default:
          return false
      }
    } catch (error) {
      console.error('Error checking user liked:', error)
      return false
    }
  }

  /**
   * Получает общее количество лайков
   */
  const getLikeCount = async (): Promise<number> => {
    try {
      switch (type) {
        case 'blog': {
          const { count } = await supabase
            .from('blog_post_reactions')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', itemId)
            .eq('reaction_type', 'like')
          return count || 0
        }
        case 'news': {
          const { count } = await supabase
            .from('news_reactions')
            .select('id', { count: 'exact', head: true })
            .eq('news_id', itemId)
            .eq('reaction_type', 'like')
          return count || 0
        }
        case 'route': {
          const { count } = await supabase
            .from('user_route_favorites')
            .select('id', { count: 'exact', head: true })
            .eq('route_id', itemId)
          return count || 0
        }
        case 'building': {
          const { count } = await supabase
            .from('building_favorites')
            .select('id', { count: 'exact', head: true })
            .eq('building_id', itemId)
          return count || 0
        }
        default:
          return 0
      }
    } catch (error) {
      console.error('Error getting like count:', error)
      return 0
    }
  }

  /**
   * Добавляет лайк
   */
  const addLike = async () => {
    if (!user) return

    try {
      switch (type) {
        case 'blog':
          await supabase.from('blog_post_reactions').insert({
            post_id: itemId,
            user_id: user.id,
            reaction_type: 'like'
          })
          break
        case 'news':
          await supabase.from('news_reactions').insert({
            news_id: itemId,
            user_id: user.id,
            reaction_type: 'like'
          })
          break
        case 'route':
          await supabase.from('user_route_favorites').insert({
            route_id: itemId,
            user_id: user.id
          })
          break
        case 'building':
          await supabase.from('building_favorites').insert({
            building_id: itemId,
            user_id: user.id
          })
          break
      }
    } catch (error) {
      console.error('Error adding like:', error)
      throw error
    }
  }

  /**
   * Удаляет лайк
   */
  const removeLike = async () => {
    if (!user) return

    try {
      switch (type) {
        case 'blog':
          await supabase
            .from('blog_post_reactions')
            .delete()
            .eq('post_id', itemId)
            .eq('user_id', user.id)
            .eq('reaction_type', 'like')
          break
        case 'news':
          await supabase
            .from('news_reactions')
            .delete()
            .eq('news_id', itemId)
            .eq('user_id', user.id)
            .eq('reaction_type', 'like')
          break
        case 'route':
          await supabase
            .from('user_route_favorites')
            .delete()
            .eq('route_id', itemId)
            .eq('user_id', user.id)
          break
        case 'building':
          await supabase
            .from('building_favorites')
            .delete()
            .eq('building_id', itemId)
            .eq('user_id', user.id)
          break
      }
    } catch (error) {
      console.error('Error removing like:', error)
      throw error
    }
  }

  /**
   * Переключает лайк
   */
  const toggleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      alert('Please log in to like')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    try {
      if (isLiked) {
        // Убираем лайк
        await removeLike()
        setIsLiked(false)
        const newCount = Math.max(0, likeCount - 1)
        setLikeCount(newCount)
        onLikeChange?.(false, newCount)
      } else {
        // Ставим лайк
        await addLike()
        setIsLiked(true)
        const newCount = likeCount + 1
        setLikeCount(newCount)
        onLikeChange?.(true, newCount)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      // Откатываем изменения при ошибке
      const currentStatus = await checkUserLiked()
      setIsLiked(currentStatus)
      const currentCount = await getLikeCount()
      setLikeCount(currentCount)
    } finally {
      setIsLoading(false)
    }
  }, [user, isLiked, likeCount, isLoading, type, itemId])

  // Compact вариант (только иконка с счетчиком)
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleLike}
        disabled={isLoading || !user}
        className={`inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={`h-4 w-4 transition-all ${isLiked ? 'fill-primary text-primary' : ''
            }`}
        />
        {showCount && <span className="text-xs">{likeCount}</span>}
      </button>
    )
  }

  // Default вариант (полноценная кнопка)
  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={isLoading || !user}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isLiked
        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
        : 'bg-card text-card-foreground border-2 border-border hover:border-primary hover:bg-accent'
        } ${className}`}
      title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`h-5 w-5 transition-all ${isLiked ? 'fill-current' : ''
          }`}
      />
      <span>{isLiked ? 'В избранном' : 'Нравится'}</span>
      {showCount && likeCount > 0 && (
        <span className="text-sm font-semibold">{likeCount}</span>
      )}
    </button>
  )
}
