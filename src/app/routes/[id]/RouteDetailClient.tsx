// src/app/routes/[id]/RouteDetailClient.tsx - With GPS navigation and export
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEditPermissions } from '../../../hooks/useEditPermissions'
import {
  Edit, MapPin, Clock, Users, Star, ArrowLeft, Play, Heart, Trash2, MoreVertical,
  Route as RouteIcon, AlertCircle, Navigation, Download, Share2, Map, Smartphone,
  ExternalLink, Copy, CheckCircle, Check
} from 'lucide-react'
import dynamic from 'next/dynamic'
import DeleteContentModal from '../../../components/DeleteContentModal'
import RouteFavoriteButton, { RouteCompletedButton } from '../../../components/RouteFavoriteButton'
import { Route, TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'
import RouteReviewsList from '../../../components/routes/RouteReviewsList'
import AddRouteReviewModal from '../../../components/routes/AddRouteReviewModal'

// Dynamic import of MapLibre map (migrated from Leaflet)
const MapLibreRouteMap = dynamic(() => import('./MapLibreRouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-muted flex items-center justify-center rounded-[var(--radius)]">
    <span className="text-muted-foreground">Loading map...</span>
  </div>
})

interface RouteDetailClientProps {
  route: any
}

interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
}

// Distance calculation function
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export default function RouteDetailClient({ route }: RouteDetailClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<any>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // GPS navigation
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string>('')
  const [watchId, setWatchId] = useState<number | null>(null)
  const [showNavigationPanel, setShowNavigationPanel] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Export states
  const [exportStatus, setExportStatus] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([])
  const [showAddReviewModal, setShowAddReviewModal] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkAuth()

    // Load reviews only for published routes
    if (route.is_published) {
      loadReviews()
    }
  }, [route.id, supabase])

  // Load reviews
  const loadReviews = async () => {
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

      if (!error && data) {
        setReviews(data)
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Use hook to check permissions
  const permissions = useEditPermissions('route', route.id, user?.id || null)
  const canEdit = permissions.canEdit
  const userRole = permissions.userRole
  const checkingPermissions = permissions.isLoading

  const canDelete = canEdit && (
    userRole === 'admin' ||
    userRole === 'moderator' ||
    route.created_by === user?.id
  )

  // Get transport data
  const transportMode = route.transport_mode || 'walking'
  const transportIcon = TransportModeHelper.getIcon(transportMode)
  const transportLabel = TransportModeHelper.getLabel(transportMode)

  // Check if route has real geometry
  const hasRealRoute = !!(route.route_geometry && route.route_geometry.coordinates && route.route_geometry.coordinates.length > 0)

  // Progress
  const progressPercent = route.route_points && route.route_points.length > 0
    ? ((currentStepIndex + 1) / route.route_points.length) * 100
    : 0

  // GPS Navigation
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('❌ Geolocation is not supported by your browser')
      return
    }

    setIsTrackingLocation(true)
    setLocationError('')
    setShowNavigationPanel(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }

        setUserLocation(location)

        const updateInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (newPosition) => {
              const newLocation: UserLocation = {
                latitude: newPosition.coords.latitude,
                longitude: newPosition.coords.longitude,
                accuracy: newPosition.coords.accuracy
              }

              setUserLocation(currentLocation => {
                if (currentLocation) {
                  const distance = calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    newLocation.latitude, newLocation.longitude
                  )

                  if (distance > 10) {
                    return newLocation
                  } else {
                    return currentLocation
                  }
                } else {
                  return newLocation
                }
              })
            },
            (error) => console.log('GPS update error:', error.message),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        }, 120000)

        setWatchId(updateInterval as any)
      },
      (error) => {
        let errorMessage = ''
        switch (error.code) {
          case 1:
            errorMessage = '🔒 GPS access denied. Allow location access in browser settings'
            break
          case 2:
            errorMessage = '📡 GPS unavailable. Check connection and enable GPS'
            break
          case 3:
            errorMessage = '⏱️ GPS timeout. Please try again'
            break
          default:
            errorMessage = `❌ GPS error: ${error.message || 'Unknown error'}`
        }

        setLocationError(errorMessage)
        setIsTrackingLocation(false)
        setShowNavigationPanel(false)
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    )
  }

  const stopLocationTracking = () => {
    if (watchId !== null) {
      clearInterval(watchId)
      setWatchId(null)
    }
    setIsTrackingLocation(false)
    setUserLocation(null)
    setShowNavigationPanel(false)
    setLocationError('')
  }

  const calculateDistanceToNextPoint = () => {
    if (!userLocation || !route.route_points || currentStepIndex >= route.route_points.length) {
      return null
    }

    const nextPoint = route.route_points[currentStepIndex]
    if (!nextPoint.latitude || !nextPoint.longitude) {
      return null
    }

    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      nextPoint.latitude,
      nextPoint.longitude
    )
  }

  // Route export functions
  const exportToGoogleMaps = () => {
    if (!route.route_points || route.route_points.length === 0) {
      alert('No route points to export')
      return
    }

    const waypoints = route.route_points
      .map((point: any) => `${point.latitude},${point.longitude}`)
      .join('/')

    const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`
    window.open(googleMapsUrl, '_blank')
    setExportStatus('Opened in Google Maps')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const exportToGPX = () => {
    if (!route.route_points || route.route_points.length === 0) {
      alert('No route points to export GPX')
      return
    }

    const gpxContent = generateGPX()
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${route.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus('GPX file downloaded')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const generateGPX = (): string => {
    const waypoints = route.route_points || []
    const routeName = route.title || 'Architectural Route'
    const routeDescription = route.description || 'Route created in ArchiRoutes'

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ArchiRoutes" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeName}</name>
    <desc>${routeDescription}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
`

    waypoints.forEach((point: any, index: number) => {
      gpxContent += `  <wpt lat="${point.latitude}" lon="${point.longitude}">
    <name>${index + 1}. ${point.title}</name>
    <desc>${point.description || ''}</desc>
    <type>waypoint</type>
  </wpt>
`
    })

    if (route.route_geometry?.coordinates && route.route_geometry.coordinates.length > 0) {
      gpxContent += `  <trk>
    <name>${routeName}</name>
    <type>${transportMode}</type>
    <trkseg>
`

      route.route_geometry.coordinates.forEach((coord: any) => {
        gpxContent += `      <trkpt lat="${coord[1]}" lon="${coord[0]}">
        <time>${new Date().toISOString()}</time>
      </trkpt>
`
      })

      gpxContent += `    </trkseg>
  </trk>
`
    }

    gpxContent += `</gpx>`
    return gpxContent
  }

  const shareRoute = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: route.title,
          text: route.description || 'Interesting architectural route',
          url: url
        })
        setExportStatus('Route shared')
      } catch (error) {
        console.log('Sharing cancelled')
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (error) {
        prompt('Copy link:', url)
      }
    }
    setTimeout(() => setExportStatus(''), 3000)
  }

  // Cleanup tracking on unmount
  useEffect(() => {
    (window as any).setCurrentStepFromMap = (pointIndex: number) => {
      setCurrentStepIndex(pointIndex)
    }

    return () => {
      if (watchId !== null) {
        clearInterval(watchId)
      }
      delete (window as any).setCurrentStepFromMap
    }
  }, [watchId])

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header with action buttons */}
        <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 md:p-6 mb-6 shadow-sm">
          {/* Main information */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
              {route.title}
            </h1>

            {/* Meta information */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center">
                <MapPin size={16} className="mr-1" />
                <span>{route.city}, {route.country}</span>
              </div>

              <div className="flex items-center">
                <span className="text-lg mr-1">{transportIcon}</span>
                <span>{transportLabel}</span>
              </div>

              <div className="flex items-center">
                <Clock size={16} className="mr-1" />
                <span className="font-metrics">
                  {route.route_summary
                    ? formatDuration(route.route_summary.duration)
                    : `${route.estimated_duration_minutes || 'N/A'} min`
                  }
                </span>
              </div>

              <div className="flex items-center">
                <Users size={16} className="mr-1" />
                <span className="font-metrics">{route.points_count} points</span>
              </div>

              <div className="flex items-center">
                <RouteIcon size={16} className="mr-1" />
                <span className="font-metrics">
                  {route.route_summary
                    ? formatDistance(route.route_summary.distance)
                    : `${route.distance_km || 'N/A'} km`
                  }
                </span>
              </div>

              {route.difficulty_level && (
                <div className="flex items-center">
                  <Star size={16} className="mr-1" />
                  <span className="capitalize">{route.difficulty_level}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {route.tags && route.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {route.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description if available */}
            {route.description && (
              <div className="bg-muted rounded-[var(--radius)] p-4 border border-border">
                <p className="text-foreground leading-relaxed">
                  {route.description}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* GPS navigation */}
            {!isTrackingLocation ? (
              <button
                onClick={startLocationTracking}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-[var(--radius)] hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Navigation size={16} className="mr-2" />
                Start GPS
              </button>
            ) : (
              <button
                onClick={stopLocationTracking}
                className="inline-flex items-center px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-[var(--radius)] hover:bg-destructive/90 transition-colors shadow-sm"
              >
                <Navigation size={16} className="mr-2" />
                Stop GPS
              </button>
            )}

            {/* Export */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center px-4 py-2 border-2 border-border text-foreground text-sm font-medium rounded-[var(--radius)] hover:bg-muted transition-colors"
              >
                <Download size={16} className="mr-2" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-card border-2 border-border rounded-[var(--radius)] shadow-lg z-10">
                  <button
                    onClick={() => {
                      exportToGoogleMaps()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors rounded-t-[var(--radius)] flex items-center space-x-2"
                  >
                    <Map size={16} />
                    <span>Open in Google Maps</span>
                    <ExternalLink size={14} className="ml-auto" />
                  </button>

                  <button
                    onClick={() => {
                      exportToGPX()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span>Download GPX file</span>
                  </button>

                  <hr className="border-border" />

                  <button
                    onClick={() => {
                      shareRoute()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors rounded-b-[var(--radius)] flex items-center space-x-2"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle size={16} className="text-primary" />
                        <span className="text-primary">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} />
                        <span>Share Route</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Management buttons (if permissions) */}
            {!checkingPermissions && canEdit && (
              <>
                <a
                  href={`/routes/${route.id}/edit`}
                  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-[var(--radius)] hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </a>

                {canDelete && (
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="inline-flex items-center px-4 py-2 border-2 border-destructive text-destructive text-sm font-medium rounded-[var(--radius)] hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </button>

                    {showActionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border-2 border-border rounded-[var(--radius)] shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowDeleteModal(true)
                            setShowActionsMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-destructive hover:bg-muted rounded-[var(--radius)] flex items-center space-x-2"
                        >
                          <Trash2 size={16} />
                          <span>Confirm Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Favorite and completion buttons */}
            <div className="flex items-center gap-3 ml-auto">
              <RouteFavoriteButton
                routeId={route.id}
                routeTitle={route.title}
                size="md"
              />

              <RouteCompletedButton
                routeId={route.id}
                routeTitle={route.title}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* GPS navigation panel */}
        {showNavigationPanel && (
          <div className="bg-primary/5 border-2 border-primary rounded-[var(--radius)] p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Navigation size={20} className="text-primary mr-2" />
                <h3 className="font-semibold font-display text-foreground">GPS Navigation Active</h3>
              </div>
              <button
                onClick={stopLocationTracking}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {locationError ? (
              <div className="text-destructive text-sm bg-destructive/10 rounded-[var(--radius)] p-3">{locationError}</div>
            ) : userLocation ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground bg-card rounded-[var(--radius)] p-3 border border-border">
                  <div className="font-metrics">📍 {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</div>
                  <div className="font-metrics">Accuracy: ±{Math.round(userLocation.accuracy)}m</div>
                </div>

                {route.route_points && currentStepIndex < route.route_points.length && (
                  <div className="bg-card rounded-[var(--radius)] p-4 border-2 border-primary">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground mb-1">
                          Next: {route.route_points[currentStepIndex]?.title}
                        </div>
                        <div className="text-sm text-muted-foreground font-metrics">
                          {(() => {
                            const distance = calculateDistanceToNextPoint()
                            return distance ? `${formatDistance(distance)} away` : 'Calculating...'
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary font-metrics">
                          {currentStepIndex + 1}/{route.route_points.length}
                        </div>
                        {currentStepIndex < route.route_points.length - 1 && (
                          <button
                            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                            className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-[var(--radius)] mt-1 hover:bg-primary/90 transition-colors"
                          >
                            Next →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Getting location...</div>
            )}
          </div>
        )}

        {/* Export status */}
        {exportStatus && (
          <div className="bg-primary/10 border border-primary rounded-[var(--radius)] p-3 mb-6">
            <div className="flex items-center text-primary">
              <CheckCircle size={16} className="mr-2" />
              {exportStatus}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar - Route points list */}
          <div className="lg:col-span-1 space-y-4">
            {/* Progress */}
            {route.route_points && route.route_points.length > 0 && (
              <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium font-display text-foreground">Progress</span>
                  <span className="text-sm text-muted-foreground font-metrics">
                    {currentStepIndex + 1} / {route.route_points.length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Route statistics */}
            <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 shadow-sm">
              <h3 className="font-semibold font-display text-foreground mb-3">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating:</span>
                  <div className="flex items-center">
                    <Star size={14} className="text-primary mr-1" />
                    <span className="font-medium font-metrics text-foreground">{route.rating || '—'}/5</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transport:</span>
                  <span className="font-medium text-foreground flex items-center">
                    <span className="mr-1">{transportIcon}</span>
                    {transportLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quality:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${hasRealRoute
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                    }`}>
                    {hasRealRoute ? 'Precise' : 'Approximate'}
                  </span>
                </div>

                {userLocation && (
                  <>
                    <hr className="my-2 border-border" />
                    <div className="bg-primary/5 rounded-[var(--radius)] p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">GPS Status:</span>
                        <span className="text-primary font-medium">Active</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="text-foreground font-metrics">±{Math.round(userLocation.accuracy)}m</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Route points mini list */}
            {route.route_points && route.route_points.length > 0 && (
              <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 shadow-sm hidden lg:block">
                <h3 className="font-semibold font-display text-foreground mb-3">Points</h3>
                <div className="space-y-2">
                  {route.route_points.slice(0, 5).map((point: any, index: number) => {
                    const isCurrent = index === currentStepIndex
                    const isPassed = index < currentStepIndex

                    return (
                      <button
                        key={point.id}
                        onClick={() => setCurrentStepIndex(index)}
                        className={`w-full p-2 rounded-[var(--radius)] border-2 transition-all text-left ${isCurrent
                          ? 'border-primary bg-primary/5'
                          : isPassed
                            ? 'border-border bg-muted'
                            : 'border-border bg-card hover:border-primary/50'
                          }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 font-metrics ${isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isPassed
                              ? 'bg-primary/60 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                            {isPassed ? <Check className="w-3 h-3" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate text-xs">
                              {point.title}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {route.route_points.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      +{route.route_points.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main content - Map and points */}
          <div className="lg:col-span-3 space-y-6">
            {/* Route map */}
            <div className="bg-card rounded-[var(--radius)] border-2 border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b-2 border-border">
                <h2 className="text-lg font-semibold font-display text-foreground">Route Map</h2>
              </div>
              <div className="h-[400px] md:h-[500px]">
                <MapLibreRouteMap
                  route={route}
                  userLocation={userLocation}
                  currentPointIndex={currentStepIndex}
                  showNavigation={showNavigationPanel}
                />
              </div>
            </div>

            {/* Route points list */}
            <div>
              <h2 className="text-xl font-semibold font-display text-foreground mb-4">
                Route Points ({route.route_points?.length || 0})
              </h2>

              <div className="space-y-4">
                {route.route_points?.map((point: any, index: number) => {
                  const isCurrent = userLocation && index === currentStepIndex
                  const isPassed = userLocation && index < currentStepIndex

                  return (
                    <div
                      key={point.id}
                      className={`bg-card border-2 rounded-[var(--radius)] p-4 transition-all ${isCurrent
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : isPassed
                          ? 'border-border bg-muted/50'
                          : 'border-border hover:border-primary/50 shadow-sm hover:shadow-md'
                        }`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Point number */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : isPassed
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary'
                          }`}>
                          {isPassed ? <Check className="w-5 h-5" /> : <span className="font-metrics">{index + 1}</span>}
                        </div>

                        {/* Point information */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold text-lg font-display ${isCurrent ? 'text-primary' : 'text-foreground'
                              }`}>
                              {point.title}
                              {isCurrent && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-normal">
                                  Current
                                </span>
                              )}
                            </h3>

                            {userLocation && (
                              <div className="text-sm text-primary font-medium font-metrics">
                                {(() => {
                                  const distance = calculateDistance(
                                    userLocation.latitude, userLocation.longitude,
                                    point.latitude!, point.longitude!
                                  )
                                  return formatDistance(distance)
                                })()}
                              </div>
                            )}
                          </div>

                          {point.description && (
                            <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{point.description}</p>
                          )}

                          {/* Building information */}
                          {point.buildings && (
                            <div className="bg-muted rounded-[var(--radius)] p-3 mb-3 border border-border">
                              <h4 className="font-medium text-foreground mb-2 flex items-center text-sm">
                                🏛️ Building Details
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {point.buildings.architect && (
                                  <div>
                                    <span className="text-muted-foreground">Architect:</span>
                                    <span className="ml-1 font-medium text-foreground">{point.buildings.architect}</span>
                                  </div>
                                )}
                                {point.buildings.year_built && (
                                  <div>
                                    <span className="text-muted-foreground">Year:</span>
                                    <span className="ml-1 font-medium text-foreground font-metrics">{point.buildings.year_built}</span>
                                  </div>
                                )}
                                {point.buildings.architectural_style && (
                                  <div>
                                    <span className="text-muted-foreground">Style:</span>
                                    <span className="ml-1 font-medium text-foreground">{point.buildings.architectural_style}</span>
                                  </div>
                                )}
                                {point.buildings.building_type && (
                                  <div>
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="ml-1 font-medium text-foreground">{point.buildings.building_type}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Visit instructions */}
                          {point.instructions && (
                            <div className="bg-primary/10 border border-primary rounded-[var(--radius)] p-3 mb-3">
                              <div className="flex items-center mb-1">
                                <span className="text-primary font-medium text-sm">💡 Recommendations</span>
                              </div>
                              <p className="text-foreground text-sm">{point.instructions}</p>
                            </div>
                          )}

                          {/* Meta information */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-3 text-muted-foreground">
                              <div className="flex items-center">
                                <Clock size={14} className="mr-1" />
                                <span className="font-metrics">{point.estimated_time_minutes || 10} min</span>
                              </div>

                              {point.building_id && (
                                <div className="flex items-center">
                                  <span className="w-2 h-2 bg-primary rounded-full mr-1"></span>
                                  <span>Building</span>
                                </div>
                              )}
                            </div>

                            {isCurrent && (
                              <button
                                onClick={() => {
                                  if (currentStepIndex < route.route_points!.length - 1) {
                                    setCurrentStepIndex(currentStepIndex + 1)
                                  }
                                }}
                                disabled={currentStepIndex >= route.route_points!.length - 1}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {currentStepIndex >= route.route_points!.length - 1 ? 'Finish!' : 'Next Point →'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Building image */}
                        {point.buildings?.image_url && (
                          <div className="flex-shrink-0 hidden md:block">
                            <img
                              src={point.buildings.image_url}
                              alt={point.title || undefined}
                              className="w-28 h-28 object-cover rounded-[var(--radius)] shadow-sm hover:shadow-md transition-shadow cursor-pointer border-2 border-border"
                              onClick={() => window.open(point.buildings.image_url, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }) || (
                    <div className="text-center py-12 bg-card rounded-[var(--radius)] border-2 border-dashed border-border">
                      <MapPin size={64} className="mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium font-display text-foreground mb-2">No Route Points</h3>
                      <p className="text-sm text-muted-foreground">This route doesn't have any points yet</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section - Only for published routes */}
        {route.is_published && (
          <div className="bg-card rounded-[var(--radius)] border-2 border-border p-4 md:p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-display text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Reviews
                {route.review_count > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({route.review_count})</span>
                )}
              </h2>
              {route.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{Number(route.rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            {reviewsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
            ) : (
              <RouteReviewsList
                routeId={route.id}
                reviews={reviews}
                onOpenAddReview={() => setShowAddReviewModal(true)}
              />
            )}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {canDelete && (
        <DeleteContentModal
          contentType="route"
          contentId={route.id}
          contentTitle={route.title}
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {/* Add Review Modal */}
      {route.is_published && (
        <AddRouteReviewModal
          routeId={route.id}
          routeTitle={route.title}
          isOpen={showAddReviewModal}
          onClose={() => setShowAddReviewModal(false)}
          onSuccess={loadReviews}
        />
      )}

      {/* Close menus on outside click */}
      {(showActionsMenu || showExportMenu) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowActionsMenu(false)
            setShowExportMenu(false)
          }}
        />
      )}
    </>
  )
}
