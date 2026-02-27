'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, ExternalLink, Heart, BookmarkPlus, MapPin, Calendar, User as UserIcon, Building2, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Trash2, Info, DollarSign, TrendingUp, Clock, Bus, Accessibility, Layers, BookOpen, Star, Ruler, Globe, Route as RouteIcon, Share2 } from 'lucide-react'
import type { Building, BuildingReviewWithProfile, Route } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import BuildingReviewsList from './buildings/BuildingReviewsList'
import AddReviewModal from './AddReviewModal'
import AddToCollectionButton from './collections/AddToCollectionButton'
import ImageLightbox from './ui/ImageLightbox'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const RouteViewerModal = dynamic(() => import('./RouteViewerModal'), { ssr: false })

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
  'easy': 'Easy',
  'moderate': 'Moderate',
  'difficult': 'Difficult',
  'very_difficult': 'Very Difficult'
}

const timeLabels: Record<string, string> = {
  'morning': 'Morning',
  'afternoon': 'Afternoon',
  'evening': 'Evening',
  'night': 'Night',
  'any_time': 'Any Time',
  'weekdays': 'Weekdays',
  'weekends': 'Weekends'
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
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [routeModalLoading, setRouteModalLoading] = useState(false)

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
    if (building.opening_hours) count++
    if (building.entry_fee) count++
    if (building.visit_difficulty) count++
    if (building.best_visit_time) count++
    if (building.nearby_transport && building.nearby_transport.length > 0) count++
    if (building.accessibility_info && building.accessibility_info.length > 0) count++
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

  // Language filter - now handled by BuildingReviewsList
  const [routeViewMode, setRouteViewMode] = useState<'personal' | 'public'>('personal')

  // Счётчики для вкладок (загружаются сразу при открытии)
  const [routesCount, setRoutesCount] = useState(0)
  const [newsCount, setNewsCount] = useState(0)

  // Building rating
  const [buildingRating, setBuildingRating] = useState(0)
  const [buildingRatingCount, setBuildingRatingCount] = useState(0)
  const [userBuildingRating, setUserBuildingRating] = useState(0)
  const [hoveredBuildingRating, setHoveredBuildingRating] = useState(0)

  // Hero галерея
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Touch-свайп для галереи
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent, total: number) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Игнорируем вертикальные скроллы — реагируем только на горизонтальные свайпы
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) {
      setHeroPhotoIndex(prev => (prev < total - 1 ? prev + 1 : 0))
    } else {
      setHeroPhotoIndex(prev => (prev > 0 ? prev - 1 : total - 1))
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Ref для отслеживания был ли увеличен счетчик
  const viewCountIncremented = useRef(false)

  useEffect(() => {
    if (building && isOpen && user) {
      checkFavoriteStatus()
    }
  }, [building, isOpen, user])

  // Load building rating data
  useEffect(() => {
    if (!building || !isOpen) {
      if (!isOpen) {
        setBuildingRating(0)
        setBuildingRatingCount(0)
        setUserBuildingRating(0)
      }
      return
    }

    // Load aggregate rating
    const loadBuildingRating = async () => {
      const { data } = await supabase
        .from('building_ratings')
        .select('rating')
        .eq('building_id', building.id)

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
        setBuildingRating(avg)
        setBuildingRatingCount(data.length)
      } else {
        setBuildingRating(0)
        setBuildingRatingCount(0)
      }
    }

    // Load user's own rating
    const loadUserBuildingRating = async () => {
      if (!user) return
      const { data } = await supabase
        .from('building_ratings')
        .select('rating')
        .eq('building_id', building.id)
        .eq('user_id', user.id)
        .single()

      if (data) {
        setUserBuildingRating(data.rating)
      } else {
        setUserBuildingRating(0)
      }
    }

    loadBuildingRating()
    loadUserBuildingRating()
  }, [building?.id, isOpen, user])

  const handleRateBuilding = async (rating: number) => {
    if (!user) {
      toast.error('Sign in to rate this object')
      return
    }
    if (!building) return

    try {
      const { error } = await supabase
        .from('building_ratings')
        .upsert({
          building_id: building.id,
          user_id: user.id,
          rating,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'building_id,user_id'
        })

      if (error) throw error

      const oldRating = userBuildingRating
      setUserBuildingRating(rating)

      // Optimistic local update
      if (oldRating > 0) {
        // Updating existing
        const newAvg = buildingRatingCount > 0
          ? (buildingRating * buildingRatingCount - oldRating + rating) / buildingRatingCount
          : rating
        setBuildingRating(newAvg)
      } else {
        // New rating
        const newCount = buildingRatingCount + 1
        const newAvg = (buildingRating * buildingRatingCount + rating) / newCount
        setBuildingRating(newAvg)
        setBuildingRatingCount(newCount)
      }

      toast.success(`Rating ${rating}/5 saved!`)
    } catch (error) {
      console.error('Error rating building:', error)
      toast.error('Error saving rating')
    }
  }

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
        setRouteViewMode('personal')
        setHeroPhotoIndex(0)
      }
      return
    }

    // Reset photo index when building changes
    setHeroPhotoIndex(0)

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
      toast.error('Sign in to add to favorites')
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
        toast.success('Removed from favorites')
      } else {
        await supabase
          .from('user_building_favorites')
          .insert({
            user_id: user.id,
            building_id: building.id,
            visit_status: 'want_to_visit'
          })

        setIsFavorite(true)
        toast.success('✅ Added to favorites!')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Error')
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

      // Подсчитываем общее количество уникальных маршрутов (личные + публичные без дублирования)
      const personalCount = user ? uniqueRoutes.filter(r => r.created_by === user.id).length : 0
      const publicCount = uniqueRoutes.filter(r => r.is_published && r.route_visibility === 'public').length
      const totalCount = uniqueRoutes.filter(r =>
        (user && r.created_by === user.id) ||
        (r.is_published && r.route_visibility === 'public')
      ).length
      setRoutesCount(totalCount)

      // Если нет личных маршрутов, но есть публичные — переключаем на публичный режим
      if (personalCount === 0 && publicCount > 0) {
        setRouteViewMode('public')
      } else {
        setRouteViewMode('personal')
      }

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
              display_name,
              avatar_url
            )
          `)
          .eq('building_id', building.id)
          .eq('moderation_status', 'approved')
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
    toast.success('Review added!')
  }

  const handleOpenInNewTab = () => {
    if (building) {
      window.open(`/buildings/${building.id}`, '_blank')
    }
  }

  const handleCopyLink = () => {
    if (building) {
      const url = `${window.location.origin}/buildings/${building.id}`
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Link copied!')
      }).catch(() => {
        toast.error('Failed to copy link')
      })
    }
  }

  const handleRouteClick = async (routeId: string) => {
    setRouteModalLoading(true)
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .single()
      if (error) throw error
      setSelectedRoute(data as Route)
    } catch {
      toast.error('Failed to load route')
    } finally {
      setRouteModalLoading(false)
    }
  }

  const handleAddressClick = () => {
    if (building) {
      window.open(`/test-map?building=${building.id}`, '_blank')
    }
  }

  if (!isOpen || !building) return null

  // Hero photos: building's own cover first, then review photos as extras
  const buildingCover = building.image_url ? [building.image_url] : []
  const reviewsWithPhotos = reviews.filter(r => r.photos && r.photos.length > 0)
  const reviewPhotos = reviewsWithPhotos.flatMap(r => r.photos!)

  // Parallel source attribution array
  const buildingCoverSources = building.image_url ? [building.image_source || null] : []
  const reviewPhotoSources = reviewsWithPhotos.flatMap(r =>
    (r.photos || []).map((_, i) =>
      r.photo_sources ? (r.photo_sources[i] || null) : null
    )
  )

  // Building's own photo always comes first
  const displayHeroPhotos = [...buildingCover, ...reviewPhotos]
  const displayHeroSources = [...buildingCoverSources, ...reviewPhotoSources]

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
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
                title="Edit object"
              >
                <Pencil className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </button>
            )}

            {/* Поделиться ссылкой */}
            <button
              onClick={handleCopyLink}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy link"
            >
              <Share2 className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>

            {/* Открыть в новом окне - скрыто на мобильных */}
            <button
              onClick={handleOpenInNewTab}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-5 h-5 text-gray-600" />
            </button>

            {/* Закрыть */}
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Hero: Фото на всю ширину (галерея из обзоров) */}
          {displayHeroPhotos.length > 0 && (
            <div
              className="relative w-full h-48 md:h-64 lg:h-80 bg-gray-100 group"
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, displayHeroPhotos.length)}
            >
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
                        className={`h-1.5 md:h-2 rounded-full transition-all ${idx === heroPhotoIndex
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

          {/* Photo Source Attribution - dynamic, changes with hero photo */}
          {displayHeroSources[heroPhotoIndex] && (
            <div className="bg-gray-50 border-b border-gray-200 px-3 md:px-6 py-1.5 md:py-2 text-xs text-gray-500 italic">
              📷 {displayHeroSources[heroPhotoIndex]}
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

                {(building.view_count ?? 0) > 0 && (
                  <div className="flex items-center text-gray-600">
                    <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    <span className="hidden sm:inline">{building.view_count} views</span>
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

              {/* Строка 3: Building Rating */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex items-center space-x-0.5">
                  {[1, 2, 3, 4, 5].map(star => {
                    const isActive = userBuildingRating >= star || (hoveredBuildingRating >= star && hoveredBuildingRating > 0)
                    const isFilled = !hoveredBuildingRating && buildingRating >= star

                    return (
                      <button
                        key={star}
                        onClick={() => handleRateBuilding(star)}
                        onMouseEnter={() => setHoveredBuildingRating(star)}
                        onMouseLeave={() => setHoveredBuildingRating(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                        title={`Rate ${star}/5`}
                      >
                        <Star
                          className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${
                            isActive
                              ? 'fill-yellow-400 text-yellow-400'
                              : isFilled
                                ? 'fill-yellow-400/60 text-yellow-400/60'
                                : 'text-gray-300'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                {buildingRatingCount > 0 && (
                  <>
                    <span className="text-sm font-semibold text-gray-900">{buildingRating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">
                      ({buildingRatingCount} {buildingRatingCount === 1 ? 'rating' : 'ratings'})
                    </span>
                  </>
                )}
                {userBuildingRating > 0 && (
                  <span className="text-xs text-blue-600 font-medium">Your: {userBuildingRating}/5</span>
                )}
              </div>

              {/* Строка 4: Адрес (кликабельный) */}
              {building.address && (
                <button
                  onClick={handleAddressClick}
                  className="flex items-start text-gray-600 hover:text-blue-600 transition-colors cursor-pointer group w-full text-left"
                  title="Show on map"
                >
                  <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-gray-500 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="group-hover:underline line-clamp-2">{building.address}, {building.city}</span>
                </button>
              )}
            </div>
          </div>

          {/* Описание здания с Show more */}
          {building.description && (
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <p className={`text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line ${showFullDescription ? '' : 'line-clamp-3'}`}>
                {building.description}
              </p>
              {building.description.length > 180 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-1.5 text-xs md:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

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
                    Practical Information
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
                        Official Website
                      </a>
                    </div>
                  )}

                  {/* Часы работы */}
                  {building.opening_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        {typeof building.opening_hours === 'string'
                          ? building.opening_hours
                          : JSON.stringify(building.opening_hours)}
                      </span>
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
                        Difficulty: {difficultyLabels[building.visit_difficulty] || building.visit_difficulty}
                      </span>
                    </div>
                  )}

                  {/* Лучшее время */}
                  {building.best_visit_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        Best time: {timeLabels[building.best_visit_time] || building.best_visit_time}
                      </span>
                    </div>
                  )}

                  {/* Транспорт */}
                  {building.nearby_transport && building.nearby_transport.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Transport:</span>
                      </div>
                      <ul className="ml-6 space-y-0.5">
                        {building.nearby_transport.map((transport, idx) => (
                          <li key={idx} className="text-gray-600 text-xs md:text-sm">• {transport}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Доступность */}
                  {building.accessibility_info && building.accessibility_info.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Accessibility className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Accessibility:</span>
                      </div>
                      <p className="ml-6 text-gray-600 text-xs md:text-sm">{building.accessibility_info}</p>
                    </div>
                  )}

                  {/* Материалы строительства */}
                  {building.construction_materials && building.construction_materials.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">Materials:</span>
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
                        <span className="font-medium text-gray-900">Historical Significance:</span>
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
                className={`py-3 border-b-2 font-medium transition-colors text-sm md:text-base ${activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                📝 Reviews
                {reviews.length > 0 && ` (${reviews.length})`}
              </button>

              <button
                onClick={() => setActiveTab('routes')}
                className={`py-3 border-b-2 font-medium transition-colors text-sm md:text-base ${activeTab === 'routes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                🗺️ Routes
                {routesCount > 0 && ` (${routesCount})`}
              </button>

              <button
                onClick={() => setActiveTab('news')}
                className={`py-3 border-b-2 font-medium transition-colors text-sm md:text-base ${activeTab === 'news'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                📰 News
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
                  <>
                    <BuildingReviewsList
                      reviews={reviews}
                      buildingId={building.id}
                      onOpenAddReview={() => setIsAddReviewModalOpen(true)}
                    />
                  </>
                )}

                {/* Таб Маршруты */}
                {activeTab === 'routes' && (
                  <div className="space-y-3">
                    {/* Переключатель Личные/Общественные */}
                    <div className="flex items-center justify-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setRouteViewMode('personal')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 md:px-4 rounded-md font-medium text-sm transition-colors ${routeViewMode === 'personal'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        Personal
                      </button>
                      <button
                        onClick={() => setRouteViewMode('public')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 md:px-4 rounded-md font-medium text-sm transition-colors ${routeViewMode === 'public'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Public
                      </button>
                    </div>

                    {routes.length === 0 ? (
                      <div className="text-center py-8 md:py-12 text-gray-400">
                        <RouteIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm md:text-base">
                          {routeViewMode === 'personal'
                            ? 'You don\'t have any personal routes with this object yet'
                            : 'This object is not yet included in public routes'}
                        </p>
                      </div>
                    ) : (
                      routes.map(route => (
                        <button
                          key={route.id}
                          onClick={() => handleRouteClick(route.id)}
                          disabled={routeModalLoading}
                          className="w-full text-left p-2.5 md:p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all disabled:opacity-60"
                        >
                          <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1 md:mb-1.5">
                            {route.title}
                          </h3>
                          {route.description && (
                            <p className="text-gray-500 text-xs mb-1.5 md:mb-2 line-clamp-2">
                              {route.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            {route.distance_km && (
                              <span className="flex items-center gap-1">
                                <Ruler className="w-3 h-3" />
                                {route.distance_km.toFixed(1)} km
                              </span>
                            )}
                            {route.estimated_duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {route.estimated_duration_minutes} min
                              </span>
                            )}
                            {route.points_count && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {route.points_count} points
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Таб Новости */}
                {activeTab === 'news' && (
                  <div className="space-y-3 md:space-y-4">
                    {news.length === 0 ? (
                      <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
                        📭 No news about this object yet
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
                              📅 {new Date(item.published_at).toLocaleDateString('en-US', {
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

      {/* Модальное окно маршрута */}
      <RouteViewerModal
        isOpen={!!selectedRoute}
        onClose={() => setSelectedRoute(null)}
        route={selectedRoute}
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

