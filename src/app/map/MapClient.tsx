'use client'

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { buildRoute } from '@/lib/mapbox-routing-service'
import dynamic from 'next/dynamic'
import {
  MapPin,
  Filter,
  Search,
  X,
  Building2,
  Route as RouteIcon,
  Clock,
  Star,
  Navigation,
  Car,
  Bike,
  Footprints,
  Bus,
  SlidersHorizontal,
  Eye,
  Heart,
  Share2,
  Wrench,
  Zap,
  Globe,
  User,
  Plus,
  Navigation2
} from 'lucide-react'
import MapStatsPanel from '../../components/MapStatsPanel'
import Header from '../../components/Header'
import LazyFilterPanel from '../../components/test-map/LazyFilterPanel'
import LazyBuildingList from '../../components/test-map/LazyBuildingList'
import LazyRouteList from '../../components/test-map/LazyRouteList'
import LazyCurrentRoutePanel from '../../components/test-map/LazyCurrentRoutePanel'
import BuildingModal from '../../components/BuildingModal'
import RouteViewerModal from '../../components/RouteViewerModal'
import RouteCreationModal from '../../components/test-map/RouteCreationModal'
import MobileBottomSheet from '../../components/test-map/MobileBottomSheet'
import MobileControlBar from '../../components/test-map/MobileControlBar'
import PersonalRouteCreationModal from '../../components/test-map/PersonalRouteCreationModal'
import RouteCreationMethodModal from '../../components/test-map/RouteCreationMethodModal'
import RouteCreator from '../../components/RouteCreator'
import AddBuildingInstructionModal from '../../components/test-map/AddBuildingInstructionModal'
import AddBuildingFormModal, { type BuildingFormData } from '../../components/test-map/AddBuildingFormModal'
import PageLoader from '@/components/ui/PageLoader'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { uploadMultipleImages, uploadAudio } from '@/lib/storage'

// Динамический импорт MapLibre карты (миграция с Leaflet)
const MapLibreEnhanced = dynamic(() => import('../../components/MapLibreEnhanced'), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
    <span className="text-gray-500">Loading map...</span>
  </div>
})

// Импорт типа для ref
import type { MapLibreEnhancedRef } from '../../components/MapLibreEnhanced'

// Типы данных (импортируем из types/building.ts)
import type { Building } from '@/types/building'
import type { Route } from '@/types/route'
import type { GeoJSON } from 'geojson'

// Route импортируется из types/building.ts

// Интерфейс фильтров
interface Filters {
  search: string
  cities: string[]
  architecturalStyles: string[]
  buildingTypes: string[]
  difficultyLevels: string[]
  transportModes: string[]
  showOnlyPublished: boolean
  showOnlyFeatured: boolean
  minRating: number
  maxDistance: number
  radiusKm: number // Радиус поиска в км
  currentLocation: { lat: number; lng: number } | null // Текущее местоположение
  hasAudio: boolean
}

