// src/app/routes/[id]/edit/RouteEditClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useEditPermissions } from '../../../../hooks/useEditPermissions'
import type { Building, RoutePoint } from '../../../../types/building'
import { Save, X, Plus, MapPin, Clock, ArrowLeft, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Динамический импорт карты
const LeafletMapCreator = dynamic(() => import('../../../../components/LeafletMapCreator'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">
    <span className="text-gray-500">Loading map...</span>
  </div>
})

interface RouteEditClientProps {
  route: any // Расширенные данные маршрута с точками
  buildings: Building[]
}

export default function RouteEditClient({
  route,
  buildings
}: RouteEditClientProps) {
  const router = useRouter()

  // Получаем права доступа для отображения роли (новый API без userId)
  const permissions = useEditPermissions('route', route.id)

  // Основные данные маршрута
  const [formData, setFormData] = useState({
    title: route.title || '',
    description: route.description || '',
    city: route.city || '',
    country: route.country || '',
    difficulty_level: route.difficulty_level || 'easy',
    estimated_duration_minutes: route.estimated_duration_minutes || 60,
    route_type: route.route_type || 'walking',
    tags: route.tags || [],
    is_published: route.is_published || false
  })

  // Точки маршрута (конвертируем из БД формата)
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(() => {
    return (route.route_points || []).map((point: any) => ({
      id: point.id,
      route_id: point.route_id,
      building_id: point.building_id,
      order_index: point.order_index,
      title: point.title,
      description: point.description,
      audio_url: point.audio_url,
      audio_duration_seconds: point.audio_duration_seconds,
      latitude: point.latitude,
      longitude: point.longitude,
      instructions: point.instructions,
      estimated_time_minutes: point.estimated_time_minutes,
      point_type: point.point_type,
      created_at: point.created_at,
      duration_minutes: point.estimated_time_minutes
    }))
  })

  // Состояния
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isAddingPoint, setIsAddingPoint] = useState(false)
  const [currentStep, setCurrentStep] = useState<'info' | 'points' | 'preview'>('info')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Теги
  const availableTags = [
    'architecture', 'historical', 'modern', 'baroque', 'gothic',
    'art-nouveau', 'brutalism', 'classical', 'contemporary',
    'walking', 'family-friendly', 'photography', 'educational'
  ]

  // Добавление точки здания
  const addBuildingPoint = (building: Building) => {
    const newPoint: RoutePoint = {
      id: `temp_${Date.now()}`, // Временный ID
      route_id: route.id,
      building_id: building.id,
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

    setRoutePoints([...routePoints, newPoint])
  }

  // Добавление кастомной точки
  const addCustomPoint = (lat: number, lng: number) => {
    const pointName = prompt('Название точки:')
    if (!pointName) return

    const pointDescription = prompt('Описание точки (необязательно):') || ''

    const newPoint: RoutePoint = {
      id: `temp_${Date.now()}`,
      route_id: route.id,
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

    setRoutePoints([...routePoints, newPoint])
  }

  // Удаление точки
  const removePoint = (pointId: string) => {
    setRoutePoints(points => points.filter(p => p.id !== pointId))
  }

  // Переключение тегов
  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t: string) => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  // Расчет расстояния
  const calculateDistance = () => {
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

  // Сохранение изменений
  const saveRoute = async () => {
    if (!formData.title.trim()) {
      setError('Specify route name')
      return
    }

    if (routePoints.length < 2) {
      setError('Route must contain at least 2 points')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Обновляем основные данные маршрута
      const routeUpdateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        city: formData.city.trim(),
        country: formData.country.trim(),
        route_type: formData.route_type,
        difficulty_level: formData.difficulty_level,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        distance_km: calculateDistance(),
        points_count: routePoints.length,
        is_published: formData.is_published,
        tags: formData.tags.length > 0 ? formData.tags : null,
        updated_at: new Date().toISOString()
      }

      const { error: routeError } = await supabase
        .from('routes')
        .update(routeUpdateData)
        .eq('id', route.id)

      if (routeError) {
        throw new Error(`Ошибка обновления маршрута: ${routeError.message}`)
      }

      // Удаляем все существующие точки
      const { error: deleteError } = await supabase
        .from('route_points')
        .delete()
        .eq('route_id', route.id)

      if (deleteError) {
        throw new Error(`Ошибка удаления точек: ${deleteError.message}`)
      }

      // Создаем новые точки
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
        throw new Error(`Ошибка создания точек: ${pointsError.message}`)
      }

      setSuccess(true)

      // Редирект через 2 секунды
      setTimeout(() => {
        router.push(`/routes/${route.id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Error saving route:', error)
      setError(error.message || 'An error occurred while saving')
    } finally {
      setLoading(false)
    }
  }

  // Удаление маршрута
  const deleteRoute = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот маршрут? Это действие необратимо.')) {
      return
    }

    setDeleting(true)
    try {
      // Сначала удаляем точки маршрута
      const { error: pointsError } = await supabase
        .from('route_points')
        .delete()
        .eq('route_id', route.id)

      if (pointsError) {
        throw new Error(`Ошибка удаления точек: ${pointsError.message}`)
      }

      // Затем удаляем сам маршрут
      const { error: routeError } = await supabase
        .from('routes')
        .delete()
        .eq('id', route.id)

      if (routeError) {
        throw new Error(`Ошибка удаления маршрута: ${routeError.message}`)
      }

      // Успешное удаление - перенаправляем на главную
      alert('✅ Маршрут успешно удален')
      router.push('/test-map')

    } catch (error: any) {
      console.error('Error deleting route:', error)
      alert(`❌ Ошибка удаления маршрута: ${error.message}`)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Changes Saved!
          </h2>
          <p className="text-green-700">
            Redirecting to route page...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Route
            </h1>
            <p className="text-sm text-gray-600">
              {route.profiles?.full_name && (
                <>Author: {route.profiles.full_name} • </>
              )}
              Created: {new Date(route.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Индикатор роли - показываем только если роль есть */}
        {permissions.userRole && (
          <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            Your role: {permissions.userRole === 'moderator' ? 'Moderator' : permissions.userRole === 'admin' ? 'Administrator' : 'Author'}
          </div>
        )}

        {/* Шаги */}
        <div className="flex space-x-1 mt-4">
          {['info', 'points', 'preview'].map((step, index) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full ${currentStep === step ? 'bg-blue-500' :
                  ['info', 'points', 'preview'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-gray-300'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Контент */}
      <div className="bg-white rounded-lg shadow-sm border">
        {currentStep === 'info' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route Name *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag: string) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${formData.tags.includes(tag)
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
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="published" className="text-sm text-gray-700">
                  Publish route
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'points' && (
          <div className="h-[600px] flex">
            {/* Панель точек */}
            <div className="w-80 border-r p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Route Points</h3>

              <button
                onClick={() => setIsAddingPoint(!isAddingPoint)}
                className={`w-full px-4 py-2 rounded-lg border transition-colors mb-4 ${isAddingPoint
                    ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                    : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                  }`}
              >
                {isAddingPoint ? '✓ Adding Mode (click to exit)' : '+ Add Point'}
              </button>

              {isAddingPoint && (
                <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg border border-green-200 mb-4">
                  <p className="font-medium mb-1 text-green-800">🎯 Adding mode active:</p>
                  <ul className="text-xs space-y-1 text-green-700">
                    <li>• Click on blue marker (building)</li>
                    <li>• Or click on empty space (new point)</li>
                  </ul>
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
                          <span className="text-xs text-gray-500">{point.estimated_time_minutes} min</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removePoint(point.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {routePoints.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <MapPin size={48} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Add route points</p>
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
                      <span>{routePoints.length} points</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={14} className="text-gray-500" />
                      <span>~{calculateDistance()} km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>

            <div className="max-w-2xl space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xl font-bold mb-2">{formData.title}</h4>
                {formData.description && <p className="text-gray-600 mb-4">{formData.description}</p>}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-gray-500" />
                    <span>{formData.city}, {formData.country}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-gray-500" />
                    <span>{formData.estimated_duration_minutes} minutes</span>
                  </div>
                </div>

                {formData.tags.length > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map((tag: string) => (
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
                <h5 className="font-medium mb-3">Route ({routePoints.length} points)</h5>
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
                      <div className="text-xs text-gray-500">{point.estimated_time_minutes}m</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Кнопки навигации */}
      <div className="mt-6 flex justify-between">
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
              Back
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Левая часть: Кнопка удаления */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            title="Delete route"
          >
            <Trash2 size={16} />
            <span>{deleting ? 'Deleting...' : 'Delete Route'}</span>
          </button>

          {/* Правая часть: Действия */}
          <div className="flex space-x-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            {currentStep === 'preview' ? (
              <button
                onClick={saveRoute}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (currentStep === 'info' && !formData.title.trim()) {
                    setError('Specify route name')
                    return
                  }

                  const steps = ['info', 'points', 'preview']
                  const currentIndex = steps.indexOf(currentStep)
                  setCurrentStep(steps[currentIndex + 1] as any)
                  setError(null)
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🗑️ Delete Route?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete route <strong>"{route.title}"</strong>?
              This action is irreversible. All route points will also be deleted.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteRoute}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Trash2 size={16} />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}