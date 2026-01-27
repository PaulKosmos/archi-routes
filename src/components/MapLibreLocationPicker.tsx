// src/components/MapLibreLocationPicker.tsx - Location picker with MapLibre GL JS
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type ViewStateChangeEvent
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapLibreLocationPickerProps {
  latitude: number
  longitude: number
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  className?: string
}

// Reverse geocoding using Nominatim
const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ru`
    )

    if (response.ok) {
      const data = await response.json()
      if (data?.display_name) {
        return data.display_name
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export default function MapLibreLocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  className = ''
}: MapLibreLocationPickerProps) {
  const mapRef = useRef<MapRef>(null)
  const [markerPosition, setMarkerPosition] = useState<{ lng: number; lat: number } | null>(
    latitude && longitude ? { lng: longitude, lat: latitude } : null
  )
  const [viewState, setViewState] = useState({
    longitude: longitude || 37.6176,
    latitude: latitude || 55.7558,
    zoom: 15
  })
  const [isDragging, setIsDragging] = useState(false)

  // Update marker when props change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lng: longitude, lat: latitude })
      setViewState(prev => ({
        ...prev,
        longitude,
        latitude
      }))
    }
  }, [latitude, longitude])

  // Handle map click
  const handleMapClick = useCallback(async (event: maplibregl.MapLayerMouseEvent) => {
    const { lng, lat } = event.lngLat
    setMarkerPosition({ lng, lat })

    const address = await getAddressFromCoordinates(lat, lng)
    onLocationSelect(lat, lng, address)
  }, [onLocationSelect])

  // Handle marker drag
  const handleMarkerDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMarkerDrag = useCallback((event: { lngLat: { lng: number; lat: number } }) => {
    setMarkerPosition(event.lngLat)
  }, [])

  const handleMarkerDragEnd = useCallback(async (event: { lngLat: { lng: number; lat: number } }) => {
    setIsDragging(false)
    const { lng, lat } = event.lngLat

    const address = await getAddressFromCoordinates(lat, lng)
    onLocationSelect(lat, lng, address)
  }, [onLocationSelect])

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '320px', borderRadius: '0.5rem' }}
        attributionControl={false}
        onClick={handleMapClick}
        cursor={isDragging ? 'grabbing' : 'crosshair'}
        reuseMaps
      >
        {/* Attribution */}
        <div className="absolute bottom-0 right-0 z-10 bg-white/80 px-1.5 py-0.5 text-[9px] text-gray-500 rounded-tl">
          <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">MapLibre</a>
          {' | '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">© OSM</a>
        </div>
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation={false}
          onGeolocate={(e) => {
            const { latitude, longitude } = e.coords
            setMarkerPosition({ lng: longitude, lat: latitude })
            getAddressFromCoordinates(latitude, longitude).then(address => {
              onLocationSelect(latitude, longitude, address)
            })
          }}
        />

        {/* Draggable marker */}
        {markerPosition && (
          <Marker
            longitude={markerPosition.lng}
            latitude={markerPosition.lat}
            anchor="bottom"
            draggable
            onDragStart={handleMarkerDragStart}
            onDrag={handleMarkerDrag}
            onDragEnd={handleMarkerDragEnd}
          >
            <div
              style={{
                width: 32,
                height: 42,
                cursor: isDragging ? 'grabbing' : 'grab',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s ease'
              }}
            >
              <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42C16 42 32 28 32 16C32 7.16 24.84 0 16 0Z"
                  fill="#3B82F6"
                />
                <circle cx="16" cy="14" r="6" fill="white" />
              </svg>
            </div>
          </Marker>
        )}
      </Map>

      {/* Instruction tooltip */}
      <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow-md text-sm text-gray-600 z-10 max-w-[200px]">
        Click on the map or drag the marker to select location
      </div>
    </div>
  )
}
