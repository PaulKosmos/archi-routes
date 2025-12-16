'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import OptimizedImage from './OptimizedImage'
import type { Building } from '@/types/building'
import type { Route } from '@/types/route'
import { getStorageUrl } from '@/lib/storage'

// Исправляем иконки Leaflet только на клиенте
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Стили карт
const MAP_STYLES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  }
}

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
  route_geometry?: GeoJSON.LineString | null // Добавляем поле для реальной геометрии маршрута
  route_points?: {
    id: string
    title: string
    latitude: number
    longitude: number
    order_index: number
    description?: string
  }[]
}

interface EnhancedMapProps {
  buildings: Building[]
  routes: Route[]
  selectedBuilding?: string | null
  selectedRoute?: string | null
  hoveredRoute?: string | null
  hoveredBuilding?: string | null
  onBuildingClick?: (buildingId: string) => void
  onRouteClick?: (routeId: string) => void
  onAddToRoute?: (buildingId: string) => void
  onStartRouteFrom?: (buildingId: string) => void
  onBuildingDetails?: (building: Building) => void  // Изменили сигнатуру для модального окна
  onRouteDetails?: (route: Route) => void  // Добавили для модального окна маршрутов
  // Убрали функции центрирования карты
  onMapClick?: (lat: number, lng: number) => void
  radiusCenter?: { lat: number; lng: number } | null
  radiusKm?: number
  showRoutes?: boolean
  showBuildings?: boolean
  className?: string
  radiusMode?: 'none' | 'location' | 'map'
  addBuildingMode?: boolean // Режим добавления объекта
  routeCreationMode?: boolean // Режим создания маршрута
  selectedBuildingsForRoute?: string[] // Выбранные здания для маршрута
  hideLegend?: boolean // Скрыть легенду
  compactControls?: boolean // Компактные контролы (для встроенных карт)
}

// Создание иконок для зданий
const createBuildingIcon = (
  building: Building, 
  isSelected: boolean = false, 
  isHovered: boolean = false,
  isInRoute: boolean = false,
  routeIndex: number = -1
) => {
  // Если здание в маршруте - фиолетовый с номером
  const color = isInRoute ? '#9333EA' : isSelected ? '#3B82F6' : isHovered ? '#F59E0B' : '#10B981'
  const size = isSelected ? 32 : isHovered ? 28 : 24
  
  // Увеличиваем размер для маркеров в маршруте
  const actualSize = isInRoute ? 36 : size
  
  return L.divIcon({
    className: 'custom-building-icon',
    html: `
      <div class="building-marker" style="
        width: ${actualSize}px;
        height: ${actualSize}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isInRoute ? '16px' : '12px'};
        font-weight: bold;
        color: white;
        text-shadow: ${isInRoute ? '0 1px 3px rgba(0,0,0,0.5)' : 'none'};
        transform: translate(-50%, -50%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        ${isInRoute && routeIndex >= 0 ? routeIndex + 1 : '🏛️'}
      </div>
    `,
    iconSize: [actualSize, actualSize],
    iconAnchor: [actualSize/2, actualSize/2],
    popupAnchor: [0, -actualSize/2]
  })
}

