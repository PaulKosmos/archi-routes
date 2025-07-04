// components/LeafletMapCreator.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Building, RoutePoint } from '../types/building'

// Исправляем проблему с иконками Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LeafletMapCreatorProps {
  buildings: Building[]
  routePoints: RoutePoint[]
  isAddingPoint: boolean
  onAddBuildingPoint: (building: Building) => void
  onAddCustomPoint: (lat: number, lng: number) => void
}

const MAP_STYLES = {
  light: {
    name: 'CartoDB Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  dark: {
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CartoDB'
  }
}

export default function LeafletMapCreator({ 
  buildings, 
  routePoints, 
  isAddingPoint, 
  onAddBuildingPoint, 
  onAddCustomPoint 
}: LeafletMapCreatorProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routeMarkersLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.Polyline | null>(null)
  const [currentStyle, setCurrentStyle] = useState('light')
  const [mapReady, setMapReady] = useState(false)

  // 1. Инициализация карты (только один раз)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    console.log('🗺️ Initializing map...')

    const map = L.map(mapRef.current).setView([52.5200, 13.4050], 13)

    // Добавляем тайлы
    const initialStyle = MAP_STYLES[currentStyle as keyof typeof MAP_STYLES]
    L.tileLayer(initialStyle.url, {
      attribution: initialStyle.attribution,
      maxZoom: 19
    }).addTo(map)

    // Создаем слои
    const buildingsLayer = L.layerGroup().addTo(map)
    const routeLayer = L.layerGroup().addTo(map)

    // Сохраняем ссылки
    mapInstance.current = map
    markersLayer.current = buildingsLayer
    routeMarkersLayer.current = routeLayer

    // Обновляем размер карты и отмечаем готовность
    setTimeout(() => {
      map.invalidateSize()
      setMapReady(true)
      console.log('✅ Map ready!')
    }, 200)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        markersLayer.current = null
        routeMarkersLayer.current = null
        setMapReady(false)
      }
    }
  }, [])

  // 2. Отдельный useEffect для обработчика клика (зависит от isAddingPoint)
  useEffect(() => {
    if (!mapInstance.current) return

    console.log('🖱️ Updating click handler, isAddingPoint:', isAddingPoint)

    // Удаляем старые обработчики
    mapInstance.current.off('click')

    // Добавляем новый обработчик
    mapInstance.current.on('click', (e: L.LeafletMouseEvent) => {
      console.log('🎯 Map clicked, isAddingPoint:', isAddingPoint)
      if (isAddingPoint) {
        // Проверяем, что клик не по маркеру
        const target = e.originalEvent.target as HTMLElement
        const isMarkerClick = target.closest('.building-marker') || target.closest('.route-point-marker')
        
        if (!isMarkerClick) {
          console.log('🎯 Adding custom point at:', e.latlng)
          onAddCustomPoint(e.latlng.lat, e.latlng.lng)
        }
      }
    })
  }, [isAddingPoint, onAddCustomPoint])

  // 3. Добавление маркеров зданий (после готовности карты)
  useEffect(() => {
    if (!mapReady || !markersLayer.current) {
      console.log('⏳ Map not ready for building markers')
      return
    }

    console.log('🏢 Adding building markers:', buildings.length)

    // Очищаем старые маркеры
    markersLayer.current.clearLayers()

    // Добавляем маркеры зданий
    buildings.forEach((building, index) => {
      console.log(`📍 Creating marker ${index + 1}:`, building.name)

      const marker = L.marker([building.latitude, building.longitude], {
        icon: L.divIcon({
          className: 'building-marker',
          html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors">
                   <div class="w-2 h-2 bg-white rounded-full"></div>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      })

      // Попап
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">
            ${building.name}
          </h4>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Архитектор:</strong> ${building.architect}
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Год:</strong> ${building.year_built}
          </p>
          <div style="margin-top: 8px;">
            <button onclick="window.addBuilding${building.id}()" style="
              padding: 6px 12px; 
              background: #3b82f6; 
              color: white; 
              border: none; 
              border-radius: 4px; 
              cursor: pointer;
              font-size: 12px;
            ">
              Добавить в маршрут
            </button>
          </div>
        </div>
      `, {
        maxWidth: 250
      })

      // Обработчик клика
      marker.on('click', (e) => {
        if (isAddingPoint) {
          L.DomEvent.stopPropagation(e)
          console.log('🏛️ Adding building:', building.name)
          onAddBuildingPoint(building)
        }
      })

      // Глобальная функция для кнопки в попапе
      ;(window as any)[`addBuilding${building.id}`] = () => {
        console.log('🏛️ Adding building from popup:', building.name)
        onAddBuildingPoint(building)
        marker.closePopup()
      }

      markersLayer.current?.addLayer(marker)
    })

    console.log('✅ Building markers added:', markersLayer.current.getLayers().length)
  }, [mapReady, buildings, isAddingPoint, onAddBuildingPoint])

  // 4. Обновление маркеров маршрута
  useEffect(() => {
    if (!mapReady || !routeMarkersLayer.current) return

    console.log('🛤️ Updating route markers:', routePoints.length)

    // Очищаем старые маркеры маршрута
    routeMarkersLayer.current.clearLayers()

    // Удаляем старую линию
    if (routeLayer.current && mapInstance.current) {
      mapInstance.current.removeLayer(routeLayer.current)
      routeLayer.current = null
    }

    // Добавляем маркеры точек маршрута
    routePoints.forEach((point, index) => {
      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: 'route-point-marker',
          html: `<div class="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm">
                   ${index + 1}
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      })

      marker.bindPopup(`
        <div style="padding: 8px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">
            ${point.title}
          </h4>
          ${point.description ? `<p style="margin: 0; font-size: 12px; color: #666;">${point.description}</p>` : ''}
        </div>
      `)

      routeMarkersLayer.current?.addLayer(marker)
    })

    // Рисуем линию маршрута
    if (routePoints.length > 1 && mapInstance.current) {
      const coordinates: L.LatLngTuple[] = routePoints.map(point => [point.latitude, point.longitude])
      routeLayer.current = L.polyline(coordinates, {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(mapInstance.current)

      // НЕ подгоняем карту автоматически - пользователь сам выберет масштаб
      console.log('🛤️ Route line drawn with', routePoints.length, 'points')
    }
  }, [mapReady, routePoints])

  // 5. Обновление курсора при изменении режима
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.style.cursor = isAddingPoint ? 'crosshair' : 'grab'
      console.log('🖱️ Cursor updated:', isAddingPoint ? 'crosshair' : 'grab')
    }
  }, [isAddingPoint])

  // 6. Смена стиля карты
  const handleStyleChange = (newStyle: string) => {
    if (!mapInstance.current) return

    setCurrentStyle(newStyle)
    
    // Находим все тайловые слои и удаляем их
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current?.removeLayer(layer)
      }
    })

    // Добавляем новый стиль
    const style = MAP_STYLES[newStyle as keyof typeof MAP_STYLES]
    L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: 19
    }).addTo(mapInstance.current)
  }

  return (
    <div className="relative w-full h-full">
      {/* Селектор стилей карты */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md border">
        <select
          value={currentStyle}
          onChange={(e) => handleStyleChange(e.target.value)}
          className="px-3 py-2 text-sm border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(MAP_STYLES).map(([key, style]) => (
            <option key={key} value={key}>
              {style.name}
            </option>
          ))}
        </select>
      </div>

      {/* Информационная панель */}
      <div className="absolute top-16 left-4 z-[1000] bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm">
          <div className="font-medium text-gray-900 mb-1">
            Создание маршрута
          </div>
          <div className="text-gray-600">
            Здания: {buildings.length} • Точки: {routePoints.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Карта: {mapReady ? '✅ Готова' : '⏳ Загрузка...'}
          </div>
          {isAddingPoint && (
            <div className="text-green-600 font-medium mt-1">
              🎯 Режим добавления
            </div>
          )}
        </div>
      </div>

      {/* Контейнер карты */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ 
          minHeight: '400px',
          cursor: isAddingPoint ? 'crosshair' : 'grab'
        }}
      />
    </div>
  )
}