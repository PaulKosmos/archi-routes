'use client'

// src/components/moderation/ReviewAIDetail.tsx
// Shows AI moderation result + translations for a review in the moderation queue

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, Languages,
  Pencil, Check, X, ChevronDown, ChevronUp, Loader2, Bot, Volume2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getStorageUrl } from '@/lib/storage'
import type { AIModerationResult, ReviewTranslation } from '@/types/building'

const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 EN', de: '🇩🇪 DE', es: '🇪🇸 ES',
  fr: '🇫🇷 FR', zh: '🇨🇳 ZH', ar: '🇸🇦 AR', ru: '🇷🇺 RU',
}

interface ReviewAIData {
  workflow_stage: string
  ai_moderation_status: string
  ai_moderation_result: AIModerationResult | null
  ai_moderation_score: number | null
  ai_moderation_model: string | null
  original_language: string | null
  translations: ReviewTranslation[]
}

interface Props {
  reviewId: string       // content_id from moderation_queue
  moderatorId: string
}

export default function ReviewAIDetail({ reviewId, moderatorId }: Props) {
  const [data, setData] = useState<ReviewAIData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [activeLang, setActiveLang] = useState<string | null>(null)
  const [editingLang, setEditingLang] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  const loadData = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const supabase = createClient()

      const [reviewRes, translationsRes] = await Promise.all([
        supabase
          .from('building_reviews')
          .select('workflow_stage, ai_moderation_status, ai_moderation_result, ai_moderation_score, ai_moderation_model, original_language')
          .eq('id', reviewId)
          .single(),
        supabase
          .from('review_translations')
          .select('*')
          .eq('review_id', reviewId)
          .order('is_original', { ascending: false }),
      ])

      const reviewData = reviewRes.data
      const translationsData = translationsRes.data || []

      setData({
        workflow_stage: reviewData?.workflow_stage || 'submitted',
        ai_moderation_status: reviewData?.ai_moderation_status || 'pending',
        ai_moderation_result: reviewData?.ai_moderation_result || null,
        ai_moderation_score: reviewData?.ai_moderation_score ?? null,
        ai_moderation_model: reviewData?.ai_moderation_model || null,
        original_language: reviewData?.original_language || null,
        translations: translationsData,
      })

      // Set first language as active
      if (translationsData.length > 0 && !activeLang) {
        const orig = translationsData.find((t) => t.is_original)
        setActiveLang(orig?.language || translationsData[0].language)
      }

      setLoaded(true)
      setShowPanel(true)
    } catch (err) {
      console.error('Failed to load AI data:', err)
      toast.error('Failed to load AI analysis')
    } finally {
      setLoading(false)
    }
  }, [reviewId, loading, activeLang])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const res = await fetch('/api/reviews/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, retry: true }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('AI moderation restarted...')
      setTimeout(() => loadData(), 6000)
    } catch (err) {
      toast.error('Failed to retry moderation')
    } finally {
      setRetrying(false)
    }
  }

  const [translating, setTranslating] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [showAudioLangPicker, setShowAudioLangPicker] = useState(false)
  const [selectedAudioLangs, setSelectedAudioLangs] = useState<Set<string>>(new Set())

  const handleTriggerTranslation = async () => {
    setTranslating(true)
    try {
      // Get current session token
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch('/api/reviews/translate-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ review_id: reviewId }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Generating translations...')
      setTimeout(() => loadData(), 10000)
    } catch (err) {
      toast.error('Failed to start translation')
    } finally {
      setTranslating(false)
    }
  }

  const startEdit = (t: ReviewTranslation) => {
    setEditingLang(t.language)
    setEditTitle(t.title || '')
    setEditContent(t.content)
  }

  const cancelEdit = () => {
    setEditingLang(null)
    setEditTitle('')
    setEditContent('')
  }

  const saveEdit = async (translationId: string) => {
    if (!editContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/reviews/translate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translation_id: translationId,
          title: editTitle || null,
          content: editContent,
          editor_id: moderatorId,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Translation saved')
      cancelEdit()
      loadData() // reload to reflect changes
    } catch (err) {
      toast.error('Failed to save translation')
    } finally {
      setSaving(false)
    }
  }

  const openAudioPicker = () => {
    if (!data) return
    // Pre-select all languages without existing audio
    const withoutAudio = new Set(
      data.translations.filter((t) => !t.ai_audio_url).map((t) => t.language)
    )
    setSelectedAudioLangs(withoutAudio)
    setShowAudioLangPicker(true)
  }

  const toggleAudioLang = (lang: string) => {
    setSelectedAudioLangs((prev) => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next
    })
  }

  const handleGenerateAudio = async () => {
    if (selectedAudioLangs.size === 0) return
    setShowAudioLangPicker(false)
    setGeneratingAudio(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch('/api/reviews/audio-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ review_id: reviewId, languages: [...selectedAudioLangs] }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      const generated = result.results?.filter((r: any) => r.status === 'generated').length || 0
      toast.success(`Audio generated for ${generated} language(s)`)
      setTimeout(() => loadData(), 2000)
    } catch (err) {
      toast.error('Failed to generate audio')
      console.error(err)
    } finally {
      setGeneratingAudio(false)
    }
  }

  const aiResult = data?.ai_moderation_result
  const score = data?.ai_moderation_score
  const aiStatus = data?.ai_moderation_status

  const scoreColor =
    score === null || score === undefined ? 'gray'
    : score >= 0.8 ? 'green'
    : score >= 0.5 ? 'yellow'
    : 'red'

  const scoreLabel =
    aiStatus === 'pending' ? 'Pending'
    : aiStatus === 'processing' ? 'Processing...'
    : aiStatus === 'error' ? 'Error'
    : aiStatus === 'flagged' ? 'Flagged'
    : aiStatus === 'passed' ? 'Safe'
    : 'Unknown'

  return (
    <div className="mt-3 border border-indigo-100 rounded-lg overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => {
          if (!loaded) {
            loadData()
          } else {
            setShowPanel((v) => !v)
          }
        }}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 transition-colors text-sm font-medium text-indigo-700"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <span>AI Analysis & Translations</span>
          {loaded && data?.ai_moderation_status === 'flagged' && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">⚠ Flagged</span>
          )}
          {loaded && data?.translations && data.translations.length > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
              {data.translations.length} lang
            </span>
          )}
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : showPanel ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {showPanel && data && (
        <div className="bg-white p-4 space-y-4">

          {/* ── AI Moderation Block ── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {scoreColor === 'green' ? (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                ) : scoreColor === 'red' ? (
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                ) : (
                  <Shield className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-semibold text-sm text-gray-800">AI Moderation</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  scoreColor === 'green' ? 'bg-green-100 text-green-800'
                  : scoreColor === 'red' ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {scoreLabel}
                </span>
                {score !== null && score !== undefined && (
                  <span className="text-xs text-gray-500">Score: {(score * 100).toFixed(0)}%</span>
                )}
              </div>

              <button
                onClick={handleRetry}
                disabled={retrying || aiStatus === 'processing'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                  aiStatus === 'pending' || aiStatus === 'error'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Running...' : aiStatus === 'pending' ? 'Run AI Moderation' : 'Retry'}
              </button>
            </div>

            {aiResult && (
              <div className="space-y-2">
                {/* Flags */}
                {aiResult.flags && aiResult.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.flags.map((flag) => (
                      <span key={flag} className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Recommendation:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    aiResult.recommendation === 'approve' ? 'bg-green-100 text-green-800'
                    : aiResult.recommendation === 'reject' ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {aiResult.recommendation}
                  </span>
                </div>

                {/* Reasoning */}
                {aiResult.reasoning && (
                  <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 leading-relaxed">
                    {aiResult.reasoning}
                  </p>
                )}

                {/* Model info */}
                {data.ai_moderation_model && (
                  <p className="text-xs text-gray-400">Model: {data.ai_moderation_model}</p>
                )}
              </div>
            )}

            {aiStatus === 'pending' && (
              <p className="text-sm text-gray-500 italic">AI analysis has not started yet.</p>
            )}
            {aiStatus === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is analyzing the content...
              </div>
            )}
            {aiStatus === 'error' && (
              <p className="text-sm text-red-600">AI analysis failed. Click Retry to try again.</p>
            )}
          </div>

          {/* ── Translations Block ── */}
          {data.translations.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <Languages className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Translations</span>
                <span className="text-xs text-gray-400 ml-auto">
                  Workflow: <strong>{data.workflow_stage}</strong>
                </span>
              </div>

              {/* Language tabs */}
              <div className="flex flex-wrap gap-1 p-3 border-b border-gray-100">
                {data.translations.map((t) => (
                  <button
                    key={t.language}
                    onClick={() => { setActiveLang(t.language); setEditingLang(null) }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      activeLang === t.language
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {LANGUAGE_LABELS[t.language] || t.language}
                    {t.is_original && (
                      <span className={`text-[10px] ${activeLang === t.language ? 'text-indigo-200' : 'text-gray-400'}`}>
                        ★
                      </span>
                    )}
                    {t.admin_edited && (
                      <span className={`text-[10px] ${activeLang === t.language ? 'text-indigo-200' : 'text-gray-400'}`}>
                        ✎
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Active translation content */}
              {data.translations.filter((t) => t.language === activeLang).map((t) => (
                <div key={t.language} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.language}</span>
                      {t.is_original && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">Original</span>
                      )}
                      {t.admin_edited && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Edited</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        t.status === 'approved' ? 'bg-green-100 text-green-700'
                        : t.status === 'ready' || t.status === 'edited_by_admin' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {!t.is_original && editingLang !== t.language && (
                      <button
                        onClick={() => startEdit(t)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingLang === t.language ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(t.id)}
                          disabled={saving || !editContent.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {t.title && (
                        <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {t.content}
                      </p>
                      {t.translation_model && (
                        <p className="text-xs text-gray-400 mt-1">Translated by: {t.translation_model}</p>
                      )}
                      {t.ai_audio_url && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-xs font-medium text-violet-600">AI audio guide</span>
                            {t.ai_audio_model && (
                              <span className="text-xs text-gray-400">· {t.ai_audio_model}</span>
                            )}
                          </div>
                          <audio
                            controls
                            src={getStorageUrl(t.ai_audio_url, 'audio')}
                            className="w-full"
                            style={{ height: '32px' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {data.workflow_stage === 'translating' && (
                <div className="px-4 pb-4 flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating translations...
                </div>
              )}

              {data.translations.length === 0 && data.workflow_stage !== 'translating' && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-amber-600">
                    No translations yet. Use the button below to generate them.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Audio language picker ── */}
          {showAudioLangPicker && data.translations.length > 0 && (
            <div className="border border-violet-200 rounded-lg p-3 bg-violet-50">
              <p className="text-xs font-medium text-violet-700 mb-2">Select languages to generate audio:</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {data.translations.map((t) => (
                  <button
                    key={t.language}
                    type="button"
                    onClick={() => toggleAudioLang(t.language)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedAudioLangs.has(t.language)
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {LANGUAGE_LABELS[t.language] || t.language}
                    {t.is_original && (
                      <span className={`text-[10px] ${selectedAudioLangs.has(t.language) ? 'text-violet-200' : 'text-gray-400'}`}>★</span>
                    )}
                    {t.ai_audio_url && (
                      <Volume2 className={`w-3 h-3 ${selectedAudioLangs.has(t.language) ? 'text-violet-200' : 'text-violet-400'}`} />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAudio}
                  disabled={selectedAudioLangs.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Generate ({selectedAudioLangs.size}) ~{selectedAudioLangs.size * 2}s
                </button>
                <button
                  onClick={() => setShowAudioLangPicker(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Generate Translations */}
            {data.translations.length === 0 && data.ai_moderation_status === 'passed' && data.workflow_stage !== 'translating' && (
              <button
                onClick={handleTriggerTranslation}
                disabled={translating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {translating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating translations...</>
                  : <><Languages className="w-4 h-4" /> Generate Translations</>
                }
              </button>
            )}
            {data.workflow_stage === 'translating' && (
              <div className="inline-flex items-center gap-2 text-sm text-blue-600 px-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating translations...
              </div>
            )}

            {/* Generate Audio — available once translations exist */}
            {data.translations.length > 0 && !showAudioLangPicker && !generatingAudio && (
              <button
                onClick={openAudioPicker}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Volume2 className="w-4 h-4" /> Generate Audio
              </button>
            )}
            {generatingAudio && (
              <div className="inline-flex items-center gap-2 text-sm text-violet-600 px-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating audio (~{selectedAudioLangs.size * 2}s)...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
