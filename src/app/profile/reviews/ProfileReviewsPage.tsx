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
  AudioLines,
  Image,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { getStorageUrl } from '@/lib/storage'

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
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
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
      alert('Error deleting review')
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
      month: 'short',
      year: 'numeric'
    })
  }

  const getReviewTypeDisplayName = (type: string) => {
    const names = {
      'general': 'General',
      'expert': 'Expert',
      'historical': 'Historical',
      'amateur': 'Amateur'
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
      'pending': 'Pending',
      'approved': 'Published',
      'rejected': 'Rejected'
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
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const getBuildingImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null
    return getStorageUrl(imageUrl, 'photos')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
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
            <h1 className="text-2xl font-heading font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">You must sign in to view your reviews</p>
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              Sign In
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
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-6 sm:pt-10">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-3xl font-heading font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                  Reviews
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm mt-1">
                  <span className="text-muted-foreground">
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </span>
                  {reviews.filter(r => r.moderation_status === 'pending').length > 0 && (
                    <span className="text-amber-600 font-medium">
                      {reviews.filter(r => r.moderation_status === 'pending').length} pending
                    </span>
                  )}
                  {reviews.filter(r => r.moderation_status === 'approved').length > 0 && (
                    <span className="text-green-600 font-medium">
                      {reviews.filter(r => r.moderation_status === 'approved').length} published
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-6 mb-3 sm:mb-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by review title or building..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="general">General</option>
                  <option value="expert">Expert</option>
                  <option value="historical">Historical</option>
                  <option value="amateur">Amateur</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at">By Date</option>
                  <option value="rating">By Rating</option>
                  <option value="helpful_count">By Helpfulness</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-2 sm:space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-[var(--radius)] p-3 sm:p-4">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-muted rounded-[var(--radius)] animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <div className="h-3 sm:h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-2.5 sm:h-3 bg-muted rounded animate-pulse w-1/2" />
                      <div className="h-2.5 sm:h-3 bg-muted rounded animate-pulse w-2/3" />
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
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                  <p className="text-gray-500 mb-6">Start leaving reviews on buildings!</p>
                  <Link
                    href="/"
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Explore Buildings</span>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Nothing Found</h3>
                  <p className="text-gray-500 mb-6">Try changing search parameters or filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterRating('')
                      setFilterType('')
                    }}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                  >
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredReviews.map((review) => (
                <div key={review.id} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-3 sm:p-4">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Building Image */}
                      <Link
                        href={`/buildings/${review.buildings.id}`}
                        className="w-14 h-14 sm:w-20 sm:h-20 bg-muted rounded-[var(--radius)] overflow-hidden flex-shrink-0"
                      >
                        {review.buildings.image_url ? (
                          <img
                            src={getBuildingImageUrl(review.buildings.image_url)!}
                            alt={review.buildings.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                          </div>
                        )}
                      </Link>

                      {/* Review Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title + Rating row */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1 flex-1">
                            {review.title || 'Review without title'}
                          </h3>
                          <div className="flex-shrink-0">
                            {renderStars(review.rating)}
                          </div>
                        </div>

                        {/* Building info */}
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-1.5">
                          <Link
                            href={`/buildings/${review.buildings.id}`}
                            className="font-medium text-primary hover:underline truncate"
                          >
                            {review.buildings.name}
                          </Link>
                          <span className="flex-shrink-0">•</span>
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {review.buildings.city}
                          </span>
                        </div>

                        {/* Review text */}
                        {review.content && (
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
                            {review.content}
                          </p>
                        )}

                        {/* Rejection reason */}
                        {review.moderation_status === 'rejected' && review.rejection_reason && (
                          <div className="mb-2 p-1.5 sm:p-2 bg-red-50 border border-red-200 rounded text-[10px] sm:text-xs text-red-800">
                            <span className="font-medium">Reason:</span> {review.rejection_reason}
                          </div>
                        )}

                        {/* Badges + meta */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getReviewTypeColor(review.review_type)}`}>
                            {getReviewTypeDisplayName(review.review_type)}
                          </span>
                          {review.moderation_status !== 'approved' && (
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium border ${getModerationStatusColor(review.moderation_status)}`}>
                              {getModerationStatusLabel(review.moderation_status)}
                            </span>
                          )}
                          {review.photos && review.photos.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-gray-500">
                              <Image className="w-3 h-3" />
                              {review.photos.length}
                            </span>
                          )}
                          {review.audio_url && (
                            <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-gray-500">
                              <AudioLines className="w-3 h-3" />
                              Audio
                            </span>
                          )}
                          {review.helpful_count > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-gray-500">
                              <Star className="w-3 h-3 text-yellow-400" />
                              {review.helpful_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Link
                          href={`/buildings/${review.buildings.id}`}
                          className="p-1.5 text-primary hover:bg-accent rounded-[var(--radius)] transition-colors"
                          title="View Building"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Link>
                        {(review.moderation_status === 'pending' || review.moderation_status === 'rejected') && (
                          <Link
                            href={`/buildings/${review.buildings.id}/review/${review.id}/edit`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-[var(--radius)] transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-[var(--radius)] transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <EnhancedFooter />
    </div>
  )
}
