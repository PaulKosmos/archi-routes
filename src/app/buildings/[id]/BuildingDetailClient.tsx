// src/app/buildings/[id]/BuildingDetailClient.tsx - FULL VERSION with reviews

'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { Building, BuildingReviewWithProfile, RouteWithPoints } from '@/types/building'
import BuildingHeader from '@/components/buildings/BuildingHeader'
import BuildingReviews from '@/components/buildings/BuildingReviews'
import { Loader2, MapPin, Clock, Users, Star, Camera, Navigation, Calendar, User, Building as BuildingIcon } from 'lucide-react'
import Link from 'next/link'
import { getStorageUrl } from '@/lib/storage'
import BuildingNews from '@/components/news/BuildingNews'

// Dynamic import for Leaflet component (avoid SSR)
const BuildingMap = dynamic(() => import('@/components/buildings/BuildingMap'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-muted animate-pulse flex items-center justify-center rounded-[var(--radius)]">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
  </div>
})

interface BuildingDetailClientProps {
  building: Building
}

interface BuildingPageData {
  reviews: BuildingReviewWithProfile[]
  relatedBlogPosts: any[]
  relatedRoutes: RouteWithPoints[]
  userFavorite: any
}

export default function BuildingDetailClient({ building }: BuildingDetailClientProps) {
  const supabase = useMemo(() => createClient(), [])
  console.log('🏢 [DEBUG] BuildingDetailClient component rendered')
  console.log('🏢 [DEBUG] Building prop:', building)
  
  const [data, setData] = useState<BuildingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  
  console.log('🏢 [DEBUG] Component state - loading:', loading, 'data:', data)
  
  const fetchBuildingData = async () => {
    console.log('🏢 [DEBUG] fetchBuildingData function called')
    console.log('🏢 [DEBUG] Function start time:', new Date().toISOString())
    
    try {
      console.log('🏢 [DEBUG] Setting loading to true')
      setLoading(true)
      
      console.log('🏢 [DEBUG] Starting PARALLEL data fetch for:', building.id)
      
      const startTime = Date.now()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Execute ALL queries in PARALLEL without timeouts
      console.log('📊 [DEBUG] Executing 4 parallel queries...')
      const [reviewsResult, blogResult, routesResult, favoriteResult] = await Promise.allSettled([
        // 1. Reviews (only approved for public viewing)
        supabase
          .from('building_reviews')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              full_name,
              avatar_url,
              role
            )
          `)
          .eq('building_id', building.id)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false }),

        // 2. Blog posts
        supabase
          .from('blog_post_buildings')
          .select(`
            *,
            blog_posts:blog_post_id (
              id,
              title,
              slug,
              excerpt,
              featured_image_url,
              published_at,
              author_id,
              profiles:author_id (
                username,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('building_id', building.id),

        // 3. Routes
        supabase
          .from('route_points')
          .select(`
            route_id,
            routes:route_id (
              id,
              title,
              description,
              city,
              country,
              difficulty_level,
              estimated_duration_minutes,
              distance_km,
              rating,
              review_count,
              thumbnail_url,
              created_by,
              profiles:created_by (
                username,
                full_name
              )
            )
          `)
          .eq('building_id', building.id)
          .limit(5),

        // 4. Favorite (only if user is logged in)
        user ? supabase
          .from('user_building_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('building_id', building.id)
          .single() : Promise.resolve({ data: null, error: null })
      ])

      // Process results
      let reviews = []
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value.data) {
        reviews = reviewsResult.value.data
        console.log('✅ Reviews loaded:', reviews.length)
      } else if (reviewsResult.status === 'rejected') {
        console.error('❌ Reviews error:', reviewsResult.reason)
      }
      
      let blogPosts = []
      if (blogResult.status === 'fulfilled' && blogResult.value.data) {
        blogPosts = blogResult.value.data
        console.log('✅ Blog posts loaded:', blogPosts.length)
      }
      
      let routes: { routes: RouteWithPoints }[] = []
      if (routesResult.status === 'fulfilled' && routesResult.value.data) {
        routes = routesResult.value.data as unknown as { routes: RouteWithPoints }[]
        console.log('✅ Routes loaded:', routes.length)
      }
      
      let userFavorite = null
      if (favoriteResult.status === 'fulfilled' && favoriteResult.value.data) {
        userFavorite = favoriteResult.value.data
        console.log('✅ Favorite status checked')
      }

      console.log('🔄 [DEBUG] Setting data state...')
      setData({
        reviews: reviews || [],
        relatedBlogPosts: blogPosts || [],
        relatedRoutes: routes?.map(r => r.routes).filter(Boolean) || [],
        userFavorite
      })

      // Increment view count (asynchronously, without blocking UI)
      supabase
        .from('buildings')
        .update({ view_count: (building.view_count || 0) + 1 })
        .eq('id', building.id)
        .then(({ error }) => {
          if (error) console.error('❌ View count error:', error)
          else console.log('✅ View count updated')
        })

      const totalTime = Date.now() - startTime
      console.log('🏢 [SUCCESS] Total fetchBuildingData took:', totalTime, 'ms')

    } catch (err) {
      console.error('🏢 [ERROR] Error fetching building data:', err)
      const error = err as Error
      console.error('🏢 [ERROR] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })

      // Fallback: set minimal data to ensure page loads
      console.log('🏢 [FALLBACK] Setting minimal data to prevent eternal loading')
      setData({
        reviews: [],
        relatedBlogPosts: [],
        relatedRoutes: [],
        userFavorite: null
      })
    } finally {
      console.log('🏢 [DEBUG] Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect triggered for building.id:', building.id)
    console.log('🔄 [DEBUG] Current loading state:', loading)
    fetchBuildingData()
  }, [building.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading building data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Loading Error</h1>
          <p className="text-muted-foreground">Failed to load building data</p>
          <button
            onClick={fetchBuildingData}
            className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { reviews, relatedBlogPosts, relatedRoutes, userFavorite } = data

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with main information */}
      <BuildingHeader
        building={building}
        userFavorite={userFavorite}
        onFavoriteUpdate={fetchBuildingData}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description and historical significance */}
            {(building.description || building.historical_significance) && (
              <div className="bg-card border border-border rounded-[var(--radius)] p-6 space-y-6">
                {building.description && (
                  <div>
                    <h2 className="text-xl font-display font-bold mb-4 text-foreground">Description</h2>
                    <p className="text-foreground leading-relaxed">{building.description}</p>
                  </div>
                )}

                {building.historical_significance && (
                  <div className={building.description ? "pt-6 border-t border-border" : ""}>
                    <h2 className="text-xl font-display font-bold mb-4 flex items-center text-foreground">
                      <BuildingIcon className="h-5 w-5 mr-2 text-primary" />
                      Historical Significance
                    </h2>
                    <p className="text-foreground leading-relaxed">{building.historical_significance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Gallery */}
            {building.image_urls && building.image_urls.length > 0 && (
              <div className="bg-card border border-border rounded-[var(--radius)] p-6">
                <h2 className="text-xl font-display font-bold mb-4 text-foreground">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {building.image_urls.map((imageUrl, index) => (
                    <div key={index} className="aspect-square overflow-hidden rounded-[var(--radius)] group relative bg-muted">
                      <img
                        src={getStorageUrl(imageUrl, 'photos')}
                        alt={`${building.name} - photo ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 opacity-0"
                        loading="lazy"
                        onError={(e) => {
                          console.error('🖼️ Gallery image loading error:', imageUrl)
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                        onLoad={(e) => {
                          console.log('✅ Gallery image loaded:', imageUrl)
                          const target = e.target as HTMLImageElement
                          target.classList.remove('opacity-0')
                          target.classList.add('opacity-100')
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <BuildingReviews
              reviews={reviews}
              buildingId={building.id}
              activeIndex={activeReviewIndex}
              onActiveIndexChange={setActiveReviewIndex}
              onReviewAdded={fetchBuildingData}
            />

            {/* Related routes */}
            {relatedRoutes.length > 0 && (
              <div className="bg-card border border-border rounded-[var(--radius)] p-6">
                <div className="flex items-center mb-4">
                  <Navigation className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-display font-bold text-foreground">Routes with this building</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {relatedRoutes.map((route, index) => (
                    <div key={index} className="border border-border rounded-[var(--radius)] p-4 hover:border-muted-foreground hover:-translate-y-1 transition-all duration-300 bg-card">
                      <Link href={`/routes/${route.id}`} className="block">

                        {/* Route image */}
                        {route.thumbnail_url && (
                          <img
                            src={route.thumbnail_url}
                            alt={route.title}
                            className="w-full h-32 object-cover rounded-[var(--radius)] mb-3"
                          />
                        )}

                        {/* Title and description */}
                        <h4 className="font-semibold font-display text-foreground mb-2 hover:text-primary transition-colors">
                          {route.title}
                        </h4>

                        {route.description && (
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {route.description}
                          </p>
                        )}

                        {/* Route metadata */}
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-muted-foreground font-metrics">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="mr-3">{route.city}, {route.country}</span>
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {route.estimated_duration_minutes
                                ? `${Math.round(route.estimated_duration_minutes / 60)} h`
                                : 'Duration not specified'
                              }
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-muted-foreground font-metrics">
                              <Star className="h-3 w-3 mr-1 text-yellow-400" />
                              <span className="mr-3">
                                {(route.rating || 0) > 0 ? (route.rating || 0).toFixed(1) : 'No ratings'}
                              </span>
                              <Users className="h-3 w-3 mr-1" />
                              <span>{route.review_count || 0} reviews</span>
                            </div>

                            {/* Difficulty */}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              route.difficulty_level === 'easy'
                                ? 'bg-green-100 text-green-800'
                                : route.difficulty_level === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {route.difficulty_level === 'easy' && 'Easy'}
                              {route.difficulty_level === 'medium' && 'Medium'}
                              {route.difficulty_level === 'hard' && 'Hard'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Information and statistics (combined block) */}
            <div className="bg-card rounded-[var(--radius)] border border-border p-6">
              <h3 className="text-lg font-semibold font-display mb-4 text-foreground">About the Building</h3>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-lg font-bold font-metrics text-foreground">{(building.rating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-metrics">{building.review_count || 0} reviews</span>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold font-metrics text-foreground mb-1">{(building.view_count || 0) + 1}</div>
                  <span className="text-sm text-muted-foreground">views</span>
                </div>
              </div>

              {/* Main information */}
              <div className="space-y-4">
                
                {building.architect && (
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground block">Architect</span>
                      <p className="font-medium text-foreground">{building.architect}</p>
                    </div>
                  </div>
                )}

                {building.year_built && (
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground block">Year Built</span>
                      <p className="font-medium font-metrics text-foreground">{building.year_built}</p>
                    </div>
                  </div>
                )}

                {building.architectural_style && (
                  <div className="flex items-start">
                    <Camera className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground block">Architectural Style</span>
                      <p className="font-medium text-foreground">{building.architectural_style}</p>
                    </div>
                  </div>
                )}

                {building.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground block">Address</span>
                      <p className="font-medium text-foreground">{building.address}</p>
                    </div>
                  </div>
                )}

                {building.building_type && (
                  <div className="flex items-start">
                    <BuildingIcon className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground block">Building Type</span>
                      <p className="font-medium text-foreground">{building.building_type}</p>
                    </div>
                  </div>
                )}

                {building.height_meters && (
                  <div className="flex items-start">
                    <Clock className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground block">Height</span>
                      <p className="font-medium font-metrics text-foreground">{building.height_meters} m</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Map */}
            <div className="bg-card rounded-[var(--radius)] border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold font-display text-foreground">Location</h3>
              </div>
              <BuildingMap
                building={building}
                className="h-64"
              />
            </div>

            {/* Useful information */}
            {(building.entry_fee || building.opening_hours || building.website_url || building.best_visit_time) && (
              <div className="bg-card rounded-[var(--radius)] border border-border p-6">
                <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Visitor Information</h3>
                <div className="space-y-3">

                  {building.entry_fee && (
                    <div>
                      <span className="text-sm text-muted-foreground block">Entry Fee</span>
                      <p className="font-medium text-foreground">{building.entry_fee}</p>
                    </div>
                  )}

                  {building.website_url && (
                    <div>
                      <span className="text-sm text-muted-foreground block">Website</span>
                      <a
                        href={building.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Open Website
                      </a>
                    </div>
                  )}

                  {building.best_visit_time && (
                    <div>
                      <span className="text-sm text-muted-foreground block">Best Time to Visit</span>
                      <p className="font-medium text-foreground">{building.best_visit_time}</p>
                    </div>
                  )}

                  {building.accessibility_info && (
                    <div>
                      <span className="text-sm text-muted-foreground block">Accessibility</span>
                      <p className="font-medium text-foreground">{building.accessibility_info}</p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* News about this building */}
            <BuildingNews
              buildingId={building.id}
              buildingName={building.name}
              limit={4}
              showTitle={true}
            />

            {/* Additional information */}
            {(building.construction_materials && building.construction_materials.length > 0) && (
              <div className="bg-card rounded-[var(--radius)] border border-border p-6">
                <h3 className="text-lg font-semibold font-display mb-4 text-foreground">Construction Materials</h3>
                <div className="flex flex-wrap gap-2">
                  {building.construction_materials.map((material, index) => (
                    <span
                      key={index}
                      className="bg-muted text-foreground px-2 py-1 rounded text-sm"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
