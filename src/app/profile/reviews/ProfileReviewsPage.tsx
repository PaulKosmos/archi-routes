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
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

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
  moderation_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
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

  const getModerationStatusLabel = (status: string) => {
    const labels = {
      'pending': 'На рассмотрении',
      'approved': 'Опубликовано',
      'rejected': 'Не прошло модерацию'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getModerationStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground/30'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {rating}/5
        </span>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Вход необходим</h1>
            <p className="text-muted-foreground mb-6">Для просмотра ваших обзоров необходимо войти в систему</p>
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              Войти
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header buildings={[]} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pt-10">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" />
                  Мои обзоры
                </h1>
                <p className="text-muted-foreground mt-1">
                  {reviews.length} {reviews.length === 1 ? 'обзор' : reviews.length < 5 ? 'обзора' : 'обзоров'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Поиск по названию обзора или зданию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="text-sm border border-border rounded-[var(--radius)] px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  className="text-sm border border-border rounded-[var(--radius)] px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  className="text-sm border border-border rounded-[var(--radius)] px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="created_at">По дате создания</option>
                  <option value="rating">По рейтингу</option>
                  <option value="helpful_count">По полезности</option>
                </select>

                <div className="flex items-center border border-border rounded-[var(--radius)]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'} rounded-l-[var(--radius)] transition-colors`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'} rounded-r-[var(--radius)] transition-colors`}
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
                <div key={i} className="bg-card border border-border rounded-[var(--radius)] p-6">
                  <div className="flex space-x-4">
                    <div className="w-20 h-20 bg-muted rounded-[var(--radius)] animate-pulse" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-muted rounded-[var(--radius)] animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded-[var(--radius)] animate-pulse w-1/2" />
                      <div className="h-3 bg-muted rounded-[var(--radius)] animate-pulse w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              {reviews.length === 0 ? (
                <>
                  <h3 className="text-xl font-medium mb-2">Пока нет обзоров</h3>
                  <p className="text-muted-foreground mb-6">Начните оставлять обзоры на здания!</p>
                  <Link
                    href="/"
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Изучить здания</span>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-medium mb-2">Ничего не найдено</h3>
                  <p className="text-muted-foreground mb-6">Попробуйте изменить параметры поиска или фильтры</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterRating('')
                      setFilterType('')
                    }}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                  >
                    Сбросить фильтры
                  </button>
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map((review) => (
                <div key={review.id} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 bg-muted">
                    {review.buildings.image_url ? (
                      <img
                        src={review.buildings.image_url}
                        alt={review.buildings.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getReviewTypeColor(review.review_type)}`}>
                        {getReviewTypeDisplayName(review.review_type)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getModerationStatusColor(review.moderation_status)}`}>
                        {getModerationStatusLabel(review.moderation_status)}
                      </span>
                    </div>
                    {review.moderation_status === 'rejected' && review.rejection_reason && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        <span className="font-medium">Причина:</span> {review.rejection_reason}
                      </div>
                    )}
                    <h3 className="font-semibold mb-2 line-clamp-1">
                      {review.title || 'Обзор без названия'}
                    </h3>
                    <Link
                      href={`/buildings/${review.buildings.id}`}
                      className="text-sm text-primary hover:underline mb-2 block line-clamp-1"
                    >
                      {review.buildings.name}
                    </Link>
                    {review.content && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {review.content}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/buildings/${review.buildings.id}`}
                          className="p-1.5 text-primary hover:bg-accent rounded-[var(--radius)] transition-colors"
                          title="Посмотреть здание"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {(review.moderation_status === 'pending' || review.moderation_status === 'rejected') && (
                          <Link
                            href={`/buildings/${review.buildings.id}/review/${review.id}/edit`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-[var(--radius)] transition-colors"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-[var(--radius)] transition-colors"
                          title="Удалить обзор"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
              <div className="divide-y divide-border">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="p-4 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-muted rounded-[var(--radius)] overflow-hidden flex-shrink-0">
                        {review.buildings.image_url ? (
                          <img
                            src={review.buildings.image_url}
                            alt={review.buildings.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold line-clamp-1">
                                {review.title || 'Обзор без названия'}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getReviewTypeColor(review.review_type)}`}>
                                {getReviewTypeDisplayName(review.review_type)}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${getModerationStatusColor(review.moderation_status)}`}>
                                {getModerationStatusLabel(review.moderation_status)}
                              </span>
                            </div>

                            {review.moderation_status === 'rejected' && review.rejection_reason && (
                              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                <span className="font-medium">Причина отклонения:</span> {review.rejection_reason}
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground mb-2">
                              Обзор на <Link
                                href={`/buildings/${review.buildings.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {review.buildings.name}
                              </Link> • {review.buildings.city}
                              {review.buildings.architect && ` • ${review.buildings.architect}`}
                            </p>

                            {review.content && (
                              <p className="text-sm mb-2 line-clamp-2">
                                {review.content}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(review.created_at)}</span>
                              </div>
                              {review.photos && review.photos.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Image className="w-3 h-3" />
                                  <span>{review.photos.length} фото</span>
                                </div>
                              )}
                              {review.audio_url && (
                                <div className="flex items-center gap-1">
                                  <AudioLines className="w-3 h-3" />
                                  <span>Аудио</span>
                                </div>
                              )}
                              {review.helpful_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  <span>{review.helpful_count} полезно</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ml-4">
                            <div className="text-right">
                              {renderStars(review.rating)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/buildings/${review.buildings.id}`}
                                className="p-2 text-primary hover:bg-accent rounded-[var(--radius)] transition-colors"
                                title="Посмотреть здание"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {(review.moderation_status === 'pending' || review.moderation_status === 'rejected') && (
                                <Link
                                  href={`/buildings/${review.buildings.id}/review/${review.id}/edit`}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-[var(--radius)] transition-colors"
                                  title="Редактировать"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Link>
                              )}
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-[var(--radius)] transition-colors"
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
      </main>
      <EnhancedFooter />
    </div>
  )
}
