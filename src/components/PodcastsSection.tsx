'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Calendar, Clock, ArrowRight, Headphones } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import type { PodcastEpisode } from '@/types/podcast'
import AudioPlayer from './AudioPlayer'

export default function PodcastsSection() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])
  const [loading, setLoading] = useState(true)

  const featuredEpisode = episodes[0]
  const recentEpisodes = episodes.slice(1, 4) // Show 3 recent episodes

  // Fetch real podcast episodes from Supabase
  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('podcast_episodes')
          .select(`
            *,
            series:podcast_series(*)
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(4)

        if (error) {
          console.error('Error fetching podcasts:', error)
        } else {
          setEpisodes(data || [])
        }
      } catch (err) {
        console.error('Exception fetching podcasts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEpisodes()
  }, [supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show loading state
  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          </div>
        </div>
      </section>
    )
  }

  // Don't show section if no episodes
  if (episodes.length === 0) {
    return null
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок секции */}
        <div className="flex items-center justify-between mb-12 animate-fade-in">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Headphones className="text-purple-600" size={32} />
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Подкасты
              </h2>
            </div>
            <p className="text-lg text-gray-600">
              Слушайте истории об архитектуре в дороге
            </p>
          </div>
          <button
            onClick={() => router.push('/podcasts')}
            className="hidden md:flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium transition-colors group"
          >
            <span>All Episodes</span>
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Главный эпизод с плеером */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 animate-fade-in">
            {/* Обложка */}
            <div className="relative h-64 sm:h-80 overflow-hidden">
              {featuredEpisode?.cover_image_url ? (
                <Image
                  src={getStorageUrl(featuredEpisode.cover_image_url, 'podcasts')}
                  alt={featuredEpisode.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-200 via-blue-200 to-pink-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-blue-400 to-pink-400 opacity-60" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones size={24} className="opacity-90" />
                    <p className="text-sm font-medium opacity-90">
                      {featuredEpisode?.series?.title || 'АРХИТЕКТУРА & ДИЗАЙН'}
                    </p>
                  </div>
                  {featuredEpisode?.episode_number && (
                    <p className="text-xl font-bold">ВЫПУСК #{featuredEpisode.episode_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Контент */}
            <div className="p-6 sm:p-8">
              {/* Категория и дата */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                  {featuredEpisode?.series?.title || 'Подкаст'}
                </span>
                {featuredEpisode?.published_at && (
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{formatDate(featuredEpisode.published_at)}</span>
                  </div>
                )}
              </div>

              {/* Заголовок */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                {featuredEpisode?.title}
              </h3>

              {/* Описание */}
              <p className="text-gray-600 leading-relaxed mb-6 line-clamp-3">
                {featuredEpisode?.description}
              </p>

              {/* Real Audio Player */}
              {featuredEpisode?.audio_url && (
                <div className="mb-4">
                  <AudioPlayer
                    audioUrl={getStorageUrl(featuredEpisode.audio_url, 'podcasts')}
                    title={featuredEpisode.title}
                  />
                </div>
              )}

              {/* Link to full page */}
              <div className="text-center">
                <button
                  onClick={() => router.push(`/podcasts/${featuredEpisode?.id}`)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium transition-colors"
                >
                  Открыть полную страницу эпизода
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Список предыдущих выпусков */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Previous Episodes</h3>

            {recentEpisodes.map((episode, index) => (
              <div
                key={episode.id}
                className="group bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                onClick={() => router.push(`/podcasts/${episode.id}`)}
              >
                <div className="flex space-x-4">
                  {/* Мини-обложка */}
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                    {episode.cover_image_url ? (
                      <Image
                        src={getStorageUrl(episode.cover_image_url, 'podcasts')}
                        alt={episode.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-300 to-blue-300 flex items-center justify-center">
                        <Headphones size={24} className="text-white opacity-75" />
                      </div>
                    )}
                  </div>

                  {/* Контент */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      {episode.episode_number && (
                        <span className="text-xs font-bold text-purple-600">
                          EP. {episode.episode_number}
                        </span>
                      )}
                      {episode.duration_seconds > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>{formatDuration(episode.duration_seconds)}</span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 leading-snug mb-2">
                      {episode.title}
                    </h4>

                    <p className="text-xs text-gray-500 line-clamp-2">
                      {episode.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка "Все выпуски" для мобильных */}
        <div className="mt-12 text-center md:hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => router.push('/podcasts')}
            className="inline-flex items-center space-x-2 px-8 py-3 bg-purple-600 text-white font-medium rounded-full hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <span>All Episodes</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
