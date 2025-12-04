'use client'

import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import { Calendar, Clock, Headphones, Play, Pause } from 'lucide-react'
import { PodcastEpisode } from '@/types/podcast'
import { getStorageUrl } from '@/lib/storage'
import PodcastPlatformLinks from './PodcastPlatformLinks'

interface PodcastCardProps {
  episode: PodcastEpisode
  variant?: 'grid' | 'list' | 'compact'
  showSeries?: boolean
  onPlayClick?: (episode: PodcastEpisode) => void
  isCurrentlyPlaying?: boolean
}

export default function PodcastCard({
  episode,
  variant = 'grid',
  showSeries = true,
  onPlayClick,
  isCurrentlyPlaying = false
}: PodcastCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  // Generate a consistent color based on series title
  const getGradientFromSeries = () => {
    if (!episode.series?.title) return 'from-purple-400 to-blue-500'
    
    const hash = episode.series.title.charCodeAt(0) % 5
    const gradients = [
      'from-purple-400 to-blue-500',
      'from-pink-400 to-purple-500',
      'from-blue-400 to-cyan-500',
      'from-indigo-400 to-purple-500',
      'from-rose-400 to-orange-500'
    ]
    return gradients[hash]
  }

  // Get cover image URL from storage
  const getCoverImage = () => {
    if (episode.cover_image_url) {
      const url = getStorageUrl(episode.cover_image_url, 'podcasts')
      return url || null
    }
    return null
  }

  const coverImageUrl = getCoverImage()

  if (variant === 'list') {
    return (
      <div className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-purple-300 p-4 flex gap-4 cursor-pointer">
        {/* Cover Image/Gradient */}
        <div className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br ${getGradientFromSeries()} flex items-center justify-center`}>
          {coverImageUrl ? (
            <OptimizedImage
              src={coverImageUrl}
              alt={episode.title}
              fill
              className="group-hover:scale-110 transition-transform duration-300"
              objectFit="cover"
              sizes="96px"
            />
          ) : (
            <Headphones className="text-white/60" size={32} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {episode.episode_number && (
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                EP. {episode.episode_number}
              </span>
            )}
            {showSeries && episode.series && (
              <span className="text-xs text-gray-500">
                {episode.series.title}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 mb-2">
            {episode.title}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-1 mb-2">
            {episode.description}
          </p>

          {/* Platform Links in list view */}
          <div className="mb-2">
            <PodcastPlatformLinks episode={episode} size={18} />
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {episode.published_at && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{formatDate(episode.published_at)}</span>
              </div>
            )}
            {episode.duration_seconds > 0 ? (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>
                  {Math.floor(episode.duration_seconds / 60)}:{(episode.duration_seconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onPlayClick?.(episode)
          }}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all flex-shrink-0 shadow-md hover:shadow-lg"
          title={isCurrentlyPlaying ? 'Pause episode' : 'Play episode'}
        >
          {isCurrentlyPlaying ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </button>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => onPlayClick?.(episode)}
        className="group w-full bg-white rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-200 cursor-pointer p-3 text-left"
      >
        {/* Cover Image/Gradient */}
        <div className={`relative w-full aspect-square rounded-lg overflow-hidden bg-gradient-to-br ${getGradientFromSeries()} mb-3 flex items-center justify-center`}>
          {coverImageUrl ? (
            <OptimizedImage
              src={coverImageUrl}
              alt={episode.title}
              fill
              className="group-hover:scale-110 transition-transform duration-300"
              objectFit="cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <Headphones className="text-white/60" size={48} />
          )}
          {episode.episode_number && (
            <div className="absolute bottom-2 right-2 text-xs font-bold text-white bg-purple-600 px-2 py-1 rounded">
              EP. {episode.episode_number}
            </div>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-600 transition-colors line-clamp-2 mb-1">
          {episode.title}
        </h3>

        {episode.duration_seconds > 0 ? (
          <p className="text-xs text-gray-500">
            {Math.floor(episode.duration_seconds / 60)} мин
          </p>
        ) : null}
      </button>
    )
  }

  // Grid variant (default)
  return (
    <Link
      href={`/podcasts/${episode.id}`}
      className="group block w-full text-left bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-purple-200"
    >
      {/* Cover Image/Gradient */}
      <div className={`relative w-full aspect-square rounded-t-2xl overflow-hidden bg-gradient-to-br ${getGradientFromSeries()} flex items-center justify-center`}>
        {coverImageUrl ? (
          <OptimizedImage
            src={coverImageUrl}
            alt={episode.title}
            fill
            className="group-hover:scale-110 transition-transform duration-500"
            objectFit="cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <Headphones className="text-white/60" size={64} />
        )}
        {episode.episode_number && (
          <div className="absolute top-3 right-3 text-sm font-bold text-white bg-purple-600 px-3 py-1 rounded-full shadow-lg">
            EP. {episode.episode_number}
          </div>
        )}

        {/* Play/Pause Button Overlay - appears on hover or when playing */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center ${
          isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onPlayClick?.(episode)
            }}
            className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-xl transform hover:scale-110 transition-all"
            title={isCurrentlyPlaying ? 'Pause episode' : 'Play episode'}
          >
            {isCurrentlyPlaying ? (
              <Pause size={28} />
            ) : (
              <Play size={28} className="ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {showSeries && episode.series && (
          <p className="text-xs text-purple-600 font-semibold mb-2 uppercase tracking-wide">
            {episode.series.title}
          </p>
        )}

        <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 mb-2">
          {episode.title}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
          {episode.description}
        </p>

        {/* Platform Links */}
        <PodcastPlatformLinks episode={episode} size={20} />

        <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
          <div className="flex items-center gap-2">
            {episode.duration_seconds > 0 ? (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{Math.floor(episode.duration_seconds / 60)} мин</span>
              </div>
            ) : null}
          </div>
          {episode.published_at && (
            <span>{formatDate(episode.published_at)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
