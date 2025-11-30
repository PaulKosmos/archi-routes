'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import PodcastPlayer from '@/components/PodcastPlayer'
import PodcastPlatformLinks from '@/components/PodcastPlatformLinks'
import { PodcastEpisode, PodcastTag } from '@/types/podcast'
import { ArrowLeft, Calendar, Clock, User, Tag, Loader2, Edit } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'

export default function PodcastEpisodePage() {
  const params = useParams()
  const episodeId = params.id as string
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()

  const [episode, setEpisode] = useState<PodcastEpisode | null>(null)
  const [relatedEpisodes, setRelatedEpisodes] = useState<PodcastEpisode[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user can manage podcasts
  const canManagePodcasts = profile?.role === 'admin' || profile?.role === 'moderator'

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch episode
        const { data, error: fetchError } = await supabase
          .from('podcast_episodes')
          .select(`
            *,
            podcast_series (
              id,
              title,
              slug,
              description,
              cover_image_url
            ),
            profiles!author_id (
              id,
              full_name,
              display_name,
              avatar_url
            )
          `)
          .eq('id', episodeId)
          .single()

        if (fetchError) throw fetchError

        const mappedEpisode: PodcastEpisode = {
          ...data,
          series: data.podcast_series,
          author: data.profiles
        }

        setEpisode(mappedEpisode)

        // Fetch tags for this episode
        const { data: tagsData } = await supabase
          .from('episode_tags')
          .select(`
            podcast_tags (
              id,
              name,
              slug,
              created_at
            )
          `)
          .eq('episode_id', episodeId)

        if (tagsData) {
          const tags = tagsData.map((et: any) => et.podcast_tags) as PodcastTag[]
          setEpisode(prev => prev ? { ...prev, tags } : null)
        }

        // Fetch related episodes from the same series
        if (mappedEpisode.series_id) {
          const { data: relatedData } = await supabase
            .from('podcast_episodes')
            .select(`
              *,
              podcast_series (
                id,
                title,
                slug,
                description,
                cover_image_url
              )
            `)
            .eq('series_id', mappedEpisode.series_id)
            .eq('status', 'published')
            .neq('id', episodeId)
            .order('published_at', { ascending: false })
            .limit(4)

          if (relatedData) {
            const mapped = relatedData.map(ep => ({
              ...ep,
              series: ep.podcast_series
            }))
            setRelatedEpisodes(mapped)
          }
        }

        // Fetch buildings for header
        const { data: buildingsData } = await supabase
          .from('buildings')
          .select('*')
          .limit(10)

        if (buildingsData) {
          setBuildings(buildingsData)
        }
      } catch (err) {
        console.error('Error fetching episode:', err)
        setError('Ошибка при загрузке эпизода')
      } finally {
        setLoading(false)
      }
    }

    if (episodeId) {
      fetchEpisode()
    }
  }, [episodeId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    )
  }

  if (error || !episode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Header buildings={buildings} />
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/podcasts" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-8">
              <ArrowLeft size={20} />
              Вернуться к подкастам
            </Link>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-semibold">{error || 'Эпизод не найден'}</p>
            </div>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Header buildings={buildings} />

      <main>
        <article className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Back button and Edit button */}
            <div className="flex items-center justify-between mb-8">
              <Link href="/podcasts" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Вернуться к подкастам
              </Link>

              {/* Edit button - Admin/Moderator only */}
              {canManagePodcasts && (
                <Link
                  href={`/podcasts/${episodeId}/edit`}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Edit size={18} />
                  Редактировать
                </Link>
              )}
            </div>

            {/* Hero section with cover image */}
            <div className="mb-8">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-purple-200 to-blue-200 shadow-xl">
                {episode.cover_image_url ? (
                  <Image
                    src={getStorageUrl(episode.cover_image_url, 'podcasts')}
                    alt={episode.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                    <svg className="w-24 h-24 text-white opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 6L7.5 4M9 6L20.5 3" />
                    </svg>
                  </div>
                )}

                {/* Episode number badge */}
                {episode.episode_number && (
                  <div className="absolute top-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                    Выпуск #{episode.episode_number}
                  </div>
                )}
              </div>
            </div>

            {/* Title and metadata */}
            <div className="mb-8">
              {episode.series && (
                <Link href="/podcasts" className="text-purple-600 font-semibold text-sm uppercase tracking-wide hover:text-purple-700 mb-2">
                  {episode.series.title}
                </Link>
              )}

              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {episode.title}
              </h1>

              {/* Metadata row */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
                {episode.published_at && (
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-purple-600" />
                    <span>{formatDate(episode.published_at)}</span>
                  </div>
                )}

                {episode.duration_seconds && (
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-purple-600" />
                    <span>
                      {Math.floor(episode.duration_seconds / 60)}:{(episode.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

                {episode.author && (
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-purple-600" />
                    <span>{episode.author.full_name || episode.author.display_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Audio player */}
            <div className="mb-8">
              <PodcastPlayer
                audioUrl={getStorageUrl(episode.audio_url, 'podcasts')}
                title={episode.title}
                duration={episode.duration_seconds}
                className="lg:col-span-2"
              />
            </div>

            {/* Platform Links */}
            <div className="mb-12">
              <PodcastPlatformLinks episode={episode} size={28} />
            </div>

            {/* Description */}
            {episode.description && (
              <div className="mb-12 bg-white rounded-lg p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Описание</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {episode.description}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {episode.tags && episode.tags.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Теги</h2>
                <div className="flex flex-wrap gap-3">
                  {episode.tags.map(tag => (
                    <Link
                      key={tag.id}
                      href={`/podcasts?tags=${tag.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium hover:bg-purple-100 transition-colors"
                    >
                      <Tag size={16} />
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related episodes */}
            {relatedEpisodes.length > 0 && (
              <div className="border-t border-gray-200 pt-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Еще в этой серии</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relatedEpisodes.map(relatedEpisode => (
                    <Link
                      key={relatedEpisode.id}
                      href={`/podcasts/${relatedEpisode.id}`}
                      className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all border border-gray-200"
                    >
                      <div className="relative w-full aspect-video bg-gradient-to-br from-purple-200 to-blue-200">
                        {relatedEpisode.cover_image_url && (
                          <Image
                            src={getStorageUrl(relatedEpisode.cover_image_url, 'podcasts')}
                            alt={relatedEpisode.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        {relatedEpisode.episode_number && (
                          <p className="text-xs font-bold text-purple-600 mb-2">
                            EP. {relatedEpisode.episode_number}
                          </p>
                        )}
                        <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 mb-2">
                          {relatedEpisode.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {relatedEpisode.duration_seconds && (
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              <span>{Math.floor(relatedEpisode.duration_seconds / 60)} мин</span>
                            </div>
                          )}
                          {relatedEpisode.published_at && (
                            <span>{formatDate(relatedEpisode.published_at)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </main>

      <EnhancedFooter />
    </div>
  )
}
