'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import { 
  MessageSquare, 
  ArrowLeft, 
  Star, 
  Edit3, 
  Trash2, 
  Eye, 
  Calendar,
  Building2,
  Filter,
  Search,
  Grid3X3,
  List,
  AudioLines,
  Image
} from 'lucide-react'
import Link from 'next/link'

interface ReviewWithBuilding {
  id: string
  building_id: string
  user_id: string
  rating: number
  title: string | null
  content: string | null
  photos: string[] | null
  visit_date: string | null
  is_verified: boolean
  helpful_count: number
  created_at: string
  updated_at: string
  review_type: 'general' | 'expert' | 'historical' | 'amateur'
  audio_url: string | null
  audio_duration_seconds: number | null
  tags: string[] | null
  is_featured: boolean
  language: string
  source_type: 'user' | 'import' | 'ai'
  buildings: {
    id: string
    name: string
    city: string
    image_url: string | null
    architect: string | null
    year_built: number | null
  }
}

export default function ProfileReviewsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithBuilding[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRating, setFilterRating] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'rating' | 'helpful_count'>('created_at')

  useEffect(() => {
    if (user) {
      loadUserReviews()
    }
  }, [user, sortBy])

  const loadUserReviews = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('building_reviews')
        .select(`
          *,
          buildings:building_id (
            id,
            name,
            city,
            image_url,
            architect,
            year_built
          )
        `)
        .eq('user_id', user.id)
        .order(sortBy, { ascending: false })

      if (error) throw error

      setReviews(data || [])
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот обзор? Это действие нельзя отменить.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('building_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user?.id)

      if (error) throw error

      setReviews(prev => prev.filter(r => r.id !== reviewId))
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Ошибка при удалении обзора')
    }
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.buildings.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRating = !filterRating || review.rating.toString() === filterRating
    const matchesType = !filterType || review.review_type === filterType
    
    return matchesSearch && matchesRating && matchesType
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getReviewTypeDisplayName = (type: string) => {
    const names = {
      'general': 'Общий',
      'expert': 'Экспертный',
      'historical': 'Исторический',
      'amateur': 'Любительский'
    }
    return names[type as keyof typeof names] || type
  }

  const getReviewTypeColor = (type: string) => {
    const colors = {
      'general': 'bg-blue-100 text-blue-800',
      'expert': 'bg-purple-100 text-purple-800',
      'historical': 'bg-amber-100 text-amber-800',
      'amateur': 'bg-green-100 text-green-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const renderStars = (rating: number) => {
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
          {rating}/5
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
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход необходим</h1>
          <p className="text-gray-600 mb-6">Для просмотра ваших обзоров необходимо войти в систему</p>
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
                <MessageSquare className="w-6 h-6 mr-2" />
                Мои обзоры
              </h1>
              <p className="text-gray-600">
                {reviews.length} {reviews.length === 1 ? 'обзор' : reviews.length < 5 ? 'обзора' : 'обзоров'}
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
                  placeholder="Поиск по названию обзора или зданию..."
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
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все рейтинги</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                  <option value="4">⭐⭐⭐⭐ (4)</option>
                  <option value="3">⭐⭐⭐ (3)</option>
                  <option value="2">⭐⭐ (2)</option>
                  <option value="1">⭐ (1)</option>
                </select>
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Все типы</option>
                <option value="general">Общий</option>
                <option value="expert">Экспертный</option>
                <option value="historical">Исторический</option>
                <option value="amateur">Любительский</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">По дате создания</option>
                <option value="rating">По рейтингу</option>
                <option value="helpful_count">По полезности</option>
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
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex space-x-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            {reviews.length === 0 ? (
              <>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Пока нет обзоров</h3>
                <p className="text-gray-500 mb-6">Начните оставлять обзоры на здания!</p>
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
                    setFilterRating('')
                    setFilterType('')
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Сбросить фильтры
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredReviews.map((review) => (
                <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {review.buildings.image_url ? (
                        <img
                          src={review.buildings.image_url}
                          alt={review.buildings.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {review.title || 'Обзор без названия'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewTypeColor(review.review_type)}`}>
                              {getReviewTypeDisplayName(review.review_type)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            Обзор на <Link 
                              href={`/buildings/${review.buildings.id}`}
                              className="font-medium text-blue-600 hover:text-blue-700"
                            >
                              {review.buildings.name}
                            </Link> • {review.buildings.city}
                            {review.buildings.architect && ` • ${review.buildings.architect}`}
                          </p>

                          {review.content && (
                            <p className="text-gray-700 mb-3 line-clamp-2">
                              {review.content}
                            </p>
                          )}

                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(review.created_at)}</span>
                            </div>
                            {review.photos && review.photos.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Image className="w-4 h-4" />
                                <span>{review.photos.length} фото</span>
                              </div>
                            )}
                            {review.audio_url && (
                              <div className="flex items-center space-x-1">
                                <AudioLines className="w-4 h-4" />
                                <span>Аудио</span>
                              </div>
                            )}
                            {review.helpful_count > 0 && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4" />
                                <span>{review.helpful_count} полезно</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 ml-4">
                          <div className="text-right">
                            {renderStars(review.rating)}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/buildings/${review.buildings.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Посмотреть здание"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Удалить обзор"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
