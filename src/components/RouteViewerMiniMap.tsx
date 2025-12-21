'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Route, RoutePoint } from '@/types/building'

interface RouteViewerMiniMapProps {
  route: Route
  routePoints: RoutePoint[]
  currentPointIndex: number
  geolocationEnabled: boolean
}

export default function RouteViewerMiniMap({
  route,
  routePoints,
  currentPointIndex,
  geolocationEnabled
}: RouteViewerMiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const userLocationMarkerRef = useRef<L.Marker | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Геолокация
  useEffect(() => {
    if (!geolocationEnabled) {
      setUserLocation(null)
      if (userLocationMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userLocationMarkerRef.current)
        userLocationMarkerRef.current = null
      }
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(newLocation)
      },
      (error) => {
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [geolocationEnabled])

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Небольшая задержка для гарантии что DOM готов
    const timer = setTimeout(() => {
      if (!mapRef.current) return

      try {
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: false,
          preferCanvas: false
        })

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap, © CartoDB'
        }).addTo(map)

        mapInstanceRef.current = map
        routeLayerRef.current = L.layerGroup().addTo(map)
        markersLayerRef.current = L.layerGroup().addTo(map)

        // Установка начального вида
        if (routePoints.length > 0) {
          const bounds = L.latLngBounds(
            routePoints.map(p => [p.latitude, p.longitude] as [number, number])
          )
          map.fitBounds(bounds, { padding: [50, 50] })
        } else {
          // Центр по умолчанию - Берлин
          map.setView([52.52, 13.405], 13)
        }

        // Небольшая задержка перед invalidateSize
        setTimeout(() => {
          map.invalidateSize()
          // Карта готова к использованию
          setIsMapReady(true)
        }, 100)
      } catch (error) {
        console.error('Error initializing mini map:', error)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      setIsMapReady(false)
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.error('Error removing map:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Обновление маршрута и маркеров
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersLayerRef.current || !routeLayerRef.current) return
    if (routePoints.length === 0) return

    try {
      // Очищаем слои
      markersLayerRef.current.clearLayers()
      routeLayerRef.current.clearLayers()

      // Рисуем линию маршрута
      if (route.route_geometry && route.route_geometry.coordinates) {
        const latLngs = route.route_geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        )

        routeLineRef.current = L.polyline(latLngs, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.7
        }).addTo(routeLayerRef.current)
      }

      // Добавляем маркеры точек
      routePoints.forEach((point, index) => {
        const isCurrent = index === currentPointIndex
        const isPassed = index < currentPointIndex

        const icon = L.divIcon({
          className: 'custom-route-point-icon',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: ${isCurrent ? '#3B82F6' : isPassed ? '#10B981' : '#9CA3AF'};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: bold;
              color: white;
            ">
              ${isPassed ? '✓' : index + 1}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })

        const marker = L.marker([point.latitude, point.longitude], { icon })
        marker.bindPopup(`<b>${point.title}</b>`)
        if (markersLayerRef.current) {
          marker.addTo(markersLayerRef.current)
        }
      })

      // Центрируем на текущей точке
      if (routePoints[currentPointIndex]) {
        const current = routePoints[currentPointIndex]
        // Используем setTimeout чтобы избежать проблем с _leaflet_pos
        setTimeout(() => {
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.setView([current.latitude, current.longitude], 15, {
                animate: true,
                duration: 0.5
              })
            } catch (e) {
              console.error('Error setting view:', e)
            }
          }
        }, 50)
      }
    } catch (error) {
      console.error('Error updating mini map:', error)
    }
  }, [route, routePoints, currentPointIndex, isMapReady])

  // Отображение местоположения пользователя
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return

    try {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
      } else {
        const icon = L.divIcon({
          className: 'user-location-icon',
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background: #EF4444;
              border: 4px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })

        userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon })
          .bindPopup('📍 Вы здесь')
          .addTo(mapInstanceRef.current)
      }
    } catch (error) {
      console.error('Error updating user location:', error)
    }
  }, [userLocation])

  return <div ref={mapRef} className="w-full h-full" />
}

