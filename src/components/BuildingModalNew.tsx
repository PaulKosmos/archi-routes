'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, ExternalLink, Heart, BookmarkPlus, MapPin, Calendar, User as UserIcon, Building2, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
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

export default function BuildingModalNew({ building, isOpen, onClose }: BuildingModalProps) {
  // ✅ Создаем НОВЫЙ Supabase клиент для этого компонента
  const supabase = useMemo(() => createClient(), [])
  
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'reviews' | 'routes' | 'news'>('reviews')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Проверка прав на редактирование/удаление
  const canEdit = user && building && (
    user.id === building.created_by ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator'
  )
  
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
        setActiveTab('reviews')
      }
      return
    }
    
    console.log('🏢 BuildingModalNew: Загрузка данных для', building.id, building.name)
    loadTabData()
  }, [building?.id, isOpen, activeTab, refreshKey, routeViewMode, user])

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
      } else if (activeTab === 'news') {
        const { data } = await supabase
          .from('architecture_news')
          .select('id, title, summary, published_at, featured_image_url, slug')
          .contains('related_buildings', [building.id])
          .eq('status', 'published')
          .order('published_at', { ascending: false })

        setNews(data || [])
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
      <div className="relative w-11/12 max-w-5xl max-h-[95vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate flex-1 mr-4">
            {building.name}
          </h2>
          
          <div className="flex items-center space-x-2">
            {/* Кнопка избранного */}
            <button
              onClick={toggleFavorite}
              className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                isFavorite
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <Heart className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium hidden sm:inline">
                {isFavorite ? 'В избранном' : 'В избранное'}
              </span>
            </button>

            {/* Кнопка коллекции */}
            <AddToCollectionButton
              buildingId={building.id}
              buildingName={building.name}
              size="sm"
            />

            {/* Кнопка редактирования (только для создателя/админа/модератора) */}
            {canEdit && (
              <button
                onClick={() => window.open(`/buildings/${building.id}/edit`, '_blank')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Редактировать здание"
              >
                <Pencil className="w-5 h-5 text-blue-600" />
              </button>
            )}

            {/* Открыть в новом окне */}
            <button
              onClick={handleOpenInNewTab}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Открыть в новом окне"
            >
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </button>

            {/* Закрыть */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Закрыть"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Hero: Фото на всю ширину (галерея из обзоров) */}
          {displayHeroPhotos.length > 0 && (
            <div className="relative w-full h-64 sm:h-80 bg-gray-100 group">
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
                  <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {heroPhotoIndex + 1} / {displayHeroPhotos.length}
                  </div>

                  {/* Стрелки */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setHeroPhotoIndex(prev => prev > 0 ? prev - 1 : displayHeroPhotos.length - 1)
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-800" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setHeroPhotoIndex(prev => prev < displayHeroPhotos.length - 1 ? prev + 1 : 0)
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-800" />
                  </button>

                  {/* Точки индикаторы */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {displayHeroPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          setHeroPhotoIndex(idx)
                        }}
                        className={`h-2 rounded-full transition-all ${
                          idx === heroPhotoIndex
                            ? 'bg-white w-8'
                            : 'bg-white/60 hover:bg-white/80 w-2'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Компактная информация */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="space-y-2 text-sm">
              {/* Строка 1: Архитектор и просмотры */}
              <div className="flex items-center justify-between">
                {building.architect && (
                  <div className="flex items-center text-gray-700">
                    <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium">{building.architect}</span>
                  </div>
                )}
                
                {building.view_count > 0 && (
                  <div className="flex items-center text-gray-600">
                    <Eye className="w-4 h-4 mr-1" />
                    {building.view_count} просмотров
                  </div>
                )}
              </div>
              
              {/* Строка 2: Год и стиль */}
              <div className="flex items-center gap-6 text-gray-600">
                {building.year_built && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {building.year_built}
                  </div>
                )}
                
                {building.architectural_style && (
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                    {building.architectural_style}
                  </div>
                )}
              </div>
              
              {/* Строка 3: Адрес (кликабельный) */}
              {building.address && (
                <button
                  onClick={handleAddressClick}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors cursor-pointer group"
                  title="Показать на карте"
                >
                  <MapPin className="w-4 h-4 mr-2 text-gray-500 group-hover:text-blue-600" />
                  <span className="group-hover:underline">{building.address}, {building.city}</span>
                </button>
              )}
            </div>
          </div>

          {/* Табы */}
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📝 Обзоры {reviews.length > 0 && `(${reviews.length})`}
              </button>
              
              <button
                onClick={() => setActiveTab('routes')}
                className={`py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'routes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🗺️ Маршруты {routes.length > 0 && `(${routes.length})`}
              </button>
              
              <button
                onClick={() => setActiveTab('news')}
                className={`py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'news'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📰 Новости {news.length > 0 && `(${news.length})`}
              </button>
            </div>
          </div>

          {/* Контент табов */}
          <div className="p-6">
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
                        className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                          routeViewMode === 'personal'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🙋 Личные
                      </button>
                      <button
                        onClick={() => setRouteViewMode('public')}
                        className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                          routeViewMode === 'public'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🌍 Общественные
                      </button>
                    </div>

                    {routes.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        📭 {routeViewMode === 'personal' 
                          ? 'У вас пока нет личных маршрутов с этим зданием' 
                          : 'Это здание пока не включено в общественные маршруты'}
                      </div>
                    ) : (
                      routes.map(route => (
                        <Link
                          key={route.id}
                          href={`/routes/${route.id}`}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">
                            {route.title}
                          </h3>
                          {route.description && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {route.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
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
                  <div className="space-y-4">
                    {news.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        📭 Пока нет новостей об этом здании
                      </div>
                    ) : (
                      news.map(item => (
                        <Link
                          key={item.id}
                          href={`/news/${item.slug}`}
                          className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-lg text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                          {item.summary && (
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
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

