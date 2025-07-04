// components/RouteCreator.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Building, RoutePoint } from '../types/building'
import { X, Plus, MapPin, Clock, Users, Star, Save, Eye } from 'lucide-react'
import dynamic from 'next/dynamic'

// Динамический импорт Leaflet для избежания SSR ошибок
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
}

export default function RouteCreator({ isOpen, onClose, user, buildings }: RouteCreatorProps) {
  // Основные данные маршрута
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('Berlin')
  const [country, setCountry] = useState('Germany') // Добавляем country
  const [difficulty, setDifficulty] = useState('easy')
  const [estimatedDuration, setEstimatedDuration] = useState(60)
  const [routeType, setRouteType] = useState('walking')
  const [tags, setTags] = useState<string[]>([])
  const [isPublished, setIsPublished] = useState(false)

  // Точки маршрута
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [isAddingPoint, setIsAddingPoint] = useState(false)

  // Состояние
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'info' | 'points' | 'preview'>('info')

  // Доступные теги
  const availableTags = [
    'architecture', 'historical', 'modern', 'baroque', 'gothic', 
    'art-nouveau', 'brutalism', 'classical', 'contemporary',
    'walking', 'family-friendly', 'photography', 'educational'
  ]

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
      point_type: 'building', // ✅ Правильное значение
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
      point_type: 'landmark', // ✅ Изменили с 'custom' на 'landmark'
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

  const calculateDistance = () => {
    if (routePoints.length < 2) return 0
    
    let totalDistance = 0
    for (let i = 0; i < routePoints.length - 1; i++) {
      const point1 = routePoints[i]
      const point2 = routePoints[i + 1]
      
      // Простая формула расстояния (приблизительная)
      const dx = point2.latitude - point1.latitude
      const dy = point2.longitude - point1.longitude
      const distance = Math.sqrt(dx * dx + dy * dy) * 111 // Примерно км
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
      // Создаем маршрут с правильными полями
      const routeData = {
        title: title.trim(),
        description: description.trim() || null,
        city: city.trim(),
        country: country.trim(), // Добавляем country
        created_by: user.id,
        route_type: routeType,
        difficulty_level: difficulty,
        estimated_duration_minutes: estimatedDuration,
        distance_km: calculateDistance(),
        points_count: routePoints.length,
        is_published: isPublished,
        is_premium: false,
        language: 'ru',
        tags: tags.length > 0 ? tags : null
      }

      console.log('📝 Attempting to save route with data:')
      console.log('- title:', routeData.title)
      console.log('- route_type:', routeData.route_type)
      console.log('- difficulty_level:', routeData.difficulty_level)
      console.log('- city:', routeData.city)
      console.log('- country:', routeData.country)
      console.log('- created_by:', routeData.created_by)
      console.log('- is_published:', routeData.is_published)
      console.log('- Full data object:', routeData)

      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert([routeData])
        .select()
        .single()

      if (routeError) {
        console.error('❌ Route creation error details:', {
          message: routeError.message,
          details: routeError.details,
          hint: routeError.hint,
          code: routeError.code
        })
        throw new Error(`Ошибка создания маршрута: ${routeError.message}`)
      }

      // Создаем точки маршрута (ПРАВИЛЬНЫЕ поля под реальную БД)
      const pointsToInsert = routePoints.map((point, index) => ({
        route_id: route.id,
        building_id: point.building_id, // Может быть UUID или null
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

      console.log('📍 Creating route points:', pointsToInsert.length)
      console.log('📍 First point example:', pointsToInsert[0])

      const { error: pointsError } = await supabase
        .from('route_points')
        .insert(pointsToInsert)

      if (pointsError) {
        console.error('Points creation error:', pointsError)
        throw new Error(`Ошибка создания точек: ${pointsError.message}`)
      }

      // Успех!
      alert('Маршрут успешно создан!')
      resetForm()
      onClose()

    } catch (error: any) {
      console.error('Ошибка создания маршрута:', error)
      setError(error.message || 'Произошла неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setRoutePoints([])
    setCurrentStep('info')
    setError(null)
    setTags([])
    setIsAddingPoint(false)
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
              {['info', 'points', 'preview'].map((step, index) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    currentStep === step ? 'bg-blue-500' : 
                    ['info', 'points', 'preview'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
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
          {currentStep === 'info' && (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип маршрута
                  </label>
                  <select
                    value={routeType}
                    onChange={(e) => setRouteType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="walking">Пешеходный</option>
                    <option value="cycling">Велосипедный</option>
                    <option value="driving">Автомобильный</option>
                    <option value="public_transport">Общественный транспорт</option>
                  </select>
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="published" className="text-sm text-gray-700">
                    Опубликовать маршрут (будет виден другим пользователям)
                  </label>
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
                        <Clock size={14} className="text-gray-500" />
                        <span>~{calculateDistance()} км</span>
                      </div>
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
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-gray-500" />
                      <span>{city}, {country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-500" />
                      <span>{estimatedDuration} минут</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star size={16} className="text-gray-500" />
                      <span className="capitalize">{difficulty}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users size={16} className="text-gray-500" />
                      <span>{routePoints.length} точек</span>
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
                </div>

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
                        </div>
                        <div className="text-xs text-gray-500">{point.duration_minutes || point.estimated_time_minutes}м осмотра</div>
                      </div>
                    ))}
                  </div>
                </div>
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
              {currentStep !== 'info' && (
                <button
                  onClick={() => {
                    const steps = ['info', 'points', 'preview']
                    const currentIndex = steps.indexOf(currentStep)
                    setCurrentStep(steps[currentIndex - 1] as any)
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
              
              {currentStep === 'preview' ? (
                <button
                  onClick={saveRoute}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>{loading ? 'Сохранение...' : 'Сохранить маршрут'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (currentStep === 'info' && !title.trim()) {
                      setError('Укажите название маршрута')
                      return
                    }
                    
                    const steps = ['info', 'points', 'preview']
                    const currentIndex = steps.indexOf(currentStep)
                    setCurrentStep(steps[currentIndex + 1] as any)
                    setError(null)
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Далее
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}