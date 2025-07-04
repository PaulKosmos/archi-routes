// src/components/LeafletMap.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Building } from '../types/building'

// Исправляем проблему с иконками Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LeafletMapProps {
  buildings: Building[]
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

export default function LeafletMap({ buildings }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const [currentStyle, setCurrentStyle] = useState('light')
  const [currentTileLayer, setCurrentTileLayer] = useState<L.TileLayer | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const buildingsRef = useRef<Building[]>([])

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

    // Создаем слой для маркеров
    markersLayer.current = L.layerGroup().addTo(mapInstance.current)

    setMapInitialized(true)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setMapInitialized(false)
      }
    }
  }, []) // Убираем зависимости чтобы выполнялось только один раз

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

  // Обновление маркеров зданий (только когда buildings реально изменились)
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current || !mapInitialized) return

    // Проверяем, действительно ли изменились здания
    const buildingsChanged = JSON.stringify(buildingsRef.current) !== JSON.stringify(buildings)
    if (!buildingsChanged) return

    console.log('🏢 Updating building markers:', buildings.length)
    buildingsRef.current = buildings

    // Очищаем предыдущие маркеры
    markersLayer.current.clearLayers()

    let shouldFitBounds = false
    const validCoordinates: [number, number][] = []

    // Добавляем маркеры для каждого здания
    buildings.forEach((building) => {
      if (!building.latitude || !building.longitude) {
        console.warn('⚠️ Building without coordinates:', building.name)
        return
      }

      const marker = L.marker([building.latitude, building.longitude])
      validCoordinates.push([building.latitude, building.longitude])
      
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
            <button 
              onclick="window.location.href='/buildings/${building.id}'"
              style="background: #3B82F6; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; transition: background-color 0.2s;"
              onmouseover="this.style.backgroundColor='#2563EB'"
              onmouseout="this.style.backgroundColor='#3B82F6'"
            >
              Подробнее →
            </button>
          </div>
        </div>
      `
      
      marker.bindPopup(popupContent, {
        maxWidth: 400,
        className: 'building-popup',
        closeButton: true,
        autoClose: false,
        autoPan: false // Отключаем автоматическое панорамирование
      })
      
      // Добавляем всплывающее окно при наведении
      marker.on('mouseover', (e) => {
        console.log('🖱️ Mouse over building:', building.name)
        marker.openPopup()
        
        // Автоматически закрываем через 5 секунд
        setTimeout(() => {
          if (marker.getPopup()?.isOpen()) {
            marker.closePopup()
          }
        }, 5000)
      })

      // Закрываем при уходе мыши с задержкой
      marker.on('mouseout', (e) => {
        setTimeout(() => {
          if (marker.getPopup()?.isOpen()) {
            marker.closePopup()
          }
        }, 1000) // Задержка 1 секунда чтобы можно было навести на попап
      })
      
      // Клик по маркеру - переход на страницу здания
      marker.on('click', (e) => {
        console.log('🖱️ Click on building:', building.name)
        window.location.href = `/buildings/${building.id}`
      })
      
      markersLayer.current?.addLayer(marker)
    })

    // Подгоняем карту под все маркеры только при первой загрузке
    if (validCoordinates.length > 0 && buildingsRef.current.length === buildings.length) {
      // Проверяем, есть ли уже сохраненное положение карты
      const savedView = sessionStorage.getItem('leaflet-map-view')
      if (!savedView) {
        const bounds = L.latLngBounds(validCoordinates)
        mapInstance.current.fitBounds(bounds, { padding: [20, 20] })
        shouldFitBounds = true
      }
    }

    // Сохраняем положение карты при изменении
    if (!shouldFitBounds) {
      const saveMapView = () => {
        if (mapInstance.current) {
          const center = mapInstance.current.getCenter()
          const zoom = mapInstance.current.getZoom()
          sessionStorage.setItem('leaflet-map-view', JSON.stringify({ center, zoom }))
        }
      }

      mapInstance.current.on('moveend', saveMapView)
      mapInstance.current.on('zoomend', saveMapView)
    }

  }, [buildings, mapInitialized])

  return (
    <div className="relative">
      {/* Селектор стилей карты */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md border">
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

      {/* Информационная панель */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900">
          Зданий на карте: {buildings.length}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Наведите курсор на маркер
        </div>
      </div>

      {/* Контейнер карты */}
      <div 
        ref={mapRef} 
        className="w-full h-[500px] rounded-lg"
        style={{ minHeight: '500px' }}
      />

      {/* Кастомные стили для попапов */}
      <style jsx global>{`
        .building-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #E5E7EB;
        }
        .building-popup .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        .building-popup .leaflet-popup-tip {
          border-top-color: #E5E7EB;
        }
        .leaflet-container {
          cursor: default;
        }
        .leaflet-marker-icon {
          cursor: pointer;
        }
        .leaflet-marker-icon:hover {
          filter: brightness(1.1);
          transform: scale(1.1);
          transition: all 0.2s ease;
        }
        .leaflet-popup {
          pointer-events: auto;
          z-index: 1000 !important;
        }
        .leaflet-popup-content-wrapper {
          pointer-events: auto;
        }
        .leaflet-popup-pane {
          z-index: 1000 !important;
        }
        .leaflet-map-pane {
          z-index: 1 !important;
        }
        .building-popup {
          z-index: 1001 !important;
        }
        .building-popup .leaflet-popup-content-wrapper {
          z-index: 1001 !important;
        }
      `}</style>
    </div>
  )
}