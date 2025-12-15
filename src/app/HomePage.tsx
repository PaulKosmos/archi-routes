// src/app/page.tsx - Улучшенная главная страница с витриной архитектуры
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../components/HeaderWithSuspense'
import HeroSectionWithMap from '../components/HeroSectionWithMap'
import CitiesExploreSection from '../components/CitiesExploreSection'
import BlogPostsSection from '../components/BlogPostsSection'
import NewsSection from '../components/NewsSection'
import PodcastsSection from '../components/PodcastsSection'
import EnhancedFooter from '../components/EnhancedFooter'
import { createClient } from '../lib/supabase'
// import { SmartRouteFilter } from '../lib/smart-route-filtering' // Временно отключено
import type { RouteWithUserData } from '../types/route'
import type { Building } from '../types/building'
import { getStorageUrl } from '../lib/storage'

// Динамический импорт карты
const LeafletMap = dynamic(() => import('../components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
    <span className="text-gray-500">Загрузка карты...</span>
  </div>
})

// Типы для маршрутов (обновленные)
interface Route {
  id: string
  title: string
  description: string
  difficulty_level: string
  is_published: boolean
  created_at: string
  created_by: string
  transport_mode: string
  route_geometry: GeoJSON.LineString | null
  distance_km: number
  estimated_duration_minutes: number
  route_visibility: 'private' | 'public' | 'featured'
  publication_status: string
  priority_score: number
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
    description?: string
  }[]
}

// Типы для обзоров
interface BuildingReview {
  id: string
  building_id: string
  user_id: string
  rating: number
  title?: string
  content?: string
  created_at: string
  profiles: {
    id: string
    full_name: string
    avatar_url?: string
  }
  buildings: {
    id: string
    name: string
    image_url?: string
  }
}

// Компонент улучшенной карусели
interface CarouselProps {
  buildings: Building[]
  onBuildingHover: (buildingId: string | null) => void
}

