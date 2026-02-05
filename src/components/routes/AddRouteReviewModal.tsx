'use client'

import { useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { X, Star, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddRouteReviewModalProps {
    routeId: string
    routeTitle: string
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddRouteReviewModal({
    routeId,
    routeTitle,
    isOpen,
    onClose,
    onSuccess
}: AddRouteReviewModalProps) {
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()

    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [completionTime, setCompletionTime] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!user) {
            toast.error('Please sign in to submit a review')
            return
        }

        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }

        setLoading(true)

        try {
            // Create review
            const { error } = await supabase
                .from('route_reviews')
                .insert({
                    route_id: routeId,
                    user_id: user.id,
                    rating,
                    title: title.trim() || null,
                    content: content.trim() || null,
                    completion_time_minutes: completionTime ? parseInt(completionTime) : null
                })

            if (error) throw error

            toast.success('Review submitted successfully!')

            // Reset form
            setRating(0)
            setTitle('')
            setContent('')
            setCompletionTime('')

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error submitting review:', error)
            toast.error(error.message || 'Error submitting review')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-[var(--radius)] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Write a Review</h2>
                        <p className="text-sm text-muted-foreground truncate">{routeTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-5">
                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Rating <span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 transition-colors ${star <= (hoveredRating || rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-muted-foreground'
                                            }`}
                                    />
                                </button>
                            ))}
                            {rating > 0 && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                    {rating}/5
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Summarize your experience"
                            maxLength={100}
                            className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium mb-2">
                            Your Review
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share details about your experience on this route..."
                            rows={4}
                            maxLength={2000}
                            className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                            {content.length}/2000
                        </p>
                    </div>

                    {/* Completion Time */}
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium mb-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Completion Time (minutes)
                        </label>
                        <input
                            type="number"
                            id="time"
                            value={completionTime}
                            onChange={(e) => setCompletionTime(e.target.value)}
                            placeholder="How long did it take?"
                            min={1}
                            max={1440}
                            className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || rating === 0}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Review'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
