// src/components/MapLibreMapCreator.tsx - Route creation map with MapLibre GL JS
'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  type MapRef
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Building, RoutePoint } from '../types/building'
import { getStorageUrl } from '@/lib/storage'

interface MapLibreMapCreatorProps {
  buildings: Building[]
  routePoints: RoutePoint[]
  isAddingPoint: boolean
  onAddBuildingPoint: (building: Building) => void
  onAddCustomPoint: (lat: number, lng: number) => void
}

// Map styles - free OpenFreeMap
const MAP_STYLES = {
  light: {
    name: 'Light',
    url: 'https://tiles.openfreemap.org/styles/positron'
  },
  dark: {
    name: 'Dark',
    url: 'https://tiles.openfreemap.org/styles/dark'
  },
  bright: {
    name: 'Bright',
    url: 'https://tiles.openfreemap.org/styles/bright'
  }
}

// Marker colors
const MARKER_COLORS = {
  default: '#3B82F6',    // blue
  inRoute: '#10B981',    // green
  hovered: '#F59E0B',    // amber
  routePoint: '#8B5CF6'  // purple
}

export default function MapLibreMapCreator({
  buildings,
  routePoints,
  isAddingPoint,
  onAddBuildingPoint,
  onAddCustomPoint
}: MapLibreMapCreatorProps) {
  const mapRef = useRef<MapRef>(null)
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('light')
  const [viewState, setViewState] = useState({
    longitude: 13.4050,
    latitude: 52.5200,
    zoom: 13
  })
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null)
  const [popupBuilding, setPopupBuilding] = useState<Building | null>(null)

  // Check if building is in route
  const isBuildingInRoute = useCallback((buildingId: string) => {
    return routePoints.some(point => point.building_id === buildingId)
  }, [routePoints])

  // Get route index for building
  const getRouteIndex = useCallback((buildingId: string) => {
    const index = routePoints.findIndex(point => point.building_id === buildingId)
    return index >= 0 ? index + 1 : -1
  }, [routePoints])

  // Filter valid buildings
  const validBuildings = useMemo(() =>
    buildings.filter(b => b.latitude && b.longitude),
    [buildings]
  )

  // Route line GeoJSON
  const routeLineGeoJSON = useMemo(() => {
    if (routePoints.length < 2) return null

    const coordinates = routePoints
      .sort((a, b) => a.order_index - b.order_index)
      .map(point => [point.longitude, point.latitude])

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates
      }
    }
  }, [routePoints])

  // Fit bounds on buildings change
  useEffect(() => {
    if (validBuildings.length === 0 || !mapRef.current) return

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
  }, [validBuildings])

  // Handle map click for custom points
  const handleMapClick = useCallback((event: maplibregl.MapLayerMouseEvent) => {
    if (isAddingPoint) {
      // Check if click was not on a marker
      const features = mapRef.current?.queryRenderedFeatures(event.point, {
        layers: ['building-markers']
      })

      if (!features || features.length === 0) {
        console.log('Adding custom point at:', event.lngLat)
        onAddCustomPoint(event.lngLat.lat, event.lngLat.lng)
      }
    }
  }, [isAddingPoint, onAddCustomPoint])

  // Handle building marker click
  const handleBuildingClick = useCallback((building: Building) => {
    console.log('Building clicked:', building.name)
    setPopupBuilding(building)
  }, [])

  // Handle add to route
  const handleAddToRoute = useCallback((building: Building) => {
    console.log('Adding to route:', building.name)
    onAddBuildingPoint(building)
    setPopupBuilding(null)
  }, [onAddBuildingPoint])

  // Cursor style based on mode
  const cursorStyle = isAddingPoint ? 'crosshair' : 'grab'

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Adding point indicator */}
      {isAddingPoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          📍 Кликните на карту или здание для добавления точки
        </div>
      )}

      {/* Style selector */}
      <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-md border">
        <select
          value={currentStyle}
          onChange={(e) => setCurrentStyle(e.target.value as keyof typeof MAP_STYLES)}
          className="px-3 py-2 text-sm border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(MAP_STYLES).map(([key, style]) => (
            <option key={key} value={key}>
              {style.name}
            </option>
          ))}
        </select>
      </div>

      {/* Route info */}
      <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900">
          Точек в маршруте: {routePoints.length}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Зданий на карте: {validBuildings.length}
        </div>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[currentStyle].url}
        style={{ width: '100%', height: '100%', cursor: cursorStyle }}
        attributionControl={false}
        reuseMaps
        onClick={handleMapClick}
      >
        {/* Attribution */}
        <div className="absolute bottom-0 right-0 z-10 bg-white/80 px-1.5 py-0.5 text-[9px] text-gray-500 rounded-tl">
          <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">MapLibre</a>
          {' | '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">© OSM</a>
        </div>
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />

        {/* Route line */}
        {routeLineGeoJSON && (
          <Source id="route-line" type="geojson" data={routeLineGeoJSON}>
            <Layer
              id="route-line-layer"
              type="line"
              paint={{
                'line-color': MARKER_COLORS.routePoint,
                'line-width': 3,
                'line-dasharray': [2, 2],
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Building markers */}
        {validBuildings.map(building => {
          const isInRoute = isBuildingInRoute(building.id.toString())
          const routeIndex = getRouteIndex(building.id.toString())
          const isHovered = hoveredBuilding === building.id

          return (
            <Marker
              key={building.id}
              longitude={building.longitude}
              latitude={building.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                handleBuildingClick(building)
              }}
            >
              <div
                className={`
                  building-marker cursor-pointer transition-all duration-200
                  ${isHovered ? 'scale-125' : 'hover:scale-110'}
                `}
                onMouseEnter={() => setHoveredBuilding(building.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
                style={{
                  width: isInRoute ? 32 : 24,
                  height: isInRoute ? 32 : 24,
                  backgroundColor: isInRoute ? MARKER_COLORS.inRoute : MARKER_COLORS.default,
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isInRoute ? '12px' : '10px',
                  fontWeight: 'bold',
                  color: 'white'
                }}
              >
                {isInRoute ? routeIndex : '•'}
              </div>
            </Marker>
          )
        })}

        {/* Route point markers (custom points) */}
        {routePoints
          .filter(point => !point.building_id)
          .map((point, index) => (
            <Marker
              key={point.id || `custom-${index}`}
              longitude={point.longitude}
              latitude={point.latitude}
              anchor="center"
            >
              <div
                className="route-point-marker"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: MARKER_COLORS.routePoint,
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white'
                }}
              >
                {point.order_index + 1}
              </div>
            </Marker>
          ))}

        {/* Popup for building */}
        {popupBuilding && (
          <Popup
            longitude={popupBuilding.longitude}
            latitude={popupBuilding.latitude}
            anchor="bottom"
            offset={15}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setPopupBuilding(null)}
            maxWidth="300px"
          >
            <div className="p-2">
              <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">
                {popupBuilding.name}
              </h3>

              {popupBuilding.image_url && (
                <img
                  src={getStorageUrl(popupBuilding.image_url, 'photos') || popupBuilding.image_url}
                  alt={popupBuilding.name}
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
              )}

              <div className="text-xs text-gray-600 mb-2 space-y-0.5">
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

              <div className="flex gap-2">
                {!isBuildingInRoute(popupBuilding.id.toString()) ? (
                  <button
                    onClick={() => handleAddToRoute(popupBuilding)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    ➕ Добавить в маршрут
                  </button>
                ) : (
                  <div className="flex-1 bg-gray-100 text-gray-600 px-3 py-2 rounded-md text-sm font-medium text-center">
                    ✅ Уже в маршруте ({getRouteIndex(popupBuilding.id.toString())})
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-md border p-3">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Легенда</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: MARKER_COLORS.default }}
            ></div>
            <span className="text-xs text-gray-600">Здание</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: MARKER_COLORS.inRoute }}
            ></div>
            <span className="text-xs text-gray-600">В маршруте</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: MARKER_COLORS.routePoint }}
            ></div>
            <span className="text-xs text-gray-600">Точка маршрута</span>
          </div>
        </div>
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

        .building-marker {
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
