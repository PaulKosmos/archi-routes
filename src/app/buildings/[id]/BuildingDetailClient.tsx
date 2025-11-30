// src/app/buildings/[id]/BuildingDetailClient.tsx - ПОЛНАЯ ВЕРСИЯ с обзорами

'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { Building, BuildingReviewWithProfile } from '@/types/building'
import { RouteWithPoints } from '@/types/route'
import BuildingHeader from '@/components/buildings/BuildingHeader'
import BuildingReviews from '@/components/buildings/BuildingReviews'
import { Loader2, MapPin, Clock, Users, Star, Camera, Navigation, Calendar, User, Building as BuildingIcon } from 'lucide-react'
import Link from 'next/link'
import { getStorageUrl } from '@/lib/storage'
import BuildingNews from '@/components/news/BuildingNews'

// Динамический импорт для компонента с Leaflet (избегаем SSR)
const BuildingMap = dynamic(() => import('@/components/buildings/BuildingMap'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 animate-pulse flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
  </div>
})

interface BuildingDetailClientProps {
  building: Building
}

interface BuildingPageData {
  reviews: BuildingReviewWithProfile[]
  relatedBlogPosts: any[]
  relatedRoutes: RouteWithPoints[]
  userFavorite: any
}

export default function BuildingDetailClient({ building }: BuildingDetailClientProps) {
  const supabase = useMemo(() => createClient(), [])
  console.log('🏢 [DEBUG] BuildingDetailClient component rendered')
  console.log('🏢 [DEBUG] Building prop:', building)
  
  const [data, setData] = useState<BuildingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  
  console.log('🏢 [DEBUG] Component state - loading:', loading, 'data:', data)
  
  const fetchBuildingData = async () => {
    console.log('🏢 [DEBUG] fetchBuildingData function called')
    console.log('🏢 [DEBUG] Function start time:', new Date().toISOString())
    
    try {
      console.log('🏢 [DEBUG] Setting loading to true')
      setLoading(true)
      
      console.log('🏢 [DEBUG] Starting PARALLEL data fetch for:', building.id)
      
      const startTime = Date.now()
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      
      // Выполняем ВСЕ запросы ПАРАЛЛЕЛЬНО без таймаутов
      console.log('📊 [DEBUG] Executing 4 parallel queries...')
      const [reviewsResult, blogResult, routesResult, favoriteResult] = await Promise.allSettled([
        // 1. Обзоры
        supabase
          .from('building_reviews')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              full_name,
              avatar_url,
              role
            )
          `)
          .eq('building_id', building.id)
          .order('created_at', { ascending: false }),
        
        // 2. Блог-посты
        supabase
          .from('blog_post_buildings')
          .select(`
            *,
            blog_posts:blog_post_id (
              id,
              title,
              slug,
              excerpt,
              featured_image_url,
              published_at,
              author_id,
              profiles:author_id (
                username,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('building_id', building.id),
        
        // 3. Маршруты
        supabase
          .from('route_points')
          .select(`
            route_id,
            routes:route_id (
              id,
              title,
              description,
              city,
              country,
              difficulty_level,
              estimated_duration_minutes,
              distance_km,
              rating,
              review_count,
              thumbnail_url,
              created_by,
              profiles:created_by (
                username,
                full_name
              )
            )
          `)
          .eq('building_id', building.id)
          .limit(5),
        
        // 4. Избранное (только если есть пользователь)
        user ? supabase
          .from('user_building_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('building_id', building.id)
          .single() : Promise.resolve({ data: null, error: null })
      ])
      
      // Обрабатываем результаты
      let reviews = []
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value.data) {
        reviews = reviewsResult.value.data
        console.log('✅ Reviews loaded:', reviews.length)
      } else if (reviewsResult.status === 'rejected') {
        console.error('❌ Reviews error:', reviewsResult.reason)
      }
      
      let blogPosts = []
      if (blogResult.status === 'fulfilled' && blogResult.value.data) {
        blogPosts = blogResult.value.data
        console.log('✅ Blog posts loaded:', blogPosts.length)
      }
      
      let routes = []
      if (routesResult.status === 'fulfilled' && routesResult.value.data) {
        routes = routesResult.value.data
        console.log('✅ Routes loaded:', routes.length)
      }
      
      let userFavorite = null
      if (favoriteResult.status === 'fulfilled' && favoriteResult.value.data) {
        userFavorite = favoriteResult.value.data
        console.log('✅ Favorite status checked')
      }

      console.log('🔄 [DEBUG] Setting data state...')
      setData({
        reviews: reviews || [],
        relatedBlogPosts: blogPosts || [],
        relatedRoutes: routes?.map(r => r.routes).filter(Boolean) || [],
        userFavorite
      })

      // Увеличиваем счетчик просмотров (асинхронно, не блокируя UI)
      supabase
        .from('buildings')
        .update({ view_count: (building.view_count || 0) + 1 })
        .eq('id', building.id)
        .then(() => console.log('✅ View count updated'))
        .catch(err => console.error('❌ View count error:', err))

      const totalTime = Date.now() - startTime
      console.log('🏢 [SUCCESS] Total fetchBuildingData took:', totalTime, 'ms')

    } catch (err) {
      console.error('🏢 [ERROR] Error fetching building data:', err)
      console.error('🏢 [ERROR] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      
      // Fallback: устанавливаем минимальные данные, чтобы страница загрузилась
      console.log('🏢 [FALLBACK] Setting minimal data to prevent eternal loading')
      setData({
        reviews: [],
        relatedBlogPosts: [],
        relatedRoutes: [],
        userFavorite: null
      })
    } finally {
      console.log('🏢 [DEBUG] Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect triggered for building.id:', building.id)
    console.log('🔄 [DEBUG] Current loading state:', loading)
    fetchBuildingData()
  }, [building.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных здания...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка загрузки</h1>
          <p className="text-gray-600">Не удалось загрузить данные о здании</p>
          <button 
            onClick={fetchBuildingData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  const { reviews, relatedBlogPosts, relatedRoutes, userFavorite } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero секция с основной информацией */}
      <BuildingHeader 
        building={building} 
        userFavorite={userFavorite}
        onFavoriteUpdate={fetchBuildingData}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Основной контент */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Описание здания */}
            {building.description && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Описание</h2>
                <p className="text-gray-700 leading-relaxed">{building.description}</p>
              </div>
            )}

            {/* Дополнительные изображения */}
            {building.image_urls && building.image_urls.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Галерея</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {building.image_urls.map((imageUrl, index) => (
                    <div key={index} className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={getStorageUrl(imageUrl, 'photos')}
                        alt={`${building.name} - фото ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          console.error('🖼️ Gallery image loading error:', imageUrl)
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                        onLoad={(e) => {
                          console.log('✅ Gallery image loaded:', imageUrl)
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Историческая значимость */}
            {building.historical_significance && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <BuildingIcon className="h-5 w-5 mr-2 text-amber-600" />
                  Историческая значимость
                </h2>
                <p className="text-gray-700 leading-relaxed">{building.historical_significance}</p>
              </div>
            )}

            {/* Обзоры */}
            <BuildingReviews 
              reviews={reviews}
              buildingId={building.id}
              activeIndex={activeReviewIndex}
              onActiveIndexChange={setActiveReviewIndex}
              onReviewAdded={fetchBuildingData}
            />

            {/* Связанные маршруты */}
            {relatedRoutes.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Navigation className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold">Маршруты с этим зданием</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {relatedRoutes.map((route, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <Link href={`/routes/${route.id}`} className="block">
                        
                        {/* Изображение маршрута */}
                        {route.thumbnail_url && (
                          <img
                            src={route.thumbnail_url}
                            alt={route.title}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        )}
                        
                        {/* Заголовок и описание */}
                        <h4 className="font-medium text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                          {route.title}
                        </h4>
                        
                        {route.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {route.description}
                          </p>
                        )}
                        
                        {/* Метаинформация маршрута */}
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="mr-3">{route.city}, {route.country}</span>
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {route.estimated_duration_minutes 
                                ? `${Math.round(route.estimated_duration_minutes / 60)} ч`
                                : 'Время не указано'
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-500">
                              <Star className="h-3 w-3 mr-1 text-yellow-400" />
                              <span className="mr-3">
                                {(route.rating || 0) > 0 ? (route.rating || 0).toFixed(1) : 'Нет оценок'}
                              </span>
                              <Users className="h-3 w-3 mr-1" />
                              <span>{route.review_count || 0} отзывов</span>
                            </div>
                            
                            {/* Сложность */}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              route.difficulty_level === 'easy' 
                                ? 'bg-green-100 text-green-800'
                                : route.difficulty_level === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {route.difficulty_level === 'easy' && 'Легкий'}
                              {route.difficulty_level === 'medium' && 'Средний'}
                              {route.difficulty_level === 'hard' && 'Сложный'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            
            {/* Новости об этом здании */}
            <BuildingNews 
              buildingId={building.id}
              buildingName={building.name}
              limit={4}
              showTitle={true}
            />
            
            {/* Карта */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Расположение</h3>
              </div>
              <BuildingMap 
                building={building}
                className="h-64"
              />
            </div>

            {/* Основная информация */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Информация</h3>
              <div className="space-y-4">
                
                {building.architect && (
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Архитектор</span>
                      <p className="font-medium text-gray-900">{building.architect}</p>
                    </div>
                  </div>
                )}

                {building.year_built && (
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Год постройки</span>
                      <p className="font-medium text-gray-900">{building.year_built}</p>
                    </div>
                  </div>
                )}

                {building.architectural_style && (
                  <div className="flex items-start">
                    <Camera className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Архитектурный стиль</span>
                      <p className="font-medium text-gray-900">{building.architectural_style}</p>
                    </div>
                  </div>
                )}

                {building.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Адрес</span>
                      <p className="font-medium text-gray-900">{building.address}</p>
                    </div>
                  </div>
                )}

                {building.building_type && (
                  <div className="flex items-start">
                    <BuildingIcon className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Тип здания</span>
                      <p className="font-medium text-gray-900">{building.building_type}</p>
                    </div>
                  </div>
                )}

                {building.height_meters && (
                  <div className="flex items-start">
                    <Clock className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Высота</span>
                      <p className="font-medium text-gray-900">{building.height_meters} м</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Статистика */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Статистика</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-lg font-bold">{(building.rating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-gray-500">{building.review_count || 0} отзывов</span>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold mb-1">{(building.view_count || 0) + 1}</div>
                  <span className="text-sm text-gray-500">просмотров</span>
                </div>
              </div>
            </div>

            {/* Полезная информация */}
            {(building.entry_fee || building.opening_hours || building.website_url || building.best_visit_time) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Для посещения</h3>
                <div className="space-y-3">
                  
                  {building.entry_fee && (
                    <div>
                      <span className="text-sm text-gray-500 block">Стоимость входа</span>
                      <p className="font-medium text-gray-900">{building.entry_fee}</p>
                    </div>
                  )}

                  {building.website_url && (
                    <div>
                      <span className="text-sm text-gray-500 block">Веб-сайт</span>
                      <a 
                        href={building.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Открыть сайт
                      </a>
                    </div>
                  )}

                  {building.best_visit_time && (
                    <div>
                      <span className="text-sm text-gray-500 block">Лучшее время для посещения</span>
                      <p className="font-medium text-gray-900">{building.best_visit_time}</p>
                    </div>
                  )}

                  {building.accessibility_info && (
                    <div>
                      <span className="text-sm text-gray-500 block">Доступность</span>
                      <p className="font-medium text-gray-900">{building.accessibility_info}</p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Дополнительная информация */}
            {(building.construction_materials && building.construction_materials.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Дополнительно</h3>
                <div>
                  <span className="text-sm text-gray-500 block mb-2">Материалы строительства</span>
                  <div className="flex flex-wrap gap-2">
                    {building.construction_materials.map((material, index) => (
                      <span 
                        key={index}
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
