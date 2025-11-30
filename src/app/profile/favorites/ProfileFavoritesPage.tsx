'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import { 
  Heart, 
  ArrowLeft, 
  Star, 
  Eye, 
  Calendar,
  MapPin,
  Filter,
  Search,
  Grid3X3,
  List,
  Building2,
  X,
  CheckCircle2,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import CollectionIndicator from '@/components/collections/CollectionIndicator'

interface FavoriteBuilding {
  id: string
  user_id: string
  building_id: string
  notes: string | null
  personal_rating: number | null
  visit_status: 'want_to_visit' | 'visited' | 'favorite'
  visited_at: string | null
  created_at: string
  buildings: {
    id: string
    name: string
    description: string | null
    architect: string | null
    year_built: number | null
    architectural_style: string | null
    city: string
    image_url: string | null
    rating: number | null
    review_count: number | null
    view_count: number | null
  }
}

export default function ProfileFavoritesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteBuilding[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadUserFavorites()
    }
  }, [user])

  const loadUserFavorites = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_building_favorites')
        .select(`
          *,
          buildings:building_id (
            id,
            name,
            description,
            architect,
            year_built,
            architectural_style,
            city,
            image_url,
            rating,
            review_count,
            view_count
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setFavorites(data || [])
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromFavorites = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('user_building_favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user?.id)

      if (error) throw error

      setFavorites(prev => prev.filter(f => f.id !== favoriteId))
    } catch (error) {
      console.error('Error removing from favorites:', error)
      alert('Ошибка при удалении из избранного')
    }
  }

  const handleUpdateVisitStatus = async (favoriteId: string, newStatus: 'want_to_visit' | 'visited' | 'favorite') => {
    try {
      const updateData: any = { visit_status: newStatus }
      
      if (newStatus === 'visited') {
        updateData.visited_at = new Date().toISOString()
      } else {
        updateData.visited_at = null
      }

      const { error } = await supabase
        .from('user_building_favorites')
        .update(updateData)
        .eq('id', favoriteId)
        .eq('user_id', user?.id)

      if (error) throw error

      setFavorites(prev => prev.map(fav => 
        fav.id === favoriteId 
          ? { ...fav, visit_status: newStatus, visited_at: updateData.visited_at }
          : fav
      ))
    } catch (error) {
      console.error('Error updating visit status:', error)
      alert('Ошибка при обновлении статуса')
    }
  }

  const filteredFavorites = favorites.filter(favorite => {
    const building = favorite.buildings
    const matchesSearch = building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         building.architect?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         building.city.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !filterStatus || favorite.visit_status === filterStatus
    const matchesCity = !filterCity || building.city === filterCity
    
    return matchesSearch && matchesStatus && matchesCity
  })

  const uniqueCities = Array.from(new Set(favorites.map(f => f.buildings.city).filter(Boolean)))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusDisplayName = (status: string) => {
    const statusNames = {
      'want_to_visit': 'Хочу посетить',
      'visited': 'Посещено',
      'favorite': 'Избранное'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      'want_to_visit': 'bg-blue-100 text-blue-800',
      'visited': 'bg-green-100 text-green-800',
      'favorite': 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const renderStars = (rating: number) => {
    if (!rating) return null
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход необходим</h1>
          <p className="text-gray-600 mb-6">Для просмотра избранного необходимо войти в систему</p>
          <Link 
            href="/auth" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Heart className="w-6 h-6 mr-2" />
                Избранное
              </h1>
              <p className="text-gray-600">
                {favorites.length} {favorites.length === 1 ? 'здание' : favorites.length < 5 ? 'здания' : 'зданий'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по названию, архитектору или городу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все статусы</option>
                  <option value="want_to_visit">Хочу посетить</option>
                  <option value="visited">Посещено</option>
                  <option value="favorite">Избранное</option>
                </select>
              </div>

              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Все города</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500'} rounded-l-lg transition-colors`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500'} rounded-r-lg transition-colors`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="h-48 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            {favorites.length === 0 ? (
              <>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Пока нет избранных зданий</h3>
                <p className="text-gray-500 mb-6">Начните добавлять интересные здания в избранное!</p>
                <Link
                  href="/"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Изучить здания</span>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-500 mb-6">Попробуйте изменить параметры поиска или фильтры</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterStatus('')
                    setFilterCity('')
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Сбросить фильтры
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map((favorite) => (
              <div key={favorite.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48 bg-gray-200">
                  {favorite.buildings.image_url ? (
                    <img
                      src={favorite.buildings.image_url}
                      alt={favorite.buildings.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(favorite.visit_status)}`}>
                      {getStatusDisplayName(favorite.visit_status)}
                    </span>
                  </div>
                  
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleRemoveFromFavorites(favorite.id)}
                      className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all text-red-600"
                      title="Удалить из избранного"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {favorite.buildings.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {favorite.buildings.architect && (
                      <p>Архитектор: {favorite.buildings.architect}</p>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{favorite.buildings.city}</span>
                      {favorite.buildings.year_built && <span>• {favorite.buildings.year_built}</span>}
                    </div>
                  </div>

                  {favorite.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 italic">"{favorite.notes}"</p>
                    </div>
                  )}
                  
                  {/* Индикатор коллекций */}
                  <CollectionIndicator 
                    buildingId={favorite.buildings.id}
                    className="mt-2"
                  />

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {favorite.visit_status !== 'visited' && (
                          <button
                            onClick={() => handleUpdateVisitStatus(favorite.id, 'visited')}
                            className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                            title="Отметить как посещенное"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Посещено</span>
                          </button>
                        )}
                      </div>
                      
                      <Link
                        href={`/buildings/${favorite.buildings.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Посмотреть
                      </Link>
                    </div>
                    
                    {/* Кнопка добавления в коллекцию */}
                    <div className="mt-2">
                      <AddToCollectionButton
                        buildingId={favorite.buildings.id}
                        buildingName={favorite.buildings.name}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredFavorites.map((favorite) => (
                <div key={favorite.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {favorite.buildings.image_url ? (
                        <img
                          src={favorite.buildings.image_url}
                          alt={favorite.buildings.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {favorite.buildings.name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(favorite.visit_status)}`}>
                              {getStatusDisplayName(favorite.visit_status)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            {favorite.buildings.architect && (
                              <span>Архитектор: {favorite.buildings.architect}</span>
                            )}
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{favorite.buildings.city}</span>
                            </div>
                          </div>

                          {favorite.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700 italic">"{favorite.notes}"</p>
                            </div>
                          )}
                          
                          {/* Индикатор коллекций */}
                          <CollectionIndicator 
                            buildingId={favorite.buildings.id}
                            className="mt-2"
                          />

                          <div className="flex items-center space-x-6 text-sm text-gray-500 mt-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Добавлено {formatDate(favorite.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <AddToCollectionButton
                            buildingId={favorite.buildings.id}
                            buildingName={favorite.buildings.name}
                            size="sm"
                            variant="icon"
                          />
                          {favorite.visit_status !== 'visited' && (
                            <button
                              onClick={() => handleUpdateVisitStatus(favorite.id, 'visited')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Отметить как посещенное"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <Link
                            href={`/buildings/${favorite.buildings.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Посмотреть здание"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleRemoveFromFavorites(favorite.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить из избранного"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
