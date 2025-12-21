'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, ExternalLink, Heart, BookmarkPlus, MapPin, Calendar, User as UserIcon, Building2, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Trash2, Info, DollarSign, TrendingUp, Clock, Bus, Accessibility, Layers, BookOpen } from 'lucide-react'
import type { Building, BuildingReviewWithProfile } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import BuildingReviewsList from './buildings/BuildingReviewsList'
import AddReviewModal from './AddReviewModal'
import AddToCollectionButton from './collections/AddToCollectionButton'
import ImageLightbox from './ui/ImageLightbox'
import Link from 'next/link'

interface BuildingModalProps {
  building: Building | null
  isOpen: boolean
  onClose: () => void
}

interface RouteInfo {
  id: string
  title: string
  description: string | null
  distance_km: number | null
  estimated_duration_minutes: number | null
  points_count: number | null
}

interface NewsInfo {
  id: string
  title: string
  summary: string | null
  published_at: string | null
  featured_image_url: string | null
  slug: string
}

// Словари для локализации
const difficultyLabels: Record<string, string> = {
  'easy': 'Легко',
  'moderate': 'Умеренно',
  'difficult': 'Сложно',
  'very_difficult': 'Очень сложно'
}

const timeLabels: Record<string, string> = {
  'morning': 'Утром',
  'afternoon': 'Днем',
  'evening': 'Вечером',
  'night': 'Ночью',
  'any_time': 'Любое время',
  'weekdays': 'Будни',
  'weekends': 'Выходные'
}

