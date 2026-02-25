// src/app/routes/[id]/RouteDetailClient.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useEditPermissions } from '../../../hooks/useEditPermissions'
import { useAuth } from '../../../hooks/useAuth'
import {
  Edit, MapPin, Clock, Star, Trash2,
  Route as RouteIcon, Navigation, Download, Share2, Map as MapIcon,
  ExternalLink, CheckCircle, Check, Footprints, Bike, Car, Bus,
  Gauge, Calendar, User, ChevronLeft, ChevronRight,
  Headphones, Award, X, MessageSquare
} from 'lucide-react'
import dynamic from 'next/dynamic'
import DeleteContentModal from '../../../components/DeleteContentModal'
import RouteFavoriteButton from '../../../components/RouteFavoriteButton'
import { TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'
import RouteReviewsList from '../../../components/routes/RouteReviewsList'
import AddRouteReviewModal from '../../../components/routes/AddRouteReviewModal'
import ReviewCommentsModal from '../../../components/buildings/ReviewCommentsModal'
import Link from 'next/link'
import { getStorageUrl } from '../../../lib/storage'
import toast from 'react-hot-toast'

const MapLibreRouteMap = dynamic(() => import('./MapLibreRouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center rounded-[var(--radius)]">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  )
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

const getTransportIcon = (mode: string) => {
  switch (mode) {
    case 'cycling': return <Bike className="h-3.5 w-3.5" />
    case 'driving': return <Car className="h-3.5 w-3.5" />
    case 'public_transport': return <Bus className="h-3.5 w-3.5" />
    default: return <Footprints className="h-3.5 w-3.5" />
  }
}

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
  const { user } = useAuth()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string>('')
  const [watchId, setWatchId] = useState<number | null>(null)
  const [showNavigationPanel, setShowNavigationPanel] = useState(false)

  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [exportStatus, setExportStatus] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  const [buildingReviews, setBuildingReviews] = useState<any[]>([])
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [loadingBuildingReviews, setLoadingBuildingReviews] = useState(false)
  const [showAllBuildingReviews, setShowAllBuildingReviews] = useState(false)
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [hoveredRating, setHoveredRating] = useState<{ reviewId: string, rating: number } | null>(null)
  const [buildingReviewCommentsModal, setBuildingReviewCommentsModal] = useState<{
    id: string; title: string; author: string
  } | null>(null)
  const [buildingReviewCommentCounts, setBuildingReviewCommentCounts] = useState<Map<string, number>>(new Map())

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [reviewTextExpanded, setReviewTextExpanded] = useState(false)

  const [routeReviews, setRouteReviews] = useState<any[]>([])
  const [showAddReviewModal, setShowAddReviewModal] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const permissions = useEditPermissions('route', route.id, user?.id || null)
  const canEdit = permissions.canEdit
  const userRole = permissions.userRole
  const checkingPermissions = permissions.isLoading
  const canDelete = canEdit && (
    userRole === 'admin' || userRole === 'moderator' || route.created_by === user?.id
  )

  const transportMode = route.transport_mode || 'walking'
  const transportLabel = TransportModeHelper.getLabel(transportMode)

  const currentPoint = useMemo(() =>
    route.route_points?.[currentPointIndex] || null,
    [route.route_points, currentPointIndex]
  )

  const progressPercent = route.route_points?.length > 0
    ? ((currentPointIndex + 1) / route.route_points.length) * 100
    : 0

  useEffect(() => {
    if (route.is_published) loadRouteReviews()
  }, [route.id])

  const loadRouteReviews = async () => {
    setReviewsLoading(true)
    try {
      const { data, error } = await supabase
        .from('route_reviews')
        .select(`id, rating, title, content, completion_time_minutes, photos, created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)`)
        .eq('route_id', route.id)
        .order('created_at', { ascending: false })
      if (!error && data) setRouteReviews(data)
    } catch (e) {
      console.error('Error loading route reviews:', e)
    } finally {
      setReviewsLoading(false)
    }
  }

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

        const sorted = (reviewsData || []).sort((a: any, b: any) => {
          const af = !!(a.content?.length >= 200 && a.photos?.length >= 2 && a.audio_url)
          const bf = !!(b.content?.length >= 200 && b.photos?.length >= 2 && b.audio_url)
          if (af !== bf) return af ? -1 : 1
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1
          return (b.rating || 0) - (a.rating || 0)
        })
        setBuildingReviews(sorted)

        // Load comment counts
        if (sorted.length > 0) {
          const { data: commentsData } = await supabase
            .from('building_review_comments')
            .select('review_id')
            .in('review_id', sorted.map((r: any) => r.id))
          if (commentsData) {
            const counts = new Map<string, number>()
            commentsData.forEach((c: any) => counts.set(c.review_id, (counts.get(c.review_id) || 0) + 1))
            setBuildingReviewCommentCounts(counts)
          }
        }

        if (user && sorted.length > 0) {
          const { data: ratingsData } = await supabase
            .from('building_review_ratings')
            .select('review_id, rating')
            .eq('user_id', user.id)
            .in('review_id', sorted.map((r: any) => r.id))
          if (ratingsData) setUserRatings(new Map(ratingsData.map(r => [r.review_id, r.rating])))
        }

        if (user && route) {
          const { data: sel } = await supabase
            .from('route_point_review_selections')
            .select('building_review_id')
            .eq('user_id', user.id)
            .eq('route_id', route.id)
            .eq('route_point_id', currentPoint.id)
            .single()
          setSelectedReviewId(sel ? sel.building_review_id : sorted[0]?.id || null)
        } else {
          setSelectedReviewId(sorted[0]?.id || null)
        }
      } catch (e) {
        console.error('Error loading building reviews:', e)
      } finally {
        setLoadingBuildingReviews(false)
      }
    }
    loadReviews()
  }, [currentPoint, user])

  useEffect(() => {
    setCurrentPhotoIndex(0)
    setShowAllBuildingReviews(false)
    setReviewTextExpanded(false)
  }, [currentPointIndex])

  const selectedReview = useMemo(() =>
    buildingReviews.find((r: any) => r.id === selectedReviewId) || null,
    [buildingReviews, selectedReviewId]
  )

  const heroImageUrl = useMemo(() => {
    if (route.thumbnail_url) return getStorageUrl(route.thumbnail_url, 'routes')
    const first = route.route_points?.find((p: any) => p.buildings?.image_url)
    if (first?.buildings?.image_url) return getStorageUrl(first.buildings.image_url, 'photos')
    return null
  }, [route.thumbnail_url, route.route_points])

  const currentPointPhotos = useMemo(() => {
    if (!currentPoint?.buildings) return []
    const photos: string[] = []
    if (currentPoint.buildings.image_url) photos.push(currentPoint.buildings.image_url)
    currentPoint.buildings.image_urls
      ?.filter((u: string) => u !== currentPoint.buildings.image_url)
      .forEach((u: string) => photos.push(u))
    selectedReview?.photos
      ?.filter((p: string) => !photos.includes(p))
      .forEach((p: string) => photos.push(p))
    return photos
  }, [currentPoint, selectedReview])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) setCurrentPhotoIndex(i => i === currentPointPhotos.length - 1 ? 0 : i + 1)
    else setCurrentPhotoIndex(i => i === 0 ? currentPointPhotos.length - 1 : i - 1)
    touchStartX.current = null
    touchStartY.current = null
  }

  const handleSelectReview = async (reviewId: string) => {
    if (!user || !currentPoint || !route) { toast.error('Please log in to save your selection'); return }
    try {
      const { error } = await supabase
        .from('route_point_review_selections')
        .upsert({
          user_id: user.id, route_id: route.id, route_point_id: currentPoint.id,
          building_review_id: reviewId, selected_at: new Date().toISOString()
        }, { onConflict: 'user_id,route_id,route_point_id' })
      if (error) throw error
      setSelectedReviewId(reviewId)
      toast.success('Review selected!')
    } catch (e) {
      toast.error('Error saving selection')
    }
  }

  const handleRateReview = async (reviewId: string, rating: number) => {
    if (!user) { toast.error('Please log in'); return }
    try {
      const existingRating = userRatings.get(reviewId)
      if (existingRating) {
        const { error } = await supabase.from('building_review_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('review_id', reviewId).eq('user_id', user.id)
        if (error) { toast.error(`Error: ${error.message}`); return }
      } else {
        const { error } = await supabase.from('building_review_ratings')
          .insert({ review_id: reviewId, user_id: user.id, rating })
        if (error) { toast.error(`Error: ${error.message}`); return }
      }
      const oldRating = userRatings.get(reviewId)
      setUserRatings(prev => new Map(prev).set(reviewId, rating))
      setBuildingReviews(prev => prev.map((r: any) => {
        if (r.id !== reviewId) return r
        const oldAvg = r.user_rating_avg || 0
        const oldCount = r.user_rating_count || 0
        const newCount = oldRating ? oldCount : oldCount + 1
        const newAvg = oldRating
          ? (oldCount > 0 ? (oldAvg * oldCount - oldRating + rating) / oldCount : rating)
          : (oldAvg * oldCount + rating) / newCount
        return { ...r, user_rating_avg: newAvg, user_rating_count: newCount }
      }))
      toast.success(`Rating ${rating}/5 saved!`)
    } catch (e) {
      toast.error('Error saving rating')
    }
  }

  const goToPrevious = () => { if (currentPointIndex > 0) setCurrentPointIndex(currentPointIndex - 1) }
  const goToNext = () => { if (currentPointIndex < (route.route_points?.length || 0) - 1) setCurrentPointIndex(currentPointIndex + 1) }

  const startLocationTracking = () => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return }
    setIsTrackingLocation(true)
    setLocationError('')
    setShowNavigationPanel(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy })
        const interval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const nl = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }
              setUserLocation(cl => cl && calculateDistance(cl.latitude, cl.longitude, nl.latitude, nl.longitude) > 10 ? nl : cl || nl)
            },
            () => {}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        }, 120000)
        setWatchId(interval as any)
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

  const exportToGoogleMaps = () => {
    if (!route.route_points?.length) return
    const wp = route.route_points.map((p: any) => `${p.latitude},${p.longitude}`).join('/')
    window.open(`https://www.google.com/maps/dir/${wp}`, '_blank')
    setExportStatus('Opened in Google Maps')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const exportToGPX = () => {
    if (!route.route_points?.length) return
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ArchiRoutes" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${route.title || 'Route'}</name><time>${new Date().toISOString()}</time></metadata>
`
    route.route_points.forEach((p: any, i: number) => {
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

  // Route header content (title, location, stats pills, tags)
  const routeHeaderContent = (compact: boolean) => (
    <div>
      <div className="flex items-center gap-1 text-muted-foreground mb-1.5">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span className="uppercase tracking-wide text-xs font-medium">
          {route.city}{route.country ? `, ${route.country}` : ''}
        </span>
      </div>
      <h1 className={`font-bold font-display text-foreground leading-snug mb-2 ${compact ? 'text-lg' : 'text-xl md:text-2xl'}`}>
        {route.title}
      </h1>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded-full text-xs border border-border">
          {getTransportIcon(transportMode)}{transportLabel}
        </span>
        <span className="flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded-full text-xs border border-border font-metrics">
          <Clock className="h-3 w-3" />
          {route.route_summary ? formatDuration(route.route_summary.duration) : `${route.estimated_duration_minutes || 'N/A'} min`}
        </span>
        <span className="flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded-full text-xs border border-border font-metrics">
          <RouteIcon className="h-3 w-3" />
          {route.route_summary ? formatDistance(route.route_summary.distance) : `${route.distance_km || 'N/A'} km`}
        </span>
        <span className="flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded-full text-xs border border-border font-metrics">
          <MapPin className="h-3 w-3" />{route.route_points?.length || 0} pts
        </span>
        {route.difficulty_level && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            route.difficulty_level === 'easy' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            : route.difficulty_level === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200'
            : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {route.difficulty_level.charAt(0).toUpperCase() + route.difficulty_level.slice(1)}
          </span>
        )}
        {Number(route.rating) > 0 && (
          <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs border border-yellow-200 font-metrics">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{Number(route.rating).toFixed(1)}
          </span>
        )}
      </div>
      {route.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {route.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full border border-border">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  // Shared stats block
  const routeStatsContent = (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 text-muted-foreground flex-shrink-0">{getTransportIcon(transportMode)}</div>
        <div><span className="text-xs text-muted-foreground block">Transport</span><p className="text-sm font-medium text-foreground">{transportLabel}</p></div>
      </div>
      <div className="flex items-start gap-2.5">
        <RouteIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div><span className="text-xs text-muted-foreground block">Distance</span>
          <p className="text-sm font-medium font-metrics text-foreground">
            {route.route_summary ? formatDistance(route.route_summary.distance) : `${route.distance_km || 'N/A'} km`}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div><span className="text-xs text-muted-foreground block">Duration</span>
          <p className="text-sm font-medium font-metrics text-foreground">
            {route.route_summary ? formatDuration(route.route_summary.duration) : `${route.estimated_duration_minutes || 'N/A'} min`}
          </p>
        </div>
      </div>
      {route.difficulty_level && (
        <div className="flex items-start gap-2.5">
          <Gauge className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div><span className="text-xs text-muted-foreground block">Difficulty</span><p className="text-sm font-medium text-foreground capitalize">{route.difficulty_level}</p></div>
        </div>
      )}
      {creator && (
        <div className="flex items-start gap-2.5">
          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div><span className="text-xs text-muted-foreground block">Created by</span><p className="text-sm font-medium text-foreground">{creator.full_name || creator.username || 'User'}</p></div>
        </div>
      )}
      {createdDate && (
        <div className="flex items-start gap-2.5">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div><span className="text-xs text-muted-foreground block">Created</span><p className="text-sm font-medium text-foreground">{createdDate}</p></div>
        </div>
      )}
    </div>
  )

  // Shared route reviews content
  const routeReviewsContent = (
    <>
      {reviewsLoading
        ? <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
        : <RouteReviewsList routeId={route.id} reviews={routeReviews} onOpenAddReview={() => setShowAddReviewModal(true)} />
      }
    </>
  )

  // Action buttons overlaid on photo (shared between photo and no-photo states)
  const photoActionBar = (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
      <Link
        href="/routes"
        className="pointer-events-auto flex items-center gap-1.5 bg-black/40 text-white backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium hover:bg-black/60 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /><span>Routes</span>
      </Link>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          onClick={isTrackingLocation ? stopLocationTracking : startLocationTracking}
          className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
            isTrackingLocation ? 'bg-primary text-primary-foreground shadow-primary/40 shadow-md' : 'bg-black/40 text-white hover:bg-black/60'
          }`}
          title={isTrackingLocation ? 'Stop GPS' : 'Start GPS'}
        >
          <Navigation className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-sm transition-colors"
            title="Export / Share"
          >
            <Download className="h-4 w-4" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-[var(--radius)] shadow-xl z-20">
              <button onClick={() => { exportToGoogleMaps(); setShowExportMenu(false) }}
                className="w-full px-4 py-2.5 text-left hover:bg-muted rounded-t-[var(--radius)] flex items-center gap-2 text-sm">
                <MapIcon size={16} /><span>Google Maps</span><ExternalLink size={12} className="ml-auto text-muted-foreground" />
              </button>
              <button onClick={() => { exportToGPX(); setShowExportMenu(false) }}
                className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-2 text-sm">
                <Download size={16} /><span>Download GPX</span>
              </button>
              <div className="border-t border-border" />
              <button onClick={() => { shareRoute(); setShowExportMenu(false) }}
                className="w-full px-4 py-2.5 text-left hover:bg-muted rounded-b-[var(--radius)] flex items-center gap-2 text-sm">
                {copySuccess
                  ? <><CheckCircle size={16} className="text-primary" /><span className="text-primary">Copied!</span></>
                  : <><Share2 size={16} /><span>Share</span></>}
              </button>
            </div>
          )}
        </div>

        {!checkingPermissions && canEdit && (
          <Link href={`/routes/${route.id}/edit`}
            className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-sm transition-colors" title="Edit">
            <Edit className="h-4 w-4" />
          </Link>
        )}
        {!checkingPermissions && canDelete && (
          <button onClick={() => setShowDeleteModal(true)}
            className="p-2 bg-black/40 text-red-400 rounded-full hover:bg-black/60 backdrop-blur-sm transition-colors" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <div className="[&_button]:bg-black/40 [&_button]:text-white [&_button:hover]:bg-black/60 [&_button]:backdrop-blur-sm [&_button]:border-0">
          <RouteFavoriteButton routeId={route.id} routeTitle={route.title} size="sm" variant="icon" showText={false} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="min-h-screen bg-background">

        {/* GPS Panel */}
        {showNavigationPanel && (
          <div className="container mx-auto px-4 md:px-6 pt-4 max-w-screen-xl">
            <div className="bg-primary/5 border border-primary rounded-[var(--radius)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Navigation size={18} className="text-primary" />
                  <h3 className="font-semibold font-display text-foreground text-sm">GPS Navigation Active</h3>
                </div>
                <button onClick={stopLocationTracking} className="p-1 hover:bg-muted rounded-full transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {locationError ? (
                <div className="text-destructive text-sm bg-destructive/10 rounded-[var(--radius)] p-3">{locationError}</div>
              ) : userLocation ? (
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <span className="text-muted-foreground font-metrics">
                    {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    <span className="ml-1.5 text-xs">(±{Math.round(userLocation.accuracy)}m)</span>
                  </span>
                  {currentPoint?.latitude && currentPoint?.longitude && (
                    <span className="font-medium text-primary font-metrics">
                      {formatDistance(calculateDistance(userLocation.latitude, userLocation.longitude, currentPoint.latitude, currentPoint.longitude))} to {currentPoint.title}
                    </span>
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
          <div className="container mx-auto px-4 md:px-6 pt-4 max-w-screen-xl">
            <div className="bg-primary/10 border border-primary rounded-[var(--radius)] p-3 flex items-center text-primary text-sm">
              <CheckCircle size={16} className="mr-2" />{exportStatus}
            </div>
          </div>
        )}

        {/* Main: two-column */}
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 max-w-screen-xl">
          <div className="flex gap-6 items-start">

            {/* LEFT SIDEBAR — desktop sticky */}
            <aside className="hidden lg:flex flex-col gap-4 w-72 xl:w-80 flex-shrink-0 sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pb-4">

              {/* Route header */}
              <div className="bg-card rounded-[var(--radius)] border border-border p-4">
                {routeHeaderContent(true)}
              </div>

              {/* Progress + Navigation */}
              {route.route_points?.length > 0 && (
                <div className="bg-card rounded-[var(--radius)] border border-border p-4">
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-metrics">
                      <span>Point {currentPointIndex + 1} of {route.route_points.length}</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={goToPrevious} disabled={currentPointIndex === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-colors">
                      <ChevronLeft className="w-4 h-4" />Previous
                    </button>
                    <button onClick={goToNext} disabled={currentPointIndex >= route.route_points.length - 1}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-colors">
                      Next<ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Points list with thumbnails */}
              {route.route_points?.length > 0 && (
                <div className="bg-card rounded-[var(--radius)] border border-border p-3">
                  <h3 className="font-semibold font-display text-foreground mb-2 px-1 text-sm">
                    Route Points ({route.route_points.length})
                  </h3>
                  <div className="space-y-1">
                    {route.route_points.map((point: any, index: number) => {
                      const isCurrent = index === currentPointIndex
                      const isPassed = index < currentPointIndex
                      const imgUrl = point.buildings?.image_url ? getStorageUrl(point.buildings.image_url, 'photos') : null
                      return (
                        <button key={point.id} onClick={() => setCurrentPointIndex(index)}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-[var(--radius)] border transition-all text-left ${
                            isCurrent ? 'border-primary bg-primary/5'
                            : isPassed ? 'border-border bg-muted/50'
                            : 'border-border bg-card hover:border-primary/50'
                          }`}>
                          <div className="relative flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-muted">
                            {imgUrl ? (
                              <img src={imgUrl} alt={point.title}
                                className={`w-full h-full object-cover ${isPassed ? 'grayscale opacity-70' : ''}`} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className={`w-5 h-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                              </div>
                            )}
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-metrics shadow-sm ${
                              isCurrent ? 'bg-primary text-primary-foreground'
                              : isPassed ? 'bg-muted-foreground/80 text-background'
                              : 'bg-background/90 text-foreground border border-border'
                            }`}>
                              {isPassed ? <Check className="w-2.5 h-2.5" /> : index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium block truncate ${
                              isCurrent ? 'text-primary' : isPassed ? 'text-muted-foreground' : 'text-foreground'
                            }`}>{point.title}</span>
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

              {/* About the Route */}
              <div className="bg-card rounded-[var(--radius)] border border-border p-4">
                <h3 className="font-semibold font-display text-foreground mb-3 text-sm">About the Route</h3>
                {route.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 pb-3 border-b border-border">{route.description}</p>
                )}
                {routeStatsContent}
              </div>

              {/* Route Reviews */}
              {route.is_published && (
                <div className="bg-card rounded-[var(--radius)] border border-border p-4">
                  <h3 className="text-sm font-semibold font-display text-foreground flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-400" />Route Reviews
                    {routeReviews.length > 0 && <span className="text-xs font-normal text-muted-foreground">({routeReviews.length})</span>}
                  </h3>
                  {routeReviewsContent}
                </div>
              )}
            </aside>

            {/* RIGHT MAIN — pb-28 on mobile for fixed bottom bar */}
            <div className="flex-1 min-w-0 space-y-4 pb-28 lg:pb-0">

              {/* Mobile-only: route header */}
              <div className="lg:hidden bg-card rounded-[var(--radius)] border border-border p-4">
                {routeHeaderContent(false)}
              </div>

              {/* Photo gallery — always shown, with action buttons */}
              <div
                className="relative rounded-[var(--radius)] overflow-hidden group h-64 md:h-80 lg:h-96 bg-zinc-900"
                onTouchStart={currentPointPhotos.length > 1 ? handleTouchStart : undefined}
                onTouchEnd={currentPointPhotos.length > 1 ? handleTouchEnd : undefined}
              >
                {/* Background image */}
                {currentPointPhotos.length > 0 ? (
                  <img
                    src={getStorageUrl(currentPointPhotos[currentPhotoIndex], 'photos')}
                    alt={currentPoint?.title || route.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : heroImageUrl ? (
                  <img src={heroImageUrl} alt={route.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="absolute inset-0 opacity-[0.06]" style={{
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px),
                      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)`
                  }} />
                )}

                {/* Action buttons */}
                {photoActionBar}

                {/* Photo navigation (multiple photos) */}
                {currentPointPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex(i => i === 0 ? currentPointPhotos.length - 1 : i - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground rounded-full p-2 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex(i => i === currentPointPhotos.length - 1 ? 0 : i + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground rounded-full p-2 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {/* Counter bottom-right */}
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-metrics z-10">
                      {currentPhotoIndex + 1} / {currentPointPhotos.length}
                    </div>
                    {/* Dot indicators bottom-center */}
                    {currentPointPhotos.length <= 10 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                        {currentPointPhotos.map((_: string, i: number) => (
                          <button key={i} onClick={() => setCurrentPhotoIndex(i)}
                            className={`h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/60 w-2'}`} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {currentPoint ? (
                <>
                  {/* Building info card */}
                  <div className="bg-card border border-border rounded-[var(--radius)] p-5">
                    <h2 className="text-xl md:text-2xl font-bold font-display text-foreground mb-3">
                      {currentPoint.buildings?.id ? (
                        <Link href={`/buildings/${currentPoint.buildings.id}`} className="hover:text-primary transition-colors">
                          {currentPoint.title}
                        </Link>
                      ) : currentPoint.title}
                    </h2>
                    {currentPoint.buildings && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                        {currentPoint.buildings.address && (
                          <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{currentPoint.buildings.address}</div>
                        )}
                        {currentPoint.buildings.architect && (
                          <div className="flex items-center gap-1"><User className="w-3.5 h-3.5 flex-shrink-0" />{currentPoint.buildings.architect}</div>
                        )}
                        {currentPoint.buildings.year_built && (
                          <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /><span className="font-metrics">{currentPoint.buildings.year_built}</span></div>
                        )}
                        {currentPoint.buildings.architectural_style && (
                          <span className="px-2 py-0.5 bg-muted rounded-full text-xs border border-border">{currentPoint.buildings.architectural_style}</span>
                        )}
                        {currentPoint.estimated_time_minutes && (
                          <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /><span className="font-metrics">{currentPoint.estimated_time_minutes} min</span></div>
                        )}
                      </div>
                    )}
                    {currentPoint.instructions && (
                      <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius)] p-3 mt-4">
                        <p className="text-foreground text-sm">{currentPoint.instructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Review text (collapsible) */}
                  {(selectedReview?.content || currentPoint.description || currentPoint.buildings?.description) && (
                    <div className="bg-card border border-border rounded-[var(--radius)] p-5">
                      {selectedReview?.content ? (
                        <>
                          {selectedReview.title && (
                            <h3 className="font-semibold font-display text-foreground mb-2">{selectedReview.title}</h3>
                          )}
                          <p className={`text-foreground leading-relaxed whitespace-pre-line ${reviewTextExpanded ? '' : 'line-clamp-3'}`}>
                            {selectedReview.content}
                          </p>
                          {selectedReview.content.length > 200 && (
                            <button onClick={() => setReviewTextExpanded(v => !v)}
                              className="mt-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                              {reviewTextExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                          {selectedReview.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {selectedReview.tags.map((tag: string, idx: number) => (
                                <span key={idx} className="bg-muted text-foreground px-2 py-1 rounded-full text-xs">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : currentPoint.description ? (
                        <p className="text-foreground leading-relaxed">{currentPoint.description}</p>
                      ) : (
                        <p className="text-foreground leading-relaxed">{currentPoint.buildings?.description}</p>
                      )}
                    </div>
                  )}

                  {/* Audio player */}
                  {selectedReview?.audio_url && (
                    <div className="bg-card border border-border rounded-[var(--radius)] p-5">
                      <h3 className="text-base font-semibold font-display text-foreground mb-3 flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-primary" />Audio Guide
                      </h3>
                      <AudioPlayer
                        audioUrl={getStorageUrl(selectedReview.audio_url, 'audio')}
                        title={selectedReview.title || currentPoint.title}
                        onPositionChange={async (position: number) => {
                          if (user && currentPoint) {
                            await supabase.from('route_point_review_selections')
                              .update({ audio_position_seconds: Math.floor(position), last_listened_at: new Date().toISOString() })
                              .eq('user_id', user.id).eq('route_id', route.id).eq('route_point_id', currentPoint.id)
                          }
                        }}
                        initialPosition={0}
                      />
                    </div>
                  )}

                  {/* Building Reviews */}
                  <div className="bg-card border border-border rounded-[var(--radius)] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold font-display text-foreground">
                        Building Reviews {buildingReviews.length > 0 && `(${buildingReviews.length})`}
                      </h3>
                      {buildingReviews.filter((r: any) => r.audio_url).length > 0 && (
                        <div className="text-sm text-muted-foreground font-metrics flex items-center gap-1">
                          <Headphones className="w-3 h-3" />{buildingReviews.filter((r: any) => r.audio_url).length} with audio
                        </div>
                      )}
                    </div>
                    {loadingBuildingReviews ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-[var(--radius)] animate-pulse" />)}
                      </div>
                    ) : buildingReviews.length === 0 ? (
                      <div className="bg-muted/50 border border-dashed border-border rounded-[var(--radius)] p-6 text-center">
                        <p className="text-muted-foreground text-sm">No reviews yet for this object</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {(showAllBuildingReviews ? buildingReviews : buildingReviews.slice(0, 3)).map((review: any) => {
                            const isSelected = review.id === selectedReviewId
                            const isFullReview = !!(review.content?.length >= 200 && review.photos?.length >= 2 && review.audio_url)
                            return (
                              <div key={review.id} onClick={() => !isSelected && handleSelectReview(review.id)}
                                className={`border-2 rounded-[var(--radius)] p-4 transition-all ${
                                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer'
                                }`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center flex-wrap gap-1.5">
                                    {review.user_rating_count > 0 && (
                                      <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded">
                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mr-1" />
                                        <span className="text-sm font-semibold font-metrics">{review.user_rating_avg?.toFixed(1)}</span>
                                        <span className="text-xs text-muted-foreground ml-1 font-metrics">({review.user_rating_count})</span>
                                      </div>
                                    )}
                                    {isFullReview && (
                                      <span className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold border border-yellow-300">COMPLETE</span>
                                    )}
                                    {review.audio_url && (
                                      <span className="flex items-center bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-medium"><Headphones className="w-3 h-3 mr-1" />Audio</span>
                                    )}
                                    {review.is_verified && (
                                      <span className="flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-medium"><CheckCircle className="w-3 h-3 mr-1" />Verified</span>
                                    )}
                                    {review.is_featured && (
                                      <span className="flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium"><Award className="w-3 h-3 mr-1" />Recommended</span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <span className="flex items-center text-primary text-sm font-medium flex-shrink-0"><Check className="w-4 h-4 mr-1" />Selected</span>
                                  )}
                                </div>
                                {review.title && <h4 className="font-semibold font-display text-foreground mb-1 text-sm">{review.title}</h4>}
                                {review.content && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{review.content}</p>}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 font-metrics">
                                  {review.photos?.length > 0 && <span>{review.photos.length} photos</span>}
                                  {review.audio_duration_seconds && (
                                    <span className="flex items-center"><Headphones className="w-3 h-3 mr-1" />{Math.floor(review.audio_duration_seconds / 60)} min</span>
                                  )}
                                </div>
                                <div className="border-t border-border pt-2" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map(star => {
                                        const userRating = userRatings.get(review.id) || 0
                                        const isActive = userRating >= star || (hoveredRating?.reviewId === review.id && (hoveredRating?.rating ?? 0) >= star)
                                        return (
                                          <button key={star}
                                            onClick={e => { e.stopPropagation(); handleRateReview(review.id, star) }}
                                            onMouseEnter={() => setHoveredRating({ reviewId: review.id, rating: star })}
                                            onMouseLeave={() => setHoveredRating(null)}
                                            className="p-0.5 transition-transform hover:scale-110">
                                            <Star className={`w-4 h-4 transition-colors ${isActive ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                                          </button>
                                        )
                                      })}
                                      <span className="text-xs text-muted-foreground ml-2">Rate this review</span>
                                    </div>
                                    <button
                                      onClick={e => { e.stopPropagation(); setBuildingReviewCommentsModal({ id: review.id, title: review.title || 'Review', author: 'Author' }) }}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      {buildingReviewCommentCounts.get(review.id)
                                        ? `Comments (${buildingReviewCommentCounts.get(review.id)})`
                                        : 'Comments'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {buildingReviews.length > 3 && (
                          <div className="text-center mt-4">
                            <button onClick={() => setShowAllBuildingReviews(!showAllBuildingReviews)}
                              className="px-4 py-2 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors font-medium text-sm">
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

              {/* Mobile-only: Route Stats */}
              <div className="lg:hidden bg-card rounded-[var(--radius)] border border-border p-4">
                <h3 className="font-semibold font-display text-foreground mb-3 text-sm">About the Route</h3>
                {route.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 pb-3 border-b border-border">{route.description}</p>
                )}
                {routeStatsContent}
              </div>

              {/* Mobile-only: Route Reviews */}
              {route.is_published && (
                <div className="lg:hidden bg-card rounded-[var(--radius)] border border-border p-4">
                  <h3 className="text-sm font-semibold font-display text-foreground flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-400" />Route Reviews
                    {routeReviews.length > 0 && <span className="text-xs font-normal text-muted-foreground">({routeReviews.length})</span>}
                  </h3>
                  {routeReviewsContent}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map — full width, below content */}
        <div className="container mx-auto px-4 md:px-6 mt-2 mb-8 max-w-screen-xl">
          <div className="bg-card rounded-[var(--radius)] border border-border overflow-hidden">
            <div className="h-[300px] md:h-[450px] lg:h-[520px]">
              <MapLibreRouteMap
                route={route}
                userLocation={userLocation}
                currentPointIndex={currentPointIndex}
                showNavigation={showNavigationPanel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile fixed bottom: points carousel */}
      {route.route_points?.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg">
          {/* Thumbnail strip */}
          <div className="flex gap-2 overflow-x-auto px-3 pt-2.5 pb-1 scrollbar-none">
            {route.route_points.map((point: any, index: number) => {
              const isCurrent = index === currentPointIndex
              const isPassed = index < currentPointIndex
              const imgUrl = point.buildings?.image_url ? getStorageUrl(point.buildings.image_url, 'photos') : null
              return (
                <button
                  key={point.id}
                  onClick={() => setCurrentPointIndex(index)}
                  className={`flex-shrink-0 flex flex-col items-center relative transition-all duration-200 ${
                    isCurrent ? 'scale-110' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-[var(--radius)] overflow-hidden border-2 transition-all ${
                    isCurrent ? 'border-primary shadow-sm shadow-primary/30' : 'border-border'
                  }`}>
                    {imgUrl ? (
                      <img src={imgUrl} alt={point.title}
                        className={`w-full h-full object-cover ${isPassed ? 'grayscale opacity-60' : ''}`} />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MapPin className={`w-4 h-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    )}
                  </div>
                  {/* Badge */}
                  <div className={`absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-metrics shadow ${
                    isCurrent ? 'bg-primary text-primary-foreground'
                    : isPassed ? 'bg-muted-foreground/80 text-background'
                    : 'bg-background/90 text-foreground border border-border'
                  }`}>
                    {isPassed ? <Check className="w-2 h-2" /> : index + 1}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5 w-12 truncate text-center leading-tight">
                    {point.title}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Prev / counter / Next row */}
          <div className="flex items-center justify-between px-3 py-2">
            <button onClick={goToPrevious} disabled={currentPointIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </button>
            <span className="text-xs font-semibold text-foreground font-metrics">
              {currentPointIndex + 1} / {route.route_points.length}
              {currentPoint && <span className="font-normal text-muted-foreground ml-1.5">· {currentPoint.title}</span>}
            </span>
            <button onClick={goToNext} disabled={currentPointIndex >= route.route_points.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium transition-colors">
              Next<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {canDelete && (
        <DeleteContentModal contentType="route" contentId={route.id} contentTitle={route.title}
          isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
      )}
      {route.is_published && (
        <AddRouteReviewModal routeId={route.id} routeTitle={route.title}
          isOpen={showAddReviewModal} onClose={() => setShowAddReviewModal(false)} onSuccess={loadRouteReviews} />
      )}
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
                if (data) setBuildingReviewCommentCounts(prev => new Map(prev).set(reviewId, data.length))
              })
          }}
          reviewId={buildingReviewCommentsModal.id}
          reviewTitle={buildingReviewCommentsModal.title}
          reviewAuthor={buildingReviewCommentsModal.author}
        />
      )}
      {showExportMenu && (
        <div className="fixed inset-0 z-[4]" onClick={() => setShowExportMenu(false)} />
      )}
    </>
  )
}
