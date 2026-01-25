'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import OptimizedImage from './OptimizedImage'
import type { Building } from '@/types/building'
// Note: Using local Route interface below instead of imported type
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
  thumbnail_url?: string | null
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

export interface EnhancedMapRef {
  centerOnRoute: (routeId: string) => void
  centerOnBuilding: (buildingId: string) => void
  openBuildingPopup: (buildingId: string) => void
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

// Создание иконок для зданий - Refined Minimalism
const createBuildingIcon = (
  building: Building,
  isSelected: boolean = false,
  isHovered: boolean = false,
  isInRoute: boolean = false,
  routeIndex: number = -1
) => {
  // Размеры с точными пропорциями
  const baseSize = isSelected ? 30 : isHovered ? 26 : 22
  const actualSize = isInRoute ? 34 : baseSize

  // Светлая коралловая палитра из логотипа - coral/orange-red palette
  const colorScheme = {
    normal: {
      core: '#F26438',      // Logo coral (HSL 4, 90%, 58%)
      gradient: '#F57C53',  // Light coral
      ring: '#F26438',
      ringOpacity: 0.2
    },
    hovered: {
      core: '#F57C53',      // Bright coral
      gradient: '#F89470',  // Very light coral
      ring: '#F57C53',
      ringOpacity: 0.35
    },
    selected: {
      core: '#F89470',      // Light coral
      gradient: '#FBA98B',  // Pale coral
      ring: '#F89470',
      ringOpacity: 0.4
    },
    route: {
      core: '#E64D20',      // Deep coral
      gradient: '#F26438',  // Logo coral
      ring: '#E64D20',
      ringOpacity: 0.3
    }
  }

  const colors = isInRoute ? colorScheme.route
    : isSelected ? colorScheme.selected
      : isHovered ? colorScheme.hovered
        : colorScheme.normal

  // Минималистичный круглый маркер с точными пропорциями
  const pinSVG = `
    <svg width="${actualSize}" height="${actualSize}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Refined gradient -->
        <radialGradient id="grad-${building.id}">
          <stop offset="0%" style="stop-color:${colors.gradient};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.core};stop-opacity:1" />
        </radialGradient>

        <!-- Crisp shadow -->
        <filter id="shadow-${building.id}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>
          <feOffset dx="0" dy="1" result="offsetblur"/>
          <feFlood flood-color="#000000" flood-opacity="0.15"/>
          <feComposite in2="offsetblur" operator="in" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Outer ring for visual separation -->
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="${colors.ring}"
        stroke-width="2"
        opacity="${colors.ringOpacity}"
        class="marker-ring"/>

      <!-- Main pin circle -->
      <circle
        cx="24"
        cy="24"
        r="15"
        fill="url(#grad-${building.id})"
        filter="url(#shadow-${building.id})"
        class="marker-core"/>

      <!-- Inner highlight circle for depth -->
      <circle
        cx="24"
        cy="22"
        r="6"
        fill="white"
        opacity="0.12"
        class="marker-highlight"/>

      <!-- Number or dot -->
      ${isInRoute && routeIndex >= 0 ? `
        <text
          x="24"
          y="24"
          text-anchor="middle"
          dominant-baseline="central"
          fill="white"
          font-family="'DM Sans', 'Inter', -apple-system, sans-serif"
          font-size="14"
          font-weight="700"
          letter-spacing="-0.3"
          class="marker-number">
          ${routeIndex + 1}
        </text>
      ` : `
        <circle
          cx="24"
          cy="24"
          r="2.5"
          fill="white"
          opacity="0.9"
          class="marker-dot"/>
      `}
    </svg>
  `

  return L.divIcon({
    className: 'custom-building-icon',
    html: `
      <div class="minimal-marker" data-state="${isInRoute ? 'route' : isSelected ? 'selected' : isHovered ? 'hovered' : 'normal'}" style="
        width: ${actualSize}px;
        height: ${actualSize}px;
        transform: translate(-50%, -50%);
        cursor: pointer;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        ${pinSVG}
      </div>
    `,
    iconSize: [actualSize, actualSize],
    iconAnchor: [actualSize / 2, actualSize / 2],
    popupAnchor: [-10, -actualSize / 2 - 5]
  })
}

// Создание иконок для маршрутов
const createRouteIcon = (route: Route, isSelected: boolean = false) => {
  const color = isSelected ? '#F57C53' : '#F59E0B'
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
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
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

const EnhancedMap = forwardRef<EnhancedMapRef, EnhancedMapProps>(
  (props, ref) => {
    const {
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
    } = props
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<L.Map | null>(null)
    const buildingsLayer = useRef<L.LayerGroup | null>(null)
    const routesLayer = useRef<L.LayerGroup | null>(null)
    const buildingMarkersRef = useRef<{ [key: string]: L.Marker }>({})
    const routeMarkersRef = useRef<{ [key: string]: L.Marker }>({})
    const routeLinesRef = useRef<{ [key: string]: L.Polyline }>({})
    const radiusCircleRef = useRef<L.Circle | null>(null)
    const locationMarkerRef = useRef<L.Marker | null>(null)
    const isFirstBuildingsLoad = useRef(true) // Флаг для первой загрузки зданий
    const lastClickedBuildingRef = useRef<string | null>(null) // ID последнего кликнутого здания для двухуровневых попапов

    const [currentStyle, setCurrentStyle] = useState('light')
    const [mapInitialized, setMapInitialized] = useState(false)
    // Убрали всю сложную логику счетчиков попапов

    // Метод для центрирования карты на маршруте
    const centerOnRoute = useCallback((routeId: string) => {
      if (!mapInstance.current || !routeId) return

      const route = routes.find(r => r.id === routeId)

      // Edge case: маршрут без геометрии
      if (!route?.route_geometry?.coordinates || route.route_geometry.coordinates.length === 0) {
        console.warn('⚠️ Cannot center on route: no geometry', routeId)
        return
      }

      try {
        // Edge case: маршрут с одной точкой
        if (route.route_geometry.coordinates.length === 1) {
          const coord = route.route_geometry.coordinates[0]
          mapInstance.current.setView([coord[1], coord[0]], 14, {
            animate: true,
            duration: 1.0
          })
          console.log('✅ Centered on single-point route:', routeId)
          return
        }

        // Преобразуем координаты в Leaflet формат [lat, lng]
        const bounds = L.latLngBounds(
          route.route_geometry.coordinates.map((coord: number[]) =>
            [coord[1], coord[0]] as [number, number]
          )
        )

        const isMobile = window.innerWidth < 768

        if (isMobile) {
          // Для мобильных: вычисляем смещенный центр и делаем один плавный переход
          const center = bounds.getCenter()
          const targetZoom = 13

          // Вычисляем смещение для видимой области
          const headerHeight = 60
          const sheetTop = window.innerHeight - (window.innerHeight * 0.6)
          const visibleCenter = (headerHeight + sheetTop) / 2
          const currentCenter = window.innerHeight / 2
          const pixelShiftY = currentCenter - visibleCenter

          // Конвертируем центр маршрута в абсолютные пиксели при target zoom
          const targetPoint = mapInstance.current.project(center, targetZoom)

          // Применяем смещение в пикселях (сдвигаем вниз чтобы скомпенсировать шторку)
          const shiftedPoint = L.point(targetPoint.x, targetPoint.y + pixelShiftY)

          // Конвертируем обратно в координаты
          const shiftedCenter = mapInstance.current.unproject(shiftedPoint, targetZoom)

          // Один плавный переход к смещенному центру
          mapInstance.current.flyTo(shiftedCenter, targetZoom, {
            animate: true,
            duration: 1.0,
            easeLinearity: 0.25
          })
        } else {
          // Для десктопа: используем fitBounds как раньше
          mapInstance.current.fitBounds(bounds, {
            padding: [50, 50] as [number, number],
            animate: true,
            duration: 1.0,
            maxZoom: 13
          })
        }

        console.log('✅ Centered on route:', routeId)
      } catch (error) {
        console.error('❌ Error centering on route:', error)
      }
    }, [routes])

    // Метод для центрирования на здании
    const centerOnBuilding = useCallback((buildingId: string) => {
      if (!mapInstance.current || !buildingId) return

      const building = buildings.find(b => b.id === buildingId)

      if (!building) {
        console.warn('⚠️ Cannot center on building: not found', buildingId)
        return
      }

      try {
        const targetZoom = 14 // Умеренный zoom для одного здания
        const isMobile = window.innerWidth < 768

        if (isMobile) {
          // Для мобильных: вычисляем смещенный центр с учетом шторки
          const buildingLatLng = L.latLng(building.latitude, building.longitude)

          // Вычисляем смещение для видимой области
          const headerHeight = 60
          const sheetTop = window.innerHeight - (window.innerHeight * 0.6)
          const visibleCenter = (headerHeight + sheetTop) / 2
          const currentCenter = window.innerHeight / 2
          const pixelShiftY = currentCenter - visibleCenter

          // Конвертируем координаты здания в пиксели при target zoom
          const targetPoint = mapInstance.current.project(buildingLatLng, targetZoom)

          // Применяем смещение
          const shiftedPoint = L.point(targetPoint.x, targetPoint.y + pixelShiftY)

          // Конвертируем обратно в координаты
          const shiftedCenter = mapInstance.current.unproject(shiftedPoint, targetZoom)

          // Один плавный переход к смещенному центру
          mapInstance.current.flyTo(shiftedCenter, targetZoom, {
            animate: true,
            duration: 1.0,
            easeLinearity: 0.25
          })
        } else {
          // Для десктопа: простое центрирование
          mapInstance.current.flyTo([building.latitude, building.longitude], targetZoom, {
            animate: true,
            duration: 1.0
          })
        }

        console.log('✅ Centered on building:', buildingId)
      } catch (error) {
        console.error('❌ Error centering on building:', error)
      }
    }, [buildings])

    // Метод для открытия popup здания
    const openBuildingPopup = useCallback((buildingId: string) => {
      const marker = buildingMarkersRef.current[buildingId]

      if (!marker) {
        console.warn('⚠️ Cannot open popup: marker not found', buildingId)
        return
      }

      // Открываем маленький hover popup
      marker.openPopup()
      console.log('✅ Opened popup for building:', buildingId)
    }, [])

    // Expose методы через ref
    useImperativeHandle(ref, () => ({
      centerOnRoute,
      centerOnBuilding,
      openBuildingPopup
    }), [centerOnRoute, centerOnBuilding, openBuildingPopup])

    // Инициализация карты
    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return

      console.log('🗺️ Инициализация улучшенной карты...')

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

        // Создаем базовый popup для hover
        const hoverPopupContent = `
        <div class="building-hover-popup" style="width: 200px; max-width: 88vw;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${imageUrl ? `
              <img src="${imageUrl}" alt="${building.name}"
                   style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; flex-shrink: 0;"
                   loading="lazy">
            ` : `
              <div style="width: 44px; height: 44px; background: #F3F4F6; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                🏛️
              </div>
            `}
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-size: 13px; font-weight: 600; color: #111827; margin: 0 0 4px 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${building.name}
              </h4>
              <div style="font-size: 11px; color: #6B7280; line-height: 1.3; margin-bottom: 3px;">
                ${building.architect || building.year_built ? `${building.architect || ''}${building.architect && building.year_built ? ' • ' : ''}${building.year_built || ''}` : building.city || ''}
              </div>
              ${building.rating ? `
                <div style="display: flex; align-items: center;">
                  <span style="color: #FBBF24; font-size: 12px;">★</span>
                  <span style="font-size: 11px; color: #6B7280; margin-left: 3px; font-weight: 500;">${building.rating.toFixed(1)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `

        // Создаем развернутый popup для клика - компактная улучшенная версия
        const detailedPopupContent = `
        <div class="building-detailed-popup" style="width: 270px; max-width: 90vw;">
          ${imageUrl ? `
            <div style="margin-bottom: 8px;">
              <img src="${imageUrl}" alt="${building.name}"
                   style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px;"
                   loading="lazy">
            </div>
          ` : ''}

          <div style="margin-bottom: 8px;">
            <div style="display: flex; align-items: start; justify-content: space-between; gap: 8px;">
              <h3 style="font-size: 15px; font-weight: 600; color: #111827; margin: 0; line-height: 1.3; flex: 1;">
                ${building.name}
              </h3>
              ${building.rating ? `
                <div style="display: flex; align-items: center; flex-shrink: 0;">
                  <span style="color: #FBBF24; font-size: 15px;">★</span>
                  <span style="font-size: 13px; color: #6B7280; margin-left: 2px; font-weight: 600;">${building.rating.toFixed(1)}</span>
                </div>
              ` : ''}
            </div>

            ${building.moderation_status === 'pending' || building.moderation_status === 'rejected' ? `
              <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: ${building.moderation_status === 'pending' ? '#FEF3C7' : '#FEE2E2'}; color: ${building.moderation_status === 'pending' ? '#92400E' : '#991B1B'}; font-size: 10px; border-radius: 9999px; font-weight: 500;">
                ${building.moderation_status === 'pending' ? 'На модерации' : 'Отклонено'}
              </span>
            ` : ''}
          </div>

          <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px; line-height: 1.4;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <svg style="width: 14px; height: 14px; flex-shrink: 0; color: #9CA3AF;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${building.city}${building.country ? ', ' + building.country : ''}</span>
            </div>
            ${building.architect ? `
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                <svg style="width: 14px; height: 14px; flex-shrink: 0; color: #9CA3AF;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${building.architect}</span>
              </div>
            ` : ''}
            ${building.year_built ? `
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                <svg style="width: 14px; height: 14px; flex-shrink: 0; color: #9CA3AF;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>${building.year_built}</span>
              </div>
            ` : ''}
            ${building.architectural_style ? `
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                <svg style="width: 14px; height: 14px; flex-shrink: 0; color: #9CA3AF;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>
                <span>${building.architectural_style}</span>
              </div>
            ` : ''}
          </div>

          ${building.description ? `
            <p style="font-size: 11px; color: #6B7280; margin: 0 0 8px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${building.description}
            </p>
          ` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: ${routeCreationMode ? '8px' : '0'};">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #9CA3AF;">
              ${building.view_count ? `
                <span style="display: flex; align-items: center; gap: 3px;">
                  <svg style="width: 13px; height: 13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ${building.view_count}
                </span>
              ` : ''}
              ${building.review_count ? `
                <span style="display: flex; align-items: center; gap: 3px;">
                  <svg style="width: 13px; height: 13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  ${building.review_count}
                </span>
              ` : ''}
            </div>
            <button
              onclick="window.buildingDetailsHandler && window.buildingDetailsHandler('${building.id}')"
              style="background: #3B82F6; color: white; padding: 5px 12px; border-radius: 6px; font-size: 11px; border: none; cursor: pointer; font-weight: 500; transition: background 0.2s; white-space: nowrap;"
              onmouseover="this.style.background='#2563EB'"
              onmouseout="this.style.background='#3B82F6'"
            >
              Learn More →
            </button>
          </div>

          ${routeCreationMode ? `
            <button
              class="add-to-route-btn"
              style="width: 100%; background: ${selectedBuildingsForRoute.includes(building.id) ? '#9333EA80' : '#9333EA'}; color: white; padding: 7px 12px; border-radius: 6px; font-size: 11px; border: none; cursor: ${selectedBuildingsForRoute.includes(building.id) ? 'not-allowed' : 'pointer'}; font-weight: 500; transition: background 0.2s;"
              data-building-id="${building.id}"
              ${selectedBuildingsForRoute.includes(building.id) ? 'disabled' : ''}
              onmouseover="if(!this.disabled) this.style.background='#7C3AED'"
              onmouseout="if(!this.disabled) this.style.background='#9333EA'"
            >
              ${selectedBuildingsForRoute.includes(building.id) ? '✅ Добавлено' : '➕ В маршрут'}
            </button>
          ` : ''}
        </div>
      `

        // Привязываем hover popup
        marker.bindPopup(hoverPopupContent, {
          maxWidth: 210,
          className: 'building-hover-popup-container',
          closeOnClick: false,
          autoClose: false,
          closeOnEscapeKey: false,
          autoPan: false  // Ключевая опция - отключаем автоматическое центрирование
          // popupAnchor уже настроен в createBuildingIcon
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

          // Не закрываем popup если это здание уже было кликнуто (ждем второго клика)
          const isMobile = window.innerWidth < 768
          if (!isMobile && lastClickedBuildingRef.current === building.id) {
            return // Не закрываем popup после первого клика
          }

          hoverTimeout = setTimeout(() => {
            if (marker.isPopupOpen()) {
              marker.closePopup()
            }
          }, 200) // Уменьшили задержку для лучшей отзывчивости
        })

        marker.on('click', (e) => {
          // Отменяем таймаут закрытия при клике
          if (hoverTimeout) {
            clearTimeout(hoverTimeout)
            hoverTimeout = null
          }

          // Предотвращаем всплытие события при первом клике в десктопе
          const isMobile = window.innerWidth < 768
          if (!isMobile && lastClickedBuildingRef.current !== building.id) {
            e.originalEvent.stopPropagation()
          }

          if (isMobile) {
            // На мобильных - сразу открываем большой детальный popup
            marker.closePopup()

            const detailedPopup = L.popup({
              maxWidth: 280,
              className: 'building-detailed-popup-container',
              autoPan: true,
              autoPanPadding: [50, 50]
            })
              .setContent(detailedPopupContent)
              .setLatLng(marker.getLatLng())

            detailedPopup.openOn(mapInstance.current!)

            if (onBuildingClick) {
              onBuildingClick(building.id)
            }
          } else {
            // На десктопе - двухуровневая логика попапов (как в мобильной версии)
            if (lastClickedBuildingRef.current === building.id) {
              // Второй клик на то же здание - показываем БОЛЬШОЙ детальный popup
              marker.closePopup()

              const detailedPopup = L.popup({
                maxWidth: 280,
                className: 'building-detailed-popup-container',
                autoPan: true,
                autoPanPadding: [50, 50]
              })
                .setContent(detailedPopupContent)
                .setLatLng(marker.getLatLng())

              detailedPopup.openOn(mapInstance.current!)

              // НЕ вызываем onBuildingClick при втором клике в десктопе
              // Это предотвращает вызов openBuildingPopup из MapClient, который переоткрывает маленький попап

              // Сбрасываем последний кликнутый ID
              lastClickedBuildingRef.current = null
            } else {
              // Первый клик - показываем МАЛЕНЬКИЙ hover popup
              // Закрываем все другие попапы
              mapInstance.current?.closePopup()

              // Открываем маленький hover popup для этого маркера
              marker.openPopup()

              // Запоминаем ID этого здания для следующего клика
              lastClickedBuildingRef.current = building.id

              // НЕ вызываем onBuildingClick при первом клике в десктопе
              // Это предотвращает вызов openBuildingPopup из MapClient
            }
          }
        })

        buildingMarkersRef.current[building.id] = marker
      })

      // Автоматическое определение границ карты только при первой загрузке
      if (buildings.length > 0 && isFirstBuildingsLoad.current) {
        const group = L.featureGroup(Object.values(buildingMarkersRef.current))
        if (mapInstance.current && group.getBounds().isValid()) {
          mapInstance.current.fitBounds(group.getBounds().pad(0.1))
          isFirstBuildingsLoad.current = false // Больше не вызываем fitBounds
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

    // Визуализация местоположения пользователя
    useEffect(() => {
      if (!mapInitialized || !mapInstance.current) return

      // Удаляем предыдущий маркер
      if (locationMarkerRef.current) {
        mapInstance.current.removeLayer(locationMarkerRef.current)
        locationMarkerRef.current = null
      }

      // Добавляем маркер местоположения если есть центр и режим геолокации
      if (radiusCenter && radiusMode === 'location') {
        const locationIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3B82F6;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse-location 2s infinite;
          "></div>
        `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -10]
        })

        locationMarkerRef.current = L.marker([radiusCenter.lat, radiusCenter.lng], {
          icon: locationIcon
        }).addTo(mapInstance.current)

        // Добавляем popup с информацией о местоположении
        locationMarkerRef.current.bindPopup(`
        <div style="text-align: center; padding: 8px;">
          <div style="font-size: 20px; margin-bottom: 4px;">📍</div>
          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">Your Location</div>
          <div style="font-size: 11px; color: #6B7280;">
            Широта: ${radiusCenter.lat.toFixed(6)}<br>
            Долгота: ${radiusCenter.lng.toFixed(6)}
          </div>
        </div>
      `, {
          maxWidth: 200,
          className: 'user-location-popup'
        })
      }
    }, [radiusCenter, radiusMode, mapInitialized])

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
                  <span class="px-2 py-1 rounded text-xs ${route.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
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
                Learn More →
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
              autoPan: true,  // Включаем автоматическое смещение чтобы попап был виден
              autoPanPadding: [50, 50]  // Отступ от краев экрана
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
                Learn More →
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
                  Learn More →
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
          ; (window as any).routeClickHandler = onRouteClick
          ; (window as any).addToRouteHandler = onAddToRoute
          ; (window as any).startRouteFromHandler = onStartRouteFrom
          ; (window as any).buildingDetailsHandler = onBuildingDetails
          ; (window as any).routeDetailsHandler = onRouteDetails
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
                className={`px-3 py-1 text-xs rounded transition-colors ${currentStyle === style
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                title={`${style === 'light' ? 'Light' : style === 'dark' ? 'Dark' : 'Satellite'} map theme`}
              >
                {style === 'light' ? '☀️ Light' :
                  style === 'dark' ? '🌙 Dark' :
                    style === 'satellite' ? '🛰️ Satellite' : style}
              </button>
            ))}
          </div>

          {/* Mobile: вертикально, только иконки, справа */}
          <div className="flex md:hidden flex-col space-y-1">
            {Object.keys(MAP_STYLES).map(style => (
              <button
                key={style}
                onClick={() => setCurrentStyle(style)}
                className={`p-2 text-base rounded transition-colors ${currentStyle === style
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                title={`${style === 'light' ? 'Light' : style === 'dark' ? 'Dark' : 'Satellite'} map theme`}
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
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Legend</h4>

            {showBuildings && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Buildings</h5>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Architectural objects</span>
                </div>
              </div>
            )}

            {showRoutes && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Routes</h5>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Walking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 bg-blue-500 rounded"></div>
                    <span className="text-xs text-gray-600">Cycling</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Car</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-1 bg-purple-500 rounded"></div>
                    <span className="text-xs text-gray-600">Public transp.</span>
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
        
        /* Refined Minimalist Markers */
        .minimal-marker {
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          animation: markerFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes markerFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .minimal-marker:hover {
          transform: translate(-50%, -50%) scale(1.1) !important;
          filter: drop-shadow(0 4px 12px rgba(242, 100, 56, 0.25))
                  drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15)) !important;
        }

        .minimal-marker svg {
          overflow: visible;
        }

        /* Subtle ring pulse for selected/route states */
        .minimal-marker[data-state="selected"] .marker-ring,
        .minimal-marker[data-state="route"] .marker-ring {
          animation: ringPulse 2.5s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% {
            opacity: 0.2;
            r: 20;
          }
          50% {
            opacity: 0.4;
            r: 21;
          }
        }

        /* Core circle hover effect */
        .minimal-marker:hover .marker-core {
          r: 15.5;
          transition: r 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Highlight shimmer on hover */
        .minimal-marker:hover .marker-highlight {
          animation: shimmer 1.2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 0.12;
          }
          50% {
            opacity: 0.22;
          }
        }

        /* Number scale on hover */
        .minimal-marker:hover .marker-number {
          animation: numberPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes numberPop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1.08);
          }
        }

        /* Dot pulse for normal state */
        .minimal-marker[data-state="normal"] .marker-dot {
          animation: dotPulse 2s ease-in-out infinite;
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 0.7;
            r: 2.5;
          }
          50% {
            opacity: 0.95;
            r: 2.8;
          }
        }

        /* Legacy marker styles */
        .building-marker, .route-marker {
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .leaflet-marker-icon {
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .leaflet-marker-icon:hover {
          transform: scale(1.05);
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

        /* Анимация пульсации для маркера местоположения пользователя */
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

        .user-location-marker {
          z-index: 1000 !important;
        }
      `}</style>
      </div>
    )
  }
)

EnhancedMap.displayName = 'EnhancedMap'

export default EnhancedMap

