'use client'

import { useState, useEffect, useMemo } from 'react'
import { BuildingReviewWithProfile } from '@/types/building'
import { Star, Headphones, CheckCircle, Award, Calendar, ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import AudioPlayer from '../AudioPlayer'
import ImageLightbox from '../ui/ImageLightbox'

interface BuildingReviewsListProps {
  reviews: BuildingReviewWithProfile[]
  buildingId: string
  onOpenAddReview?: () => void
}

export default function BuildingReviewsList({ 
  reviews, 
  buildingId,
  onOpenAddReview 
}: BuildingReviewsListProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set())
  const [hoveredRating, setHoveredRating] = useState<{reviewId: string, rating: number} | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Загрузка оценок пользователя
  useEffect(() => {
    if (user && reviews.length > 0) {
      loadUserRatings()
      loadHelpfulVotes()
    }
  }, [user, reviews])

  const loadUserRatings = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('building_review_ratings')
        .select('review_id, rating')
        .eq('user_id', user.id)
        .in('review_id', reviews.map(r => r.id))
      
      if (data) {
        const ratingsMap = new Map(data.map(r => [r.review_id, r.rating]))
        setUserRatings(ratingsMap)
      }
    } catch (error) {
      console.error('Error loading user ratings:', error)
    }
  }

  const loadHelpfulVotes = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('review_helpful_votes')
        .select('review_id')
        .eq('user_id', user.id)
        .in('review_id', reviews.map(r => r.id))
      
      if (data) {
        setHelpfulVotes(new Set(data.map(v => v.review_id)))
      }
    } catch (error) {
      console.error('Error loading helpful votes:', error)
    }
  }

  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) {
      toast.error('Sign in to rate this review')
      return
    }

    try {
      // Upsert рейтинга
      await supabase
        .from('building_review_ratings')
        .upsert({
          review_id: reviewId,
          user_id: user.id,
          rating: rating
        }, {
          onConflict: 'review_id,user_id'
        })

      setUserRatings(prev => new Map(prev).set(reviewId, rating))
      toast.success(`⭐ Rating ${rating}/5 saved!`)
    } catch (error) {
      console.error('Error rating review:', error)
      toast.error('Error saving rating')
    }
  }

  const openLightbox = (photos: string[], index: number) => {
    setLightboxImages(photos.map(p => getStorageUrl(p, 'photos')))
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const handleToggleHelpful = async (reviewId: string) => {
    if (!user) {
      toast.error('Sign in to rate')
      return
    }

    try {
      const isHelpful = helpfulVotes.has(reviewId)

      if (isHelpful) {
        await supabase
          .from('review_helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id)

        setHelpfulVotes(prev => {
          const newSet = new Set(prev)
          newSet.delete(reviewId)
          return newSet
        })
      } else {
        await supabase
          .from('review_helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: user.id
          })

        setHelpfulVotes(prev => new Set(prev).add(reviewId))
        toast.success('👍 Marked as helpful!')
      }
    } catch (error) {
      console.error('Error toggling helpful:', error)
      toast.error('Error')
    }
  }

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  // Проверка на "Полный обзор"
  const isFullReview = (review: BuildingReviewWithProfile) => {
    return !!(
      review.content && review.content.length >= 200 &&
      review.photos && Array.isArray(review.photos) && review.photos.length >= 2 &&
      review.audio_url
    )
  }

  const handleAddReviewClick = () => {
    if (!user) {
      toast.error('Sign in to add a review')
      return
    }
    onOpenAddReview?.()
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 md:py-12">
        <p className="text-gray-500 mb-4 text-sm md:text-base">📭 No reviews yet</p>
        {onOpenAddReview && (
          <button
            onClick={handleAddReviewClick}
            className="px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!user}
            title={!user ? 'Sign in to add a review' : ''}
          >
            ✍️ Write the first review
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Список обзоров */}
      {reviews.map(review => {
        const isExpanded = expandedReviews.has(review.id)
        const userRating = userRatings.get(review.id) || 0
        const avgRating = review.user_rating_avg || 0
        const ratingCount = review.user_rating_count || 0

        return (
          <div
            key={review.id}
            className="border border-gray-200 rounded-lg p-3 md:p-6 hover:border-blue-300 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center space-x-2 md:space-x-3">
                {/* Аватар */}
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm md:text-base">
                  {review.profiles?.avatar_url ? (
                    <img
                      src={getStorageUrl(review.profiles.avatar_url, 'avatars')}
                      alt={review.profiles.full_name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{review.profiles?.full_name?.[0] || review.profiles?.username?.[0] || '?'}</span>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-gray-900 text-sm md:text-base">
                    {review.profiles?.full_name || review.profiles?.username || 'User'}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 space-x-1 md:space-x-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(review.created_at).toLocaleDateString('en-US')}</span>
                  </div>
                </div>
              </div>

              {/* Бейджи */}
              <div className="flex flex-wrap gap-1 md:gap-2">
                {isFullReview(review) && (
                  <span className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold border border-yellow-300">
                    ⭐ FULL
                  </span>
                )}

                {review.audio_url && (
                  <span className="flex items-center bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                    <Headphones className="w-3 h-3 mr-1" />
                    Audio
                  </span>
                )}

                {review.is_verified && (
                  <span className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                )}

                {review.review_type === 'expert' && (
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                    👨‍🎓 Expert
                  </span>
                )}
              </div>
            </div>

            {/* Заголовок */}
            {review.title && (
              <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">
                {review.title}
              </h3>
            )}

            {/* Средний рейтинг от пользователей */}
            {ratingCount > 0 && (
              <div className="flex items-center mb-2 md:mb-3 bg-yellow-50 px-2 py-1.5 md:px-3 md:py-2 rounded-lg">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400 mr-1.5 md:mr-2" />
                <span className="font-semibold text-gray-900 text-sm md:text-base">{avgRating.toFixed(1)}</span>
                <span className="text-xs md:text-sm text-gray-600 ml-1.5 md:ml-2">({ratingCount} ratings)</span>
              </div>
            )}

            {/* Превью или полный текст */}
            {review.content && (
              <div className="mb-4">
                <p className={`text-gray-700 leading-relaxed whitespace-pre-line ${
                  !isExpanded && review.content.length > 300 ? 'line-clamp-4' : ''
                }`}>
                  {review.content}
                </p>
                
                {review.content.length > 300 && (
                  <button
                    onClick={() => toggleExpanded(review.id)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Теги */}
            {review.tags && review.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {review.tags.map((tag, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Фото галерея */}
            {review.photos && review.photos.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {review.photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => openLightbox(review.photos!, idx)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                    >
                      <img
                        src={getStorageUrl(photo, 'photos')}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Аудио плеер - показываем всегда если есть аудио */}
            {review.audio_url && (
              <div className="mb-4">
                <AudioPlayer
                  audioUrl={getStorageUrl(review.audio_url, 'audio')}
                  duration={review.audio_duration_seconds}
                />
              </div>
            )}

            {/* Оценка обзора пользователем */}
            <div className="border-t border-gray-100 pt-3 md:pt-4 mt-3 md:mt-4">
              <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3">
                {/* Оценка звездами */}
                <div>
                  <p className="text-xs text-gray-600 mb-1.5 md:mb-2">Rate this review:</p>
                  <div className="flex items-center space-x-0.5 md:space-x-1">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isActive = userRating >= star || (hoveredRating?.reviewId === review.id && hoveredRating.rating >= star)

                      return (
                        <button
                          key={star}
                          onClick={() => handleRateReview(review.id, star)}
                          onMouseEnter={() => setHoveredRating({ reviewId: review.id, rating: star })}
                          onMouseLeave={() => setHoveredRating(null)}
                          className="p-0.5 transition-transform hover:scale-110"
                          title={`Rate ${star}/5`}
                        >
                          <Star
                            className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${
                              isActive
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      )
                    })}
                    {userRating > 0 && (
                      <span className="ml-1.5 md:ml-2 text-xs md:text-sm text-gray-600">
                        Your rating: {userRating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Кнопка "Полезно" */}
                <button
                  onClick={() => handleToggleHelpful(review.id)}
                  className={`flex items-center px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all text-xs md:text-sm ${
                    helpfulVotes.has(review.id)
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className={`w-3 h-3 md:w-4 md:h-4 mr-1 ${helpfulVotes.has(review.id) ? 'fill-current' : ''}`} />
                  <span>
                    {helpfulVotes.has(review.id) ? 'Helpful' : 'Helpful?'} ({review.helpful_count})
                  </span>
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Кнопка добавить обзор внизу */}
      {onOpenAddReview && (
        <button
          onClick={handleAddReviewClick}
          className="w-full py-2 md:py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          disabled={!user}
          title={!user ? 'Sign in to add a review' : ''}
        >
          ✍️ Add Review
        </button>
      )}

      {/* Lightbox для просмотра фото */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  )
}

