// src/components/LeafletMap.tsx - Обновленный с поддержкой реальных маршрутов
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Building } from '../types/building'

// Исправляем проблему с иконками Leaflet только на клиенте
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

// Типы для маршрутов
interface RouteData {
  id: string
  title: string
  description: string
  route_geometry: GeoJSON.LineString | null
  transport_mode: string
  route_points: {
    id: string
    title: string
    latitude: number
    longitude: number
    order_index: number
    description?: string
  }[]
}

interface LeafletMapProps {
  buildings: Building[]
  routes?: RouteData[] // Новый prop для маршрутов
  selectedRoute?: string // ID выбранного маршрута для выделения
  selectedBuilding?: string | null // ID выбранного здания для подсветки
  onBuildingClick?: (building: Building) => void // Callback для клика по зданию
}

const MAP_STYLES = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  light: {
    name: 'CartoDB Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  },
  dark: {
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  },
  topo: {
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap, © OpenTopoMap'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, © WorldView'
  },
  cycle: {
    name: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap, © CyclOSM'
  }
}

// Цвета для разных типов транспорта
const TRANSPORT_COLORS = {
  walking: '#10B981',     // Зеленый
  cycling: '#3B82F6',     // Синий
  driving: '#EF4444',     // Красный
  public_transport: '#8B5CF6' // Фиолетовый
}

