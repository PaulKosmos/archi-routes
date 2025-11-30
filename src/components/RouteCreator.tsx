// components/RouteCreator.tsx - Обновленный с автогенерацией маршрутов
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createClient } from '../lib/supabase'
import type { Building, RoutePoint } from '../types/building'
import { X, Plus, MapPin, Clock, Users, Star, Save, Eye, Settings, Route as RouteIcon, Loader, AlertCircle, Zap, Wrench } from 'lucide-react'
import dynamic from 'next/dynamic'
import { buildRoute, optimizeRoute } from '../lib/mapbox-routing-service'
import { TRANSPORT_MODE_OPTIONS, TransportMode, RouteOptions } from '../types/route'

// Функции форматирования
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} км`
  }
  return `${Math.round(meters)} м`
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`
  }
  return `${minutes} мин`
}

const LeafletMapCreator = dynamic(() => import('./LeafletMapCreator'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">
    <span className="text-gray-500">Загрузка карты...</span>
  </div>
})

interface RouteCreatorProps {
  isOpen: boolean
  onClose: () => void
  user: any
  buildings: Building[]
  initialMode?: 'manual' | 'autogenerate'
}

export default function RouteCreator({ isOpen, onClose, user, buildings, initialMode = 'manual' }: RouteCreatorProps) {
  const supabase = useMemo(() => createClient(), [])
  // Режим создания: 'manual' или 'autogenerate'
  const [creationMode, setCreationMode] = useState<'manual' | 'autogenerate'>(initialMode)
  
  // Данные для автогенерации
  const [autogenParams, setAutogenParams] = useState({
    city: 'Berlin',
    route_title: '', // Название маршрута от пользователя
    template_id: '',
    max_points: 8,
    transport_mode: 'walking' as const,
    difficulty: 'easy' as const,
    // Новые расширенные настройки
    radius_km: 3,
    min_rating: 0, // 0 = любой рейтинг
    architectural_styles: [] as string[],
    time_preferences: 'any' as 'morning' | 'afternoon' | 'evening' | 'any',
    max_duration_hours: 3,
    include_parks: true,
    include_restaurants: false,
    season_specific: false
  })
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string>('')
  
  // Основные данные маршрута
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('Berlin')
  const [country, setCountry] = useState('Germany')
  const [difficulty, setDifficulty] = useState('easy')
  const [estimatedDuration, setEstimatedDuration] = useState(60)
  const [routeType, setRouteType] = useState('walking')
  const [tags, setTags] = useState<string[]>([])
  const [routeVisibility, setRouteVisibility] = useState<'private' | 'public'>('private')
  const [requestPublication, setRequestPublication] = useState(false)

  // Новые поля для routing
  const [transportMode, setTransportMode] = useState<TransportMode>('walking')
  const [routeOptions, setRouteOptions] = useState<RouteOptions>({
    avoid_tolls: false,
    avoid_ferries: false,
    prefer_green: false,
    optimized: false
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Состояние построения маршрута
  const [isBuilding, setIsBuilding] = useState(false)
  const [routeDataState, setRouteDataState] = useState<any>(null)
  const [buildError, setBuildError] = useState<string>('')

  // Точки маршрута
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [isAddingPoint, setIsAddingPoint] = useState(false)

  // Состояние
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'mode' | 'info' | 'points' | 'preview'>('mode')

  // Обновляем режим при изменении initialMode
  useEffect(() => {
    setCreationMode(initialMode)
  }, [initialMode])

  // Загружаем выбранные здания из localStorage при открытии
  useEffect(() => {
    if (isOpen) {
      const savedBuildings = localStorage.getItem('selectedBuildingsForRoute')
      if (savedBuildings) {
        try {
          const buildingsData = JSON.parse(savedBuildings)
          console.log('🏢 [DEBUG] Loaded selected buildings:', buildingsData.length)
          
          // Преобразуем здания в точки маршрута
          const points: RoutePoint[] = buildingsData.map((building: Building, index: number) => ({
            id: building.id,
            title: building.name,
            latitude: building.latitude,
            longitude: building.longitude,
            order_index: index + 1,
            building_id: building.id,
            description: building.description || '',
            image_url: building.image_url || '',
            city: building.city,
            country: building.country
          }))
          
          setRoutePoints(points)
          
          // Если есть выбранные здания, пропускаем шаг выбора точек
          if (points.length > 0 && initialMode === 'manual') {
            // Начинаем сразу с шага ввода информации
            setCurrentStep('info')
          } else if (points.length > 0 && initialMode === 'autogenerate') {
            // Для автогенерации сразу открываем настройки
            setCurrentStep('info')
          }
          
          // Очищаем localStorage после загрузки
          localStorage.removeItem('selectedBuildingsForRoute')
        } catch (error) {
          console.error('Error parsing selected buildings:', error)
        }
      }
    }
  }, [isOpen, initialMode])

  // Доступные теги
  const availableTags = [
    'architecture', 'historical', 'modern', 'baroque', 'gothic', 
    'art-nouveau', 'brutalism', 'classical', 'contemporary',
    'walking', 'family-friendly', 'photography', 'educational'
  ]

  // Архитектурные стили для фильтрации
  const architecturalStyles = [
    { value: 'baroque', label: 'Барокко', icon: '🏰' },
    { value: 'gothic', label: 'Готика', icon: '⛪' },
    { value: 'renaissance', label: 'Ренессанс', icon: '🏘️' },
    { value: 'neoclassical', label: 'Неоклассицизм', icon: '🏦' },
    { value: 'art-nouveau', label: 'Модерн', icon: '🎨' },
    { value: 'bauhaus', label: 'Баухаус', icon: '📊' },
    { value: 'contemporary', label: 'Современная', icon: '🏢' },
    { value: 'brutalism', label: 'Брутализм', icon: '🏢' }
  ]

  // Тематические предустановки
  const thematicPresets = [
    {
      id: 'historical',
      name: 'Историческая прогулка',
      icon: '📜',
      description: 'Маршрут по самым древним зданиям города',
      params: {
        architectural_styles: ['baroque', 'gothic', 'renaissance'],
        min_rating: 4.0,
        max_points: 6,
        difficulty: 'easy',
        include_parks: false
      }
    },
    {
      id: 'modern',
      name: 'Современная архитектура',
      icon: '🏢',
      description: 'Инновационные здания и современный дизайн',
      params: {
        architectural_styles: ['contemporary', 'bauhaus', 'brutalism'],
        min_rating: 3.5,
        max_points: 8,
        difficulty: 'medium',
        include_parks: true
      }
    },
    {
      id: 'family',
      name: 'Семейный маршрут',
      icon: '👨‍👩‍👧‍👦',
      description: 'Легкая прогулка с детьми по красивым местам',
      params: {
        max_points: 5,
        max_duration_hours: 2,
        difficulty: 'easy',
        include_parks: true,
        include_restaurants: true,
        min_rating: 4.0
      }
    },
    {
      id: 'photography',
      name: 'Фотографский тур',
      icon: '📷',
      description: 'Лучшие места для архитектурной фотосъемки',
      params: {
        min_rating: 4.5,
        max_points: 10,
        difficulty: 'medium',
        time_preferences: 'morning',
        include_parks: true
      }
    },
    {
      id: 'evening',
      name: 'Вечерняя прогулка',
      icon: '🌆',
      description: 'Красивая подсветка зданий на закате',
      params: {
        max_points: 6,
        time_preferences: 'evening',
        difficulty: 'easy',
        include_restaurants: true,
        radius_km: 2
      }
    }
  ]

  // Загружаем доступные шаблоны автогенерации
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('route_templates')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
        
        if (!error && data) {
          setAvailableTemplates(data)
        }
      } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error)
      }
    }
    
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])
  
  useEffect(() => {
    // Глобальная функция для добавления здания из попапа карты
    (window as any).addBuildingToRoute = (buildingId: string, name: string, lat: number, lng: number) => {
      console.log('Adding building from popup:', { buildingId, name, lat, lng })
      
      const building = {
        id: buildingId,
        name: name,
        latitude: lat,
        longitude: lng,
        architect: '',
        year_built: null
      }
      
      addBuildingPoint(building as any)
    }

    return () => {
      delete (window as any).addBuildingToRoute
    }
  }, [routePoints])

  // Автоматическое построение маршрута при изменении точек или транспорта
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (routePoints.length >= 2) {
        buildRoutePreview()
      } else {
        setRouteDataState(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [routePoints, transportMode, routeOptions])

  // Функция автогенерации маршрута
  const generateRoute = async () => {
    if (!autogenParams.city.trim()) {
      setGenerateError('Укажите город для генерации')
      return
    }

    if (!autogenParams.route_title.trim()) {
      setGenerateError('Укажите название маршрута')
      return
    }
    
    setIsGenerating(true)
    setGenerateError('')
    
    try {
      console.log('🤖 Запуск автогенерации маршрута...', autogenParams)
      
      // Получаем токен авторизации
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Требуется авторизация для создания маршрута')
      }
      
      const response = await fetch('/api/autogeneration/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          city: autogenParams.city,
          route_title: autogenParams.route_title, // Добавляем название
          template_id: autogenParams.template_id || undefined,
          generation_params: {
            max_points: autogenParams.max_points,
            transport_mode: autogenParams.transport_mode,
            difficulty: autogenParams.difficulty
          }
        })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка генерации маршрута')
      }
      
      console.log('✅ Маршрут сгенерирован успешно:', result.route_id)
      
      alert(`🎉 Маршрут успешно создан! Перенаправляем на главную страницу...`)
      
      resetForm()
      onClose()
      
      // Перенаправляем на главную с обновлением
      window.location.href = '/'
      
    } catch (error: any) {
      console.error('❌ Ошибка автогенерации:', error)
      setGenerateError(error.message || 'Произошла неизвестная ошибка при генерации')
    } finally {
      setIsGenerating(false)
    }
  }

  // Построение превью маршрута
  const buildRoutePreview = async () => {
    if (routePoints.length < 2) return

    setIsBuilding(true)
    setBuildError('')

    try {
      console.log('🔄 Building route preview with', routePoints.length, 'points')
      
      const routePointsForApi = routePoints.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        title: point.title
      }))

      let result
      if (routeOptions.optimized && routePoints.length > 3) {
        console.log('🔄 Using route optimization')
        const optimized = await optimizeRoute(routePointsForApi, { transportMode, ...routeOptions })
        result = optimized.route
        
        if (optimized.optimizedPoints.length === routePoints.length) {
          const reorderedPoints = optimized.optimizedPoints.map((optimizedPoint: any, index: number) => {
            const originalPoint = routePoints.find(p => 
              p.latitude === optimizedPoint.latitude && 
              p.longitude === optimizedPoint.longitude
            )
            return originalPoint ? { ...originalPoint, id: `point-${index}` } : routePoints[index]
          })
          setRoutePoints(reorderedPoints)
        }
      } else {
        result = await buildRoute(routePointsForApi, { transportMode, ...routeOptions })
      }

      setRouteDataState(result)
      console.log('✅ Route preview built:', {
        distance: formatDistance(result.distance),
        duration: formatDuration(result.duration),
        instructions: result.instructions.length
      })

    } catch (error: any) {
      console.error('❌ Error building route preview:', error)
      setBuildError(error.message || 'Ошибка построения маршрута')
      setRouteDataState(null)
    } finally {
      setIsBuilding(false)
    }
  }

  const addBuildingPoint = (building: Building) => {
    console.log('addBuildingPoint called with:', building.name)
    const newPoint: RoutePoint = {
      id: `point_${Date.now()}`,
      route_id: '',
      building_id: building.id.toString(),
      order_index: routePoints.length,
      title: building.name,
      description: `${building.architect}, ${building.year_built}`,
      audio_url: null,
      audio_duration_seconds: null,
      latitude: building.latitude,
      longitude: building.longitude,
      instructions: null,
      estimated_time_minutes: 15,
      point_type: 'building',
      created_at: new Date().toISOString(),
      duration_minutes: 15
    }
    
    console.log('Adding new building point:', newPoint)
    setRoutePoints([...routePoints, newPoint])
  }

  const addCustomPoint = (lat: number, lng: number) => {
    console.log('addCustomPoint called with:', lat, lng)
    const pointName = prompt('Название точки:')
    if (!pointName) {
      console.log('Point creation cancelled - no name provided')
      return
    }

    const pointDescription = prompt('Описание точки (необязательно):') || ''

    const newPoint: RoutePoint = {
      id: `point_${Date.now()}`,
      route_id: '',
      building_id: null,
      order_index: routePoints.length,
      title: pointName,
      description: pointDescription,
      audio_url: null,
      audio_duration_seconds: null,
      latitude: lat,
      longitude: lng,
      instructions: null,
      estimated_time_minutes: 10,
      point_type: 'landmark',
      created_at: new Date().toISOString(),
      duration_minutes: 10
    }
    
    console.log('Adding new custom point:', newPoint)
    setRoutePoints([...routePoints, newPoint])
  }

  const removePoint = (pointId: string) => {
    setRoutePoints(points => points.filter(p => p.id !== pointId))
  }

  const toggleTag = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Функция применения тематических предустановок
  const applyThematicPreset = (presetId: string) => {
    const preset = thematicPresets.find(p => p.id === presetId)
    if (!preset) return

    setAutogenParams(prev => ({
      ...prev,
      ...preset.params,
      route_title: preset.name + ' в ' + prev.city
    }))
  }

  // Функция для переключения архитектурного стиля
  const toggleArchitecturalStyle = (style: string) => {
    setAutogenParams(prev => ({
      ...prev,
      architectural_styles: prev.architectural_styles.includes(style)
        ? prev.architectural_styles.filter(s => s !== style)
        : [...prev.architectural_styles, style]
    }))
  }

  const calculateDistance = () => {
    if (routeDataState) {
      return Math.round(routeDataState.distance / 1000 * 100) / 100
    }
    
    if (routePoints.length < 2) return 0
    
    let totalDistance = 0
    for (let i = 0; i < routePoints.length - 1; i++) {
      const point1 = routePoints[i]
      const point2 = routePoints[i + 1]
      
      const dx = point2.latitude - point1.latitude
      const dy = point2.longitude - point1.longitude
      const distance = Math.sqrt(dx * dx + dy * dy) * 111
      totalDistance += distance
    }
    
    return Math.round(totalDistance * 100) / 100
  }

  const saveRoute = async () => {
    if (!title.trim()) {
      setError('Укажите название маршрута')
      return
    }

    if (routePoints.length < 2) {
      setError('Маршрут должен содержать минимум 2 точки')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const routeData = {
        title: title.trim(),
        description: description.trim() || null,
        city: city.trim(),
        country: country.trim(),
        created_by: user.id,
        route_type: routeType,
        difficulty_level: difficulty,
        estimated_duration_minutes: estimatedDuration,
        distance_km: calculateDistance(),
        points_count: routePoints.length,
        route_visibility: routeVisibility,
        publication_status: routeVisibility === 'public' ? 'pending' : 'draft',
        route_source: 'user',
        priority_score: 10,
        is_published: routeVisibility === 'public',
        is_premium: false,
        language: 'ru',
        tags: tags.length > 0 ? tags : null,
        transport_mode: transportMode,
        route_options: routeOptions,
        route_geometry: routeDataState?.geometry || null,
        route_instructions: routeDataState?.instructions || null,
        route_summary: routeDataState?.summary || null
      }

      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert([routeData])
        .select()
        .single()

      if (routeError) {
        console.error('❌ Route creation error:', routeError)
        
        if (routeError.message.includes('row-level security')) {
          throw new Error('Ошибка прав доступа. Пожалуйста, обновите политики безопасности базы данных.')
        } else if (routeError.message.includes('violates check constraint')) {
          throw new Error('Ошибка валидации данных. Проверьте корректность заполненных полей.')
        } else if (routeError.message.includes('column') && routeError.message.includes('does not exist')) {
          throw new Error('Ошибка структуры базы данных. Выполните обновление схемы.')
        } else {
          throw new Error(`Ошибка создания маршрута: ${routeError.message}`)
        }
      }

      const pointsToInsert = routePoints.map((point, index) => ({
        route_id: route.id,
        building_id: point.building_id,
        order_index: index,
        title: point.title,
        description: point.description,
        audio_url: point.audio_url,
        audio_duration_seconds: point.audio_duration_seconds,
        latitude: point.latitude,
        longitude: point.longitude,
        instructions: point.instructions,
        estimated_time_minutes: point.estimated_time_minutes,
        point_type: point.point_type
      }))

      const { error: pointsError } = await supabase
        .from('route_points')
        .insert(pointsToInsert)

      if (pointsError) {
        console.error('Points creation error:', pointsError)
        throw new Error(`Ошибка создания точек: ${pointsError.message}`)
      }

      if (routeVisibility === 'public') {
        try {
          console.log('🔄 Creating publication request for route:', route.id)
          
          const publicationRequest = {
            route_id: route.id,
            requested_by: user.id,
            request_type: 'public', // ВАЖНО: используем 'public' для совместимости с БД
            justification: `Пользователь хочет поделиться маршрутом "${title}" с сообществом. Маршрут содержит ${routePoints.length} точек и охватывает ${calculateDistance()}км в городе ${city}.`,
            target_audience: `Любители архитектуры в городе ${city}`,
            estimated_popularity: Math.min(routePoints.length * 10, 50),
            status: 'pending',
            created_at: new Date().toISOString()
          }
          
          console.log('📤 Publication request data:', publicationRequest)
          
          const { data: requestData, error: publicationError } = await supabase
            .from('route_publication_requests')
            .insert([publicationRequest])
            .select()
            .single()
          
          if (publicationError) {
            console.error('❌ Publication request error:', publicationError)
            console.error('Publication request error details:', {
              message: publicationError.message,
              details: publicationError.details,
              hint: publicationError.hint,
              code: publicationError.code
            })
            
            // Не прерываем процесс создания маршрута, просто уведомляем
            alert(`Маршрут создан, но заявка на модерацию не отправлена: ${publicationError.message}`)
          } else {
            console.log('✅ Publication request created successfully:', requestData)
            alert('Маршрут создан и отправлен на модерацию!')
          }
        } catch (error) {
          console.error('Exception creating publication request:', error)
          alert('Маршрут создан, но произошла ошибка при отправке заявки на модерацию')
        }
      }
      
      alert(`Маршрут успешно создан!${
        routeVisibility === 'public' 
          ? ' Заявка на публикацию отправлена на модерацию.' 
          : ' Маршрут сохранен как личный.'
      }`)
      resetForm()
      
      window.location.href = '/'

    } catch (error: any) {
      console.error('Ошибка создания маршрута:', error)
      setError(error.message || 'Произошла неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCreationMode('manual')
    setTitle('')
    setDescription('')
    setRoutePoints([])
    setCurrentStep('mode')
    setError(null)
    setGenerateError('')
    setTags([])
    setRouteVisibility('private')
    setRequestPublication(false)
    setIsAddingPoint(false)
    setRouteDataState(null)
    setBuildError('')
    setTransportMode('walking')
    setRouteOptions({
      avoid_tolls: false,
      avoid_ferries: false,
      prefer_green: false,
      optimized: false
    })
    setAutogenParams({
      city: 'Berlin',
      route_title: '', // Сбрасываем название
      template_id: '',
      max_points: 8,
      transport_mode: 'walking',
      difficulty: 'easy',
      // Сбрасываем расширенные настройки
      radius_km: 3,
      min_rating: 0, // Любой рейтинг
      architectural_styles: [],
      time_preferences: 'any',
      max_duration_hours: 3,
      include_parks: true,
      include_restaurants: false,
      season_specific: false
    })
  }

  if (!isOpen) return null

  return (
    <div className="route-creator-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9998 }}>
      <div className="route-creator-modal bg-white rounded-2xl max-w-6xl w-full h-[90vh] flex flex-col" style={{ zIndex: 9999 }}>
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Создание маршрута
            </h2>
            <div className="flex space-x-1">
              {['mode', 'info', 'points', 'preview'].map((step, index) => {
                const steps = creationMode === 'autogenerate' ? ['mode', 'info'] : ['mode', 'info', 'points', 'preview']
                const visibleSteps = steps.slice(0, creationMode === 'autogenerate' ? 2 : 4)
                
                if (!visibleSteps.includes(step)) return null
                
                return (
                  <div
                    key={step}
                    className={`w-3 h-3 rounded-full ${
                      currentStep === step ? 'bg-blue-500' : 
                      visibleSteps.indexOf(currentStep) > visibleSteps.indexOf(step) ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )
              })}
            </div>
          </div>
          
          <button
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'mode' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Выберите способ создания маршрута</h3>
              
              <div className="space-y-4 max-w-2xl">
                {/* Ручное создание */}
                <div 
                  className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    creationMode === 'manual' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCreationMode('manual')}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        creationMode === 'manual' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {creationMode === 'manual' && (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                        <Wrench className="w-5 h-5 mr-2" />
                        Создать вручную
                      </h4>
                      <p className="text-gray-600 mb-3">
                        Полный контроль над каждой точкой маршрута. Выбирайте здания, настраивайте описания и создавайте уникальные прогулки.
                      </p>
                      <div className="text-sm text-gray-500">
                        ✅ Максимальная кастомизация<br/>
                        ✅ Точное планирование<br/>
                        ✅ Авторские описания<br/>
                        ⏱️ Время создания: 20-40 минут
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Автогенерация */}
                <div 
                  className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    creationMode === 'autogenerate' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCreationMode('autogenerate')}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        creationMode === 'autogenerate' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {creationMode === 'autogenerate' && (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Автогенерация с ИИ
                      </h4>
                      <p className="text-gray-600 mb-3">
                        Умная система создаст маршрут автоматически на основе ваших предпочтений и лучших архитектурных объектов города.
                      </p>
                      <div className="text-sm text-gray-500">
                        🚀 Быстрое создание<br/>
                        🎯 Оптимизированные маршруты<br/>
                        🧠 ИИ-генерированные описания<br/>
                        ⏱️ Время создания: 2-5 минут
                      </div>
                      {availableTemplates.length > 0 && (
                        <div className="mt-3 text-sm text-purple-600">
                          📚 Доступно шаблонов: {availableTemplates.length}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 'info' && creationMode === 'autogenerate' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-6 h-6 mr-2 text-purple-600" />
                Настройки автогенерации
              </h3>
              
              <div className="space-y-6 max-w-2xl">
                {generateError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center text-red-800">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">Ошибка генерации</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{generateError}</p>
                  </div>
                )}
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                    <Zap className="w-4 h-4 mr-1" />
                    Как работает автогенерация
                  </h4>
                  <div className="text-sm text-purple-800 space-y-1">
                    <div>1. Система анализирует архитектурные объекты в выбранном городе</div>
                    <div>2. Искусственный интеллект создает оптимальный маршрут</div>
                    <div>3. Генерируются описания и инструкции для каждой точки</div>
                    <div>4. Маршрут автоматически сохраняется и готов к использованию</div>
                  </div>
                </div>
                
                {/* Удалены быстрые предустановки - используем только тематические шаблоны из БД */}
                
                {/* Основные параметры */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название маршрута *
                  </label>
                  <input
                    type="text"
                    value={autogenParams.route_title}
                    onChange={(e) => setAutogenParams({...autogenParams, route_title: e.target.value})}
                    placeholder="Например: Мои любимые места в Берлине"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Вы можете изменить название потом
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Город для исследования *
                  </label>
                  <input
                    type="text"
                    value={autogenParams.city}
                    onChange={(e) => setAutogenParams({...autogenParams, city: e.target.value})}
                    placeholder="Например: Berlin, Munich, Hamburg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Система найдет лучшие архитектурные объекты в этом городе
                  </p>
                </div>
                
                {/* Шаблон */}
                {availableTemplates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тематический шаблон (необязательно)
                    </label>
                    <select
                      value={autogenParams.template_id}
                      onChange={(e) => setAutogenParams({...autogenParams, template_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">🎲 Универсальный маршрут (рекомендуется)</option>
                      {availableTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.category === 'seasonal' ? '🌸' :
                           template.category === 'thematic' ? '🎨' :
                           template.category === 'architectural_style' ? '🏛️' :
                           template.category === 'historical_period' ? '📜' : '🎯'} {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Шаблоны помогают создать более специализированные маршруты
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип транспорта
                    </label>
                    <select
                      value={autogenParams.transport_mode}
                      onChange={(e) => setAutogenParams({...autogenParams, transport_mode: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="walking">🚶 Пешком</option>
                      <option value="cycling">🚴 Велосипед</option>
                      <option value="driving">🚗 Автомобиль</option>
                      <option value="public_transport">🚌 Общ. транспорт</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сложность
                    </label>
                    <select
                      value={autogenParams.difficulty}
                      onChange={(e) => setAutogenParams({...autogenParams, difficulty: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="easy">😊 Легкий</option>
                      <option value="medium">🤔 Средний</option>
                      <option value="hard">😅 Сложный</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Количество точек: {autogenParams.max_points}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={autogenParams.max_points}
                    onChange={(e) => setAutogenParams({...autogenParams, max_points: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>3 (Короткий)</span>
                    <span>8 (Оптимальный)</span>
                    <span>15 (Длинный)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Больше точек = более длинный и детальный маршрут
                  </p>
                </div>
                
                {/* Расширенные настройки */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    🎨 Расширенные настройки
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Архитектурные стили */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏰 Архитектурные стили (необязательно)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {architecturalStyles.map(style => (
                          <button
                            key={style.value}
                            onClick={() => toggleArchitecturalStyle(style.value)}
                            className={`px-3 py-2 rounded-lg text-sm border transition-all flex items-center space-x-2 ${
                              autogenParams.architectural_styles.includes(style.value)
                                ? 'bg-purple-500 text-white border-purple-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span>{style.icon}</span>
                            <span>{style.label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Выберите стили для фокуса на определенной архитектуре или оставьте пустым для всех стилей
                      </p>
                      
                      {/* Кнопка "Очистить все" */}
                      {autogenParams.architectural_styles.length > 0 && (
                        <button
                          onClick={() => setAutogenParams({...autogenParams, architectural_styles: []})}
                          className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-colors"
                        >
                          ❌ Очистить все (любые стили)
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Радиус поиска */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          📍 Радиус поиска: {autogenParams.radius_km} км
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={autogenParams.radius_km}
                          onChange={(e) => setAutogenParams({...autogenParams, radius_km: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>1</span>
                          <span>5</span>
                          <span>10</span>
                        </div>
                      </div>
                      
                      {/* Минимальный рейтинг */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ⭐ Мин. рейтинг: {autogenParams.min_rating === 0 ? 'Любой' : autogenParams.min_rating.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="5.0"
                          step="0.1"
                          value={autogenParams.min_rating}
                          onChange={(e) => setAutogenParams({...autogenParams, min_rating: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Любой</span>
                          <span>3.5</span>
                          <span>5.0</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Временные предпочтения */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          🕰️ Лучшее время
                        </label>
                        <select
                          value={autogenParams.time_preferences}
                          onChange={(e) => setAutogenParams({...autogenParams, time_preferences: e.target.value as any})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        >
                          <option value="any">🕒 Любое время</option>
                          <option value="morning">🌅 Утро (8-12)</option>
                          <option value="afternoon">☀️ День (12-17)</option>
                          <option value="evening">🌆 Вечер (17-21)</option>
                        </select>
                      </div>
                      
                      {/* Максимальная продолжительность */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ⏱️ Макс. время: {autogenParams.max_duration_hours} ч
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="6"
                          step="0.5"
                          value={autogenParams.max_duration_hours}
                          onChange={(e) => setAutogenParams({...autogenParams, max_duration_hours: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>1ч</span>
                          <span>3ч</span>
                          <span>6ч</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Дополнительные опции */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎁 Дополнительные опции
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={autogenParams.include_parks}
                            onChange={(e) => setAutogenParams({...autogenParams, include_parks: e.target.checked})}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">🌳 Включать парки и скверы</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={autogenParams.include_restaurants}
                            onChange={(e) => setAutogenParams({...autogenParams, include_restaurants: e.target.checked})}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">🍽️ Добавить рестораны и кафе</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={autogenParams.season_specific}
                            onChange={(e) => setAutogenParams({...autogenParams, season_specific: e.target.checked})}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">🍂 Учитывать сезонность</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Эти опции помогают создать более полные и разнообразные маршруты
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Предпросмотр генерации */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">📋 Что будет создано:</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>🏛️ Маршрут по {autogenParams.max_points} архитектурным объектам в городе {autogenParams.city}</div>
                    <div>🤖 ИИ-генерированное название и описание</div>
                    <div>📝 Детальные инструкции для каждой точки</div>
                    <div>🗺️ Оптимизированная последовательность посещения</div>
                    <div>⏱️ Расчет времени и расстояния</div>
                  </div>
                </div>
                
                {/* Кнопка генерации */}
                <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                  <button
                    onClick={generateRoute}
                    disabled={isGenerating || !autogenParams.city.trim() || !autogenParams.route_title.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Генерирую маршрут...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        <span>Сгенерировать маршрут с ИИ</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Процесс займет 30-60 секунд
                  </p>
                  
                  {/* Предпросмотр параметров */}
                  {(autogenParams.architectural_styles.length > 0 || autogenParams.time_preferences !== 'any' || 
                    autogenParams.include_parks || autogenParams.include_restaurants || autogenParams.season_specific) && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-xs font-medium text-purple-900 mb-2">📋 Дополнительные параметры:</div>
                      <div className="text-xs text-purple-800 space-y-1">
                        {autogenParams.architectural_styles.length > 0 && (
                          <div>🏰 Стили: {autogenParams.architectural_styles.map(style => 
                            architecturalStyles.find(s => s.value === style)?.label
                          ).filter(Boolean).join(', ')}</div>
                        )}
                        <div>📍 Радиус: {autogenParams.radius_km} км • ⭐ Мин.рейтинг: {autogenParams.min_rating.toFixed(1)}</div>
                        <div>⏱️ Макс.время: {autogenParams.max_duration_hours} ч • 🎯 Точек: {autogenParams.max_points}</div>
                        {autogenParams.time_preferences !== 'any' && (
                          <div>🕰️ Время: {
                            autogenParams.time_preferences === 'morning' ? 'Утро' :
                            autogenParams.time_preferences === 'afternoon' ? 'День' :
                            autogenParams.time_preferences === 'evening' ? 'Вечер' : 'Любое'
                          }</div>
                        )}
                        {(autogenParams.include_parks || autogenParams.include_restaurants || autogenParams.season_specific) && (
                          <div>🎁 Доп.: {
                            [
                              autogenParams.include_parks && '🌳 Парки',
                              autogenParams.include_restaurants && '🍽️ Рестораны',
                              autogenParams.season_specific && '🍂 Сезонность'
                            ].filter(Boolean).join(', ')
                          }</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 'info' && creationMode === 'manual' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название маршрута *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Архитектура Берлина: от классики к модерну"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Расскажите о вашем маршруте..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Город
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Страна
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Тип транспорта */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип транспорта *
                  </label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value as TransportMode)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TRANSPORT_MODE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {TRANSPORT_MODE_OPTIONS.find(o => o.value === transportMode)?.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Время прохождения (минуты)
                    </label>
                    <input
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                      min="30"
                      max="480"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сложность
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="easy">Легкий</option>
                      <option value="medium">Средний</option>
                      <option value="hard">Сложный</option>
                    </select>
                  </div>
                </div>

                {/* Дополнительные настройки */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Settings size={16} className="mr-1" />
                    Дополнительные настройки маршрута
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      {transportMode === 'driving' && (
                        <>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={routeOptions.avoid_tolls}
                              onChange={(e) => setRouteOptions({...routeOptions, avoid_tolls: e.target.checked})}
                              className="mr-2"
                            />
                            <span className="text-sm">Избегать платных дорог</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={routeOptions.avoid_ferries}
                              onChange={(e) => setRouteOptions({...routeOptions, avoid_ferries: e.target.checked})}
                              className="mr-2"
                            />
                            <span className="text-sm">Избегать паромов</span>
                          </label>
                        </>
                      )}

                      {transportMode === 'cycling' && (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={routeOptions.prefer_green}
                            onChange={(e) => setRouteOptions({...routeOptions, prefer_green: e.target.checked})}
                            className="mr-2"
                          />
                          <span className="text-sm">Предпочитать парки и зеленые зоны</span>
                        </label>
                      )}

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={routeOptions.optimized}
                          onChange={(e) => setRouteOptions({...routeOptions, optimized: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Оптимизировать порядок точек</span>
                        <span className="text-xs text-gray-500 ml-2">(для 4+ точек)</span>
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Теги
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          tags.includes(tag)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Приватность маршрута
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={routeVisibility === 'private'}
                        onChange={(e) => setRouteVisibility(e.target.value as 'private' | 'public')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">🔒 Личный маршрут</div>
                        <div className="text-sm text-gray-600">
                          Виден только вам. Можно будет подать заявку на публикацию позже.
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={routeVisibility === 'public'}
                        onChange={(e) => setRouteVisibility(e.target.value as 'private' | 'public')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">🌍 Публичный маршрут</div>
                        <div className="text-sm text-gray-600">
                          После модерации будет виден всем пользователям.
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {routeVisibility === 'public' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="text-blue-600 mt-0.5">ℹ️</div>
                        <div className="text-sm text-blue-800">
                          <div className="font-medium mb-1">Модерация публичных маршрутов:</div>
                          <ul className="text-xs space-y-1">
                            <li>• Маршрут будет отправлен на модерацию</li>
                            <li>• После одобрения станет доступен всем</li>
                            <li>• Может появиться на главной странице</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'points' && (
            <div className="h-full flex">
              {/* Панель управления точками */}
              <div className="w-80 border-r p-4 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Точки маршрута</h3>
                
                <div className="space-y-2 mb-4">
                  <button
                    onClick={() => setIsAddingPoint(!isAddingPoint)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isAddingPoint 
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                        : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isAddingPoint ? '✓ Режим добавления (нажмите еще раз чтобы выйти)' : '+ Добавить точку'}
                  </button>
                  
                  {isAddingPoint && (
                    <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="font-medium mb-1 text-green-800">🎯 Режим добавления активен:</p>
                      <ul className="text-xs space-y-1 text-green-700">
                        <li>• Кликните по синей точке (существующее здание)</li>
                        <li>• Или кликните по пустому месту (новая точка)</li>
                        <li>• Можете добавлять сколько угодно точек подряд</li>
                        <li>• Нажмите кнопку выше чтобы выйти из режима</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Информация о маршруте */}
                {routeDataState && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <RouteIcon size={20} className="text-blue-600 mr-2" />
                      <h4 className="font-medium text-blue-900">Предварительная информация о маршруте</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Расстояние:</span>
                        <span className="ml-2 font-medium">{formatDistance(routeDataState.distance)}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Время:</span>
                        <span className="ml-2 font-medium">{formatDuration(routeDataState.duration)}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Инструкций:</span>
                        <span className="ml-2 font-medium">{routeDataState.instructions?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Транспорт:</span>
                        <span className="ml-2 font-medium">
                          {TRANSPORT_MODE_OPTIONS.find(o => o.value === transportMode)?.icon} 
                          {TRANSPORT_MODE_OPTIONS.find(o => o.value === transportMode)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isBuilding && (
                  <div className="flex items-center justify-center py-4 text-blue-600 mb-4">
                    <Loader className="animate-spin mr-2" size={20} />
                    <span>Построение маршрута...</span>
                  </div>
                )}

                {buildError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center text-red-800">
                      <AlertCircle size={20} className="mr-2" />
                      <span className="font-medium">Ошибка построения маршрута</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{buildError}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {routePoints.map((point, index) => (
                    <div key={point.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-sm">{point.title}</h4>
                          </div>
                          {point.description && (
                            <p className="text-xs text-gray-600 ml-8">{point.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1 ml-8">
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{point.duration_minutes || point.estimated_time_minutes} мин осмотра</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removePoint(point.id)}
                          className="text-red-500 hover:text-red-700 text-lg font-bold w-6 h-6 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {routePoints.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <MapPin size={48} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Добавьте точки маршрута</p>
                  </div>
                )}
              </div>

              {/* Карта */}
              <div className="flex-1 relative">
                <LeafletMapCreator
                  buildings={buildings}
                  routePoints={routePoints}
                  isAddingPoint={isAddingPoint}
                  onAddBuildingPoint={addBuildingPoint}
                  onAddCustomPoint={addCustomPoint}
                />
                
                {routePoints.length > 0 && (
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
                    <div className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin size={14} className="text-gray-500" />
                        <span>{routePoints.length} точек</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RouteIcon size={14} className="text-gray-500" />
                        <span>
                          {routeDataState 
                            ? formatDistance(routeDataState.distance)
                            : `~${calculateDistance()} км`
                          }
                        </span>
                      </div>
                      {routeDataState && (
                        <div className="flex items-center space-x-2">
                          <Clock size={14} className="text-gray-500" />
                          <span>{formatDuration(routeDataState.duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Предварительный просмотр</h3>
              
              <div className="max-w-2xl space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xl font-bold mb-2">{title}</h4>
                  {description && <p className="text-gray-600 mb-4">{description}</p>}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-gray-500" />
                      <span>{city}, {country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-500" />
                      <span>
                        {routeDataState 
                          ? formatDuration(routeDataState.duration)
                          : `${estimatedDuration} минут`
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star size={16} className="text-gray-500" />
                      <span className="capitalize">{difficulty}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users size={16} className="text-gray-500" />
                      <span>{routePoints.length} точек</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RouteIcon size={16} className="text-gray-500" />
                      <span>
                        {routeDataState 
                          ? formatDistance(routeDataState.distance)
                          : `~${calculateDistance()} км`
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{TRANSPORT_MODE_OPTIONS.find(o => o.value === transportMode)?.icon}</span>
                      <span>{TRANSPORT_MODE_OPTIONS.find(o => o.value === transportMode)?.label}</span>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Статус публикации */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    routeVisibility === 'public' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">
                        {routeVisibility === 'public' ? '🌍' : '🔒'}
                      </span>
                      <span className={`font-medium ${
                        routeVisibility === 'public' ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {routeVisibility === 'public' ? 'Публичный маршрут' : 'Личный маршрут'}
                      </span>
                    </div>
                    <div className={`text-sm ${
                      routeVisibility === 'public' ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {routeVisibility === 'public' 
                        ? 'Маршрут будет отправлен на модерацию и после одобрения станет доступен всем пользователям.'
                        : 'Маршрут будет виден только вам. Можно будет подать заявку на публикацию позже.'
                      }
                    </div>
                  </div>
                </div>

                {/* Детали маршрута */}
                {routeDataState && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-3">Детали построенного маршрута</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <span>Точное расстояние:</span>
                        <span className="ml-2 font-medium">{formatDistance(routeDataState.distance)}</span>
                      </div>
                      <div>
                        <span>Время в пути:</span>
                        <span className="ml-2 font-medium">{formatDuration(routeDataState.duration)}</span>
                      </div>
                      <div>
                        <span>Пошаговых инструкций:</span>
                        <span className="ml-2 font-medium">{routeDataState.instructions?.length || 0}</span>
                      </div>
                      <div>
                        <span>Качество маршрута:</span>
                        <span className="ml-2 font-medium">Реальные дороги</span>
                      </div>
                    </div>
                    
                    {routeDataState.summary?.ascent && (
                      <div className="mt-3 text-sm text-blue-700">
                        <span>Подъем: {Math.round(routeDataState.summary.ascent)} м</span>
                        {routeDataState.summary.descent && (
                          <span className="ml-4">Спуск: {Math.round(routeDataState.summary.descent)} м</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!routeDataState && routePoints.length >= 2 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center text-amber-800">
                      <AlertCircle size={20} className="mr-2" />
                      <span className="font-medium">Маршрут не построен</span>
                    </div>
                    <p className="text-amber-700 text-sm mt-1">
                      Будут показаны прямые линии между точками. Добавьте больше деталей на этапе создания точек.
                    </p>
                  </div>
                )}

                <div>
                  <h5 className="font-medium mb-3">Маршрут ({routePoints.length} точек)</h5>
                  <div className="space-y-2">
                    {routePoints.map((point, index) => (
                      <div key={point.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{point.title}</div>
                          {point.description && (
                            <div className="text-xs text-gray-600">{point.description}</div>
                          )}
                          {point.building_id && (
                            <div className="text-xs text-green-600">🏛️ Связано с архитектурным объектом</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{point.duration_minutes || point.estimated_time_minutes}м осмотра</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Настройки маршрута */}
                {Object.values(routeOptions).some(Boolean) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Настройки маршрута</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      {routeOptions.avoid_tolls && <div>• Избегать платных дорог</div>}
                      {routeOptions.avoid_ferries && <div>• Избегать паромов</div>}
                      {routeOptions.prefer_green && <div>• Предпочитать парки и зеленые зоны</div>}
                      {routeOptions.optimized && <div>• Оптимизированный порядок точек</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="p-6 border-t">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-between">
            <div>
              {currentStep !== 'mode' && (
                <button
                  onClick={() => {
                    if (creationMode === 'autogenerate') {
                      const steps = ['mode', 'info']
                      const currentIndex = steps.indexOf(currentStep)
                      setCurrentStep(steps[currentIndex - 1] as any)
                    } else {
                      // Если точки уже загружены, пропускаем шаг 'points' при навигации назад
                      if (currentStep === 'preview' && routePoints.length > 0) {
                        setCurrentStep('info')
                      } else {
                        const steps = ['mode', 'info', 'points', 'preview']
                        const currentIndex = steps.indexOf(currentStep)
                        setCurrentStep(steps[currentIndex - 1] as any)
                      }
                    }
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Назад
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  resetForm()
                  onClose()
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              
              {creationMode === 'autogenerate' ? (
                // Для автогенерации кнопки не нужны на шаге info, так как генерация происходит сразу
                currentStep === 'mode' ? (
                  <button
                    onClick={() => setCurrentStep('info')}
                    disabled={!creationMode}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Далее
                  </button>
                ) : null
              ) : (
                // Для ручного создания стандартная логика
                currentStep === 'preview' ? (
                  <button
                    onClick={saveRoute}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save size={16} />
                    <span>{loading ? 'Сохранение...' : 'Сохранить маршрут'}</span>
                  </button>
                ) : currentStep === 'mode' ? (
                  <button
                    onClick={() => setCurrentStep('info')}
                    disabled={!creationMode}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Далее
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (currentStep === 'info' && !title.trim()) {
                        setError('Укажите название маршрута')
                        return
                      }
                      
                      // Если точки уже загружены, пропускаем шаг 'points'
                      if (currentStep === 'info' && routePoints.length > 0) {
                        setCurrentStep('preview')
                      } else {
                        const steps = ['mode', 'info', 'points', 'preview']
                        const currentIndex = steps.indexOf(currentStep)
                        setCurrentStep(steps[currentIndex + 1] as any)
                      }
                      setError(null)
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Далее
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}