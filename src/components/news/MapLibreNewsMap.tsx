// components/news/MapLibreNewsMap.tsx - News buildings map with MapLibre GL JS
'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapMarker {
  id: string
  name: string
  latitude: number
  longitude: number
  image_url?: string
  architect?: string
  year_built?: number
  city?: string
}

interface MapLibreNewsMapProps {
  center: { lat: number; lng: number; zoom: number }
  markers: MapMarker[]
  onMarkerClick?: (buildingId: string) => void
}

export default function MapLibreNewsMap({
  center,
  markers,
  onMarkerClick
}: MapLibreNewsMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [viewState, setViewState] = useState({
    longitude: center.lng,
    latitude: center.lat,
    zoom: center.zoom
  })
  const isFirstRender = useRef(true)

  // Fit bounds on mount when multiple markers
  useEffect(() => {
    if (!mapRef.current || markers.length === 0 || !isFirstRender.current) return

    if (markers.length > 1) {
      const lngs = markers.map(m => m.longitude)
      const lats = markers.map(m => m.latitude)

      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ]

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 0
      })
    }

    isFirstRender.current = false
  }, [markers])

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker)
  }, [])

  const handleBuildingDetailsClick = useCallback((markerId: string) => {
    if (onMarkerClick) {
      onMarkerClick(markerId)
    }
  }, [onMarkerClick])

  return (
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

      {/* Markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="center"
          onClick={() => handleMarkerClick(marker)}
        >
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: '#3B82F6',
              border: '3px solid white',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            <span role="img" aria-label="object">&#127963;</span>
          </div>
        </Marker>
      ))}

      {/* Popup */}
      {selectedMarker && (
        <Popup
          longitude={selectedMarker.longitude}
          latitude={selectedMarker.latitude}
          anchor="bottom"
          offset={20}
          closeButton={true}
          closeOnClick={false}
          onClose={() => setSelectedMarker(null)}
          maxWidth="300px"
        >
          <div className="p-2 min-w-[200px]">
            {selectedMarker.image_url && (
              <img
                src={selectedMarker.image_url}
                alt={selectedMarker.name}
                className="w-full h-32 object-cover rounded-lg mb-2"
              />
            )}
            <h4 className="font-semibold text-gray-900 mb-1">{selectedMarker.name}</h4>
            {selectedMarker.architect && (
              <p className="text-sm text-gray-600 mb-0.5">
                <strong>Architect:</strong> {selectedMarker.architect}
              </p>
            )}
            {selectedMarker.year_built && (
              <p className="text-sm text-gray-600 mb-0.5">
                <strong>Year:</strong> {selectedMarker.year_built}
              </p>
            )}
            {selectedMarker.city && (
              <p className="text-sm text-gray-600 mb-2">
                <strong>City:</strong> {selectedMarker.city}
              </p>
            )}
            <button
              onClick={() => handleBuildingDetailsClick(selectedMarker.id)}
              className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Details
            </button>
          </div>
        </Popup>
      )}
    </Map>
  )
}
