// src/components/MapLibreEnhanced.tsx - Full-featured MapLibre GL JS map
'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo
} from 'react'
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  type MapRef,
  type ViewStateChangeEvent
} from 'react-map-gl/maplibre'
import type { LayerProps } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Building } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'

// Helper function to create circle polygon GeoJSON
function createCircleGeoJSON(lng: number, lat: number, radiusKm: number) {
  const points = 64
  const coords: [number, number][] = []
  const distanceX = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))
  const distanceY = radiusKm / 110.574

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI)
    const x = lng + distanceX * Math.cos(theta)
    const y = lat + distanceY * Math.sin(theta)
    coords.push([x, y])
  }
  coords.push(coords[0]) // Close the polygon

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords]
    }
  }
}

// Route interface
interface Route {
  id: string
  title: string
  description?: string
  city: string | null
  country: string | null
  transport_mode?: string
  difficulty_level?: string | null
  estimated_duration_minutes?: number
  distance_km?: number
  points_count?: number
  is_published?: boolean
  rating?: number
  review_count?: number
  created_at: string
  thumbnail_url?: string | null
  route_geometry?: GeoJSON.LineString | null
  route_points?: {
    id: string
    title: string
    latitude: number
    longitude: number
    order_index: number
    description?: string
  }[]
}

// Ref interface for imperative methods
export interface MapLibreEnhancedRef {
  centerOnRoute: (routeId: string) => void
  centerOnBuilding: (buildingId: string) => void
  openBuildingPopup: (buildingId: string) => void
  flyToCoordinates: (lat: number, lng: number, zoom?: number) => void
}

interface MapLibreEnhancedProps {
  buildings: Building[]
  routes: Route[]
  selectedBuilding?: string | null
  selectedRoute?: string | null
  hoveredRoute?: string | null
  hoveredBuilding?: string | null
  onBuildingClick?: (buildingId: string | null) => void
  onMapBuildingSelect?: (buildingId: string | null) => void
  onRouteClick?: (routeId: string) => void
  onAddToRoute?: (buildingId: string) => void
  onStartRouteFrom?: (buildingId: string) => void
  onBuildingDetails?: (building: Building) => void
  onRouteDetails?: (route: Route) => void
  onMapClick?: (lat: number, lng: number) => void
  radiusCenter?: { lat: number; lng: number } | null
  radiusKm?: number
  showRoutes?: boolean
  showBuildings?: boolean
  className?: string
  radiusMode?: 'none' | 'location' | 'map'
  addBuildingMode?: boolean
  routeCreationMode?: boolean
  selectedBuildingsForRoute?: string[]
  activeRouteBuildingIds?: string[]
  hideLegend?: boolean
  compactControls?: boolean
  onViewStateChange?: (center: { lat: number; lng: number }, zoom: number) => void
}

// Map styles - free, no API key required
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

// Transport mode colors
const TRANSPORT_COLORS: Record<string, string> = {
  walking: '#10B981',
  cycling: '#3B82F6',
  driving: '#EF4444',
  public_transport: '#8B5CF6',
  default: '#6B7280'
}

// Marker color schemes (coral palette from logo)
const MARKER_COLORS = {
  normal:       { core: '#F26438', gradient: '#F57C53', ring: '#F26438', ringOpacity: 0.2 },
  hovered:      { core: '#F57C53', gradient: '#F89470', ring: '#F57C53', ringOpacity: 0.35 },
  selected:     { core: '#F89470', gradient: '#FBA98B', ring: '#F89470', ringOpacity: 0.4 },
  route:        { core: '#E64D20', gradient: '#F26438', ring: '#E64D20', ringOpacity: 0.3 },
  viewed_route: { core: '#059669', gradient: '#34D399', ring: '#10B981', ringOpacity: 0.35 },
}

type MarkerState = 'normal' | 'hovered' | 'selected' | 'route' | 'viewed_route'

