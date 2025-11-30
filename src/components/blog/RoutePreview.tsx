'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Route, 
  MapPin, 
  Clock, 
  Navigation, 
  Building2,
  ArrowRight,
  Download,
  Share2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X
} from 'lucide-react'

interface RoutePreviewProps {
  route: any
  onClose?: () => void
  className?: string
}

export default function RoutePreview({ 
  route, 
  onClose, 
  className = '' 
}: RoutePreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [markers, setMarkers] = useState<any[]>([])
  const [routeLine, setRouteLine] = useState<any>(null)
  const mapInstanceRef = useRef<any>(null) // Для отслеживания экземпляра карты

  useEffect(() => {
    if (route && route.buildings.length > 0 && !mapInstanceRef.current) {
      loadRouteMap()
    }
  }, [route])

  // Очистка карты при закрытии
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        } catch (error) {
          console.log('Route map cleanup error:', error)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (map && route) {
      updateRouteDisplay()
    }
  }, [map, route, currentStep])

  // Автопроигрывание маршрута
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && currentStep < route.buildings.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= route.buildings.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 3000) // Каждые 3 секунды
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentStep, route])

  const loadRouteMap = async () => {
    try {
      // Проверяем, не создана ли уже карта
      if (mapInstanceRef.current || !mapRef.current) return

      // Добавляем CSS для Leaflet
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      const L = (window as any).L || await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
        script.crossOrigin = ''
        script.onload = () => resolve((window as any).L)
        script.onerror = reject
        document.head.appendChild(script)
      })

      // Очищаем контейнер перед созданием карты
      if (mapRef.current) {
        mapRef.current.innerHTML = ''
      }

      // Создаем карту
      const mapInstance = L.map(mapRef.current).setView([52.520, 13.405], 13)

      // Добавляем тайлы
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstance)

      mapInstanceRef.current = mapInstance
      setMap(mapInstance)

    } catch (error) {
      console.error('Failed to load route map:', error)
    }
  }

  const updateRouteDisplay = () => {
    if (!map || !route || typeof window === 'undefined') return

    const L = (window as any).L
    if (!L) return

    // Удаляем существующие маркеры и линии
    markers.forEach(marker => {
      try {
        marker.remove()
      } catch (error) {
        console.log('Marker removal error:', error)
      }
    })
    if (routeLine) {
      try {
        routeLine.remove()
      } catch (error) {
        console.log('Route line removal error:', error)
      }
    }

    // Создаем маркеры для каждого здания в маршруте
    const newMarkers = route.buildings.map((buildingData: any, index: number) => {
      const building = buildingData.building
      const isCurrent = index === currentStep
      const isPassed = index < currentStep
      const isFuture = index > currentStep

      // Создаем кастомную иконку в зависимости от статуса
      const iconHtml = `
        <div class="relative">
          <div class="w-10 h-10 ${
            isCurrent ? 'bg-red-500 animate-pulse' : 
            isPassed ? 'bg-green-500' : 
            'bg-blue-500'
          } rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-3 border-white">
            ${index + 1}
          </div>
          ${isCurrent ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-ping"></div>' : ''}
        </div>
      `

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'route-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      })

      const marker = L.marker([
        parseFloat(building.latitude),
        parseFloat(building.longitude)
      ], { icon: customIcon }).addTo(map)

      // Создаем popup с информацией о здании
      const popupContent = `
        <div class="p-3 max-w-xs">
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 ${
              isCurrent ? 'bg-red-500' : 
              isPassed ? 'bg-green-500' : 
              'bg-blue-500'
            } text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              ${index + 1}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-gray-900 text-sm mb-1">${building.name}</h4>
              <div class="text-xs text-gray-600 space-y-1">
                <div class="flex items-center">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                  <span>${building.city}</span>
                </div>
                ${building.architect ? `
                  <div><strong>Архитектор:</strong> ${building.architect}</div>
                ` : ''}
                ${building.year_built ? `
                  <div><strong>Год:</strong> ${building.year_built}</div>
                ` : ''}
                ${building.architectural_style ? `
                  <div class="text-blue-600 font-medium">${building.architectural_style}</div>
                ` : ''}
              </div>
              <div class="mt-2 text-xs ${
                isCurrent ? 'text-red-600 font-medium' : 
                isPassed ? 'text-green-600' : 
                'text-gray-500'
              }">
                ${isCurrent ? '📍 Текущая остановка' : 
                  isPassed ? '✅ Посещено' : 
                  '⏳ Следующее'}
              </div>
            </div>
          </div>
          ${building.image_url ? `
            <img src="${building.image_url}" alt="${building.name}" class="w-full h-20 object-cover rounded mt-2" />
          ` : ''}
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'route-popup'
      })

      // Показываем popup для текущего здания
      if (isCurrent) {
        marker.openPopup()
      }

      return marker
    })

    setMarkers(newMarkers)

    // Создаем линию маршрута
    const routeCoords = route.buildings.map((buildingData: any) => [
      parseFloat(buildingData.building.latitude),
      parseFloat(buildingData.building.longitude)
    ])

    const routePolyline = L.polyline(routeCoords, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 5'
    }).addTo(map)

    setRouteLine(routePolyline)

    // Подгоняем масштаб карты под маршрут
    try {
      const group = L.featureGroup([...newMarkers, routePolyline].filter(Boolean))
      if (group.getLayers().length > 0) {
        const bounds = group.getBounds()
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds.pad(0.1))
        }
      }
    } catch (error) {
      console.error('Error fitting route bounds:', error)
      // Fallback - центрируем на первом здании
      if (route.buildings.length > 0) {
        const building = route.buildings[0].building
        map.setView([
          parseFloat(building.latitude),
          parseFloat(building.longitude)
        ], 13)
      }
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
    setIsPlaying(false)
  }

  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(route.buildings.length - 1, prev + 1))
    setIsPlaying(false)
  }

  const handlePlayPause = () => {
    if (currentStep >= route.buildings.length - 1) {
      setCurrentStep(0)
    }
    setIsPlaying(!isPlaying)
  }

  const getCurrentBuilding = () => {
    return route.buildings[currentStep]?.building
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`
  }

  if (!route) return null

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{route.title}</h2>
              <p className="text-green-100 text-sm mt-1">{route.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Метрики маршрута */}
          <div className="flex items-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-1">
              <Building2 className="w-4 h-4" />
              <span>{route.buildings.length} зданий</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{route.totalDistance} км</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(route.estimatedTime)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Navigation className="w-4 h-4" />
              <span>Шаг {currentStep + 1} из {route.buildings.length}</span>
            </div>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Карта */}
          <div className="flex-1 relative">
            <div ref={mapRef} className="w-full h-full" />
            
            {/* Управление воспроизведением */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={handleNextStep}
                  disabled={currentStep === route.buildings.length - 1}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Боковая панель с информацией */}
          <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            {/* Текущее здание */}
            <div className="p-4 bg-white border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Текущая остановка</h3>
              {getCurrentBuilding() && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-600">{getCurrentBuilding().name}</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{getCurrentBuilding().city}</span>
                    </div>
                    {getCurrentBuilding().architect && (
                      <div><strong>Архитектор:</strong> {getCurrentBuilding().architect}</div>
                    )}
                    {getCurrentBuilding().year_built && (
                      <div><strong>Год постройки:</strong> {getCurrentBuilding().year_built}</div>
                    )}
                    {getCurrentBuilding().architectural_style && (
                      <div><strong>Стиль:</strong> {getCurrentBuilding().architectural_style}</div>
                    )}
                  </div>
                  {getCurrentBuilding().description && (
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                      {getCurrentBuilding().description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Весь маршрут */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Полный маршрут</h3>
              <div className="space-y-3">
                {route.buildings.map((buildingData: any, index: number) => {
                  const building = buildingData.building
                  const isCurrent = index === currentStep
                  const isPassed = index < currentStep

                  return (
                    <div
                      key={building.id}
                      onClick={() => setCurrentStep(index)}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isCurrent 
                          ? 'bg-red-50 border-2 border-red-200' 
                          : isPassed
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCurrent 
                          ? 'bg-red-500 text-white' 
                          : isPassed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {building.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {building.city}
                          {building.year_built && ` • ${building.year_built}`}
                        </div>
                      </div>
                      {index < route.buildings.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Нижняя панель с действиями */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>💡 Используйте кнопки воспроизведения для автоматического просмотра</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => alert('Экспорт маршрута в разработке')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Экспорт</span>
              </button>
              
              <button
                onClick={() => alert('Поделиться маршрутом в разработке')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Поделиться</span>
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Стили для анимации маркеров */}
      <style jsx global>{`
        .route-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .route-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        
        .route-popup .leaflet-popup-content {
          margin: 0;
        }
      `}</style>
    </div>
  )
}