export default function BuildingModalNew({ building, isOpen, onClose }: BuildingModalProps) {
  // ✅ Создаем НОВЫЙ Supabase клиент для этого компонента
  const supabase = useMemo(() => createClient(), [])
  
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'reviews' | 'routes' | 'news'>('reviews')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPracticalInfo, setShowPracticalInfo] = useState(false)
  
  // Проверка прав на редактирование/удаление
  const canEdit = user && building && (
    user.id === building.created_by ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator'
  )

  // Проверка наличия практической информации
  const getPracticalInfoCount = () => {
    if (!building) return 0
    let count = 0
    if (building.website_url) count++
    if (building.entry_fee) count++
    if (building.visit_difficulty) count++
    if (building.best_visit_time) count++
    if (building.nearby_transport && building.nearby_transport.length > 0) count++
    if (building.accessibility && building.accessibility.length > 0) count++
    if (building.construction_materials && building.construction_materials.length > 0) count++
    if (building.historical_significance) count++
    return count
  }

  const practicalInfoCount = getPracticalInfoCount()
  const hasPracticalInfo = practicalInfoCount > 0

  // Отладка прав
  useEffect(() => {
    if (isOpen && building) {
      console.log('🔐 BuildingModalNew - права редактирования:', {
        user: !!user,
        userId: user?.id,
        buildingCreatedBy: building.created_by,
        profileRole: profile?.role,
        canEdit
      })
    }
  }, [isOpen, building, user, profile, canEdit])
  
  // Данные табов
  const [reviews, setReviews] = useState<BuildingReviewWithProfile[]>([])
  const [routes, setRoutes] = useState<RouteInfo[]>([])
  const [news, setNews] = useState<NewsInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [routeViewMode, setRouteViewMode] = useState<'personal' | 'public'>('personal')

  // Счётчики для вкладок (загружаются сразу при открытии)
  const [routesCount, setRoutesCount] = useState(0)
  const [newsCount, setNewsCount] = useState(0)
  
  // Hero галерея
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  
  // Ref для отслеживания был ли увеличен счетчик
  const viewCountIncremented = useRef(false)

  useEffect(() => {
    if (building && isOpen && user) {
      checkFavoriteStatus()
    }
  }, [building, isOpen, user])

  useEffect(() => {
    if (!building || !isOpen) {
      // Сброс при закрытии
      if (!isOpen) {
        setReviews([])
        setRoutes([])
        setNews([])
        setRoutesCount(0)
        setNewsCount(0)
        setActiveTab('reviews')
      }
      return
    }

    console.log('🏢 BuildingModalNew: Загрузка данных для', building.id, building.name)
    loadTabData()
  }, [building?.id, isOpen, activeTab, refreshKey, routeViewMode, user])

  // Загрузка счётчиков при открытии модального окна
  useEffect(() => {
    if (!building || !isOpen) return
    loadCounts()
  }, [building?.id, isOpen, user])

  // Отдельный useEffect для счетчика просмотров (только при первом открытии)
  useEffect(() => {
    if (!building || !isOpen) {
      // Сброс при закрытии
      viewCountIncremented.current = false
      return
    }
    
    // Увеличиваем только если еще не увеличивали для этого здания
    if (!viewCountIncremented.current) {
      console.log('📊 Вызов incrementViewCount для:', building.name)
      incrementViewCount()
      viewCountIncremented.current = true
    }
  }, [building?.id, isOpen])

  const incrementViewCount = async () => {
    if (!building) return
    
    try {
      console.log('📊 Увеличиваем view_count для здания:', building.name, 'с', building.view_count, 'на', (building.view_count || 0) + 1)
      
      const { error } = await supabase
        .from('buildings')
        .update({ view_count: (building.view_count || 0) + 1 })
        .eq('id', building.id)
      
      if (error) {
        console.error('❌ Ошибка обновления view_count:', error)
      } else {
        console.log('✅ view_count успешно обновлен в БД')
      }
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  const checkFavoriteStatus = async () => {
    if (!user || !building) return
    
    try {
      const { data } = await supabase
        .from('user_building_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('building_id', building.id)
        .single()
      
      setIsFavorite(!!data)
    } catch (error) {
      // Не в избранном
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Войдите, чтобы добавить в избранное')
      return
    }
    
    if (!building) return

    try {
      if (isFavorite) {
        await supabase
          .from('user_building_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('building_id', building.id)
        
        setIsFavorite(false)
        toast.success('Удалено из избранного')
      } else {
        await supabase
          .from('user_building_favorites')
          .insert({
            user_id: user.id,
            building_id: building.id,
            visit_status: 'want_to_visit'
          })
        
        setIsFavorite(true)
        toast.success('✅ Добавлено в избранное!')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Ошибка')
    }
  }

  const loadCounts = async () => {
    if (!building) return

    try {
      // Загружаем количество маршрутов
      const { data: routeData } = await supabase
        .from('route_points')
        .select(`
          route_id,
          routes:route_id (
            id,
            created_by,
            route_visibility,
            is_published
          )
        `)
        .eq('building_id', building.id)

      let uniqueRoutes = routeData
        ?.filter(item => item.routes)
        .map(item => item.routes as any)
        .filter((route, index, self) =>
          index === self.findIndex(r => r.id === route.id)
        ) || []

      // Подсчитываем общее количество (личные + публичные)
      const personalCount = user ? uniqueRoutes.filter(r => r.created_by === user.id).length : 0
      const publicCount = uniqueRoutes.filter(r => r.is_published && r.route_visibility === 'public').length
      setRoutesCount(Math.max(personalCount, publicCount))

      // Загружаем количество новостей
      const { count: newsCountData } = await supabase
        .from('architecture_news')
        .select('id', { count: 'exact', head: true })
        .contains('related_buildings', [building.id])
        .eq('status', 'published')

      setNewsCount(newsCountData || 0)
    } catch (error) {
      console.error('Error loading counts:', error)
    }
  }

  const loadTabData = async () => {
    if (!building) return

    setLoading(true)
    try {
      if (activeTab === 'reviews') {
        const { data } = await supabase
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
          .order('created_at', { ascending: false })

        setReviews(data || [])
      } else if (activeTab === 'routes') {
        const { data } = await supabase
          .from('route_points')
          .select(`
            route_id,
            routes:route_id (
              id,
              title,
              description,
              distance_km,
              estimated_duration_minutes,
              points_count,
              created_by,
              route_visibility,
              is_published
            )
          `)
          .eq('building_id', building.id)

        let uniqueRoutes = data
          ?.filter(item => item.routes)
          .map(item => item.routes as unknown as RouteInfo & { created_by: string, route_visibility: string, is_published: boolean })
          .filter((route, index, self) =>
            index === self.findIndex(r => r.id === route.id)
          ) || []

        // Фильтруем по режиму просмотра
        if (routeViewMode === 'personal' && user) {
          uniqueRoutes = uniqueRoutes.filter(r => r.created_by === user.id)
        } else if (routeViewMode === 'public') {
          uniqueRoutes = uniqueRoutes.filter(r => r.is_published && r.route_visibility === 'public')
        }

        setRoutes(uniqueRoutes)
        setRoutesCount(uniqueRoutes.length)
      } else if (activeTab === 'news') {
        const { data } = await supabase
          .from('architecture_news')
          .select('id, title, summary, published_at, featured_image_url, slug')
          .contains('related_buildings', [building.id])
          .eq('status', 'published')
          .order('published_at', { ascending: false })

        setNews(data || [])
        setNewsCount(data?.length || 0)
      }
    } catch (error) {
      console.error('Error loading tab data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSuccess = () => {
    setRefreshKey(prev => prev + 1)
    toast.success('Обзор добавлен!')
  }

  const handleOpenInNewTab = () => {
    if (building) {
      window.open(`/buildings/${building.id}`, '_blank')
    }
  }

  const handleAddressClick = () => {
    if (building) {
      window.open(`/test-map?building=${building.id}`, '_blank')
    }
  }

  if (!isOpen || !building) return null

  // Hero фото: первые фото из обзоров
  const heroPhotos = reviews
    .filter(r => r.photos && r.photos.length > 0)
    .map(r => r.photos![0])
  
  // Если нет обзоров с фото, показываем фото здания
  const displayHeroPhotos = heroPhotos.length > 0 
    ? heroPhotos 
    : (building.image_url ? [building.image_url] : [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full md:w-11/12 max-w-5xl max-h-[95vh] md:max-h-[90vh] bg-card md:rounded-[var(--radius)] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card shrink-0">
          <h2 className="text-base md:text-xl font-semibold font-display text-foreground truncate flex-1 mr-2 md:mr-4">
            {building.name}
          </h2>

          <div className="flex items-center space-x-1 md:space-x-2">
            {/* Кнопка избранного */}
            <button
              onClick={toggleFavorite}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorite ? 'fill-current text-red-600' : 'text-gray-600'}`} />
            </button>

            {/* Кнопка коллекции */}
            <AddToCollectionButton
              buildingId={building.id}
              buildingName={building.name}
              size="sm"
              variant="icon"
            />

            {/* Кнопка редактирования (только для создателя/админа/модератора) */}
            {canEdit && (
              <button
                onClick={() => {
                  console.log('🔧 Открытие редактирования здания:', building.id)
                  window.open(`/buildings/${building.id}/edit`, '_blank')
                }}
                className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Редактировать здание"
              >
                <Pencil className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </button>
            )}

            {/* Открыть в новом окне - скрыто на мобильных */}
            <button
              onClick={handleOpenInNewTab}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Открыть в новом окне"
            >
              <ExternalLink className="w-5 h-5 text-gray-600" />
            </button>

            {/* Закрыть */}
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Закрыть"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Hero: Фото на всю ширину (галерея из обзоров) */}
          {displayHeroPhotos.length > 0 && (
            <div className="relative w-full h-48 md:h-64 lg:h-80 bg-gray-100 group">
              <button
                onClick={() => {
                  setIsLightboxOpen(true)
                }}
                className="w-full h-full"
              >
                <img
                  src={getStorageUrl(displayHeroPhotos[heroPhotoIndex], 'photos')}
                  alt={building.name}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Навигация между фото */}
              {displayHeroPhotos.length > 1 && (
                <>
                  {/* Счетчик фото */}
                  <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black/60 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium">
                    {heroPhotoIndex + 1} / {displayHeroPhotos.length}
                  </div>

                  {/* Стрелки */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setHeroPhotoIndex(prev => prev > 0 ? prev - 1 : displayHeroPhotos.length - 1)
                    }}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-white/80 hover:bg-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setHeroPhotoIndex(prev => prev < displayHeroPhotos.length - 1 ? prev + 1 : 0)
                    }}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-white/80 hover:bg-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
                  </button>

                  {/* Точки индикаторы */}
                  <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
                    {displayHeroPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          setHeroPhotoIndex(idx)
                        }}
                        className={`h-1.5 md:h-2 rounded-full transition-all ${
                          idx === heroPhotoIndex
                            ? 'bg-white w-6 md:w-8'
                            : 'bg-white/60 hover:bg-white/80 w-1.5 md:w-2'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Компактная информация */}
          <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-2 md:py-4">
            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
              {/* Строка 1: Архитектор и просмотры */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                {building.architect && (
                  <div className="flex items-center text-gray-700">
                    <UserIcon className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-gray-500" />
                    <span className="font-medium">{building.architect}</span>
                  </div>
                )}

                {building.view_count > 0 && (
                  <div className="flex items-center text-gray-600">
                    <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    <span className="hidden sm:inline">{building.view_count} просмотров</span>
                    <span className="sm:hidden">{building.view_count}</span>
                  </div>
                )}
              </div>

              {/* Строка 2: Год и стиль */}
              <div className="flex items-center gap-3 md:gap-6 text-gray-600 flex-wrap">
                {building.year_built && (
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-gray-500" />
                    {building.year_built}
                  </div>
                )}

                {building.architectural_style && (
                  <div className="flex items-center">
                    <Building2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-gray-500" />
                    <span className="truncate">{building.architectural_style}</span>
                  </div>
                )}
              </div>

              {/* Строка 3: Адрес (кликабельный) */}
              {building.address && (
                <button
                  onClick={handleAddressClick}
                  className="flex items-start text-gray-600 hover:text-blue-600 transition-colors cursor-pointer group w-full text-left"
                  title="Показать на карте"
                >
                  <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-gray-500 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="group-hover:underline line-clamp-2">{building.address}, {building.city}</span>
                </button>
              )}
            </div>
          </div>

          {/* Практическая информация (аккордеон) */}
          {hasPracticalInfo && (
            <div className="border-b border-gray-200">
              <button
                onClick={() => setShowPracticalInfo(!showPracticalInfo)}
                className="w-full px-3 md:px-6 py-3 md:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  <span className="font-medium text-sm md:text-base">
                    Практическая информация
                    <span className="ml-2 text-xs md:text-sm text-gray-500">({practicalInfoCount})</span>
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${showPracticalInfo ? 'rotate-180' : ''}`} />
              </button>

              {showPracticalInfo && (
                <div className="px-3 md:px-6 py-3 md:py-4 space-y-1.5 md:space-y-2 bg-gray-50 text-xs md:text-sm">
                  {/* Сайт */}
                  {building.website_url && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <a
                        href={building.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        Официальный сайт
                      </a>
                    </div>
                  )}

                  {/* Стоимость */}
                  {building.entry_fee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700">{building.entry_fee}</span>
                    </div>
                  )}

                  {/* Сложность посещения */}
                  {building.visit_difficulty && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        Сложность: {difficultyLabels[building.visit_difficulty] || building.visit_difficulty}
                      </span>
                    </div>
                  )}

                  {/* Лучшее время */}
                  {building.best_visit_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        Лучшее время: {timeLabels[building.best_visit_time] || building.best_visit_time}
                      </span>
                    </div>
                  )}

                  {/* Транспорт */}
                  {building.nearby_transport && building.nearby_transport.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Транспорт:</span>
                      </div>
                      <ul className="ml-6 space-y-0.5">
                        {building.nearby_transport.map((transport, idx) => (
                          <li key={idx} className="text-gray-600 text-xs md:text-sm">• {transport}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Доступность */}
                  {building.accessibility && building.accessibility.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Accessibility className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Доступность:</span>
                      </div>
                      <ul className="ml-6 space-y-0.5">
                        {building.accessibility.map((item, idx) => (
                          <li key={idx} className="text-gray-600 text-xs md:text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Материалы строительства */}
                  {building.construction_materials && building.construction_materials.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Материалы:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {building.construction_materials.map((material, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Историческое значение */}
                  {building.historical_significance && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Историческое значение:</span>
                      </div>
                      <p className="text-gray-600 leading-snug text-xs md:text-sm whitespace-pre-line">
                        {building.historical_significance}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Табы */}
          <div className="bg-white border-b border-gray-200 px-3 md:px-6">
            <div className="flex space-x-4 md:space-x-6">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3 border-b-2 font-medium transition-colors text-sm md:text-base ${
                  activeTab === 'reviews'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📝 Обзоры
                {reviews.length > 0 && ` (${reviews.length})`}
              </button>

              <button
                onClick={() => setActiveTab('routes')}
                className={`py-3 border-b-2 font-medium transition-colors text-sm md:text-base ${
                  activeTab === 'routes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🗺️ Маршруты
                {routesCount > 0 && ` (${routesCount})`}
              </button>

              <button
                onClick={() => setActiveTab('news')}
                className={`py-3 border-b-2 font-medium transition-colors text-sm md:text-base ${
                  activeTab === 'news'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📰 Новости
                {newsCount > 0 && ` (${newsCount})`}
              </button>
            </div>
          </div>

          {/* Контент табов */}
          <div className="p-3 md:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Таб Обзоры */}
                {activeTab === 'reviews' && (
                  <BuildingReviewsList
                    reviews={reviews}
                    buildingId={building.id}
                    onOpenAddReview={() => setIsAddReviewModalOpen(true)}
                  />
                )}

                {/* Таб Маршруты */}
                {activeTab === 'routes' && (
                  <div className="space-y-4">
                    {/* Переключатель Личные/Общественные */}
                    <div className="flex items-center justify-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setRouteViewMode('personal')}
                        className={`flex-1 px-3 py-2 md:px-4 rounded-md font-medium text-sm transition-colors ${
                          routeViewMode === 'personal'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🙋 Личные
                      </button>
                      <button
                        onClick={() => setRouteViewMode('public')}
                        className={`flex-1 px-3 py-2 md:px-4 rounded-md font-medium text-sm transition-colors ${
                          routeViewMode === 'public'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🌍 Общественные
                      </button>
                    </div>

                    {routes.length === 0 ? (
                      <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
                        📭 {routeViewMode === 'personal'
                          ? 'У вас пока нет личных маршрутов с этим зданием'
                          : 'Это здание пока не включено в общественные маршруты'}
                      </div>
                    ) : (
                      routes.map(route => (
                        <Link
                          key={route.id}
                          href={`/routes/${route.id}`}
                          className="block p-3 md:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-base md:text-lg text-gray-900 mb-1.5 md:mb-2">
                            {route.title}
                          </h3>
                          {route.description && (
                            <p className="text-gray-600 text-sm mb-2 md:mb-3 line-clamp-2">
                              {route.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 md:gap-4 text-xs text-gray-500 flex-wrap">
                            {route.distance_km && (
                              <span>📏 {route.distance_km.toFixed(1)} км</span>
                            )}
                            {route.estimated_duration_minutes && (
                              <span>⏱️ {route.estimated_duration_minutes} мин</span>
                            )}
                            {route.points_count && (
                              <span>📍 {route.points_count} точек</span>
                            )}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}

                {/* Таб Новости */}
                {activeTab === 'news' && (
                  <div className="space-y-3 md:space-y-4">
                    {news.length === 0 ? (
                      <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
                        📭 Пока нет новостей об этом здании
                      </div>
                    ) : (
                      news.map(item => (
                        <Link
                          key={item.id}
                          href={`/news/${item.slug}`}
                          className="block border border-gray-200 rounded-lg p-3 md:p-4 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-base md:text-lg text-gray-900 mb-1.5 md:mb-2 hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                          {item.summary && (
                            <p className="text-gray-600 text-sm mb-1.5 md:mb-2 line-clamp-2">
                              {item.summary}
                            </p>
                          )}
                          {item.published_at && (
                            <p className="text-xs text-gray-500">
                              📅 {new Date(item.published_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Модальное окно добавления обзора */}
      <AddReviewModal
        isOpen={isAddReviewModalOpen}
        onClose={() => setIsAddReviewModalOpen(false)}
        building={building}
        onSuccess={handleReviewSuccess}
      />

      {/* Lightbox для hero фото */}
      <ImageLightbox
        images={displayHeroPhotos.map(p => getStorageUrl(p, 'photos'))}
        initialIndex={heroPhotoIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  )
}

