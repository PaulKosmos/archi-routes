// src/app/routes/[id]/RouteMap.tsx
'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Импортируем библиотеку стрелок
import 'leaflet-polylinedecorator'

// Расширяем типы Leaflet
declare global {
  namespace L {
    function polylineDecorator(
      line: L.Polyline,
      options: {
        patterns: Array<{
          offset: string
          repeat: string
          symbol: any
        }>
      }
    ): any

    namespace Symbol {
      function arrowHead(options: {
        pixelSize: number
        headAngle: number
        pathOptions: {
          fillOpacity: number
          weight: number
          color: string
        }
      }): any
    }
  }
}

// Исправляем проблему с иконками Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface RouteMapProps {
  route: any
  currentPointIndex?: number
}

export default function RouteMap({ route, currentPointIndex = -1 }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.Polyline | null>(null)
  const decoratorLayer = useRef<any>(null)

  // Создание кастомных иконок для точек маршрута
  const createNumberedIcon = (number: number, isActive: boolean = false, hasBuilding: boolean = false) => {
    const bgColor = isActive ? '#3B82F6' : (hasBuilding ? '#10B981' : '#6B7280')
    const textColor = 'white'
    const borderColor = isActive ? '#1D4ED8' : (hasBuilding ? '#059669' : '#374151')
    
    return L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: ${bgColor};
          border: 3px solid ${borderColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          color: ${textColor};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transform: ${isActive ? 'scale(1.2)' : 'scale(1)'};
          transition: all 0.3s ease;
        ">
          ${number}
        </div>
      `,
      className: 'custom-route-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
  }

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    console.log('🗺️ Initializing route map with decorators...')

    // Создаем карту
    mapInstance.current = L.map(mapRef.current, {
      center: [52.5200, 13.4050], // Berlin по умолчанию
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true
    })

    // Добавляем тайлы карты
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CartoDB',
      maxZoom: 19
    }).addTo(mapInstance.current)

    // Создаем слои для маркеров и маршрута
    markersLayer.current = L.layerGroup().addTo(mapInstance.current)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Обновление маркеров и маршрута
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current || !route.route_points?.length) {
      console.log('⚠️ No route points to display')
      return
    }

    console.log('🔄 Updating route map with', route.route_points.length, 'points')

    // Очищаем предыдущие слои
    markersLayer.current.clearLayers()
    if (routeLayer.current) {
      mapInstance.current.removeLayer(routeLayer.current)
    }
    if (decoratorLayer.current) {
      mapInstance.current.removeLayer(decoratorLayer.current)
    }

    // Создаем координаты для линии маршрута
    const routeCoordinates: [number, number][] = []
    const validPoints = route.route_points.filter((point: any) => 
      point.latitude && point.longitude
    )

    if (validPoints.length === 0) {
      console.log('⚠️ No valid coordinates found')
      return
    }

    // Добавляем маркеры для каждой точки
    validPoints.forEach((point: any, index: number) => {
      const isActive = index === currentPointIndex
      const hasBuilding = !!point.buildings
      
      const marker = L.marker(
        [point.latitude, point.longitude],
        { 
          icon: createNumberedIcon(index + 1, isActive, hasBuilding),
          zIndexOffset: isActive ? 1000 : 0
        }
      )
      
      // Создаем попап с информацией о точке
      const popupContent = `
        <div style="min-width: 250px; max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${isActive ? '#3B82F6' : '#1F2937'};">
            ${index + 1}. ${point.title}
          </h3>
          
          ${point.description ? `
            <p style="margin: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.4;">
              ${point.description}
            </p>
          ` : ''}
          
          ${point.buildings ? `
            <div style="margin: 12px 0; padding: 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #065F46;">
                🏛️ ${point.buildings.name}
              </h4>
              <p style="margin: 2px 0; font-size: 12px; color: #047857;">
                ${point.buildings.architect || 'Архитектор неизвестен'} • ${point.buildings.year_built || 'Год неизвестен'}
              </p>
              ${point.buildings.architectural_style ? `
                <p style="margin: 2px 0; font-size: 12px; color: #047857;">
                  Стиль: ${point.buildings.architectural_style}
                </p>
              ` : ''}
              <button 
                onclick="window.location.href='/buildings/${point.buildings.id}'"
                style="margin-top: 6px; background: #10B981; color: white; padding: 4px 8px; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;"
              >
                Подробнее о здании →
              </button>
            </div>
          ` : ''}
          
          ${point.audio_url ? `
            <div style="margin: 8px 0; padding: 6px 8px; background: #EFF6FF; border-radius: 4px; font-size: 12px; color: #1D4ED8;">
              🎵 Доступен аудиогид
            </div>
          ` : ''}
          
          ${point.instructions ? `
            <div style="margin: 8px 0; padding: 8px; background: #FEF3C7; border-radius: 4px; border-left: 3px solid #F59E0B;">
              <strong style="font-size: 12px; color: #92400E;">Инструкции:</strong>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400E;">${point.instructions}</p>
            </div>
          ` : ''}
          
          ${isActive ? `
            <div style="margin: 8px 0; padding: 6px 8px; background: #DBEAFE; border-radius: 4px; font-size: 12px; color: #1D4ED8; font-weight: 600; text-align: center;">
              📍 Текущая точка маршрута
            </div>
          ` : ''}
        </div>
      `
      
      marker.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'route-point-popup',
        closeButton: true,
        autoClose: false
      })
      
      // Автоматически открываем попап для активной точки
      if (isActive) {
        marker.openPopup()
      }
      
      // Добавляем обработчик клика
      marker.on('click', () => {
        console.log('🖱️ Clicked on route point:', point.title)
      })
      
      markersLayer.current?.addLayer(marker)
      routeCoordinates.push([point.latitude, point.longitude])
    })

    // Создаем линию маршрута
    if (routeCoordinates.length > 1) {
      routeLayer.current = L.polyline(routeCoordinates, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(mapInstance.current)

      // Добавляем стрелки направления
      try {
        if (typeof (L as any).polylineDecorator === 'function') {
          decoratorLayer.current = (L as any).polylineDecorator(routeLayer.current, {
            patterns: [
              {
                offset: '15%',
                repeat: '25%',
                symbol: (L as any).Symbol.arrowHead({
                  pixelSize: 10,
                  headAngle: 45,
                  pathOptions: {
                    fillOpacity: 0.8,
                    weight: 0,
                    color: '#3B82F6'
                  }
                })
              }
            ]
          }).addTo(mapInstance.current)
          
          console.log('✅ Route decorators added successfully')
        } else {
          console.log('⚠️ Polyline decorator not available')
        }
      } catch (error) {
        console.log('⚠️ Error adding decorators:', error)
      }
    }

    // Подгоняем карту под маршрут
    if (routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates)
      mapInstance.current.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 16
      })
    }

  }, [route, currentPointIndex])

  // Центрируем карту на активной точке при смене
  useEffect(() => {
    if (!mapInstance.current || currentPointIndex === -1 || !route.route_points?.[currentPointIndex]) return

    const activePoint = route.route_points[currentPointIndex]
    if (activePoint.latitude && activePoint.longitude) {
      console.log('🎯 Centering map on active point:', activePoint.title)
      mapInstance.current.setView([activePoint.latitude, activePoint.longitude], 17, {
        animate: true,
        duration: 1
      })
    }
  }, [currentPointIndex, route])

  return (
    <div className="relative">
      {/* Информационная панель */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900">
          Маршрут: {route.route_points?.length || 0} точек
        </div>
        {currentPointIndex >= 0 && route.route_points?.[currentPointIndex] && (
          <div className="text-xs text-blue-600 mt-1">
            Точка {currentPointIndex + 1}: {route.route_points[currentPointIndex].title}
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md border p-3">
        <div className="text-sm font-medium text-gray-900 mb-2">Легенда</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <div className="w-5 h-5 rounded-full bg-gray-500 border-2 border-gray-700 mr-2 flex items-center justify-center text-white text-[10px] font-bold">1</div>
            <span>Точка маршрута</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-700 mr-2 flex items-center justify-center text-white text-[10px] font-bold">2</div>
            <span>С архитектурным объектом</span>
          </div>
          {currentPointIndex >= 0 && (
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-blue-800 mr-2 flex items-center justify-center text-white text-[10px] font-bold transform scale-110">3</div>
              <span>Текущая точка</span>
            </div>
          )}
          <div className="flex items-center pt-1 border-t">
            <div className="w-4 h-1 bg-blue-500 mr-2"></div>
            <span>Линия с направлением</span>
          </div>
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
        .route-point-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #E5E7EB;
        }
        .route-point-popup .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        .route-point-popup .leaflet-popup-tip {
          border-top-color: #E5E7EB;
        }
        .custom-route-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          cursor: default;
        }
        .leaflet-popup {
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  )
}