'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Building2, Navigation, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from 'lucide-react'

interface SimpleInteractiveMapProps {
  buildings: any[]
  selectedBuildingsForRoute?: string[]
  onBuildingSelect?: (building: any) => void
  className?: string
}

export default function SimpleInteractiveMap({ 
  buildings, 
  selectedBuildingsForRoute = [],
  onBuildingSelect,
  className = '' 
}: SimpleInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializingRef = useRef(false)

  // Фильтруем здания с координатами
  const validBuildings = buildings.filter(b => 
    b.building && 
    b.building.latitude && 
    b.building.longitude &&
    !isNaN(parseFloat(b.building.latitude)) &&
    !isNaN(parseFloat(b.building.longitude))
  )

  // Полная очистка карты
  const cleanupMap = () => {
    try {
      // Очищаем маркеры
      markersRef.current.forEach(marker => {
        try {
          if (marker && typeof marker.remove === 'function') {
            marker.remove()
          }
        } catch (e) {
          // ignore
        }
      })
      markersRef.current = []

      // Удаляем карту
      if (mapInstanceRef.current) {
        try {
          if (typeof mapInstanceRef.current.remove === 'function') {
            mapInstanceRef.current.remove()
          }
        } catch (e) {
          // ignore
        }
        mapInstanceRef.current = null
      }

      // Полная очистка DOM контейнера
      if (mapRef.current) {
        mapRef.current.innerHTML = ''
        // Удаляем все Leaflet-специфичные данные
        delete (mapRef.current as any)._leaflet_id
        mapRef.current.removeAttribute('data-leaflet-id')
        // Очищаем все классы
        mapRef.current.className = mapRef.current.className
          .split(' ')
          .filter(cls => !cls.startsWith('leaflet'))
          .join(' ')
      }

      setIsLoaded(false)
      initializingRef.current = false
    } catch (error) {
      console.log('Cleanup error (ignored):', error)
    }
  }

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      cleanupMap()
    }
  }, [])

  // Инициализация карты
  useEffect(() => {
    if (validBuildings.length === 0 || !isVisible || initializingRef.current || mapInstanceRef.current) {
      return
    }

    const initMap = async () => {
      if (initializingRef.current) return
      initializingRef.current = true

      try {
        setError(null)
        
        // Дополнительная проверка - может карта уже существует
        if (mapInstanceRef.current) {
          initializingRef.current = false
          return
        }

        // Проверяем доступность контейнера
        if (!mapRef.current) {
          initializingRef.current = false
          return
        }

        // Загружаем Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
          
          await new Promise(resolve => {
            link.onload = resolve
            setTimeout(resolve, 1000) // fallback
          })
        }

        // Загружаем Leaflet JS
        if (!(window as any).L) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
        }

        const L = (window as any).L
        
        // Финальная проверка контейнера
        if (!mapRef.current) {
          initializingRef.current = false
          return
        }

        // Агрессивная очистка контейнера
        const container = mapRef.current
        container.innerHTML = ''
        delete (container as any)._leaflet_id
        container.removeAttribute('data-leaflet-id')

        // Вычисляем центр
        if (validBuildings.length === 0) {
          initializingRef.current = false
          return
        }

        const centerLat = validBuildings.reduce((sum, b) => sum + parseFloat(b.building.latitude), 0) / validBuildings.length
        const centerLng = validBuildings.reduce((sum, b) => sum + parseFloat(b.building.longitude), 0) / validBuildings.length

        // Создаем карту
        const map = L.map(container, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: false
        })

        // Тайлы
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19
        }).addTo(map)

        mapInstanceRef.current = map
        setIsLoaded(true)
        
        // Добавляем маркеры через небольшую задержку
        setTimeout(() => {
          if (mapInstanceRef.current) {
            addMarkers()
          }
        }, 300)

      } catch (err) {
        console.error('Map initialization error:', err)
        setError('Ошибка загрузки карты')
      } finally {
        initializingRef.current = false
      }
    }

    initMap()
  }, [validBuildings.length, isVisible])

  // Обновление маркеров
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current && !initializingRef.current) {
      addMarkers()
    }
  }, [selectedBuildingsForRoute, isLoaded])

  const addMarkers = () => {
    if (!mapInstanceRef.current || initializingRef.current) return

    const L = (window as any).L
    if (!L) return

    try {
      // Очищаем старые маркеры
      markersRef.current.forEach(marker => {
        try {
          if (marker && typeof marker.remove === 'function') {
            marker.remove()
          }
        } catch (e) {
          // ignore
        }
      })
      markersRef.current = []

      const newMarkers: any[] = []

      // Добавляем новые маркеры
      validBuildings.forEach((buildingData, index) => {
        try {
          const building = buildingData.building
          const lat = parseFloat(building.latitude)
          const lng = parseFloat(building.longitude)
          
          if (isNaN(lat) || isNaN(lng)) return

          const isInRoute = selectedBuildingsForRoute.includes(building.id)
          
          // Создаем маркер
          const marker = L.marker([lat, lng], { 
            icon: L.divIcon({
              html: `<div style="
                background: ${isInRoute ? '#16a34a' : '#3b82f6'}; 
                color: white; 
                border-radius: 50%; 
                width: 24px; 
                height: 24px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 11px; 
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">${index + 1}</div>`,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          })

          if (mapInstanceRef.current) {
            marker.addTo(mapInstanceRef.current)
            newMarkers.push(marker)
          }

          // Popup
          const popupContent = `
            <div style="padding: 6px; max-width: 180px;">
              <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">${building.name}</h4>
              <div style="font-size: 11px; color: #666;">
                📍 ${building.city}
                ${building.year_built ? `<br>📅 ${building.year_built}` : ''}
                ${building.architect ? `<br>👨‍💼 ${building.architect}` : ''}
              </div>
              ${isInRoute ? '<div style="margin-top: 4px; color: #16a34a; font-weight: bold; font-size: 11px;">✓ В маршруте</div>' : ''}
            </div>
          `

          marker.bindPopup(popupContent, { maxWidth: 200 })

          // Клик по маркеру
          marker.on('click', () => {
            if (onBuildingSelect) {
              onBuildingSelect(building)
            }
          })
        } catch (error) {
          console.log('Error adding marker (ignored):', error)
        }
      })

      markersRef.current = newMarkers

      // Подгоняем карту под маркеры с проверкой валидности
      if (newMarkers.length > 0 && mapInstanceRef.current) {
        try {
          if (newMarkers.length === 1) {
            // Один маркер - просто центрируем
            const building = validBuildings[0].building
            mapInstanceRef.current.setView([parseFloat(building.latitude), parseFloat(building.longitude)], 15)
          } else {
            // Несколько маркеров - создаем bounds
            const group = new L.featureGroup(newMarkers)
            const bounds = group.getBounds()
            
            // Проверяем валидность bounds
            if (bounds && bounds.isValid && bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] })
            }
          }
        } catch (boundsError) {
          console.log('Bounds error (ignored):', boundsError)
          // Fallback - просто устанавливаем центр на первое здание
          if (validBuildings.length > 0) {
            const building = validBuildings[0].building
            mapInstanceRef.current.setView([parseFloat(building.latitude), parseFloat(building.longitude)], 13)
          }
        }
      }

    } catch (error) {
      console.log('Error in addMarkers (ignored):', error)
    }
  }

  const handleZoom = (direction: 'in' | 'out') => {
    if (mapInstanceRef.current) {
      try {
        const currentZoom = mapInstanceRef.current.getZoom()
        mapInstanceRef.current.setZoom(currentZoom + (direction === 'in' ? 1 : -1))
      } catch (e) {
        console.log('Zoom error (ignored):', e)
      }
    }
  }

  const handleFitToBuildings = () => {
    if (mapInstanceRef.current && markersRef.current.length > 0) {
      try {
        const L = (window as any).L
        const group = new L.featureGroup(markersRef.current)
        const bounds = group.getBounds()
        
        if (bounds && bounds.isValid && bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch (e) {
        console.log('Fit bounds error (ignored):', e)
      }
    }
  }

  if (validBuildings.length === 0) {
    return null
  }

  if (error) {
    return (
      <div className={`bg-red-50 rounded-lg p-6 text-center ${className}`}>
        <MapPin className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 font-medium">{error}</p>
        <button 
          onClick={() => {
            setError(null)
            cleanupMap()
            setIsLoaded(false)
          }}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
      {/* Заголовок карты */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Карта зданий из статьи</h3>
              <p className="text-sm text-gray-600">
                {validBuildings.length} {validBuildings.length === 1 ? 'здание' : validBuildings.length < 5 ? 'здания' : 'зданий'} • 
                {selectedBuildingsForRoute.length > 0 && ` ${selectedBuildingsForRoute.length} в маршруте`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isLoaded && (
              <>
                <button
                  onClick={() => handleZoom('in')}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Увеличить"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600" />
                </button>
                
                <button
                  onClick={() => handleZoom('out')}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Уменьшить"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600" />
                </button>
                
                <button
                  onClick={handleFitToBuildings}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Показать все здания"
                >
                  <Navigation className="w-4 h-4 text-gray-600" />
                </button>
              </>
            )}
            
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title={isVisible ? "Скрыть карту" : "Показать карту"}
            >
              {isVisible ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Карта */}
      {isVisible && (
        <div 
          ref={mapRef} 
          className="h-80 bg-gray-200 relative"
        >
          {(!isLoaded || initializingRef.current) && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Загрузка карты...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Легенда */}
      {isVisible && isLoaded && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full border border-white"></div>
                <span className="text-gray-600">Здания из статьи</span>
              </div>
              {selectedBuildingsForRoute.length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-600 rounded-full border border-white"></div>
                  <span className="text-gray-600">В маршруте ({selectedBuildingsForRoute.length})</span>
                </div>
              )}
            </div>
            <div className="text-gray-500">
              💡 Кликните по зданию в тексте, чтобы добавить в маршрут
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
