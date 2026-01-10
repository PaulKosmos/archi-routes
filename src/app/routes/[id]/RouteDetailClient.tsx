// src/app/routes/[id]/RouteDetailClient.tsx - With GPS navigation and export
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useEditPermissions } from '../../../hooks/useEditPermissions'
import { 
  Edit, MapPin, Clock, Users, Star, ArrowLeft, Play, Heart, Trash2, MoreVertical, 
  Route as RouteIcon, AlertCircle, Navigation, Download, Share2, Map, Smartphone,
  ExternalLink, Copy, CheckCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import DeleteContentModal from '../../../components/DeleteContentModal'
import RouteFavoriteButton, { RouteCompletedButton } from '../../../components/RouteFavoriteButton'
import { Route, TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'

// Dynamic import of updated map
const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
    <span className="text-gray-500">Loading map...</span>
  </div>
})

interface RouteDetailClientProps {
  route: Route
}

interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
}

// 🔧 DISTANCE CALCULATION FUNCTION
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

export default function RouteDetailClient({ route }: RouteDetailClientProps) {
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

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkAuth()
  }, [route.id])

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
  const transportDescription = TransportModeHelper.getDescription(transportMode)

  // Check if route has real geometry
  const hasRealRoute = !!(route.route_geometry && route.route_geometry.coordinates && route.route_geometry.coordinates.length > 0)

  // 🔧 FIXED STABLE GPS NAVIGATION
  const startLocationTracking = () => {
    console.log('🔍 Starting stable GPS navigation...')
    
    if (!navigator.geolocation) {
      setLocationError('❌ Geolocation is not supported by your browser')
      return
    }

    setIsTrackingLocation(true)
    setLocationError('')
    setShowNavigationPanel(true)

    // INITIAL position retrieval
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Initial GPS position received:', position.coords)
        
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }

        setUserLocation(location)

        // SLOW updates - once every 2 minutes
        const updateInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (newPosition) => {
              const newLocation: UserLocation = {
                latitude: newPosition.coords.latitude,
                longitude: newPosition.coords.longitude,
                accuracy: newPosition.coords.accuracy
              }

              // Get current location for comparison
              setUserLocation(currentLocation => {
                if (currentLocation) {
                  // Update ONLY if change is greater than 10 meters
                  const distance = calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    newLocation.latitude, newLocation.longitude
                  )

                  if (distance > 10) {
                    console.log('📍 GPS update (movement >10m):', newLocation, 'distance:', Math.round(distance), 'm')
                    return newLocation
                  } else {
                    console.log('📍 GPS: movement insignificant (<10m), not updating')
                    return currentLocation
                  }
                } else {
                  console.log('📍 GPS: setting initial location')
                  return newLocation
                }
              })
            },
            (error) => console.log('GPS update error:', error.message),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        }, 120000) // Update once every 2 minutes

        // Save interval ID for cleanup
        setWatchId(updateInterval as any)
      },
      (error) => {
        console.log('🔍 GPS diagnostics:', {
          code: error.code,
          message: error.message
        })

        let errorMessage = ''
        switch (error.code) {
          case 1:
            errorMessage = '🔒 GPS access denied. In the address bar, click the lock → "Allow location"'
            break
          case 2:
            errorMessage = '📡 GPS unavailable. Check internet connection and enable GPS'
            break
          case 3:
            errorMessage = '⏱️ GPS timeout. Please try again'
            break
          default:
            errorMessage = `❌ GPS error (code ${error.code}): ${error.message || 'Unknown error'}`
        }

        setLocationError(errorMessage)
        setIsTrackingLocation(false)
        setShowNavigationPanel(false)
      },
      {
        enableHighAccuracy: false, // Don't use high accuracy to save battery
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  const stopLocationTracking = () => {
    if (watchId !== null) {
      // Clear interval instead of watchPosition
      clearInterval(watchId)
      setWatchId(null)
    }
    setIsTrackingLocation(false)
    setUserLocation(null)
    setShowNavigationPanel(false)
    setLocationError('')
    console.log('⛔ GPS navigation stopped')
  }

  // 🔧 UPDATED FUNCTION FOR CALCULATING DISTANCE TO NEXT POINT
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
      .map(point => `${point.latitude},${point.longitude}`)
      .join('/')

    const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`
    window.open(googleMapsUrl, '_blank')
    setExportStatus('Opened in Google Maps')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const exportToAppleMaps = () => {
    if (!route.route_points || route.route_points.length === 0) {
      alert('No route points to export')
      return
    }

    // Use most compatible format for Apple Maps
    const firstPoint = route.route_points[0]
    const lastPoint = route.route_points[route.route_points.length - 1]

    // Create URL for route with start and end
    let appleMapsUrl = `http://maps.apple.com/?saddr=${firstPoint.latitude},${firstPoint.longitude}&daddr=${lastPoint.latitude},${lastPoint.longitude}`

    // Add intermediate points as separate parameters
    if (route.route_points.length > 2) {
      const waypoints = route.route_points.slice(1, -1)
        .map(point => `${point.latitude},${point.longitude}`)
        .join('|')

      if (waypoints) {
        appleMapsUrl += `&waypoints=${waypoints}`
      }
    }

    // Add directions type
    appleMapsUrl += `&dirflg=${route.transport_mode === 'driving' ? 'd' : 'w'}`

    console.log('🍎 Apple Maps URL:', appleMapsUrl)

    // Alternative method - open each point separately
    if (route.route_points.length > 2) {
      const confirmation = confirm(
        `Apple Maps has limitations with intermediate points. \n\n` +
        `Option 1: Open only start and end of route\n` +
        `Option 2: Open all points as separate markers\n\n` +
        `Press OK for option 1, Cancel for option 2`
      )

      if (!confirmation) {
        // Open all points as separate markers
        const allPointsUrl = route.route_points
          .map((point, index) => {
            return `http://maps.apple.com/?q=${encodeURIComponent(point.title)}&ll=${point.latitude},${point.longitude}&z=16`
          })

        // Open first 3 points (browser limitation)
        allPointsUrl.slice(0, 3).forEach((url, index) => {
          setTimeout(() => {
            window.open(url, `_blank_${index}`)
          }, index * 500) // Delay between opens
        })

        if (allPointsUrl.length > 3) {
          alert(`Opened first 3 points out of ${route.route_points.length}. Remaining points can be found in the app.`)
        }

        setExportStatus(`Opened ${Math.min(3, route.route_points.length)} points in Apple Maps`)
        setTimeout(() => setExportStatus(''), 3000)
        return
      }
    }

    window.open(appleMapsUrl, '_blank')
    setExportStatus('Opened in Apple Maps (start and end)')
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

    // Add waypoints (route points)
    waypoints.forEach((point, index) => {
      gpxContent += `  <wpt lat="${point.latitude}" lon="${point.longitude}">
    <name>${index + 1}. ${point.title}</name>
    <desc>${point.description || ''}</desc>
    <type>waypoint</type>
    <sym>Waypoint</sym>
  </wpt>
`
    })

    // Add track (if route geometry exists)
    if (route.route_geometry?.coordinates && route.route_geometry.coordinates.length > 0) {
      gpxContent += `  <trk>
    <name>${routeName}</name>
    <type>${transportMode}</type>
    <trkseg>
`
      
      route.route_geometry.coordinates.forEach(coord => {
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
    // 🔧 ADD GLOBAL FUNCTION FOR "START FROM THIS POINT" BUTTON
    (window as any).setCurrentStepFromMap = (pointIndex: number) => {
      console.log('🎯 Updating current point to:', pointIndex)
      setCurrentStepIndex(pointIndex)
    }

    return () => {
      if (watchId !== null) {
        clearInterval(watchId) // Clear interval
      }
      // Clear global function
      delete (window as any).setCurrentStepFromMap
    }
  }, [watchId])

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
        </div>

        {/* Header with action buttons - FIXED VERSION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          {/* Main information */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {route.title}
            </h1>


            {/* Meta information */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
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
                <span>
                  {route.route_summary
                    ? formatDuration(route.route_summary.duration)
                    : `${route.estimated_duration_minutes || 'N/A'} minutes`
                  }
                </span>
              </div>

              <div className="flex items-center">
                <Users size={16} className="mr-1" />
                <span>{route.points_count} points</span>
              </div>

              <div className="flex items-center">
                <RouteIcon size={16} className="mr-1" />
                <span>
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
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description if available */}
            {route.description && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 leading-relaxed">
                  {route.description}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons - UNIFIED */}
          <div className="flex flex-wrap items-center gap-3">
            {/* GPS navigation */}
            {!isTrackingLocation ? (
              <button
                onClick={startLocationTracking}
                className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <Navigation size={16} className="mr-2" />
                GPS Navigation
              </button>
            ) : (
              <button
                onClick={stopLocationTracking}
                className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Navigation size={16} className="mr-2" />
                Stop GPS
              </button>
            )}

            {/* Export */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={16} className="mr-2" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      exportToGoogleMaps()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Map size={16} />
                    <span>Open in Google Maps</span>
                    <ExternalLink size={14} className="ml-auto" />
                  </button>

                  <button
                    onClick={() => {
                      // Universal function
                      if (!route.route_points || route.route_points.length === 0) {
                        alert('No route points')
                        return
                      }

                      const waypoints = route.route_points
                        .map(point => `${point.latitude},${point.longitude}`)
                        .join('/')

                      const navigatorUrl = `https://www.google.com/maps/dir/${waypoints}`
                      window.open(navigatorUrl, '_blank')
                      setExportStatus('Opened in navigator')
                      setTimeout(() => setExportStatus(''), 3000)

                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Navigation size={16} />
                    <span>Open in Navigator</span>
                    <ExternalLink size={14} className="ml-auto" />
                  </button>

                  <button
                    onClick={() => {
                      exportToGPX()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span>Download GPX file</span>
                  </button>

                  <hr className="my-1" />

                  <button
                    onClick={() => {
                      shareRoute()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-green-600">Copied!</span>
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
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </a>

                {canDelete && (
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="inline-flex items-center px-4 py-2.5 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </button>

                    {showActionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowDeleteModal(true)
                            setShowActionsMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Navigation size={20} className="text-green-600 mr-2" />
                <h3 className="font-semibold text-green-900">GPS Navigation</h3>
              </div>
              <button
                onClick={stopLocationTracking}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>

            {locationError ? (
              <div className="text-red-600 text-sm">{locationError}</div>
            ) : userLocation ? (
              <div className="space-y-2">
                <div className="text-sm text-green-700">
                  📍 <strong>Your location:</strong> {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  <span className="ml-2">(accuracy: {Math.round(userLocation.accuracy)}m)</span>
                </div>

                {route.route_points && currentStepIndex < route.route_points.length && (
                  <div className="bg-white rounded p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-900">
                          Next point: {route.route_points[currentStepIndex]?.title}
                        </div>
                        <div className="text-sm text-green-700">
                          {(() => {
                            const distance = calculateDistanceToNextPoint()
                            return distance ? `Distance: ${formatDistance(distance)}` : 'Calculating distance...'
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {currentStepIndex + 1}/{route.route_points.length}
                        </div>
                        {currentStepIndex < route.route_points.length - 1 && (
                          <button
                            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded mt-1"
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
              <div className="text-green-700">Getting location...</div>
            )}
          </div>
        )}

        {/* Export status */}
        {exportStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center text-blue-800">
              <CheckCircle size={16} className="mr-2" />
              {exportStatus}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main content - map */}
          <div className="xl:col-span-3 space-y-8">
            {/* Route map - ENLARGED */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Route on Map</h2>
              <div className="rounded-lg overflow-hidden shadow-md">
                <RouteMap
                  route={route}
                  userLocation={userLocation}
                  currentPointIndex={currentStepIndex}
                  showNavigation={showNavigationPanel}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - only essential */}
          <div className="xl:col-span-1 space-y-6">
            {/* Route statistics */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center">
                    <Star size={16} className="text-yellow-400 mr-1" />
                    <span className="font-medium">{route.rating || '—'}/5</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Transport</span>
                  <span className="font-medium flex items-center">
                    <span className="mr-1">{transportIcon}</span>
                    {transportLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Quality</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    hasRealRoute
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {hasRealRoute ? 'Precise' : 'Approximate'}
                  </span>
                </div>

                {userLocation && (
                  <>
                    <hr className="my-3" />
                    <div className="bg-green-50 rounded-lg p-3">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center">
                        <Navigation size={16} className="mr-1" />
                        GPS Status
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Location:</span>
                          <span className="text-green-900 font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Accuracy:</span>
                          <span className="text-green-900 font-medium">{Math.round(userLocation.accuracy)}m</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {!isTrackingLocation ? (
                  <button
                    onClick={startLocationTracking}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Navigation size={16} className="mr-2" />
                    Start Navigation
                  </button>
                ) : (
                  <button
                    onClick={stopLocationTracking}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Navigation size={16} className="mr-2" />
                    Stop Navigation
                  </button>
                )}

                <button
                  onClick={exportToGoogleMaps}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Map size={16} className="mr-2" />
                  Google Maps
                </button>

                <button
                  onClick={shareRoute}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Share2 size={16} className="mr-2" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🔧 ROUTE OBJECTS LIST MOVED DOWN AND FULL WIDTH */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">
            Route Points ({route.route_points?.length || 0})
          </h2>
              
              <div className="space-y-4">
                {route.route_points?.map((point: any, index: number) => (
                  <div
                    key={point.id}
                    className={`border rounded-lg p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                      userLocation && index === currentStepIndex
                        ? 'bg-green-50 border-green-300 ring-2 ring-green-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Point number */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                        userLocation && index === currentStepIndex
                          ? 'bg-green-500 text-white ring-2 ring-green-300'
                          : index < currentStepIndex && userLocation
                          ? 'bg-gray-400 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {userLocation && index < currentStepIndex ? '✓' : index + 1}
                      </div>

                      {/* Point information */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-semibold text-lg ${
                            userLocation && index === currentStepIndex
                              ? 'text-green-900'
                              : 'text-gray-900'
                          }`}>
                            {point.title}
                            {userLocation && index === currentStepIndex && (
                              <span className="ml-2 text-sm bg-green-500 text-white px-2 py-1 rounded-full animate-pulse">
                                Current point
                              </span>
                            )}
                          </h3>

                          {/* Distance from user */}
                          {userLocation && (
                            <div className="text-sm text-blue-600 font-medium">
                              {(() => {
                                const R = 6371000
                                const φ1 = userLocation.latitude * Math.PI / 180
                                const φ2 = point.latitude! * Math.PI / 180
                                const Δφ = (point.latitude! - userLocation.latitude) * Math.PI / 180
                                const Δλ = (point.longitude! - userLocation.longitude) * Math.PI / 180
                                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2)
                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                                const distance = R * c
                                return `📍 ${formatDistance(distance)}`
                              })()} from you
                            </div>
                          )}
                        </div>
                        
                        {point.description && (
                          <p className="text-gray-600 text-sm mb-3 leading-relaxed">{point.description}</p>
                        )}


                        {/* Building information */}
                        {point.buildings && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                              🏛️ Architectural Information
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {point.buildings.architect && (
                                <div>
                                  <span className="text-gray-500">Architect:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.architect}</span>
                                </div>
                              )}
                              {point.buildings.year_built && (
                                <div>
                                  <span className="text-gray-500">Year Built:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.year_built}</span>
                                </div>
                              )}
                              {point.buildings.architectural_style && (
                                <div>
                                  <span className="text-gray-500">Style:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.architectural_style}</span>
                                </div>
                              )}
                              {point.buildings.building_type && (
                                <div>
                                  <span className="text-gray-500">Building Type:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.building_type}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Visit instructions */}
                        {point.instructions && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center mb-1">
                              <span className="text-blue-800 font-medium text-sm">💡 Visit Recommendations:</span>
                            </div>
                            <p className="text-blue-900 text-sm">{point.instructions}</p>
                          </div>
                        )}

                        {/* Meta information */}
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              <span>Visit time: {point.estimated_time_minutes || 10} min</span>
                            </div>

                            {point.building_id && (
                              <div className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                <span>Architectural Object</span>
                              </div>
                            )}
                          </div>

                          {userLocation && index === currentStepIndex && (
                            <button
                              onClick={() => {
                                if (currentStepIndex < route.route_points!.length - 1) {
                                  setCurrentStepIndex(currentStepIndex + 1)
                                }
                              }}
                              disabled={currentStepIndex >= route.route_points!.length - 1}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {currentStepIndex >= route.route_points!.length - 1 ? 'Finish!' : 'Next Point →'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Building image */}
                      {point.buildings?.image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={point.buildings.image_url}
                            alt={point.title || undefined}
                            className="w-28 h-28 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => {
                              // Open image in new tab
                              window.open(point.buildings.image_url, '_blank')
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin size={64} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Route Points Found</h3>
                    <p className="text-sm">This route doesn't contain any points to visit yet</p>
                  </div>
                )}
              </div>
        </div>
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