function BuildingsCarousel({ buildings, onBuildingHover }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const itemsPerView = 2 // Количество видимых элементов
  const itemWidth = 400 // Ширина элемента + gap (увеличена для более крупных карточек)
  const maxIndex = Math.max(0, buildings.length - itemsPerView)

  // Intersection Observer для анимации при появлении
  useEffect(() => {
    if (!carouselRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(carouselRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Автопрокрутка
  useEffect(() => {
    if (!isAutoPlaying || buildings.length <= itemsPerView) return

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1)
    }, 4000)

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, maxIndex, itemsPerView, buildings.length])

  // Обновление позиции прокрутки
  useEffect(() => {
    if (carouselRef.current && !isDragging) {
      const scrollPosition = currentIndex * itemWidth
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      })
    }
  }, [currentIndex, isDragging, itemWidth])

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => prev <= 0 ? maxIndex : prev - 1)
    setIsAutoPlaying(false)
  }, [maxIndex])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1)
    setIsAutoPlaying(false)
  }, [maxIndex])

  const handleDotClick = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }, [])

  // Обработка перетаскивания
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!carouselRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - carouselRef.current.offsetLeft)
    setScrollLeft(carouselRef.current.scrollLeft)
    setIsAutoPlaying(false)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return
    e.preventDefault()
    const x = e.pageX - carouselRef.current.offsetLeft
    const walk = (x - startX) * 2
    carouselRef.current.scrollLeft = scrollLeft - walk
  }, [isDragging, startX, scrollLeft])

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !carouselRef.current) return
    setIsDragging(false)
    
    // Определяем ближайший индекс на основе текущей позиции прокрутки
    const newIndex = Math.round(carouselRef.current.scrollLeft / itemWidth)
    setCurrentIndex(Math.max(0, Math.min(newIndex, maxIndex)))
  }, [isDragging, itemWidth, maxIndex])

  // Touch события для мобильных
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!carouselRef.current) return
    setIsDragging(true)
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft)
    setScrollLeft(carouselRef.current.scrollLeft)
    setIsAutoPlaying(false)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft
    const walk = (x - startX) * 2
    carouselRef.current.scrollLeft = scrollLeft - walk
  }, [isDragging, startX, scrollLeft])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !carouselRef.current) return
    setIsDragging(false)
    
    const newIndex = Math.round(carouselRef.current.scrollLeft / itemWidth)
    setCurrentIndex(Math.max(0, Math.min(newIndex, maxIndex)))
  }, [isDragging, itemWidth, maxIndex])

  if (buildings.length === 0) return null

  return (
    <div className="relative group">
      {/* Карусель */}
      <div
        ref={carouselRef}
        className={`overflow-x-hidden scrollbar-hide cursor-grab active:cursor-grabbing transition-opacity duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp()
          setIsAutoPlaying(true)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsAutoPlaying(false)}
      >
        <div className="flex space-x-6 pb-4" style={{ width: `${buildings.length * itemWidth}px` }}>
          {buildings.map((building, index) => (
            <Link
              key={building.id}
              href={`/buildings/${building.id}`}
              className="carousel-card flex-none w-[380px] bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group cursor-pointer border border-gray-100"
              onMouseEnter={() => onBuildingHover(building.id)}
              onMouseLeave={() => onBuildingHover(null)}
              style={{
                transform: isDragging ? 'scale(0.98)' : undefined,
                animationDelay: `${index * 0.1}s`
              }}
            >
              {building.image_url ? (
                <div className="relative h-72 overflow-hidden">
                  <Image
                    src={getStorageUrl(building.image_url, 'photos')}
                    alt={building.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  
                  {/* Индикатор "Новое" для недавно добавленных */}
                  {new Date(building.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                        Новое!
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-72 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-5a1 1 0 011-1h4a1 1 0 011 1v5M7 7h10M7 10h10M7 13h10" />
                  </svg>
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 leading-tight">
                  {building.name}
                </h3>

                <div className="space-y-1.5 mb-4 text-sm text-gray-600">
                  {building.architect && (
                    <p className="flex items-center">
                      <span className="font-semibold text-gray-700 mr-1.5">Архитектор:</span>
                      <span className="text-gray-600">{building.architect}</span>
                    </p>
                  )}
                  {building.year_built && building.architectural_style && (
                    <p className="flex items-center text-gray-600">
                      <span className="font-semibold text-gray-700 mr-1.5">Год:</span>
                      <span>{building.year_built}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="font-semibold text-gray-700 mr-1.5">Стиль:</span>
                      <span>{building.architectural_style}</span>
                    </p>
                  )}
                  {!building.architect && !building.year_built && !building.architectural_style && (
                    <p className="text-gray-500 italic">Детали недоступны</p>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">
                  {building.description || 'Уникальный архитектурный объект, заслуживающий внимания.'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-lg">★</span>
                    {building.rating && building.rating > 0 ? (
                      <>
                        <span className="text-sm text-gray-600 ml-1 font-medium">
                          {building.rating.toFixed(1)}
                        </span>
                        {building.review_count && building.review_count > 0 && (
                          <span className="text-xs text-gray-400 ml-2">
                            ({building.review_count} отз.)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-500 ml-1">Нет оценок</span>
                    )}
                  </div>
                  {building.city && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">
                        {building.city}
                      </span>
                      <span className="text-sm text-blue-600 group-hover:text-blue-700 font-medium">
                        Подробнее →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Навигационные кнопки */}
      {buildings.length > itemsPerView && (
        <>
          <button 
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
            aria-label="Предыдущий"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
            aria-label="Следующий"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Индикаторы (точки) */}
      {buildings.length > itemsPerView && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-blue-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Счетчик слайдов */}
      {buildings.length > itemsPerView && (
        <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {maxIndex + 1}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  // ✅ Создаем НОВЫЙ Supabase клиент для этого компонента
  const supabase = useMemo(() => {
    console.log('🔧 Home: Создан новый Supabase клиент')
    return createClient()
  }, [])
  
  const [buildings, setBuildings] = useState<Building[]>([])
  const [topBuildings, setTopBuildings] = useState<Building[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [recentReviews, setRecentReviews] = useState<BuildingReview[]>([])
  const [buildingOfTheDay, setBuildingOfTheDay] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [routesLoading, setRoutesLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalBuildings: 0,
    totalRoutes: 0,
    totalUsers: 0,
    totalReviews: 0
  })

  const fetchBuildings = useCallback(async () => {
    try {
      console.log('🏢 Загрузка зданий...')
      setLoading(true)
      
      const { data: allBuildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('created_at', { ascending: false })

      if (buildingsError) throw buildingsError

      console.log('🏢 Buildings loaded:', allBuildings?.length || 0)
      setBuildings(allBuildings || [])

      const { data: topBuildingsData, error: topError } = await supabase
        .from('buildings')
        .select('*')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(9)

      if (!topError && topBuildingsData && topBuildingsData.length > 0) {
        setTopBuildings(topBuildingsData)
        const randomIndex = Math.floor(Math.random() * Math.min(3, topBuildingsData.length))
        setBuildingOfTheDay(topBuildingsData[randomIndex])
      } else {
        if (allBuildings && allBuildings.length > 0) {
          const shuffled = [...allBuildings].sort(() => 0.5 - Math.random())
          setTopBuildings(shuffled.slice(0, 9))
          setBuildingOfTheDay(shuffled[0])
        }
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки зданий:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchRoutes = useCallback(async () => {
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
            description,
            latitude,
            longitude,
            order_index
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) {
        console.error('❌ Ошибка загрузки маршрутов:', error)
      } else {
        setRoutes(data || [])
        console.log(`✅ Загружено ${data?.length || 0} маршрутов`)
      }
    } catch (error: any) {
      console.error('❌ Исключение при загрузке маршрутов:', error)
    } finally {
      setRoutesLoading(false)
    }
  }, [supabase])

  const fetchRecentReviews = useCallback(async () => {
    try {
      console.log('💬 Загрузка последних обзоров...')
      setReviewsLoading(true)
      
      const { data, error } = await supabase
        .from('building_reviews')
        .select(`
          *,
          profiles (
            id,
            full_name,
            avatar_url
          ),
          buildings (
            id,
            name,
            image_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(6)

      if (!error && data) {
        setRecentReviews(data)
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки обзоров:', error)
    } finally {
      setReviewsLoading(false)
    }
  }, [supabase])

  const fetchStats = useCallback(async () => {
    try {
      const [buildingsCount, routesCount, usersCount, reviewsCount] = await Promise.all([
        supabase.from('buildings').select('id', { count: 'exact', head: true }),
        supabase.from('routes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('building_reviews').select('id', { count: 'exact', head: true })
      ])

      setStats({
        totalBuildings: buildingsCount.count || 0,
        totalRoutes: routesCount.count || 0,
        totalUsers: usersCount.count || 0,
        totalReviews: reviewsCount.count || 0
      })
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error)
    }
  }, [supabase])

  const fetchAllData = useCallback(async () => {
    console.log('🔄 fetchAllData: Загрузка всех данных главной страницы')
    await Promise.all([
      fetchBuildings(),
      fetchRoutes(),
      fetchRecentReviews(),
      fetchStats()
    ])
  }, [fetchBuildings, fetchRoutes, fetchRecentReviews, fetchStats])

  const refreshData = useCallback(() => {
    fetchAllData()
  }, [fetchAllData])

  useEffect(() => {
    console.log('🏠 Главная страница: Первичная загрузка данных')
    fetchAllData()
  }, [fetchAllData])

  useEffect(() => {
    console.log('🔔 Главная страница: Настройка Realtime subscriptions')
    
    const routesChannel = supabase
      .channel('home-routes-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'routes' }, 
        () => {
          console.log('🔄 Realtime: Обновление маршрутов')
          fetchRoutes()
        }
      )
      .subscribe((status) => {
        console.log('🔔 Routes channel status:', status)
      })
    
    const reviewsChannel = supabase
      .channel('home-reviews-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'building_reviews' }, 
        () => {
          console.log('🔄 Realtime: Обновление обзоров')
          fetchRecentReviews()
        }
      )
      .subscribe((status) => {
        console.log('🔔 Reviews channel status:', status)
      })

    return () => {
      console.log('🧹 Главная страница: Закрываем Realtime subscriptions')
      supabase.removeChannel(routesChannel)
      supabase.removeChannel(reviewsChannel)
    }
  }, [fetchRoutes, fetchRecentReviews])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Header buildings={buildings} onRouteCreated={refreshData} />
      
      <main>
        {/* Hero секция с размытой картой и поиском по городам */}
        <HeroSectionWithMap />

        {/* Блок быстрого доступа к городам */}
        <CitiesExploreSection />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Архитектурные объекты - объединенный блок */}
          {!loading && buildings.length > 0 && (
            <div className="mb-16 animate-fade-in">
              {/* Общий заголовок секции */}
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🏛️ Архитектурные объекты
                </h2>
                <p className="text-gray-600">
                  Коллекция уникальных зданий для изучения и вдохновения
                </p>
              </div>

              {/* Здание дня - компактная hero-карточка */}
              {buildingOfTheDay && (
                <div className="mb-12">
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 group">
                    <div className="md:flex">
                      <div className="md:w-5/12 relative overflow-hidden">
                        {buildingOfTheDay.image_url ? (
                          <Image
                            src={getStorageUrl(buildingOfTheDay.image_url, 'photos')}
                            alt={buildingOfTheDay.name}
                            width={500}
                            height={350}
                            className="w-full h-80 md:h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-80 md:h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <svg className="w-20 h-20 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-5a1 1 0 011-1h4a1 1 0 011 1v5M7 7h10M7 10h10M7 13h10" />
                            </svg>
                          </div>
                        )}
                        {/* Градиент оверлей */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>

                      <div className="md:w-7/12 p-6 md:p-8 flex flex-col justify-center">
                        <div className="flex items-center mb-3">
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md animate-pulse">
                            ⭐ Здание дня
                          </span>
                          {buildingOfTheDay.rating && (
                            <div className="ml-3 flex items-center">
                              <span className="text-yellow-400 text-lg">★</span>
                              <span className="text-gray-700 ml-1 font-semibold">
                                {buildingOfTheDay.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                          {buildingOfTheDay.name}
                        </h3>

                        <div className="space-y-1.5 mb-4 text-sm text-gray-600">
                          {buildingOfTheDay.architect && (
                            <p className="flex items-center">
                              <span className="font-semibold text-gray-700 mr-1.5">Архитектор:</span>
                              <span>{buildingOfTheDay.architect}</span>
                            </p>
                          )}
                          {buildingOfTheDay.year_built && buildingOfTheDay.architectural_style && (
                            <p className="flex items-center">
                              <span className="font-semibold text-gray-700 mr-1.5">Год:</span>
                              <span>{buildingOfTheDay.year_built}</span>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className="font-semibold text-gray-700 mr-1.5">Стиль:</span>
                              <span>{buildingOfTheDay.architectural_style}</span>
                            </p>
                          )}
                        </div>

                        <p className="text-gray-600 text-sm mb-6 leading-relaxed line-clamp-3">
                          {buildingOfTheDay.description || 'Уникальный архитектурный объект, заслуживающий особого внимания.'}
                        </p>

                        <Link
                          href={`/buildings/${buildingOfTheDay.id}`}
                          className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg self-start"
                        >
                          Исследовать здание
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Разделитель с текстом */}
              <div className="flex items-center my-10">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-4 text-sm font-medium text-gray-500">Популярные объекты</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Карусель с остальными зданиями */}
              <BuildingsCarousel
                buildings={buildings}
                onBuildingHover={setSelectedBuilding}
              />

              {/* Кнопка "Все здания" */}
              <div className="text-center mt-10">
                <Link
                  href="/buildings"
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105"
                >
                  Все здания
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          )}



          {/* Последние обзоры */}
          {recentReviews.length > 0 && (
            <div className="mb-16 animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  💬 Последние обзоры
                </h2>
                <p className="text-gray-600">
                  Свежие впечатления от посещения архитектурных объектов
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentReviews.slice(0, 6).map((review, index) => (
                  <div 
                    key={review.id} 
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100 transform hover:scale-105 animate-fade-in-stagger"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center mb-4">
                      {review.profiles?.avatar_url ? (
                        <Image
                          src={getStorageUrl(review.profiles.avatar_url, 'photos')}
                          alt={review.profiles.full_name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {review.profiles?.full_name?.charAt(0) || 'А'}
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {review.profiles?.full_name || 'Анонимный пользователь'}
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm transition-colors ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <Link href={`/buildings/${review.building_id}`} className="block hover:text-blue-600 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {review.buildings?.name || 'Здание'}
                      </h4>
                    </Link>
                    
                    {review.title && (
                      <h5 className="font-medium text-gray-800 mb-2">
                        {review.title}
                      </h5>
                    )}
                    
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {review.content || 'Отличное здание, рекомендую к посещению!'}
                    </p>
                    
                    <div className="text-xs text-gray-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(review.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <Link
                  href="/reviews"
                  className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105"
                >
                  Все обзоры
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Блог: Путешествия */}
        <BlogPostsSection />

        {/* Новости архитектуры */}
        <NewsSection />

        {/* Подкасты */}
        <PodcastsSection />
      </main>
      
      {/* Улучшенный Footer */}
      <EnhancedFooter />

      {/* CSS анимации */}
      <style jsx>{`
        :root {
          --carousel-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          --carousel-shadow-hover: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 10px 20px -8px rgba(0, 0, 0, 0.15);
          --carousel-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .carousel-card {
          box-shadow: var(--carousel-shadow);
          transition: var(--carousel-transition);
        }

        .carousel-card:hover {
          box-shadow: var(--carousel-shadow-hover);
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s both;
        }

        .animate-fade-in-stagger {
          animation: fade-in 0.6s ease-out both;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }

        .animate-slide-up-delay {
          animation: slide-up 0.8s ease-out 0.3s both;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}