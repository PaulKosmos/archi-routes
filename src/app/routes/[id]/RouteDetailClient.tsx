// src/app/routes/[id]/RouteDetailClient.tsx - С GPS-навигацией и экспортом
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useEditPermissions } from '../../../hooks/useEditPermissions'
import { 
  Edit, MapPin, Clock, Users, Star, ArrowLeft, Play, Heart, Trash2, MoreVertical, 
  Route as RouteIcon, AlertCircle, Navigation, Download, Share2, Map, Smartphone,
  ExternalLink, Copy, CheckCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import DeleteContentModal from '../../../components/DeleteContentModal'
import RouteFavoriteButton, { RouteCompletedButton } from '../../../components/RouteFavoriteButton'
import { Route, TransportModeHelper, formatDistance, formatDuration } from '../../../types/route'

// Динамический импорт обновленной карты
const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
    <span className="text-gray-500">Загрузка карты...</span>
  </div>
})

interface RouteDetailClientProps {
  route: Route
}

interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
}

// 🔧 ФУНКЦИЯ РАСЧЕТА РАССТОЯНИЯ
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // радиус Земли в метрах
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

export default function RouteDetailClient({ route }: RouteDetailClientProps) {
  const [user, setUser] = useState<any>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  
  // GPS-навигация
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string>('')
  const [watchId, setWatchId] = useState<number | null>(null)
  const [showNavigationPanel, setShowNavigationPanel] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  
  // Состояния для экспорта
  const [exportStatus, setExportStatus] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Проверяем авторизацию
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkAuth()
  }, [route.id])

  // Используем хук для проверки прав
  const permissions = useEditPermissions('route', route.id, user?.id || null)
  const canEdit = permissions.canEdit
  const userRole = permissions.userRole
  const checkingPermissions = permissions.isLoading

  const canDelete = canEdit && (
    userRole === 'admin' || 
    userRole === 'moderator' || 
    route.created_by === user?.id
  )

  // Получаем данные о транспорте
  const transportMode = route.transport_mode || 'walking'
  const transportIcon = TransportModeHelper.getIcon(transportMode)
  const transportLabel = TransportModeHelper.getLabel(transportMode)
  const transportDescription = TransportModeHelper.getDescription(transportMode)

  // Проверяем есть ли реальная геометрия маршрута
  const hasRealRoute = !!(route.route_geometry && route.route_geometry.coordinates && route.route_geometry.coordinates.length > 0)

  // 🔧 ИСПРАВЛЕННАЯ СТАБИЛЬНАЯ GPS-НАВИГАЦИЯ
  const startLocationTracking = () => {
    console.log('🔍 Запуск стабильной GPS-навигации...')
    
    if (!navigator.geolocation) {
      setLocationError('❌ Геолокация не поддерживается вашим браузером')
      return
    }

    setIsTrackingLocation(true)
    setLocationError('')
    setShowNavigationPanel(true)

    // ПЕРВОНАЧАЛЬНОЕ получение позиции
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Начальная GPS позиция получена:', position.coords)
        
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }

        setUserLocation(location)
        
        // МЕДЛЕННОЕ обновление - раз в 2 минуты
        const updateInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (newPosition) => {
              const newLocation: UserLocation = {
                latitude: newPosition.coords.latitude,
                longitude: newPosition.coords.longitude,
                accuracy: newPosition.coords.accuracy
              }
              
              // Получаем текущее местоположение для сравнения
              setUserLocation(currentLocation => {
                if (currentLocation) {
                  // Обновляем ТОЛЬКО если изменение больше 10 метров
                  const distance = calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    newLocation.latitude, newLocation.longitude
                  )
                  
                  if (distance > 10) {
                    console.log('📍 GPS обновление (движение >10м):', newLocation, 'расстояние:', Math.round(distance), 'м')
                    return newLocation
                  } else {
                    console.log('📍 GPS: движение незначительное (<10м), не обновляем')
                    return currentLocation
                  }
                } else {
                  console.log('📍 GPS: устанавливаем начальное местоположение')
                  return newLocation
                }
              })
            },
            (error) => console.log('GPS update error:', error.message),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        }, 120000) // Обновляем раз в 2 минуты
        
        // Сохраняем ID интервала для очистки
        setWatchId(updateInterval as any)
      },
      (error) => {
        console.log('🔍 GPS диагностика:', {
          code: error.code,
          message: error.message
        })
        
        let errorMessage = ''
        switch (error.code) {
          case 1:
            errorMessage = '🔒 Доступ к GPS запрещен. В адресной строке нажмите на замок → "Разрешить местоположение"'
            break
          case 2:
            errorMessage = '📡 GPS недоступен. Проверьте подключение к интернету и включите GPS'
            break
          case 3:
            errorMessage = '⏱️ Время ожидания GPS истекло. Попробуйте еще раз'
            break
          default:
            errorMessage = `❌ Ошибка GPS (код ${error.code}): ${error.message || 'Неизвестная ошибка'}`
        }
        
        setLocationError(errorMessage)
        setIsTrackingLocation(false)
        setShowNavigationPanel(false)
      },
      {
        enableHighAccuracy: false, // Не используем высокую точность для экономии батареи
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  const stopLocationTracking = () => {
    if (watchId !== null) {
      // Очищаем интервал вместо watchPosition
      clearInterval(watchId)
      setWatchId(null)
    }
    setIsTrackingLocation(false)
    setUserLocation(null)
    setShowNavigationPanel(false)
    setLocationError('')
    console.log('⛔ GPS навигация остановлена')
  }

  // 🔧 ОБНОВЛЕННАЯ ФУНКЦИЯ РАСЧЕТА РАССТОЯНИЯ ДО СЛЕДУЮЩЕЙ ТОЧКИ
  const calculateDistanceToNextPoint = () => {
    if (!userLocation || !route.route_points || currentStepIndex >= route.route_points.length) {
      return null
    }

    const nextPoint = route.route_points[currentStepIndex]
    if (!nextPoint.latitude || !nextPoint.longitude) {
      return null
    }

    return calculateDistance(
      userLocation.latitude, 
      userLocation.longitude,
      nextPoint.latitude, 
      nextPoint.longitude
    )
  }

  // Функции экспорта маршрута
  const exportToGoogleMaps = () => {
    if (!route.route_points || route.route_points.length === 0) {
      alert('Нет точек маршрута для экспорта')
      return
    }

    const waypoints = route.route_points
      .map(point => `${point.latitude},${point.longitude}`)
      .join('/')

    const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`
    window.open(googleMapsUrl, '_blank')
    setExportStatus('Открыт в Google Maps')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const exportToAppleMaps = () => {
    if (!route.route_points || route.route_points.length === 0) {
      alert('Нет точек маршрута для экспорта')
      return
    }

    // Для Apple Maps используем наиболее совместимый формат
    const firstPoint = route.route_points[0]
    const lastPoint = route.route_points[route.route_points.length - 1]
    
    // Создаем URL для маршрута с началом и концом
    let appleMapsUrl = `http://maps.apple.com/?saddr=${firstPoint.latitude},${firstPoint.longitude}&daddr=${lastPoint.latitude},${lastPoint.longitude}`
    
    // Добавляем промежуточные точки как отдельные параметры
    if (route.route_points.length > 2) {
      const waypoints = route.route_points.slice(1, -1)
        .map(point => `${point.latitude},${point.longitude}`)
        .join('|')
      
      if (waypoints) {
        appleMapsUrl += `&waypoints=${waypoints}`
      }
    }
    
    // Добавляем тип направлений
    appleMapsUrl += `&dirflg=${route.transport_mode === 'driving' ? 'd' : 'w'}`
    
    console.log('🍎 Apple Maps URL:', appleMapsUrl)
    
    // Альтернативный способ - открываем каждую точку отдельно
    if (route.route_points.length > 2) {
      const confirmation = confirm(
        `Apple Maps имеет ограничения по промежуточным точкам. \n\n` +
        `Вариант 1: Открыть только начало и конец маршрута\n` +
        `Вариант 2: Открыть все точки как отдельные маркеры\n\n` +
        `Нажмите OK для варианта 1, Отмена для варианта 2`
      )
      
      if (!confirmation) {
        // Открываем все точки как отдельные маркеры
        const allPointsUrl = route.route_points
          .map((point, index) => {
            return `http://maps.apple.com/?q=${encodeURIComponent(point.title)}&ll=${point.latitude},${point.longitude}&z=16`
          })
        
        // Открываем первые 3 точки (ограничение браузера)
        allPointsUrl.slice(0, 3).forEach((url, index) => {
          setTimeout(() => {
            window.open(url, `_blank_${index}`)
          }, index * 500) // Задержка между открытиями
        })
        
        if (allPointsUrl.length > 3) {
          alert(`Открыты первые 3 точки из ${route.route_points.length}. Остальные точки можно найти в приложении.`)
        }
        
        setExportStatus(`Открыто ${Math.min(3, route.route_points.length)} точек в Apple Maps`)
        setTimeout(() => setExportStatus(''), 3000)
        return
      }
    }
    
    window.open(appleMapsUrl, '_blank')
    setExportStatus('Открыт в Apple Maps (начало и конец)')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const exportToGPX = () => {
    if (!route.route_points || route.route_points.length === 0) {
      alert('Нет точек маршрута для экспорта GPX')
      return
    }

    const gpxContent = generateGPX()
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${route.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus('GPX файл загружен')
    setTimeout(() => setExportStatus(''), 3000)
  }

  const generateGPX = (): string => {
    const waypoints = route.route_points || []
    const routeName = route.title || 'Архитектурный маршрут'
    const routeDescription = route.description || 'Маршрут создан в ArchiRoutes'

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ArchiRoutes" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeName}</name>
    <desc>${routeDescription}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
`

    // Добавляем waypoints (точки маршрута)
    waypoints.forEach((point, index) => {
      gpxContent += `  <wpt lat="${point.latitude}" lon="${point.longitude}">
    <name>${index + 1}. ${point.title}</name>
    <desc>${point.description || ''}</desc>
    <type>waypoint</type>
    <sym>Waypoint</sym>
  </wpt>
`
    })

    // Добавляем трек (если есть геометрия маршрута)
    if (route.route_geometry?.coordinates && route.route_geometry.coordinates.length > 0) {
      gpxContent += `  <trk>
    <name>${routeName}</name>
    <type>${transportMode}</type>
    <trkseg>
`
      
      route.route_geometry.coordinates.forEach(coord => {
        gpxContent += `      <trkpt lat="${coord[1]}" lon="${coord[0]}">
        <time>${new Date().toISOString()}</time>
      </trkpt>
`
      })
      
      gpxContent += `    </trkseg>
  </trk>
`
    }

    gpxContent += `</gpx>`
    return gpxContent
  }

  const shareRoute = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: route.title,
          text: route.description || 'Интересный архитектурный маршрут',
          url: url
        })
        setExportStatus('Маршрут поделен')
      } catch (error) {
        console.log('Sharing cancelled')
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (error) {
        prompt('Скопируйте ссылку:', url)
      }
    }
    setTimeout(() => setExportStatus(''), 3000)
  }

  // Очистка отслеживания при размонтировании
  useEffect(() => {
    // 🔧 ДОБАВЛЯЕМ ГЛОБАЛЬНУЮ ФУНКЦИЮ ДЛЯ КНОПКИ "НАЧАТЬ С ЭТОЙ ТОЧКИ"
    (window as any).setCurrentStepFromMap = (pointIndex: number) => {
      console.log('🎯 Обновляем текущую точку на:', pointIndex)
      setCurrentStepIndex(pointIndex)
    }
    
    return () => {
      if (watchId !== null) {
        clearInterval(watchId) // Очищаем интервал
      }
      // Очищаем глобальную функцию
      delete (window as any).setCurrentStepFromMap
    }
  }, [watchId])

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Навигация */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Назад
          </button>
        </div>

        {/* Заголовок с кнопками действий - ИСПРАВЛЕННАЯ ВЕРСИЯ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          {/* Основная информация */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {route.title}
            </h1>
            
            {/* Метаинформация */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
              <div className="flex items-center">
                <MapPin size={16} className="mr-1" />
                <span>{route.city}, {route.country}</span>
              </div>
              
              <div className="flex items-center">
                <span className="text-lg mr-1">{transportIcon}</span>
                <span>{transportLabel}</span>
              </div>
              
              <div className="flex items-center">
                <Clock size={16} className="mr-1" />
                <span>
                  {route.route_summary 
                    ? formatDuration(route.route_summary.duration)
                    : `${route.estimated_duration_minutes || 'N/A'} минут`
                  }
                </span>
              </div>
              
              <div className="flex items-center">
                <Users size={16} className="mr-1" />
                <span>{route.points_count} точек</span>
              </div>
              
              <div className="flex items-center">
                <RouteIcon size={16} className="mr-1" />
                <span>
                  {route.route_summary 
                    ? formatDistance(route.route_summary.distance)
                    : `${route.distance_km || 'N/A'} км`
                  }
                </span>
              </div>
              
              {route.difficulty_level && (
                <div className="flex items-center">
                  <Star size={16} className="mr-1" />
                  <span className="capitalize">{route.difficulty_level}</span>
                </div>
              )}
            </div>

            {/* Теги */}
            {route.tags && route.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {route.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Описание если есть */}
            {route.description && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 leading-relaxed">
                  {route.description}
                </p>
              </div>
            )}
          </div>

          {/* Кнопки действий - УНИФИЦИРОВАННЫЕ */}
          <div className="flex flex-wrap items-center gap-3">
            {/* GPS-навигация */}
            {!isTrackingLocation ? (
              <button
                onClick={startLocationTracking}
                className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <Navigation size={16} className="mr-2" />
                GPS Навигация
              </button>
            ) : (
              <button
                onClick={stopLocationTracking}
                className="inline-flex items-center px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Navigation size={16} className="mr-2" />
                Остановить GPS
              </button>
            )}

            {/* Экспорт */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={16} className="mr-2" />
                Экспорт
              </button>

              {showExportMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      exportToGoogleMaps()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Map size={16} />
                    <span>Открыть в Google Maps</span>
                    <ExternalLink size={14} className="ml-auto" />
                  </button>
                  
                  <button
                    onClick={() => {
                      // Универсальная функция
                      if (!route.route_points || route.route_points.length === 0) {
                        alert('Нет точек маршрута')
                        return
                      }
                      
                      const waypoints = route.route_points
                        .map(point => `${point.latitude},${point.longitude}`)
                        .join('/')

                      const navigatorUrl = `https://www.google.com/maps/dir/${waypoints}`
                      window.open(navigatorUrl, '_blank')
                      setExportStatus('Открыт универсальный навигатор')
                      setTimeout(() => setExportStatus(''), 3000)
                      
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Navigation size={16} />
                    <span>Открыть в навигаторе</span>
                    <ExternalLink size={14} className="ml-auto" />
                  </button>
                  
                  <button
                    onClick={() => {
                      exportToGPX()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span>Скачать GPX файл</span>
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      shareRoute()
                      setShowExportMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-green-600">Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} />
                        <span>Поделиться маршрутом</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Кнопки управления (если есть права) */}
            {!checkingPermissions && canEdit && (
              <>
                <a
                  href={`/routes/${route.id}/edit`}
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit size={16} className="mr-2" />
                  Редактировать
                </a>

                {canDelete && (
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="inline-flex items-center px-4 py-2.5 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Удалить
                    </button>

                    {showActionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowDeleteModal(true)
                            setShowActionsMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
                        >
                          <Trash2 size={16} />
                          <span>Подтвердить удаление</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Кнопки управления избранным и завершением */}
            <div className="flex items-center gap-3 ml-auto">
              <RouteFavoriteButton 
                routeId={route.id}
                routeTitle={route.title}
                size="md"
              />
              
              <RouteCompletedButton 
                routeId={route.id}
                routeTitle={route.title}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* GPS панель навигации */}
        {showNavigationPanel && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Navigation size={20} className="text-green-600 mr-2" />
                <h3 className="font-semibold text-green-900">GPS Навигация</h3>
              </div>
              <button
                onClick={stopLocationTracking}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>

            {locationError ? (
              <div className="text-red-600 text-sm">{locationError}</div>
            ) : userLocation ? (
              <div className="space-y-2">
                <div className="text-sm text-green-700">
                  📍 <strong>Ваше местоположение:</strong> {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  <span className="ml-2">(точность: {Math.round(userLocation.accuracy)}м)</span>
                </div>
                
                {route.route_points && currentStepIndex < route.route_points.length && (
                  <div className="bg-white rounded p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-900">
                          Следующая точка: {route.route_points[currentStepIndex]?.title}
                        </div>
                        <div className="text-sm text-green-700">
                          {(() => {
                            const distance = calculateDistanceToNextPoint()
                            return distance ? `Расстояние: ${formatDistance(distance)}` : 'Расчет расстояния...'
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {currentStepIndex + 1}/{route.route_points.length}
                        </div>
                        {currentStepIndex < route.route_points.length - 1 && (
                          <button
                            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded mt-1"
                          >
                            Следующая →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-green-700">Получение местоположения...</div>
            )}
          </div>
        )}

        {/* Статус экспорта */}
        {exportStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center text-blue-800">
              <CheckCircle size={16} className="mr-2" />
              {exportStatus}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Основной контент - карта */}
          <div className="xl:col-span-3 space-y-8">
            {/* Карта маршрута - УВЕЛИЧЕННАЯ */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Маршрут на карте</h2>
              <div className="rounded-lg overflow-hidden shadow-md">
                <RouteMap 
                  route={route} 
                  userLocation={userLocation} 
                  currentPointIndex={currentStepIndex}
                  showNavigation={showNavigationPanel}
                />
              </div>
            </div>
          </div>

          {/* Боковая панель - только самое важное */}
          <div className="xl:col-span-1 space-y-6">
            {/* Статистика маршрута */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Статистика</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Рейтинг</span>
                  <div className="flex items-center">
                    <Star size={16} className="text-yellow-400 mr-1" />
                    <span className="font-medium">{route.rating || '—'}/5</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Транспорт</span>
                  <span className="font-medium flex items-center">
                    <span className="mr-1">{transportIcon}</span>
                    {transportLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Качество</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    hasRealRoute 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {hasRealRoute ? 'Точный' : 'Приблизительный'}
                  </span>
                </div>

                {userLocation && (
                  <>
                    <hr className="my-3" />
                    <div className="bg-green-50 rounded-lg p-3">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center">
                        <Navigation size={16} className="mr-1" />
                        GPS Статус
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Местоположение:</span>
                          <span className="text-green-900 font-medium">Активно</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Точность:</span>
                          <span className="text-green-900 font-medium">{Math.round(userLocation.accuracy)}м</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Быстрые действия */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Быстрые действия</h3>
              <div className="space-y-3">
                {!isTrackingLocation ? (
                  <button
                    onClick={startLocationTracking}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Navigation size={16} className="mr-2" />
                    Начать навигацию
                  </button>
                ) : (
                  <button
                    onClick={stopLocationTracking}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Navigation size={16} className="mr-2" />
                    Остановить навигацию
                  </button>
                )}
                
                <button
                  onClick={exportToGoogleMaps}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Map size={16} className="mr-2" />
                  Google Maps
                </button>
                
                <button
                  onClick={shareRoute}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Share2 size={16} className="mr-2" />
                  Поделиться
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🔧 СПИСОК ОБЪЕКТОВ МАРШРУТА ПЕРЕНЕСЕН ВНИЗ И РАСШИРЕН НА ВСЮ ШИРИНУ */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">
            Объекты маршрута ({route.route_points?.length || 0})
          </h2>
              
              <div className="space-y-4">
                {route.route_points?.map((point: any, index: number) => (
                  <div 
                    key={point.id} 
                    className={`border rounded-lg p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                      userLocation && index === currentStepIndex
                        ? 'bg-green-50 border-green-300 ring-2 ring-green-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Номер точки */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                        userLocation && index === currentStepIndex
                          ? 'bg-green-500 text-white ring-2 ring-green-300'
                          : index < currentStepIndex && userLocation
                          ? 'bg-gray-400 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {userLocation && index < currentStepIndex ? '✓' : index + 1}
                      </div>
                      
                      {/* Информация о точке */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-semibold text-lg ${
                            userLocation && index === currentStepIndex 
                              ? 'text-green-900' 
                              : 'text-gray-900'
                          }`}>
                            {point.title}
                            {userLocation && index === currentStepIndex && (
                              <span className="ml-2 text-sm bg-green-500 text-white px-2 py-1 rounded-full animate-pulse">
                                Текущая точка
                              </span>
                            )}
                          </h3>
                          
                          {/* Расстояние от пользователя */}
                          {userLocation && (
                            <div className="text-sm text-blue-600 font-medium">
                              {(() => {
                                const R = 6371000
                                const φ1 = userLocation.latitude * Math.PI / 180
                                const φ2 = point.latitude! * Math.PI / 180
                                const Δφ = (point.latitude! - userLocation.latitude) * Math.PI / 180
                                const Δλ = (point.longitude! - userLocation.longitude) * Math.PI / 180
                                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2)
                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                                const distance = R * c
                                return `📍 ${formatDistance(distance)}`
                              })()} от вас
                            </div>
                          )}
                        </div>
                        
                        {point.description && (
                          <p className="text-gray-600 text-sm mb-3 leading-relaxed">{point.description}</p>
                        )}
                        
                        {/* Информация о здании */}
                        {point.buildings && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                              🏛️ Архитектурная информация
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {point.buildings.architect && (
                                <div>
                                  <span className="text-gray-500">Архитектор:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.architect}</span>
                                </div>
                              )}
                              {point.buildings.year_built && (
                                <div>
                                  <span className="text-gray-500">Год постройки:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.year_built}</span>
                                </div>
                              )}
                              {point.buildings.architectural_style && (
                                <div>
                                  <span className="text-gray-500">Архитектурный стиль:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.architectural_style}</span>
                                </div>
                              )}
                              {point.buildings.building_type && (
                                <div>
                                  <span className="text-gray-500">Тип здания:</span>
                                  <span className="ml-1 font-medium text-gray-800">{point.buildings.building_type}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Инструкции для посещения */}
                        {point.instructions && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center mb-1">
                              <span className="text-blue-800 font-medium text-sm">💡 Рекомендации для посещения:</span>
                            </div>
                            <p className="text-blue-900 text-sm">{point.instructions}</p>
                          </div>
                        )}
                        
                        {/* Метаинформация */}
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              <span>Время осмотра: {point.estimated_time_minutes || 10} мин</span>
                            </div>
                            
                            {point.building_id && (
                              <div className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                <span>Архитектурный объект</span>
                              </div>
                            )}
                          </div>
                          
                          {userLocation && index === currentStepIndex && (
                            <button
                              onClick={() => {
                                if (currentStepIndex < route.route_points!.length - 1) {
                                  setCurrentStepIndex(currentStepIndex + 1)
                                }
                              }}
                              disabled={currentStepIndex >= route.route_points!.length - 1}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {currentStepIndex >= route.route_points!.length - 1 ? 'Финиш!' : 'Следующая точка →'}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Изображение здания */}
                      {point.buildings?.image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={point.buildings.image_url}
                            alt={point.title || undefined}
                            className="w-28 h-28 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => {
                              // Открываем изображение в новой вкладке
                              window.open(point.buildings.image_url, '_blank')
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin size={64} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Объекты маршрута не найдены</h3>
                    <p className="text-sm">Этот маршрут пока не содержит точек для посещения</p>
                  </div>
                )}
              </div>
        </div>
      </div>

      {/* Модальное окно удаления */}
      {canDelete && (
        <DeleteContentModal
          contentType="route"
          contentId={route.id}
          contentTitle={route.title}
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {/* Закрытие меню при клике вне них */}
      {(showActionsMenu || showExportMenu) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowActionsMenu(false)
            setShowExportMenu(false)
          }}
        />
      )}
    </>
  )
}
