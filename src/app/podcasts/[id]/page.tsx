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
        setError('Error loading episode')
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-[hsl(var(--podcast-primary))]" size={40} />
      </div>
    )
  }

  if (error || !episode) {
    return (
      <div className="min-h-screen bg-background">
        <Header buildings={buildings} />
        <main className="container mx-auto px-6 py-8">
          <Link href="/podcasts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={20} />
            Back to Podcasts
          </Link>

          <div className="bg-destructive/10 border-2 border-destructive p-6 text-center">
            <p className="text-destructive font-semibold">{error || 'Episode not found'}</p>
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
    <div className="min-h-screen bg-background">
      <Header buildings={buildings} />

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Back button */}
        <Link
          href="/podcasts"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Podcasts</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main content */}
          <article className="lg:col-span-2">
            {/* Cover image */}
            <div className="mb-4 sm:mb-8">
              <div className="relative w-full aspect-video overflow-hidden bg-gradient-to-br from-purple-200 to-blue-200">
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
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-[hsl(var(--podcast-primary))] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-[var(--radius)] font-bold shadow-lg text-sm sm:text-base">
                    Episode #{episode.episode_number}
                  </div>
                )}
              </div>
            </div>

            {/* Header section */}
            <header className="mb-4 sm:mb-8">
              {episode.series && (
                <div className="flex items-center gap-2 mb-2 sm:mb-4">
                  <Link href="/podcasts" className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--podcast-primary))] bg-[hsl(var(--podcast-primary))]/10 px-3 py-1 rounded-[var(--radius)] hover:bg-[hsl(var(--podcast-primary))]/20 transition-colors">
                    {episode.series.title}
                  </Link>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display mb-3 sm:mb-6 leading-tight text-foreground">
                {episode.title}
              </h1>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground font-metrics">
                {episode.published_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(episode.published_at)}</span>
                  </div>
                )}

                {episode.duration_seconds && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {Math.floor(episode.duration_seconds / 60)}:{(episode.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

                {episode.author && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{episode.author.full_name || episode.author.display_name}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Audio player */}
            <div className="mb-3 sm:mb-8">
              <PodcastPlayer
                audioUrl={getStorageUrl(episode.audio_url, 'podcasts')}
                title={episode.title}
                duration={episode.duration_seconds}
              />
            </div>

            {/* Platform Links */}
            <div className="mb-3 sm:mb-8">
              <PodcastPlatformLinks episode={episode} size={28} />
            </div>

            {/* Description */}
            {episode.description && (
              <div className="mb-4 sm:mb-8 bg-card border border-border p-4 sm:p-8">
                <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-2 sm:mb-4">Description</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                    {episode.description}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {episode.tags && episode.tags.length > 0 && (
              <div className="mb-4 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {episode.tags.map(tag => (
                    <Link
                      key={tag.id}
                      href={`/podcasts?tags=${tag.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] rounded-[var(--radius)] font-medium hover:bg-[hsl(var(--podcast-primary))]/20 transition-colors text-sm"
                    >
                      <Tag size={14} />
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-8">
            {/* Edit button - Admin/Moderator only */}
            {canManagePodcasts && (
              <div className="bg-card border border-border p-6">
                <Link
                  href={`/podcasts/${episodeId}/edit`}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[hsl(var(--podcast-primary))] text-white font-semibold rounded-[var(--radius)] hover:bg-[hsl(var(--podcast-primary))]/90 transition-colors w-full"
                >
                  <Edit size={18} />
                  Edit
                </Link>
              </div>
            )}

            {/* Related episodes */}
            {relatedEpisodes.length > 0 && (
              <div className="bg-card border border-border p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">More in This Series</h2>
                <div className="space-y-4">
                  {relatedEpisodes.map(relatedEpisode => (
                    <Link
                      key={relatedEpisode.id}
                      href={`/podcasts/${relatedEpisode.id}`}
                      className="group flex gap-3 hover:bg-muted/50 p-2 -m-2 rounded transition-colors"
                    >
                      <div className="relative w-20 h-20 flex-shrink-0 bg-gradient-to-br from-purple-200 to-blue-200">
                        {relatedEpisode.cover_image_url && (
                          <Image
                            src={getStorageUrl(relatedEpisode.cover_image_url, 'podcasts')}
                            alt={relatedEpisode.title}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {relatedEpisode.episode_number && (
                          <p className="text-xs font-bold text-[hsl(var(--podcast-primary))] mb-1">
                            EP. {relatedEpisode.episode_number}
                          </p>
                        )}
                        <h3 className="font-semibold text-foreground group-hover:text-[hsl(var(--podcast-primary))] transition-colors line-clamp-2 text-sm mb-1">
                          {relatedEpisode.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-metrics">
                          {relatedEpisode.duration_seconds && (
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{Math.floor(relatedEpisode.duration_seconds / 60)} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* About this series */}
            {episode.series && (
              <div className="bg-card border border-border p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">About the Series</h2>
                <h3 className="font-semibold text-[hsl(var(--podcast-primary))] mb-2">
                  {episode.series.title}
                </h3>
                {episode.series.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {episode.series.description}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      <EnhancedFooter />
    </div>
  )
}
