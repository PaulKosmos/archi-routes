'use client'

import { useState, useEffect, useMemo } from 'react'
import { BuildingReviewWithProfile } from '@/types/building'
import { Star, Headphones, CheckCircle, Award, Calendar, Pencil, Globe, MessageSquare } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import ImageLightbox from '../ui/ImageLightbox'
import ReviewCommentsModal from './ReviewCommentsModal'
import ReviewTranslationTabs from './ReviewTranslationTabs'
import Link from 'next/link'

interface BuildingReviewsListProps {
  reviews: BuildingReviewWithProfile[]
  buildingId: string
  onOpenAddReview?: () => void
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 English',
  ru: '🇷🇺 Русский',
  de: '🇩🇪 Deutsch',
  fr: '🇫🇷 Français',
  es: '🇪🇸 Español',
  it: '🇮🇹 Italiano',
  uz: '🇺🇿 Oʻzbek',
  tr: '🇹🇷 Türkçe',
  ja: '🇯🇵 日本語',
  ko: '🇰🇷 한국어',
  zh: '🇨🇳 中文',
  pt: '🇵🇹 Português',
  ar: '🇸🇦 العربية',
}

export default function BuildingReviewsList({
  reviews,
  buildingId,
  onOpenAddReview
}: BuildingReviewsListProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [hoveredRating, setHoveredRating] = useState<{ reviewId: string, rating: number } | null>(null)
  const [localReviews, setLocalReviews] = useState<BuildingReviewWithProfile[]>(reviews)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  // displayLanguage: which translation language to show in all cards ('all' = original)
  const [displayLanguage, setDisplayLanguage] = useState<string>('all')
  const [commentsModalReview, setCommentsModalReview] = useState<{
    id: string; title: string; author: string
  } | null>(null)
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map())

  // All reviews shown — language selector now controls which translation to display
  const filteredReviews = localReviews

  // Sync localReviews when reviews prop changes
  useEffect(() => {
    setLocalReviews(reviews)
  }, [reviews])

  // Загрузка количества комментариев
  useEffect(() => {
    if (reviews.length === 0) return
    loadCommentCounts(reviews.map(r => r.id))
  }, [reviews])

  const loadCommentCounts = async (reviewIds: string[]) => {
    if (reviewIds.length === 0) return
    const { data } = await supabase
      .from('building_review_comments')
      .select('review_id')
      .in('review_id', reviewIds)
    if (!data) return
    const counts = new Map<string, number>()
    data.forEach(c => counts.set(c.review_id, (counts.get(c.review_id) || 0) + 1))
    setCommentCounts(counts)
  }

  // Загрузка оценок пользователя
  useEffect(() => {
    if (user && reviews.length > 0) {
      loadUserRatings()
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

  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) {
      toast.error('Sign in to rate this review')
      return
    }

    try {
      // Check if user already has a rating for this review
      const existingRating = userRatings.get(reviewId)

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from('building_review_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('review_id', reviewId)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error updating review rating:', error.message, error.code, error.details)
          toast.error(`Error saving rating: ${error.message}`)
          return
        }
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('building_review_ratings')
          .insert({
            review_id: reviewId,
            user_id: user.id,
            rating
          })

        if (error) {
          console.error('Error inserting review rating:', error.message, error.code, error.details)
          toast.error(`Error saving rating: ${error.message}`)
          return
        }
      }

      const oldRating = userRatings.get(reviewId)
      setUserRatings(prev => new Map(prev).set(reviewId, rating))

      // Update local review's avg/count to reflect immediately in UI
      setLocalReviews(prev => prev.map(r => {
        if (r.id !== reviewId) return r
        const oldAvg = r.user_rating_avg || 0
        const oldCount = r.user_rating_count || 0
        let newCount: number
        let newAvg: number
        if (oldRating) {
          // Updating existing rating
          newCount = oldCount
          newAvg = oldCount > 0 ? (oldAvg * oldCount - oldRating + rating) / oldCount : rating
        } else {
          // New rating
          newCount = oldCount + 1
          newAvg = (oldAvg * oldCount + rating) / newCount
        }
        return { ...r, user_rating_avg: newAvg, user_rating_count: newCount }
      }))

      toast.success(`Rating ${rating}/5 saved!`)
    } catch (error: any) {
      console.error('Error rating review:', error?.message || JSON.stringify(error))
      toast.error('Error saving rating')
    }
  }

  const openLightbox = (photos: string[], index: number) => {
    setLightboxImages(photos.map(p => getStorageUrl(p, 'photos')))
    setLightboxIndex(index)
    setIsLightboxOpen(true)
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
      {/* Display language selector — controls which translation to show in all cards */}
      <div className="flex items-center justify-end gap-2 pb-1">
        <Globe className="w-4 h-4 text-gray-400" />
        <select
          value={displayLanguage}
          onChange={(e) => setDisplayLanguage(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer appearance-none pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
        >
          <option value="all">Original language</option>
          {(['en','de','es','fr','zh','ar','ru'] as const).map(lang => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Reviews list */}
      {filteredReviews.map(review => {
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
                      alt={review.profiles.display_name || review.profiles.full_name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{review.profiles?.display_name?.[0] || review.profiles?.full_name?.[0] || review.profiles?.username?.[0] || '?'}</span>
                  )}
                </div>

                <div>
                  {review.profiles?.username ? (
                    <Link
                      href={`/user/${review.profiles.username}`}
                      className="font-semibold text-gray-900 text-sm md:text-base hover:text-primary hover:underline transition-colors"
                    >
                      {review.profiles?.display_name || review.profiles?.full_name || review.profiles?.username || 'User'}
                    </Link>
                  ) : (
                    <p className="font-semibold text-gray-900 text-sm md:text-base">
                      {review.profiles?.display_name || review.profiles?.full_name || 'User'}
                    </p>
                  )}
                  <div className="flex items-center flex-wrap gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(review.created_at).toLocaleDateString('en-US')}</span>
                    {review.language && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        {review.language === 'ru' ? '🇷🇺' :
                          review.language === 'de' ? '🇩🇪' :
                            review.language === 'es' ? '🇪🇸' :
                              review.language === 'fr' ? '🇫🇷' : '🇬🇧'} {review.language.toUpperCase()}
                      </span>
                    )}
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

                {/* Edit button for author/admin */}
                {user && (user.id === review.user_id || profile?.role === 'admin' || profile?.role === 'moderator') && (
                  <Link
                    href={`/buildings/${buildingId}/review/${review.id}/edit`}
                    className="flex items-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                    title="Edit review"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Средний рейтинг от пользователей */}
            {ratingCount > 0 && (
              <div className="flex items-center mb-2 md:mb-3 bg-yellow-50 px-2 py-1.5 md:px-3 md:py-2 rounded-lg">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400 mr-1.5 md:mr-2" />
                <span className="font-semibold text-gray-900 text-sm md:text-base">{avgRating.toFixed(1)}</span>
                <span className="text-xs md:text-sm text-gray-600 ml-1.5 md:ml-2">({ratingCount} ratings)</span>
              </div>
            )}

            {/* Title + content + language switcher (managed together) */}
            <ReviewTranslationTabs
              reviewId={review.id}
              originalLanguage={review.original_language || review.language || 'en'}
              originalTitle={review.title}
              originalContent={review.content || ''}
              originalAudioUrl={review.audio_url}
              preferredLanguage={displayLanguage}
              isExpanded={isExpanded}
              onToggleExpand={() => toggleExpanded(review.id)}
            />

            {/* Теги */}
            {review.tags && review.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 mt-3">
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
                            className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${isActive
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

                {/* Comments button */}
                <button
                  onClick={() => setCommentsModalReview({
                    id: review.id,
                    title: review.title || 'Review',
                    author: review.profiles?.display_name || review.profiles?.full_name || review.profiles?.username || 'Author'
                  })}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {commentCounts.get(review.id)
                    ? `Comments (${commentCounts.get(review.id)})`
                    : 'Comments'}
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

      {/* Comments modal */}
      {commentsModalReview && (
        <ReviewCommentsModal
          isOpen={!!commentsModalReview}
          onClose={() => {
            const reviewId = commentsModalReview.id
            setCommentsModalReview(null)
            loadCommentCounts([reviewId])
          }}
          reviewId={commentsModalReview.id}
          reviewTitle={commentsModalReview.title}
          reviewAuthor={commentsModalReview.author}
        />
      )}
    </div>
  )
}

