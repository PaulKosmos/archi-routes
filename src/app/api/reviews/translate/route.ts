// src/app/api/reviews/translate/route.ts
// AI translation of building reviews to 7 languages using Google Gemini

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGemini, extractJSON, TRANSLATION_LANGUAGES } from '@/lib/ai/gemini'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

export async function POST(request: NextRequest) {
  // Internal-only: validate with service role key header
  const internalKey = request.headers.get('x-internal-key')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (internalKey !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { review_id, original_language } = body

    if (!review_id) {
      return NextResponse.json({ error: 'review_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch review
    const { data: review, error: reviewError } = await supabase
      .from('building_reviews')
      .select('id, title, content, language, original_language')
      .eq('id', review_id)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const sourceLang = original_language || review.original_language || review.language || 'en'

    // Mark as translating
    await supabase
      .from('building_reviews')
      .update({ workflow_stage: 'translating' })
      .eq('id', review_id)

    // Save original language row first
    await supabase.from('review_translations').upsert({
      review_id,
      language: sourceLang,
      is_original: true,
      title: review.title || null,
      content: review.content || '',
      translated_by: 'human',
      status: 'approved', // original is always approved
    }, { onConflict: 'review_id,language' })

    // Determine target languages (all except source)
    const targetLangs = TRANSLATION_LANGUAGES.filter((l) => l !== sourceLang)

    if (targetLangs.length === 0) {
      await supabase
        .from('building_reviews')
        .update({ workflow_stage: 'ready_for_review' })
        .eq('id', review_id)
      return NextResponse.json({ success: true, message: 'No translations needed (only source language)' })
    }

    // Fetch translation prompt
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_template, model, fallback_model')
      .eq('name', 'review_translation')
      .eq('is_active', true)
      .single()

    if (!promptData) {
      return NextResponse.json({ error: 'Translation prompt not configured' }, { status: 500 })
    }

    // Build target languages list string
    const targetLangsList = targetLangs
      .map((l) => `${LANGUAGE_NAMES[l] || l} (${l})`)
      .join(', ')

    const prompt = promptData.prompt_template
      .replace('{source_language}', LANGUAGE_NAMES[sourceLang] || sourceLang)
      .replace('{target_languages}', targetLangsList)
      .replace('{title}', review.title || '(no title)')
      .replace('{content}', review.content || '')

    // Call Gemini — one call translates to all languages at once
    let translations: TranslationMap
    let modelUsed: string

    try {
      const { text, modelUsed: used } = await callGemini(prompt, {
        model: promptData.model,
        fallbackModel: promptData.fallback_model,
        temperature: 0.2,
        maxOutputTokens: 16384,
        thinkingBudget: 0,  // no thinking needed for translation
      })
      modelUsed = used
      translations = extractJSON<TranslationMap>(text)
    } catch (aiError) {
      console.error('[translate] AI call failed:', aiError)
      await supabase
        .from('building_reviews')
        .update({ workflow_stage: 'ai_done' }) // revert to ai_done so admin can retry
        .eq('id', review_id)
      return NextResponse.json({ error: 'Translation failed', details: String(aiError) }, { status: 500 })
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
        console.error('[translate] Failed to save translations:', insertError)
      }
    }

    // Update workflow stage
    await supabase
      .from('building_reviews')
      .update({ workflow_stage: 'ready_for_review' })
      .eq('id', review_id)

    return NextResponse.json({
      success: true,
      review_id,
      source_language: sourceLang,
      translations_created: translationRows.length,
      languages: targetLangs,
      model_used: modelUsed,
    })
  } catch (error) {
    console.error('[translate] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: admin edits a specific translation
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { translation_id, title, content, editor_id } = body

    if (!translation_id || !content) {
      return NextResponse.json({ error: 'translation_id and content are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('review_translations')
      .update({
        title,
        content,
        admin_edited: true,
        edited_by: editor_id || null,
        edited_at: new Date().toISOString(),
        status: 'edited_by_admin',
        translated_by: 'human',
      })
      .eq('id', translation_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[translate PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
