// src/components/buildings/MapLibreBuildingMap.tsx - Single building map with MapLibre GL JS
'use client'

import { useState, useCallback } from 'react'
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type ViewStateChangeEvent
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Building } from '@/types/building'

interface MapLibreBuildingMapProps {
  building: Building
  className?: string
}

export default function MapLibreBuildingMap({ building, className = "h-48" }: MapLibreBuildingMapProps) {
  const [viewState, setViewState] = useState({
    longitude: building.longitude,
    latitude: building.latitude,
    zoom: 16
  })
  const [showPopup, setShowPopup] = useState(false)

  const handleMarkerClick = useCallback(() => {
    setShowPopup(true)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        attributionControl={false}
        reuseMaps
      >
        {/* Attribution */}
        <div className="absolute bottom-0 right-0 z-10 bg-white/80 px-1 py-0.5 text-[8px] text-gray-500 rounded-tl">
          <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">MapLibre</a>
          {' | '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">© OSM</a>
        </div>
        <NavigationControl position="top-right" showCompass={false} />

        {/* Building marker */}
        <Marker
          longitude={building.longitude}
          latitude={building.latitude}
          anchor="center"
          onClick={handleMarkerClick}
        >
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: '#3B82F6',
              border: '3px solid white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            className="hover:scale-110"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17H4V9L12 4.5L20 9V17H22V7L12 2Z" fill="white"/>
              <path d="M6 9V19H18V9L12 5.5L6 9Z" fill="white" opacity="0.6"/>
              <rect x="8" y="11" width="2" height="2" fill="white"/>
              <rect x="14" y="11" width="2" height="2" fill="white"/>
              <rect x="8" y="14" width="2" height="2" fill="white"/>
              <rect x="14" y="14" width="2" height="2" fill="white"/>
              <rect x="11" y="16" width="2" height="3" fill="white"/>
            </svg>
          </div>
        </Marker>

        {/* Building info popup */}
        {showPopup && (
          <Popup
            longitude={building.longitude}
            latitude={building.latitude}
            anchor="bottom"
            offset={20}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setShowPopup(false)}
            maxWidth="250px"
          >
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1 text-gray-900">{building.name}</h3>
              {building.architect && (
                <p className="text-xs text-gray-600 mb-1">Arch.: {building.architect}</p>
              )}
              {building.year_built && (
                <p className="text-xs text-gray-600 mb-1">{building.year_built}</p>
              )}
              {building.address && (
                <p className="text-xs text-gray-500">{building.address}</p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