// Создание иконок для маршрутов
const createRouteIcon = (route: Route, isSelected: boolean = false) => {
  const color = isSelected ? '#EF4444' : '#F59E0B'
  const size = isSelected ? 28 : 20
  
  return L.divIcon({
    className: 'custom-route-icon',
    html: `
      <div class="route-marker" style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
        transform: translate(-50%, -50%);
      ">
        🛤️
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  })
}

// Получение цвета для линий маршрутов
const getRouteColor = (transportMode?: string) => {
  switch (transportMode) {
    case 'walking': return '#10B981'
    case 'cycling': return '#3B82F6'
    case 'driving': return '#EF4444'
    case 'public_transport': return '#8B5CF6'
    default: return '#6B7280'
  }
}

export default function EnhancedMap({
  buildings,
  routes,
  selectedBuilding,
  selectedRoute,
  hoveredRoute,
  hoveredBuilding,
  onBuildingClick,
  onRouteClick,
  onAddToRoute,
  onStartRouteFrom,
  onBuildingDetails,
  onRouteDetails,
  // Убрали функции центрирования карты
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
  hideLegend = false,
  compactControls = false
}: EnhancedMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const buildingsLayer = useRef<L.LayerGroup | null>(null)
  const routesLayer = useRef<L.LayerGroup | null>(null)
  const buildingMarkersRef = useRef<{ [key: string]: L.Marker }>({})
  const routeMarkersRef = useRef<{ [key: string]: L.Marker }>({})
  const routeLinesRef = useRef<{ [key: string]: L.Polyline }>({})
  const radiusCircleRef = useRef<L.Circle | null>(null)
  
  const [currentStyle, setCurrentStyle] = useState('light')
  const [mapInitialized, setMapInitialized] = useState(false)
  // Убрали всю сложную логику счетчиков попапов

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    console.log('🗺️ Инициализация улучшенной карты...')

    // Создаем карту
    mapInstance.current = L.map(mapRef.current, {
      center: [52.5200, 13.4050], // Берлин по умолчанию
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      attributionControl: true
    })

    // Добавляем тайловый слой
    const tileLayer = L.tileLayer(MAP_STYLES[currentStyle as keyof typeof MAP_STYLES].url, {
      attribution: MAP_STYLES[currentStyle as keyof typeof MAP_STYLES].attribution,
      maxZoom: 19
    }).addTo(mapInstance.current)

    // Создаем слои
    buildingsLayer.current = L.layerGroup().addTo(mapInstance.current)
    routesLayer.current = L.layerGroup().addTo(mapInstance.current)

    // Добавляем обработчик клика на карту
    if (onMapClick) {
      mapInstance.current.on('click', (e) => {
        console.log('🗺️ Map clicked:', e.latlng.lat, e.latlng.lng, 'radiusMode:', radiusMode)
        if (radiusMode === 'map') {
          onMapClick(e.latlng.lat, e.latlng.lng)
        }
      })
    }

    setMapInitialized(true)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setMapInitialized(false)
      }
    }
  }, [])

  // Обновление маркеров зданий
  useEffect(() => {
    if (!mapInitialized || !buildingsLayer.current || !showBuildings) return

    // Очищаем существующие маркеры
    buildingsLayer.current.clearLayers()
    buildingMarkersRef.current = {}

    // Добавляем новые маркеры
    buildings.forEach(building => {
      if (!building.latitude || !building.longitude) return

      const isSelected = selectedBuilding === building.id
      const isHovered = hoveredBuilding === building.id
      const isInRoute = selectedBuildingsForRoute.includes(building.id)
      const routeIndex = isInRoute ? selectedBuildingsForRoute.indexOf(building.id) : -1
      const icon = createBuildingIcon(building, isSelected, isHovered, isInRoute, routeIndex)

      const marker = L.marker([building.latitude, building.longitude], { icon })
        .addTo(buildingsLayer.current!)

      // Преобразуем image_url в полный URL Supabase Storage
      const imageUrl = building.image_url ? getStorageUrl(building.image_url, 'photos') : null

      // Создаем базовый popup для hover (маленький)
      const hoverPopupContent = `
        <div class="building-hover-popup" style="min-width: 150px;">
          <div class="flex items-center space-x-2">
            ${imageUrl ? `
              <img src="${imageUrl}" alt="${building.name}" 
                   style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"
                   loading="lazy">
            ` : `
              <div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                🏛️
              </div>
            `}
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 text-sm mb-1">${building.name}</h4>
              <div class="text-xs text-gray-600">
                ${building.architect ? `${building.architect}` : ''}
                ${building.year_built ? ` • ${building.year_built}` : ''}
              </div>
              ${building.rating ? `
                <div class="flex items-center mt-1">
                  <span class="text-yellow-400 text-xs">★</span>
                  <span class="text-xs text-gray-600 ml-1">${building.rating.toFixed(1)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `

      // Создаем развернутый popup для клика
      const detailedPopupContent = `
        <div class="building-detailed-popup" style="min-width: 280px; max-width: 320px;">
          ${imageUrl ? `
            <div class="mb-3">
              <img src="${imageUrl}" alt="${building.name}" 
                   style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"
                   loading="lazy">
            </div>
          ` : ''}
          
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1 mr-2">
              <h3 class="font-semibold text-gray-900 text-lg mb-1">${building.name}</h3>
              ${building.moderation_status === 'pending' ? `
                <span class="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                  На модерации
                </span>
              ` : ''}
              ${building.moderation_status === 'rejected' ? `
                <span class="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                  Отклонено
                </span>
              ` : ''}
            </div>
            ${building.rating ? `
              <div class="flex items-center flex-shrink-0">
                <span class="text-yellow-400 text-lg">★</span>
                <span class="text-sm text-gray-600 ml-1">${building.rating.toFixed(1)}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="text-sm text-gray-600 mb-3">
            <div class="flex items-center mb-2">
              <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              ${building.city}, ${building.country}
            </div>
            ${building.architect ? `
              <div class="mb-1"><strong>Архитектор:</strong> ${building.architect}</div>
            ` : ''}
            ${building.year_built ? `
              <div class="mb-1"><strong>Год постройки:</strong> ${building.year_built}</div>
            ` : ''}
            ${building.architectural_style ? `
              <div class="mb-1"><strong>Стиль:</strong> ${building.architectural_style}</div>
            ` : ''}
            ${building.building_type ? `
              <div class="mb-1"><strong>Тип:</strong> ${building.building_type}</div>
            ` : ''}
          </div>
          
          ${building.description ? `
            <p class="text-sm text-gray-700 mb-3 line-clamp-3">${building.description}</p>
          ` : ''}
          
          <div class="flex items-center justify-between text-sm mb-3">
            <div class="flex items-center space-x-4">
              ${building.view_count ? `
                <span class="flex items-center text-gray-500">
                  <span class="mr-1">👁️</span>
                  ${building.view_count}
                </span>
              ` : ''}
              ${building.review_count ? `
                <span class="flex items-center text-gray-500">
                  <span class="mr-1">💬</span>
                  ${building.review_count}
                </span>
              ` : ''}
            </div>
            <button 
              onclick="window.buildingDetailsHandler && window.buildingDetailsHandler('${building.id}')"
              class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Подробнее →
            </button>
          </div>
          
          ${routeCreationMode ? `
            <button 
              class="add-to-route-btn w-full bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors font-medium ${selectedBuildingsForRoute.includes(building.id) ? 'opacity-50 cursor-not-allowed' : ''}"
              data-building-id="${building.id}"
              ${selectedBuildingsForRoute.includes(building.id) ? 'disabled' : ''}
            >
              ${selectedBuildingsForRoute.includes(building.id) ? '✅ Уже добавлено' : '➕ Добавить в маршрут'}
            </button>
          ` : ''}
        </div>
      `

      // Привязываем hover popup
      marker.bindPopup(hoverPopupContent, {
        maxWidth: 200,
        className: 'building-hover-popup-container',
        closeOnClick: false,
        autoClose: false,
        closeOnEscapeKey: false,
        autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
      })
      
      // Убрали сложную логику счетчиков попапов

      // Обработчики событий
      let hoverTimeout: NodeJS.Timeout | null = null
      
      marker.on('mouseover', (e) => {
        // Предотвращаем всплытие события
        e.originalEvent.stopPropagation()
        
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
          hoverTimeout = null
        }
        marker.openPopup()
        
        // НЕ центрируем карту при наведении на объект на карте (только показываем попап)
      })
      
      marker.on('mouseout', (e) => {
        // Предотвращаем всплытие события
        e.originalEvent.stopPropagation()
        
        hoverTimeout = setTimeout(() => {
          if (marker.isPopupOpen()) {
            marker.closePopup()
          }
        }, 200) // Уменьшили задержку для лучшей отзывчивости
      })

      marker.on('click', () => {
        // Закрываем hover popup
        marker.closePopup()
        
        // Создаем и показываем детальный popup
        const detailedPopup = L.popup({
          maxWidth: 350,
          className: 'building-detailed-popup-container',
          autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
        })
        .setContent(detailedPopupContent)
        .setLatLng(marker.getLatLng())
        
        detailedPopup.openOn(mapInstance.current!)
        
        // Вызываем callback если есть
        if (onBuildingClick) {
          onBuildingClick(building.id)
        }
      })

      buildingMarkersRef.current[building.id] = marker
    })

    // Автоматическое определение границ карты
    if (buildings.length > 0) {
      const group = L.featureGroup(Object.values(buildingMarkersRef.current))
      if (mapInstance.current) {
        mapInstance.current.fitBounds(group.getBounds().pad(0.1))
      }
    }

  }, [buildings, selectedBuilding, hoveredBuilding, showBuildings, mapInitialized, onBuildingClick, selectedBuildingsForRoute, routeCreationMode])

  // Центрирование на выбранном здании - ОТКЛЮЧЕНО
  // useEffect(() => {
  //   if (!mapInitialized || !selectedBuilding || !mapInstance.current) return

  //   const building = buildings.find(b => b.id === selectedBuilding)
  //   if (building && building.latitude && building.longitude) {
  //     mapInstance.current.setView([building.latitude, building.longitude], 16, {
  //       animate: true,
  //       duration: 1
  //     })
  //   }
  // }, [selectedBuilding, buildings, mapInitialized])

  // Центрирование на выбранном маршруте - ОТКЛЮЧЕНО
  // useEffect(() => {
  //   if (!mapInitialized || !selectedRoute || !mapInstance.current) return

  //   const route = routes.find(r => r.id === selectedRoute)
  //   if (route && route.route_geometry && route.route_geometry.coordinates && route.route_geometry.coordinates.length > 0) {
  //     // Находим центр маршрута
  //     const coordinates = route.route_geometry.coordinates
  //     const lats = coordinates.map((coord: number[]) => coord[1]).filter(Boolean)
  //     const lngs = coordinates.map((coord: number[]) => coord[0]).filter(Boolean)
      
  //     if (lats.length > 0 && lngs.length > 0) {
  //       const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length
  //       const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length
        
  //       mapInstance.current.setView([centerLat, centerLng], 14, {
  //         animate: true,
  //         duration: 1
  //       })
  //     }
  //   }
  // }, [selectedRoute, routes, mapInitialized])

  // Визуализация радиуса поиска
  useEffect(() => {
    if (!mapInitialized || !mapInstance.current) return

    // Удаляем предыдущий круг
    if (radiusCircleRef.current) {
      mapInstance.current.removeLayer(radiusCircleRef.current)
      radiusCircleRef.current = null
    }

    // Добавляем новый круг если есть центр и радиус
    if (radiusCenter && radiusKm > 0) {
      radiusCircleRef.current = L.circle([radiusCenter.lat, radiusCenter.lng] as [number, number], {
        radius: radiusKm * 1000, // Конвертируем км в метры
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(mapInstance.current)
    }
  }, [radiusCenter, radiusKm, mapInitialized])

  // Управление курсором для выбора радиуса и добавления объекта
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return

    const mapContainer = mapRef.current.querySelector('.leaflet-container') as HTMLElement
    if (mapContainer) {
      // Удаляем все классы режимов
      mapContainer.classList.remove('radius-selection-mode', 'add-building-mode')
      
      // Добавляем нужный класс
      if (radiusMode === 'map') {
        mapContainer.classList.add('radius-selection-mode')
      } else if (addBuildingMode) {
        mapContainer.classList.add('add-building-mode')
      }
    }
  }, [radiusMode, addBuildingMode, mapInitialized])

  // Обновление маркеров маршрутов
  useEffect(() => {
    if (!mapInitialized || !routesLayer.current) return

    // Очищаем существующие маркеры и линии
    routesLayer.current.clearLayers()
    routeMarkersRef.current = {}
    routeLinesRef.current = {}

    // Добавляем маршруты только если они выделены или наведены
    const routesToShow = routes.filter(route => 
      selectedRoute === route.id || hoveredRoute === route.id
    )
    
    routesToShow.forEach(route => {
      if (!route.route_geometry || !route.route_geometry.coordinates || route.route_geometry.coordinates.length === 0) return

      const isSelected = selectedRoute === route.id
      const isHovered = hoveredRoute === route.id
      const routeColor = getRouteColor(route.transport_mode)

      // Создаем линию маршрута - используем реальную геометрию если есть
      let routeCoordinates: [number, number][] = []
      
      if (route.route_geometry && route.route_geometry.coordinates) {
        // Используем сохраненную реальную геометрию маршрута
        routeCoordinates = route.route_geometry.coordinates.map((coord: number[]) => 
          [coord[1], coord[0]] as [number, number] // Leaflet использует [lat, lng]
        )
        console.log('🗺️ Using real route geometry for route:', route.id)
      } else {
        // Fallback к прямым линиям между точками (если нет геометрии)
        routeCoordinates = []
        console.log('⚠️ Using straight lines for route:', route.id, '(no geometry saved)')
      }

      if (routeCoordinates.length > 1) {
        const polyline = L.polyline(routeCoordinates, {
          color: routeColor,
          weight: isSelected ? 4 : 3,
          opacity: isSelected ? 0.8 : 0.6,
          dashArray: route.transport_mode === 'walking' ? '5, 10' : undefined
        }).addTo(routesLayer.current!)

        // Создаем hover popup для маршрута
        const hoverPopupContent = `
          <div class="route-hover-popup" style="min-width: 200px;">
            <h3 class="font-semibold text-gray-900 text-sm mb-2">${route.title}</h3>
            
            <div class="text-xs text-gray-600 mb-2">
              <div class="flex items-center mb-1">
                <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                ${route.city}, ${route.country}
              </div>
              ${route.difficulty_level ? `
                <div class="mb-1">
                  <strong>Сложность:</strong> 
                  <span class="px-2 py-1 rounded text-xs ${
                    route.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                    route.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }">
                    ${route.difficulty_level === 'easy' ? 'Легкий' :
                      route.difficulty_level === 'medium' ? 'Средний' : 'Сложный'}
                  </span>
                </div>
              ` : ''}
            </div>
            
            <div class="flex items-center justify-between text-xs text-gray-500">
              ${route.estimated_duration_minutes ? `
                <span class="flex items-center">
                  <span class="mr-1">⏱️</span>
                  ${Math.round(route.estimated_duration_minutes)} мин
                </span>
              ` : ''}
              ${route.distance_km ? `
                <span class="flex items-center">
                  <span class="mr-1">📏</span>
                  ${route.distance_km.toFixed(1)} км
                </span>
              ` : ''}
            </div>
          </div>
        `

        // Создаем детальный popup для маршрута
        const detailedPopupContent = `
          <div class="route-detailed-popup" style="min-width: 300px;">
            <div class="flex items-start mb-3">
              ${route.thumbnail_url ? `
                <img src="${route.thumbnail_url}" alt="${route.title}" class="w-16 h-16 object-cover rounded-lg mr-3 flex-shrink-0">
              ` : ''}
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 text-sm mb-1">${route.title}</h3>
                <p class="text-xs text-gray-600 mb-2">${route.city}, ${route.country}</p>
              </div>
            </div>
            
            ${route.description ? `
              <p class="text-xs text-gray-700 mb-3 line-clamp-2">${route.description}</p>
            ` : ''}
            
            <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
              ${route.estimated_duration_minutes ? `
                <div class="flex items-center">
                  <span class="mr-1">⏱️</span>
                  <span>${Math.round(route.estimated_duration_minutes)} мин</span>
                </div>
              ` : ''}
              ${route.distance_km ? `
                <div class="flex items-center">
                  <span class="mr-1">📏</span>
                  <span>${route.distance_km.toFixed(1)} км</span>
                </div>
              ` : ''}
              ${route.transport_mode ? `
                <div class="flex items-center">
                  <span class="mr-1">🚶</span>
                  <span>${route.transport_mode === 'walking' ? 'Пешком' :
                    route.transport_mode === 'cycling' ? 'Велосипед' :
                    route.transport_mode === 'driving' ? 'Авто' :
                    route.transport_mode === 'public_transport' ? 'Общ. транспорт' : route.transport_mode}</span>
                </div>
              ` : ''}
              <div class="flex items-center">
                <span class="mr-1">📍</span>
                <span>${route.route_geometry.coordinates.length} точек</span>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center text-xs text-gray-500">
                <span class="mr-1">⭐</span>
                <span>${(route.rating || 0).toFixed(1)} (${route.review_count || 0})</span>
              </div>
              <button 
                onclick="window.routeDetailsHandler && window.routeDetailsHandler('${route.id}')"
                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Подробнее →
              </button>
            </div>
          </div>
        `

        // Привязываем hover popup
        polyline.bindPopup(hoverPopupContent, {
          maxWidth: 250,
          className: 'custom-popup',
          autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
        })

        // Обработчики событий для двухуровневых попапов
        let hoverTimeout: NodeJS.Timeout | null = null

        polyline.on('mouseover', (e) => {
          // Предотвращаем всплытие события
          e.originalEvent.stopPropagation()
          
          // Очищаем таймаут если есть
          if (hoverTimeout) {
            clearTimeout(hoverTimeout)
            hoverTimeout = null
          }
          
          // Показываем hover popup
          polyline.openPopup()
        })

        polyline.on('mouseout', (e) => {
          // Предотвращаем всплытие события
          e.originalEvent.stopPropagation()
          
          hoverTimeout = setTimeout(() => {
            if (polyline.isPopupOpen()) {
              polyline.closePopup()
            }
          }, 200) // Уменьшили задержку для лучшей отзывчивости
        })

        polyline.on('click', () => {
          // Закрываем hover popup
          polyline.closePopup()
          
          // Создаем и показываем детальный popup
          const detailedPopup = L.popup({
            maxWidth: 350,
            className: 'route-detailed-popup-container',
            autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
          })
          .setContent(detailedPopupContent)
          .setLatLng(polyline.getCenter())
          
          detailedPopup.openOn(mapInstance.current!)
          
          // Вызываем callback если есть
          if (onRouteClick) {
            onRouteClick(route.id)
          }
        })

        routeLinesRef.current[route.id] = polyline
      }

      // Добавляем маркеры для начальной и конечной точек маршрута
      if (routeCoordinates.length > 0) {
        // Маркер начала маршрута
        const startIcon = L.divIcon({
          html: '<div style="background-color: #10B981; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          className: 'custom-div-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
        
        const startMarker = L.marker(routeCoordinates[0], { icon: startIcon })
          .addTo(routesLayer.current!)

        const startPopupContent = `
          <div class="route-point-popup" style="min-width: 150px;">
            <div class="flex items-center mb-1">
              <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2">
                СТАРТ
              </span>
              <h4 class="font-semibold text-gray-900 text-sm">${route.title}</h4>
            </div>
            
            <div class="text-xs text-gray-500">
              <div class="mb-1">
                <strong>Начало маршрута</strong>
              </div>
              <button 
                onclick="window.routeClickHandler && window.routeClickHandler('${route.id}')"
                class="text-blue-600 hover:text-blue-700 font-medium"
              >
                Подробнее →
              </button>
            </div>
          </div>
        `

        startMarker.bindPopup(startPopupContent, {
          maxWidth: 200,
          className: 'custom-popup',
          autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
        })
        
        // Убрали сложную логику счетчиков попапов

        startMarker.on('click', () => {
          if (onRouteClick) {
            onRouteClick(route.id)
          }
        })

        // Маркер конца маршрута
        if (routeCoordinates.length > 1) {
          const endIcon = L.divIcon({
            html: '<div style="background-color: #EF4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
          
          const endMarker = L.marker(routeCoordinates[routeCoordinates.length - 1], { icon: endIcon })
            .addTo(routesLayer.current!)

          const endPopupContent = `
            <div class="route-point-popup" style="min-width: 150px;">
              <div class="flex items-center mb-1">
                <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-2">
                  ФИНИШ
                </span>
                <h4 class="font-semibold text-gray-900 text-sm">${route.title}</h4>
              </div>
              
              <div class="text-xs text-gray-500">
                <div class="mb-1">
                  <strong>Конец маршрута</strong>
                </div>
                <button 
                  onclick="window.routeClickHandler && window.routeClickHandler('${route.id}')"
                  class="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Подробнее →
                </button>
              </div>
            </div>
          `

          endMarker.bindPopup(endPopupContent, {
            maxWidth: 200,
            className: 'custom-popup',
            autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
          })
          
          // Убрали сложную логику счетчиков попапов

          endMarker.on('click', () => {
            if (onRouteClick) {
              onRouteClick(route.id)
            }
          })

          routeMarkersRef.current[`${route.id}_end`] = endMarker
        }

        routeMarkersRef.current[`${route.id}_start`] = startMarker
      }
    })

  }, [routes, selectedRoute, hoveredRoute, mapInitialized, onRouteClick])

  // Обновление стиля карты
  useEffect(() => {
    if (!mapInstance.current) return

    // Удаляем все существующие tile layers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current!.removeLayer(layer)
      }
    })

    // Добавляем новый tile layer
    const newTileLayer = L.tileLayer(MAP_STYLES[currentStyle as keyof typeof MAP_STYLES].url, {
      attribution: MAP_STYLES[currentStyle as keyof typeof MAP_STYLES].attribution,
      maxZoom: 19
    })
    
    newTileLayer.addTo(mapInstance.current)
  }, [currentStyle])

  // Глобальные обработчики для popup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).buildingClickHandler = onBuildingClick
      ;(window as any).routeClickHandler = onRouteClick
      ;(window as any).addToRouteHandler = onAddToRoute
      ;(window as any).startRouteFromHandler = onStartRouteFrom
      ;(window as any).buildingDetailsHandler = onBuildingDetails
      ;(window as any).routeDetailsHandler = onRouteDetails
    }
  }, [onBuildingClick, onRouteClick, onAddToRoute, onStartRouteFrom, onBuildingDetails, onRouteDetails])

  // Обновляем обработчик клика на карту при изменении radiusMode или addBuildingMode
  useEffect(() => {
    if (!mapInstance.current || !onMapClick) return

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      console.log('🗺️ Map clicked:', e.latlng.lat, e.latlng.lng, 'radiusMode:', radiusMode, 'addBuildingMode:', addBuildingMode)
      
      if (radiusMode === 'map') {
        onMapClick(e.latlng.lat, e.latlng.lng)
      } else if (addBuildingMode) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    }

    // Удаляем старый обработчик и добавляем новый
    mapInstance.current.off('click')
    mapInstance.current.on('click', handleMapClick)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('click', handleMapClick)
      }
    }
  }, [radiusMode, addBuildingMode, onMapClick])

  // Убрали логирование попапов

  return (
    <div className={`relative ${className}`}>
      {/* Overlay подсказка для режима добавления объекта */}
      {addBuildingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl border-2 border-green-400 animate-pulse">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="font-semibold">Выберите местоположение объекта</p>
              <p className="text-xs text-green-100">Кликните на карту в нужном месте</p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay подсказка для режима создания маршрута */}
      {routeCreationMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-2xl border-2 border-purple-400">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="font-semibold">Режим создания маршрута</p>
              <p className="text-xs text-purple-100">Кликайте на здания для добавления в маршрут</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Панель управления стилем карты - адаптивная */}
      <div className={`absolute ${compactControls ? 'top-4' : 'top-28'} right-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-2`}>
        {/* Desktop: горизонтально с текстом */}
        <div className="hidden md:flex space-x-1">
          {Object.keys(MAP_STYLES).map(style => (
            <button
              key={style}
              onClick={() => setCurrentStyle(style)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                currentStyle === style
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={`${style === 'light' ? 'Светлая' : style === 'dark' ? 'Тёмная' : 'Спутник'} тема карты`}
            >
              {style === 'light' ? '☀️ Светлая' :
               style === 'dark' ? '🌙 Тёмная' :
               style === 'satellite' ? '🛰️ Спутник' : style}
            </button>
          ))}
        </div>

        {/* Mobile: вертикально, только иконки, справа */}
        <div className="flex md:hidden flex-col space-y-1">
          {Object.keys(MAP_STYLES).map(style => (
            <button
              key={style}
              onClick={() => setCurrentStyle(style)}
              className={`p-2 text-base rounded transition-colors ${
                currentStyle === style
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={`${style === 'light' ? 'Светлая' : style === 'dark' ? 'Тёмная' : 'Спутник'} тема карты`}
            >
              {style === 'light' ? '☀️' :
               style === 'dark' ? '🌙' :
               style === 'satellite' ? '🛰️' : style}
            </button>
          ))}
        </div>
      </div>

      {/* Легенда - ТОЛЬКО НА DESKTOP */}
      {!hideLegend && (
        <div className="hidden md:block absolute bottom-4 right-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <h4 className="font-semibold text-gray-900 text-sm mb-3">Легенда</h4>
        
        {showBuildings && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Здания</h5>
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Архитектурные объекты</span>
            </div>
          </div>
        )}
        
        {showRoutes && (
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2">Маршруты</h5>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600">Пешком</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-blue-500 rounded"></div>
                <span className="text-xs text-gray-600">Велосипед</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-red-500 rounded"></div>
                <span className="text-xs text-gray-600">Автомобиль</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-purple-500 rounded"></div>
                <span className="text-xs text-gray-600">Общ. транспорт</span>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Карта */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* CSS стили с исправленными z-index для попапов */}
      <style jsx global>{`
        /* Стили для hover попапов */
        .building-hover-popup-container .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #E5E7EB;
          padding: 0;
        }
        
        .building-hover-popup-container .leaflet-popup-content {
          margin: 8px;
          line-height: 1.4;
        }
        
        .building-hover-popup-container .leaflet-popup-tip {
          background: white;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-top-color: #E5E7EB;
        }
        
        /* Стили для детальных попапов */
        .building-detailed-popup-container .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 1px solid #E5E7EB;
          padding: 0;
        }
        
        .building-detailed-popup-container .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        
        .building-detailed-popup-container .leaflet-popup-tip {
          background: white;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-top-color: #E5E7EB;
        }
        
        /* КРИТИЧНО: Максимальный z-index для попапов */
        .leaflet-popup-pane {
          z-index: 10000 !important;
          pointer-events: none !important;
        }
        
        .leaflet-popup {
          z-index: 10001 !important;
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content-wrapper {
          z-index: 10002 !important;
          pointer-events: auto !important;
        }
        
        .building-hover-popup-container,
        .building-detailed-popup-container {
          z-index: 10003 !important;
          pointer-events: auto !important;
        }
        
        /* Убеждаемся что содержимое попапа интерактивно */
        .leaflet-popup-content {
          pointer-events: auto !important;
        }

      /* Исправляем позиционирование попапов */
      .leaflet-popup {
        position: absolute !important;
      }
      
      .leaflet-popup-pane {
        z-index: 1000 !important;
      }
      
      .leaflet-popup-content-wrapper {
        position: relative !important;
      }

      /* Активный курсор для выбора радиуса на карте */
      .leaflet-container.radius-selection-mode {
        cursor: crosshair !important;
      }
      
      .leaflet-container.radius-selection-mode .leaflet-interactive {
        cursor: crosshair !important;
      }
      
      /* Курсор для режима добавления объекта */
      .leaflet-container.add-building-mode {
        cursor: copy !important;
      }
      
      .leaflet-container.add-building-mode .leaflet-interactive {
        cursor: copy !important;
      }
        
        .leaflet-popup-tip {
          z-index: 10004 !important;
        }
        
        .leaflet-popup-close-button {
          z-index: 10005 !important;
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
        
        .building-marker, .route-marker {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .building-marker:hover, .route-marker:hover {
          transform: translate(-50%, -50%) scale(1.1);
          filter: brightness(1.1);
        }
        
        .leaflet-marker-icon {
          cursor: pointer;
        }
        
        .leaflet-marker-icon:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
          transition: all 0.2s ease;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

