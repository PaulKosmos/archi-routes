'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { BuildingReviewWithProfile } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'

interface CommunityInsightsProps {
  reviews: BuildingReviewWithProfile[]
  loading?: boolean
}

// Review type configurations
const reviewTypeConfig = {
  expert: {
    badge: 'Эксперт',
    icon: '⭐',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  guide: {
    badge: 'Гид',
    icon: '◆',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  historical: {
    badge: 'История',
    icon: '📚',
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  general: {
    badge: 'Обзор',
    icon: '💬',
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  amateur: {
    badge: 'Энтузиаст',
    icon: '❤️',
    color: 'bg-pink-100 text-pink-700 border-pink-200'
  }
}

export default function CommunityInsights({ reviews, loading }: CommunityInsightsProps) {
  const [selectedType, setSelectedType] = useState<string>('all')

  // Filter reviews by type
  const filteredReviews = selectedType === 'all'
    ? reviews
    : reviews.filter(r => r.review_type === selectedType)

  // Separate expert reviews
  const expertReviews = reviews.filter(r => r.review_type === 'expert' || r.is_featured)
  const featuredReview = expertReviews[0] || reviews[0]

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-12"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!reviews || reviews.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-muted/30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="w-1 h-8 bg-foreground"></div>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Community Insights
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Community <span className="font-light italic">Voices</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Expert reviews, personal impressions and audio guides from our community
              </p>
            </div>

            <Link
              href="/reviews"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            >
              All Reviews
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Review Type Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 text-sm font-medium border transition-all ${
              selectedType === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:border-foreground/30'
            }`}
            style={{ borderRadius: '2px' }}
          >
            Все ({reviews.length})
          </button>
          {Object.entries(reviewTypeConfig).map(([type, config]) => {
            const count = reviews.filter(r => r.review_type === type).length
            if (count === 0) return null

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-all ${
                  selectedType === type
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-border hover:border-foreground/30'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <span>{config.icon}</span>
                <span>{config.badge}</span>
                <span className="text-xs opacity-60">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Reviews Layout - Asymmetric grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured Review - Large card */}
          {featuredReview && (
            <div className="lg:col-span-2">
              <Link
                href={`/buildings/${featuredReview.building_id}`}
                className="group block bg-card border-2 border-border hover:border-foreground/20 transition-all overflow-hidden h-full"
                style={{ borderRadius: '2px' }}
              >
                <div className="p-6 lg:p-8">
                  {/* Featured badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-foreground text-background text-xs font-bold uppercase">
                      Избранное
                    </span>
                    {featuredReview.review_type && reviewTypeConfig[featuredReview.review_type] && (
                      <span className={`px-2 py-1 border text-xs font-medium ${reviewTypeConfig[featuredReview.review_type].color}`}>
                        {reviewTypeConfig[featuredReview.review_type].icon} {reviewTypeConfig[featuredReview.review_type].badge}
                      </span>
                    )}
                  </div>

                  {/* Review title */}
                  {featuredReview.title && (
                    <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-foreground/80 transition-colors">
                      {featuredReview.title}
                    </h3>
                  )}

                  {/* Review content */}
                  <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-4">
                    {featuredReview.content}
                  </p>

                  {/* Author info */}
                  <div className="flex items-center gap-4 pt-4 border-t border-border">
                    {featuredReview.profiles?.avatar_url ? (
                      <Image
                        src={getStorageUrl(featuredReview.profiles.avatar_url, 'photos')}
                        alt={featuredReview.profiles.full_name || 'User'}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted flex items-center justify-center text-lg font-bold text-foreground rounded-full">
                        {featuredReview.profiles?.full_name?.charAt(0) || '?'}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {featuredReview.profiles?.full_name || 'Анонимный пользователь'}
                      </div>
                      {featuredReview.profiles?.role && (
                        <div className="text-xs text-muted-foreground">
                          {featuredReview.profiles.role === 'expert' && '⭐ Эксперт'}
                          {featuredReview.profiles.role === 'guide' && '◆ Гид'}
                          {featuredReview.profiles.role === 'explorer' && 'Исследователь'}
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    {featuredReview.user_rating_avg > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                        <span className="font-bold text-foreground">{featuredReview.user_rating_avg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Audio indicator */}
                  {featuredReview.audio_url && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-muted text-foreground text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span>Аудио-гид доступен</span>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          )}

          {/* Recent Reviews - Compact cards */}
          <div className="space-y-4">
            {filteredReviews.slice(1, 4).map((review) => {
              const typeConfig = review.review_type ? reviewTypeConfig[review.review_type] : reviewTypeConfig.general

              return (
                <Link
                  key={review.id}
                  href={`/buildings/${review.building_id}`}
                  className="group block bg-card border border-border hover:border-foreground/20 transition-all p-5"
                  style={{ borderRadius: '2px' }}
                >
                  {/* Type badge */}
                  {typeConfig && (
                    <div className="mb-3">
                      <span className={`px-2 py-1 border text-xs font-medium inline-flex items-center gap-1 ${typeConfig.color}`}>
                        {typeConfig.icon} {typeConfig.badge}
                      </span>
                    </div>
                  )}

                  {/* Review title */}
                  {review.title && (
                    <h4 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-foreground/80 transition-colors">
                      {review.title}
                    </h4>
                  )}

                  {/* Review content */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {review.content}
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 bg-muted flex items-center justify-center text-xs font-bold text-foreground rounded-full">
                      {review.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-muted-foreground">
                      {review.profiles?.full_name || 'Анонимный'}
                    </span>

                    {review.user_rating_avg > 0 && (
                      <>
                        <span className="mx-1">•</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                          <span className="font-medium text-foreground">{review.user_rating_avg.toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Mobile "View All" button */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
            style={{ borderRadius: '2px' }}
          >
            All Reviews
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
