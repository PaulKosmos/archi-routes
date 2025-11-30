// src/app/routes/[id]/RouteMap.tsx - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЕ ВСПЛЫВАЮЩИЕ ОКНА
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-polylinedecorator'
import { Route, RouteGeometry, TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'

// Расширяем типы Leaflet для декораторов
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
  route: Route
  currentPointIndex?: number
  showNavigation?: boolean
  userLocation?: {
    latitude: number
    longitude: number
    accuracy: number
  } | null
}

export default function RouteMap({ route, currentPointIndex = -1, showNavigation = false, userLocation = null }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.Polyline | null>(null)
  const decoratorLayer = useRef<any>(null)
  const userLocationMarker = useRef<L.CircleMarker | null>(null)
  const userAccuracyCircle = useRef<L.Circle | null>(null)
  
  // 🔧 УПРОЩЕННОЕ УПРАВЛЕНИЕ ПОПАПАМИ
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  const popupTimers = useRef<Map<number, NodeJS.Timeout>>(new Map())

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

    console.log('🗺️ Initializing route map with real roads...')

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
      // Очищаем все таймеры
      popupTimers.current.forEach(timer => clearTimeout(timer))
      popupTimers.current.clear()
      
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

    // Очищаем предыдущие слои и состояние
    markersLayer.current.clearLayers()
    markersRef.current.clear()
    popupTimers.current.forEach(timer => clearTimeout(timer))
    popupTimers.current.clear()
    
    if (routeLayer.current) {
      mapInstance.current.removeLayer(routeLayer.current)
    }
    if (decoratorLayer.current) {
      mapInstance.current.removeLayer(decoratorLayer.current)
    }

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
      
      // 🔧 ИСПРАВЛЕННОЕ СОДЕРЖИМОЕ ПОПАПА
      const popupContent = `
        <div class="route-popup-content" style="min-width: 250px; max-width: 300px;">
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
                <div style="margin-top: 8px;">
                  <a 
                    href="/buildings/${point.buildings.id}"
                    style="display: inline-block; margin-right: 8px; background: #10B981; color: white; padding: 4px 8px; border: none; border-radius: 4px; font-size: 11px; text-decoration: none;"
                  >
                    Подробнее →
                  </a>
                </div>
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
          
          ${userLocation && index > 0 ? `
            <div style="margin: 8px 0; text-align: center;">
              <button 
                onclick="if(window.startFromThisPoint) window.startFromThisPoint(${index})"
                style="background: #3B82F6; color: white; padding: 6px 12px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;"
                onmouseover="this.style.background='#2563EB'"
                onmouseout="this.style.background='#3B82F6'"
              >
                🚀 Начать с этой точки
              </button>
            </div>
          ` : ''}
        </div>
      `
      
      marker.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'route-point-popup',
        closeButton: true,
        autoClose: false,
        closeOnClick: false
      })
      
      // 🔧 ИСПРАВЛЕННЫЕ ОБРАБОТЧИКИ СОБЫТИЙ МАРКЕРОВ
      marker.on('mouseover', () => {
        console.log('🖱️ Mouse ENTER на точку', index, point.title)
        
        // Очищаем все таймеры для этой точки
        const timer = popupTimers.current.get(index)
        if (timer) {
          clearTimeout(timer)
          popupTimers.current.delete(index)
        }
        
        // Открываем попап с небольшой задержкой
        const openTimer = setTimeout(() => {
          if (!marker.getPopup()?.isOpen()) {
            marker.openPopup()
          }
        }, 150)
        
        popupTimers.current.set(index, openTimer)
      })

      marker.on('mouseout', () => {
        console.log('🖱️ Mouse LEAVE точки', index, point.title)
        
        // 🔧 ИСПРАВЛЕНО: Закрываем ВСЕ точки, включая первую
        const closeTimer = setTimeout(() => {
          if (marker.getPopup()?.isOpen()) {
            marker.closePopup()
          }
        }, 300)
        
        popupTimers.current.set(index, closeTimer)
      })
      
      // 🔧 ИСПРАВЛЕННЫЕ ОБРАБОТЧИКИ ПОПАПОВ
      marker.on('popupopen', () => {
        console.log('📋 Попап открыт для точки', index)
        
        // Небольшая задержка для рендера DOM
        setTimeout(() => {
          const popupElement = marker.getPopup()?.getElement()
          if (popupElement) {
            
            // Функция для обработки наведения на попап
            const handlePopupMouseEnter = () => {
              console.log('🖱️ Mouse ENTER на попап точки', index)
              // Очищаем таймер закрытия
              const timer = popupTimers.current.get(index)
              if (timer) {
                clearTimeout(timer)
                popupTimers.current.delete(index)
              }
            }
            
            // Функция для обработки ухода с попапа
            const handlePopupMouseLeave = () => {
              console.log('🖱️ Mouse LEAVE попапа точки', index)
              
              // 🔧 ИСПРАВЛЕНО: Закрываем все попапы
              const closeTimer = setTimeout(() => {
                marker.closePopup()
              }, 200)
              
              popupTimers.current.set(index, closeTimer)
            }
            
            // Добавляем обработчики к попапу
            popupElement.addEventListener('mouseenter', handlePopupMouseEnter)
            popupElement.addEventListener('mouseleave', handlePopupMouseLeave)
            
            // Убираем обработчики при закрытии попапа
            marker.once('popupclose', () => {
              popupElement.removeEventListener('mouseenter', handlePopupMouseEnter)
              popupElement.removeEventListener('mouseleave', handlePopupMouseLeave)
            })
          }
        }, 100)
      })
      
      // Автоматически открываем попап для активной точки
      if (isActive && index > 0) {
        setTimeout(() => marker.openPopup(), 100)
      }
      
      // Сохраняем маркер и добавляем на карту
      markersRef.current.set(index, marker)
      markersLayer.current?.addLayer(marker)
    })

    // Отображаем маршрут
    let routeCoordinates: [number, number][] = []

    if (route.route_geometry && route.route_geometry.coordinates && route.route_geometry.coordinates.length > 0) {
      console.log('✅ Using real route geometry with', route.route_geometry.coordinates.length, 'points')
      routeCoordinates = route.route_geometry.coordinates.map(coord => [coord[1], coord[0]])
      
      routeLayer.current = L.polyline(routeCoordinates, {
        color: getRouteColor(route.transport_mode),
        weight: getRouteWeight(route.transport_mode),
        opacity: 0.8,
        smoothFactor: 1,
        className: `route-line route-${route.transport_mode}`
      }).addTo(mapInstance.current)

    } else {
      console.log('⚠️ No route geometry, falling back to straight lines')
      routeCoordinates = validPoints
        .filter(point => point.latitude !== null && point.longitude !== null)
        .map(point => [point.latitude!, point.longitude!])
      
      if (routeCoordinates.length > 1) {
        routeLayer.current = L.polyline(routeCoordinates, {
          color: getRouteColor(route.transport_mode),
          weight: getRouteWeight(route.transport_mode),
          opacity: 0.6,
          smoothFactor: 1,
          dashArray: '10, 5',
          className: `route-line route-${route.transport_mode} route-fallback`
        }).addTo(mapInstance.current)
      }
    }

    // Добавляем стрелки направления
    if (routeLayer.current && routeCoordinates.length > 1) {
      try {
        if (typeof (L as any).polylineDecorator === 'function') {
          decoratorLayer.current = (L as any).polylineDecorator(routeLayer.current, {
            patterns: [
              {
                offset: '15%',
                repeat: route.route_geometry ? '5%' : '25%',
                symbol: (L as any).Symbol.arrowHead({
                  pixelSize: getArrowSize(route.transport_mode),
                  headAngle: 45,
                  pathOptions: {
                    fillOpacity: 0.8,
                    weight: 0,
                    color: getRouteColor(route.transport_mode)
                  }
                })
              }
            ]
          }).addTo(mapInstance.current)
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

  }, [route, currentPointIndex, userLocation])

  // Отображение местоположения пользователя - СТАБИЛЬНОЕ ОБНОВЛЕНИЕ
  useEffect(() => {
    if (!mapInstance.current) return

    if (userLocation) {
      console.log('📍 Обновляем местоположение пользователя:', userLocation)
      
      // Обновляем существующие маркеры вместо пересоздания
      if (userLocationMarker.current && userAccuracyCircle.current) {
        // Просто обновляем позицию
        userLocationMarker.current.setLatLng([userLocation.latitude, userLocation.longitude])
        userAccuracyCircle.current.setLatLng([userLocation.latitude, userLocation.longitude])
        userAccuracyCircle.current.setRadius(userLocation.accuracy)
      } else {
        // Создаем новые маркеры только если их нет
        userAccuracyCircle.current = L.circle(
          [userLocation.latitude, userLocation.longitude],
          {
            radius: userLocation.accuracy,
            fillColor: '#3B82F6',
            fillOpacity: 0.1,
            color: '#3B82F6',
            weight: 1,
            opacity: 0.3
          }
        ).addTo(mapInstance.current)
        
        userLocationMarker.current = L.circleMarker(
          [userLocation.latitude, userLocation.longitude],
          {
            radius: 8,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            color: '#FFFFFF',
            weight: 3,
            opacity: 1
          }
        ).addTo(mapInstance.current)
        
        userLocationMarker.current.bindPopup(`
          <div style="text-align: center; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #3B82F6;">📍 Ваше местоположение</h4>
            <p style="margin: 4px 0; font-size: 12px; color: #6B7280;">
              Широта: ${userLocation.latitude.toFixed(6)}<br>
              Долгота: ${userLocation.longitude.toFixed(6)}
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #6B7280;">
              Точность: ±${Math.round(userLocation.accuracy)} метров
            </p>
            <div style="margin-top: 8px; padding: 6px; background: #EFF6FF; border-radius: 4px; font-size: 11px; color: #1D4ED8;">
              🧭 GPS активен
            </div>
          </div>
        `, {
          closeButton: true,
          autoClose: false,
          className: 'user-location-popup'
        })
      }
    } else {
      // Убираем маркеры если нет местоположения
      if (userLocationMarker.current) {
        mapInstance.current.removeLayer(userLocationMarker.current)
        userLocationMarker.current = null
      }
      if (userAccuracyCircle.current) {
        mapInstance.current.removeLayer(userAccuracyCircle.current)
        userAccuracyCircle.current = null
      }
    }
  }, [userLocation])

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

  // Глобальная функция "Начать с этой точки"
  useEffect(() => {
    (window as any).startFromThisPoint = (pointIndex: number) => {
      console.log('🚀 Начинаем навигацию с точки:', pointIndex)
      
      if (!userLocation) {
        alert('Сначала включите GPS-навигацию')
        return
      }
      
      if (!route.route_points || pointIndex >= route.route_points.length) {
        alert('Некорректная точка маршрута')
        return
      }
      
      if (typeof (window as any).setCurrentStepFromMap === 'function') {
        (window as any).setCurrentStepFromMap(pointIndex)
      }
    }

    return () => {
      delete (window as any).startFromThisPoint
    }
  }, [route, userLocation])

  // Функции для стилизации маршрута
  const getRouteColor = (transportMode?: string) => {
    switch (transportMode) {
      case 'walking': return '#10B981'
      case 'cycling': return '#3B82F6'
      case 'driving': return '#EF4444'
      case 'public_transport': return '#8B5CF6'
      default: return '#6B7280'
    }
  }

  const getRouteWeight = (transportMode?: string) => {
    switch (transportMode) {
      case 'walking': return 4
      case 'cycling': return 5
      case 'driving': return 6
      case 'public_transport': return 5
      default: return 4
    }
  }

  const getArrowSize = (transportMode?: string) => {
    switch (transportMode) {
      case 'walking': return 8
      case 'cycling': return 10
      case 'driving': return 12
      case 'public_transport': return 10
      default: return 8
    }
  }

  return (
    <div className="relative">
      {/* Информационная панель */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-sm font-medium text-gray-900 flex items-center">
          <span className="mr-2">{TransportModeHelper.getIcon(route.transport_mode || 'walking')}</span>
          Маршрут: {route.route_points?.length || 0} точек
        </div>
        
        {route.route_summary && (
          <div className="text-xs text-gray-600 mt-1 space-y-1">
            <div>📏 {formatDistance(route.route_summary.distance)}</div>
            <div>⏱️ {formatDuration(route.route_summary.duration)}</div>
          </div>
        )}
        
        {currentPointIndex >= 0 && route.route_points?.[currentPointIndex] && (
          <div className="text-xs text-blue-600 mt-1 pt-1 border-t">
            Точка {currentPointIndex + 1}: {route.route_points[currentPointIndex].title}
          </div>
        )}
        
        {userLocation && (
          <div className="text-xs text-green-600 mt-1 pt-1 border-t">
            📍 GPS: ±{Math.round(userLocation.accuracy)}м
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
          {userLocation && (
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white mr-2 animate-pulse"></div>
              <span>Ваше местоположение</span>
            </div>
          )}
          <div className="flex items-center pt-1 border-t">
            <div 
              className="w-4 h-1 mr-2"
              style={{ backgroundColor: getRouteColor(route.transport_mode) }}
            ></div>
            <span>
              {route.route_geometry ? 'Реальные дороги' : 'Прямые линии'}
            </span>
          </div>
          {!route.route_geometry && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
              ⚠️ Маршрут не построен. Показаны прямые линии между точками.
            </div>
          )}
        </div>
      </div>

      {/* Индикатор типа транспорта */}
      {showNavigation && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-md border px-3 py-2">
          <div className="flex items-center text-sm">
            <span className="text-xl mr-2">{TransportModeHelper.getIcon(route.transport_mode || 'walking')}</span>
            <span className="font-medium">{TransportModeHelper.getLabel(route.transport_mode || 'walking')}</span>
          </div>
        </div>
      )}

      {/* Контейнер карты */}
      <div 
        ref={mapRef} 
        className="w-full h-[600px] rounded-lg"
        style={{ minHeight: '600px' }}
      />

      {/* Кастомные стили для попапов и маршрутов */}
      <style jsx global>{`
        /* 🔧 КРИТИЧНО: Максимальные z-index для попапов */
        .leaflet-popup-pane {
          z-index: 99999 !important;
        }
        
        .leaflet-popup {
          z-index: 100000 !important;
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content-wrapper {
          z-index: 100001 !important;
          pointer-events: auto !important;
        }
        
        .route-point-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #E5E7EB;
          z-index: 100002 !important;
          pointer-events: auto !important;
        }
        
        .route-point-popup .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        
        .route-point-popup .leaflet-popup-tip {
          border-top-color: #E5E7EB;
          z-index: 100003 !important;
        }
        
        .user-location-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          border: 2px solid #3B82F6;
          box-shadow: 0 10px 25px -3px rgba(59, 130, 246, 0.3);
          z-index: 100002 !important;
        }
        
        /* Основные слои карты - низкие z-index */
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
        
        .leaflet-shadow-pane {
          z-index: 2 !important;
        }
        
        .custom-route-marker {
          background: transparent !important;
          border: none !important;
          z-index: 4 !important;
        }
        
        /* Стили для разных типов маршрутов */
        .route-walking {
          stroke-dasharray: none;
        }
        .route-cycling {
          stroke-dasharray: none;
          filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.3));
        }
        .route-driving {
          stroke-dasharray: none;
          filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.3));
        }
        .route-public_transport {
          stroke-dasharray: 8 4;
        }
        .route-fallback {
          stroke-dasharray: 10 5 !important;
          opacity: 0.6 !important;
        }
        
        .leaflet-container {
          cursor: default;
        }
        
        /* Дополнительные стили для лучшей работы hover */
        .leaflet-marker-icon {
          cursor: pointer;
        }
        
        .route-popup-content button {
          transition: all 0.2s ease;
        }
        
        .route-popup-content button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  )
}