'use client'

// src/components/buildings/ReviewTranslationTabs.tsx
// Renders the full review content block: language switcher (top) + title + text

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, Bot, ChevronDown, ChevronUp } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'
import AudioPlayer from '../AudioPlayer'
import type { ReviewTranslation } from '@/types/building'

const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧', de: '🇩🇪', es: '🇪🇸',
  fr: '🇫🇷', zh: '🇨🇳', ar: '🇸🇦', ru: '🇷🇺',
}

interface Props {
  reviewId: string
  originalLanguage: string
  originalTitle?: string | null
  originalContent: string
  originalAudioUrl?: string | null
  preferredLanguage: string  // 'all' = show original
  /** Card preview mode: hides audio, expand button, AI badge, and per-review language tabs */
  compact?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export default function ReviewTranslationTabs({
  reviewId,
  originalLanguage,
  originalTitle,
  originalContent,
  originalAudioUrl,
  preferredLanguage,
  compact = false,
  isExpanded = false,
  onToggleExpand,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [translations, setTranslations] = useState<ReviewTranslation[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeLang, setActiveLang] = useState(
    preferredLanguage !== 'all' ? preferredLanguage : originalLanguage
  )
  const [translationCache, setTranslationCache] = useState<Map<string, ReviewTranslation>>(new Map())
  const [contentLoading, setContentLoading] = useState(false)

  // Sync activeLang when global preferred language changes
  useEffect(() => {
    if (preferredLanguage !== 'all') {
      setActiveLang(preferredLanguage)
    }
  }, [preferredLanguage])

  // Load available translation languages on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await supabase
          .from('review_translations')
          .select('id, language, is_original, status, ai_audio_url')
          .eq('review_id', reviewId)
          .in('status', ['approved', 'ready', 'edited_by_admin'])
          .order('is_original', { ascending: false })

        if (!cancelled) setTranslations((data || []) as ReviewTranslation[])
      } catch (_) {
        // silent — just won't show tabs
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [reviewId])

  // Load translation content when switching to a non-original language
  const loadTranslationContent = useCallback(async (lang: string) => {
    if (lang === originalLanguage || translationCache.has(lang)) return
    setContentLoading(true)
    try {
      const { data } = await supabase
        .from('review_translations')
        .select('*')
        .eq('review_id', reviewId)
        .eq('language', lang)
        .single()
      if (data) {
        setTranslationCache((prev) => new Map(prev).set(lang, data))
      }
    } catch (_) {
      // silent — falls back to original
    } finally {
      setContentLoading(false)
    }
  }, [reviewId, supabase, translationCache, originalLanguage])

  useEffect(() => {
    if (activeLang && activeLang !== originalLanguage) {
      loadTranslationContent(activeLang)
    }
  }, [activeLang])

  const hasTranslations = loaded && translations.length > 1
  const isShowingOriginal = activeLang === originalLanguage
  const translationData = translationCache.get(activeLang)
  // ai_audio_url for the original language row (loaded in the initial light query)
  const originalTranslationAIAudio = translations.find((t) => t.is_original)?.ai_audio_url

  const displayTitle = isShowingOriginal
    ? originalTitle
    : (translationData?.title || originalTitle)
  const displayContent = contentLoading
    ? originalContent
    : isShowingOriginal
      ? originalContent
      : (translationData?.content || originalContent)

  const isTruncatable = displayContent.length > 300

  return (
    <div>
      {/* ── Language switcher at the top (hidden in compact/card mode) ── */}
      {!compact && hasTranslations && (
        <div className="flex flex-wrap gap-1 mb-3">
          {translations.map((t) => (
            <button
              key={t.language}
              onClick={() => setActiveLang(t.language)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                activeLang === t.language
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{t.language.toUpperCase()}</span>
              {t.is_original && (
                <span className={`text-[9px] ${activeLang === t.language ? 'text-blue-200' : 'text-gray-400'}`}>
                  ★
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Title ── */}
      {displayTitle && (
        compact
          ? <h5 className="font-semibold font-display text-foreground mb-1 text-sm">{displayTitle}</h5>
          : <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">{displayTitle}</h3>
      )}

      {/* ── Content ── */}
      {contentLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading translation...
        </div>
      ) : compact ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{displayContent}</p>
      ) : (
        <div className="mb-4">
          <p className={`text-gray-700 leading-relaxed whitespace-pre-line ${
            !isExpanded && isTruncatable ? 'line-clamp-4' : ''
          }`}>
            {displayContent}
          </p>
          {isTruncatable && (
            <button
              onClick={onToggleExpand}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              {isExpanded
                ? <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                : <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
              }
            </button>
          )}
        </div>
      )}

      {/* ── Audio player — hidden in compact mode ── */}
      {!compact && !contentLoading && (() => {
        const audioPath = isShowingOriginal
          ? (originalAudioUrl || originalTranslationAIAudio || null)
          : (translationData?.ai_audio_url || null)
        const audioUrl = audioPath ? getStorageUrl(audioPath, 'audio') : null
        return audioUrl ? (
          <div className="mb-4">
            <AudioPlayer key={audioUrl} audioUrl={audioUrl} />
          </div>
        ) : null
      })()}

      {/* ── AI translation badge — hidden in compact mode ── */}
      {!compact && !isShowingOriginal && !contentLoading && (
        <p className="text-xs text-gray-400 -mt-2 mb-2 flex items-center gap-1">
          <Bot className="w-3 h-3" />
          <span>AI translation · {LANG_FLAGS[activeLang] || ''} {activeLang.toUpperCase()}</span>
        </p>
      )}
    </div>
  )
}
