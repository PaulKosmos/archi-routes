// src/app/routes/[id]/MapLibreRouteMap.tsx - Route detail map with MapLibre GL JS
'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  type MapRef
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Route, TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'

interface RouteMapProps {
  route: Route
  currentPointIndex?: number
  showNavigation?: boolean
  userLocation?: {
    latitude: number
    longitude: number
    accuracy: number
  } | null
}

// Route colors by transport mode
const ROUTE_COLORS: Record<string, string> = {
  walking: '#10B981',
  cycling: '#3B82F6',
  driving: '#EF4444',
  public_transport: '#8B5CF6',
  default: '#6B7280'
}

export default function MapLibreRouteMap({
  route,
  currentPointIndex = -1,
  showNavigation = false,
  userLocation = null
}: RouteMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 13.4050,
    latitude: 52.5200,
    zoom: 13
  })
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const isFirstRender = useRef(true)

  // Valid route points
  const validPoints = useMemo(() =>
    (route.route_points || []).filter(p => p.latitude && p.longitude),
    [route.route_points]
  )

  // Route line GeoJSON
  const routeGeoJSON = useMemo(() => {
    if (route.route_geometry?.coordinates) {
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: route.route_geometry.coordinates
        }
      }
    }
    // Fallback to straight lines between points
    if (validPoints.length > 1) {
      return {
        type: 'Feature' as const,
        properties: { fallback: true },
        geometry: {
          type: 'LineString' as const,
          coordinates: validPoints.map(p => [p.longitude!, p.latitude!])
        }
      }
    }
    return null
  }, [route.route_geometry, validPoints])

  const routeColor = ROUTE_COLORS[route.transport_mode || 'default'] || ROUTE_COLORS.default

  // Fit bounds on first render
  useEffect(() => {
    if (!mapRef.current || validPoints.length === 0 || !isFirstRender.current) return

    const lngs = validPoints.map(p => p.longitude!)
    const lats = validPoints.map(p => p.latitude!)

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ]

    mapRef.current.fitBounds(bounds, {
      padding: 60,
      maxZoom: 16,
      duration: 0
    })

    isFirstRender.current = false
  }, [validPoints])

  // Center on active point when it changes
  useEffect(() => {
    if (!mapRef.current || currentPointIndex === -1 || !validPoints[currentPointIndex]) return

    const point = validPoints[currentPointIndex]
    mapRef.current.flyTo({
      center: [point.longitude!, point.latitude!],
      zoom: 17,
      duration: 1000
    })
  }, [currentPointIndex, validPoints])

  // Get marker color
  const getMarkerStyle = useCallback((index: number, hasBuilding: boolean) => {
    const isActive = index === currentPointIndex
    if (isActive) {
      return { bg: '#3B82F6', border: '#1D4ED8', scale: 1.2 }
    }
    if (hasBuilding) {
      return { bg: '#10B981', border: '#059669', scale: 1 }
    }
    return { bg: '#6B7280', border: '#374151', scale: 1 }
  }, [currentPointIndex])

  return (
    <div className="relative">
      {/* Info panel */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900 flex items-center">
          <span className="mr-2">{TransportModeHelper.getIcon(route.transport_mode || 'walking')}</span>
          Route: {validPoints.length} points
        </div>

        {route.route_summary && (
          <div className="text-xs text-gray-600 mt-1 space-y-1">
            <div>Distance: {formatDistance(route.route_summary.distance)}</div>
            <div>Time: {formatDuration(route.route_summary.duration)}</div>
          </div>
        )}

        {currentPointIndex >= 0 && validPoints[currentPointIndex] && (
          <div className="text-xs text-blue-600 mt-1 pt-1 border-t">
            Point {currentPointIndex + 1}: {validPoints[currentPointIndex].title}
          </div>
        )}

        {userLocation && (
          <div className="text-xs text-green-600 mt-1 pt-1 border-t">
            GPS: ±{Math.round(userLocation.accuracy)}m
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md border p-3">
        <div className="text-sm font-medium text-gray-900 mb-2">Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <div className="w-5 h-5 rounded-full bg-gray-500 border-2 border-gray-700 mr-2 flex items-center justify-center text-white text-[10px] font-bold">1</div>
            <span>Route Point</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-700 mr-2 flex items-center justify-center text-white text-[10px] font-bold">2</div>
            <span>With object</span>
          </div>
          {currentPointIndex >= 0 && (
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-blue-800 mr-2 flex items-center justify-center text-white text-[10px] font-bold">3</div>
              <span>Current Point</span>
            </div>
          )}
          {userLocation && (
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white mr-2"></div>
              <span>Your Location</span>
            </div>
          )}
          <div className="flex items-center pt-1 border-t">
            <div className="w-4 h-1 mr-2" style={{ backgroundColor: routeColor }}></div>
            <span>{route.route_geometry ? 'Real roads' : 'Straight lines'}</span>
          </div>
        </div>
      </div>

      {/* Transport mode indicator */}
      {showNavigation && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md border px-3 py-2">
          <div className="flex items-center text-sm">
            <span className="text-xl mr-2">{TransportModeHelper.getIcon(route.transport_mode || 'walking')}</span>
            <span className="font-medium">{TransportModeHelper.getLabel(route.transport_mode || 'walking')}</span>
          </div>
        </div>
      )}

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '600px', borderRadius: '0.5rem' }}
        attributionControl={false}
        reuseMaps
      >
        {/* Attribution */}
        <div className="absolute bottom-0 right-0 z-10 bg-white/80 px-1.5 py-0.5 text-[9px] text-gray-500 rounded-tl">
          <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">MapLibre</a>
          {' | '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">© OSM</a>
        </div>
        <NavigationControl position="bottom-right" />

        {/* Route line */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': routeColor,
                'line-width': route.transport_mode === 'driving' ? 6 : route.transport_mode === 'cycling' ? 5 : 4,
                'line-opacity': route.route_geometry ? 0.8 : 0.6
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round'
              }}
            />
            {/* Dashed overlay for fallback or public transport */}
            {(!route.route_geometry || route.transport_mode === 'public_transport') && (
              <Layer
                id="route-line-dashed"
                type="line"
                paint={{
                  'line-color': routeColor,
                  'line-width': 4,
                  'line-opacity': 0.8,
                  'line-dasharray': [2, 2]
                }}
              />
            )}
          </Source>
        )}

        {/* User location */}
        {userLocation && (
          <>
            {/* Accuracy circle */}
            <Source
              id="user-accuracy"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: [userLocation.longitude, userLocation.latitude]
                }
              }}
            >
              <Layer
                id="user-accuracy-circle"
                type="circle"
                paint={{
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 20, userLocation.accuracy],
                  'circle-color': '#3B82F6',
                  'circle-opacity': 0.1,
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#3B82F6',
                  'circle-stroke-opacity': 0.3
                }}
              />
            </Source>
            {/* User marker */}
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: '#3B82F6',
                  border: '3px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
                className="animate-pulse"
              />
            </Marker>
          </>
        )}

        {/* Route point markers */}
        {validPoints.map((point, index) => {
          const style = getMarkerStyle(index, !!point.buildings)
          const isActive = index === currentPointIndex

          return (
            <Marker
              key={point.id}
              longitude={point.longitude!}
              latitude={point.latitude!}
              anchor="center"
              onClick={() => setSelectedPoint(selectedPoint === index ? null : index)}
            >
              <div
                style={{
                  width: 32 * style.scale,
                  height: 32 * style.scale,
                  backgroundColor: style.bg,
                  border: `3px solid ${style.border}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: 14 * style.scale,
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: isActive ? 100 : 1
                }}
              >
                {index + 1}
              </div>
            </Marker>
          )
        })}

        {/* Selected point popup */}
        {selectedPoint !== null && validPoints[selectedPoint] && (
          <Popup
            longitude={validPoints[selectedPoint].longitude!}
            latitude={validPoints[selectedPoint].latitude!}
            anchor="bottom"
            offset={20}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setSelectedPoint(null)}
            maxWidth="300px"
          >
            <div className="p-2 min-w-[250px]">
              <h3 className={`font-bold mb-2 ${selectedPoint === currentPointIndex ? 'text-blue-600' : 'text-gray-900'}`}>
                {selectedPoint + 1}. {validPoints[selectedPoint].title}
              </h3>

              {validPoints[selectedPoint].description && (
                <p className="text-sm text-gray-600 mb-2">
                  {validPoints[selectedPoint].description}
                </p>
              )}

              {validPoints[selectedPoint].buildings && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                  <h4 className="font-semibold text-green-800 text-sm">
                    {validPoints[selectedPoint].buildings.name}
                  </h4>
                  <p className="text-xs text-green-700">
                    {validPoints[selectedPoint].buildings.architect || 'Architect unknown'} •{' '}
                    {validPoints[selectedPoint].buildings.year_built || 'Year unknown'}
                  </p>
                  <a
                    href={`/buildings/${validPoints[selectedPoint].buildings.id}`}
                    className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    View details
                  </a>
                </div>
              )}

              {selectedPoint === currentPointIndex && (
                <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs text-blue-700 text-center">
                  Current point
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
