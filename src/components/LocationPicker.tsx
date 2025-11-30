'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Исправляем иконки для Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface LocationPickerProps {
  latitude: number
  longitude: number
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  className?: string
}

export default function LocationPicker({ 
  latitude, 
  longitude, 
  onLocationSelect, 
  className = '' 
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!mapRef.current) return

    // Инициализация карты
    const map = L.map(mapRef.current, {
      center: [latitude || 55.7558, longitude || 37.6176], // По умолчанию Москва
      zoom: 15,
      scrollWheelZoom: true,
      doubleClickZoom: false
    })

    // Добавляем тайлы OpenStreetMap (бесплатные)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map)

    mapInstanceRef.current = map

    // Добавляем маркер если есть координаты
    if (latitude && longitude) {
      const marker = L.marker([latitude, longitude], {
        draggable: true
      }).addTo(map)

      markerRef.current = marker

      // Обработчик перетаскивания маркера
      marker.on('dragend', async () => {
        const position = marker.getLatLng()
        const address = await getAddressFromCoordinates(position.lat, position.lng)
        onLocationSelect(position.lat, position.lng, address)
      })
    }

    // Обработчик клика по карте
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng

      // Удаляем старый маркер
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
      }

      // Добавляем новый маркер
      const marker = L.marker([lat, lng], {
        draggable: true
      }).addTo(map)

      markerRef.current = marker

      // Обработчик перетаскивания нового маркера
      marker.on('dragend', async () => {
        const position = marker.getLatLng()
        const address = await getAddressFromCoordinates(position.lat, position.lng)
        onLocationSelect(position.lat, position.lng, address)
      })

      // Получаем адрес и вызываем callback
      const address = await getAddressFromCoordinates(lat, lng)
      onLocationSelect(lat, lng, address)
    })

    setIsLoading(false)

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Обновляем позицию маркера при изменении координат извне
  useEffect(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      const map = mapInstanceRef.current

      // Центрируем карту на новых координатах
      map.setView([latitude, longitude], map.getZoom())

      // Обновляем или создаем маркер
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude])
      } else {
        const marker = L.marker([latitude, longitude], {
          draggable: true
        }).addTo(map)

        markerRef.current = marker

        marker.on('dragend', async () => {
          const position = marker.getLatLng()
          const address = await getAddressFromCoordinates(position.lat, position.lng)
          onLocationSelect(position.lat, position.lng, address)
        })
      }
    }
  }, [latitude, longitude, onLocationSelect])

  // Функция для получения адреса по координатам (геокодирование)
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      // Используем бесплатный Nominatim API для геокодирования
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ru`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data && data.display_name) {
          return data.display_name
        }
      }
    } catch (error) {
      console.error('Ошибка геокодирования:', error)
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-gray-600">Загрузка карты...</div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="w-full h-80 rounded-lg border border-gray-300"
        style={{ minHeight: '320px' }}
      />
      
      <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow-md text-sm text-gray-600 z-[1000]">
        💡 Кликните на карту или перетащите маркер для выбора местоположения
      </div>
    </div>
  )
}