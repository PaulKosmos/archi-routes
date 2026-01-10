'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Calendar, Clock, Headphones } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import type { PodcastEpisode } from '@/types/podcast'
import AudioPlayer from '@/components/AudioPlayer'

export default function PodcastsSection() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])
  const [loading, setLoading] = useState(true)

  const featuredEpisode = episodes[0]
  const recentEpisodes = episodes.slice(1, 4)

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted w-64 mb-12"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-96 bg-muted"></div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (episodes.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="w-1 h-8 bg-foreground"></div>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Audio Stories
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Audio <span className="font-light italic">Stories</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Listen to architecture stories on the go
              </p>
            </div>

            <button
              onClick={() => router.push('/podcasts')}
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            >
              All Episodes
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured episode with player */}
          <div className="lg:col-span-2 bg-card border border-border hover:border-foreground/30 transition-all overflow-hidden"
            style={{ borderRadius: '2px' }}
          >
            {/* Cover */}
            <div className="relative h-64 sm:h-80 overflow-hidden">
              {featuredEpisode?.cover_image_url ? (
                <Image
                  src={getStorageUrl(featuredEpisode.cover_image_url, 'podcasts')}
                  alt={featuredEpisode.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Headphones size={64} className="text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones size={20} className="opacity-90" />
                    <p className="text-sm font-medium opacity-90">
                      {featuredEpisode?.series?.title || 'ARCHITECTURE & DESIGN'}
                    </p>
                  </div>
                  {featuredEpisode?.episode_number && (
                    <p className="text-xl font-bold">EPISODE #{featuredEpisode.episode_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {/* Category and date */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-muted border border-border text-xs font-medium"
                  style={{ borderRadius: '2px' }}
                >
                  {featuredEpisode?.series?.title || 'Podcast'}
                </span>
                {featuredEpisode?.published_at && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar size={14} />
                    <span>{formatDate(featuredEpisode.published_at)}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">
                {featuredEpisode?.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                {featuredEpisode?.description}
              </p>

              {/* Audio Player */}
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
                  style={{ borderRadius: '2px' }}
                >
                  View Full Episode
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Recent episodes list */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground mb-4">Previous Episodes</h3>

            {recentEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="group bg-card border border-border hover:border-foreground/30 transition-all p-4 cursor-pointer"
                style={{ borderRadius: '2px' }}
                onClick={() => router.push(`/podcasts/${episode.id}`)}
              >
                <div className="flex gap-4">
                  {/* Mini cover */}
                  <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden bg-muted border border-border"
                    style={{ borderRadius: '2px' }}
                  >
                    {episode.cover_image_url ? (
                      <Image
                        src={getStorageUrl(episode.cover_image_url, 'podcasts')}
                        alt={episode.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <Headphones size={20} className="text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      {episode.episode_number && (
                        <span className="text-xs font-bold text-foreground">
                          EP. {episode.episode_number}
                        </span>
                      )}
                      {episode.duration_seconds > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={12} />
                          <span>{formatDuration(episode.duration_seconds)}</span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug mb-2">
                      {episode.title}
                    </h4>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {episode.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile "All episodes" button */}
        <div className="mt-8 text-center md:hidden">
          <button
            onClick={() => router.push('/podcasts')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
            style={{ borderRadius: '2px' }}
          >
            <span>All Episodes</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
