// components/LeafletMapCreator.tsx - ИСПРАВЛЕННАЯ версия с рабочими кнопками
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Building, RoutePoint } from '../types/building'

// Исправляем проблему с иконками Leaflet только на клиенте
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

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

  // 🔧 ИСПРАВЛЕНИЕ: Создаем стабильные callback функции
  const addBuildingCallback = useCallback((building: Building) => {
    console.log('🏛️ Building callback triggered:', building.name)
    onAddBuildingPoint(building)
  }, [onAddBuildingPoint])

  const addCustomCallback = useCallback((lat: number, lng: number) => {
    console.log('🎯 Custom point callback triggered:', lat, lng)
    onAddCustomPoint(lat, lng)
  }, [onAddCustomPoint])

  // Проверяем, добавлено ли здание в маршрут
  const isBuildingInRoute = useCallback((buildingId: string) => {
    return routePoints.some(point => point.building_id === buildingId)
  }, [routePoints])

  // 1. Инициализация карты (только один раз)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    console.log('🗺️ Initializing map...')

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true
    }).setView([52.5200, 13.4050], 13)

    // Принудительно устанавливаем z-index для контейнера карты
    if (mapRef.current) {
      mapRef.current.style.zIndex = '1'
    }

    // Добавляем тайлы
    const initialStyle = MAP_STYLES[currentStyle as keyof typeof MAP_STYLES]
    L.tileLayer(initialStyle.url, {
      attribution: initialStyle.attribution,
      maxZoom: 19
    }).addTo(map)

    // Создаем слои
    const buildingsLayer = L.layerGroup().addTo(map)
    const routeLayerGroup = L.layerGroup().addTo(map)

    // Сохраняем ссылки
    mapInstance.current = map
    markersLayer.current = buildingsLayer
    routeMarkersLayer.current = routeLayerGroup

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

  // 2. Обработчик клика карты
  useEffect(() => {
    if (!mapInstance.current) return

    console.log('🖱️ Updating click handler, isAddingPoint:', isAddingPoint)

    // Удаляем старые обработчики
    mapInstance.current.off('click')

    if (isAddingPoint) {
      mapInstance.current.on('click', (e: L.LeafletMouseEvent) => {
        console.log('🎯 Map clicked in adding mode:', e.latlng)
        
        // Проверяем, что клик не по маркеру
        const target = e.originalEvent.target as HTMLElement
        const isMarkerClick = target.closest('.building-marker') || target.closest('.route-point-marker')
        
        if (!isMarkerClick) {
          console.log('🎯 Adding custom point at:', e.latlng)
          addCustomCallback(e.latlng.lat, e.latlng.lng)
        }
      })
    }
  }, [isAddingPoint, addCustomCallback])

  // 3. 🔧 ИСПРАВЛЕННОЕ создание маркеров зданий
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

      const isInRoute = isBuildingInRoute(building.id.toString())
      
      const marker = L.marker([building.latitude, building.longitude], {
        icon: L.divIcon({
          className: 'building-marker',
          html: `<div class="w-6 h-6 ${isInRoute ? 'bg-green-500' : 'bg-blue-500'} rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-200">
                   <div class="w-2 h-2 bg-white rounded-full"></div>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      })

      // 🔧 ИСПРАВЛЕННЫЙ попап с React-функциями вместо глобальных
      const createPopupContent = (building: Building, isInRoute: boolean) => {
        const popupDiv = document.createElement('div')
        popupDiv.className = 'building-popup-content'
        popupDiv.style.minWidth = '280px'
        popupDiv.style.maxWidth = '320px'
        popupDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

        popupDiv.innerHTML = `
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
          
          <div style="margin-bottom: 12px;">
            <p style="margin: 4px 0; font-size: 14px;">
              <strong style="color: #374151;">Архитектор:</strong> 
              <span style="color: #6B7280;">${building.architect || 'Неизвестен'}</span>
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong style="color: #374151;">Год постройки:</strong> 
              <span style="color: #6B7280;">${building.year_built || 'Неизвестен'}</span>
            </p>
            ${building.architectural_style ? `
              <p style="margin: 4px 0; font-size: 14px;">
                <strong style="color: #374151;">Стиль:</strong> 
                <span style="color: #6B7280;">${building.architectural_style}</span>
              </p>
            ` : ''}
          </div>
          
          ${building.description ? `
            <p style="margin: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.4;">
              ${building.description.length > 120 ? building.description.substring(0, 120) + '...' : building.description}
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
          
          <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
            <div id="action-buttons-container" style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%;"></div>
          </div>
        `

        // 🔧 ИСПРАВЛЕНИЕ: Добавляем кнопки программно с React event handlers
        const buttonContainer = popupDiv.querySelector('#action-buttons-container')
        
        if (!isInRoute) {
          const addButton = document.createElement('button')
          addButton.innerHTML = '➕ Добавить в маршрут'
          addButton.style.cssText = `
            background: #059669; 
            color: white; 
            padding: 8px 16px; 
            border: none; 
            border-radius: 6px; 
            font-size: 14px; 
            cursor: pointer; 
            transition: background-color 0.2s; 
            flex: 1; 
            min-width: 120px;
          `
          
          // 🔧 ИСПРАВЛЕНИЕ: Прямой вызов React callback
          addButton.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('🏛️ Add button clicked for:', building.name)
            addBuildingCallback(building)
            marker.closePopup() // Закрываем попап после добавления
          })
          
          addButton.addEventListener('mouseenter', () => {
            addButton.style.backgroundColor = '#047857'
          })
          
          addButton.addEventListener('mouseleave', () => {
            addButton.style.backgroundColor = '#059669'
          })
          
          buttonContainer?.appendChild(addButton)
        } else {
          const inRouteDiv = document.createElement('div')
          inRouteDiv.innerHTML = '✅ Уже в маршруте'
          inRouteDiv.style.cssText = `
            background: #D1FAE5; 
            color: #065F46; 
            padding: 8px 16px; 
            border-radius: 6px; 
            font-size: 14px; 
            flex: 1; 
            text-align: center; 
            border: 1px solid #A7F3D0;
          `
          buttonContainer?.appendChild(inRouteDiv)
        }

        const detailsButton = document.createElement('button')
        detailsButton.innerHTML = '📖 Подробнее'
        detailsButton.style.cssText = `
          background: #3B82F6; 
          color: white; 
          padding: 8px 16px; 
          border: none; 
          border-radius: 6px; 
          font-size: 14px; 
          cursor: pointer; 
          transition: background-color 0.2s; 
          flex: 1; 
          min-width: 100px;
        `
        
        detailsButton.addEventListener('click', () => {
          window.location.href = `/buildings/${building.id}`
        })
        
        detailsButton.addEventListener('mouseenter', () => {
          detailsButton.style.backgroundColor = '#2563EB'
        })
        
        detailsButton.addEventListener('mouseleave', () => {
          detailsButton.style.backgroundColor = '#3B82F6'
        })
        
        buttonContainer?.appendChild(detailsButton)

        return popupDiv
      }
      
      const popupContent = createPopupContent(building, isInRoute)
      
      marker.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'building-popup-enhanced',
        closeButton: true,
        autoClose: false,
        autoPan: true
      })

      // 🔧 УЛУЧШЕННЫЕ hover события
      let hoverTimeout: NodeJS.Timeout | null = null
      let isPopupOpen = false

      marker.on('mouseover', () => {
        console.log('🖱️ Mouse over building:', building.name)
        hoverTimeout = setTimeout(() => {
          if (!isPopupOpen && mapInstance.current) {
            marker.openPopup()
            isPopupOpen = true
          }
        }, 150)
      })

      marker.on('mouseout', () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
          hoverTimeout = null
        }
        // Быстрое закрытие при уходе курсора
        setTimeout(() => {
          const popupElement = marker.getPopup()?.getElement()
          const isHoveringPopup = popupElement?.matches(':hover')
          
          if (marker.getPopup()?.isOpen() && !isHoveringPopup) {
            marker.closePopup()
            isPopupOpen = false
          }
        }, 100)
      })

      marker.on('popupopen', () => {
        isPopupOpen = true
      })

      marker.on('popupclose', () => {
        isPopupOpen = false
      })

      // 🔧 ИСПРАВЛЕННЫЙ обработчик клика для добавления
      marker.on('click', (e) => {
        if (isAddingPoint && !isInRoute) {
          L.DomEvent.stopPropagation(e)
          console.log('🏛️ Direct click adding building:', building.name)
          addBuildingCallback(building)
        }
      })

      markersLayer.current?.addLayer(marker)
    })

    console.log('✅ Building markers added:', markersLayer.current.getLayers().length)
  }, [mapReady, buildings, isAddingPoint, addBuildingCallback, isBuildingInRoute])

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
          html: `<div class="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform">
                   ${index + 1}
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      })

      // УЛУЧШЕННЫЙ попап для точек маршрута
      const routePointPopup = `
        <div style="min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #059669;">
            ${index + 1}. ${point.title}
          </h4>
          
          ${point.description ? `
            <p style="margin: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.4;">
              ${point.description}
            </p>
          ` : ''}
          
          <div style="margin: 8px 0; padding: 6px 8px; background: #F0FDF4; border-radius: 4px; border-left: 3px solid #22C55E;">
            <div style="font-size: 12px; color: #16A34A; font-weight: 500;">
              ⏱️ Время осмотра: ${point.estimated_time_minutes || point.duration_minutes || 15} мин
            </div>
            <div style="font-size: 12px; color: #16A34A; margin-top: 2px;">
              📍 Точка ${index + 1} из ${routePoints.length}
            </div>
          </div>

          ${point.building_id ? `
            <div style="margin: 8px 0; padding: 6px 8px; background: #EFF6FF; border-radius: 4px; font-size: 12px; color: #1D4ED8;">
              🏛️ Связано с архитектурным объектом
            </div>
          ` : ''}
        </div>
      `

      marker.bindPopup(routePointPopup, {
        maxWidth: 300,
        className: 'route-point-popup-enhanced'
      })

      // Hover события для точек маршрута
      let routeHoverTimeout: NodeJS.Timeout | null = null

      marker.on('mouseover', () => {
        routeHoverTimeout = setTimeout(() => {
          marker.openPopup()
        }, 100)
      })

      marker.on('mouseout', () => {
        if (routeHoverTimeout) {
          clearTimeout(routeHoverTimeout)
        }
        setTimeout(() => {
          if (marker.getPopup()?.isOpen()) {
            marker.closePopup()
          }
        }, 50)
      })

      routeMarkersLayer.current?.addLayer(marker)
    })

    // Рисуем линию маршрута
    if (routePoints.length > 1 && mapInstance.current) {
      const coordinates: L.LatLngTuple[] = routePoints.map(point => [point.latitude, point.longitude])
      routeLayer.current = L.polyline(coordinates, {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 5',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapInstance.current)

      // Попап для линии маршрута
      routeLayer.current.bindPopup(`
        <div style="text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: #059669;">🛤️ Предварительный маршрут</h4>
          <p style="margin: 0; font-size: 12px; color: #6B7280;">
            ${routePoints.length} точек • ~${(coordinates.length * 0.1).toFixed(1)} км
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #9CA3AF;">
            Итоговый маршрут будет построен по реальным дорогам
          </p>
        </div>
      `)

      console.log('🛤️ Route line drawn with', routePoints.length, 'points')
    }
  }, [mapReady, routePoints])

  // 5. Обновление курсора
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

      {/* Улучшенная информационная панель */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md border px-4 py-3">
        <div className="text-sm">
          <div className="font-medium text-gray-900 mb-2">
            🗺️ Создание маршрута
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Здания:</span>
              <span className="font-medium">{buildings.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Точки маршрута:</span>
              <span className="font-medium text-green-600">{routePoints.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">В маршруте зданий:</span>
              <span className="font-medium text-blue-600">
                {routePoints.filter(p => p.building_id).length}
              </span>
            </div>
          </div>
          
          {isAddingPoint && (
            <div className="mt-2 px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700 font-medium text-xs">
              🎯 Режим добавления активен
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
            💡 Наведите курсор на маркеры для подробной информации
          </div>
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

      {/* 🔧 ИСПРАВЛЕННЫЕ стили с правильным z-index */}
      <style jsx global>{`
        .building-popup-enhanced .leaflet-popup-content-wrapper,
        .route-point-popup-enhanced .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #E5E7EB;
        }
        
        .building-popup-enhanced .leaflet-popup-content,
        .route-point-popup-enhanced .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        
        .building-popup-enhanced .leaflet-popup-tip,
        .route-point-popup-enhanced .leaflet-popup-tip {
          border-top-color: #E5E7EB;
        }
        
        .building-marker, .route-point-marker {
          background: transparent !important;
          border: none !important;
        }
        
        /* КРИТИЧНО: Максимальный z-index для попапов */
        .leaflet-popup-pane {
          z-index: 10000 !important;
        }
        
        .leaflet-popup {
          z-index: 10001 !important;
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content-wrapper {
          z-index: 10002 !important;
          pointer-events: auto !important;
        }
        
        .building-popup-enhanced,
        .route-point-popup-enhanced {
          z-index: 10003 !important;
        }
        
        /* Убеждаемся что карта имеет меньший z-index */
        .leaflet-container {
          z-index: 1 !important;
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
        
        /* Анимации для маркеров */
        .building-marker > div,
        .route-point-marker > div {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .building-marker:hover > div,
        .route-point-marker:hover > div {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        /* Улучшения для кнопок в попапах */
        .building-popup-content button {
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        
        .building-popup-content button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  )
}
