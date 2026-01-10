'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, MapPin, Clock, Navigation, Star, Check, Headphones, CheckCircle, Award, Pencil } from 'lucide-react'
import { Route, RoutePoint, Building, BuildingReview } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamic map import
const DynamicMiniMap = dynamic(() => import('./RouteViewerMiniMap'), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-100 animate-pulse rounded-lg"></div>
})

// Dynamic AudioPlayer import
const AudioPlayer = dynamic(() => import('./AudioPlayer'), {
  ssr: false,
  loading: () => (
    <div className="h-24 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <Headphones className="h-6 w-6 text-gray-400 animate-pulse" />
    </div>
  )
})

interface RouteViewerModalProps {
  isOpen: boolean
  onClose: () => void
  route: Route | null
}

export default function RouteViewerModal({
  isOpen,
  onClose,
  route
}: RouteViewerModalProps) {
  // ✅ Create NEW Supabase client for this component
  const supabase = useMemo(() => createClient(), [])

  const { user, profile } = useAuth()
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [geolocationEnabled, setGeolocationEnabled] = useState(false)

  // Check edit permissions
  const canEdit = route && user && (
    user.id === route.created_by ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator'
  )

  // Debug permissions
  useEffect(() => {
    if (route) {
      console.log('🔐 RouteViewerModal - edit permissions:', {
        user: !!user,
        userId: user?.id,
        routeCreatedBy: route.created_by,
        profileRole: profile?.role,
        canEdit
      })
    }
  }, [route, user, profile, canEdit])

  // Reviews for current point
  const [reviews, setReviews] = useState<BuildingReview[]>([])
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set())
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [hoveredRating, setHoveredRating] = useState<{reviewId: string, rating: number} | null>(null)

  // Photo gallery
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Route export
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Load route points
  useEffect(() => {
    if (!route || !isOpen) {
      // Reset state on close
      if (!isOpen) {
        setRoutePoints([])
        setCurrentPointIndex(0)
        setReviews([])
        setSelectedReviewId(null)
      }
      return
    }

    console.log('🗺️ RouteViewerModal: Loading route', route.id, route.title)

    const loadRoutePoints = async () => {
      setLoading(true)
      try {
        console.log('🔄 Loading route points...')
        const { data, error } = await supabase
          .from('route_points')
          .select(`
            *,
            buildings (*)
          `)
          .eq('route_id', route.id)
          .order('order_index', { ascending: true })

        if (error) throw error
        console.log('✅ Route points loaded:', data?.length)
        setRoutePoints(data || [])
        setCurrentPointIndex(0) // Reset to first point
        setCurrentPhotoIndex(0) // Reset gallery
      } catch (error) {
        console.error('❌ Error loading route points:', error)
        toast.error('Error loading route points')
      } finally {
        setLoading(false)
      }
    }

    loadRoutePoints()
  }, [route?.id, isOpen])

  // Current point
  const currentPoint = useMemo(() => 
    routePoints[currentPointIndex] || null,
    [routePoints, currentPointIndex]
  )

  // Load reviews for current point
  useEffect(() => {
    if (!currentPoint || !currentPoint.building_id) {
      setReviews([])
      return
    }

    const loadReviews = async () => {
      setLoadingReviews(true)
      try {
        // Load reviews for building
        const { data: reviewsData, error } = await supabase
          .from('building_reviews')
          .select('*')
          .eq('building_id', currentPoint.building_id)

        if (error) throw error

        // Sort: Complete → Recommended → Verified → By Rating
        const sortedReviews = (reviewsData || []).sort((a, b) => {
          // Check for "Complete Review"
          const aIsFull = !!(a.content && a.content.length >= 200 && a.photos && a.photos.length >= 2 && a.audio_url)
          const bIsFull = !!(b.content && b.content.length >= 200 && b.photos && b.photos.length >= 2 && b.audio_url)
          
          if (aIsFull !== bIsFull) return aIsFull ? -1 : 1
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1
          return (b.rating || 0) - (a.rating || 0)
        })

        setReviews(sortedReviews)

        // Load user votes and ratings
        if (user) {
          // Helpful votes
          const { data: votesData } = await supabase
            .from('review_helpful_votes')
            .select('review_id')
            .eq('user_id', user.id)
            .in('review_id', sortedReviews.map(r => r.id))
          
          if (votesData) {
            setHelpfulVotes(new Set(votesData.map(v => v.review_id)))
          }

          // Ratings
          const { data: ratingsData } = await supabase
            .from('building_review_ratings')
            .select('review_id, rating')
            .eq('user_id', user.id)
            .in('review_id', sortedReviews.map(r => r.id))
          
          if (ratingsData) {
            setUserRatings(new Map(ratingsData.map(r => [r.review_id, r.rating])))
          }
        }

        // Load saved review selection
        if (user && route) {
          const { data: selectionData } = await supabase
            .from('route_point_review_selections')
            .select('building_review_id')
            .eq('user_id', user.id)
            .eq('route_id', route.id)
            .eq('route_point_id', currentPoint.id)
            .single()

          if (selectionData) {
            setSelectedReviewId(selectionData.building_review_id)
          } else {
            // Auto-select best review
            if (sortedReviews && sortedReviews.length > 0) {
              setSelectedReviewId(sortedReviews[0].id)
            }
          }
        } else if (sortedReviews && sortedReviews.length > 0) {
          // For unauthorized users - select best
          setSelectedReviewId(sortedReviews[0].id)
        }
      } catch (error) {
        console.error('Error loading reviews:', error)
      } finally {
        setLoadingReviews(false)
      }
    }

    loadReviews()
  }, [currentPoint, user, route])

  // Save review selection
  const handleSelectReview = async (reviewId: string) => {
    if (!user || !currentPoint || !route) {
      toast.error('Please log in to save your selection')
      return
    }

    try {
      // Upsert (update or insert)
      const { error } = await supabase
        .from('route_point_review_selections')
        .upsert({
          user_id: user.id,
          route_id: route.id,
          route_point_id: currentPoint.id,
          building_review_id: reviewId,
          selected_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,route_id,route_point_id'
        })

      if (error) throw error

      setSelectedReviewId(reviewId)
      toast.success('✅ Review selected!')
    } catch (error) {
      console.error('Error saving review selection:', error)
      toast.error('Error saving selection')
    }
  }

  // Mark review as "helpful"
  const handleToggleHelpful = async (reviewId: string) => {
    if (!user) {
      toast.error('Please log in')
      return
    }

    try {
      const isHelpful = helpfulVotes.has(reviewId)
      
      if (isHelpful) {
        // Remove vote
        await supabase
          .from('review_helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
        
        setHelpfulVotes(prev => {
          const newSet = new Set(prev)
          newSet.delete(reviewId)
          return newSet
        })
        
        // Update counter locally
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, helpful_count: Math.max(0, r.helpful_count - 1) } : r
        ))
      } else {
        // Add vote
        await supabase
          .from('review_helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: user.id
          })
        
        setHelpfulVotes(prev => new Set(prev).add(reviewId))
        
        // Update counter locally
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
        ))
        
        toast.success('👍 Marked as helpful!')
      }
    } catch (error) {
      console.error('Error toggling helpful:', error)
      toast.error('Error saving rating')
    }
  }

  // Rate review with stars (1-5)
  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) {
      toast.error('Please log in')
      return
    }

    try {
      await supabase
        .from('building_review_ratings')
        .upsert({
          review_id: reviewId,
          user_id: user.id,
          rating: rating
        }, {
          onConflict: 'review_id,user_id'
        })
      
      setUserRatings(prev => new Map(prev).set(reviewId, rating))
      toast.success(`⭐ Rating ${rating}/5 saved!`)
    } catch (error) {
      console.error('Error rating review:', error)
      toast.error('Error saving rating')
    }
  }

  // Selected review
  const selectedReview = useMemo(() => 
    reviews.find(r => r.id === selectedReviewId) || null,
    [reviews, selectedReviewId]
  )

  // All photos of current point (building + selected review)
  const currentPointPhotos = useMemo(() => {
    if (!currentPoint || !currentPoint.buildings) return []
    
    const photos: string[] = []
    
    // If review with photos is selected - show photos from review
    if (selectedReview && selectedReview.photos && Array.isArray(selectedReview.photos) && selectedReview.photos.length > 0) {
      photos.push(...selectedReview.photos)
    } else {
      // Otherwise show building photos
      // Add main photo
      if (currentPoint.buildings.image_url) {
        photos.push(currentPoint.buildings.image_url)
      }
      
      // Add additional photos (if they don't duplicate main)
      if (currentPoint.buildings.image_urls && Array.isArray(currentPoint.buildings.image_urls)) {
        const uniquePhotos = currentPoint.buildings.image_urls.filter(
          url => url !== currentPoint.buildings!.image_url
        )
        photos.push(...uniquePhotos)
      }
    }
    
    return photos
  }, [currentPoint, selectedReview])

  // Reset photo index and reviews list when point changes
  useEffect(() => {
    setCurrentPhotoIndex(0)
    setShowAllReviews(false)
  }, [currentPointIndex])

  // Navigation
  const goToPrevious = () => {
    if (currentPointIndex > 0) {
      setCurrentPointIndex(currentPointIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentPointIndex < routePoints.length - 1) {
      setCurrentPointIndex(currentPointIndex + 1)
    }
  }

  // Progress
  const progressPercent = useMemo(() => {
    if (routePoints.length === 0) return 0
    return ((currentPointIndex + 1) / routePoints.length) * 100
  }, [currentPointIndex, routePoints.length])

  // URL for route export
  const exportUrls = useMemo(() => {
    if (routePoints.length === 0) return { google: '', apple: '' }
    
    // Google Maps: first point as start, rest as waypoints
    const firstPoint = routePoints[0]
    const waypoints = routePoints.slice(1).map(p => `${p.latitude},${p.longitude}`).join('|')
    const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${firstPoint.latitude},${firstPoint.longitude}&waypoints=${waypoints}&travelmode=walking`
    
    // Apple Maps: first point as start, last as destination
    const lastPoint = routePoints[routePoints.length - 1]
    const appleUrl = `https://maps.apple.com/?saddr=${firstPoint.latitude},${firstPoint.longitude}&daddr=${lastPoint.latitude},${lastPoint.longitude}&dirflg=w`
    
    return { google: googleUrl, apple: appleUrl }
  }, [routePoints])

  if (!isOpen || !route) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4">
      {/* Modal window - compact */}
      <div className="bg-card rounded-[var(--radius)] md:rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] md:h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-6 border-b-2 border-border bg-card">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-2xl font-semibold font-display text-foreground truncate">
              {route.title}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 font-metrics">
              {route.city}, {route.country}
            </p>
          </div>
          
          {/* Geolocation and export */}
          <div className="flex items-center space-x-2 md:space-x-4 ml-2 md:ml-4">
            {/* Route export - now visible on mobile */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center px-2 md:px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-medium text-xs md:text-sm"
                title="Export route"
              >
                <Navigation className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export Route</span>
              </button>

              {/* Dropdown menu */}
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 md:w-48 bg-card rounded-[var(--radius)] shadow-xl border-2 border-border py-2 z-[60]">
                  <a
                    href={exportUrls.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 md:px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <span className="text-base md:text-lg mr-2 md:mr-3">🗺️</span>
                    <span className="text-xs md:text-sm font-medium text-foreground">Google Maps</span>
                  </a>
                  <a
                    href={exportUrls.apple}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 md:px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <span className="text-base md:text-lg mr-2 md:mr-3">🍎</span>
                    <span className="text-xs md:text-sm font-medium text-foreground">Apple Maps</span>
                  </a>
                </div>
              )}
            </div>

            {/* Geolocation - now visible on mobile */}
            <div className="flex items-center space-x-1 md:space-x-2">
              <span className="hidden md:inline text-xs md:text-sm text-muted-foreground">Geolocation:</span>
              <button
                onClick={() => setGeolocationEnabled(!geolocationEnabled)}
                className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors ${
                  geolocationEnabled ? 'bg-primary' : 'bg-muted'
                }`}
                title={geolocationEnabled ? 'Geolocation enabled' : 'Geolocation disabled'}
              >
                <span
                  className={`inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${
                    geolocationEnabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Edit button (for creator/admin/moderator) */}
            {canEdit && (
              <button
                onClick={() => {
                  console.log('🔧 Opening route editing:', route.id)
                  window.open(`/routes/${route.id}/edit`, '_blank')
                }}
                className="p-1.5 md:p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
                title="Edit route"
              >
                <Pencil className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
            >
              <X className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Points list - hidden on mobile */}
          <div className="hidden md:block w-64 border-r-2 border-border bg-background overflow-y-auto flex-shrink-0">
            <div className="p-4">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium font-display text-foreground">Progress</span>
                  <span className="text-sm text-muted-foreground font-metrics">
                    {currentPointIndex + 1} / {routePoints.length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Route statistics */}
              <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 mb-4 shadow-sm">
                <h3 className="font-semibold font-display text-foreground mb-3">Route</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Points:</span>
                    <span className="font-medium font-metrics text-foreground">{routePoints.length}</span>
                  </div>
                  {route.distance_km && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium font-metrics text-foreground">{route.distance_km.toFixed(1)} km</span>
                    </div>
                  )}
                  {route.estimated_duration_minutes && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium font-metrics text-foreground">
                        {Math.floor(route.estimated_duration_minutes / 60)}h {route.estimated_duration_minutes % 60}m
                      </span>
                    </div>
                  )}
                  {route.transport_mode && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium text-foreground capitalize">{route.transport_mode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Points list */}
              <div className="space-y-2">
                <h3 className="font-semibold font-display text-foreground mb-3">Route Points</h3>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted rounded-[var(--radius)] animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  routePoints.map((point, index) => {
                    const isCurrent = index === currentPointIndex
                    const isPassed = index < currentPointIndex

                    return (
                      <button
                        key={point.id}
                        onClick={() => setCurrentPointIndex(index)}
                        className={`w-full p-3 rounded-[var(--radius)] border-2 transition-all text-left ${
                          isCurrent
                            ? 'border-primary bg-primary/5'
                            : isPassed
                            ? 'border-border bg-muted'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Number/Status */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 font-metrics ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isPassed
                              ? 'bg-primary/60 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {isPassed ? <Check className="w-4 h-4" /> : index + 1}
                          </div>

                          {/* Information */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate text-sm">
                              {point.title}
                            </div>
                            {point.estimated_time_minutes && (
                              <div className="text-xs text-muted-foreground flex items-center mt-1 font-metrics">
                                <Clock className="w-3 h-3 mr-1" />
                                {point.estimated_time_minutes} min
                              </div>
                            )}
                          </div>

                          {/* Current indicator */}
                          {isCurrent && (
                            <div className="flex-shrink-0">
                              <Navigation className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Current point details */}
          <div className="flex-1 overflow-y-auto bg-card">
            {loading ? (
              <div className="p-4 md:p-8 space-y-4">
                <div className="h-6 md:h-8 bg-muted rounded animate-pulse w-1/3"></div>
                <div className="h-48 md:h-64 bg-muted rounded animate-pulse"></div>
                <div className="h-24 md:h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : currentPoint ? (
              <div className="p-4 md:p-8">
                {/* Building photo gallery */}
                {currentPointPhotos.length > 0 && (
                  <div className="mb-4 md:mb-6 relative rounded-[var(--radius)] overflow-hidden shadow-lg group">
                    <img
                      src={getStorageUrl(currentPointPhotos[currentPhotoIndex], 'photos')}
                      alt={`${currentPoint.title} - photo ${currentPhotoIndex + 1}`}
                      className="w-full h-48 md:h-80 object-cover"
                    />

                    {/* Photo counter */}
                    {currentPointPhotos.length > 1 && (
                      <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black/60 text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium font-metrics">
                        {currentPhotoIndex + 1} / {currentPointPhotos.length}
                      </div>
                    )}

                    {/* Navigation arrows */}
                    {currentPointPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPhotoIndex(prev =>
                            prev === 0 ? currentPointPhotos.length - 1 : prev - 1
                          )}
                          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground rounded-full p-2 md:p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        <button
                          onClick={() => setCurrentPhotoIndex(prev =>
                            prev === currentPointPhotos.length - 1 ? 0 : prev + 1
                          )}
                          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground rounded-full p-2 md:p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                      </>
                    )}

                    {/* Indicator dots */}
                    {currentPointPhotos.length > 1 && currentPointPhotos.length <= 10 && (
                      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 md:space-x-2">
                        {currentPointPhotos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${
                              index === currentPhotoIndex
                                ? 'bg-white w-6 md:w-8'
                                : 'bg-white/60 hover:bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Point information */}
                <div className="mb-4 md:mb-6">
                  <h3 className="text-xl md:text-3xl font-bold font-display text-foreground mb-2">
                    {currentPoint.title}
                  </h3>

                  {currentPoint.buildings && (
                    <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                      {currentPoint.buildings.address && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          {currentPoint.buildings.address}
                        </div>
                      )}
                      {currentPoint.estimated_time_minutes && (
                        <div className="flex items-center font-metrics">
                          <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          {currentPoint.estimated_time_minutes} min
                        </div>
                      )}
                      {currentPoint.buildings.rating && (
                        <div className="flex items-center font-metrics">
                          <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 text-yellow-400" />
                          {currentPoint.buildings.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review text (if selected) or building description */}
                  {selectedReview && selectedReview.content ? (
                    <div className="prose max-w-none mb-4">
                      <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-line">
                        {selectedReview.content}
                      </p>
                      {selectedReview.tags && selectedReview.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedReview.tags.map((tag, idx) => (
                            <span key={idx} className="bg-muted text-foreground px-2 py-1 rounded-full text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : currentPoint.description && (
                    <div className="prose max-w-none mb-4">
                      <p className="text-sm md:text-base text-foreground leading-relaxed">
                        {currentPoint.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reviews section */}
                <div className="mb-4 md:mb-6">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h4 className="text-lg md:text-xl font-semibold font-display text-foreground">
                      📝 Reviews {reviews.length > 0 && `(${reviews.length})`}
                    </h4>
                    {reviews.length > 0 && (
                      <div className="text-xs md:text-sm text-muted-foreground font-metrics">
                        {reviews.filter(r => r.audio_url).length} with audio
                      </div>
                    )}
                  </div>

                  {loadingReviews ? (
                    <div className="space-y-2 md:space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="h-20 md:h-24 bg-muted rounded-[var(--radius)] animate-pulse"></div>
                      ))}
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="bg-muted border-2 border-border rounded-[var(--radius)] p-4 md:p-6 text-center">
                      <p className="text-sm md:text-base text-muted-foreground">
                        📭 No reviews yet for this object
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 md:space-y-3">
                        {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => {
                        const isSelected = review.id === selectedReviewId

                        // Check for "Complete Review"
                        const isFullReview = !!(
                          review.content && review.content.length >= 200 &&
                          review.photos && review.photos.length >= 2 &&
                          review.audio_url
                        )

                        return (
                          <div
                            key={review.id}
                            onClick={() => !isSelected && handleSelectReview(review.id)}
                            className={`border-2 rounded-[var(--radius)] p-3 md:p-4 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer'
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                              <div className="flex items-center flex-wrap gap-1.5 md:gap-2">
                                {/* User ratings */}
                                {review.user_rating_count > 0 && (
                                  <div className="flex items-center bg-yellow-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                                    <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-yellow-400 mr-0.5 md:mr-1" />
                                    <span className="text-xs md:text-sm font-semibold text-foreground font-metrics">
                                      {review.user_rating_avg.toFixed(1)}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-1 font-metrics">
                                      ({review.user_rating_count})
                                    </span>
                                  </div>
                                )}

                                {/* Полный обзор - ГЛАВНЫЙ бейдж */}
                                {isFullReview && (
                                  <span className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-bold border border-yellow-300">
                                    ⭐ COMPLETE
                                  </span>
                                )}

                                {/* Остальные бейджи */}
                                {review.audio_url && (
                                  <span className="flex items-center bg-purple-50 text-purple-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                    <Headphones className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                    <span className="hidden md:inline">Audio</span>
                                  </span>
                                )}
                                {review.is_verified && (
                                  <span className="flex items-center bg-green-50 text-green-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                    <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                    <span className="hidden md:inline">Verified</span>
                                  </span>
                                )}
                                {review.is_featured && (
                                  <span className="flex items-center bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                    <Award className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                    <span className="hidden md:inline">Recommended</span>
                                  </span>
                                )}
                                {review.review_type === 'expert' && (
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                    👨‍🎓 <span className="hidden md:inline">Expert</span>
                                  </span>
                                )}
                                {review.review_type === 'historical' && (
                                  <span className="bg-amber-50 text-amber-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                    📜 <span className="hidden md:inline">Historical</span>
                                  </span>
                                )}
                              </div>

                              {isSelected && (
                                <span className="flex items-center text-primary text-xs md:text-sm font-medium">
                                  <Check className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                  <span className="hidden md:inline">Selected</span>
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            {review.title && (
                              <h5 className="font-semibold font-display text-foreground mb-1 md:mb-2 text-sm md:text-base">
                                {review.title}
                              </h5>
                            )}

                            {/* Text preview */}
                            {review.content && (
                              <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 line-clamp-2">
                                {review.content}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center space-x-2 md:space-x-3 text-xs text-muted-foreground mb-2 md:mb-3 font-metrics">
                              {review.audio_duration_seconds && (
                                <span className="flex items-center">
                                  <Headphones className="w-3 h-3 mr-1" />
                                  {Math.floor(review.audio_duration_seconds / 60)} min
                                </span>
                              )}
                              {review.content && (
                                <span>
                                  ~{Math.round(review.content.length / 5)} words
                                </span>
                              )}
                            </div>

                            {/* Review rating */}
                            <div className="border-t border-border pt-2 md:pt-3 flex items-center justify-between flex-wrap gap-2 md:gap-3">
                              {/* Звезды для оценки */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs text-muted-foreground mb-1 hidden md:block">Rate review:</p>
                                <div className="flex items-center space-x-0.5 md:space-x-1">
                                  {[1, 2, 3, 4, 5].map(star => {
                                    const userRating = userRatings.get(review.id) || 0
                                    const isActive = userRating >= star || (hoveredRating?.reviewId === review.id && hoveredRating.rating >= star)

                                    return (
                                      <button
                                        key={star}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRateReview(review.id, star)
                                        }}
                                        onMouseEnter={() => setHoveredRating({ reviewId: review.id, rating: star })}
                                        onMouseLeave={() => setHoveredRating(null)}
                                        className="p-0.5 transition-transform hover:scale-110"
                                      >
                                        <Star
                                          className={`w-3 h-3 md:w-4 md:h-4 transition-colors ${
                                            isActive
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'text-muted-foreground/30'
                                          }`}
                                        />
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* "Helpful" button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleHelpful(review.id)
                                }}
                                className={`flex items-center px-2 py-1 rounded transition-all ${
                                  helpfulVotes.has(review.id)
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-muted text-muted-foreground'
                                }`}
                                title={helpfulVotes.has(review.id) ? 'Remove rating' : 'Mark as helpful'}
                              >
                                <span className="mr-1">{helpfulVotes.has(review.id) ? '👍' : '👍🏻'}</span>
                                <span className="text-xs font-metrics">{review.helpful_count}</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      </div>

                      {/* Кнопка показать еще обзоры */}
                      {reviews.length > 3 && (
                        <div className="text-center mt-3 md:mt-4">
                          <button
                            onClick={() => setShowAllReviews(!showAllReviews)}
                            className="px-3 md:px-4 py-1.5 md:py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors font-medium text-xs md:text-sm"
                          >
                            {showAllReviews ? (
                              <>↑ Collapse reviews</>
                            ) : (
                              <>↓ Show {reviews.length - 3} more reviews</>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Audio player (if review with audio is selected) */}
                {selectedReview && selectedReview.audio_url && (
                  <div className="mb-4 md:mb-6">
                    <h4 className="text-lg md:text-xl font-semibold font-display text-foreground mb-3 md:mb-4">
                      🎧 Audio Review
                    </h4>
                    <AudioPlayer
                      audioUrl={getStorageUrl(selectedReview.audio_url, 'audio')}
                      title={selectedReview.title || currentPoint.title}
                      onPositionChange={async (position) => {
                        // Save position to DB
                        if (user && currentPoint) {
                          await supabase
                            .from('route_point_review_selections')
                            .update({
                              audio_position_seconds: Math.floor(position),
                              last_listened_at: new Date().toISOString()
                            })
                            .eq('user_id', user.id)
                            .eq('route_id', route!.id)
                            .eq('route_point_id', currentPoint.id)
                        }
                      }}
                      initialPosition={0}
                    />
                  </div>
                )}

                {/* Mini-map */}
                <div className="mb-4 md:mb-6">
                  <h4 className="text-lg md:text-xl font-semibold font-display text-foreground mb-3 md:mb-4">
                    🗺️ Map
                  </h4>
                  <div className="h-48 md:h-64 rounded-[var(--radius)] overflow-hidden border-2 border-border">
                    <DynamicMiniMap
                      route={route}
                      routePoints={routePoints}
                      currentPointIndex={currentPointIndex}
                      geolocationEnabled={geolocationEnabled}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-8 text-center text-muted-foreground">
                Select a route point
              </div>
            )}
          </div>
        </div>

        {/* Route preview for mobile version */}
        <div className="md:hidden border-t-2 border-border bg-background p-3">
          <h4 className="text-sm font-semibold font-display text-foreground mb-2">
            Route ({routePoints.length} points)
          </h4>
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {routePoints.map((point, index) => {
              const isCurrent = index === currentPointIndex
              const isPassed = index < currentPointIndex

              return (
                <button
                  key={point.id}
                  onClick={() => setCurrentPointIndex(index)}
                  className={`flex-shrink-0 w-20 transition-all ${
                    isCurrent ? 'scale-105' : isPassed ? 'opacity-40' : ''
                  }`}
                >
                  <div className={`relative rounded-[var(--radius)] border-2 overflow-hidden ${
                    isCurrent
                      ? 'border-primary shadow-md'
                      : isPassed
                      ? 'border-border bg-muted'
                      : 'border-border'
                  }`}>
                    {/* Миниатюра или placeholder */}
                    {point.buildings?.image_url ? (
                      <img
                        src={getStorageUrl(point.buildings.image_url, 'photos')}
                        alt={point.title}
                        className={`w-full h-16 object-cover ${isPassed ? 'grayscale' : ''}`}
                      />
                    ) : (
                      <div className={`w-full h-16 bg-muted flex items-center justify-center ${
                        isPassed ? 'opacity-50' : ''
                      }`}>
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Номер точки */}
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-metrics ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isPassed
                        ? 'bg-muted-foreground/60 text-white'
                        : 'bg-card text-foreground border border-border'
                    }`}>
                      {isPassed ? <Check className="w-3 h-3" /> : index + 1}
                    </div>

                    {/* Индикатор текущей */}
                    {isCurrent && (
                      <div className="absolute top-1 right-1">
                        <Navigation className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Название точки */}
                  <div className={`mt-1 text-xs font-medium text-center truncate ${
                    isCurrent
                      ? 'text-primary'
                      : isPassed
                      ? 'text-muted-foreground'
                      : 'text-foreground'
                  }`}>
                    {point.title}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer: Навигация */}
        <div className="flex items-center justify-between p-3 md:p-6 border-t-2 border-border bg-card">
          <button
            onClick={goToPrevious}
            disabled={currentPointIndex === 0}
            className="flex items-center space-x-1 md:space-x-2 px-3 md:px-6 py-2 md:py-3 bg-card border-2 border-border text-foreground rounded-[var(--radius)] font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline">Previous</span>
          </button>

          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold font-display text-foreground">
              {currentPointIndex + 1} <span className="text-muted-foreground">of</span> {routePoints.length}
            </div>
            {currentPoint && (
              <div className="text-xs md:text-sm text-muted-foreground mt-1 truncate max-w-[120px] md:max-w-none">
                {currentPoint.title}
              </div>
            )}
          </div>

          <button
            onClick={goToNext}
            disabled={currentPointIndex === routePoints.length - 1}
            className="flex items-center space-x-1 md:space-x-2 px-3 md:px-6 py-2 md:py-3 bg-primary text-primary-foreground rounded-[var(--radius)] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

