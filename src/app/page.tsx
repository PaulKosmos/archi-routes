// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import type { Building } from '../types/building'

// Динамический импорт карты
const LeafletMap = dynamic(() => import('../components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
    <span className="text-gray-500">Загрузка карты...</span>
  </div>
})

// Типы для маршрутов
interface Route {
  id: string
  title: string
  description: string
  difficulty_level: string
  is_published: boolean
  created_at: string
  created_by: string
  profiles: {
    id: string
    full_name: string
    role: string
  } | null
  route_points: {
    id: string
    title: string
    latitude: number
    longitude: number
    order_index: number
  }[]
}

export default function Home() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [routesLoading, setRoutesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBuildings()
    fetchRoutes()
  }, [])

  const fetchBuildings = async () => {
    try {
      console.log('🏢 Загрузка зданий...')
      setLoading(true)
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name')

      if (error) {
        throw error
      }

      console.log('🏢 Buildings loaded:', data?.length || 0)
      setBuildings(data || [])
    } catch (error: any) {
      console.error('❌ Ошибка загрузки зданий:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoutes = async () => {
    try {
      console.log('🛤️ Загрузка маршрутов...')
      setRoutesLoading(true)
      
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          profiles!routes_created_by_fkey (
            id,
            full_name,
            role
          ),
          route_points (
            id,
            title,
            latitude,
            longitude,
            order_index
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Ошибка загрузки маршрутов:', error)
        // Пробуем альтернативный запрос без foreign key
        const { data: altData, error: altError } = await supabase
          .from('routes')
          .select(`
            *,
            route_points (
              id,
              title,
              latitude,
              longitude,
              order_index
            )
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (altError) {
          throw altError
        }

        console.log('🛤️ Routes loaded (alternative):', altData?.length || 0)
        setRoutes(altData || [])
      } else {
        console.log('🛤️ Routes loaded:', data?.length || 0)
        setRoutes(data || [])
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки маршрутов:', error)
    } finally {
      setRoutesLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={buildings} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero секция */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Откройте архитектуру города
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Исследуйте уникальные здания, создавайте маршруты и делитесь архитектурными открытиями 
            с сообществом энтузиастов
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {loading ? '...' : buildings.length}
            </div>
            <div className="text-gray-600">Архитектурных объектов</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {routesLoading ? '...' : routes.length}
            </div>
            <div className="text-gray-600">Активных маршрутов</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">1</div>
            <div className="text-gray-600">Участников сообщества</div>
          </div>
        </div>

        {/* Маршруты */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Популярные маршруты
            </h2>
            <p className="text-gray-600">
              Архитектурные прогулки, созданные нашим сообществом
            </p>
          </div>
          
          <div className="p-6">
            {routesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
                ))}
              </div>
            ) : routes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routes.map((route) => (
                  <Link
                    key={route.id}
                    href={`/routes/${route.id}`}
                    className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer block"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {route.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                          route.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                          route.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {route.difficulty_level === 'easy' ? 'Легкий' :
                           route.difficulty_level === 'medium' ? 'Средний' : 'Сложный'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {route.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {route.route_points?.length || 0} точек
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {route.profiles?.full_name || 'Автор'}
                        </span>
                        <span className="text-sm text-blue-600 group-hover:text-blue-700">
                          Пройти маршрут →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 013.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Пока нет опубликованных маршрутов
                </h3>
                <p className="text-gray-500 mb-6">
                  Станьте первым, кто создаст архитектурный маршрут для сообщества!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Карта */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Интерактивная карта архитектуры
            </h2>
            <p className="text-gray-600">
              Нажмите на маркеры, чтобы узнать больше о зданиях
            </p>
          </div>
          
          <div className="p-6">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800 font-medium">Ошибка загрузки данных</div>
                <div className="text-red-600 text-sm mt-1">{error}</div>
                <button 
                  onClick={() => {
                    fetchBuildings()
                    fetchRoutes()
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Повторить загрузку
                </button>
              </div>
            ) : (
              <LeafletMap buildings={buildings} />
            )}
          </div>
        </div>

        {/* Список зданий */}
        {!loading && buildings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Архитектурные объекты
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buildings.map((building) => (
                <Link
                  key={building.id}
                  href={`/buildings/${building.id}`}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer block"
                >
                  {building.image_url ? (
                    <img 
                      src={building.image_url} 
                      alt={building.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-5a1 1 0 011-1h4a1 1 0 011 1v5M7 7h10M7 10h10M7 13h10" />
                      </svg>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {building.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Архитектор:</strong> {building.architect}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Год:</strong> {building.year_built} • <strong>Стиль:</strong> {building.style}
                    </p>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {building.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm text-gray-600 ml-1">
                          {building.rating && building.rating > 0 ? building.rating.toFixed(1) : 'Нет оценок'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">
                          {building.city}
                        </span>
                        <span className="text-xs text-blue-600 group-hover:text-blue-700">
                          Подробнее →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}