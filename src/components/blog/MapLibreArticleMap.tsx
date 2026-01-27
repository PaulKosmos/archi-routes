// src/components/blog/MapLibreArticleMap.tsx - Article buildings map with MapLibre GL JS
'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Building {
  id: string
  name: string
  city: string
  architect?: string
  year_built?: number
  architectural_style?: string
  latitude: number
  longitude: number
  image_url?: string
  rating?: number
  description?: string
}

interface ArticleMapProps {
  buildings: { building: Building }[]
  selectedBuildingId?: string
  selectedBuildings?: string[]
  onBuildingSelect?: (buildingId: string) => void
  onAddToRoute?: (building: Building) => void
}

// Marker colors
const MARKER_COLORS = {
  default: '#3B82F6',   // blue
  selected: '#EF4444',  // red
  inRoute: '#10B981'    // green
}

export default function MapLibreArticleMap({
  buildings,
  selectedBuildingId,
  selectedBuildings = [],
  onBuildingSelect,
  onAddToRoute
}: ArticleMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [popupBuilding, setPopupBuilding] = useState<Building | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 13.4050,
    latitude: 52.5200,
    zoom: 13
  })
  const isFirstRender = useRef(true)

  // Filter valid buildings
  const validBuildings: Building[] = useMemo(() =>
    buildings
      .map(b => b.building)
      .filter(b => b && b.latitude && b.longitude && !isNaN(b.latitude) && !isNaN(b.longitude)),
    [buildings]
  )

  // Fit bounds on first render
  useEffect(() => {
    if (!mapRef.current || validBuildings.length === 0 || !isFirstRender.current) return

    const lngs = validBuildings.map(b => b.longitude)
    const lats = validBuildings.map(b => b.latitude)

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
  }, [validBuildings])

  // Get marker color
  const getMarkerColor = useCallback((buildingId: string) => {
    if (selectedBuildings.includes(buildingId)) return MARKER_COLORS.inRoute
    if (selectedBuildingId === buildingId) return MARKER_COLORS.selected
    return MARKER_COLORS.default
  }, [selectedBuildingId, selectedBuildings])

  // Handle marker click
  const handleMarkerClick = useCallback((building: Building) => {
    setPopupBuilding(building)
    onBuildingSelect?.(building.id)
  }, [onBuildingSelect])

  // Handle add to route
  const handleAddToRoute = useCallback(() => {
    if (popupBuilding && onAddToRoute) {
      onAddToRoute(popupBuilding)
    }
  }, [popupBuilding, onAddToRoute])

  if (validBuildings.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">Нет зданий с координатами</p>
      </div>
    )
  }

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

        {/* Building markers */}
        {validBuildings.map((building, index) => {
          const isSelected = selectedBuildingId === building.id
          const isInRoute = selectedBuildings.includes(building.id)
          const color = getMarkerColor(building.id)

          return (
            <Marker
              key={building.id}
              longitude={building.longitude}
              latitude={building.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                handleMarkerClick(building)
              }}
            >
              <div
                className="article-map-marker cursor-pointer transition-all duration-200 hover:scale-110"
                style={{
                  width: isSelected || isInRoute ? 32 : 28,
                  height: isSelected || isInRoute ? 32 : 28,
                  backgroundColor: color,
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isSelected || isInRoute ? '14px' : '12px',
                  fontWeight: 'bold',
                  color: 'white'
                }}
              >
                {isInRoute ? '✓' : index + 1}
              </div>
            </Marker>
          )
        })}

        {/* Popup */}
        {popupBuilding && (
          <Popup
            longitude={popupBuilding.longitude}
            latitude={popupBuilding.latitude}
            anchor="bottom"
            offset={20}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setPopupBuilding(null)}
            maxWidth="320px"
          >
            <div className="p-2">
              <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">
                {popupBuilding.name}
              </h3>

              {popupBuilding.image_url && (
                <img
                  src={popupBuilding.image_url}
                  alt={popupBuilding.name}
                  className="w-full h-28 object-cover rounded-lg mb-2"
                />
              )}

              <div className="text-xs text-gray-600 mb-2 space-y-1">
                <p><span className="font-medium">Город:</span> {popupBuilding.city}</p>
                {popupBuilding.architect && (
                  <p><span className="font-medium">Архитектор:</span> {popupBuilding.architect}</p>
                )}
                {popupBuilding.year_built && (
                  <p><span className="font-medium">Год:</span> {popupBuilding.year_built}</p>
                )}
                {popupBuilding.architectural_style && (
                  <p><span className="font-medium">Стиль:</span> {popupBuilding.architectural_style}</p>
                )}
              </div>

              {popupBuilding.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {popupBuilding.description}
                </p>
              )}

              <div className="flex gap-2">
                {onAddToRoute && !selectedBuildings.includes(popupBuilding.id) && (
                  <button
                    onClick={handleAddToRoute}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    ➕ В маршрут
                  </button>
                )}
                {selectedBuildings.includes(popupBuilding.id) && (
                  <div className="flex-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md text-xs font-medium text-center">
                    ✅ В маршруте
                  </div>
                )}
                <a
                  href={`/buildings/${popupBuilding.id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium text-center transition-colors"
                >
                  Подробнее
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Building count */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md px-3 py-2 text-sm">
        <span className="font-medium text-gray-900">{validBuildings.length}</span>
        <span className="text-gray-500 ml-1">зданий на карте</span>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .maplibregl-popup-content {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        }

        .maplibregl-popup-close-button {
          font-size: 18px;
          padding: 4px 8px;
          color: #6B7280;
        }

        .maplibregl-popup-close-button:hover {
          background-color: #F3F4F6;
          color: #1F2937;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .article-map-marker {
          animation: markerPop 0.3s ease-out;
        }

        @keyframes markerPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
