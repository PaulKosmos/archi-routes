// src/components/LocationPicker.tsx (обновленная версия)
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Исправляем проблему с иконками Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, © WorldView'
  }
}

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  onAddressUpdate?: (address: string, city: string, country: string) => void // Новый колбэк для обновления полей
  initialLocation?: { lat: number; lng: number }
}

interface LocationData {
  address: string
  city: string
  country: string
  lat: number
  lng: number
}

export default function LocationPicker({ 
  onLocationSelect, 
  onAddressUpdate,
  initialLocation 
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [currentStyle, setCurrentStyle] = useState('light') // CartoDB Light по умолчанию
  const [currentTileLayer, setCurrentTileLayer] = useState<L.TileLayer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LocationData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Создание кастомной иконки
  const createLocationIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #EF4444;
          border: 3px solid #DC2626;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        ">
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: white;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        </style>
      `,
      className: 'location-picker-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }

  // Поиск мест через Nominatim
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`
      )
      const data = await response.json()
      
      const results: LocationData[] = data.map((item: any) => ({
        address: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village || '',
        country: item.address?.country || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }))
      
      setSearchResults(results)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Обратное геокодирование
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data.address) {
        const address = data.address
        const fullAddress = data.display_name
        const city = address.city || address.town || address.village || ''
        const country = address.country || ''
        
        // Обновляем поля через колбэк
        if (onAddressUpdate) {
          onAddressUpdate(fullAddress, city, country)
        }
        
        return { fullAddress, city, country }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
    return null
  }

  // Обновление местоположения
  const updateLocation = async (lat: number, lng: number, fromSearch = false) => {
    // Обновляем маркер
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else if (mapInstance.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: createLocationIcon(),
        draggable: true
      }).addTo(mapInstance.current)
      
      markerRef.current.on('dragend', (e) => {
        const marker = e.target
        const position = marker.getLatLng()
        updateLocation(position.lat, position.lng)
      })
    }

    // Центрируем карту
    if (mapInstance.current) {
      mapInstance.current.setView([lat, lng], 16)
    }

    // Если выбор из поиска, не делаем обратное геокодирование
    if (!fromSearch) {
      await reverseGeocode(lat, lng)
    }
    
    // Уведомляем родительский компонент
    onLocationSelect(lat, lng)
  }

  // Выбор из результатов поиска
  const selectSearchResult = (result: LocationData) => {
    setSearchQuery(result.address)
    setShowSuggestions(false)
    setSearchResults([])
    
    // Обновляем поля
    if (onAddressUpdate) {
      onAddressUpdate(result.address, result.city, result.country)
    }
    
    updateLocation(result.lat, result.lng, true)
  }

  // Определение текущего местоположения
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          updateLocation(latitude, longitude)
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Не удалось определить ваше местоположение')
        }
      )
    }
  }

  // Поиск с задержкой
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const initialCenter = initialLocation 
      ? [initialLocation.lat, initialLocation.lng] as [number, number]
      : [52.5200, 13.4050] as [number, number]

    mapInstance.current = L.map(mapRef.current, {
      center: initialCenter,
      zoom: initialLocation ? 16 : 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true
    })

    // Добавляем начальный стиль карты
    const initialStyleData = MAP_STYLES[currentStyle as keyof typeof MAP_STYLES]
    const tileLayer = L.tileLayer(initialStyleData.url, {
      attribution: initialStyleData.attribution,
      maxZoom: 19
    }).addTo(mapInstance.current)
    setCurrentTileLayer(tileLayer)

    // Добавляем маркер если есть начальное местоположение
    if (initialLocation) {
      updateLocation(initialLocation.lat, initialLocation.lng)
    }

    // Обработка клика по карте
    mapInstance.current.on('click', (e) => {
      const { lat, lng } = e.latlng
      updateLocation(lat, lng)
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        markerRef.current = null
      }
    }
  }, [])

  // Обновление стиля карты
  useEffect(() => {
    if (!mapInstance.current) return

    if (currentTileLayer) {
      mapInstance.current.removeLayer(currentTileLayer)
    }

    const newStyle = MAP_STYLES[currentStyle as keyof typeof MAP_STYLES]
    const newTileLayer = L.tileLayer(newStyle.url, {
      attribution: newStyle.attribution,
      maxZoom: 19
    }).addTo(mapInstance.current)
    
    setCurrentTileLayer(newTileLayer)
  }, [currentStyle])

  return (
    <div className="space-y-4">
      {/* Поиск адресов */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Поиск по адресу или названию
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value.length === 0) {
                setShowSuggestions(false)
              }
            }}
            placeholder="Технический музей Берлина, Alexanderplatz..."
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Результаты поиска */}
        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900 text-sm">{result.address}</div>
                {result.city && result.country && (
                  <div className="text-xs text-gray-500 mt-1">{result.city}, {result.country}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Кнопки управления */}
      <div className="flex items-center justify-between">
        <button
          onClick={getCurrentLocation}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Моё местоположение
        </button>

        {/* Селектор стилей карты */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Стиль карты:</span>
          <select
            value={currentStyle}
            onChange={(e) => setCurrentStyle(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <option key={key} value={key}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Инструкция */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-blue-800 text-sm">
          <strong>Как выбрать местоположение:</strong><br/>
          • Введите адрес или название в поле поиска<br/>
          • Или кликните на карте в нужном месте<br/>
          • Или перетащите красный маркер<br/>
          • Или используйте кнопку "Моё местоположение"
        </p>
      </div>

      {/* Карта - увеличиваем высоту */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div 
          ref={mapRef} 
          className="w-full h-[500px]" // Увеличено с 400px до 500px
          style={{ minHeight: '500px' }}
        />
      </div>

      {/* Кастомные стили */}
      <style jsx global>{`
        .location-picker-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          cursor: crosshair;
        }
        .leaflet-marker-icon {
          cursor: move;
        }
      `}</style>
    </div>
  )
}