export default function TestMapPage() {
  const supabase = useMemo(() => createClient(), [])

  // Авторизация
  const { user, profile } = useAuth()

  // Состояние данных
  const [buildings, setBuildings] = useState<Building[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  // Состояние карты
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null)
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null)
  const [showRoutes, setShowRoutes] = useState(false) // Скрываем маршруты по умолчанию
  const [showBuildings, setShowBuildings] = useState(true)
  const [mapView, setMapView] = useState<'buildings' | 'routes' | null>(null) // Панель закрыта по умолчанию

  // Ref для карты (для центрирования на маршруте)
  const mapRef = useRef<MapLibreEnhancedRef>(null)

  // Mobile bottom sheet states
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileBuildings, setShowMobileBuildings] = useState(false)
  const [showMobileRoutes, setShowMobileRoutes] = useState(false)

  // Map viewport center for proximity sorting
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 52.52, lng: 13.405 })

  // Состояние фильтров
  const [filters, setFilters] = useState<Filters>({
    search: '',
    cities: [],
    architecturalStyles: [],
    buildingTypes: [],
    difficultyLevels: [],
    transportModes: [],
    showOnlyPublished: true,
    showOnlyFeatured: false,
    minRating: 0,
    maxDistance: 50,
    radiusKm: 5, // По умолчанию 5км радиус
    currentLocation: null,
    hasAudio: false
  })

  // Состояние UI
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<(Building | Route)[]>([])
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number } | null>(null) // Центр радиуса
  const [radiusMode, setRadiusMode] = useState<'none' | 'location' | 'map'>('none') // Режим выбора радиуса

  // Состояние создания маршрута
  const [routeCreationMode, setRouteCreationMode] = useState(false) // Режим создания маршрута
  const [selectedBuildingsForRoute, setSelectedBuildingsForRoute] = useState<string[]>([]) // Выбранные здания для маршрута

  // Режим просмотра маршрутов (публичные/личные)
  const [routeViewMode, setRouteViewMode] = useState<'public' | 'personal'>('public')

  // Боковая панель видна только когда активна кнопка "Здания" или "Маршруты"
  const showSidebar = mapView !== null

  // Состояние модального окна
  const [modalBuilding, setModalBuilding] = useState<Building | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalRoute, setModalRoute] = useState<any | null>(null)
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)

  // Состояние модального окна выбора способа создания маршрута
  const [isRouteMethodModalOpen, setIsRouteMethodModalOpen] = useState(false)

  // Состояние модального окна создания маршрута
  const [isRouteCreationModalOpen, setIsRouteCreationModalOpen] = useState(false)

  // Состояние RouteCreator (как в Header)
  const [isRouteCreatorOpen, setIsRouteCreatorOpen] = useState(false)
  const [routeCreatorMode, setRouteCreatorMode] = useState<'manual' | 'autogenerate'>('manual')

  // Состояние режима добавления объекта
  const [addBuildingMode, setAddBuildingMode] = useState(false)
  const [showInstructionModal, setShowInstructionModal] = useState(false)
  const [selectedNewLocation, setSelectedNewLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showAddBuildingForm, setShowAddBuildingForm] = useState(false)

  // Уникальные значения для фильтров (мемоизированы)
  const uniqueValues = useMemo(() => ({
    cities: [...new Set(buildings.map(b => b.city).filter(Boolean))] as string[],
    architecturalStyles: [...new Set(buildings.map(b => b.architectural_style).filter(Boolean))] as string[],
    buildingTypes: [...new Set(buildings.map(b => b.building_type).filter(Boolean))] as string[],
    difficultyLevels: [...new Set(routes.map(r => r.difficulty_level).filter(Boolean))] as string[],
    transportModes: [...new Set(routes.map(r => r.transport_mode).filter(Boolean))] as string[]
  }), [buildings, routes])

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  // Применение фильтров
  useEffect(() => {
    applyFilters()
  }, [buildings, routes, filters, routeViewMode, user])

  // Автоцентрирование карты на выбранном маршруте
  useEffect(() => {
    if (selectedRoute && mapRef.current) {
      console.log('🗺️ Centering map on selected route:', selectedRoute.id)
      mapRef.current.centerOnRoute(selectedRoute.id)
    }
  }, [selectedRoute])

  const loadData = async () => {
    try {
      setLoading(true)

      // Загружаем здания
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('created_at', { ascending: false })

      if (buildingsError) throw buildingsError

      // Загружаем маршруты
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })

      if (routesError) throw routesError

      // Загружаем ID зданий с аудио (для фильтра)
      const { data: buildingsWithAudio, error: audioError1 } = await supabase
        .from('building_reviews')
        .select('building_id')
        .not('audio_url', 'eq', null)

      if (audioError1) console.error('Error loading buildings with audio:', audioError1)

      // Загружаем ID маршрутов с аудио (для фильтра)
      const { data: routesWithAudio, error: audioError2 } = await supabase
        .from('route_points')
        .select('route_id')
        .not('audio_url', 'eq', null)

      if (audioError2) console.error('Error loading routes with audio:', audioError2)

      // Создаем Set для быстрой проверки
      const buildingIdsWithAudio = new Set(
        buildingsWithAudio?.map(r => r.building_id) || []
      )
      const routeIdsWithAudio = new Set(
        routesWithAudio?.map(p => p.route_id) || []
      )

      // Добавляем флаг has_audio к зданиям и маршрутам
      const buildingsWithFlags = buildingsData?.map(b => ({
        ...b,
        has_audio: buildingIdsWithAudio.has(b.id)
      })) || []

      const routesWithFlags = routesData?.map(r => ({
        ...r,
        has_audio: routeIdsWithAudio.has(r.id)
      })) || []

      setBuildings(buildingsWithFlags)
      setRoutes(routesWithFlags)

      // Данные уже обрабатываются через useMemo для uniqueValues

    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filteredB = buildings
    let filteredR = routes

    // Исключаем здание "Знания"
    filteredB = filteredB.filter(b => b.name !== 'Knowledge')

    // Moderation filter: show only approved buildings (+ legacy without status + user's own)
    filteredB = filteredB.filter(b =>
      b.moderation_status === 'approved' ||
      b.moderation_status === undefined ||
      b.moderation_status === null ||
      (user && b.created_by === user.id)
    )

    // Фильтр по поиску
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredB = filteredB.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.architect?.toLowerCase().includes(searchLower) ||
        b.architectural_style?.toLowerCase().includes(searchLower)
      )
      filteredR = filteredR.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      )
    }

    // Фильтр по городам
    if (filters.cities.length > 0) {
      filteredB = filteredB.filter(b => b.city && filters.cities.includes(b.city))
      filteredR = filteredR.filter(r => r.city && filters.cities.includes(r.city))
    }

    // Фильтр по архитектурным стилям
    if (filters.architecturalStyles.length > 0) {
      filteredB = filteredB.filter(b =>
        b.architectural_style && filters.architecturalStyles.includes(b.architectural_style)
      )
    }

    // Фильтр по типам зданий
    if (filters.buildingTypes.length > 0) {
      filteredB = filteredB.filter(b =>
        b.building_type && filters.buildingTypes.includes(b.building_type)
      )
    }

    // Фильтр по радиусу от текущего местоположения или выбранной точки
    const centerPoint = filters.currentLocation || radiusCenter
    if (centerPoint && filters.radiusKm > 0) {
      filteredB = filteredB.filter(building => {
        if (!building.latitude || !building.longitude) return false

        const distance = calculateDistance(
          centerPoint.lat,
          centerPoint.lng,
          building.latitude,
          building.longitude
        )
        return distance <= filters.radiusKm
      })
    }

    // Фильтр по аудио
    if (filters.hasAudio) {
      filteredB = filteredB.filter(b => (b as any).has_audio === true)
      filteredR = filteredR.filter(r => (r as any).has_audio === true)
      console.log('🎵 Фильтр "С Аудио": найдено', filteredB.length, 'зданий и', filteredR.length, 'маршрутов с аудио')
    }

    // Фильтр по сложности
    if (filters.difficultyLevels.length > 0) {
      filteredR = filteredR.filter(r =>
        r.difficulty_level && filters.difficultyLevels.includes(r.difficulty_level)
      )
    }

    // Фильтр по публичным/личным маршрутам (применяем ДО фильтра showOnlyPublished)
    if (routeViewMode === 'personal' && user) {
      // Показываем только личные маршруты текущего пользователя
      // Личные = созданные пользователем И (приватные ИЛИ неопубликованные)
      filteredR = filteredR.filter(r => {
        const isCreatedByUser = r.created_by === user.id
        const isPrivate = r.route_visibility === 'private' || r.route_visibility === null
        const isNotPublished = !r.is_published

        return isCreatedByUser && (isPrivate || isNotPublished)
      })

      console.log('🔍 Personal routes filter:', {
        userId: user.id,
        totalRoutes: routes.length,
        filteredCount: filteredR.length,
        filteredRoutes: filteredR.map(r => ({
          id: r.id,
          title: r.title,
          created_by: r.created_by,
          route_visibility: r.route_visibility,
          is_published: r.is_published
        }))
      })
    } else if (routeViewMode === 'public') {
      // Показываем только публичные маршруты
      filteredR = filteredR.filter(r => r.route_visibility === 'public' || r.is_published === true)

      // Только опубликованные (применяем только для публичных маршрутов)
      if (filters.showOnlyPublished) {
        filteredR = filteredR.filter(r => r.is_published)
      }
    }

    // Минимальный рейтинг
    if (filters.minRating > 0) {
      filteredB = filteredB.filter(b => (b.rating || 0) >= filters.minRating)
      filteredR = filteredR.filter(r => (r.rating || 0) >= filters.minRating)
    }

    setFilteredBuildings(filteredB)
    setFilteredRoutes(filteredR)
  }

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }))

    if (query.length > 2) {
      const searchLower = query.toLowerCase()
      const results = [
        ...buildings.filter(b =>
          b.name.toLowerCase().includes(searchLower) ||
          b.architect?.toLowerCase().includes(searchLower)
        ),
        ...routes.filter(r =>
          r.title.toLowerCase().includes(searchLower)
        )
      ]
      setSearchResults(results)
      setShowSearchResults(true)
    } else {
      setShowSearchResults(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      cities: [],
      architecturalStyles: [],
      buildingTypes: [],
      difficultyLevels: [],
      transportModes: [],
      showOnlyPublished: true,
      showOnlyFeatured: false,
      minRating: 0,
      maxDistance: 50,
      radiusKm: 5,
      currentLocation: null,
      hasAudio: false
    })
  }

  const handleQuickFilter = (filter: string, value: string) => {
    switch (filter) {
      case 'rating':
        setFilters(prev => ({ ...prev, minRating: 4 }))
        break
      case 'popular':
        setFilters(prev => ({ ...prev, minRating: 3 }))
        break
      case 'recent':
        // Фильтр по дате создания (последняя неделя)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        // Здесь можно добавить логику фильтрации по дате
        break
      case 'has_images':
        // Фильтр по наличию изображений
        // Здесь можно добавить логику фильтрации по наличию изображений
        break
    }
  }

  // Обработчики для маршрутов - используем новую систему

  // Функция для приведения типов Route к совместимости с EnhancedMap
  const convertRouteForMap = useCallback((route: any) => ({
    ...route,
    description: route.description || undefined,
    difficulty_level: route.difficulty_level || undefined,
    estimated_duration_minutes: route.estimated_duration_minutes || undefined,
    distance_km: route.distance_km || undefined,
    points_count: route.points_count || undefined,
    rating: route.rating || undefined,
    review_count: route.review_count || undefined,
    route_geometry: route.route_geometry as GeoJSON.LineString | null | undefined,
    is_published: route.is_published ?? undefined,
    created_by: route.created_by || undefined,
    route_type: route.route_type || undefined,
    thumbnail_url: route.thumbnail_url || undefined,
    is_premium: route.is_premium ?? undefined,
    route_visibility: route.route_visibility || undefined,
    publication_status: route.publication_status || undefined,
    route_source: route.route_source || undefined,
    priority_score: route.priority_score || undefined,
    route_points: route.route_points || []
  }), [])

  // Обработчики для выбора объектов (оптимизированы с useCallback)
  const handleBuildingClick = useCallback((buildingId: string | null) => {
    if (!buildingId) return
    const building = filteredBuildings.find(b => b.id === buildingId)
    setSelectedBuilding(building || null)
    setSelectedRoute(null)

    // Центрируем карту на выбранном здании и открываем popup
    if (mapRef.current && buildingId) {
      const isMobile = window.innerWidth < 768

      if (isMobile) {
        // На мобильных центрируем только если открыта панель Buildings
        if (showMobileBuildings) {
          mapRef.current.centerOnBuilding(buildingId)

          // Открываем popup после небольшой задержки (чтобы карта успела центрироваться)
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.openBuildingPopup(buildingId)
            }
          }, 1100) // Чуть больше чем duration анимации (1000ms)
        }
        // Если панель Buildings закрыта - ничего не делаем,
        // EnhancedMap сам обработает клик и покажет детальный popup
      } else {
        // Для десктопа - только открываем popup без центрирования
        mapRef.current.openBuildingPopup(buildingId)
      }
    }
  }, [filteredBuildings, showMobileBuildings])

  const handleBuildingDetails = useCallback((buildingIdOrObject: string | Building) => {
    // Открываем модальное окно с детальной информацией о здании
    let building: Building | undefined

    if (typeof buildingIdOrObject === 'string') {
      // Если передан ID, ищем здание в массиве
      building = buildings.find(b => b.id === buildingIdOrObject)
      console.log('🏢 [HANDLER] Building details by ID:', buildingIdOrObject, 'found:', !!building)
    } else {
      // Если передан объект, используем его напрямую
      building = buildingIdOrObject
      console.log('🏢 [HANDLER] Building details by object:', building?.id)
    }

    if (building) {
      setModalBuilding(building)
      setIsModalOpen(true)
    } else {
      console.error('🏢 [ERROR] Building not found:', buildingIdOrObject)
    }
  }, [buildings])

  const handleRouteDetails = useCallback((routeIdOrObject: string | any) => {
    // Открываем модальное окно с детальной информацией о маршруте
    let route: any

    if (typeof routeIdOrObject === 'string') {
      // Если передан ID, ищем маршрут в массиве
      route = routes.find(r => r.id === routeIdOrObject)
      console.log('🛤️ [HANDLER] Route details by ID:', routeIdOrObject, 'found:', !!route)
    } else {
      // Если передан объект, используем его напрямую
      route = routeIdOrObject
      console.log('🛤️ [HANDLER] Route details by object:', route?.id)
    }

    if (route) {
      setModalRoute(route)
      setIsRouteModalOpen(true)
    } else {
      console.error('🛤️ [ERROR] Route not found:', routeIdOrObject)
    }
  }, [routes])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setModalBuilding(null)
  }, [])

  const handleCloseRouteModal = useCallback(() => {
    setIsRouteModalOpen(false)
    setModalRoute(null)
  }, [])

  // Обработчики для создания маршрутов
  const handleOpenRouteCreationModal = useCallback(() => {
    setIsRouteCreationModalOpen(true)
  }, [])

  const handleCloseRouteCreationModal = useCallback(() => {
    setIsRouteCreationModalOpen(false)
  }, [])

  // Обработчики RouteCreator (как в Header)
  const handleCloseRouteCreator = useCallback(() => {
    setIsRouteCreatorOpen(false)
    // Можно добавить callback для обновления данных, если нужно
  }, [])

  // Старые handlers удалены - используем новую упрощенную систему создания маршрутов

  // Обработчики для режима добавления объекта
  const handleToggleAddBuildingMode = useCallback(() => {
    if (addBuildingMode) {
      // Выход из режима добавления
      setAddBuildingMode(false)
      setShowInstructionModal(false)
      console.log('🏛️ [ADD MODE] Exited add building mode')
    } else {
      // Вход в режим добавления - показываем инструкцию
      setShowInstructionModal(true)
      console.log('🏛️ [ADD MODE] Entering add building mode')
    }
  }, [addBuildingMode])

  const handleInstructionConfirm = useCallback(() => {
    setShowInstructionModal(false)
    setAddBuildingMode(true)
    console.log('🏛️ [ADD MODE] Instruction confirmed, mode active')
  }, [])

  const handleInstructionCancel = useCallback(() => {
    setShowInstructionModal(false)
    setAddBuildingMode(false)
    console.log('🏛️ [ADD MODE] Instruction cancelled')
  }, [])

  const handleMapClickForBuilding = useCallback((lat: number, lng: number) => {
    if (addBuildingMode) {
      console.log('🏛️ [ADD MODE] Location selected:', { lat, lng })
      setSelectedNewLocation({ lat, lng })
      setShowAddBuildingForm(true)
      setAddBuildingMode(false) // Выходим из режима выбора
    }
  }, [addBuildingMode])

  const handleSaveNewBuilding = async (buildingData: BuildingFormData) => {
    if (!user) {
      toast.error('Sign in to add buildings')
      throw new Error('User not authenticated')
    }

    console.log('🏛️ [SAVE] Saving new building:', buildingData)

    try {
      // 1. Create building with practical info at building level
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .insert({
          name: buildingData.name,
          latitude: buildingData.latitude,
          longitude: buildingData.longitude,
          city: buildingData.city,
          country: buildingData.country,
          address: buildingData.address,
          architect: buildingData.architect,
          year_built: buildingData.year_built,
          architectural_style: buildingData.architectural_style,
          building_type: buildingData.building_type,
          // Practical info saved directly to building
          opening_hours: buildingData.opening_hours || null,
          entry_fee: buildingData.entry_fee || null,
          website_url: buildingData.website || null,
          visit_difficulty: buildingData.visit_difficulty || null,
          best_visit_time: buildingData.best_visit_time || null,
          accessibility_info: buildingData.accessibility_info || null,
          created_by: user.id,
          rating: null
        })
        .select()
        .single()

      if (buildingError) {
        console.error('🏛️ [SAVE] Building error:', buildingError)
        throw new Error(buildingError.message)
      }

      console.log('🏛️ [SAVE] Building created successfully:', building)

      // 2. Upload building photo if provided
      if (buildingData.buildingPhotoFile) {
        console.log('📷 [SAVE] Uploading building photo')

        try {
          const results = await uploadMultipleImages(
            [buildingData.buildingPhotoFile],
            'buildings/gallery',
            user.id
          )

          const photoPath = results[0]?.path
          console.log('📷 [SAVE] Building photo uploaded:', photoPath)

          const photoSource = buildingData.isOwnPhoto
            ? 'Personal photo'
            : buildingData.photoSource || null

          await supabase
            .from('buildings')
            .update({
              image_url: photoPath,
              image_urls: [photoPath],
              image_source: photoSource
            })
            .eq('id', building.id)

        } catch (photoError) {
          console.error('📷 [SAVE] Building photo upload error:', photoError)
          toast.error('Building created, but photo upload failed')
        }
      }

      // 3. Create review if review data is present
      if (buildingData.review && ((buildingData.review.rating ?? 0) > 0 || buildingData.review.content)) {
        console.log('📝 [SAVE] Creating review for building:', building.id)

        // Upload audio if present
        let audioPath: string | null = null
        if (buildingData.audioFile) {
          console.log('🎤 [SAVE] Uploading audio:', buildingData.audioFile.name)

          try {
            const audioResult = await uploadAudio(buildingData.audioFile, user.id)
            audioPath = audioResult.path
            console.log('🎤 [SAVE] Audio uploaded:', audioPath)
          } catch (audioError) {
            console.error('🎤 [SAVE] Audio upload error:', audioError)
            toast.error('Failed to upload audio')
          }
        }

        // Upload review photos first if present
        let reviewPhotoUrls: string[] = []
        if (buildingData.reviewPhotoFiles && buildingData.reviewPhotoFiles.length > 0) {
          try {
            const reviewPhotoResults = await uploadMultipleImages(
              buildingData.reviewPhotoFiles,
              'reviews',
              user.id
            )
            reviewPhotoUrls = reviewPhotoResults.map(r => r.path)
            console.log('📷 [SAVE] Review photos uploaded:', reviewPhotoUrls)
          } catch (photoError) {
            console.error('📷 [SAVE] Review photo upload error:', photoError)
          }
        }

        const reviewLanguage = buildingData.review.language || 'en'

        const { data: review, error: reviewError } = await supabase
          .from('building_reviews')
          .insert({
            building_id: building.id,
            user_id: user.id,
            rating: buildingData.review.rating && buildingData.review.rating > 0 ? buildingData.review.rating : null,
            title: buildingData.review.title || null,
            content: buildingData.review.content || null,
            review_type: 'general',
            tags: buildingData.review.tags.length > 0 ? buildingData.review.tags : null,
            photos: reviewPhotoUrls.length > 0 ? reviewPhotoUrls : null,
            audio_url: audioPath,
            language: reviewLanguage,
            original_language: reviewLanguage
          })
          .select()
          .single()

        if (reviewError) {
          console.error('📝 [SAVE] Review error:', reviewError)
          toast.error('Building created, but review save failed')
        } else {
          console.log('📝 [SAVE] Review created successfully:', review)

          // Update building review count (but NOT rating - rating 1 is just a DB requirement)
          await supabase
            .from('buildings')
            .update({ review_count: 1 })
            .eq('id', building.id)
        }
      }

      // 4. Reload buildings list
      await loadData()

      toast.success('Building submitted! It will appear on the map after moderation review.')

      return building
    } catch (error: any) {
      console.error('🏛️ [SAVE] Error:', error)
      throw error
    }
  }

  const handleCloseAddBuildingForm = useCallback(() => {
    setShowAddBuildingForm(false)
    setSelectedNewLocation(null)
  }, [])

  // Функция расчета расстояния между двумя точками (формула гаверсинуса)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Радиус Земли в километрах
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const handleRouteClick = useCallback((routeOrId: string | Route) => {
    // Поддержка как объекта Route, так и строки routeId
    const route = typeof routeOrId === 'string'
      ? filteredRoutes.find(r => r.id === routeOrId)
      : routeOrId
    setSelectedRoute(route || null)
    setSelectedBuilding(null)
  }, [filteredRoutes])

  // Buildings sorted by distance from map center (for mobile list)
  const buildingsSortedByProximity = useMemo(() => {
    if (!mapCenter || filteredBuildings.length === 0) return filteredBuildings
    return [...filteredBuildings].sort((a, b) => {
      const distA = calculateDistance(mapCenter.lat, mapCenter.lng, a.latitude, a.longitude)
      const distB = calculateDistance(mapCenter.lat, mapCenter.lng, b.latitude, b.longitude)
      return distA - distB
    })
  }, [filteredBuildings, mapCenter])

  // Вычисляем статистику (мемоизировано)
  const stats = useMemo(() => ({
    totalViews: filteredBuildings.reduce((sum, b) => sum + (b.view_count || 0), 0) +
      filteredRoutes.reduce((sum, r) => sum + (r.review_count || 0), 0),
    averageRating: (() => {
      const buildingsWithRating = filteredBuildings.filter(b => b.rating)
      const routesWithRating = filteredRoutes.filter(r => r.rating)
      const totalRatings = [...buildingsWithRating, ...routesWithRating]

      if (totalRatings.length === 0) return 0
      const sum = totalRatings.reduce((sum, item) => sum + (item.rating || 0), 0)
      return sum / totalRatings.length
    })(),
    topCity: uniqueValues.cities[0] || 'Berlin'
  }), [filteredBuildings, filteredRoutes, uniqueValues.cities])

  const getTransportIcon = (mode?: string) => {
    switch (mode) {
      case 'walking': return <Footprints className="w-4 h-4" />
      case 'cycling': return <Bike className="w-4 h-4" />
      case 'driving': return <Car className="w-4 h-4" />
      case 'public_transport': return <Bus className="w-4 h-4" />
      default: return <Navigation className="w-4 h-4" />
    }
  }

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Обработчик добавления здания в маршрут
  const handleAddBuildingToRoute = useCallback((buildingId: string) => {
    if (selectedBuildingsForRoute.includes(buildingId)) {
      // Уже добавлено
      return
    }

    if (selectedBuildingsForRoute.length >= 20) {
      toast.error('⚠️ Maximum 20 buildings per route')
      return
    }

    setSelectedBuildingsForRoute(prev => [...prev, buildingId])
    toast.success('✅ Added to route')
  }, [selectedBuildingsForRoute])

  // Обработчик удаления здания из маршрута
  const handleRemoveBuildingFromRoute = useCallback((buildingId: string) => {
    setSelectedBuildingsForRoute(prev => prev.filter(id => id !== buildingId))
    toast.success('🗑️ Removed from route')
  }, [])

  // Обработчик начала маршрута с выбранного здания
  const handleStartRouteFromBuilding = useCallback((buildingId: string) => {
    setSelectedBuildingsForRoute([buildingId])
    setRouteCreationMode(true)
    toast.success('🚀 Route started from this building')
  }, [])

  // Обработчик изменения порядка зданий
  const handleReorderBuildings = useCallback((buildingIds: string[]) => {
    setSelectedBuildingsForRoute(buildingIds)
  }, [])

  // Обработчик клика на кнопку "Создать маршрут"
  const handleRouteCreationButtonClick = useCallback(() => {
    console.log('🔍 [BUTTON] Create route button clicked')

    // Если уже есть >= 2 здания в процессе создания - открыть форму создания
    if (selectedBuildingsForRoute.length >= 2) {
      console.log('🔍 [BUTTON] Opening creation modal (have enough buildings)...')
      setIsRouteCreationModalOpen(true)
      return
    }

    // Если режим создания активен но зданий мало - выход из режима
    if (routeCreationMode) {
      console.log('🔍 [BUTTON] Exiting creation mode...')
      if (selectedBuildingsForRoute.length > 0) {
        if (confirm('Exit creation mode? Selected buildings will be reset.')) {
          setRouteCreationMode(false)
          setSelectedBuildingsForRoute([])
        }
      } else {
        setRouteCreationMode(false)
      }
      return
    }

    // Иначе показываем модальное окно выбора способа создания
    console.log('🔍 [BUTTON] Opening method selection modal...')
    setIsRouteMethodModalOpen(true)
  }, [routeCreationMode, selectedBuildingsForRoute])

  // Обработчики для модального окна выбора способа создания
  const handleSelectManualCreation = useCallback(() => {
    setIsRouteMethodModalOpen(false)
    setRouteCreationMode(true)
    toast.success('🗺️ Route creation mode activated! Click on buildings to add them.')
  }, [])

  const handleSelectAICreation = useCallback(() => {
    setIsRouteMethodModalOpen(false)
    // Пока заглушка - позже добавим AI форму
    toast('🤖 AI route generation coming soon!', { icon: 'ℹ️' })
  }, [])

  // Сохранение личного маршрута
  const handleSavePersonalRoute = useCallback(async (routeName: string) => {
    if (!user) {
      toast.error('Authentication required')
      return
    }

    if (selectedBuildingsForRoute.length < 2) {
      toast.error('Add at least 2 buildings')
      return
    }

    try {
      // Получаем данные зданий
      const buildingsData = buildings.filter(b => selectedBuildingsForRoute.includes(b.id))

      // Строим маршрут по реальным дорогам с использованием MapBox
      toast.loading('Building route along real roads...')

      const routePointsForApi = buildingsData.map(building => ({
        latitude: building.latitude,
        longitude: building.longitude,
        title: building.name
      }))

      let routeResult
      try {
        routeResult = await buildRoute(routePointsForApi, {
          transportMode: 'walking'
        })
        console.log('✅ Маршрут построен:', routeResult)
      } catch (routeError) {
        console.error('⚠️ Ошибка построения маршрута:', routeError)
        toast('Using straight lines (MapBox unavailable)', { icon: '⚠️' })
        // Fallback к простой геометрии
        routeResult = {
          geometry: {
            type: 'LineString' as const,
            coordinates: buildingsData.map(b => [b.longitude, b.latitude])
          },
          distance: 0,
          duration: 0,
          instructions: [],
          summary: { distance: 0, duration: 0 }
        }
      }

      // Создаем маршрут с реальной геометрией
      const { data: route, error } = await supabase
        .from('routes')
        .insert({
          title: routeName,
          description: `Personal route with ${selectedBuildingsForRoute.length} buildings`,
          city: buildingsData[0]?.city || '',
          country: buildingsData[0]?.country || '',
          route_geometry: routeResult.geometry as any,
          route_instructions: routeResult.instructions as any,
          route_summary: routeResult.summary as any,
          distance_km: routeResult.distance > 0 ? routeResult.distance / 1000 : null,
          estimated_duration_minutes: routeResult.duration > 0 ? Math.round(routeResult.duration / 60) : null,
          transport_mode: 'walking',
          created_by: user.id,
          is_published: false, // Личный маршрут не публичный
          route_visibility: 'private',
          points_count: selectedBuildingsForRoute.length
        })
        .select()
        .single()

      if (error) throw error

      // Связываем здания с маршрутом через route_points
      const routePoints = selectedBuildingsForRoute.map((buildingId, index) => {
        const building = buildingsData.find(b => b.id === buildingId)
        if (!building) return null

        return {
          route_id: route.id,
          building_id: buildingId,
          order_index: index,
          title: building.name,
          description: building.description || '',
          latitude: building.latitude,
          longitude: building.longitude,
          point_type: 'building'
        }
      }).filter(Boolean)

      const { error: linkError } = await supabase
        .from('route_points')
        .insert(routePoints)

      if (linkError) throw linkError

      toast.success('Route created successfully!')

      // Очищаем состояние
      setSelectedBuildingsForRoute([])
      setRouteCreationMode(false)
      setIsRouteCreationModalOpen(false)

      // Перезагружаем данные
      await loadData()

    } catch (error: any) {
      console.error('Ошибка создания маршрута:', error)
      toast.error('❌ Route creation error: ' + (error.message || 'Unknown error'))
    }
  }, [user, selectedBuildingsForRoute, buildings])

  // Отслеживание изменений selectedBuildingsForRoute
  useEffect(() => {
    console.log('🔍 [STATE] selectedBuildingsForRoute changed:', selectedBuildingsForRoute)
    console.log('🔍 [STATE] length:', selectedBuildingsForRoute.length)
  }, [selectedBuildingsForRoute])

  // Установка глобальных handlers для popup кнопок
  useEffect(() => {
    // Handler для кнопки "Подробнее" в popup
    (window as any).buildingDetailsHandler = (buildingId: string) => {
      const building = buildings.find(b => b.id === buildingId)
      if (building) {
        handleBuildingDetails(building)
      }
    }

    // Глобальный event listener для кнопок "Добавить в маршрут"
    const handleAddToRouteClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const button = target.closest('.add-to-route-btn') as HTMLButtonElement

      if (button && button.dataset.buildingId) {
        event.preventDefault()
        event.stopPropagation()

        const buildingId = button.dataset.buildingId

        if (selectedBuildingsForRoute.includes(buildingId)) {
          toast('Building already added', { icon: 'ℹ️' })
          return
        }

        if (selectedBuildingsForRoute.length >= 20) {
          toast.error('⚠️ Maximum 20 buildings per route')
          return
        }

        setSelectedBuildingsForRoute(prev => [...prev, buildingId])
        toast.success('✅ Added to route')
      }
    }

    document.addEventListener('click', handleAddToRouteClick)

    return () => {
      delete (window as any).buildingDetailsHandler
      document.removeEventListener('click', handleAddToRouteClick)
    }
  }, [buildings, handleBuildingDetails, selectedBuildingsForRoute])

  if (loading) {
    return <PageLoader message="Loading map..." size="lg" />
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Оригинальный хэдер */}
      <Suspense fallback={<div className="h-16 bg-white border-b" />}>
        <Header buildings={buildings} />
      </Suspense>


      {/* Основной контент в стиле Яндекс.Путешествий */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gray-50 relative">

        {/* Боковая панель фильтров - скрыта на мобильных, видна на desktop */}
        <div className="hidden md:flex md:flex-col md:w-80 bg-white border-r border-gray-200 relative z-20 shadow-lg h-full">
          {/* Панель фильтров со скроллом */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <LazyFilterPanel
              filters={filters}
              uniqueValues={uniqueValues}
              onFilterChange={(filters) => setFilters(filters)}
              onReset={clearFilters}
              showFilters={true}
              onToggleFilters={() => { }}
              radiusMode={radiusMode}
              onRadiusModeChange={setRadiusMode}
            />
          </div>
        </div>

        {/* Основная область результатов */}
        <div className="flex-1 flex flex-col">
          {/* Контент: список объектов или карта */}
          <div className="flex-1 flex relative">
            {/* Список объектов с плавной анимацией заезда влево (заходит ПОД панель фильтров) - ТОЛЬКО НА DESKTOP */}
            <div
              className={`hidden md:flex bg-white border-r border-gray-200 shadow-xl flex-col h-full transition-all duration-500 ease-in-out absolute left-0 top-0 bottom-0 z-10 ${showSidebar ? 'w-[360px] lg:w-[420px] xl:w-[480px] translate-x-0' : 'w-[360px] lg:w-[420px] xl:w-[480px] -translate-x-full'
                }`}
            >
              <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100vh-8rem)]">
                {mapView === 'buildings' && (
                  <LazyBuildingList
                    buildings={filteredBuildings}
                    selectedBuilding={selectedBuilding}
                    currentRouteBuildings={selectedBuildingsForRoute}
                    onBuildingSelect={(b) => { setSelectedBuilding(b); setHoveredBuilding(b.id) }}
                    onBuildingDetails={handleBuildingDetails}
                    onAddToRoute={handleAddBuildingToRoute}
                    onStartRouteFrom={handleStartRouteFromBuilding}
                    onRemoveFromRoute={handleRemoveBuildingFromRoute}
                    maxHeight="max-h-[calc(100vh-12rem)]"
                  />
                )}

                {mapView === 'routes' && (
                  <div>
                    {/* Переключатель публичные/личные маршруты */}
                    {user && (
                      <div className="flex gap-1 p-1 bg-muted rounded-[var(--radius)] mb-3 mx-2 mt-2">
                        <button
                          onClick={() => setRouteViewMode('public')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-all ${routeViewMode === 'public'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Public
                        </button>
                        <button
                          onClick={() => setRouteViewMode('personal')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-all ${routeViewMode === 'personal'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          Personal
                        </button>
                      </div>
                    )}
                    <LazyRouteList
                      routes={filteredRoutes}
                      selectedRoute={selectedRoute}
                      onRouteSelect={(r) => { setSelectedRoute(r); setHoveredRoute(r.id) }}
                      onRouteDetails={handleRouteDetails}
                      maxHeight="max-h-[calc(100vh-14rem)]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Карта MapLibre - WebGL рендеринг, векторные тайлы */}
            <div className="absolute inset-0 z-0">
              <MapLibreEnhanced
                ref={mapRef}
                buildings={filteredBuildings}
                routes={filteredRoutes.map(convertRouteForMap)}
                selectedBuilding={selectedBuilding?.id || null}
                selectedRoute={selectedRoute?.id || null}
                hoveredRoute={hoveredRoute}
                hoveredBuilding={hoveredBuilding}
                onBuildingClick={handleBuildingClick}
                onRouteClick={handleRouteClick}
                onAddToRoute={routeCreationMode ? handleAddBuildingToRoute : undefined}
                onStartRouteFrom={routeCreationMode ? handleStartRouteFromBuilding : undefined}
                onBuildingDetails={handleBuildingDetails}
                onRouteDetails={handleRouteDetails}
                // Обработчик клика на карте (для радиуса и добавления объекта)
                onMapClick={(lat, lng) => {
                  if (radiusMode === 'map') {
                    setRadiusCenter({ lat, lng })
                  } else if (addBuildingMode) {
                    handleMapClickForBuilding(lat, lng)
                  }
                }}
                radiusCenter={filters.currentLocation || radiusCenter}
                radiusKm={filters.radiusKm}
                showBuildings={true}
                showRoutes={true}
                radiusMode={radiusMode}
                addBuildingMode={addBuildingMode}
                routeCreationMode={routeCreationMode}
                selectedBuildingsForRoute={selectedBuildingsForRoute}
                onViewStateChange={(center) => setMapCenter(center)}
                className="h-full w-full"
              />

              {/* Островок с кнопками управления (как стили карты) - ТОЛЬКО НА DESKTOP */}
              <div className="hidden md:flex absolute top-4 right-14 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                <div className="flex space-x-2">
                  {/* Кнопка Объекты */}
                  <button
                    onClick={() => setMapView(prev => prev === 'buildings' ? null : 'buildings')}
                    className={`px-4 py-2 text-sm rounded transition-colors flex items-center space-x-2 font-medium ${mapView === 'buildings'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    title={mapView === 'buildings' ? 'Hide objects panel' : 'Show objects panel'}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Buildings</span>
                  </button>

                  {/* Кнопка Маршруты */}
                  <button
                    onClick={() => setMapView(prev => prev === 'routes' ? null : 'routes')}
                    className={`px-4 py-2 text-sm rounded transition-colors flex items-center space-x-2 font-medium ${mapView === 'routes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    title={mapView === 'routes' ? 'Hide routes panel' : 'Show routes panel'}
                  >
                    <RouteIcon className="w-4 h-4" />
                    <span>Routes</span>
                  </button>

                  {/* Кнопка добавления объекта (только в режиме "Объекты") */}
                  {user && mapView === 'buildings' && (
                    <button
                      onClick={handleToggleAddBuildingMode}
                      className={`px-4 py-2 text-sm rounded transition-all flex items-center space-x-2 font-medium ${addBuildingMode || showInstructionModal
                        ? 'bg-green-600 text-white ring-2 ring-green-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      title={addBuildingMode ? 'Exit add building mode' : 'Add building to map'}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Building</span>
                    </button>
                  )}

                  {/* Кнопка создания маршрута (только в режиме "Маршруты") */}
                  {user && mapView === 'routes' && (
                    <button
                      onClick={handleRouteCreationButtonClick}
                      className={`px-4 py-2 text-sm rounded transition-all flex items-center space-x-2 font-medium ${selectedBuildingsForRoute.length >= 2
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : routeCreationMode
                          ? 'bg-purple-600 text-white ring-2 ring-purple-200'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      title={selectedBuildingsForRoute.length >= 2 ? 'Open creation form' : routeCreationMode ? 'Exit creation mode' : 'Activate creation mode'}
                    >
                      <Navigation2 className="w-4 h-4" />
                      <span>
                        {selectedBuildingsForRoute.length >= 2
                          ? `Create Route (${selectedBuildingsForRoute.length})`
                          : 'Create Route'}
                      </span>
                      {selectedBuildingsForRoute.length > 0 && selectedBuildingsForRoute.length < 2 && (
                        <span className="ml-1 text-xs opacity-75">({selectedBuildingsForRoute.length})</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Модальное окно для детального просмотра здания */}
      <BuildingModal
        building={modalBuilding}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Модальное окно для детального просмотра маршрута */}
      <RouteViewerModal
        route={modalRoute}
        isOpen={isRouteModalOpen}
        onClose={handleCloseRouteModal}
      />

      {/* Модальное окно для создания личного маршрута */}
      {/* Модальное окно выбора способа создания маршрута */}
      <RouteCreationMethodModal
        isOpen={isRouteMethodModalOpen}
        onClose={() => setIsRouteMethodModalOpen(false)}
        onSelectManual={handleSelectManualCreation}
        onSelectAI={handleSelectAICreation}
      />

      {/* Модальное окно создания личного маршрута */}
      <PersonalRouteCreationModal
        isOpen={isRouteCreationModalOpen}
        onClose={() => setIsRouteCreationModalOpen(false)}
        selectedBuildings={buildings.filter(b => selectedBuildingsForRoute.includes(b.id))}
        onRemoveBuilding={handleRemoveBuildingFromRoute}
        onReorderBuildings={handleReorderBuildings}
        onSave={handleSavePersonalRoute}
      />

      {/* RouteCreator (как в Header) */}
      {isRouteCreatorOpen && (
        <RouteCreator
          isOpen={isRouteCreatorOpen}
          onClose={handleCloseRouteCreator}
          user={{ id: 'test-user', email: 'test@example.com' }} // Заглушка для тестирования
          buildings={buildings}
          initialMode={routeCreatorMode}
        />
      )}

      {/* Инструкционное модальное окно для режима добавления */}
      <AddBuildingInstructionModal
        isOpen={showInstructionModal}
        onConfirm={handleInstructionConfirm}
        onCancel={handleInstructionCancel}
      />

      {/* Модальное окно формы добавления здания */}
      <AddBuildingFormModal
        isOpen={showAddBuildingForm}
        location={selectedNewLocation}
        onClose={handleCloseAddBuildingForm}
        onSave={handleSaveNewBuilding}
      />

      {/* Mobile Route Creation Floating Panel */}
      {routeCreationMode && (
        <div className="md:hidden fixed bottom-24 left-2 right-2 z-[35] animate-fadeIn">
          <div className="bg-card border-2 border-[#E07A5F] rounded-[var(--radius)] shadow-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Route creation
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedBuildingsForRoute.length === 0
                    ? 'Tap buildings on the map to add'
                    : `${selectedBuildingsForRoute.length} building${selectedBuildingsForRoute.length !== 1 ? 's' : ''} selected`
                  }
                  {selectedBuildingsForRoute.length > 0 && selectedBuildingsForRoute.length < 2 && (
                    <span className="text-[#E07A5F]"> — need at least 2</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {selectedBuildingsForRoute.length >= 2 && (
                  <button
                    onClick={() => setIsRouteCreationModalOpen(true)}
                    className="px-3 py-1.5 bg-[#E07A5F] text-white text-xs font-medium rounded-[var(--radius)] hover:bg-[#D06A4F] transition-colors"
                  >
                    Create ({selectedBuildingsForRoute.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setRouteCreationMode(false)
                    setSelectedBuildingsForRoute([])
                  }}
                  className="px-2.5 py-1.5 bg-muted text-muted-foreground text-xs font-medium rounded-[var(--radius)] hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Control Bar */}
      <MobileControlBar
        onShowFilters={() => {
          setShowMobileFilters(true)
          setShowMobileBuildings(false)
          setShowMobileRoutes(false)
        }}
        onShowBuildings={() => {
          setShowMobileBuildings(true)
          setShowMobileFilters(false)
          setShowMobileRoutes(false)
        }}
        onShowRoutes={() => {
          setShowMobileRoutes(true)
          setShowMobileFilters(false)
          setShowMobileBuildings(false)
        }}
        buildingsCount={filteredBuildings.length}
        routesCount={filteredRoutes.length}
      />

      {/* Mobile Bottom Sheets */}
      <MobileBottomSheet
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Filters"
        showBackdrop={false}
      >
        <LazyFilterPanel
          filters={filters}
          uniqueValues={uniqueValues}
          onFilterChange={(filters) => setFilters(filters)}
          onReset={clearFilters}
          showFilters={true}
          onToggleFilters={() => { }}
          radiusMode={radiusMode}
          onRadiusModeChange={setRadiusMode}
          isMobile={true}
        />
      </MobileBottomSheet>

      <MobileBottomSheet
        isOpen={showMobileBuildings}
        onClose={() => setShowMobileBuildings(false)}
        title={`Buildings (${filteredBuildings.length})`}
        showBackdrop={false}
      >
        {/* Кнопка добавления нового объекта */}
        {user && (
          <div className="mb-2 -mt-2">
            <button
              onClick={() => {
                setShowMobileBuildings(false)
                handleToggleAddBuildingMode()
              }}
              className={`w-full px-4 py-3 text-sm rounded-[var(--radius)] transition-all flex items-center justify-center gap-2 font-medium text-white ${addBuildingMode || showInstructionModal
                ? 'ring-2 ring-orange-200'
                : 'hover:opacity-90 active:opacity-80'
                }`}
              style={{ backgroundColor: '#F26438' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add building to map</span>
            </button>
          </div>
        )}

        <LazyBuildingList
          buildings={buildingsSortedByProximity}
          selectedBuilding={selectedBuilding}
          currentRouteBuildings={selectedBuildingsForRoute}
          onBuildingSelect={(building) => handleBuildingClick(building.id)}
          onBuildingDetails={handleBuildingDetails}
          onAddToRoute={handleAddBuildingToRoute}
          onStartRouteFrom={handleStartRouteFromBuilding}
          onRemoveFromRoute={handleRemoveBuildingFromRoute}
          title=""
        />
      </MobileBottomSheet>

      <MobileBottomSheet
        isOpen={showMobileRoutes}
        onClose={() => setShowMobileRoutes(false)}
        title={`Routes (${filteredRoutes.length})`}
        showBackdrop={false}
      >
        {/* Public/Personal routes toggle */}
        <div className="mb-2 -mt-2">
          <div className="flex gap-1 p-1 bg-muted rounded-[var(--radius)]">
            <button
              onClick={() => setRouteViewMode('public')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-all ${routeViewMode === 'public'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Public
            </button>
            <button
              onClick={() => setRouteViewMode('personal')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-all ${routeViewMode === 'personal'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <User className="w-3.5 h-3.5" />
              Personal
            </button>
          </div>
        </div>

        {/* Create route button */}
        {user && (
          <div className="mb-2">
            <button
              onClick={() => {
                setShowMobileRoutes(false)
                handleRouteCreationButtonClick()
              }}
              className={`w-full px-4 py-3 text-sm rounded-[var(--radius)] transition-all flex items-center justify-center gap-2 font-medium ${selectedBuildingsForRoute.length >= 2
                ? 'bg-[#E07A5F] text-white hover:bg-[#D06A4F] active:bg-[#C05A3F]'
                : routeCreationMode
                  ? 'bg-[#E07A5F] text-white ring-2 ring-[#E07A5F]/30'
                  : 'bg-[#E07A5F] text-white hover:bg-[#D06A4F] active:bg-[#C05A3F]'
                }`}
            >
              <span>
                {selectedBuildingsForRoute.length >= 2
                  ? `Create route (${selectedBuildingsForRoute.length} buildings)`
                  : routeCreationMode
                    ? 'Exit creation mode'
                    : 'Create new route'}
              </span>
            </button>
          </div>
        )}

        <LazyRouteList
          routes={filteredRoutes}
          onRouteClick={handleRouteClick}
          onRouteDetails={handleRouteDetails}
          selectedRouteId={selectedRoute?.id}
          title=""
        />
      </MobileBottomSheet>
    </div>
  )
}
