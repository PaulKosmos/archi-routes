// src/components/buildings/BuildingReviews.tsx - ИСПРАВЛЕН АУДИО ПЛЕЕР + КЛИКАБЕЛЬНЫЕ ФОТО

'use client'

import { useState, useRef, useEffect } from 'react'
import { BuildingReviewWithProfile } from '@/types/building'
import { Play, Pause, Volume2, VolumeX, Star, User, Calendar, Award, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { getStorageUrl } from '@/lib/storage'
import PhotoGallery from '@/components/ui/PhotoGallery'

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
    <div className="bg-muted rounded-[var(--radius)] p-4 mt-4">
      <audio
        ref={audioRef}
        src={fullAudioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />

      {/* Заголовок с информацией о длительности */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Audio Commentary</span>
        <span className="text-sm text-muted-foreground font-metrics">
          {isLoading ? 'Loading...' : formatTime(totalDuration)}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Play/Pause кнопка */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading || hasError}
          className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        {/* Прогресс и время */}
        <div className="flex-1">
          {/* Время и прогресс-бар */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm text-muted-foreground min-w-[3rem] font-metrics">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={handleSeek}
                disabled={isLoading || totalDuration === 0}
                className="w-full h-2 bg-muted-foreground/20 rounded-[var(--radius)] appearance-none cursor-pointer disabled:cursor-not-allowed slider"
                style={{
                  background: totalDuration > 0 ?
                    `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${progressPercentage}%, hsl(var(--muted-foreground) / 0.2) ${progressPercentage}%, hsl(var(--muted-foreground) / 0.2) 100%)` :
                    'hsl(var(--muted-foreground) / 0.2)'
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground min-w-[3rem] font-metrics">
              {formatTime(totalDuration)}
            </span>
          </div>

          {/* Процент прогресса (для отладки) */}
          {totalDuration > 0 && (
            <div className="text-xs text-muted-foreground/60 font-metrics">
              Прогресс: {progressPercentage.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Громкость */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume * 100}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-muted-foreground/20 rounded-[var(--radius)] appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* CSS для стилизации слайдера */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}

function ReviewCard({ review, isActive }: { review: BuildingReviewWithProfile; isActive: boolean }) {
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
      <div className="bg-card border border-border rounded-[var(--radius)] p-6">

        {/* Заголовок обзора */}
        <div className="flex items-start justify-between mb-4">
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
            </div>

            {review.title && (
              <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                {review.title}
              </h3>
            )}
          </div>

          {/* Рейтинг */}
          <div className="flex items-center ml-4">
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
        <div className="flex items-center mb-4">
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

        {/* Полезность */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <button className="flex items-center text-muted-foreground hover:text-foreground text-sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              Helpful ({review.helpful_count})
            </button>

            {review.visit_date && (
              <span className="text-xs text-muted-foreground font-metrics">
                Visited: {new Date(review.visit_date).toLocaleDateString('en-US')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BuildingReviews({
  reviews,
  buildingId,
  activeIndex,
  onActiveIndexChange,
  onReviewAdded,
  onOpenAddReview
}: BuildingReviewsProps) {

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

  return (
    <div className="space-y-6">

      {/* Заголовок и переключатели */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold font-display text-foreground">
          Reviews ({reviews.length})
        </h2>

        {reviews.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground font-metrics">
              {activeIndex + 1} of {reviews.length}
            </span>
            <div className="flex space-x-1">
              {reviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onActiveIndexChange(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Фильтры по типам обзоров */}
      {reviews.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(reviews.map(r => r.review_type))).map(type => {
            const count = reviews.filter(r => r.review_type === type).length
            return (
              <button
                key={type}
                onClick={() => {
                  const firstIndexOfType = reviews.findIndex(r => r.review_type === type)
                  onActiveIndexChange(firstIndexOfType)
                }}
                className="px-3 py-1 rounded-full text-sm border border-border hover:border-primary hover:text-primary transition-colors"
              >
                {type === 'expert' && 'Expert'}
                {type === 'historical' && 'Historical'}
                {type === 'amateur' && 'User'}
                {type === 'general' && 'General'}
                {' '}({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Активный обзор */}
      <ReviewCard
        review={reviews[activeIndex]}
        isActive={true}
      />

      {/* Навигация между обзорами */}
      {reviews.length > 1 && (
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => onActiveIndexChange(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="px-4 py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => onActiveIndexChange(Math.min(reviews.length - 1, activeIndex + 1))}
            disabled={activeIndex === reviews.length - 1}
            className="px-4 py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Кнопка добавить обзор */}
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