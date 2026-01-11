// src/components/RouteFavoriteButton.tsx
// Компонент кнопки избранного для маршрутов

'use client'

import { useState, useEffect } from 'react'
import { Heart, Check, Loader2 } from 'lucide-react'
import { UserRouteFavorites } from '@/lib/smart-route-filtering'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
// import { toast } from '@/lib/toast-fallback'

interface RouteFavoriteButtonProps {
  routeId: string
  routeTitle: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'button' | 'icon'
  showText?: boolean
}

export default function RouteFavoriteButton({
  routeId,
  routeTitle,
  size = 'md',
  variant = 'button',
  showText = true
}: RouteFavoriteButtonProps) {
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // Размеры для разных вариантов
  const sizes = {
    sm: { icon: 'w-4 h-4', padding: 'px-3 py-1.5', text: 'text-sm' },
    md: { icon: 'w-5 h-5', padding: 'px-4 py-2', text: 'text-base' },
    lg: { icon: 'w-6 h-6', padding: 'px-6 py-3', text: 'text-lg' }
  }

  const currentSize = sizes[size]

  useEffect(() => {
    checkFavoriteStatus()
  }, [routeId, user])

  const checkFavoriteStatus = async () => {
    if (!user || !routeId) {
      setIsChecking(false)
      return
    }

    try {
      const favorite = await UserRouteFavorites.isFavorite(user.id, routeId)
      setIsFavorite(favorite)
    } catch (error) {
      console.error('Error checking favorite status:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Sign in to add to favorites')
      return
    }

    setIsLoading(true)

    try {
      if (isFavorite) {
        // Удаляем из избранного
        const success = await UserRouteFavorites.removeFromFavorites(user.id, routeId)
        if (success) {
          setIsFavorite(false)
          toast.success('Route removed from favorites')
        } else {
          toast.error('Error removing from favorites')
        }
      } else {
        // Добавляем в избранное
        const success = await UserRouteFavorites.addToFavorites(user.id, routeId)
        if (success) {
          setIsFavorite(true)
          toast.success(`"${routeTitle}" added to favorites!`)
        } else {
          toast.error('Error adding to favorites')
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className={`text-gray-400 ${currentSize.text} ${currentSize.padding}`}>
        <div className="flex items-center gap-2">
          <Heart className={currentSize.icon} />
          {showText && <span>Sign in for favorites</span>}
        </div>
      </div>
    )
  }

  if (isChecking) {
    return (
      <div className={`text-gray-400 ${currentSize.text} ${currentSize.padding}`}>
        <div className="flex items-center gap-2">
          <Loader2 className={`${currentSize.icon} animate-spin`} />
          {showText && <span>Checking...</span>}
        </div>
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleFavorite}
        disabled={isLoading}
        className={`
          inline-flex items-center justify-center
          ${currentSize.padding}
          rounded-full
          transition-all duration-200
          ${isFavorite
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
        `}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isLoading ? (
          <Loader2 className={`${currentSize.icon} animate-spin`} />
        ) : (
          <Heart
            className={`${currentSize.icon} transition-all duration-200 ${isFavorite ? 'fill-current' : ''
              }`}
          />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 
        ${currentSize.padding} ${currentSize.text}
        font-medium rounded-xl 
        transition-all duration-200
        ${isFavorite
          ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100'
          : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        shadow-sm hover:shadow-md
      `}
    >
      {isLoading ? (
        <Loader2 className={`${currentSize.icon} animate-spin`} />
      ) : (
        <Heart
          className={`${currentSize.icon} transition-all duration-200 ${isFavorite ? 'fill-current' : ''
            }`}
        />
      )}

      {showText && (
        <span>
          {isFavorite ? 'In Favorites' : 'Add to Favorites'}
        </span>
      )}
    </button>
  )
}

// Компонент для отметки маршрута как пройденного
export function RouteCompletedButton({
  routeId,
  routeTitle,
  size = 'md'
}: {
  routeId: string
  routeTitle: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const { user } = useAuth()
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [notes, setNotes] = useState('')

  const sizes = {
    sm: { icon: 'w-4 h-4', padding: 'px-3 py-1.5', text: 'text-sm' },
    md: { icon: 'w-5 h-5', padding: 'px-4 py-2', text: 'text-base' },
    lg: { icon: 'w-6 h-6', padding: 'px-6 py-3', text: 'text-lg' }
  }

  const currentSize = sizes[size]

  const handleMarkCompleted = async () => {
    if (!user) {
      toast.error('Please log in')
      return
    }

    setShowRatingModal(true)
  }

  const handleSubmitCompletion = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const success = await UserRouteFavorites.markAsCompleted(
        user.id,
        routeId,
        rating,
        notes
      )

      if (success) {
        setIsCompleted(true)
        setShowRatingModal(false)
        toast.success('Route marked as completed!')
      } else {
        toast.error('Error saving')
      }
    } catch (error) {
      console.error('Error marking as completed:', error)
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <>
      <button
        onClick={handleMarkCompleted}
        disabled={isLoading || isCompleted}
        className={`
          inline-flex items-center gap-2 
          ${currentSize.padding} ${currentSize.text}
          font-medium rounded-xl 
          transition-all duration-200
          ${isCompleted
            ? 'bg-green-50 text-green-600 border-2 border-green-200'
            : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          shadow-sm hover:shadow-md
        `}
      >
        {isLoading ? (
          <Loader2 className={`${currentSize.icon} animate-spin`} />
        ) : (
          <Check className={currentSize.icon} />
        )}
        <span>
          {isCompleted ? 'Пройден' : 'Отметить как пройденный'}
        </span>
      </button>

      {/* Модальное окно для оценки */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Оцените маршрут "{routeTitle}"
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ваша оценка:
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заметки (необязательно):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Your impressions of the route..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitCompletion}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
