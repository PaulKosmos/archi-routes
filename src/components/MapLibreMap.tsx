// src/components/MapLibreMap.tsx - MapLibre GL JS версия карты
'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Map, { Marker, Popup, NavigationControl, ScaleControl, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Building } from '../types/building'

// Типы для маршрутов (такие же как в LeafletMap)
interface RouteData {
  id: string
  title: string
  description?: string
  route_geometry?: GeoJSON.LineString | null
  transport_mode?: string
  route_points?: {
    id: string
    title: string
    latitude: number
    longitude: number
    order_index: number
    description?: string
  }[]
}

interface MapLibreMapProps {
  buildings: Building[]
  routes?: RouteData[]
  selectedRoute?: string
  selectedBuilding?: string | null
  onBuildingClick?: (building: Building) => void
}

// Стили карты - бесплатные OpenFreeMap
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

// Цвета для разных типов транспорта
const TRANSPORT_COLORS = {
  walking: '#10B981',
  cycling: '#3B82F6',
  driving: '#EF4444',
  public_transport: '#8B5CF6'
}

export default function MapLibreMap({
  buildings,
  routes = [],
  selectedRoute,
  selectedBuilding = null,
  onBuildingClick
}: MapLibreMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('light')
  const [popupInfo, setPopupInfo] = useState<Building | null>(null)

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) {
      canvas.style.filter = currentStyle === 'dark' ? 'brightness(1.45) contrast(0.88)' : ''
    }
  }, [currentStyle])
  const [viewState, setViewState] = useState({
    longitude: 13.4050,
    latitude: 52.5200,
    zoom: 12
  })

  // Вычисляем границы для всех зданий
  const bounds = useMemo(() => {
    if (buildings.length === 0) return null

    const validBuildings = buildings.filter(b => b.latitude && b.longitude)
    if (validBuildings.length === 0) return null

    const lngs = validBuildings.map(b => b.longitude)
    const lats = validBuildings.map(b => b.latitude)

    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats)
    }
  }, [buildings])

  // Обработчик клика по маркеру
  const handleMarkerClick = useCallback((building: Building) => {
    setPopupInfo(building)
    if (onBuildingClick) {
      onBuildingClick(building)
    }
  }, [onBuildingClick])

  // Переключение стиля карты
  const handleStyleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentStyle(e.target.value as keyof typeof MAP_STYLES)
  }, [])

  // Закрытие попапа
  const handleClosePopup = useCallback(() => {
    setPopupInfo(null)
  }, [])

  // Переход к зданию
  const handleViewBuilding = useCallback((buildingId: string) => {
    window.location.href = `/buildings/${buildingId}`
  }, [])

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      {/* Панель управления */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <div className="bg-white rounded-lg shadow-md border">
          <select
            value={currentStyle}
            onChange={handleStyleChange}
            className="px-3 py-2 text-sm border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <option key={key} value={key}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900">
          Зданий: {buildings.length}
        </div>
        {routes.length > 0 && (
          <div className="text-sm font-medium text-gray-900">
            Маршрутов: {routes.length}
          </div>
        )}
        <div className="text-xs text-gray-600 mt-1">
          MapLibre GL JS
        </div>
      </div>

      {/* Карта MapLibre */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[currentStyle].url}
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
        {/* Контролы навигации */}
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />

        {/* Маркеры зданий */}
        {buildings.map((building) => {
          if (!building.latitude || !building.longitude) return null

          const isSelected = selectedBuilding === building.id

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
                className={`
                  cursor-pointer transition-all duration-200
                  ${isSelected ? 'scale-125' : 'hover:scale-110'}
                `}
                style={{
                  width: isSelected ? 36 : 28,
                  height: isSelected ? 36 : 28,
                  backgroundColor: isSelected ? '#DC2626' : '#3B82F6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  fontSize: isSelected ? '16px' : '14px'
                }}
              >
                🏢
              </div>
            </Marker>
          )
        })}

        {/* Попап с информацией о здании */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={20}
            onClose={handleClosePopup}
            closeButton={true}
            closeOnClick={false}
            maxWidth="350px"
          >
            <div className="p-2">
              <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                {popupInfo.name}
              </h3>

              {popupInfo.image_url && (
                <img
                  src={popupInfo.image_url}
                  alt={popupInfo.name}
                  className="w-full h-28 object-cover rounded-lg mb-3"
                />
              )}

              <div className="space-y-1 mb-3">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Архитектор:</span>{' '}
                  <span className="text-gray-600">{popupInfo.architect}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Год постройки:</span>{' '}
                  <span className="text-gray-600">{popupInfo.year_built}</span>
                </p>
                {popupInfo.architectural_style && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Стиль:</span>{' '}
                    <span className="text-gray-600">{popupInfo.architectural_style}</span>
                  </p>
                )}
              </div>

              {popupInfo.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {popupInfo.description.length > 100
                    ? popupInfo.description.substring(0, 100) + '...'
                    : popupInfo.description}
                </p>
              )}

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                  📍 {popupInfo.address || popupInfo.city}
                </p>
                {popupInfo.rating && (
                  <p className="text-sm text-amber-500 mb-2">
                    ⭐ {popupInfo.rating}/5
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                {onBuildingClick && (
                  <button
                    onClick={() => onBuildingClick(popupInfo)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    + В маршрут
                  </button>
                )}
                <button
                  onClick={() => handleViewBuilding(popupInfo.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Подробнее →
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Стили для карты */}
      <style jsx global>{`
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
        .maplibregl-ctrl-attrib {
          font-size: 10px;
        }
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
