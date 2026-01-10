'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Building, BuildingReviewWithProfile } from '@/types/building'
import { Route } from '@/types/route'
import BuildingHeader from '@/components/buildings/BuildingHeader'
import BuildingReviews from '@/components/buildings/BuildingReviews'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Clock, Users, Star, Camera, Navigation, Calendar, User, Building as BuildingIcon } from 'lucide-react'
import Link from 'next/link'
import { getStorageUrl } from '@/lib/storage'
import BuildingNews from '@/components/news/BuildingNews'

// Динамический импорт BuildingMap для избежания SSR ошибки с Leaflet
const BuildingMap = dynamic(() => import('@/components/buildings/BuildingMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 animate-pulse flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
})

interface BuildingModalContentProps {
  building: Building
  onOpenAddReview?: () => void
}

interface BuildingPageData {
  reviews: BuildingReviewWithProfile[]
  relatedBlogPosts: any[]
  relatedRoutes: any[]
  userFavorite: any
}

export default function BuildingModalContent({ building, onOpenAddReview }: BuildingModalContentProps) {
  const supabase = useMemo(() => createClient(), [])
  console.log('🏢 [MODAL] BuildingModalContent component rendered')
  console.log('🏢 [MODAL] Building prop:', building)
  
  const [data, setData] = useState<BuildingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  
  console.log('🏢 [MODAL] Component state - loading:', loading, 'data:', data)
  
  const fetchBuildingData = async () => {
    console.log('🏢 [MODAL] fetchBuildingData function called')
    
    try {
      console.log('🏢 [MODAL] Setting loading to true')
      setLoading(true)
      
      console.log('🏢 [MODAL] Starting fetchBuildingData for:', building.id)
      
      // Диагностика подключения к Supabase
      console.log('🔌 [MODAL] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
      console.log('🔌 [MODAL] Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
      
      // Простой тест подключения
      console.log('🔌 [MODAL] Testing Supabase connection...')
      const { data: testData, error: testError } = await supabase
        .from('buildings')
        .select('id')
        .eq('id', building.id)
        .single()
      
      if (testError) {
        console.error('🔌 [ERROR] Supabase connection test failed:', testError)
        throw new Error(`Supabase connection failed: ${testError.message}`)
      } else {
        console.log('🔌 [SUCCESS] Supabase connection OK, building exists')
      }
      
      const startTime = Date.now()
      
      // Упрощенные запросы БЕЗ таймаутов - делаем последовательно для диагностики
      
      // 1. Получаем обзоры с профилями авторов
      console.log('📝 [MODAL] Fetching reviews...')
      let reviews = []
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('building_reviews')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('building_id', building.id)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
        
        if (reviewsError) {
          console.error('📝 [ERROR] Reviews error:', reviewsError)
        } else {
          reviews = reviewsData || []
          console.log('📝 [SUCCESS] Reviews loaded:', reviews.length)
        }
      } catch (err) {
        console.error('📝 [ERROR] Reviews exception:', err)
      }

      // 2. Получаем связанные блог-посты (упрощенный запрос)
      console.log('📰 [MODAL] Fetching blog posts...')
      let blogPosts = []
      try {
        const { data: blogData, error: blogError } = await supabase
          .from('blog_post_buildings')
          .select('post_id')
          .eq('building_id', building.id)
        
        if (blogError) {
          console.error('📰 [ERROR] Blog posts error:', blogError)
          // Не критичная ошибка - продолжаем с пустым массивом
          blogPosts = []
        } else {
          blogPosts = blogData || []
          console.log('📰 [SUCCESS] Blog posts loaded:', blogPosts.length)
        }
      } catch (err) {
        console.error('📰 [ERROR] Blog posts exception:', err)
        // Не критичная ошибка - продолжаем с пустым массивом
        blogPosts = []
      }

      // 3. Получаем маршруты (упрощенный запрос)
      console.log('🛤️ [MODAL] Fetching routes...')
      let routes = []
      try {
        const { data: routesData, error: routesError } = await supabase
          .from('route_points')
          .select('route_id')
          .eq('building_id', building.id)
          .limit(5)
        
        if (routesError) {
          console.error('🛤️ [ERROR] Routes error:', routesError)
        } else {
          routes = routesData || []
          console.log('🛤️ [SUCCESS] Routes loaded:', routes.length)
        }
      } catch (err) {
        console.error('🛤️ [ERROR] Routes exception:', err)
      }

      // 4. Проверяем избранное
      console.log('⭐ [MODAL] Checking user favorites...')
      let userFavorite = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: favorite, error: favoriteError } = await supabase
            .from('user_building_favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('building_id', building.id)
            .maybeSingle()
          
          if (favoriteError) {
            console.error('⭐ [ERROR] Favorite error:', favoriteError)
          } else {
            userFavorite = favorite
            console.log('⭐ [SUCCESS] User favorite status:', !!favorite)
          }
        }
      } catch (err) {
        console.error('⭐ [ERROR] Favorite exception:', err)
      }

      console.log('🔄 [MODAL] Setting data state...')
      setData({
        reviews: reviews || [],
        relatedBlogPosts: blogPosts || [],
        relatedRoutes: routes || [],
        userFavorite
      })

      // Увеличиваем счетчик просмотров (в фоне, не блокирующе)
      supabase
        .from('buildings')
        .update({ view_count: (building.view_count || 0) + 1 })
        .eq('id', building.id)
        .then(() => console.log('📊 [SUCCESS] View count updated'))
        .catch(err => console.log('📊 [ERROR] Could not update view count:', err))

      const totalTime = Date.now() - startTime
      console.log('🏢 [SUCCESS] Total fetchBuildingData took:', totalTime, 'ms')

    } catch (err: any) {
      console.error('🏢 [ERROR] Error fetching building data:', err)
      
      // Fallback: устанавливаем минимальные данные
      console.log('🏢 [FALLBACK] Setting minimal data to prevent eternal loading')
      setData({
        reviews: [],
        relatedBlogPosts: [],
        relatedRoutes: [],
        userFavorite: null
      })
    } finally {
      console.log('🏢 [MODAL] Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔄 [MODAL] useEffect triggered for building.id:', building.id)
    
    let isMounted = true
    
    const loadData = async () => {
      if (isMounted) {
        await fetchBuildingData()
      }
    }
    
    loadData()
    
    return () => {
      isMounted = false
      console.log('🔄 [MODAL] useEffect cleanup for building.id:', building.id)
    }
  }, [building.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading building data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Error</h1>
          <p className="text-gray-600">Failed to load building data</p>
        </div>
      </div>
    )
  }

  const { reviews, relatedBlogPosts, relatedRoutes, userFavorite } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero секция с основной информацией - БЕЗ Header */}
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
                <h2 className="text-xl font-semibold mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed">{building.description}</p>
              </div>
            )}

            {/* Дополнительные изображения */}
            {building.image_urls && building.image_urls.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {building.image_urls.map((imageUrl, index) => (
                    <div key={index} className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={getStorageUrl(imageUrl, 'photos')}
                        alt={`${building.name} - photo ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Обзоры */}
            <BuildingReviews 
              reviews={reviews}
              buildingId={building.id}
              activeIndex={activeReviewIndex}
              onActiveIndexChange={setActiveReviewIndex}
              onReviewAdded={fetchBuildingData}
              onOpenAddReview={onOpenAddReview}
            />

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
                <h3 className="font-semibold">Location</h3>
              </div>
              <BuildingMap
                building={building}
                className="h-64"
              />
            </div>

            {/* Основная информация */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              <div className="space-y-4">

                {building.architect && (
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Architect</span>
                      <p className="font-medium text-gray-900">{building.architect}</p>
                    </div>
                  </div>
                )}

                {building.year_built && (
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Year Built</span>
                      <p className="font-medium text-gray-900">{building.year_built}</p>
                    </div>
                  </div>
                )}

                {building.architectural_style && (
                  <div className="flex items-start">
                    <Camera className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Architectural Style</span>
                      <p className="font-medium text-gray-900">{building.architectural_style}</p>
                    </div>
                  </div>
                )}

                {building.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">Address</span>
                      <p className="font-medium text-gray-900">{building.address}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
