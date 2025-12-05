'use client'

export const dynamic = 'force-dynamic'





import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import PodcastCard from '@/components/PodcastCard'
import PodcastFiltersComponent from '@/components/PodcastFilters'
import PodcastMiniPlayer from '@/components/PodcastMiniPlayer'
import { PodcastEpisode, PodcastSeries, PodcastTag, PodcastFilters } from '@/types/podcast'
import { Headphones, Loader2, Search, ChevronDown, Plus } from 'lucide-react'
import Link from 'next/link'

export default function PodcastsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [buildings, setBuildings] = useState<any[]>([])
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])
  const [series, setSeries] = useState<PodcastSeries[]>([])
  const [tags, setTags] = useState<PodcastTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PodcastFilters>({
    sort_by: 'published_at',
    sort_order: 'desc'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedEpisodeForPlayer, setSelectedEpisodeForPlayer] = useState<PodcastEpisode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Check if user can manage podcasts
  const canManagePodcasts = profile?.role === 'admin' || profile?.role === 'moderator'

  // Fetch series, tags, episodes, and buildings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch buildings for header
        const { data: buildingsData } = await supabase
          .from('buildings')
          .select('*')
          .limit(100)
        setBuildings(buildingsData || [])

        // Fetch series
        const { data: seriesData, error: seriesError } = await supabase
          .from('podcast_series')
          .select('*')
          .order('title')

        if (seriesError) throw seriesError
        setSeries(seriesData || [])

        // Fetch tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('podcast_tags')
          .select('*')
          .order('name')

        if (tagsError) throw tagsError
        setTags(tagsData || [])

        // Fetch episodes with relationships
        const query = supabase
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
          .eq('status', 'published')
          .lte('published_at', new Date().toISOString())

        // Apply filters
        if (filters.series_id) {
          query.eq('series_id', filters.series_id)
        }

        if (filters.search) {
          query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }

        // Sort
        const orderField = filters.sort_by === 'episode_number' ? 'episode_number' : 'published_at'
        query.order(orderField, { ascending: filters.sort_order === 'asc' })

        const { data: episodesData, error: episodesError } = await query

        if (episodesError) throw episodesError

        let filteredEpisodes = episodesData || []

        // Filter by tags if needed
        if (filters.tag_ids && filters.tag_ids.length > 0) {
          const { data: episodeTagsData } = await supabase
            .from('episode_tags')
            .select('episode_id')
            .in('tag_id', filters.tag_ids)

          const episodeIdsWithTags = new Set(episodeTagsData?.map(et => et.episode_id) || [])
          filteredEpisodes = filteredEpisodes.filter(ep => episodeIdsWithTags.has(ep.id))
        }

        // Map the data to include series object if available
        const mappedEpisodes = filteredEpisodes.map(ep => ({
          ...ep,
          series: ep.podcast_series
        }))

        setEpisodes(mappedEpisodes)
      } catch (err) {
        console.error('Error fetching podcast data:', err)
        setError('Ошибка при загрузке подкастов')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.series_id, filters.search, filters.sort_by, filters.sort_order, JSON.stringify(filters.tag_ids)])

  const handleFilterChange = (newFilters: PodcastFilters) => {
    setFilters(newFilters)
  }

  const handlePlayClick = (episode: PodcastEpisode) => {
    if (selectedEpisodeForPlayer?.id === episode.id) {
      // Toggle play/pause for same episode
      setIsPlaying(!isPlaying)
    } else {
      // New episode - start playing
      setSelectedEpisodeForPlayer(episode)
      setIsPlaying(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Header buildings={buildings} />

      <main>
        {/* Hero Section - Title Only */}
        <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 flex items-center gap-3">
                  <Headphones size={40} className="text-purple-600" />
                  Подкасты
                </h1>
                <p className="text-gray-600 text-lg mt-2">
                  Слушайте истории об архитектуре, путешествиях и искусстве
                </p>
              </div>

              {/* Add Podcast Button - Admin/Moderator only */}
              {canManagePodcasts && (
                <Link
                  href="/podcasts/new"
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                >
                  <Plus size={20} />
                  Добавить подкаст
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Search Bar Section */}
        <section className="px-4 sm:px-6 lg:px-8 bg-gray-50 py-4">
          <div className="max-w-7xl mx-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Искать эпизоды..."
                value={filters.search || ''}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        {/* Mini Player - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PodcastMiniPlayer
              episode={selectedEpisodeForPlayer}
              audioUrl={selectedEpisodeForPlayer?.audio_url}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onClose={() => {
                setSelectedEpisodeForPlayer(null)
                setIsPlaying(false)
              }}
              supabase={supabase}
            />
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen pb-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Sidebar - Filters (always expanded) */}
              <aside className="lg:col-span-1">
                <div className="sticky top-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                  {/* Серии Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Серии</h3>
                    <div className="space-y-2">
                      {series.map(s => (
                        <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filters.series_id === s.id}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({...filters, series_id: s.id})
                              } else {
                                setFilters({...filters, series_id: undefined})
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{s.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200"></div>

                  {/* Теги Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Теги</h3>
                    <div className="space-y-2">
                      {tags.map(tag => (
                        <label key={tag.id} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filters.tag_ids?.includes(tag.id) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({...filters, tag_ids: [...(filters.tag_ids || []), tag.id]})
                              } else {
                                setFilters({...filters, tag_ids: filters.tag_ids?.filter(id => id !== tag.id) || []})
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              {/* Right Content - Episodes */}
              <div className="lg:col-span-3">

            {/* View mode toggle */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {loading ? 'Загрузка...' : `Найдено ${episodes.length} эпизодов`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Сетка
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Список
                </button>
              </div>
            </div>

            {/* Episodes Grid/List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-purple-600" size={40} />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            ) : episodes.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <Headphones size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Эпизодов не найдено</h3>
                <p className="text-gray-600">Попробуйте изменить фильтры или вернитесь позже</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                {episodes.map(episode => (
                  <PodcastCard
                    key={episode.id}
                    episode={episode}
                    variant="list"
                    showSeries={true}
                    onPlayClick={handlePlayClick}
                    isCurrentlyPlaying={selectedEpisodeForPlayer?.id === episode.id && isPlaying}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {episodes.map(episode => (
                  <PodcastCard
                    key={episode.id}
                    episode={episode}
                    variant="grid"
                    showSeries={true}
                    onPlayClick={handlePlayClick}
                    isCurrentlyPlaying={selectedEpisodeForPlayer?.id === episode.id && isPlaying}
                  />
                ))}
              </div>
            )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <EnhancedFooter />
    </div>
  )
}
