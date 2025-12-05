'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { MapPin, Plus, Home, ArrowLeft } from 'lucide-react'
import RouteCreator from '@/components/RouteCreator'
import { SmartRouteFilter } from '@/lib/smart-route-filtering'
import type { RouteWithUserData } from '@/types/route'

interface SimpleRoute {
  id: string
  title: string
  description: string | null
  city: string
  country: string
  transport_mode: string | null
  estimated_duration_minutes: number | null
  points_count: number | null
  is_published: boolean | null
  created_at: string
}

const getTransportIcon = (mode: string | null) => {
  switch (mode) {
    case 'walking': return '🚶'
    case 'cycling': return '🚴'
    case 'driving': return '🚗'
    case 'public_transport': return '🚌'
    default: return '🚶'
  }
}

const getTransportLabel = (mode: string | null) => {
  switch (mode) {
    case 'walking': return 'Пешком'
    case 'cycling': return 'На велосипеде'
    case 'driving': return 'На автомобиле'
    case 'public_transport': return 'Общественный транспорт'
    default: return 'Пешком'
  }
}

export default function RoutesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [routes, setRoutes] = useState<SimpleRoute[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRouteCreatorOpen, setIsRouteCreatorOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Загрузка маршрутов с умной фильтрацией...')
      
      // Используем умную фильтрацию для страницы маршрутов (больше маршрутов)
      const smartRoutes = await SmartRouteFilter.getRoutesForMap({
        city: 'Berlin',
        maxRoutes: 50, // Для страницы маршрутов показываем больше
        userPreferences: {
          // Можно добавить фильтры пользователя
        }
      })
      
      console.log(`✅ Получено ${smartRoutes.length} отфильтрованных маршрутов`)
      setRoutes(smartRoutes)
      
    } catch (smartError: any) {
      console.error('❌ Ошибка умной фильтрации:', smartError)
      
      // Fallback к обычному запросу
      try {
        const { data: routesData, error: routesError } = await supabase
          .from('routes')
          .select(`
            id,
            title,
            description,
            city,
            country,
            transport_mode,
            estimated_duration_minutes,
            points_count,
            is_published,
            created_at,
            route_visibility,
            publication_status,
            priority_score
          `)
          .eq('publication_status', 'published')
          .eq('route_visibility', 'public')
          .order('priority_score', { ascending: false })

        if (routesError) {
          console.error('❌ Routes error:', routesError)
          setError(routesError.message)
          return
        }

        // Преобразуем в нужный формат
        const formattedRoutes = (routesData || []).map(route => ({
          ...route,
          // Добавляем отсутствующие поля
          route_points: [],
          profiles: null,
          route_geometry: null,
          distance_km: 0,
          rating: null,
          completion_count: 0
        })) as RouteWithUserData[]
        
        setRoutes(formattedRoutes)
        console.log('✅ Использован fallback загрузка:', formattedRoutes.length)
        
      } catch (fallbackError: any) {
        console.error('❌ Fallback error:', fallbackError)
        setError(fallbackError.message)
        return
      }
    }

    // Загружаем здания для создания маршрутов
    try {
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('name')

      if (buildingsError) {
        console.error('❌ Buildings error:', buildingsError)
      } else {
        setBuildings(buildingsData || [])
      }
    } catch (buildingsError: any) {
      console.error('❌ Buildings exception:', buildingsError)
    }
    
    setLoading(false)
  }

  const handleOpenRouteCreator = () => {
    setIsRouteCreatorOpen(true)
  }

  const handleCloseRouteCreator = () => {
    setIsRouteCreatorOpen(false)
    // Перезагружаем данные после создания маршрута
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загружаем маршруты...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки маршрутов</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={loadData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Попробовать снова
            </button>
            <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 inline-block">
              На главную
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/diagnostic" className="text-blue-600 hover:underline text-sm">
              Диагностика системы →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Навигация */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Home className="w-4 h-4" />
            <span>На главную</span>
          </Link>
        </div>
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Архитектурные маршруты
            </h1>
            
            {user && (
              <button
                onClick={handleOpenRouteCreator}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Создать маршрут</span>
              </button>
            )}
          </div>
          
          <p className="text-lg text-gray-600">
            Исследуйте города через призму архитектуры. Публичные маршруты от местных экспертов и энтузиастов.
          </p>
          
          <div className="mt-4 text-sm text-gray-500">
            Статус БД: Подключено ✅ | Найдено маршрутов: {routes.length}
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Пока нет маршрутов
            </h3>
            <p className="text-gray-600 mb-6">
              Станьте первым, кто создаст архитектурный маршрут!
            </p>
            {user ? (
              <button
                onClick={handleOpenRouteCreator}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Создать первый маршрут</span>
              </button>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span>Войти для создания маршрутов</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {route.title}
                </h3>
                {route.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {route.description}
                  </p>
                )}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>📍 {route.city}, {route.country}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>⏱️ {route.estimated_duration_minutes || 60} мин</span>
                    <span>📍 {route.points_count || 0} точек</span>
                  </div>
                  {route.transport_mode && (
                    <div className="flex items-center gap-2">
                      <span>{getTransportIcon(route.transport_mode)}</span>
                      <span>{getTransportLabel(route.transport_mode)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 pt-2 border-t flex justify-between">
                    <span>Создан: {new Date(route.created_at).toLocaleDateString('ru-RU')}</span>
                    <span className="text-green-600 font-medium">🌍 Публичный</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Link 
                    href={`/routes/${route.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Посмотреть маршрут →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
            <h4 className="font-semibold mb-2">Отладочная информация:</h4>
            <div>Пользователь: {user ? user.email : 'Не авторизован'}</div>
            <div>Загружено маршрутов: {routes.length}</div>
            <div>Последнее обновление: {new Date().toLocaleString('ru-RU')}</div>
          </div>
        )}

        </div>
      </div>
    
    {/* Модальное окно создания маршрута */}
    {isRouteCreatorOpen && user && (
      <RouteCreator
        isOpen={isRouteCreatorOpen}
        onClose={handleCloseRouteCreator}
        user={user}
        buildings={buildings}
      />
    )}
  </>
  )
}
