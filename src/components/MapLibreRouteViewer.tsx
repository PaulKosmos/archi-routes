// src/components/MapLibreRouteViewer.tsx - Route viewer mini-map with MapLibre GL JS
'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  type MapRef
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Route, RoutePoint } from '@/types/building'

interface MapLibreRouteViewerProps {
  route: Route
  routePoints: RoutePoint[]
  currentPointIndex: number
  geolocationEnabled: boolean
}

// Point marker colors - coral palette for visibility
const POINT_COLORS = {
  current: '#F26438',   // coral - current point
  passed: '#10B981',    // green - passed points
  future: '#F57C53',    // light coral - future points
  user: '#EF4444'       // red - user location
}

export default function MapLibreRouteViewer({
  route,
  routePoints,
  currentPointIndex,
  geolocationEnabled
}: MapLibreRouteViewerProps) {
  const mapRef = useRef<MapRef>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 13.4050,
    latitude: 52.5200,
    zoom: 13
  })
  const [popupPoint, setPopupPoint] = useState<RoutePoint | null>(null)
  const isFirstRender = useRef(true)

  // Geolocation watch
  useEffect(() => {
    if (!geolocationEnabled) {
      setUserLocation(null)
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [geolocationEnabled])

  // Route line GeoJSON
  const routeLineGeoJSON = useMemo(() => {
    if (!route.route_geometry?.coordinates) return null

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: route.route_geometry.coordinates
      }
    }
  }, [route.route_geometry])

  // Initial fit bounds
  useEffect(() => {
    if (!mapRef.current || routePoints.length === 0 || !isFirstRender.current) return

    const lngs = routePoints.map(p => p.longitude)
    const lats = routePoints.map(p => p.latitude)

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ]

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
      duration: 1000
    })

    isFirstRender.current = false
  }, [routePoints])

  // Center on current point when it changes
  useEffect(() => {
    if (routePoints.length === 0) return

    const currentPoint = routePoints[currentPointIndex]
    if (!currentPoint) return

    if (!mapRef.current) {
      // Map not yet mounted — update viewState so it renders at correct position on mount
      setViewState(prev => ({
        ...prev,
        longitude: currentPoint.longitude,
        latitude: currentPoint.latitude,
        zoom: 15
      }))
    } else {
      // Map is mounted — use smooth animation
      mapRef.current.flyTo({
        center: [currentPoint.longitude, currentPoint.latitude],
        zoom: 15,
        duration: 500
      })
    }
  }, [currentPointIndex, routePoints])

  // Get point status
  const getPointStatus = useCallback((index: number) => {
    if (index === currentPointIndex) return 'current'
    if (index < currentPointIndex) return 'passed'
    return 'future'
  }, [currentPointIndex])

  // Get point color
  const getPointColor = useCallback((index: number) => {
    const status = getPointStatus(index)
    return POINT_COLORS[status]
  }, [getPointStatus])

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        reuseMaps
      >
        {/* Attribution */}
        <div className="absolute bottom-0 right-0 z-10 bg-white/80 px-1.5 py-0.5 text-[9px] text-gray-500 rounded-tl">
          <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">MapLibre</a>
          {' | '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">© OSM</a>
        </div>
        <NavigationControl position="top-right" showCompass={false} />

        {/* Route line */}
        {routeLineGeoJSON && (
          <Source id="route-line" type="geojson" data={routeLineGeoJSON}>
            <Layer
              id="route-line-layer"
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 4,
                'line-opacity': 0.7
              }}
            />
          </Source>
        )}

        {/* Route point markers - coral colored with white numbers */}
        {routePoints.map((point, index) => {
          const status = getPointStatus(index)
          const color = getPointColor(index)
          const isCurrent = status === 'current'
          const isPassed = status === 'passed'
          const size = isCurrent ? 40 : 34

          return (
            <Marker
              key={point.id || `point-${index}`}
              longitude={point.longitude}
              latitude={point.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setPopupPoint(point)
              }}
            >
              <div
                className={`route-point-marker cursor-pointer ${isCurrent ? 'animate-pulse' : ''}`}
                style={{
                  width: size,
                  height: size,
                  transition: 'all 0.3s ease',
                  filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))'
                }}
              >
                <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer glow ring for current point */}
                  {isCurrent && (
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.4"
                    />
                  )}

                  {/* Main circle with coral color */}
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill={color}
                    stroke="white"
                    strokeWidth="2.5"
                  />

                  {/* White number or checkmark - centered inside circle */}
                  {isPassed ? (
                    <text
                      x="20"
                      y="21"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      ✓
                    </text>
                  ) : (
                    <text
                      x="20"
                      y="21"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontFamily="'DM Sans', 'Inter', -apple-system, sans-serif"
                      fontSize={index + 1 >= 10 ? '11' : '13'}
                      fontWeight="700"
                      letterSpacing="-0.3"
                    >
                      {index + 1}
                    </text>
                  )}
                </svg>
              </div>
            </Marker>
          )
        })}

        {/* User location marker */}
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
          >
            <div
              className="user-location-marker"
              style={{
                width: 24,
                height: 24,
                backgroundColor: POINT_COLORS.user,
                borderRadius: '50%',
                border: '4px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                animation: 'pulse-user 2s infinite'
              }}
            />
          </Marker>
        )}

        {/* Point popup */}
        {popupPoint && (
          <Popup
            longitude={popupPoint.longitude}
            latitude={popupPoint.latitude}
            anchor="bottom"
            offset={20}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setPopupPoint(null)}
          >
            <div className="p-2">
              <h4 className="font-semibold text-gray-900 text-sm">
                {popupPoint.title}
              </h4>
              {popupPoint.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {popupPoint.description}
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Current point indicator */}
      {routePoints[currentPointIndex] && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: POINT_COLORS.current }}
            >
              {currentPointIndex + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {routePoints[currentPointIndex].title}
              </h4>
              <p className="text-xs text-gray-500">
                Точка {currentPointIndex + 1} из {routePoints.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        @keyframes pulse-user {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7), 0 2px 8px rgba(0,0,0,0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0), 0 2px 8px rgba(0,0,0,0.4);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 2px 8px rgba(0,0,0,0.4);
          }
        }

        .maplibregl-popup-content {
          padding: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .maplibregl-popup-close-button {
          font-size: 16px;
          padding: 2px 6px;
        }
      `}</style>
    </div>
  )
}
