'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { MapPin, Plus, ArrowLeft, Search, X, Clock, Navigation2, SlidersHorizontal } from 'lucide-react'
import { PageLoader } from '@/components/ui/PageLoader'
import RouteCreator from '@/components/RouteCreator'
import { SmartRouteFilter } from '@/lib/smart-route-filtering'
import { RouteFilterPanel } from '@/components/RouteFilterPanel'
// Using local SimpleRoute type instead of RouteWithUserData
import type { Building } from '@/types/building'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

interface SimpleRoute {
  id: string
  title: string
  description: string | null
  city: string
  country: string
  transport_mode: string | null
  estimated_duration_minutes: number | null
  points_count: number | null
  is_published: boolean | null
  created_at: string
}

export default function RoutesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [routes, setRoutes] = useState<SimpleRoute[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<SimpleRoute[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRouteCreatorOpen, setIsRouteCreatorOpen] = useState(false)

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedTransport, setSelectedTransport] = useState<string[]>([])
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 300])

  useEffect(() => {
    loadData()
  }, [])

  // Filter routes when search/filters change
  useEffect(() => {
    if (!routes.length) {
      setFilteredRoutes([])
      return
    }

    let filtered = [...routes]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(route =>
        route.title.toLowerCase().includes(query) ||
        route.description?.toLowerCase().includes(query) ||
        route.city.toLowerCase().includes(query) ||
        route.country.toLowerCase().includes(query)
      )
    }

    // City filter
    if (selectedCities.length > 0) {
      filtered = filtered.filter(route =>
        selectedCities.includes(route.city)
      )
    }

    // Transport filter
    if (selectedTransport.length > 0) {
      filtered = filtered.filter(route =>
        route.transport_mode && selectedTransport.includes(route.transport_mode)
      )
    }

    // Duration filter
    filtered = filtered.filter(route => {
      const duration = route.estimated_duration_minutes || 0
      return duration >= durationRange[0] && duration <= durationRange[1]
    })

    setFilteredRoutes(filtered)
  }, [routes, searchQuery, selectedCities, selectedTransport, durationRange])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use smart filtering for routes page (more routes)
      const smartRoutes = await SmartRouteFilter.getRoutesForMap({
        city: 'Berlin',
        maxRoutes: 50, // Show more routes on routes page
        userPreferences: {
          // Can add user filters
        }
      })

      // Convert to SimpleRoute format
      const simpleRoutes: SimpleRoute[] = smartRoutes.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        city: r.city,
        country: r.country,
        transport_mode: r.transport_mode ?? null,
        estimated_duration_minutes: r.estimated_duration_minutes,
        points_count: r.points_count,
        is_published: r.is_published,
        created_at: r.created_at
      }))

      setRoutes(simpleRoutes)

    } catch (smartError: any) {
      // Fallback to regular query
      try {
        const { data: routesData, error: routesError } = await supabase
          .from('routes')
          .select(`
            id,
            title,
            description,
            city,
            country,
            transport_mode,
            estimated_duration_minutes,
            points_count,
            is_published,
            created_at,
            route_visibility,
            publication_status,
            priority_score
          `)
          .eq('publication_status', 'published')
          .eq('route_visibility', 'public')
          .order('priority_score', { ascending: false })

        if (routesError) {
          setError(routesError.message)
          return
        }

        // Convert to SimpleRoute format
        const formattedRoutes: SimpleRoute[] = (routesData || []).map(route => ({
          id: route.id,
          title: route.title,
          description: route.description,
          city: route.city,
          country: route.country,
          transport_mode: route.transport_mode,
          estimated_duration_minutes: route.estimated_duration_minutes,
          points_count: route.points_count,
          is_published: route.is_published,
          created_at: route.created_at
        }))

        setRoutes(formattedRoutes)

      } catch (fallbackError: any) {
        setError(fallbackError.message)
        return
      }
    }

    // Load buildings for route creation
    try {
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('name')

      if (!buildingsError) {
        setBuildings(buildingsData || [])
      }
    } catch (buildingsError: any) {
      // Silent fail - buildings are optional for viewing routes
    }

    setLoading(false)
  }

  const handleOpenRouteCreator = () => {
    setIsRouteCreatorOpen(true)
  }

  const handleCloseRouteCreator = () => {
    setIsRouteCreatorOpen(false)
    // Reload data after route creation
    loadData()
  }

  // Get unique cities from routes
  const uniqueCities = useMemo(() => {
    const cities = new Set(routes.map(r => r.city))
    return Array.from(cities).sort()
  }, [routes])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedCities.length > 0) count++
    if (selectedTransport.length > 0) count++
    if (durationRange[0] > 0 || durationRange[1] < 300) count++
    return count
  }, [selectedCities, selectedTransport, durationRange])

  const clearFilters = () => {
    setSelectedCities([])
    setSelectedTransport([])
    setDurationRange([0, 300])
  }

  const handleFiltersChange = (newFilters: Partial<{
    cities: string[]
    transport: string[]
    durationRange: [number, number]
  }>) => {
    if (newFilters.cities !== undefined) setSelectedCities(newFilters.cities)
    if (newFilters.transport !== undefined) setSelectedTransport(newFilters.transport)
    if (newFilters.durationRange !== undefined) setDurationRange(newFilters.durationRange)
  }

  if (loading) {
    return <PageLoader message="Loading routes..." size="lg" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Routes Loading Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={loadData}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <Link href="/" className="bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors inline-block">
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const filterProps = {
    filters: { cities: selectedCities, transport: selectedTransport, durationRange },
    availableCities: uniqueCities,
    onFiltersChange: handleFiltersChange,
    onClearFilters: clearFilters,
    activeFiltersCount,
  }

  return (
    <>
      <Header buildings={buildings} />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">

          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-start gap-3 md:gap-4">
              <Link href="/" className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0 mt-0.5">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">
                  Architectural Routes
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Explore cities through the lens of architecture. Public routes from local experts and enthusiasts.
                </p>
              </div>
              {user && (
                <button
                  onClick={handleOpenRouteCreator}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 md:px-5 py-2 md:py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Route</span>
                </button>
              )}
            </div>
          </div>

          {/* Main layout */}
          <div className="lg:flex lg:gap-8">

            {/* Left column */}
            <div className="lg:flex-1 min-w-0">

              {/* Search + mobile filters button */}
              <div className="flex gap-2 mb-4 md:mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search routes by title, city..."
                    className="w-full h-12 pl-12 pr-10 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filters button — mobile only */}
                <button
                  onClick={() => setIsFiltersOpen(true)}
                  className="lg:hidden relative h-12 px-3 sm:px-4 border border-border bg-background text-foreground rounded-lg flex items-center gap-2 text-sm hover:bg-muted transition-colors shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-metrics leading-none">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Results count */}
              {(searchQuery || activeFiltersCount > 0) && (
                <div className="mb-4 text-sm text-muted-foreground font-metrics">
                  Showing <span className="font-semibold text-foreground">{filteredRoutes.length}</span> of{' '}
                  <span className="font-semibold text-foreground">{routes.length}</span> routes
                </div>
              )}

              {/* Results */}
              {filteredRoutes.length === 0 && routes.length > 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No routes match your filters</h3>
                  <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
                  <button
                    onClick={() => { setSearchQuery(''); clearFilters() }}
                    className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-3 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : routes.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No routes yet</h3>
                  <p className="text-muted-foreground mb-6">Be the first to create an architectural route!</p>
                  {user ? (
                    <button
                      onClick={handleOpenRouteCreator}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create First Route</span>
                    </button>
                  ) : (
                    <Link href="/auth" className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-3 rounded-lg hover:bg-muted/80 transition-colors">
                      Sign In to Create Routes
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                  {filteredRoutes.map((route) => (
                    <Link
                      key={route.id}
                      href={`/routes/${route.id}`}
                      className="bg-card border border-border rounded-lg p-4 md:p-6 hover:border-primary/50 transition-all flex flex-col group"
                    >
                      <div className="flex-1 mb-3 md:mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-foreground mb-1.5 md:mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {route.title}
                        </h3>
                        {route.description && (
                          <p className="text-muted-foreground text-sm mb-2 md:mb-3 line-clamp-2">
                            {route.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{route.city}, {route.country}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-metrics">
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            {route.estimated_duration_minutes || 60}min
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Navigation2 className="w-3.5 h-3.5" />
                            {route.points_count || 0} stops
                          </span>
                          {route.transport_mode && (
                            <span className="ml-auto text-primary shrink-0">
                              {route.transport_mode === 'walking' && 'Walking'}
                              {route.transport_mode === 'cycling' && 'Cycling'}
                              {route.transport_mode === 'driving' && 'Driving'}
                              {route.transport_mode === 'public_transport' && 'Transit'}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: filters — desktop only */}
            <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
              <div className="sticky top-6">
                <RouteFilterPanel
                  {...filterProps}
                  isOpen={true}
                  onClose={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <RouteFilterPanel
        {...filterProps}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      {/* Route creation modal */}
      {isRouteCreatorOpen && user && (
        <RouteCreator
          isOpen={isRouteCreatorOpen}
          onClose={handleCloseRouteCreator}
          user={user}
          buildings={buildings}
        />
      )}
      <EnhancedFooter />
    </>
  )
}
