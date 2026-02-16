// src/components/buildings/BuildingReviews.tsx - ИСПРАВЛЕН АУДИО ПЛЕЕР + КЛИКАБЕЛЬНЫЕ ФОТО

'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { BuildingReviewWithProfile } from '@/types/building'
import { Play, Pause, Volume2, VolumeX, Star, User, Calendar, Award, MessageSquare, Pencil, Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getStorageUrl } from '@/lib/storage'
import PhotoGallery from '@/components/ui/PhotoGallery'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface BuildingReviewsProps {
  reviews: BuildingReviewWithProfile[]
  buildingId: string
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  onReviewAdded: () => void
  onOpenAddReview?: () => void
}

interface AudioPlayerProps {
  audioUrl: string
  duration?: number
}

function AudioPlayer({ audioUrl, duration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Получаем полный URL для аудио из Supabase Storage
  const fullAudioUrl = getStorageUrl(audioUrl, 'audio')

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      console.log('⏰ Time update:', audio.currentTime, '/', audio.duration)
      setCurrentTime(audio.currentTime)
    }

    const updateDuration = () => {
      console.log('📏 Duration loaded:', audio.duration)
      setTotalDuration(audio.duration || 0)
      setIsLoading(false)
    }

    const handleEnded = () => {
      console.log('🔚 Audio ended')
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleLoadStart = () => {
      console.log('🔄 Audio loading started')
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      console.log('✅ Audio can play')
      setIsLoading(false)
    }

    const handleLoadedData = () => {
      console.log('📊 Audio data loaded, duration:', audio.duration)
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(audio.duration)
      }
      setIsLoading(false)
    }

    const handleError = (e: any) => {
      console.error('🎵 Audio loading error:', e)
      console.error('🎵 Audio error details:', {
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src
      })
      setHasError(true)
      setIsLoading(false)
    }

    // Добавляем все обработчики
    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)

    // Принудительно загружаем метаданные
    audio.load()

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
    }
  }, [fullAudioUrl])

  const togglePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
        console.log('⏸️ Audio paused')
      } else {
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
          console.log('▶️ Audio playing')
        }
      }
    } catch (error) {
      console.error('🎵 Audio play error:', error)
      setHasError(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio || !totalDuration) return

    const newTime = (Number(e.target.value) / 100) * totalDuration
    console.log('🎯 Seeking to:', newTime, 'of', totalDuration)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = Number(e.target.value) / 100
    audio.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = (seconds: number) => {
    console.log('⏰ Formatting time:', seconds, 'isNaN:', isNaN(seconds))
    if (isNaN(seconds) || seconds === 0 || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  if (hasError) {
    return (
      <div className="bg-red-50 rounded-lg p-4 mt-4">
        <p className="text-red-600 text-sm">Failed to load audio file</p>
        <p className="text-red-500 text-xs mt-1">URL: {fullAudioUrl}</p>
      </div>
    )
  }

  return (
    <div className="bg-muted rounded-[var(--radius)] p-3 sm:p-4 mt-3 sm:mt-4">
      <audio
        ref={audioRef}
        src={fullAudioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />

      {/* Заголовок с информацией о длительности */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-xs sm:text-sm font-medium text-foreground">Audio Commentary</span>
        <span className="text-xs sm:text-sm text-muted-foreground font-metrics">
          {isLoading ? 'Loading...' : formatTime(totalDuration)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 sm:mb-3">
        <div className="relative w-full h-1.5 sm:h-2 bg-muted-foreground/20 rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercentage}
            onChange={handleSeek}
            disabled={isLoading || totalDuration === 0}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
        </div>
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1 font-metrics">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading || hasError}
          className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
          )}
        </button>

        {/* Volume - mute button always, slider only on desktop */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
          <div className="hidden sm:block relative w-20 h-1 bg-muted-foreground/20 rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume * 100}
              onChange={handleVolumeChange}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewCard({ review, isActive, buildingId, userRating, hoveredRating, onRate, onHoverRating, onLeaveRating }: {
  review: BuildingReviewWithProfile
  isActive: boolean
  buildingId: string
  userRating: number
  hoveredRating: number
  onRate: (reviewId: string, rating: number) => void
  onHoverRating: (reviewId: string, rating: number) => void
  onLeaveRating: () => void
}) {
  const { user, profile } = useAuth()
  const avgRating = review.user_rating_avg || 0
  const ratingCount = review.user_rating_count || 0

  const getReviewTypeLabel = (type: string) => {
    switch (type) {
      case 'expert': return 'Expert Review'
      case 'historical': return 'Historical Reference'
      case 'amateur': return 'User Review'
      default: return 'Review'
    }
  }

  const getReviewTypeColor = (type: string) => {
    switch (type) {
      case 'expert': return 'bg-purple-100 text-purple-800'
      case 'historical': return 'bg-amber-100 text-amber-800'
      case 'amateur': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-6">

        {/* Заголовок обзора */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewTypeColor(review.review_type)}`}>
                {getReviewTypeLabel(review.review_type)}
              </span>
              {review.is_featured && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  Recommended
                </span>
              )}
              {review.moderation_status && review.moderation_status !== 'approved' && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  review.moderation_status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {review.moderation_status === 'rejected' ? 'Rejected' : 'Pending moderation'}
                </span>
              )}
            </div>

            {review.title && (
              <h3 className="text-base sm:text-lg font-semibold font-display text-foreground mb-1 sm:mb-2">
                {review.title}
              </h3>
            )}
          </div>

          {/* Рейтинг + Edit */}
          <div className="flex items-center ml-2 sm:ml-4 gap-1 sm:gap-2 flex-shrink-0">
            {user && (user.id === review.user_id || profile?.role === 'admin' || profile?.role === 'moderator') && (
              <Link
                href={`/buildings/${buildingId}/review/${review.id}/edit`}
                className="flex items-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                title="Edit review"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            )}
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'fill-gray-200'
                    }`}
                />
              ))}
            </div>
            <span className="ml-1 text-sm font-medium font-metrics text-foreground">
              {review.rating}/5
            </span>
          </div>
        </div>

        {/* Автор */}
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="flex items-center">
            {review.profiles?.avatar_url ? (
              <img
                src={review.profiles.avatar_url}
                alt={review.profiles.display_name || review.profiles.full_name || review.profiles.username}
                className="w-8 h-8 rounded-full mr-3"
              />
            ) : (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm">
                {review.profiles?.display_name || review.profiles?.full_name || review.profiles?.username || 'Anonymous user'}
              </p>
              <div className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground font-metrics">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(review.created_at).toLocaleDateString('en-US')}
                {review.language && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                    {review.language === 'ru' ? '🇷🇺 RU' :
                      review.language === 'de' ? '🇩🇪 DE' :
                        review.language === 'es' ? '🇪🇸 ES' :
                          review.language === 'fr' ? '🇫🇷 FR' :
                            review.language === 'it' ? '🇮🇹 IT' :
                              review.language === 'pt' ? '🇵🇹 PT' :
                                review.language === 'zh' ? '🇨🇳 ZH' : '🇬🇧 EN'}
                  </span>
                )}
                {review.profiles?.role === 'expert' && (
                  <>
                    <Award className="h-3 w-3 ml-2 mr-1" />
                    <span>Expert</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Аудио плеер */}
        {review.audio_url && (
          <AudioPlayer
            audioUrl={review.audio_url}
            duration={review.audio_duration_seconds}
          />
        )}

        {/* Текст обзора */}
        {review.content && (
          <div className="mt-4">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {review.content}
            </p>
          </div>
        )}

        {/* Фото */}
        {review.photos && review.photos.length > 0 && (
          <div className="mt-4">
            <PhotoGallery
              photos={review.photos}
              className="grid-cols-2 md:grid-cols-3"
              maxPhotos={6}
            />
          </div>
        )}

        {/* Теги */}
        {review.tags && review.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {review.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-muted text-foreground px-2 py-1 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Практическая информация */}
        {(review.opening_hours || review.entry_fee) && (
          <div className="mt-4 p-4 bg-primary/5 rounded-[var(--radius)] border border-primary/10">
            <h4 className="text-sm font-semibold font-display text-foreground mb-2">Practical Information</h4>
            <div className="space-y-2 text-sm">
              {review.opening_hours && (
                <div className="flex items-start">
                  <span className="text-foreground font-medium mr-2">🕐</span>
                  <div>
                    <span className="text-foreground font-medium">Opening hours:</span>
                    <span className="text-muted-foreground ml-2">{review.opening_hours}</span>
                  </div>
                </div>
              )}
              {review.entry_fee && (
                <div className="flex items-start">
                  <span className="text-foreground font-medium mr-2">💰</span>
                  <div>
                    <span className="text-foreground font-medium">Price:</span>
                    <span className="text-muted-foreground ml-2">{review.entry_fee}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visit date */}
        {review.visit_date && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground font-metrics">
              Visited: {new Date(review.visit_date).toLocaleDateString('en-US')}
            </span>
          </div>
        )}

        {/* User rating section */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Rate this review:</p>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(star => {
                  const isStarActive = userRating >= star || (hoveredRating >= star && hoveredRating > 0)

                  return (
                    <button
                      key={star}
                      onClick={() => onRate(review.id, star)}
                      onMouseEnter={() => onHoverRating(review.id, star)}
                      onMouseLeave={onLeaveRating}
                      className="p-0.5 transition-transform hover:scale-110"
                      title={`Rate ${star}/5`}
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          isStarActive
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  )
                })}
                {userRating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Your rating: {userRating}/5
                  </span>
                )}
              </div>
            </div>

            {ratingCount > 0 && (
              <div className="flex items-center bg-yellow-50 dark:bg-yellow-950/30 px-3 py-1.5 rounded-[var(--radius)]">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1.5" />
                <span className="font-semibold text-foreground text-sm font-metrics">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground ml-1.5 font-metrics">({ratingCount} ratings)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
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

export default function BuildingReviews({
  reviews,
  buildingId,
  activeIndex,
  onActiveIndexChange,
  onReviewAdded,
  onOpenAddReview
}: BuildingReviewsProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [hoveredRating, setHoveredRating] = useState<{ reviewId: string, rating: number } | null>(null)
  const [localReviews, setLocalReviews] = useState<BuildingReviewWithProfile[]>(reviews)

  // Sync localReviews when reviews prop changes
  useEffect(() => {
    setLocalReviews(reviews)
  }, [reviews])

  // Load user ratings
  useEffect(() => {
    if (!user || reviews.length === 0) return

    const loadUserRatings = async () => {
      const { data } = await supabase
        .from('building_review_ratings')
        .select('review_id, rating')
        .eq('user_id', user.id)
        .in('review_id', reviews.map(r => r.id))

      if (data) {
        setUserRatings(new Map(data.map(r => [r.review_id, r.rating])))
      }
    }

    loadUserRatings()
  }, [user, reviews])

  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) {
      toast.error('Sign in to rate this review')
      return
    }

    try {
      const existingRating = userRatings.get(reviewId)

      if (existingRating) {
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

      // Optimistic UI update
      setLocalReviews(prev => prev.map(r => {
        if (r.id !== reviewId) return r
        const oldAvg = r.user_rating_avg || 0
        const oldCount = r.user_rating_count || 0
        let newCount: number
        let newAvg: number
        if (oldRating) {
          newCount = oldCount
          newAvg = oldCount > 0 ? (oldAvg * oldCount - oldRating + rating) / oldCount : rating
        } else {
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

  // Compute available languages from reviews
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>()
    reviews.forEach(r => {
      if (r.language) langs.add(r.language)
    })
    return Array.from(langs).sort()
  }, [reviews])

  // Filter reviews by selected language
  const filteredReviews = useMemo(() => {
    if (selectedLanguage === 'all') return localReviews
    return localReviews.filter(r => r.language === selectedLanguage)
  }, [localReviews, selectedLanguage])

  // Reset active index when language changes
  useEffect(() => {
    onActiveIndexChange(0)
  }, [selectedLanguage])

  if (reviews.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium font-display text-foreground mb-2">
          No reviews yet
        </h3>
        <p className="text-muted-foreground mb-4">
          Be the first to share your impressions of this building
        </p>
        {onOpenAddReview ? (
          <button
            onClick={onOpenAddReview}
            className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
          >
            <Star className="h-4 w-4 mr-2" />
            Add Review
          </button>
        ) : (
          <Link
            href={`/buildings/${buildingId}/review/new`}
            className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
          >
            <Star className="h-4 w-4 mr-2" />
            Add Review
          </Link>
        )}
      </div>
    )
  }

  // Clamp activeIndex within bounds of filteredReviews
  const safeIndex = Math.min(activeIndex, Math.max(0, filteredReviews.length - 1))

  return (
    <div className="space-y-6">

      {/* Header row: title, language filter, dot indicators */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold font-display text-foreground">
          Reviews ({filteredReviews.length})
        </h2>

        <div className="flex items-center gap-3">
          {/* Language filter dropdown */}
          {availableLanguages.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-sm border border-border rounded-[var(--radius)] px-2 py-1 bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
              >
                <option value="all">All languages ({reviews.length})</option>
                {availableLanguages.map(lang => {
                  const count = reviews.filter(r => r.language === lang).length
                  return (
                    <option key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] || lang.toUpperCase()} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Active review with arrow navigation */}
      {filteredReviews.length > 0 ? (
        <div className="relative group">
          {/* Left arrow */}
          {filteredReviews.length > 1 && (
            <button
              onClick={() => onActiveIndexChange(Math.max(0, safeIndex - 1))}
              disabled={safeIndex === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-card border border-border shadow-lg rounded-full p-2 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          )}

          <ReviewCard
            review={filteredReviews[safeIndex]}
            isActive={true}
            buildingId={buildingId}
            userRating={userRatings.get(filteredReviews[safeIndex]?.id) || 0}
            hoveredRating={hoveredRating?.reviewId === filteredReviews[safeIndex]?.id ? hoveredRating.rating : 0}
            onRate={handleRateReview}
            onHoverRating={(reviewId, rating) => setHoveredRating({ reviewId, rating })}
            onLeaveRating={() => setHoveredRating(null)}
          />

          {/* Right arrow */}
          {filteredReviews.length > 1 && (
            <button
              onClick={() => onActiveIndexChange(Math.min(filteredReviews.length - 1, safeIndex + 1))}
              disabled={safeIndex === filteredReviews.length - 1}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-card border border-border shadow-lg rounded-full p-2 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          )}
        </div>
      ) : (
        /* Empty filtered state */
        <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center">
          <p className="text-muted-foreground mb-3">No reviews in this language</p>
          <button
            onClick={() => setSelectedLanguage('all')}
            className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
          >
            Show all languages
          </button>
        </div>
      )}

      {/* Add Review button */}
      <div className="text-center pt-6 border-t border-border">
        {onOpenAddReview ? (
          <button
            onClick={onOpenAddReview}
            className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
          >
            <Star className="h-5 w-5 mr-2" />
            Add Review
          </button>
        ) : (
          <Link
            href={`/buildings/${buildingId}/review/new`}
            className="inline-flex items-center bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
          >
            <Star className="h-5 w-5 mr-2" />
            Add Review
          </Link>
        )}
      </div>
    </div>
  )
}