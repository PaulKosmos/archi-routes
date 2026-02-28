// src/lib/ai/translateReview.ts
// Core translation logic — shared between translate-trigger and translate routes

import { callGemini, extractJSON, TRANSLATION_LANGUAGES } from './gemini'
import type { SupabaseClient } from '@supabase/supabase-js'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese (Simplified)',
  ar: 'Arabic',
  ru: 'Russian',
}

interface TranslationMap {
  [lang: string]: { title: string; content: string }
}

export interface TranslateResult {
  success: boolean
  review_id: string
  source_language: string
  translations_created: number
  languages: readonly string[]
  model_used: string
  message?: string
}

/**
 * Translates a review into all supported languages using Gemini.
 * Updates workflow_stage during and after translation.
 */
export async function performTranslation(
  review_id: string,
  original_language: string | undefined,
  supabase: SupabaseClient
): Promise<TranslateResult> {
  // Fetch review
  const { data: review, error: reviewError } = await supabase
    .from('building_reviews')
    .select('id, title, content, language, original_language, workflow_stage')
    .eq('id', review_id)
    .single()

  if (reviewError || !review) {
    throw new Error('Review not found')
  }

  const sourceLang = original_language || review.original_language || review.language || 'en'

  // Mark as translating
  await supabase
    .from('building_reviews')
    .update({ workflow_stage: 'translating' })
    .eq('id', review_id)

  // Save original language row first
  await supabase.from('review_translations').upsert(
    {
      review_id,
      language: sourceLang,
      is_original: true,
      title: review.title || null,
      content: review.content || '',
      translated_by: 'human',
      status: 'approved',
    },
    { onConflict: 'review_id,language' }
  )

  // Determine target languages (all except source)
  const targetLangs = TRANSLATION_LANGUAGES.filter((l) => l !== sourceLang)

  if (targetLangs.length === 0) {
    const finalStage = review.workflow_stage === 'published' ? 'published' : 'ready_for_review'
    await supabase
      .from('building_reviews')
      .update({ workflow_stage: finalStage })
      .eq('id', review_id)
    return {
      success: true,
      review_id,
      source_language: sourceLang,
      translations_created: 0,
      languages: [],
      model_used: '',
      message: 'No translations needed (only source language)',
    }
  }

  // Fetch translation prompt
  const { data: promptData } = await supabase
    .from('ai_prompts')
    .select('prompt_template, model, fallback_model')
    .eq('name', 'review_translation')
    .eq('is_active', true)
    .single()

  if (!promptData) {
    await supabase
      .from('building_reviews')
      .update({ workflow_stage: 'ai_done' })
      .eq('id', review_id)
    throw new Error('Translation prompt not configured in ai_prompts table')
  }

  const targetLangsList = targetLangs
    .map((l) => `${LANGUAGE_NAMES[l] || l} (${l})`)
    .join(', ')

  const prompt = promptData.prompt_template
    .replace('{source_language}', LANGUAGE_NAMES[sourceLang] || sourceLang)
    .replace('{target_languages}', targetLangsList)
    .replace('{title}', review.title || '(no title)')
    .replace('{content}', review.content || '')

  let translations: TranslationMap
  let modelUsed: string

  try {
    const { text, modelUsed: used } = await callGemini(prompt, {
      model: promptData.model,
      fallbackModel: promptData.fallback_model,
      temperature: 0.2,
      maxOutputTokens: 16384,
      thinkingBudget: 0,
    })
    modelUsed = used
    translations = extractJSON<TranslationMap>(text)
  } catch (aiError) {
    console.error('[translateReview] AI call failed:', aiError)
    await supabase
      .from('building_reviews')
      .update({ workflow_stage: 'ai_done' }) // revert so admin can retry
      .eq('id', review_id)
    throw new Error(`AI translation failed: ${String(aiError)}`)
  }

  // Save each translation to DB
  const translationRows = targetLangs
    .filter((lang) => translations[lang])
    .map((lang) => ({
      review_id,
      language: lang,
      is_original: false,
      title: translations[lang]?.title || null,
      content: translations[lang]?.content || '',
      translated_by: 'ai' as const,
      translation_model: modelUsed,
      status: 'ready' as const,
    }))

  if (translationRows.length > 0) {
    const { error: insertError } = await supabase
      .from('review_translations')
      .upsert(translationRows, { onConflict: 'review_id,language' })

    if (insertError) {
      console.error('[translateReview] Failed to save translations:', insertError)
    }
  }

  // Update workflow stage — preserve 'published' if already approved
  const finalStage = review.workflow_stage === 'published' ? 'published' : 'ready_for_review'
  await supabase
    .from('building_reviews')
    .update({ workflow_stage: finalStage })
    .eq('id', review_id)

  return {
    success: true,
    review_id,
    source_language: sourceLang,
    translations_created: translationRows.length,
    languages: targetLangs,
    model_used: modelUsed,
  }
}
