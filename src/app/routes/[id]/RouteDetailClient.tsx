// src/app/routes/[id]/RouteDetailClient.tsx - Redesigned with interactive points and building reviews
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEditPermissions } from '../../../hooks/useEditPermissions'
import { useAuth } from '../../../hooks/useAuth'
import {
  Edit, MapPin, Clock, Star, Trash2,
  Route as RouteIcon, Navigation, Download, Share2, Map as MapIcon,
  ExternalLink, CheckCircle, Check, Footprints, Bike, Car, Bus,
  Gauge, Calendar, User, ChevronLeft, ChevronRight,
  Headphones, Award, X
} from 'lucide-react'
import dynamic from 'next/dynamic'
import DeleteContentModal from '../../../components/DeleteContentModal'
import RouteFavoriteButton from '../../../components/RouteFavoriteButton'
import { TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'
import RouteReviewsList from '../../../components/routes/RouteReviewsList'
import AddRouteReviewModal from '../../../components/routes/AddRouteReviewModal'
import Link from 'next/link'
import { getStorageUrl } from '../../../lib/storage'
import toast from 'react-hot-toast'

// Dynamic imports
const MapLibreRouteMap = dynamic(() => import('./MapLibreRouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center rounded-[var(--radius)]">
    <span className="text-muted-foreground">Loading map...</span>
  </div>
})

const AudioPlayer = dynamic(() => import('../../../components/AudioPlayer'), {
  ssr: false,
  loading: () => (
    <div className="h-24 bg-muted animate-pulse rounded-[var(--radius)] flex items-center justify-center">
      <Headphones className="h-6 w-6 text-muted-foreground animate-pulse" />
    </div>
  )
})

interface RouteDetailClientProps {
  route: any
}

interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
}

// Transport mode to lucide icon mapping
const getTransportIcon = (mode: string) => {
  switch (mode) {
    case 'cycling': return <Bike className="h-4 w-4" />
    case 'driving': return <Car className="h-4 w-4" />
    case 'public_transport': return <Bus className="h-4 w-4" />
    default: return <Footprints className="h-4 w-4" />
  }
}

// Distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000
  const p1 = lat1 * Math.PI / 180
  const p2 = lat2 * Math.PI / 180
  const dp = (lat2 - lat1) * Math.PI / 180
  const dl = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function RouteDetailClient({ route }: RouteDetailClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // GPS navigation
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string>('')
  const [watchId, setWatchId] = useState<number | null>(null)
  const [showNavigationPanel, setShowNavigationPanel] = useState(false)

  // Current point navigation
  const [currentPointIndex, setCurrentPointIndex] = useState(0)

  // Export states
  const [exportStatus, setExportStatus] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Building reviews for current point (like RouteViewerModal)
  const [buildingReviews, setBuildingReviews] = useState<any[]>([])
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [loadingBuildingReviews, setLoadingBuildingReviews] = useState(false)
  const [showAllBuildingReviews, setShowAllBuildingReviews] = useState(false)
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [hoveredRating, setHoveredRating] = useState<{ reviewId: string, rating: number } | null>(null)

  // Photo gallery for current point
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Route reviews
  const [routeReviews, setRouteReviews] = useState<any[]>([])
  const [showAddReviewModal, setShowAddReviewModal] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Permissions
  const permissions = useEditPermissions('route', route.id, user?.id || null)
  const canEdit = permissions.canEdit
  const userRole = permissions.userRole
  const checkingPermissions = permissions.isLoading
  const canDelete = canEdit && (
    userRole === 'admin' || userRole === 'moderator' || route.created_by === user?.id
  )

  // Transport data
  const transportMode = route.transport_mode || 'walking'
  const transportLabel = TransportModeHelper.getLabel(transportMode)
  const hasRealRoute = !!(route.route_geometry?.coordinates?.length > 0)

  // Current point
  const currentPoint = useMemo(() =>
    route.route_points?.[currentPointIndex] || null,
    [route.route_points, currentPointIndex]
  )

  // Progress
  const progressPercent = route.route_points?.length > 0
    ? ((currentPointIndex + 1) / route.route_points.length) * 100
    : 0

  // Load route reviews on mount
  useEffect(() => {
    if (route.is_published) {
      loadRouteReviews()
    }
  }, [route.id])

  const loadRouteReviews = async () => {
    setReviewsLoading(true)
    try {
      const { data, error } = await supabase
        .from('route_reviews')
        .select(`
          id, rating, title, content, completion_time_minutes, photos, created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq('route_id', route.id)
        .order('created_at', { ascending: false })

      if (!error && data) setRouteReviews(data)
    } catch (error) {
      console.error('Error loading route reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Load building reviews when current point changes (like RouteViewerModal)
  useEffect(() => {
    if (!currentPoint?.building_id) {
      setBuildingReviews([])
      setSelectedReviewId(null)
      return
    }

    const loadReviews = async () => {
      setLoadingBuildingReviews(true)
      try {
        const { data: reviewsData, error } = await supabase
          .from('building_reviews')
          .select('*')
          .eq('building_id', currentPoint.building_id)
          .eq('moderation_status', 'approved')

        if (error) throw error

        // Sort: Complete > Recommended > Verified > Rating
        const sortedReviews = (reviewsData || []).sort((a: any, b: any) => {
          const aFull = !!(a.content?.length >= 200 && a.photos?.length >= 2 && a.audio_url)
          const bFull = !!(b.content?.length >= 200 && b.photos?.length >= 2 && b.audio_url)
          if (aFull !== bFull) return aFull ? -1 : 1
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1
          return (b.rating || 0) - (a.rating || 0)
        })

        setBuildingReviews(sortedReviews)

        // Load user ratings
        if (user && sortedReviews.length > 0) {
          const { data: ratingsData } = await supabase
            .from('building_review_ratings')
            .select('review_id, rating')
            .eq('user_id', user.id)
            .in('review_id', sortedReviews.map((r: any) => r.id))

          if (ratingsData) {
            setUserRatings(new Map(ratingsData.map(r => [r.review_id, r.rating])))
          }
        }

        // Load saved review selection or auto-select best
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
          } else if (sortedReviews.length > 0) {
            setSelectedReviewId(sortedReviews[0].id)
          }
        } else if (sortedReviews.length > 0) {
          setSelectedReviewId(sortedReviews[0].id)
        }
      } catch (error) {
        console.error('Error loading building reviews:', error)
      } finally {
        setLoadingBuildingReviews(false)
      }
    }

    loadReviews()
  }, [currentPoint, user])

  // Reset photo index and reviews when point changes
  useEffect(() => {
    setCurrentPhotoIndex(0)
    setShowAllBuildingReviews(false)
  }, [currentPointIndex])

  // Selected review
  const selectedReview = useMemo(() =>
    buildingReviews.find((r: any) => r.id === selectedReviewId) || null,
    [buildingReviews, selectedReviewId]
  )

  // Hero image: thumbnail or first building image
  const heroImageUrl = useMemo(() => {
    if (route.thumbnail_url) return getStorageUrl(route.thumbnail_url, 'routes')
    const firstWithImage = route.route_points?.find((p: any) => p.buildings?.image_url)
    if (firstWithImage?.buildings?.image_url) return getStorageUrl(firstWithImage.buildings.image_url, 'photos')
    return null
  }, [route.thumbnail_url, route.route_points])

  // Current point photos (from selected review or building)
  const currentPointPhotos = useMemo(() => {
    if (!currentPoint?.buildings) return []
    const photos: string[] = []

    if (selectedReview?.photos?.length > 0) {
      photos.push(...selectedReview.photos)
    } else {
      if (currentPoint.buildings.image_url) photos.push(currentPoint.buildings.image_url)
      if (currentPoint.buildings.image_urls?.length > 0) {
        photos.push(...currentPoint.buildings.image_urls.filter((u: string) => u !== currentPoint.buildings.image_url))
      }
    }
    return photos
  }, [currentPoint, selectedReview])

  // Save review selection
  const handleSelectReview = async (reviewId: string) => {
    if (!user || !currentPoint || !route) {
      toast.error('Please log in to save your selection')
      return
    }

    try {
      const { error } = await supabase
        .from('route_point_review_selections')
        .upsert({
          user_id: user.id,
          route_id: route.id,
          route_point_id: currentPoint.id,
          building_review_id: reviewId,
          selected_at: new Date().toISOString()
        }, { onConflict: 'user_id,route_id,route_point_id' })

      if (error) throw error
      setSelectedReviewId(reviewId)
      toast.success('Review selected!')
    } catch (error) {
      console.error('Error saving review selection:', error)
      toast.error('Error saving selection')
    }
  }

  // Rate review
  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) { toast.error('Please log in'); return }

    try {
      const existingRating = userRatings.get(reviewId)
      if (existingRating) {
        const { error } = await supabase
          .from('building_review_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
        if (error) { toast.error(`Error: ${error.message}`); return }
      } else {
        const { error } = await supabase
          .from('building_review_ratings')
          .insert({ review_id: reviewId, user_id: user.id, rating })
        if (error) { toast.error(`Error: ${error.message}`); return }
      }

      const oldRating = userRatings.get(reviewId)
      setUserRatings(prev => new Map(prev).set(reviewId, rating))

      setBuildingReviews(prev => prev.map((r: any) => {
        if (r.id !== reviewId) return r
        const oldAvg = r.user_rating_avg || 0
        const oldCount = r.user_rating_count || 0
        let newCount: number, newAvg: number
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
      console.error('Error rating review:', error)
      toast.error('Error saving rating')
    }
  }

  // Navigation
  const goToPrevious = () => { if (currentPointIndex > 0) setCurrentPointIndex(currentPointIndex - 1) }
  const goToNext = () => { if (currentPointIndex < (route.route_points?.length || 0) - 1) setCurrentPointIndex(currentPointIndex + 1) }

  // GPS Navigation
  const startLocationTracking = () => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return }
    setIsTrackingLocation(true)
    setLocationError('')
    setShowNavigationPanel(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        const updateInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const nl = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }
              setUserLocation(cl => cl && calculateDistance(cl.latitude, cl.longitude, nl.latitude, nl.longitude) > 10 ? nl : cl || nl)
            },
            () => {},
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        }, 120000)
        setWatchId(updateInterval as any)
      },
      (error) => {
        const msgs: Record<number, string> = { 1: 'GPS access denied', 2: 'GPS unavailable', 3: 'GPS timeout' }
        setLocationError(msgs[error.code] || `GPS error: ${error.message}`)
        setIsTrackingLocation(false)
        setShowNavigationPanel(false)
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    )
  }

  const stopLocationTracking = () => {
    if (watchId !== null) clearInterval(watchId)
    setWatchId(null)
    setIsTrackingLocation(false)
    setUserLocation(null)
    setShowNavigationPanel(false)
    setLocationError('')
  }

  // Export functions
  const exportToGoogleMaps = () => {
    if (!route.route_points?.length) return
    const waypoints = route.route_points.map((p: any) => `${p.latitude},${p.longitude}`).join('/')
    window.open(`https://www.google.com/maps/dir/${waypoints}`, '_blank')
    setExportStatus('Opened in Google Maps')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const exportToGPX = () => {
    if (!route.route_points?.length) return
    const waypoints = route.route_points || []
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ArchiRoutes" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${route.title || 'Route'}</name><time>${new Date().toISOString()}</time></metadata>
`
    waypoints.forEach((p: any, i: number) => {
      gpx += `  <wpt lat="${p.latitude}" lon="${p.longitude}"><name>${i + 1}. ${p.title}</name></wpt>\n`
    })
    if (route.route_geometry?.coordinates?.length > 0) {
      gpx += `  <trk><name>${route.title}</name><trkseg>\n`
      route.route_geometry.coordinates.forEach((c: any) => {
        gpx += `    <trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>\n`
      })
      gpx += `  </trkseg></trk>\n`
    }
    gpx += `</gpx>`

    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${route.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus('GPX downloaded')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const shareRoute = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: route.title, url }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000) }
      catch { prompt('Copy link:', url) }
    }
  }

  // Cleanup
  useEffect(() => {
    (window as any).setCurrentStepFromMap = (i: number) => setCurrentPointIndex(i)
    return () => {
      if (watchId !== null) clearInterval(watchId)
      delete (window as any).setCurrentStepFromMap
    }
  }, [watchId])

  const creator = route.profiles
  const createdDate = route.created_at ? new Date(route.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : null

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative w-full h-[340px] sm:h-[420px] md:h-[520px] overflow-hidden">
          {/* Background image or gradient fallback */}
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={route.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-stone-800 to-zinc-900">
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px),
                    repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)`
                }}
              />
            </div>
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-between container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-screen-xl">

            {/* Top bar: back link + action buttons */}
            <div className="flex items-center justify-between">
              <Link
                href="/routes"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors bg-black/25 hover:bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Routes</span>
              </Link>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={isTrackingLocation ? stopLocationTracking : startLocationTracking}
                  className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                    isTrackingLocation
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-black/30 text-white hover:bg-black/50'
                  }`}
                  title={isTrackingLocation ? 'Stop GPS' : 'Start GPS'}
                >
                  <Navigation className="h-4 w-4 md:h-5 md:w-5" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
                    title="Export / Share"
                  >
                    <Download className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-[var(--radius)] shadow-xl z-10">
                      <button onClick={() => { exportToGoogleMaps(); setShowExportMenu(false) }}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors rounded-t-[var(--radius)] flex items-center gap-2 text-sm">
                        <MapIcon size={16} /><span>Google Maps</span><ExternalLink size={12} className="ml-auto text-muted-foreground" />
                      </button>
                      <button onClick={() => { exportToGPX(); setShowExportMenu(false) }}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-2 text-sm">
                        <Download size={16} /><span>Download GPX</span>
                      </button>
                      <div className="border-t border-border" />
                      <button onClick={() => { shareRoute(); setShowExportMenu(false) }}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors rounded-b-[var(--radius)] flex items-center gap-2 text-sm">
                        {copySuccess
                          ? <><CheckCircle size={16} className="text-primary" /><span className="text-primary">Copied!</span></>
                          : <><Share2 size={16} /><span>Share</span></>}
                      </button>
                    </div>
                  )}
                </div>

                {!checkingPermissions && canEdit && (
                  <Link
                    href={`/routes/${route.id}/edit`}
                    className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4 md:h-5 md:w-5" />
                  </Link>
                )}
                {!checkingPermissions && canDelete && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 bg-black/30 text-red-400 rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                )}

                <div className="w-px h-5 bg-white/20 mx-0.5" />

                <div className="[&_button]:bg-black/30 [&_button]:text-white [&_button:hover]:bg-black/50 [&_button]:backdrop-blur-sm [&_button]:border-0 [&_svg]:text-white">
                  <RouteFavoriteButton routeId={route.id} routeTitle={route.title} size="md" />
                </div>
              </div>
            </div>

            {/* Bottom: location, title, stats, tags */}
            <div>
              {/* Location */}
              <div className="flex items-center gap-1.5 text-white/60 text-sm mb-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="tracking-wide uppercase text-xs font-medium">{route.city}{route.country ? `, ${route.country}` : ''}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display text-white mb-3 md:mb-4 leading-tight max-w-4xl" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                {route.title}
              </h1>

              {/* Stats pills */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-white/10">
                  {getTransportIcon(transportMode)}
                  <span>{transportLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-white/10">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-metrics">
                    {route.route_summary ? formatDuration(route.route_summary.duration) : `${route.estimated_duration_minutes || 'N/A'} min`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-white/10">
                  <RouteIcon className="h-3.5 w-3.5" />
                  <span className="font-metrics">
                    {route.route_summary ? formatDistance(route.route_summary.distance) : `${route.distance_km || 'N/A'} km`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-white/10">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="font-metrics">{route.route_points?.length || 0} points</span>
                </div>
                {route.difficulty_level && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10 ${
                    route.difficulty_level === 'easy'
                      ? 'bg-emerald-500/70 text-white'
                      : route.difficulty_level === 'medium'
                        ? 'bg-amber-500/70 text-white'
                        : 'bg-red-500/70 text-white'
                  }`}>
                    {route.difficulty_level.charAt(0).toUpperCase() + route.difficulty_level.slice(1)}
                  </span>
                )}
                {Number(route.rating) > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-yellow-400/30">
                    <Star className="h-3.5 w-3.5 fill-white" />
                    <span className="font-semibold font-metrics">{Number(route.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {route.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {route.tags.map((tag: string) => (
                    <span key={tag} className="px-2.5 py-0.5 bg-white/10 backdrop-blur-sm text-white/70 text-xs rounded-full border border-white/15">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GPS Panel */}
        {showNavigationPanel && (
          <div className="container mx-auto px-4 md:px-6 mt-4">
            <div className="bg-primary/5 border border-primary rounded-[var(--radius)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Navigation size={20} className="text-primary mr-2" />
                  <h3 className="font-semibold font-display text-foreground">GPS Navigation Active</h3>
                </div>
                <button onClick={stopLocationTracking} className="p-1 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              {locationError ? (
                <div className="text-destructive text-sm bg-destructive/10 rounded-[var(--radius)] p-3">{locationError}</div>
              ) : userLocation ? (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground font-metrics">
                    {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    <span className="ml-2 text-xs">(+/-{Math.round(userLocation.accuracy)}m)</span>
                  </div>
                  {currentPoint && (
                    <div className="text-sm font-medium text-primary font-metrics">
                      {(() => {
                        if (!currentPoint.latitude || !currentPoint.longitude) return null
                        const d = calculateDistance(userLocation.latitude, userLocation.longitude, currentPoint.latitude, currentPoint.longitude)
                        return `${formatDistance(d)} to ${currentPoint.title}`
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">Getting location...</div>
              )}
            </div>
          </div>
        )}

        {/* Export status */}
        {exportStatus && (
          <div className="container mx-auto px-4 md:px-6 mt-4">
            <div className="bg-primary/10 border border-primary rounded-[var(--radius)] p-3 flex items-center text-primary text-sm">
              <CheckCircle size={16} className="mr-2" />{exportStatus}
            </div>
          </div>
        )}

        {/* Main Content: Map + Two-column layout */}
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">

          {/* Full-width Map */}
          <div className="bg-card rounded-[var(--radius)] border border-border overflow-hidden mb-4 md:mb-6">
            <div className="h-[260px] sm:h-[360px] md:h-[500px]">
              <MapLibreRouteMap
                route={route}
                userLocation={userLocation}
                currentPointIndex={currentPointIndex}
                showNavigation={showNavigationPanel}
              />
            </div>
          </div>

          {/* Navigation bar between points */}
          {route.route_points?.length > 0 && (
            <div className="bg-card rounded-[var(--radius)] border border-border p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPrevious}
                  disabled={currentPointIndex === 0}
                  className="px-3 md:px-4 py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex-1 mx-3 md:mx-4">
                  <div className="flex items-center justify-center mb-1.5">
                    <span className="text-base md:text-lg font-bold font-display text-foreground">
                      {currentPointIndex + 1} / {route.route_points.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <button
                  onClick={goToNext}
                  disabled={currentPointIndex >= route.route_points.length - 1}
                  className="px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal points strip */}
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-thin">
                {route.route_points.map((point: any, index: number) => {
                  const isCurrent = index === currentPointIndex
                  const isPassed = index < currentPointIndex
                  return (
                    <button
                      key={point.id}
                      onClick={() => setCurrentPointIndex(index)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isPassed
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3" /> : <span className="font-metrics">{index + 1}</span>}
                      <span className="max-w-[120px] truncate">{point.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Two-column: Current Point Content + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

            {/* Main: Current Point Details with Building Reviews */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">

              {currentPoint ? (
                <>
                  {/* Photo gallery */}
                  {currentPointPhotos.length > 0 && (
                    <div className="relative rounded-[var(--radius)] overflow-hidden group bg-muted">
                      <img
                        src={getStorageUrl(currentPointPhotos[currentPhotoIndex], 'photos')}
                        alt={`${currentPoint.title} - photo ${currentPhotoIndex + 1}`}
                        className="w-full h-64 md:h-80 object-cover"
                      />
                      {currentPointPhotos.length > 1 && (
                        <>
                          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-metrics">
                            {currentPhotoIndex + 1} / {currentPointPhotos.length}
                          </div>
                          <button
                            onClick={() => setCurrentPhotoIndex(i => i === 0 ? currentPointPhotos.length - 1 : i - 1)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setCurrentPhotoIndex(i => i === currentPointPhotos.length - 1 ? 0 : i + 1)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          {currentPointPhotos.length <= 10 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                              {currentPointPhotos.map((_: string, i: number) => (
                                <button key={i} onClick={() => setCurrentPhotoIndex(i)}
                                  className={`w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/60'}`} />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Current point info */}
                  <div className="bg-card border border-border rounded-[var(--radius)] p-6">
                    <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
                      {currentPoint.buildings?.id ? (
                        <Link href={`/buildings/${currentPoint.buildings.id}`} className="hover:text-primary transition-colors">
                          {currentPoint.title}
                        </Link>
                      ) : currentPoint.title}
                    </h2>

                    {currentPoint.buildings && (
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                        {currentPoint.buildings.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />{currentPoint.buildings.address}
                          </div>
                        )}
                        {currentPoint.buildings.architect && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />{currentPoint.buildings.architect}
                          </div>
                        )}
                        {currentPoint.buildings.year_built && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /><span className="font-metrics">{currentPoint.buildings.year_built}</span>
                          </div>
                        )}
                        {currentPoint.buildings.architectural_style && (
                          <span className="px-2 py-0.5 bg-muted rounded-full text-xs border border-border">
                            {currentPoint.buildings.architectural_style}
                          </span>
                        )}
                        {currentPoint.estimated_time_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /><span className="font-metrics">{currentPoint.estimated_time_minutes} min</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected review content or point description */}
                    {selectedReview?.content ? (
                      <div className="mb-4">
                        {selectedReview.title && (
                          <h3 className="font-semibold text-foreground mb-2">{selectedReview.title}</h3>
                        )}
                        <p className="text-foreground leading-relaxed whitespace-pre-line">
                          {selectedReview.content}
                        </p>
                        {selectedReview.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {selectedReview.tags.map((tag: string, idx: number) => (
                              <span key={idx} className="bg-muted text-foreground px-2 py-1 rounded-full text-xs">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : currentPoint.description ? (
                      <p className="text-foreground leading-relaxed mb-4">{currentPoint.description}</p>
                    ) : currentPoint.buildings?.description ? (
                      <p className="text-foreground leading-relaxed mb-4">{currentPoint.buildings.description}</p>
                    ) : null}

                    {/* Instructions */}
                    {currentPoint.instructions && (
                      <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius)] p-3 mb-4">
                        <p className="text-foreground text-sm">{currentPoint.instructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Audio player */}
                  {selectedReview?.audio_url && (
                    <div className="bg-card border border-border rounded-[var(--radius)] p-6">
                      <h3 className="text-lg font-semibold font-display text-foreground mb-3 flex items-center gap-2">
                        <Headphones className="w-5 h-5 text-primary" />
                        Audio Guide
                      </h3>
                      <AudioPlayer
                        audioUrl={getStorageUrl(selectedReview.audio_url, 'audio')}
                        title={selectedReview.title || currentPoint.title}
                        onPositionChange={async (position: number) => {
                          if (user && currentPoint) {
                            await supabase
                              .from('route_point_review_selections')
                              .update({ audio_position_seconds: Math.floor(position), last_listened_at: new Date().toISOString() })
                              .eq('user_id', user.id)
                              .eq('route_id', route.id)
                              .eq('route_point_id', currentPoint.id)
                          }
                        }}
                        initialPosition={0}
                      />
                    </div>
                  )}

                  {/* Building Reviews - selectable like in RouteViewerModal */}
                  <div className="bg-card border border-border rounded-[var(--radius)] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold font-display text-foreground">
                        Building Reviews {buildingReviews.length > 0 && `(${buildingReviews.length})`}
                      </h3>
                      {buildingReviews.length > 0 && (
                        <div className="text-sm text-muted-foreground font-metrics">
                          {buildingReviews.filter((r: any) => r.audio_url).length > 0 && (
                            <span className="flex items-center gap-1">
                              <Headphones className="w-3 h-3" />
                              {buildingReviews.filter((r: any) => r.audio_url).length} with audio
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {loadingBuildingReviews ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => (
                          <div key={i} className="h-24 bg-muted rounded-[var(--radius)] animate-pulse" />
                        ))}
                      </div>
                    ) : buildingReviews.length === 0 ? (
                      <div className="bg-muted/50 border border-dashed border-border rounded-[var(--radius)] p-6 text-center">
                        <p className="text-muted-foreground">No reviews yet for this building</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {(showAllBuildingReviews ? buildingReviews : buildingReviews.slice(0, 3)).map((review: any) => {
                            const isSelected = review.id === selectedReviewId
                            const isFullReview = !!(review.content?.length >= 200 && review.photos?.length >= 2 && review.audio_url)

                            return (
                              <div
                                key={review.id}
                                onClick={() => !isSelected && handleSelectReview(review.id)}
                                className={`border-2 rounded-[var(--radius)] p-4 transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer'
                                }`}
                              >
                                {/* Badges row */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center flex-wrap gap-1.5">
                                    {review.user_rating_count > 0 && (
                                      <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded">
                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mr-1" />
                                        <span className="text-sm font-semibold text-foreground font-metrics">{review.user_rating_avg?.toFixed(1)}</span>
                                        <span className="text-xs text-muted-foreground ml-1 font-metrics">({review.user_rating_count})</span>
                                      </div>
                                    )}
                                    {isFullReview && (
                                      <span className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold border border-yellow-300">
                                        COMPLETE
                                      </span>
                                    )}
                                    {review.audio_url && (
                                      <span className="flex items-center bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                                        <Headphones className="w-3 h-3 mr-1" />Audio
                                      </span>
                                    )}
                                    {review.is_verified && (
                                      <span className="flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                        <CheckCircle className="w-3 h-3 mr-1" />Verified
                                      </span>
                                    )}
                                    {review.is_featured && (
                                      <span className="flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                                        <Award className="w-3 h-3 mr-1" />Recommended
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <span className="flex items-center text-primary text-sm font-medium">
                                      <Check className="w-4 h-4 mr-1" />Selected
                                    </span>
                                  )}
                                </div>

                                {review.title && (
                                  <h4 className="font-semibold font-display text-foreground mb-1">{review.title}</h4>
                                )}
                                {review.content && (
                                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{review.content}</p>
                                )}

                                {/* Metadata */}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 font-metrics">
                                  {review.photos?.length > 0 && <span>{review.photos.length} photos</span>}
                                  {review.audio_duration_seconds && (
                                    <span className="flex items-center"><Headphones className="w-3 h-3 mr-1" />{Math.floor(review.audio_duration_seconds / 60)} min</span>
                                  )}
                                </div>

                                {/* Rating stars */}
                                <div className="border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map(star => {
                                      const userRating = userRatings.get(review.id) || 0
                                      const isActive = userRating >= star || (hoveredRating?.reviewId === review.id && (hoveredRating?.rating ?? 0) >= star)
                                      return (
                                        <button key={star}
                                          onClick={(e) => { e.stopPropagation(); handleRateReview(review.id, star) }}
                                          onMouseEnter={() => setHoveredRating({ reviewId: review.id, rating: star })}
                                          onMouseLeave={() => setHoveredRating(null)}
                                          className="p-0.5 transition-transform hover:scale-110">
                                          <Star className={`w-4 h-4 transition-colors ${isActive ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                                        </button>
                                      )
                                    })}
                                    <span className="text-xs text-muted-foreground ml-2">Rate this review</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {buildingReviews.length > 3 && (
                          <div className="text-center mt-4">
                            <button
                              onClick={() => setShowAllBuildingReviews(!showAllBuildingReviews)}
                              className="px-4 py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors font-medium text-sm"
                            >
                              {showAllBuildingReviews ? 'Collapse reviews' : `Show ${buildingReviews.length - 3} more reviews`}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-card rounded-[var(--radius)] border border-dashed border-border">
                  <MapPin size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium font-display text-foreground mb-2">No Route Points</h3>
                  <p className="text-sm text-muted-foreground">This route doesn't have any points yet</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* About the Route */}
              <div className="bg-card rounded-[var(--radius)] border border-border p-6">
                <h3 className="text-lg font-semibold font-display mb-4 text-foreground">About the Route</h3>

                {route.description && (
                  <p className="text-sm text-foreground leading-relaxed mb-4 pb-4 border-b border-border">
                    {route.description}
                  </p>
                )}

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="mt-0.5">{getTransportIcon(transportMode)}</div>
                    <div className="ml-3">
                      <span className="text-sm text-muted-foreground block">Transport</span>
                      <p className="font-medium text-foreground">{transportLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <RouteIcon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="ml-3">
                      <span className="text-sm text-muted-foreground block">Distance</span>
                      <p className="font-medium font-metrics text-foreground">
                        {route.route_summary ? formatDistance(route.route_summary.distance) : `${route.distance_km || 'N/A'} km`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="ml-3">
                      <span className="text-sm text-muted-foreground block">Duration</span>
                      <p className="font-medium font-metrics text-foreground">
                        {route.route_summary ? formatDuration(route.route_summary.duration) : `${route.estimated_duration_minutes || 'N/A'} min`}
                      </p>
                    </div>
                  </div>
                  {route.difficulty_level && (
                    <div className="flex items-start">
                      <Gauge className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="ml-3">
                        <span className="text-sm text-muted-foreground block">Difficulty</span>
                        <p className="font-medium text-foreground capitalize">{route.difficulty_level}</p>
                      </div>
                    </div>
                  )}
                  {creator && (
                    <div className="flex items-start">
                      <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="ml-3">
                        <span className="text-sm text-muted-foreground block">Created by</span>
                        <p className="font-medium text-foreground">{creator.full_name || creator.username || 'User'}</p>
                      </div>
                    </div>
                  )}
                  {createdDate && (
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="ml-3">
                        <span className="text-sm text-muted-foreground block">Created</span>
                        <p className="font-medium text-foreground">{createdDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* All Route Points list */}
              {route.route_points?.length > 0 && (
                <div className="bg-card rounded-[var(--radius)] border border-border p-6">
                  <h3 className="font-semibold font-display text-foreground mb-3">
                    All Points ({route.route_points.length})
                  </h3>
                  <div className="space-y-1.5">
                    {route.route_points.map((point: any, index: number) => {
                      const isCurrent = index === currentPointIndex
                      const isPassed = index < currentPointIndex
                      return (
                        <button
                          key={point.id}
                          onClick={() => setCurrentPointIndex(index)}
                          className={`w-full p-2.5 rounded-[var(--radius)] border transition-all text-left flex items-center gap-2 ${
                            isCurrent ? 'border-primary bg-primary/5' : isPassed ? 'border-border bg-muted/50' : 'border-border bg-card hover:border-primary/50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 font-metrics ${
                            isCurrent ? 'bg-primary text-primary-foreground' : isPassed ? 'bg-primary/60 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {isPassed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground truncate text-sm block">{point.title}</span>
                            {point.estimated_time_minutes && (
                              <span className="text-xs text-muted-foreground font-metrics">{point.estimated_time_minutes} min</span>
                            )}
                          </div>
                          {isCurrent && <Navigation className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Route Reviews */}
              {route.is_published && (
                <div className="bg-card rounded-[var(--radius)] border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-display text-foreground flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      Route Reviews
                      {routeReviews.length > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">({routeReviews.length})</span>
                      )}
                    </h3>
                  </div>
                  {reviewsLoading ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
                  ) : (
                    <RouteReviewsList
                      routeId={route.id}
                      reviews={routeReviews}
                      onOpenAddReview={() => setShowAddReviewModal(true)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {canDelete && (
        <DeleteContentModal contentType="route" contentId={route.id} contentTitle={route.title}
          isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
      )}
      {route.is_published && (
        <AddRouteReviewModal routeId={route.id} routeTitle={route.title}
          isOpen={showAddReviewModal} onClose={() => setShowAddReviewModal(false)} onSuccess={loadRouteReviews} />
      )}
      {showExportMenu && (
        <div className="fixed inset-0 z-[4]" onClick={() => setShowExportMenu(false)} />
      )}
    </>
  )
}
