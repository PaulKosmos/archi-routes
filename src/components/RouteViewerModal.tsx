'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, MapPin, Clock, Navigation, Star, Check, Headphones, CheckCircle, Award, Pencil, Trash2, Share2, MessageSquare, GraduationCap, Scroll, Map as MapIcon, Inbox, Trophy, Globe } from 'lucide-react'
import { Route, RoutePoint, Building, BuildingReview } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import AddRouteReviewModal from './routes/AddRouteReviewModal'
import ReviewTranslationTabs from './buildings/ReviewTranslationTabs'
import ReviewCommentsModal from './buildings/ReviewCommentsModal'
import RouteReviewCommentsModal from './routes/RouteReviewCommentsModal'

// Dynamic MapLibre mini-map import (migrated from Leaflet)
const DynamicMiniMap = dynamic(() => import('./MapLibreRouteViewer'), {
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

const LANG_LABELS: Record<string, string> = {
  en: '🇬🇧 EN', de: '🇩🇪 DE', es: '🇪🇸 ES',
  fr: '🇫🇷 FR', zh: '🇨🇳 ZH', ar: '🇸🇦 AR', ru: '🇷🇺 RU',
}

interface RouteViewerModalProps {
  isOpen: boolean
  onClose: () => void
  route: Route | null
  onDelete?: () => void
}

export default function RouteViewerModal({
  isOpen,
  onClose,
  route,
  onDelete
}: RouteViewerModalProps) {
  // ✅ Create NEW Supabase client for this component
  const supabase = useMemo(() => createClient(), [])

  const { user, profile } = useAuth()
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const [showMapSheet, setShowMapSheet] = useState(false)
  const [geolocationEnabled, setGeolocationEnabled] = useState(false)

  // Check edit permissions
  const canEdit = route && user && (
    user.id === route.created_by ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator'
  )

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!route) return
    setIsDeleting(true)
    try {
      await supabase.from('route_points').delete().eq('route_id', route.id)
      const { error } = await supabase.from('routes').delete().eq('id', route.id)
      if (error) throw error
      toast.success('Route deleted')
      onDelete?.()
      onClose()
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

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
  const [reviewTextExpanded, setReviewTextExpanded] = useState(false)
  const [displayLanguage, setDisplayLanguage] = useState('all')
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [hoveredRating, setHoveredRating] = useState<{ reviewId: string, rating: number } | null>(null)

  // Photo gallery
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Touch swipe for gallery (same as BuildingModalNew)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleGalleryTouchEnd = (e: React.TouchEvent, total: number) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) {
      setCurrentPhotoIndex(prev => (prev < total - 1 ? prev + 1 : 0))
    } else {
      setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : total - 1))
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Route export
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Route reviews state (reviews about the route itself)
  const [routeReviews, setRouteReviews] = useState<any[]>([])
  const [showAddRouteReviewModal, setShowAddRouteReviewModal] = useState(false)
  const [showAllRouteReviews, setShowAllRouteReviews] = useState(false)

  // Comments modals state
  const [buildingReviewCommentsModal, setBuildingReviewCommentsModal] = useState<{
    id: string; title: string; author: string
  } | null>(null)
  const [routeReviewCommentsModal, setRouteReviewCommentsModal] = useState<{
    id: string; title: string; author: string
  } | null>(null)
  const [buildingReviewCommentCounts, setBuildingReviewCommentCounts] = useState<Map<string, number>>(new Map())
  const [routeReviewCommentCounts, setRouteReviewCommentCounts] = useState<Map<string, number>>(new Map())

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
    loadRouteReviews()
  }, [route?.id, isOpen])

  // Load route reviews (reviews for the route itself)
  const loadRouteReviews = async () => {
    if (!route) return
    try {
      const { data, error } = await supabase
        .from('route_reviews')
        .select(`
          id, rating, title, content, completion_time_minutes, created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq('route_id', route.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (!error && data) {
        setRouteReviews(data)
        // Load route review comment counts
        if (data.length > 0) {
          const { data: commentsData } = await supabase
            .from('route_review_comments')
            .select('review_id')
            .in('review_id', data.map((r: any) => r.id))
          if (commentsData) {
            const counts = new Map<string, number>()
            commentsData.forEach((c: any) => counts.set(c.review_id, (counts.get(c.review_id) || 0) + 1))
            setRouteReviewCommentCounts(counts)
          }
        }
      }
    } catch (error) {
      console.error('Error loading route reviews:', error)
    }
  }

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

        // Load building review comment counts
        if (sortedReviews.length > 0) {
          const { data: commentsData } = await supabase
            .from('building_review_comments')
            .select('review_id')
            .in('review_id', sortedReviews.map(r => r.id))
          if (commentsData) {
            const counts = new Map<string, number>()
            commentsData.forEach(c => counts.set(c.review_id, (counts.get(c.review_id) || 0) + 1))
            setBuildingReviewCommentCounts(counts)
          }
        }

        // Load user ratings
        if (user) {
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
    // Optimistic update — UI responds immediately
    setSelectedReviewId(reviewId)
    setReviewTextExpanded(false)

    if (!user || !currentPoint || !route) return

    try {
      // Try UPDATE first (existing selection for this point)
      const { data: updated, error: updateError } = await supabase
        .from('route_point_review_selections')
        .update({ building_review_id: reviewId, selected_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('route_id', route.id)
        .eq('route_point_id', currentPoint.id)
        .select('id')

      if (updateError) throw updateError

      // No existing row — INSERT
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('route_point_review_selections')
          .insert({
            user_id: user.id,
            route_id: route.id,
            route_point_id: currentPoint.id,
            building_review_id: reviewId,
            selected_at: new Date().toISOString()
          })
        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error saving review selection:', error)
    }
  }

  // Rate review with stars (1-5)
  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) {
      toast.error('Please log in')
      return
    }

    try {
      const existingRating = userRatings.get(reviewId)

      if (existingRating) {
        const { error } = await supabase
          .from('building_review_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('review_id', reviewId)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error updating review rating:', error.message, error.code, error.details)
          toast.error(`Error saving rating: ${error.message}`)
          return
        }
      } else {
        const { error } = await supabase
          .from('building_review_ratings')
          .insert({
            review_id: reviewId,
            user_id: user.id,
            rating
          })

        if (error) {
          console.error('Error inserting review rating:', error.message, error.code, error.details)
          toast.error(`Error saving rating: ${error.message}`)
          return
        }
      }

      const oldRating = userRatings.get(reviewId)
      setUserRatings(prev => new Map(prev).set(reviewId, rating))

      // Update local review's avg/count to reflect immediately in UI
      setReviews(prev => prev.map(r => {
        if (r.id !== reviewId) return r
        const oldAvg = r.user_rating_avg || 0
        const oldCount = r.user_rating_count || 0
        let newCount: number
        let newAvg: number
        if (oldRating) {
          newCount = oldCount
          newAvg = oldCount > 0 ? (oldAvg * oldCount - oldRating + rating) / oldCount : rating
        } else {
          newCount = oldCount + 1
          newAvg = (oldAvg * oldCount + rating) / newCount
        }
        return { ...r, user_rating_avg: newAvg, user_rating_count: newCount }
      }))

      toast.success(`Rating ${rating}/5 saved!`)
    } catch (error: any) {
      console.error('Error rating review:', error?.message || JSON.stringify(error))
      toast.error('Error saving rating')
    }
  }

  // Selected review
  const selectedReview = useMemo(() =>
    reviews.find(r => r.id === selectedReviewId) || null,
    [reviews, selectedReviewId]
  )

  // All photos of current point: building cover + all review photos (same as BuildingModalNew)
  const currentPointPhotos = useMemo(() => {
    if (!currentPoint || !currentPoint.buildings) return []

    const photos: string[] = []

    // Building cover photo first
    if (currentPoint.buildings.image_url) {
      photos.push(currentPoint.buildings.image_url)
    }

    // Additional building photos (deduplicated)
    if (currentPoint.buildings.image_urls && Array.isArray(currentPoint.buildings.image_urls)) {
      const unique = currentPoint.buildings.image_urls.filter(
        url => url !== currentPoint.buildings!.image_url
      )
      photos.push(...unique)
    }

    // Then all review photos from all reviews
    const reviewPhotos = reviews.flatMap(r =>
      r.photos && Array.isArray(r.photos) ? r.photos : []
    )
    photos.push(...reviewPhotos)

    return photos
  }, [currentPoint, reviews])

  // Reset photo index and reviews list when point changes
  useEffect(() => {
    setCurrentPhotoIndex(0)
    setShowAllReviews(false)
  }, [currentPointIndex])

  // Auto-scroll mobile carousel to keep active card visible
  useEffect(() => {
    const container = mobileScrollRef.current
    if (!container) return
    const activeCard = container.children[currentPointIndex] as HTMLElement
    if (!activeCard) return
    const containerWidth = container.offsetWidth
    const cardLeft = activeCard.offsetLeft
    const cardWidth = activeCard.offsetWidth
    container.scrollTo({
      left: cardLeft - containerWidth / 2 + cardWidth / 2,
      behavior: 'smooth'
    })
    setReviewTextExpanded(false)
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

    const firstPoint = routePoints[0]
    const lastPoint = routePoints[routePoints.length - 1]

    // Google Maps: origin + destination + intermediate waypoints
    const middlePoints = routePoints.slice(1, -1)
    const waypointsParam = middlePoints.length > 0
      ? `&waypoints=${middlePoints.map(p => `${p.latitude},${p.longitude}`).join('|')}`
      : ''
    const googleUrl = routePoints.length === 1
      ? `https://www.google.com/maps/search/?api=1&query=${firstPoint.latitude},${firstPoint.longitude}`
      : `https://www.google.com/maps/dir/?api=1&origin=${firstPoint.latitude},${firstPoint.longitude}&destination=${lastPoint.latitude},${lastPoint.longitude}${waypointsParam}&travelmode=walking`

    // Apple Maps: chain all points with +to: for intermediate stops
    let appleUrl: string
    if (routePoints.length === 1) {
      appleUrl = `https://maps.apple.com/?ll=${firstPoint.latitude},${firstPoint.longitude}&q=${encodeURIComponent(firstPoint.title || 'Point')}`
    } else if (routePoints.length === 2) {
      appleUrl = `https://maps.apple.com/?saddr=${firstPoint.latitude},${firstPoint.longitude}&daddr=${lastPoint.latitude},${lastPoint.longitude}&dirflg=w`
    } else {
      // Apple Maps supports multiple destinations via +to: syntax
      const destinations = routePoints.slice(1).map(p => `${p.latitude},${p.longitude}`).join('+to:')
      appleUrl = `https://maps.apple.com/?saddr=${firstPoint.latitude},${firstPoint.longitude}&daddr=${destinations}&dirflg=w`
    }

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
                <Share2 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export Route</span>
              </button>

              {/* Dropdown menu */}
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 md:w-48 bg-card rounded-[var(--radius)] shadow-xl border-2 border-border py-2 z-[60]">
                  <button
                    className="flex items-center w-full px-3 md:px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => {
                      const url = `${window.location.origin}/routes/${route.id}`
                      navigator.clipboard.writeText(url).then(() => {
                        toast.success('Link copied!')
                      }).catch(() => {
                        toast.error('Failed to copy link')
                      })
                      setShowExportMenu(false)
                    }}
                  >
                    <span className="text-xs md:text-sm font-medium text-foreground">Copy Link</span>
                  </button>
                  <div className="border-t border-border my-1" />
                  <a
                    href={exportUrls.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 md:px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <span className="text-xs md:text-sm font-medium text-foreground">Google Maps</span>
                  </a>
                  <a
                    href={exportUrls.apple}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 md:px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowExportMenu(false)}
                  >
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
                className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors ${geolocationEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                title={geolocationEnabled ? 'Geolocation enabled' : 'Geolocation disabled'}
              >
                <span
                  className={`inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${geolocationEnabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* Edit + Delete buttons (for creator/admin/moderator) */}
            {canEdit && (
              <>
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
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 md:p-2 hover:bg-red-50 rounded-[var(--radius)] transition-colors"
                  title="Delete route"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                </button>
              </>
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

              {/* Route Reviews - only for published routes */}
              {route.is_published && (
                <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 mb-4 shadow-sm">
                  <div
                    className="cursor-pointer hover:bg-muted/50 -m-4 p-4 rounded-[var(--radius)] transition-colors"
                    onClick={() => setShowAllRouteReviews(true)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold font-display text-foreground flex items-center gap-1">
                        <Star className="w-4 h-4" style={{ fill: '#facc15', color: '#facc15' }} />
                        Route Reviews
                      </h3>
                      {(route.rating ?? 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-foreground">{Number(route.rating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({route.review_count || 0})</span>
                        </div>
                      )}
                    </div>

                    {routeReviews.length > 0 ? (
                      <div className="space-y-2">
                        {routeReviews.slice(0, 3).map((review) => (
                          <div key={review.id} className="text-xs border border-border rounded p-2 bg-background">
                            <div className="flex items-center gap-1 mb-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className="w-3 h-3" style={s <= review.rating ? { fill: '#facc15', color: '#facc15' } : { color: 'var(--muted)' }} />
                              ))}
                            </div>
                            {review.title && (
                              <p className="font-medium text-foreground mb-1">{review.title}</p>
                            )}
                            {review.content && (
                              <p className="text-muted-foreground line-clamp-2">{review.content}</p>
                            )}
                          </div>
                        ))}
                        {routeReviews.length > 3 && (
                          <p className="text-primary text-xs mt-1 text-center">+ {routeReviews.length - 3} more reviews</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No reviews yet. Be the first!</p>
                    )}
                  </div>

                  {user && (
                    <button
                      onClick={() => setShowAddRouteReviewModal(true)}
                      className="w-full mt-3 py-2 px-3 bg-primary text-primary-foreground text-sm font-medium rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                    >
                      Write Review
                    </button>
                  )}
                </div>
              )}

              {/* Route Reviews Modal */}
              {showAllRouteReviews && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAllRouteReviews(false)} />
                  <div className="relative bg-card border border-border rounded-[var(--radius)] w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl">
                    <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Route Reviews</h2>
                      <button onClick={() => setShowAllRouteReviews(false)} className="p-2 hover:bg-muted rounded-[var(--radius)]">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      {routeReviews.length > 0 ? (
                        routeReviews.map((review) => (
                          <div key={review.id} className="border border-border rounded-[var(--radius)] p-3 bg-background">
                            <div className="flex items-center gap-2 mb-2">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className="w-4 h-4" style={s <= review.rating ? { fill: '#facc15', color: '#facc15' } : { color: 'var(--muted)' }} />
                              ))}
                            </div>
                            {review.title && (
                              <h4 className="font-medium text-foreground mb-1">{review.title}</h4>
                            )}
                            {review.content && (
                              <p className="text-sm text-muted-foreground">{review.content}</p>
                            )}
                            {review.profiles && (
                              <p className="text-xs text-muted-foreground mt-2">
                                — {review.profiles.full_name || review.profiles.username || 'Anonymous'}
                              </p>
                            )}
                            <div className="border-t border-border pt-2 mt-2 flex justify-end">
                              <button
                                onClick={() => setRouteReviewCommentsModal({
                                  id: review.id,
                                  title: review.title || 'Review',
                                  author: review.profiles?.full_name || review.profiles?.username || 'Author'
                                })}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {routeReviewCommentCounts.get(review.id)
                                  ? `Comments (${routeReviewCommentCounts.get(review.id)})`
                                  : 'Comments'}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No reviews yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                        className={`w-full p-3 rounded-[var(--radius)] border-2 transition-all text-left ${isCurrent
                          ? 'border-primary bg-primary/5'
                          : isPassed
                            ? 'border-border bg-muted'
                            : 'border-border bg-card hover:border-primary/50'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Number/Status */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 font-metrics ${isCurrent
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
                  <div
                    className="mb-4 md:mb-6 relative rounded-[var(--radius)] overflow-hidden shadow-lg group"
                    onTouchStart={handleGalleryTouchStart}
                    onTouchEnd={(e) => handleGalleryTouchEnd(e, currentPointPhotos.length)}
                  >
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

                    {/* Navigation arrows — always visible on mobile, hover on desktop */}
                    {currentPointPhotos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPhotoIndex(prev =>
                              prev === 0 ? currentPointPhotos.length - 1 : prev - 1
                            )
                          }}
                          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1.5 md:p-2 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPhotoIndex(prev =>
                              prev === currentPointPhotos.length - 1 ? 0 : prev + 1
                            )
                          }}
                          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1.5 md:p-2 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                      </>
                    )}

                    {/* Indicator dots */}
                    {currentPointPhotos.length > 1 && (
                      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-2">
                        {currentPointPhotos.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentPhotoIndex(index)
                            }}
                            className={`h-1.5 md:h-2 rounded-full transition-all ${index === currentPhotoIndex
                              ? 'bg-white w-6 md:w-8'
                              : 'bg-white/60 hover:bg-white/80 w-1.5 md:w-2'
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
                      {Number(currentPoint.buildings.rating) > 0 && (
                        <div className="flex items-center font-metrics">
                          <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 text-yellow-400" />
                          {Number(currentPoint.buildings.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review text (if selected) or building description */}
                  {selectedReview && selectedReview.content ? (
                    <div className="mb-4">
                      <ReviewTranslationTabs
                        reviewId={selectedReview.id}
                        originalLanguage={selectedReview.original_language || selectedReview.language || 'en'}
                        originalTitle={selectedReview.title || null}
                        originalContent={selectedReview.content || ''}
                        originalAudioUrl={selectedReview.audio_url || null}
                        preferredLanguage={displayLanguage}
                        isExpanded={reviewTextExpanded}
                        onToggleExpand={() => setReviewTextExpanded(v => !v)}
                      />
                      {selectedReview.tags && selectedReview.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
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
                  <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
                    <h4 className="text-lg md:text-xl font-semibold font-display text-foreground flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 flex-shrink-0" />
                      Reviews {reviews.length > 0 && `(${reviews.length})`}
                    </h4>
                    {reviews.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        <select
                          value={displayLanguage}
                          onChange={(e) => setDisplayLanguage(e.target.value)}
                          className="text-xs border border-border rounded-[var(--radius)] px-2 py-1 bg-card text-foreground cursor-pointer"
                        >
                          <option value="all">Original</option>
                          {(['en','de','es','fr','zh','ar','ru'] as const).map(lang => (
                            <option key={lang} value={lang}>{LANG_LABELS[lang]}</option>
                          ))}
                        </select>
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
                      <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm md:text-base text-muted-foreground">
                        No reviews yet for this object
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
                              className={`border-2 rounded-[var(--radius)] p-3 md:p-4 transition-all ${isSelected
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
                                      <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                      <span className="hidden md:inline">COMPLETE</span>
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
                                    <span className="flex items-center bg-indigo-50 text-indigo-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                      <GraduationCap className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                      <span className="hidden md:inline">Expert</span>
                                    </span>
                                  )}
                                  {review.review_type === 'historical' && (
                                    <span className="flex items-center bg-amber-50 text-amber-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
                                      <Scroll className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                      <span className="hidden md:inline">Historical</span>
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

                              {/* Title + text preview — translated when a language is selected */}
                              {(review.title || review.content) && (
                                <div className="mb-2 md:mb-3" onClick={e => e.stopPropagation()}>
                                  <ReviewTranslationTabs
                                    reviewId={review.id}
                                    originalLanguage={review.original_language || review.language || 'en'}
                                    originalTitle={review.title || null}
                                    originalContent={review.content || ''}
                                    originalAudioUrl={review.audio_url || null}
                                    preferredLanguage={displayLanguage}
                                    compact
                                  />
                                </div>
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
                                            className={`w-3 h-3 md:w-4 md:h-4 transition-colors ${isActive
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'text-muted-foreground/30'
                                              }`}
                                          />
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Comments button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setBuildingReviewCommentsModal({
                                      id: review.id,
                                      title: review.title || 'Review',
                                      author: 'Author'
                                    })
                                  }}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  {buildingReviewCommentCounts.get(review.id)
                                    ? `${buildingReviewCommentCounts.get(review.id)}`
                                    : '0'}
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
                              <span className="flex items-center gap-1"><ChevronUp className="w-4 h-4" /> Collapse reviews</span>
                            ) : (
                              <span className="flex items-center gap-1"><ChevronDown className="w-4 h-4" /> Show {reviews.length - 3} more reviews</span>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Mini-map — desktop only (mobile uses bottom sheet) */}
                <div className="hidden md:block mb-6">
                  <h4 className="text-xl font-semibold font-display text-foreground mb-4 flex items-center gap-2">
                    <MapIcon className="w-5 h-5 flex-shrink-0" />
                    Map
                  </h4>
                  <div className="h-64 rounded-[var(--radius)] overflow-hidden border-2 border-border">
                    <DynamicMiniMap
                      route={route}
                      routePoints={routePoints}
                      currentPointIndex={currentPointIndex}
                      geolocationEnabled={geolocationEnabled}
                    />
                  </div>
                </div>

                {/* Route Reviews - mobile only (desktop has this in left sidebar) */}
                {route.is_published && (
                  <div className="md:hidden mb-4">
                    <div className="bg-card rounded-[var(--radius)] border-2 border-border p-3 shadow-sm">
                      <div
                        className="cursor-pointer"
                        onClick={() => setShowAllRouteReviews(true)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold font-display text-foreground flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4" style={{ fill: '#facc15', color: '#facc15' }} />
                            Route Reviews
                          </h4>
                          {(route.rating ?? 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-foreground text-sm">{Number(route.rating).toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">({route.review_count || 0})</span>
                            </div>
                          )}
                        </div>

                        {routeReviews.length > 0 ? (
                          <div className="space-y-1.5">
                            {routeReviews.slice(0, 2).map((review) => (
                              <div key={review.id} className="text-xs border border-border rounded p-2 bg-background">
                                <div className="flex items-center gap-0.5 mb-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className="w-3 h-3" style={s <= review.rating ? { fill: '#facc15', color: '#facc15' } : { color: 'var(--muted)' }} />
                                  ))}
                                </div>
                                {review.title && (
                                  <p className="font-medium text-foreground mb-0.5">{review.title}</p>
                                )}
                                {review.content && (
                                  <p className="text-muted-foreground line-clamp-1">{review.content}</p>
                                )}
                              </div>
                            ))}
                            {routeReviews.length > 2 && (
                              <p className="text-primary text-xs text-center">+ {routeReviews.length - 2} more</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No reviews yet. Be the first!</p>
                        )}
                      </div>

                      {user && (
                        <button
                          onClick={() => setShowAddRouteReviewModal(true)}
                          className="w-full mt-2 py-2 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 md:p-8 text-center text-muted-foreground">
                Select a route point
              </div>
            )}
          </div>
        </div>

        {/* Mobile map sheet — peek handle always visible, expands on toggle */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-card border-t-2 border-border ${
            showMapSheet ? 'h-[35vh]' : 'h-[28px]'
          }`}
          onTouchStart={(e) => { (e.currentTarget as any)._touchY = e.touches[0].clientY }}
          onTouchEnd={(e) => {
            const startY = (e.currentTarget as any)._touchY
            if (startY == null) return
            const dy = e.changedTouches[0].clientY - startY
            if (dy > 50) setShowMapSheet(false)
          }}
        >
          {/* Handle — always visible at top of sheet, slides with it */}
          <button
            onClick={() => setShowMapSheet(v => !v)}
            className="w-full h-[28px] flex justify-center items-center hover:bg-muted/40 transition-colors flex-shrink-0"
            aria-label={showMapSheet ? 'Hide map' : 'Show map'}
          >
            <div className={`w-12 h-1.5 rounded-full transition-colors duration-200 ${showMapSheet ? 'bg-primary' : 'bg-foreground/25'}`} />
          </button>
          {/* Map */}
          <div className="h-[calc(35vh-28px)]">
            {showMapSheet && (
              <DynamicMiniMap
                route={route}
                routePoints={routePoints}
                currentPointIndex={currentPointIndex}
                geolocationEnabled={geolocationEnabled}
              />
            )}
          </div>
        </div>

        {/* Mobile: merged route points + navigation */}
        <div className="md:hidden bg-background">
          {/* Row: prev arrow · scrollable cards · next arrow */}
          <div className="flex items-center gap-1.5 px-2 pt-2">
            <button
              onClick={goToPrevious}
              disabled={currentPointIndex === 0}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div ref={mobileScrollRef} className="flex-1 flex space-x-2 overflow-x-auto scrollbar-hide">
              {routePoints.map((point, index) => {
                const isCurrent = index === currentPointIndex
                const isPassed = index < currentPointIndex

                return (
                  <button
                    key={point.id}
                    onClick={() => setCurrentPointIndex(index)}
                    className={`flex-shrink-0 w-[72px] transition-all ${isCurrent ? 'scale-105' : isPassed ? 'opacity-40' : ''}`}
                  >
                    <div className={`relative rounded-[var(--radius)] border-2 overflow-hidden ${isCurrent
                      ? 'border-primary shadow-md'
                      : isPassed
                        ? 'border-border bg-muted'
                        : 'border-border'
                      }`}>
                      {point.buildings?.image_url ? (
                        <img
                          src={getStorageUrl(point.buildings.image_url, 'photos')}
                          alt={point.title}
                          className={`w-full h-14 object-cover ${isPassed ? 'grayscale' : ''}`}
                        />
                      ) : (
                        <div className={`w-full h-14 bg-muted flex items-center justify-center ${isPassed ? 'opacity-50' : ''}`}>
                          <MapPin className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Номер точки */}
                      <div className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-metrics ${isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isPassed
                          ? 'bg-muted-foreground/60 text-white'
                          : 'bg-card text-foreground border border-border'
                        }`}>
                        {isPassed ? <Check className="w-3 h-3" /> : index + 1}
                      </div>

                      {isCurrent && (
                        <div className="absolute top-1 right-1">
                          <Navigation className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>

                    <div className={`mt-0.5 text-[10px] font-medium text-center truncate ${isCurrent
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

            {currentPointIndex === routePoints.length - 1 ? (
              <button
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={goToNext}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Counter + Map button */}
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {currentPoint && (
                <span className="text-xs font-medium text-foreground truncate max-w-[45vw]">
                  {currentPoint.title}
                </span>
              )}
              <span className="text-xs text-muted-foreground font-metrics shrink-0">
                {currentPointIndex + 1} / {routePoints.length}
              </span>
            </div>
            <button
              onClick={() => setShowMapSheet(v => !v)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                showMapSheet
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          </div>
        </div>


        {/* Footer: навигация — только десктоп */}
        <div className="hidden md:flex items-center justify-between p-3 md:p-6 border-t-2 border-border bg-card">
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

          {currentPointIndex === routePoints.length - 1 ? (
            <button
              onClick={onClose}
              className="flex items-center space-x-1 md:space-x-2 px-3 md:px-6 py-2 md:py-3 bg-green-600 text-white rounded-[var(--radius)] font-medium hover:bg-green-700 transition-colors text-sm md:text-base"
            >
              <span className="hidden md:inline">Finish</span>
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="flex items-center space-x-1 md:space-x-2 px-3 md:px-6 py-2 md:py-3 bg-primary text-primary-foreground rounded-[var(--radius)] font-medium hover:bg-primary/90 transition-colors text-sm md:text-base"
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Add Route Review Modal */}
      {route.is_published && (
        <AddRouteReviewModal
          routeId={route.id}
          routeTitle={route.title}
          isOpen={showAddRouteReviewModal}
          onClose={() => setShowAddRouteReviewModal(false)}
          onSuccess={loadRouteReviews}
        />
      )}

      {/* Building review comments modal */}
      {buildingReviewCommentsModal && (
        <ReviewCommentsModal
          isOpen={!!buildingReviewCommentsModal}
          onClose={() => {
            const reviewId = buildingReviewCommentsModal.id
            setBuildingReviewCommentsModal(null)
            supabase
              .from('building_review_comments')
              .select('review_id')
              .eq('review_id', reviewId)
              .then(({ data }) => {
                if (data) {
                  setBuildingReviewCommentCounts(prev => new Map(prev).set(reviewId, data.length))
                }
              })
          }}
          reviewId={buildingReviewCommentsModal.id}
          reviewTitle={buildingReviewCommentsModal.title}
          reviewAuthor={buildingReviewCommentsModal.author}
        />
      )}

      {/* Route review comments modal */}
      {routeReviewCommentsModal && (
        <RouteReviewCommentsModal
          isOpen={!!routeReviewCommentsModal}
          onClose={() => {
            const reviewId = routeReviewCommentsModal.id
            setRouteReviewCommentsModal(null)
            supabase
              .from('route_review_comments')
              .select('review_id')
              .eq('review_id', reviewId)
              .then(({ data }) => {
                if (data) {
                  setRouteReviewCommentCounts(prev => new Map(prev).set(reviewId, data.length))
                }
              })
          }}
          reviewId={routeReviewCommentsModal.id}
          reviewTitle={routeReviewCommentsModal.title}
          reviewAuthor={routeReviewCommentsModal.author}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 rounded-[var(--radius)] md:rounded-2xl">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Route?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete <strong className="text-gray-700">"{route.title}"</strong>? This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

