'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Search,
  Filter,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  Globe,
  Volume2,
  Languages,
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ReviewAIDetail from '@/components/moderation/ReviewAIDetail'

interface ReviewRow {
  id: string
  title: string | null
  content: string
  rating: number | null
  language: string | null
  original_language: string | null
  created_at: string
  workflow_stage: string | null
  ai_moderation_status: string | null
  ai_moderation_score: number | null
  building_id: string
  buildings: { id: string; name: string } | null
  profiles: { id: string; username: string | null; full_name: string | null } | null
  review_translations: { id: string; language: string; is_original: boolean; ai_audio_url: string | null }[]
}

const WORKFLOW_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700',
  moderating: 'bg-blue-100 text-blue-700',
  translating: 'bg-indigo-100 text-indigo-700',
  ready: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const AI_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  passed: 'bg-green-100 text-green-700',
  flagged: 'bg-red-100 text-red-700',
  error: 'bg-orange-100 text-orange-700',
}

export default function AdminReviewsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()

  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterWorkflow, setFilterWorkflow] = useState<string>('all')
  const [filterAI, setFilterAI] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const isModerator = profile?.role === 'moderator' || profile?.role === 'admin'

  const loadReviews = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('building_reviews')
        .select(`
          id, title, content, rating, language, original_language,
          created_at, workflow_stage, ai_moderation_status, ai_moderation_score,
          building_id,
          buildings!building_reviews_building_id_fkey(id, name),
          profiles!building_reviews_user_id_fkey(id, username, full_name),
          review_translations!review_translations_review_id_fkey(id, language, is_original, ai_audio_url)
        `)
        .order('created_at', { ascending: false })

      if (filterWorkflow !== 'all') {
        query = query.eq('workflow_stage', filterWorkflow)
      }
      if (filterAI !== 'all') {
        query = query.eq('ai_moderation_status', filterAI)
      }

      const { data, error } = await query
      if (error) {
        console.error('Supabase error:', error.message, error.details, error.hint, error.code)
        throw new Error(error.message || 'Failed to load reviews')
      }
      setReviews((data as unknown as ReviewRow[]) || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load reviews'
      console.error('Error loading reviews:', msg, err)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase, filterWorkflow, filterAI])

  useEffect(() => {
    if (!user || !isModerator) return
    loadReviews()
  }, [user, isModerator, loadReviews])

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews
    const q = searchQuery.toLowerCase()
    return reviews.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.content?.toLowerCase().includes(q) ||
        r.buildings?.name?.toLowerCase().includes(q) ||
        r.profiles?.full_name?.toLowerCase().includes(q) ||
        r.profiles?.username?.toLowerCase().includes(q)
    )
  }, [reviews, searchQuery])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!isModerator) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Access Denied</h2>
          <p className="text-yellow-700">You don't have permission to access this page</p>
        </div>
      </div>
    )
  }

  // Summary stats
  const statsPublished = reviews.filter((r) => r.workflow_stage === 'published').length
  const statsPending = reviews.filter(
    (r) => r.workflow_stage && !['published', 'rejected'].includes(r.workflow_stage)
  ).length
  const statsNoTranslations = reviews.filter((r) => r.review_translations.length === 0).length
  const statsNoAudio = reviews.filter(
    (r) => r.review_translations.length > 0 && r.review_translations.every((t) => !t.ai_audio_url)
  ).length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Reviews Management</h1>
        <p className="text-gray-600">
          Manage translations and audio for all reviews. Approved reviews can have translations
          re-generated or audio added without re-moderation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-700 mb-1">Published</p>
          <p className="text-2xl font-bold text-green-900">{statsPublished}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-700 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-amber-900">{statsPending}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs text-indigo-700 mb-1">No Translations</p>
          <p className="text-2xl font-bold text-indigo-900">{statsNoTranslations}</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
          <p className="text-xs text-violet-700 mb-1">No Audio</p>
          <p className="text-2xl font-bold text-violet-900">{statsNoAudio}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, content, building, author..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={filterWorkflow}
              onChange={(e) => setFilterWorkflow(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="submitted">Submitted</option>
              <option value="moderating">Moderating</option>
              <option value="translating">Translating</option>
              <option value="ready">Ready</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filterAI}
              onChange={(e) => setFilterAI(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All AI Statuses</option>
              <option value="pending">AI Pending</option>
              <option value="passed">AI Passed</option>
              <option value="flagged">AI Flagged</option>
              <option value="error">AI Error</option>
            </select>

            <button
              onClick={loadReviews}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MessageSquare className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => {
            const expanded = expandedIds.has(review.id)
            const translationCount = review.review_translations.length
            const audioCount = review.review_translations.filter((t) => t.ai_audio_url).length
            const translationLangs = review.review_translations.map((t) => t.language).join(', ')
            const aiScore = review.ai_moderation_score

            return (
              <div
                key={review.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: content info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Workflow stage badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            WORKFLOW_COLORS[review.workflow_stage || ''] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {review.workflow_stage || 'unknown'}
                        </span>

                        {/* AI status badge */}
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            AI_STATUS_COLORS[review.ai_moderation_status || ''] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {review.ai_moderation_status === 'passed' ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : review.ai_moderation_status === 'flagged' ? (
                            <ShieldAlert className="w-3 h-3" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          AI: {review.ai_moderation_status || 'pending'}
                          {aiScore !== null && aiScore !== undefined && (
                            <span className="ml-0.5 opacity-70">({Math.round(aiScore * 100)}%)</span>
                          )}
                        </span>

                        {/* Rating */}
                        {review.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <Star className="w-3 h-3 fill-current" />
                            {review.rating}
                          </span>
                        )}

                        {/* Language */}
                        {(review.original_language || review.language) && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Globe className="w-3 h-3" />
                            {review.original_language || review.language}
                          </span>
                        )}
                      </div>

                      {/* Building name */}
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/buildings/${review.building_id}`}
                          target="_blank"
                          className="text-sm font-semibold text-blue-700 hover:underline truncate"
                        >
                          {review.buildings?.name || 'Unknown building'}
                        </Link>
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </div>

                      {/* Review title/content */}
                      {review.title && (
                        <p className="text-sm font-medium text-gray-800 mb-0.5">{review.title}</p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>

                      {/* Author + date */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>
                          by{' '}
                          <span className="text-gray-600">
                            {review.profiles?.full_name ||
                              review.profiles?.username ||
                              'Unknown author'}
                          </span>
                        </span>
                        <span>{new Date(review.created_at).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>

                    {/* Right: translations/audio indicators + expand */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {/* Translations indicator */}
                        <div
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
                            translationCount > 0
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                          title={translationCount > 0 ? `Languages: ${translationLangs}` : 'No translations'}
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span>{translationCount} lang</span>
                        </div>

                        {/* Audio indicator */}
                        <div
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
                            audioCount > 0
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                          title={audioCount > 0 ? `Audio: ${audioCount} language(s)` : 'No audio'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{audioCount} audio</span>
                        </div>
                      </div>

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpand(review.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Hide AI panel
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            AI / Translations
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable AI panel */}
                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                    <ReviewAIDetail
                      reviewId={review.id}
                      moderatorId={user!.id}
                      allowRegenerateTranslations
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Count */}
      {!loading && filteredReviews.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-6">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </p>
      )}
    </div>
  )
}
