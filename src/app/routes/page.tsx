'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { MapPin, Plus, ArrowLeft, Search, X, Clock, Navigation2 } from 'lucide-react'
import RouteCreator from '@/components/RouteCreator'
import { SmartRouteFilter } from '@/lib/smart-route-filtering'
import { RouteFilterPanel } from '@/components/RouteFilterPanel'
import type { RouteWithUserData } from '@/types/route'
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

      setRoutes(smartRoutes)

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

        // Convert to needed format
        const formattedRoutes = (routesData || []).map(route => ({
          ...route,
          // Add missing fields
          route_points: [],
          profiles: null,
          route_geometry: null,
          distance_km: 0,
          rating: null,
          completion_count: 0
        })) as RouteWithUserData[]

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-muted-foreground">Loading routes...</div>
        </div>
      </div>
    )
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

  return (
    <>
      <Header buildings={buildings} />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                  Architectural Routes
                </h1>
                <p className="text-muted-foreground">
                  Explore cities through the lens of architecture. Public routes from local experts and enthusiasts.
                </p>
              </div>

              {user && (
                <button
                  onClick={handleOpenRouteCreator}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Route</span>
                </button>
              )}
            </div>
          </div>

          {/* Main content area with sidebar layout */}
          <div className="lg:flex lg:gap-8">
            {/* Left column: search and results */}
            <div className="lg:flex-1">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
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
              </div>

              {/* Results count */}
              {searchQuery || activeFiltersCount > 0 ? (
                <div className="mb-4 text-sm text-muted-foreground font-metrics">
                  Showing <span className="font-semibold text-foreground">{filteredRoutes.length}</span> of{' '}
                  <span className="font-semibold text-foreground">{routes.length}</span> routes
                </div>
              ) : null}

              {/* Results */}
              {filteredRoutes.length === 0 && routes.length > 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No routes match your filters
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Try adjusting your search or filters
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      clearFilters()
                    }}
                    className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-3 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : routes.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No routes yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Be the first to create an architectural route!
                  </p>
                  {user ? (
                    <button
                      onClick={handleOpenRouteCreator}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create First Route</span>
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-3 rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <span>Sign In to Create Routes</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 auto-rows-fr">
                  {filteredRoutes.map((route) => (
                    <Link
                      key={route.id}
                      href={`/routes/${route.id}`}
                      className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all flex flex-col group min-h-[240px]"
                    >
                      {/* Content */}
                      <div className="flex-1 mb-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {route.title}
                        </h3>
                        {route.description && (
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {route.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{route.city}, {route.country}</span>
                        </div>
                      </div>

                      {/* Metrics at bottom - single line */}
                      <div className="pt-3 border-t border-border mt-auto">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-metrics">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {route.estimated_duration_minutes || 60}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Navigation2 className="w-3.5 h-3.5" />
                            {route.points_count || 0} stops
                          </span>
                          {route.transport_mode && (
                            <span className="flex items-center gap-1 ml-auto text-primary">
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

            {/* Right column: filters (always visible on desktop) */}
            <div className="lg:w-80 lg:flex-shrink-0 mt-8 lg:mt-0">
              <div className="sticky top-6">
                <RouteFilterPanel
                  filters={{
                    cities: selectedCities,
                    transport: selectedTransport,
                    durationRange: durationRange
                  }}
                  availableCities={uniqueCities}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={clearFilters}
                  isOpen={true}
                  onClose={() => { }}
                  activeFiltersCount={activeFiltersCount}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
