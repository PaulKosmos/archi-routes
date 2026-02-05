'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Star, Clock, Calendar, ChevronDown, ChevronUp, ThumbsUp } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'
import Link from 'next/link'
import ImageLightbox from '@/components/ui/ImageLightbox'

interface RouteReview {
    id: string
    rating: number
    title: string | null
    content: string | null
    completion_time_minutes: number | null
    photos: string[] | null
    created_at: string
    user_id: string
    profiles: {
        id: string
        username: string | null
        full_name: string | null
        avatar_url: string | null
    }
}

interface RouteReviewsListProps {
    routeId: string
    reviews: RouteReview[]
    onOpenAddReview?: () => void
}

export default function RouteReviewsList({
    routeId,
    reviews,
    onOpenAddReview
}: RouteReviewsListProps) {
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()
    const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
    const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set())
    const [lightboxImages, setLightboxImages] = useState<string[]>([])
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)

    const toggleExpanded = (reviewId: string) => {
        setExpandedReviews(prev => {
            const newSet = new Set(prev)
            if (newSet.has(reviewId)) {
                newSet.delete(reviewId)
            } else {
                newSet.add(reviewId)
            }
            return newSet
        })
    }

    const openLightbox = (photos: string[], index: number) => {
        setLightboxImages(photos.map(p => getStorageUrl(p, 'photos')))
        setLightboxIndex(index)
        setIsLightboxOpen(true)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        className={`w-4 h-4 ${star <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        )
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 md:py-12">
                <p className="text-muted-foreground mb-4">📭 No reviews yet</p>
                {onOpenAddReview && (
                    <button
                        onClick={onOpenAddReview}
                        disabled={!user}
                        className="px-4 py-2 md:px-6 md:py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!user ? 'Sign in to add a review' : ''}
                    >
                        ✍️ Write the first review
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {reviews.map(review => {
                const isExpanded = expandedReviews.has(review.id)

                return (
                    <div
                        key={review.id}
                        className="border border-border rounded-[var(--radius)] p-4 md:p-6 hover:border-primary/50 transition-all"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                    {review.profiles?.avatar_url ? (
                                        <img
                                            src={getStorageUrl(review.profiles.avatar_url, 'avatars')}
                                            alt={review.profiles.full_name || 'Avatar'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>{review.profiles?.full_name?.[0] || review.profiles?.username?.[0] || '?'}</span>
                                    )}
                                </div>

                                <div>
                                    {review.profiles?.username ? (
                                        <Link
                                            href={`/user/${review.profiles.username}`}
                                            className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                                        >
                                            {review.profiles?.full_name || review.profiles?.username || 'User'}
                                        </Link>
                                    ) : (
                                        <p className="font-semibold text-foreground">
                                            {review.profiles?.full_name || 'User'}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(review.created_at)}
                                        </span>
                                        {review.completion_time_minutes && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDuration(review.completion_time_minutes)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Rating */}
                            {renderStars(review.rating)}
                        </div>

                        {/* Title */}
                        {review.title && (
                            <h3 className="font-semibold text-foreground mb-2">
                                {review.title}
                            </h3>
                        )}

                        {/* Content */}
                        {review.content && (
                            <div className="mb-3">
                                <p className={`text-foreground/80 leading-relaxed whitespace-pre-line ${!isExpanded && review.content.length > 300 ? 'line-clamp-3' : ''
                                    }`}>
                                    {review.content}
                                </p>

                                {review.content.length > 300 && (
                                    <button
                                        onClick={() => toggleExpanded(review.id)}
                                        className="mt-2 text-primary hover:text-primary/80 text-sm font-medium flex items-center"
                                    >
                                        {isExpanded ? (
                                            <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                                        ) : (
                                            <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Photos */}
                        {review.photos && review.photos.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                                {review.photos.slice(0, 4).map((photo, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => openLightbox(review.photos!, idx)}
                                        className="relative aspect-square rounded-[var(--radius)] overflow-hidden bg-muted group cursor-pointer"
                                    >
                                        <img
                                            src={getStorageUrl(photo, 'photos')}
                                            alt={`Photo ${idx + 1}`}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                        />
                                        {idx === 3 && review.photos!.length > 4 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="text-white font-semibold">+{review.photos!.length - 4}</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Add Review Button */}
            {onOpenAddReview && (
                <button
                    onClick={onOpenAddReview}
                    disabled={!user}
                    className="w-full py-3 border-2 border-dashed border-primary/50 text-primary rounded-[var(--radius)] hover:bg-primary/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!user ? 'Sign in to add a review' : ''}
                >
                    ✍️ Add Review
                </button>
            )}

            {/* Lightbox */}
            <ImageLightbox
                images={lightboxImages}
                initialIndex={lightboxIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
            />
        </div>
    )
}
