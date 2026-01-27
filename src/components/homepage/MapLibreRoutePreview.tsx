// src/components/homepage/MapLibreRoutePreview.tsx - Route preview map with MapLibre GL JS
'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import Map, {
  Marker,
  Source,
  Layer,
  type MapRef
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface RoutePreviewMapProps {
  geometry: {
    type: string
    coordinates: number[][]
  } | null
  points: Array<{
    latitude: number
    longitude: number
    title: string
    order_index: number
  }>
  isHovered?: boolean
}

export default function MapLibreRoutePreview({ geometry, points, isHovered }: RoutePreviewMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 13.4050,
    latitude: 52.5200,
    zoom: 12
  })
  const isFirstRender = useRef(true)

  // Display first 4 points
  const displayPoints = useMemo(() =>
    points.slice(0, Math.min(4, points.length)),
    [points]
  )

  // Route line GeoJSON
  const routeGeoJSON = useMemo(() => {
    if (!geometry?.coordinates) return null
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: geometry.coordinates
      }
    }
  }, [geometry])

  // Fit bounds on mount
  useEffect(() => {
    if (!mapRef.current || !isFirstRender.current) return

    // Get bounds from geometry or points
    let lngs: number[] = []
    let lats: number[] = []

    if (geometry?.coordinates) {
      lngs = geometry.coordinates.map(c => c[0])
      lats = geometry.coordinates.map(c => c[1])
    } else if (points.length > 0) {
      lngs = points.map(p => p.longitude)
      lats = points.map(p => p.latitude)
    }

    if (lngs.length === 0) return

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ]

    mapRef.current.fitBounds(bounds, {
      padding: 30,
      maxZoom: 14,
      duration: 0
    })

    isFirstRender.current = false
  }, [geometry, points])

  return (
    <div className="absolute inset-0 w-full h-full" style={{ background: '#f8f9fa' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '100%' }}
        interactive={false}
        attributionControl={false}
        reuseMaps
      >
        {/* Attribution */}
        <div className="absolute bottom-0 right-0 z-10 bg-white/70 px-1 py-0.5 text-[7px] text-gray-400 rounded-tl">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OSM</a>
        </div>
        {/* Route line */}
        {routeGeoJSON && (
          <Source id="route-preview" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-preview-line"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': isHovered ? 4 : 3,
                'line-opacity': isHovered ? 0.9 : 0.6
              }}
            />
          </Source>
        )}

        {/* Point markers */}
        {displayPoints.map((point, index) => {
          const isFirst = index === 0
          const isLast = index === displayPoints.length - 1
          const size = isFirst || isLast ? 12 : 8
          const color = isFirst ? '#22c55e' : isLast ? '#ef4444' : '#000000'

          return (
            <Marker
              key={`${point.latitude}-${point.longitude}-${index}`}
              longitude={point.longitude}
              latitude={point.latitude}
              anchor="center"
            >
              <div
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  border: '2px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              />
            </Marker>
          )
        })}
      </Map>
    </div>
  )
}