// Иконки для точек маршрута
const createRoutePointIcon = (index: number, isSelected: boolean = false) => {
  const color = isSelected ? '#DC2626' : '#059669'
  const size = isSelected ? 32 : 24

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${size > 24 ? '14px' : '12px'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${index + 1}
      </div>
    `,
    className: 'route-point-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

export default function LeafletMap({
  buildings,
  routes = [],
  selectedRoute,
  selectedBuilding = null,
  onBuildingClick
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routesLayer = useRef<L.LayerGroup | null>(null)
  const buildingMarkersRef = useRef<{ [key: string]: L.Marker }>({})
  const [currentStyle, setCurrentStyle] = useState('light')
  const [currentTileLayer, setCurrentTileLayer] = useState<L.TileLayer | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(selectedRoute || null)
  const [showAllRoutes, setShowAllRoutes] = useState(false)
  const buildingsRef = useRef<Building[]>([])
  const routesRef = useRef<RouteData[]>([])

  // Инициализация карты (только один раз)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    console.log('🗺️ Initializing map...')

    // Создаем карту
    mapInstance.current = L.map(mapRef.current, {
      center: [52.5200, 13.4050],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true
    })

    // Добавляем начальный слой карты
    const initialStyle = MAP_STYLES[currentStyle as keyof typeof MAP_STYLES]
    const tileLayer = L.tileLayer(initialStyle.url, {
      attribution: initialStyle.attribution,
      maxZoom: 19
    }).addTo(mapInstance.current)
    setCurrentTileLayer(tileLayer)

    // Создаем слои
    markersLayer.current = L.layerGroup().addTo(mapInstance.current)
    routesLayer.current = L.layerGroup().addTo(mapInstance.current)

    setMapInitialized(true)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setMapInitialized(false)
      }
    }
  }, [])

  // Обновление стиля карты
  useEffect(() => {
    if (!mapInstance.current || !mapInitialized) return

    if (currentTileLayer) {
      mapInstance.current.removeLayer(currentTileLayer)
    }

    const newStyle = MAP_STYLES[currentStyle as keyof typeof MAP_STYLES]
    const newTileLayer = L.tileLayer(newStyle.url, {
      attribution: newStyle.attribution,
      maxZoom: 19
    }).addTo(mapInstance.current)

    setCurrentTileLayer(newTileLayer)
  }, [currentStyle, mapInitialized])

  // Обновление маркеров зданий
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current || !mapInitialized) return

    // Проверяем, действительно ли изменились здания
    const buildingsChanged = JSON.stringify(buildingsRef.current) !== JSON.stringify(buildings)
    if (!buildingsChanged) return

    console.log('🏢 Updating building markers:', buildings.length)
    buildingsRef.current = buildings

    // Очищаем предыдущие маркеры зданий
    markersLayer.current.clearLayers()

    // Очищаем ссылки на маркеры
    Object.values(buildingMarkersRef.current).forEach(marker => {
      if (mapInstance.current && mapInstance.current.hasLayer(marker)) {
        mapInstance.current.removeLayer(marker)
      }
    })
    buildingMarkersRef.current = {}

    const validCoordinates: [number, number][] = []

    // Добавляем маркеры для каждого здания
    buildings.forEach((building) => {
      if (!building.latitude || !building.longitude) {
        console.warn('⚠️ Building without coordinates:', building.name)
        return
      }

      // Создаем маркер с кастомной иконкой
      const isSelected = selectedBuilding === building.id
      const markerIcon = L.divIcon({
        className: 'custom-building-marker',
        html: isSelected
          ? `<div class="building-marker-selected">
               <div class="pulse-ring"></div>
               <div class="building-icon">🏢</div>
             </div>`
          : `<div class="building-marker-normal">
               <div class="building-icon">🏢</div>
             </div>`,
        iconSize: isSelected ? [30, 30] : [24, 24],
        iconAnchor: isSelected ? [15, 15] : [12, 12]
      })

      const marker = L.marker([building.latitude, building.longitude], { icon: markerIcon })
      validCoordinates.push([building.latitude, building.longitude])

      // Сохраняем маркер в ref
      buildingMarkersRef.current[building.id] = marker

      // Создаем попап с информацией о здании
      const popupContent = `
        <div style="min-width: 280px; max-width: 350px;">
          <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: #1F2937; line-height: 1.3;">
            ${building.name}
          </h3>
          
          ${building.image_url ? `
            <img 
              src="${building.image_url}" 
              alt="${building.name}"
              style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;"
            />
          ` : ''}
          
          <div style="margin-bottom: 8px;">
            <p style="margin: 4px 0; font-size: 14px;">
              <strong style="color: #374151;">Архитектор:</strong> 
              <span style="color: #6B7280;">${building.architect}</span>
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong style="color: #374151;">Год постройки:</strong> 
              <span style="color: #6B7280;">${building.year_built}</span>
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong style="color: #374151;">Стиль:</strong> 
              <span style="color: #6B7280;">${building.architectural_style || 'Не указан'}</span>
            </p>
          </div>
          
          ${building.description ? `
            <p style="margin: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.4;">
              ${building.description.length > 100 ? building.description.substring(0, 100) + '...' : building.description}
            </p>
          ` : ''}
          
          <div style="margin: 12px 0 8px 0; padding-top: 8px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
              📍 ${building.address || building.city}
            </p>
            ${building.rating ? `
              <div style="margin-top: 4px; font-size: 14px; color: #F59E0B;">
                ⭐ ${building.rating}/5
              </div>
            ` : ''}
          </div>
          
          <div style="margin-top: 12px; text-align: center;">
            ${onBuildingClick ? `
              <button 
                onclick="window.addBuildingToRoute && window.addBuildingToRoute('${building.id}', '${building.name.replace(/'/g, "\\'")}', ${building.latitude}, ${building.longitude})"
                style="background: #059669; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; margin-right: 8px; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#047857'"
                onmouseout="this.style.backgroundColor='#059669'"
              >
                + Добавить в маршрут
              </button>
            ` : ''}
            <button 
              onclick="window.location.href='/buildings/${building.id}'"
              style="background: #3B82F6; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; transition: background-color 0.2s;"
              onmouseover="this.style.backgroundColor='#2563EB'"
              onmouseout="this.style.backgroundColor='#3B82F6'"
            >
              Learn More →
            </button>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 400,
        className: 'building-popup',
        closeButton: true,
        autoClose: false,
        autoPan: false
      })

      // События для маркера - ИСПРАВЛЕНО
      let hoverTimeout: NodeJS.Timeout
      let closeTimeout: NodeJS.Timeout

      marker.on('mouseover', () => {
        // Очищаем timeout закрытия если он есть
        if (closeTimeout) {
          clearTimeout(closeTimeout)
        }

        hoverTimeout = setTimeout(() => {
          marker.openPopup()
        }, 200) // Немного увеличили задержку
      })

      marker.on('mouseout', () => {
        // Очищаем timeout открытия
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
        }

        // НЕ закрываем автоматически - пользователь может навестись на попап
        // Попап закроется только при клике или явном действии
      })

      // Дополнительная обработка для попапа
      marker.on('popupopen', () => {
        const popup = marker.getPopup()
        if (popup) {
          const popupEl = popup.getElement()
          if (popupEl) {
            // При наведении на попап - НЕ закрываем
            popupEl.addEventListener('mouseover', () => {
              if (closeTimeout) {
                clearTimeout(closeTimeout)
              }
            })

            // При уходе с попапа - ставим задержку на закрытие
            popupEl.addEventListener('mouseleave', () => {
              closeTimeout = setTimeout(() => {
                marker.closePopup()
              }, 500) // Даем время вернуться к попапу
            })
          }
        }
      })

      // Клик по маркеру
      marker.on('click', () => {
        if (onBuildingClick) {
          onBuildingClick(building)
        } else {
          window.location.href = `/buildings/${building.id}`
        }
      })

      markersLayer.current?.addLayer(marker)
    })

    // Подгоняем карту если нет маршрутов
    if (validCoordinates.length > 0 && routes.length === 0) {
      const savedView = sessionStorage.getItem('leaflet-map-view')
      if (!savedView) {
        const bounds = L.latLngBounds(validCoordinates)
        mapInstance.current.fitBounds(bounds, { padding: [20, 20] })
      }
    }

  }, [buildings, mapInitialized, onBuildingClick, selectedBuilding])

  // Обработка подсветки выбранного здания
  useEffect(() => {
    if (!mapInstance.current || !mapInitialized) return

    // Обновляем стили маркеров в зависимости от выбранного здания
    buildings.forEach(building => {
      const marker = buildingMarkersRef.current[building.id]
      if (marker) {
        const isSelected = building.id === selectedBuilding
        const markerIcon = L.divIcon({
          className: 'custom-building-marker',
          html: isSelected
            ? `<div class="building-marker-selected">
                 <div class="pulse-ring"></div>
                 <div class="building-icon">🏢</div>
               </div>`
            : `<div class="building-marker-normal">
                 <div class="building-icon">🏢</div>
               </div>`,
          iconSize: isSelected ? [30, 30] : [24, 24],
          iconAnchor: isSelected ? [15, 15] : [12, 12]
        })

        marker.setIcon(markerIcon)

        // Центрируем карту на выбранном здании (только если нет маршрутов)
        if (isSelected && (!routes || routes.length === 0) && mapInstance.current) {
          const currentZoom = mapInstance.current.getZoom()
          mapInstance.current.setView(
            [building.latitude, building.longitude],
            currentZoom < 15 ? 15 : currentZoom,
            { animate: true }
          )
        }
      }
    })
  }, [selectedBuilding, buildings, mapInitialized, routes])

  // Обновление маршрутов (ИСПРАВЛЕНО - показываем только выбранный)
  useEffect(() => {
    if (!mapInstance.current || !routesLayer.current || !mapInitialized) return

    // Проверяем, изменились ли маршруты
    const routesChanged = JSON.stringify(routesRef.current) !== JSON.stringify(routes)
    if (!routesChanged) return

    console.log('🛤️ Updating route overlays:', routes.length)
    routesRef.current = routes

    // Очищаем предыдущие маршруты
    routesLayer.current.clearLayers()

    const allRouteCoordinates: [number, number][] = []

    // Фильтруем маршруты: показываем только выбранный или все если включена опция
    const routesToShow = selectedRouteId
      ? routes.filter(route => route.id === selectedRouteId)
      : showAllRoutes
        ? routes
        : routes.slice(0, 1) // По умолчанию показываем только первый

    console.log(`🎯 Showing ${routesToShow.length} routes (selected: ${selectedRouteId}, showAll: ${showAllRoutes})`)

    routesToShow.forEach((route, routeIndex) => {
      const isSelected = selectedRoute === route.id
      const transportMode = route.transport_mode || 'walking'
      const routeColor = TRANSPORT_COLORS[transportMode as keyof typeof TRANSPORT_COLORS] || TRANSPORT_COLORS.walking

      console.log(`🗺️ Processing route: ${route.title}`, {
        hasGeometry: !!route.route_geometry,
        pointsCount: route.route_points?.length || 0,
        isSelected,
        transportMode
      })

      // 1. Отображаем РЕАЛЬНУЮ геометрию маршрута из MapBox
      if (route.route_geometry && route.route_geometry.coordinates) {
        console.log(`✅ Drawing real route geometry with ${route.route_geometry.coordinates.length} coordinates`)

        // Конвертируем координаты GeoJSON (lng, lat) в Leaflet (lat, lng)
        const latLngs = route.route_geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number])

        // Создаем полилинию с реальным маршрутом
        const routeLine = L.polyline(latLngs, {
          color: routeColor,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.9 : 0.7,
          dashArray: transportMode === 'walking' ? '5, 5' :
            transportMode === 'cycling' ? '10, 5' :
              undefined // Сплошная линия для driving и public_transport
        })

        // Добавляем попап для маршрута
        const routePopupContent = `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1F2937;">
              ${route.title}
            </h4>
            <p style="margin: 4px 0; font-size: 13px; color: #6B7280;">
              🚶 ${transportMode === 'walking' ? 'Пешком' :
            transportMode === 'cycling' ? 'На велосипеде' :
              transportMode === 'driving' ? 'На автомобиле' : 'Общ. транспорт'}
            </p>
            <p style="margin: 4px 0; font-size: 13px; color: #6B7280;">
              📍 ${route.route_points?.length || 0} точек
            </p>
            ${route.description ? `
              <p style="margin: 8px 0; font-size: 12px; color: #4B5563; line-height: 1.4;">
                ${route.description.length > 80 ? route.description.substring(0, 80) + '...' : route.description}
              </p>
            ` : ''}
            <div style="margin-top: 8px; text-align: center;">
              <button 
                onclick="window.location.href='/routes/${route.id}'"
                style="background: ${routeColor}; color: white; padding: 6px 12px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;"
              >
                Пройти маршрут →
              </button>
            </div>
          </div>
        `

        routeLine.bindPopup(routePopupContent, {
          className: 'route-popup'
        })

        routesLayer.current?.addLayer(routeLine)
        allRouteCoordinates.push(...latLngs)

      } else {
        console.log(`⚠️ No geometry for route ${route.title}, drawing straight lines`)

        // Fallback: прямые линии между точками
        if (route.route_points && route.route_points.length > 1) {
          const coordinates = route.route_points
            .sort((a, b) => a.order_index - b.order_index)
            .map(point => [point.latitude, point.longitude] as [number, number])

          const routeLine = L.polyline(coordinates, {
            color: routeColor,
            weight: isSelected ? 6 : 4,
            opacity: isSelected ? 0.9 : 0.5,
            dashArray: '10, 10' // Пунктирная линия для fallback
          })

          routesLayer.current?.addLayer(routeLine)
          allRouteCoordinates.push(...coordinates)
        }
      }

      // 2. Добавляем точки маршрута
      if (route.route_points && route.route_points.length > 0) {
        route.route_points
          .sort((a, b) => a.order_index - b.order_index)
          .forEach((point, index) => {
            const pointMarker = L.marker(
              [point.latitude, point.longitude],
              { icon: createRoutePointIcon(index, isSelected) }
            )

            const pointPopupContent = `
              <div style="min-width: 180px;">
                <h5 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1F2937;">
                  ${index + 1}. ${point.title}
                </h5>
                ${point.description ? `
                  <p style="margin: 4px 0; font-size: 12px; color: #6B7280; line-height: 1.3;">
                    ${point.description}
                  </p>
                ` : ''}
                <p style="margin: 4px 0; font-size: 11px; color: #9CA3AF;">
                  Маршрут: ${route.title}
                </p>
              </div>
            `

            pointMarker.bindPopup(pointPopupContent, {
              className: 'route-point-popup'
            })

            routesLayer.current?.addLayer(pointMarker)
          })
      }
    })

    // Подгоняем карту под выбранный маршрут
    if (allRouteCoordinates.length > 0 && (selectedRouteId || routesToShow.length === 1)) {
      const bounds = L.latLngBounds(allRouteCoordinates)
      mapInstance.current.fitBounds(bounds, { padding: [30, 30] })
    }

  }, [routes, mapInitialized, selectedRouteId, showAllRoutes])

  return (
    <div className="relative">
      {/* Панель управления */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        {/* Селектор стилей карты */}
        <div className="bg-white rounded-lg shadow-md border">
          <select
            value={currentStyle}
            onChange={(e) => setCurrentStyle(e.target.value)}
            className="px-3 py-2 text-sm border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <option key={key} value={key}>
                {style.name}
              </option>
            ))}
          </select>
        </div>

        {/* Убираем управление маршрутами - теперь только селектор стилей */}
      </div>

      {/* Информационная панель */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900">
          Зданий: {buildings.length}
        </div>
        {routes.length > 0 && (
          <div className="text-sm font-medium text-gray-900">
            Маршрутов: {routes.length}
          </div>
        )}
        <div className="text-xs text-gray-600 mt-1">
          Наведите курсор на маркеры
        </div>
      </div>

      {/* Контейнер карты */}
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-lg"
        style={{ minHeight: '500px' }}
      />

      {/* Кастомные стили с ИСПРАВЛЕННЫМ Z-INDEX */}
      <style jsx global>{`
        .building-popup .leaflet-popup-content-wrapper,
        .route-popup .leaflet-popup-content-wrapper,
        .route-point-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #E5E7EB;
        }
        .building-popup .leaflet-popup-content,
        .route-popup .leaflet-popup-content,
        .route-point-popup .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        .building-popup .leaflet-popup-tip,
        .route-popup .leaflet-popup-tip,
        .route-point-popup .leaflet-popup-tip {
          border-top-color: #E5E7EB;
        }
        .route-point-icon {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .route-point-icon:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
        }
        
        /* КРИТИЧНО: Максимальный z-index для попапов на главной странице */
        .leaflet-popup-pane {
          z-index: 9999 !important;
          pointer-events: none !important;
        }
        
        .leaflet-popup {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content-wrapper {
          z-index: 10000 !important;
          pointer-events: auto !important;
        }
        
        /* КРИТИЧНО: Попап НЕ должен терять события при hover */
        .leaflet-popup-content-wrapper:hover,
        .leaflet-popup-content:hover {
          pointer-events: auto !important;
        }
        
        .building-popup,
        .route-popup,
        .route-point-popup {
          z-index: 10001 !important;
          pointer-events: auto !important;
        }
        
        /* Убеждаемся что содержимое попапа интерактивно */
        .leaflet-popup-content {
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content button,
        .leaflet-popup-content a {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        /* Убеждаемся что карта имеет меньший z-index */
        .leaflet-container {
          z-index: 1 !important;
          cursor: default;
        }
        
        .leaflet-map-pane {
          z-index: 1 !important;
        }
        
        .leaflet-tile-pane {
          z-index: 1 !important;
        }
        
        .leaflet-overlay-pane {
          z-index: 2 !important;
        }
        
        .leaflet-marker-pane {
          z-index: 3 !important;
        }
        
        .leaflet-marker-icon {
          cursor: pointer;
        }
        .leaflet-marker-icon:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  )
}