// Get marker state
const getMarkerState = (
  buildingId: string,
  selectedBuilding: string | null | undefined,
  hoveredBuilding: string | null | undefined,
  selectedBuildingsForRoute: string[],
  activeRouteBuildingIds: string[]
): MarkerState => {
  if (selectedBuildingsForRoute.includes(buildingId)) return 'route'
  if (activeRouteBuildingIds.includes(buildingId)) return 'viewed_route'
  if (selectedBuilding === buildingId) return 'selected'
  if (hoveredBuilding === buildingId) return 'hovered'
  return 'normal'
}

// Get marker size based on state
const getMarkerSize = (state: MarkerState): number => {
  switch (state) {
    case 'route':        return 34
    case 'viewed_route': return 32
    case 'selected':     return 30
    case 'hovered':      return 26
    default:             return 22
  }
}

// Building Marker Component
const BuildingMarker = ({
  building,
  state,
  routeIndex,
  viewedRouteIndex,
  onClick,
  onMouseEnter,
  onMouseLeave
}: {
  building: Building
  state: MarkerState
  routeIndex: number
  viewedRouteIndex: number
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) => {
  const size = getMarkerSize(state)
  const colors = MARKER_COLORS[state]

  return (
    <Marker
      longitude={building.longitude}
      latitude={building.latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick()
      }}
    >
      <div
        className="building-marker-container"
        style={{
          width: size,
          height: size,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))'
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-state={state}
      >
        <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`grad-${building.id}`}>
              <stop offset="0%" style={{ stopColor: colors.gradient, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: colors.core, stopOpacity: 1 }} />
            </radialGradient>
            <filter id={`shadow-${building.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feFlood floodColor="#000000" floodOpacity="0.15" />
              <feComposite in2="offsetblur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer ring */}
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={colors.ring}
            strokeWidth="2"
            opacity={colors.ringOpacity}
          />

          {/* Main circle */}
          <circle
            cx="24"
            cy="24"
            r="15"
            fill={`url(#grad-${building.id})`}
            filter={`url(#shadow-${building.id})`}
          />

          {/* Inner highlight */}
          <circle
            cx="24"
            cy="22"
            r="6"
            fill="white"
            opacity="0.12"
          />

          {/* Number or dot */}
          {state === 'route' && routeIndex >= 0 ? (
            <text
              x="24" y="24"
              textAnchor="middle" dominantBaseline="central"
              fill="white"
              fontFamily="'DM Sans', 'Inter', -apple-system, sans-serif"
              fontSize="14" fontWeight="700" letterSpacing="-0.3"
            >
              {routeIndex + 1}
            </text>
          ) : state === 'viewed_route' && viewedRouteIndex >= 0 ? (
            <text
              x="24" y="24"
              textAnchor="middle" dominantBaseline="central"
              fill="white"
              fontFamily="'DM Sans', 'Inter', -apple-system, sans-serif"
              fontSize="13" fontWeight="700" letterSpacing="-0.3"
            >
              {viewedRouteIndex + 1}
            </text>
          ) : (
            <circle cx="24" cy="24" r="2.5" fill="white" opacity="0.9" />
          )}
        </svg>
      </div>
    </Marker>
  )
}

// Building Popup Component
const BuildingPopup = ({
  building,
  isDetailed,
  onClose,
  onDetails,
  onAddToRoute,
  routeCreationMode,
  isInRoute
}: {
  building: Building
  isDetailed: boolean
  onClose: () => void
  onDetails?: (building: Building) => void
  onAddToRoute?: (buildingId: string) => void
  routeCreationMode: boolean
  isInRoute: boolean
}) => {
  const imageUrl = building.image_url ? getStorageUrl(building.image_url, 'photos') : null

  if (!isDetailed) {
    // Compact hover popup
    return (
      <Popup
        longitude={building.longitude}
        latitude={building.latitude}
        anchor="bottom"
        offset={15}
        closeButton={false}
        closeOnClick={false}
        maxWidth="220px"
        className="building-hover-popup"
      >
        <div className="flex items-center gap-2.5 p-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={building.name}
              className="w-11 h-11 object-cover rounded-md flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-11 h-11 bg-gray-100 rounded-md flex items-center justify-center text-lg flex-shrink-0">
              🏛️
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-semibold text-gray-900 truncate leading-tight mb-1">
              {building.name}
            </h4>
            <div className="text-[11px] text-gray-500 leading-tight mb-0.5">
              {building.architect || building.year_built
                ? `${building.architect || ''}${building.architect && building.year_built ? ' • ' : ''}${building.year_built || ''}`
                : building.city || ''}
            </div>
            {Number(building.rating) > 0 && (building.review_count ?? 0) > 0 && (
              <div className="flex items-center">
                <span className="text-amber-400 text-xs">★</span>
                <span className="text-[11px] text-gray-500 ml-0.5 font-medium">
                  {Number(building.rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Popup>
    )
  }

  // Detailed click popup
  return (
    <Popup
      longitude={building.longitude}
      latitude={building.latitude}
      anchor="bottom"
      offset={20}
      closeButton={true}
      closeOnClick={false}
      onClose={onClose}
      maxWidth="280px"
      className="building-detailed-popup"
    >
      <div className="p-3">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={building.name}
            className="w-full h-28 object-cover rounded-lg mb-2"
            loading="lazy"
          />
        )}

        <div className="mb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 leading-tight flex-1">
              {building.name}
            </h3>
            {Number(building.rating) > 0 && (building.review_count ?? 0) > 0 && (
              <div className="flex items-center flex-shrink-0">
                <span className="text-amber-400 text-[15px]">★</span>
                <span className="text-[13px] text-gray-500 ml-0.5 font-semibold">
                  {Number(building.rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {(building.moderation_status === 'pending' || building.moderation_status === 'rejected') && (
            <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded-full font-medium ${building.moderation_status === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
              }`}>
              {building.moderation_status === 'pending' ? 'Pending review' : 'Rejected'}
            </span>
          )}
        </div>

        <div className="text-xs text-gray-500 mb-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{building.city}{building.country ? `, ${building.country}` : ''}</span>
          </div>
          {building.architect && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{building.architect}</span>
            </div>
          )}
          {building.year_built && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{building.year_built}</span>
            </div>
          )}
          {building.architectural_style && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
              </svg>
              <span>{building.architectural_style}</span>
            </div>
          )}
        </div>

        {building.description && (
          <p className="text-[11px] text-gray-500 mb-2 line-clamp-2 leading-relaxed">
            {building.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            {building.view_count !== undefined && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {building.view_count}
              </span>
            )}
            {building.review_count !== undefined && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {building.review_count}
              </span>
            )}
          </div>
          <button
            onClick={() => onDetails?.(building)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap"
          >
            Learn More →
          </button>
        </div>

        {routeCreationMode && (
          <button
            onClick={() => onAddToRoute?.(building.id)}
            disabled={isInRoute}
            className={`w-full py-1.5 rounded-md text-[11px] font-medium transition-colors ${isInRoute
                ? 'bg-purple-600/50 text-white cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
              }`}
          >
            {isInRoute ? '✅ Added' : '➕ Add to route'}
          </button>
        )}
      </div>
    </Popup>
  )
}

// Route line layer style
const getRouteLayerStyle = (transportMode: string, isSelected: boolean): LayerProps => ({
  id: `route-line`,
  type: 'line',
  paint: {
    'line-color': TRANSPORT_COLORS[transportMode] || TRANSPORT_COLORS.default,
    'line-width': isSelected ? 4 : 3,
    'line-opacity': isSelected ? 0.8 : 0.6,
    'line-dasharray': transportMode === 'walking' ? [2, 2] : [1, 0]
  }
})

// Start/End Marker Component
const RouteEndpointMarker = ({
  longitude,
  latitude,
  type,
  routeTitle,
  onClick
}: {
  longitude: number
  latitude: number
  type: 'start' | 'end'
  routeTitle: string
  onClick: () => void
}) => {
  const color = type === 'start' ? '#10B981' : '#EF4444'
  const label = type === 'start' ? 'СТАРТ' : 'ФИНИШ'

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick()
      }}
    >
      <div
        className="route-endpoint-marker"
        style={{
          width: 20,
          height: 20,
          backgroundColor: color,
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          cursor: 'pointer'
        }}
        title={`${label}: ${routeTitle}`}
      />
    </Marker>
  )
}

// User Location Marker
const UserLocationMarker = ({
  latitude,
  longitude
}: {
  latitude: number
  longitude: number
}) => (
  <Marker longitude={longitude} latitude={latitude} anchor="center">
    <div
      className="user-location-marker"
      style={{
        width: 20,
        height: 20,
        backgroundColor: '#3B82F6',
        borderRadius: '50%',
        border: '4px solid white',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3)',
        animation: 'pulse-location 2s infinite'
      }}
    />
  </Marker>
)

// Main Component
const MapLibreEnhanced = forwardRef<MapLibreEnhancedRef, MapLibreEnhancedProps>(
  (props, ref) => {
    const {
      buildings,
      routes,
      selectedBuilding,
      selectedRoute,
      hoveredRoute,
      hoveredBuilding,
      onBuildingClick,
      onMapBuildingSelect,
      onRouteClick,
      onAddToRoute,
      onBuildingDetails,
      onRouteDetails,
      onMapClick,
      radiusCenter,
      radiusKm = 5,
      showRoutes = true,
      showBuildings = true,
      className = '',
      radiusMode = 'none',
      addBuildingMode = false,
      routeCreationMode = false,
      selectedBuildingsForRoute = [],
      activeRouteBuildingIds = [],
      hideLegend = false,
      compactControls = false,
      onViewStateChange
    } = props

    const mapRef = useRef<MapRef>(null)
    const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('light')

    // Apply brightness filter only to the map canvas, not popups/markers
    useEffect(() => {
      const canvas = mapRef.current?.getCanvas()
      if (canvas) {
        canvas.style.filter = currentStyle === 'dark' ? 'brightness(1.45) contrast(0.88)' : ''
      }
    }, [currentStyle])
    const [viewState, setViewState] = useState({
      longitude: 13.4050,
      latitude: 52.5200,
      zoom: 3
    })

    // Popup state
    const [hoverPopupBuilding, setHoverPopupBuilding] = useState<Building | null>(null)
    const [detailedPopupBuilding, setDetailedPopupBuilding] = useState<Building | null>(null)
    const lastClickedBuildingRef = useRef<string | null>(null)
    const isFirstLoad = useRef(true)

    // Refs to keep handleMapClick stable (avoids re-registration race condition)
    const addBuildingModeRef = useRef(addBuildingMode)
    const radiusModeRef = useRef(radiusMode)
    const onMapClickRef = useRef(onMapClick)
    const onMapBuildingSelectRef = useRef(onMapBuildingSelect)
    useLayoutEffect(() => { addBuildingModeRef.current = addBuildingMode }, [addBuildingMode])
    useLayoutEffect(() => { radiusModeRef.current = radiusMode }, [radiusMode])
    useLayoutEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
    useLayoutEffect(() => { onMapBuildingSelectRef.current = onMapBuildingSelect }, [onMapBuildingSelect])

    // Filter valid buildings
    const validBuildings = useMemo(() =>
      buildings.filter(b => b.latitude && b.longitude),
      [buildings]
    )

    // Get active route for display
    const activeRoute = useMemo(() => {
      const routeId = selectedRoute || hoveredRoute
      if (!routeId) return null
      return routes.find(r => r.id === routeId) || null
    }, [routes, selectedRoute, hoveredRoute])

    // Route GeoJSON data
    const routeGeoJSON = useMemo(() => {
      if (!activeRoute?.route_geometry?.coordinates) return null
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: activeRoute.route_geometry
      }
    }, [activeRoute])

    // Fit bounds on first load
    useEffect(() => {
      if (!isFirstLoad.current || validBuildings.length === 0 || !mapRef.current) return

      const lngs = validBuildings.map(b => b.longitude)
      const lats = validBuildings.map(b => b.latitude)

      if (lngs.length === 0) return

      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ]

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 0
      })

      isFirstLoad.current = false
    }, [validBuildings])

    // Center on route
    const centerOnRoute = useCallback((routeId: string) => {
      if (!mapRef.current) return

      const route = routes.find(r => r.id === routeId)
      if (!route?.route_geometry?.coordinates?.length) {
        console.warn('Cannot center on route: no geometry', routeId)
        return
      }

      const coords = route.route_geometry.coordinates
      const lngs = coords.map(c => c[0])
      const lats = coords.map(c => c[1])

      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ]

      // Mobile offset calculation
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

      if (isMobile) {
        // Calculate visible area between header and bottom sheet top
        const headerHeight = 64 // Header height in pixels
        const bottomSheetHeight = window.innerHeight * 0.6 // Bottom sheet takes 60% of screen
        const bottomPadding = bottomSheetHeight + 20 // Extra padding for bottom sheet
        const topPadding = headerHeight + 20 // Extra padding below header

        // Use fitBounds with asymmetric padding to center route in visible area
        mapRef.current.fitBounds(bounds, {
          padding: {
            top: topPadding,
            bottom: bottomPadding,
            left: 30,
            right: 30
          },
          maxZoom: 14,
          duration: 800
        })
      } else {
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 13,
          duration: 1000
        })
      }
    }, [routes])

    // Center on building
    const centerOnBuilding = useCallback((buildingId: string) => {
      if (!mapRef.current) {
        console.warn('centerOnBuilding: mapRef.current is null')
        return
      }

      const building = buildings.find(b => b.id === buildingId)
      if (!building?.latitude || !building?.longitude) {
        console.warn('Cannot center on building: not found', buildingId)
        return
      }

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      console.log('centerOnBuilding:', building.name, 'isMobile:', isMobile)

      if (isMobile) {
        const map = mapRef.current.getMap()
        const targetZoom = 16
        const currentZoom = map.getZoom()

        const applyOffsetFly = () => {
          // Mobile: center building in visible area between header and bottom sheet
          const headerHeight = 64
          const bottomSheetHeight = window.innerHeight * 0.6
          const visibleTop = headerHeight
          const visibleBottom = window.innerHeight - bottomSheetHeight
          const visibleCenterY = (visibleTop + visibleBottom) / 2
          const screenCenterY = window.innerHeight / 2
          const pixelOffsetY = screenCenterY - visibleCenterY

          // project/unproject works correctly when already at target zoom
          const buildingPoint = map.project([building.longitude, building.latitude])
          const offsetPoint: [number, number] = [
            buildingPoint.x,
            buildingPoint.y + pixelOffsetY
          ]
          const newCenter = map.unproject(offsetPoint)

          mapRef.current!.flyTo({
            center: [newCenter.lng, newCenter.lat],
            zoom: targetZoom,
            duration: 800
          })
        }

        if (Math.abs(currentZoom - targetZoom) > 2) {
          // Far from target zoom: first jump to building, then apply offset
          mapRef.current.flyTo({
            center: [building.longitude, building.latitude],
            zoom: targetZoom,
            duration: 600
          })
          map.once('moveend', applyOffsetFly)
        } else {
          // Already close to target zoom: apply offset directly
          applyOffsetFly()
        }
      } else {
        mapRef.current.flyTo({
          center: [building.longitude, building.latitude],
          zoom: 14,
          duration: 1000
        })
      }
    }, [buildings])

    // Open building popup
    const openBuildingPopup = useCallback((buildingId: string) => {
      const building = buildings.find(b => b.id === buildingId)
      if (building) {
        setHoverPopupBuilding(building)
      }
    }, [buildings])

    // Fly to arbitrary coordinates
    const flyToCoordinates = useCallback((lat: number, lng: number, zoom: number = 13) => {
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom, duration: 1500 })
      }
    }, [])

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      centerOnRoute,
      centerOnBuilding,
      openBuildingPopup,
      flyToCoordinates
    }), [centerOnRoute, centerOnBuilding, openBuildingPopup, flyToCoordinates])

    // Handle map click — stable handler using refs to avoid re-registration race condition
    const handleMapClick = useCallback((event: maplibregl.MapLayerMouseEvent) => {
      if (radiusModeRef.current === 'map' || addBuildingModeRef.current) {
        onMapClickRef.current?.(event.lngLat.lat, event.lngLat.lng)
      } else {
        // Clicking empty space in normal mode → clear building selection
        onMapBuildingSelectRef.current?.(null)
      }

      // Close detailed popup when clicking on map
      setDetailedPopupBuilding(null)
      lastClickedBuildingRef.current = null
    }, []) // empty deps: handler never recreated, always reads latest values via refs

    // Handle marker click
    const handleMarkerClick = useCallback((building: Building) => {
      // One click always opens detailed popup (same on mobile and desktop)
      setHoverPopupBuilding(null)
      setDetailedPopupBuilding(building)
      lastClickedBuildingRef.current = null
      onBuildingClick?.(building.id)
    }, [onBuildingClick])

    // Handle marker hover
    const handleMarkerEnter = useCallback((building: Building) => {
      if (!detailedPopupBuilding) {
        setHoverPopupBuilding(building)
      }
    }, [detailedPopupBuilding])

    const handleMarkerLeave = useCallback(() => {
      setHoverPopupBuilding(null)
    }, [])

    // Close popup handler
    const handleCloseDetailedPopup = useCallback(() => {
      setDetailedPopupBuilding(null)
      lastClickedBuildingRef.current = null
    }, [])

    // Route endpoint coordinates
    const routeEndpoints = useMemo(() => {
      if (!activeRoute?.route_geometry?.coordinates?.length) return null

      const coords = activeRoute.route_geometry.coordinates
      return {
        start: { lng: coords[0][0], lat: coords[0][1] },
        end: { lng: coords[coords.length - 1][0], lat: coords[coords.length - 1][1] }
      }
    }, [activeRoute])

    // Cursor style
    const cursorStyle = useMemo(() => {
      if (radiusMode === 'map') return 'crosshair'
      if (addBuildingMode) return 'copy'
      return 'grab'
    }, [radiusMode, addBuildingMode])

    return (
      <div className={`relative ${className}`}>
        {/* Add building mode overlay */}
        {addBuildingMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl border-2 border-green-400 animate-pulse">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-semibold">Select object location</p>
                <p className="text-xs text-green-100">Click on the map at the desired location</p>
              </div>
            </div>
          </div>
        )}

        {/* Route creation mode overlay */}
        {routeCreationMode && (
          <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-40 bg-purple-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg shadow-2xl border-2 border-purple-400">
            <div className="flex items-center space-x-2 md:space-x-3">
              <span className="text-lg md:text-2xl">🗺️</span>
              <div>
                <p className="font-semibold text-sm md:text-base">Route creation mode</p>
                <p className="text-[10px] md:text-xs text-purple-100">Tap objects to add them to the route</p>
              </div>
            </div>
          </div>
        )}

        {/* Style selector - hidden in compact mode (e.g. blog maps) */}
        {!compactControls && (
          <div className="absolute top-4 left-4 md:top-[5.5rem] md:right-14 md:left-auto z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
            {/* Desktop: horizontal with text */}
            <div className="hidden md:flex space-x-1">
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setCurrentStyle(key as keyof typeof MAP_STYLES)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${currentStyle === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {key === 'light' ? '☀️ Light' : key === 'dark' ? '🌙 Dark' : '🌿 Bright'}
                </button>
              ))}
            </div>

            {/* Mobile: vertical icons only */}
            <div className="flex md:hidden flex-col space-y-1">
              {Object.entries(MAP_STYLES).map(([key]) => (
                <button
                  key={key}
                  onClick={() => setCurrentStyle(key as keyof typeof MAP_STYLES)}
                  className={`p-2 text-base rounded transition-colors ${currentStyle === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {key === 'light' ? '☀️' : key === 'dark' ? '🌙' : '🌿'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend - desktop only, raised above attribution */}
        {!hideLegend && (
          <div className="hidden md:block absolute bottom-8 right-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Legend</h4>

            {showBuildings && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Objects</h5>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: MARKER_COLORS.normal.core }}></div>
                  <span className="text-xs text-gray-600">Architectural objects</span>
                </div>
              </div>
            )}

            {showRoutes && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Routes</h5>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: TRANSPORT_COLORS.walking }}></div>
                    <span className="text-xs text-gray-600">Walking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: TRANSPORT_COLORS.cycling }}></div>
                    <span className="text-xs text-gray-600">Cycling</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: TRANSPORT_COLORS.driving }}></div>
                    <span className="text-xs text-gray-600">Car</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: TRANSPORT_COLORS.public_transport }}></div>
                    <span className="text-xs text-gray-600">Public transp.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt: ViewStateChangeEvent) => {
            setViewState(evt.viewState)
          }}
          onMoveEnd={(evt: ViewStateChangeEvent) => {
            onViewStateChange?.(
              { lat: evt.viewState.latitude, lng: evt.viewState.longitude },
              evt.viewState.zoom
            )
          }}
          mapStyle={MAP_STYLES[currentStyle].url}
          style={{ width: '100%', height: '100%', minHeight: '400px', cursor: cursorStyle }}
          attributionControl={false}
          reuseMaps
          onLoad={() => {
            const canvas = mapRef.current?.getCanvas()
            if (canvas && currentStyle === 'dark') {
              canvas.style.filter = 'brightness(1.45) contrast(0.88)'
            }
          }}
          onClick={handleMapClick}
        >
          {/* Attribution - MapLibre GL JS + OpenFreeMap + OpenStreetMap */}
          <div className="absolute bottom-0 right-0 z-10 bg-white/80 backdrop-blur-sm px-2 py-0.5 text-[10px] text-gray-600 rounded-tl flex items-center gap-1.5">
            <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-center gap-0.5">
              <svg width="12" height="12" viewBox="0 0 1024 1024" className="opacity-70">
                <path fill="currentColor" d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 960C264.6 960 64 759.4 64 512S264.6 64 512 64s448 200.6 448 448-200.6 448-448 448z" />
                <path fill="currentColor" d="M512 192c-176.7 0-320 143.3-320 320s143.3 320 320 320 320-143.3 320-320-143.3-320-320-320zm0 576c-141.4 0-256-114.6-256-256s114.6-256 256-256 256 114.6 256 256-114.6 256-256 256z" />
              </svg>
              MapLibre GL JS
            </a>
            <span className="text-gray-400">|</span>
            <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
              OpenFreeMap
            </a>
            <span className="text-gray-400">|</span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
              © OpenStreetMap
            </a>
          </div>
          {/* Navigation controls - hidden on desktop when legend is visible */}
          {hideLegend && <NavigationControl position="bottom-right" />}
          <ScaleControl position="bottom-left" />
          <GeolocateControl position="top-right" trackUserLocation />

          {/* Route line */}
          {showRoutes && routeGeoJSON && (
            <Source id="route-source" type="geojson" data={routeGeoJSON}>
              <Layer
                {...getRouteLayerStyle(
                  activeRoute?.transport_mode || 'walking',
                  selectedRoute === activeRoute?.id
                )}
              />
            </Source>
          )}

          {/* Route start/end markers */}
          {showRoutes && routeEndpoints && activeRoute && (
            <>
              <RouteEndpointMarker
                longitude={routeEndpoints.start.lng}
                latitude={routeEndpoints.start.lat}
                type="start"
                routeTitle={activeRoute.title}
                onClick={() => onRouteClick?.(activeRoute.id)}
              />
              <RouteEndpointMarker
                longitude={routeEndpoints.end.lng}
                latitude={routeEndpoints.end.lat}
                type="end"
                routeTitle={activeRoute.title}
                onClick={() => onRouteClick?.(activeRoute.id)}
              />
            </>
          )}

          {/* Radius circle - using fill layer with polygon */}
          {radiusCenter && radiusKm > 0 && (
            <Source
              id="radius-circle"
              type="geojson"
              data={createCircleGeoJSON(radiusCenter.lng, radiusCenter.lat, radiusKm)}
            >
              <Layer
                id="radius-circle-fill"
                type="fill"
                paint={{
                  'fill-color': '#3B82F6',
                  'fill-opacity': 0.1
                }}
              />
              <Layer
                id="radius-circle-stroke"
                type="line"
                paint={{
                  'line-color': '#3B82F6',
                  'line-width': 2,
                  'line-dasharray': [2, 2]
                }}
              />
            </Source>
          )}

          {/* User location marker */}
          {radiusCenter && radiusMode === 'location' && (
            <UserLocationMarker
              latitude={radiusCenter.lat}
              longitude={radiusCenter.lng}
            />
          )}

          {/* Building markers */}
          {showBuildings && validBuildings.map(building => {
            const state = getMarkerState(
              building.id,
              selectedBuilding,
              hoveredBuilding,
              selectedBuildingsForRoute,
              activeRouteBuildingIds
            )
            const routeIndex = selectedBuildingsForRoute.indexOf(building.id)
            const viewedRouteIndex = activeRouteBuildingIds.indexOf(building.id)

            return (
              <BuildingMarker
                key={building.id}
                building={building}
                state={state}
                routeIndex={routeIndex}
                viewedRouteIndex={viewedRouteIndex}
                onClick={() => handleMarkerClick(building)}
                onMouseEnter={() => handleMarkerEnter(building)}
                onMouseLeave={handleMarkerLeave}
              />
            )
          })}

          {/* Hover popup */}
          {hoverPopupBuilding && !detailedPopupBuilding && (
            <BuildingPopup
              building={hoverPopupBuilding}
              isDetailed={false}
              onClose={() => setHoverPopupBuilding(null)}
              routeCreationMode={routeCreationMode}
              isInRoute={selectedBuildingsForRoute.includes(hoverPopupBuilding.id)}
            />
          )}

          {/* Detailed popup */}
          {detailedPopupBuilding && (
            <BuildingPopup
              building={detailedPopupBuilding}
              isDetailed={true}
              onClose={handleCloseDetailedPopup}
              onDetails={onBuildingDetails}
              onAddToRoute={onAddToRoute}
              routeCreationMode={routeCreationMode}
              isInRoute={selectedBuildingsForRoute.includes(detailedPopupBuilding.id)}
            />
          )}
        </Map>

        {/* Global styles */}
        <style jsx global>{`
          /* MapLibre popup styles */
          .maplibregl-popup-content {
            padding: 0;
            border-radius: 12px;
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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

          .building-hover-popup .maplibregl-popup-content {
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .building-detailed-popup .maplibregl-popup-content {
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          }

          /* Marker animations */
          .building-marker-container {
            animation: markerFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .building-marker-container:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 12px rgba(242, 100, 56, 0.25)) !important;
          }

          @keyframes markerFadeIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          /* User location pulse animation */
          @keyframes pulse-location {
            0% {
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7), 0 2px 8px rgba(0,0,0,0.3);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(59, 130, 246, 0), 0 2px 8px rgba(0,0,0,0.3);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0), 0 2px 8px rgba(0,0,0,0.3);
            }
          }

          /* Line clamp utilities */
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    )
  }
)

MapLibreEnhanced.displayName = 'MapLibreEnhanced'

export default MapLibreEnhanced
