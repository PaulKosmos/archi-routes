'use client'

export const dynamic = 'force-dynamic'





import { useState, useEffect, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import PodcastCard from '@/components/PodcastCard'
import PodcastMiniPlayer from '@/components/PodcastMiniPlayer'
import { PodcastEpisode, PodcastSeries, PodcastTag, PodcastFilters } from '@/types/podcast'
import { Headphones, Search, ChevronDown, ChevronUp, Plus, Grid, List, SlidersHorizontal, X, RotateCcw, Layers, Tag, ArrowUpDown } from 'lucide-react'
import { SectionLoader } from '@/components/ui/PageLoader'
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['series', 'tags']))

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.series_id) count++
    if (filters.tag_ids && filters.tag_ids.length > 0) count += filters.tag_ids.length
    if (filters.sort_by !== 'published_at') count++
    return count
  }, [filters.series_id, filters.tag_ids, filters.sort_by])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const clearAllFilters = () => {
    setFilters({ sort_by: 'published_at', sort_order: 'desc' })
  }

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
        setError('Error loading podcasts')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.series_id, filters.search, filters.sort_by, filters.sort_order, JSON.stringify(filters.tag_ids)])

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
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16 bg-white border-b" />}>
        <Header buildings={buildings} />
      </Suspense>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search episodes..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                disabled={loading}
                className="w-full pl-12 h-12 border-2 border-border bg-card text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--podcast-primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={() => setViewMode('grid')}
              className={`h-12 w-12 rounded-[var(--radius)] flex items-center justify-center transition-colors flex-shrink-0 ${viewMode === 'grid'
                  ? 'bg-[hsl(var(--podcast-primary))] text-white'
                  : 'bg-card border-2 border-border text-foreground hover:bg-muted'
                }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-12 w-12 rounded-[var(--radius)] flex items-center justify-center transition-colors flex-shrink-0 ${viewMode === 'list'
                  ? 'bg-[hsl(var(--podcast-primary))] text-white'
                  : 'bg-card border-2 border-border text-foreground hover:bg-muted'
                }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main layout: left content + right filters (like search page) */}
        <div className="lg:flex lg:gap-8">
          {/* Left column: filters toggle + episodes */}
          <div className="lg:flex-1">
            {/* Mobile filter toggle button (matches search page) */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden flex items-center justify-between w-full py-3 px-4 bg-muted hover:bg-muted/80 rounded-[var(--radius)] transition-colors mb-4"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                <span className="font-medium">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-[hsl(var(--podcast-primary))] text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile filter panel (inline collapsible, matches search page) */}
            {mobileFiltersOpen && (
              <div className="lg:hidden mb-6 bg-card border border-border rounded-[var(--radius)] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="max-h-[60vh] overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b border-border bg-card sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="bg-[hsl(var(--podcast-primary))] text-white text-xs px-2 py-0.5 rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                      <button
                        onClick={() => setMobileFiltersOpen(false)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Filter sections */}
                  <div>
                    {/* Sort */}
                    <div className="border-b border-border last:border-b-0">
                      <button
                        onClick={() => toggleSection('sort')}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">Sort</span>
                          {filters.sort_by !== 'published_at' && (
                            <span className="bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] text-xs px-1.5 py-0.5 rounded-full font-metrics">1</span>
                          )}
                        </div>
                        {expandedSections.has('sort') ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {expandedSections.has('sort') && (
                        <div className="px-3 pb-3 space-y-1">
                          {[
                            { value: 'published_at', label: 'Newest first' },
                            { value: 'episode_number', label: 'By episode number' }
                          ].map(option => (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                              <input
                                type="radio"
                                name="mobile-sort"
                                checked={filters.sort_by === option.value}
                                onChange={() => setFilters({ ...filters, sort_by: option.value as 'published_at' | 'episode_number' })}
                                className="w-4 h-4 text-[hsl(var(--podcast-primary))] border-border focus:ring-[hsl(var(--podcast-primary))]"
                              />
                              <span className="text-sm text-foreground">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Series */}
                    {series.length > 0 && (
                      <div className="border-b border-border last:border-b-0">
                        <button
                          onClick={() => toggleSection('series')}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm text-foreground">Series</span>
                            {filters.series_id && (
                              <span className="bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] text-xs px-1.5 py-0.5 rounded-full font-metrics">1</span>
                            )}
                          </div>
                          {expandedSections.has('series') ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {expandedSections.has('series') && (
                          <div className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                            {series.map(s => (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={filters.series_id === s.id}
                                  onChange={(e) => {
                                    if (e.target.checked) setFilters({ ...filters, series_id: s.id })
                                    else setFilters({ ...filters, series_id: undefined })
                                  }}
                                  className="w-4 h-4 text-[hsl(var(--podcast-primary))] border-border rounded focus:ring-[hsl(var(--podcast-primary))]"
                                />
                                <span className="flex-1 text-sm text-foreground">{s.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="border-b border-border last:border-b-0">
                        <button
                          onClick={() => toggleSection('tags')}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm text-foreground">Tags</span>
                            {filters.tag_ids && filters.tag_ids.length > 0 && (
                              <span className="bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] text-xs px-1.5 py-0.5 rounded-full font-metrics">{filters.tag_ids.length}</span>
                            )}
                          </div>
                          {expandedSections.has('tags') ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {expandedSections.has('tags') && (
                          <div className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                            {tags.map(tag => (
                              <label key={tag.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={filters.tag_ids?.includes(tag.id) || false}
                                  onChange={(e) => {
                                    if (e.target.checked) setFilters({ ...filters, tag_ids: [...(filters.tag_ids || []), tag.id] })
                                    else setFilters({ ...filters, tag_ids: filters.tag_ids?.filter(id => id !== tag.id) || [] })
                                  }}
                                  className="w-4 h-4 text-[hsl(var(--podcast-primary))] border-border rounded focus:ring-[hsl(var(--podcast-primary))]"
                                />
                                <span className="flex-1 text-sm text-foreground">{tag.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t border-border bg-card sticky bottom-0">
                    <div className="flex gap-2">
                      <button
                        onClick={clearAllFilters}
                        disabled={activeFilterCount === 0}
                        className="flex-1 px-3 py-2 text-sm border border-border bg-background rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset all
                      </button>
                      <button
                        onClick={() => setMobileFiltersOpen(false)}
                        className="flex-1 px-3 py-2 text-sm bg-[hsl(var(--podcast-primary))] text-white rounded hover:opacity-90 transition-opacity"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 items-center mb-6">
                {filters.series_id && (
                  <div className="px-3 py-1 bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] rounded-full text-sm font-medium flex items-center gap-2">
                    {series.find(s => s.id === filters.series_id)?.title}
                    <button onClick={() => setFilters({ ...filters, series_id: undefined })} className="hover:opacity-70 transition-opacity">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {filters.tag_ids?.map(tagId => {
                  const tag = tags.find(t => t.id === tagId)
                  return (
                    <div key={tagId} className="px-3 py-1 bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] rounded-full text-sm font-medium flex items-center gap-2">
                      {tag?.name}
                      <button
                        onClick={() => setFilters({ ...filters, tag_ids: filters.tag_ids?.filter(id => id !== tagId) || [] })}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
                <button onClick={clearAllFilters} className="px-3 py-1 text-muted-foreground hover:text-foreground text-sm underline transition-colors">
                  Clear all
                </button>
              </div>
            )}

            {/* Info bar */}
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
              <span className="text-sm font-medium text-foreground">
                {loading ? 'Loading...' : (
                  <>
                    Episodes found: <span className="font-bold text-[hsl(var(--podcast-primary))]">{episodes.length}</span>
                  </>
                )}
              </span>
              {canManagePodcasts && (
                <Link
                  href="/podcasts/new"
                  className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--podcast-primary))] text-white font-semibold text-sm rounded-[var(--radius)] hover:bg-[hsl(var(--podcast-primary))]/90 transition-colors"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Add Podcast</span>
                </Link>
              )}
            </div>

            {/* Episodes Grid/List */}
            {loading ? (
              <SectionLoader message="Loading podcasts..." />
            ) : error ? (
              <div className="bg-destructive/10 border-2 border-destructive p-6 text-center">
                <p className="text-destructive font-semibold">{error}</p>
              </div>
            ) : episodes.length === 0 ? (
              <div className="bg-card p-12 text-center border border-border">
                <Headphones size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Episodes Found</h3>
                <p className="text-muted-foreground">Try changing filters or come back later</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4 pb-32">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-32">
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

          {/* Right column: desktop filter sidebar (like search page) */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-6">
              <div className="bg-card border border-border rounded-[var(--radius)]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">Filters</h3>
                    {activeFilterCount > 0 && (
                      <span className="bg-[hsl(var(--podcast-primary))] text-white text-sm px-2 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Sections */}
                <div className="divide-y divide-border">
                  {/* Sort */}
                  <div>
                    <button
                      onClick={() => toggleSection('sort')}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">Sort</span>
                        {filters.sort_by !== 'published_at' && (
                          <span className="bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] text-xs px-2 py-1 rounded-full font-metrics">1</span>
                        )}
                      </div>
                      {expandedSections.has('sort') ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {expandedSections.has('sort') && (
                      <div className="px-4 pb-4 space-y-2">
                        {[
                          { value: 'published_at', label: 'Newest first' },
                          { value: 'episode_number', label: 'By episode number' }
                        ].map(option => (
                          <label key={option.value} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                            <input
                              type="radio"
                              name="desktop-sort"
                              checked={filters.sort_by === option.value}
                              onChange={() => setFilters({ ...filters, sort_by: option.value as 'published_at' | 'episode_number' })}
                              className="w-4 h-4 text-[hsl(var(--podcast-primary))] border-border focus:ring-[hsl(var(--podcast-primary))]"
                            />
                            <span className="text-sm text-foreground">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Series */}
                  {series.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('series')}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium text-foreground">Series</span>
                          {filters.series_id && (
                            <span className="bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] text-xs px-2 py-1 rounded-full font-metrics">1</span>
                          )}
                        </div>
                        {expandedSections.has('series') ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {expandedSections.has('series') && (
                        <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                          {series.map(s => (
                            <label key={s.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                              <input
                                type="checkbox"
                                checked={filters.series_id === s.id}
                                onChange={(e) => {
                                  if (e.target.checked) setFilters({ ...filters, series_id: s.id })
                                  else setFilters({ ...filters, series_id: undefined })
                                }}
                                className="w-4 h-4 text-[hsl(var(--podcast-primary))] border-border rounded focus:ring-[hsl(var(--podcast-primary))]"
                              />
                              <span className="flex-1 text-sm text-foreground">{s.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('tags')}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Tag className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium text-foreground">Tags</span>
                          {filters.tag_ids && filters.tag_ids.length > 0 && (
                            <span className="bg-[hsl(var(--podcast-primary))]/10 text-[hsl(var(--podcast-primary))] text-xs px-2 py-1 rounded-full font-metrics">{filters.tag_ids.length}</span>
                          )}
                        </div>
                        {expandedSections.has('tags') ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {expandedSections.has('tags') && (
                        <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                          {tags.map(tag => (
                            <label key={tag.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                              <input
                                type="checkbox"
                                checked={filters.tag_ids?.includes(tag.id) || false}
                                onChange={(e) => {
                                  if (e.target.checked) setFilters({ ...filters, tag_ids: [...(filters.tag_ids || []), tag.id] })
                                  else setFilters({ ...filters, tag_ids: filters.tag_ids?.filter(id => id !== tag.id) || [] })
                                }}
                                className="w-4 h-4 text-[hsl(var(--podcast-primary))] border-border rounded focus:ring-[hsl(var(--podcast-primary))]"
                              />
                              <span className="flex-1 text-sm text-foreground">{tag.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                  <button
                    onClick={clearAllFilters}
                    disabled={activeFilterCount === 0}
                    className="w-full px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset all
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
      </main>

      <EnhancedFooter />
    </div>
  )
}
