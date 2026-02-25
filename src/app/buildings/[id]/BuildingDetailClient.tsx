// src/app/buildings/[id]/BuildingDetailClient.tsx - FULL VERSION with reviews

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { Building, BuildingReviewWithProfile, RouteWithPoints } from '@/types/building'
import BuildingHeader from '@/components/buildings/BuildingHeader'
import BuildingReviews from '@/components/buildings/BuildingReviews'
import { Loader2, MapPin, Clock, Users, Star, Camera, Navigation, Calendar, User, Building as BuildingIcon, Globe, ExternalLink, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Link from 'next/link'
import { getStorageUrl } from '@/lib/storage'
import BuildingNews from '@/components/news/BuildingNews'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

// Dynamic import for MapLibre component (migrated from Leaflet)
const MapLibreBuildingMap = dynamic(() => import('@/components/buildings/MapLibreBuildingMap'), {
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
  const { user, profile } = useAuth()
  const isModerator = profile?.role === 'moderator' || profile?.role === 'admin'
  console.log('🏢 [DEBUG] BuildingDetailClient component rendered')
  console.log('🏢 [DEBUG] Building prop:', building)

  const [data, setData] = useState<BuildingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Mobile map toggle
  const [mapOpen, setMapOpen] = useState(false)

  // Gallery scroll ref
  const galleryRef = useRef<HTMLDivElement>(null)

  // Building rating state
  const [buildingRating, setBuildingRating] = useState(0)
  const [buildingRatingCount, setBuildingRatingCount] = useState(0)
  const [userBuildingRating, setUserBuildingRating] = useState(0)
  const [hoveredBuildingRating, setHoveredBuildingRating] = useState(0)

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
      // Build reviews query: moderators see all reviews, others see only approved (+ own)
      let reviewsQuery = supabase
        .from('building_reviews')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })

      // Only filter by approved status for non-moderators
      if (!isModerator) {
        if (user) {
          // Logged in non-moderator: see approved + own reviews
          reviewsQuery = reviewsQuery.or(`moderation_status.eq.approved,user_id.eq.${user.id}`)
        } else {
          // Not logged in: only approved
          reviewsQuery = reviewsQuery.eq('moderation_status', 'approved')
        }
      }

      const [reviewsResult, blogResult, routesResult, favoriteResult] = await Promise.allSettled([
        // 1. Reviews
        reviewsQuery,

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

  // Load building rating data
  useEffect(() => {
    const loadBuildingRating = async () => {
      const { data } = await supabase
        .from('building_ratings')
        .select('rating')
        .eq('building_id', building.id)

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
        setBuildingRating(avg)
        setBuildingRatingCount(data.length)
      }
    }

    const loadUserBuildingRating = async () => {
      if (!user) return
      const { data } = await supabase
        .from('building_ratings')
        .select('rating')
        .eq('building_id', building.id)
        .eq('user_id', user.id)
        .single()

      if (data) setUserBuildingRating(data.rating)
    }

    loadBuildingRating()
    loadUserBuildingRating()
  }, [building.id, user])

  const handleRateBuilding = async (rating: number) => {
    if (!user) {
      toast.error('Sign in to rate this object')
      return
    }

    try {
      const { error } = await supabase
        .from('building_ratings')
        .upsert({
          building_id: building.id,
          user_id: user.id,
          rating,
          updated_at: new Date().toISOString()
        }, { onConflict: 'building_id,user_id' })

      if (error) throw error

      const oldRating = userBuildingRating
      setUserBuildingRating(rating)

      if (oldRating > 0) {
        const newAvg = buildingRatingCount > 0
          ? (buildingRating * buildingRatingCount - oldRating + rating) / buildingRatingCount
          : rating
        setBuildingRating(newAvg)
      } else {
        const newCount = buildingRatingCount + 1
        const newAvg = (buildingRating * buildingRatingCount + rating) / newCount
        setBuildingRating(newAvg)
        setBuildingRatingCount(newCount)
      }

      toast.success(`Rating ${rating}/5 saved!`)
    } catch (error) {
      console.error('Error rating building:', error)
      toast.error('Error saving rating')
    }
  }

  const reviews = data?.reviews || []

  // Unified gallery: building images + review photos, deduplicated
  // Must be before early returns to satisfy Rules of Hooks
  const allGalleryImages = useMemo(() => {
    const seen = new Set<string>()
    const images: { url: string; source: string }[] = []

    // Main building image
    if (building.image_url) {
      const url = getStorageUrl(building.image_url, 'photos')
      if (!seen.has(url)) {
        seen.add(url)
        images.push({ url, source: building.name })
      }
    }

    // Additional building gallery images
    if (building.image_urls && building.image_urls.length > 0) {
      for (const imgUrl of building.image_urls) {
        if (imgUrl) {
          const url = getStorageUrl(imgUrl, 'photos')
          if (!seen.has(url)) {
            seen.add(url)
            images.push({ url, source: building.name })
          }
        }
      }
    }

    // Review photos
    for (const review of reviews) {
      if (review.photos && review.photos.length > 0) {
        const authorName = review.profiles?.display_name || review.profiles?.full_name || review.profiles?.username || 'User'
        for (const photo of review.photos) {
          if (photo) {
            const url = getStorageUrl(photo, 'photos')
            if (!seen.has(url)) {
              seen.add(url)
              images.push({ url, source: `Photo by ${authorName}` })
            }
          }
        }
      }
    }

    return images
  }, [building, reviews])

  const galleryLightboxImages = useMemo(() => allGalleryImages.map(img => img.url), [allGalleryImages])

  const scrollGallery = (direction: 'left' | 'right') => {
    if (!galleryRef.current) return
    const scrollAmount = 200
    galleryRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading object data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Loading Error</h1>
          <p className="text-muted-foreground">Failed to load object data</p>
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

  const { relatedBlogPosts, relatedRoutes, userFavorite } = data

  return (
    <div className="min-h-screen bg-background">
      {/* Moderation status banner */}
      {building.moderation_status && building.moderation_status !== 'approved' && (
        <div className={`px-4 py-3 ${
          building.moderation_status === 'rejected'
            ? 'bg-red-50 border-b border-red-200'
            : 'bg-amber-50 border-b border-amber-200'
        }`}>
          <div className="container mx-auto flex items-center gap-2">
            {building.moderation_status === 'rejected' ? (
              <>
                <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    This building has been rejected by moderation
                  </p>
                  {(building as any).rejection_reason && (
                    <p className="text-sm text-red-700 mt-0.5">
                      Reason: {(building as any).rejection_reason}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm font-medium text-amber-800">
                  This building is pending moderation review
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero section with main information */}
      <BuildingHeader
        building={building}
        userFavorite={userFavorite}
        onFavoriteUpdate={fetchBuildingData}
        images={galleryLightboxImages}
      />

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Link
          href="/buildings"
          className="inline-flex items-center gap-1 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All Objects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">

          {/* Mobile-only: Building info + Map at top */}
          <div className="lg:hidden space-y-4">
            {/* About the Building - mobile */}
            <div className="bg-card rounded-[var(--radius)] border border-border p-4">
              <h3 className="text-base font-semibold font-display mb-3 text-foreground">About the Object</h3>

              <div className="space-y-3">
                {building.architect && (
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground block">Architect</span>
                      <p className="font-medium text-sm text-foreground">{building.architect}</p>
                    </div>
                  </div>
                )}
                {building.year_built && (
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground block">Year Built</span>
                      <p className="font-medium text-sm font-metrics text-foreground">{building.year_built}</p>
                    </div>
                  </div>
                )}
                {building.architectural_style && (
                  <div className="flex items-start">
                    <Camera className="h-4 w-4 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground block">Architectural Style</span>
                      <p className="font-medium text-sm text-foreground">{building.architectural_style}</p>
                    </div>
                  </div>
                )}
                {building.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground block">Address</span>
                      <p className="font-medium text-sm text-foreground">{building.address}</p>
                    </div>
                  </div>
                )}
                {building.building_type && (
                  <div className="flex items-start">
                    <BuildingIcon className="h-4 w-4 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground block">Object Type</span>
                      <p className="font-medium text-sm text-foreground">{building.building_type}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map - collapsible drawer on mobile */}
            <div className="bg-card rounded-[var(--radius)] border border-border overflow-hidden">
              <button
                onClick={() => setMapOpen(!mapOpen)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold font-display text-foreground text-sm">Location</h3>
                </div>
                {mapOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  mapOpen ? 'max-h-80' : 'max-h-0'
                }`}
              >
                <MapLibreBuildingMap
                  building={building}
                  className="h-64"
                />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">

            {/* Description and historical significance */}
            {(building.description || building.historical_significance) && (
              <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-6 space-y-4 sm:space-y-6">
                {building.description && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-display font-bold mb-2 sm:mb-4 text-foreground">Description</h2>
                    <p className="text-foreground leading-relaxed text-sm sm:text-base">{building.description}</p>
                  </div>
                )}

                {building.historical_significance && (
                  <div className={building.description ? "pt-4 sm:pt-6 border-t border-border" : ""}>
                    <h2 className="text-lg sm:text-xl font-display font-bold mb-2 sm:mb-4 flex items-center text-foreground">
                      <BuildingIcon className="h-5 w-5 mr-2 text-primary" />
                      Historical Significance
                    </h2>
                    <p className="text-foreground leading-relaxed text-sm sm:text-base">{building.historical_significance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Unified Gallery - horizontal carousel with arrows */}
            {allGalleryImages.length > 0 && (
              <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">
                    Gallery ({allGalleryImages.length})
                  </h2>
                  {allGalleryImages.length > 2 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => scrollGallery('left')}
                        className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => scrollGallery('right')}
                        className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="h-4 w-4 text-foreground" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  ref={galleryRef}
                  className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {allGalleryImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setLightboxIndex(index)
                        setLightboxOpen(true)
                      }}
                      className="flex-shrink-0 w-40 h-40 overflow-hidden rounded-[var(--radius)] group relative bg-muted cursor-pointer"
                    >
                      <img
                        src={image.url}
                        alt={`${building.name} - photo ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      {/* Source label overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs truncate block">{image.source}</span>
                      </div>
                    </button>
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
              <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <Navigation className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-base sm:text-lg font-display font-bold text-foreground">Routes with this object</h3>
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${route.difficulty_level === 'easy'
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

          {/* Sidebar - info/map hidden on mobile (shown above) */}
          <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-1">

            {/* Information and statistics (combined block) - desktop only */}
            <div className="hidden lg:block bg-card rounded-[var(--radius)] border border-border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold font-display mb-3 sm:mb-4 text-foreground">About the Object</h3>

              {/* Rating + Views */}
              <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border space-y-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isActive = userBuildingRating >= star || (hoveredBuildingRating >= star && hoveredBuildingRating > 0)
                      const isFilled = !hoveredBuildingRating && buildingRating >= star

                      return (
                        <button
                          key={star}
                          onClick={() => handleRateBuilding(star)}
                          onMouseEnter={() => setHoveredBuildingRating(star)}
                          onMouseLeave={() => setHoveredBuildingRating(0)}
                          className="p-0.5 transition-transform hover:scale-110"
                          title={`Rate ${star}/5`}
                        >
                          <Star
                            className={`h-5 w-5 transition-colors ${
                              isActive
                                ? 'fill-yellow-400 text-yellow-400'
                                : isFilled
                                  ? 'fill-yellow-400/60 text-yellow-400/60'
                                  : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      )
                    })}
                    {buildingRatingCount > 0 && (
                      <span className="ml-1 text-lg font-bold font-metrics text-foreground">{buildingRating.toFixed(1)}</span>
                    )}
                  </div>
                  {(buildingRatingCount > 0 || userBuildingRating > 0) && (
                    <span className="text-sm text-muted-foreground font-metrics">
                      {buildingRatingCount > 0 && `${buildingRatingCount} ${buildingRatingCount === 1 ? 'rating' : 'ratings'}`}
                      {userBuildingRating > 0 && <span className="text-primary ml-2">Your: {userBuildingRating}/5</span>}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="font-bold font-metrics text-foreground mr-1">{(building.view_count || 0) + 1}</span> views
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
                      <span className="text-sm text-muted-foreground block">Object Type</span>
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

              {/* Visitor Information (merged) */}
              {(building.entry_fee || building.website_url || building.best_visit_time || building.accessibility_info) && (
                <>
                  <div className="border-t border-border my-4" />
                  <h4 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide mb-3">Visitor Information</h4>
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
                          className="font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                        >
                          Open Website
                          <ExternalLink className="h-3 w-3" />
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
                </>
              )}
            </div>

            {/* Map - MapLibre - desktop only (mobile shown above as collapsible) */}
            <div className="hidden lg:block bg-card rounded-[var(--radius)] border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold font-display text-foreground">Location</h3>
              </div>
              <MapLibreBuildingMap
                building={building}
                className="h-64"
              />
            </div>

            {/* News about this building */}
            <BuildingNews
              buildingId={building.id}
              buildingName={building.name}
              limit={4}
              showTitle={true}
            />

            {/* Additional information */}
            {(building.construction_materials && building.construction_materials.length > 0) && (
              <div className="bg-card rounded-[var(--radius)] border border-border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold font-display mb-3 sm:mb-4 text-foreground">Construction Materials</h3>
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

      {/* Image Lightbox */}
      <ImageLightbox
        images={galleryLightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
