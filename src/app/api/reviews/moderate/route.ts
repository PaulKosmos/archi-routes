// src/app/api/reviews/moderate/route.ts
// AI moderation for building reviews using Google Gemini

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

interface ModerationResult {
  safe: boolean
  score: number
  flags: string[]
  reasoning: string
  recommendation: 'approve' | 'review' | 'reject'
  detected_language: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { review_id, retry = false } = body

    if (!review_id) {
      return NextResponse.json({ error: 'review_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch the review
    const { data: review, error: reviewError } = await supabase
      .from('building_reviews')
      .select('id, title, content, language, workflow_stage')
      .eq('id', review_id)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Only re-run if retry=true OR if not already processed
    if (!retry && review.workflow_stage !== 'submitted') {
      return NextResponse.json({
        message: 'Review already processed',
        workflow_stage: review.workflow_stage,
      })
    }

    // Fetch the moderation prompt from DB (allows admin editing)
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_template, model, fallback_model')
      .eq('name', 'review_moderation')
      .eq('is_active', true)
      .single()

    if (!promptData) {
      return NextResponse.json({ error: 'Moderation prompt not configured' }, { status: 500 })
    }

    // Build the final prompt
    const prompt = promptData.prompt_template
      .replace('{language}', review.language || 'unknown')
      .replace('{title}', review.title || '(no title)')
      .replace('{content}', review.content || '')

    // Mark as processing
    await supabase
      .from('building_reviews')
      .update({
        workflow_stage: 'ai_moderating',
        ai_moderation_status: 'processing',
      })
      .eq('id', review_id)

    // Call Gemini
    let moderationResult: ModerationResult
    let modelUsed: string

    let rawText = ''
    try {
      const { text, modelUsed: used } = await callGemini(prompt, {
        model: promptData.model,
        fallbackModel: promptData.fallback_model,
        temperature: 0.1,
        maxOutputTokens: 8192,
      })
      rawText = text
      modelUsed = used
      console.log('[moderate] raw Gemini text:', text.substring(0, 500))
      moderationResult = extractJSON<ModerationResult>(text)
      // If model returned an array wrapping the object, unwrap it
      if (Array.isArray(moderationResult) && moderationResult.length > 0) {
        moderationResult = (moderationResult as any)[0]
      }
      // Validate structure
      if (
        !moderationResult ||
        Array.isArray(moderationResult) ||
        typeof (moderationResult as any).safe !== 'boolean'
      ) {
        throw new Error(`Unexpected moderation result shape: ${JSON.stringify(moderationResult).substring(0, 200)}`)
      }
    } catch (aiError) {
      console.error('[moderate] AI call failed:', aiError)
      console.error('[moderate] raw text was:', rawText.substring(0, 1000))
      await supabase
        .from('building_reviews')
        .update({
          ai_moderation_status: 'error',
          ai_moderation_result: { error: String(aiError), raw_text: rawText.substring(0, 500) },
          workflow_stage: 'ai_done',
        })
        .eq('id', review_id)
      return NextResponse.json({ error: 'AI moderation failed', details: String(aiError) }, { status: 500 })
    }

    const aiStatus = moderationResult.safe ? 'passed' : 'flagged'
    const detectedLanguage = moderationResult.detected_language || review.language || 'en'

    // Save AI result
    await supabase
      .from('building_reviews')
      .update({
        ai_moderation_status: aiStatus,
        ai_moderation_result: moderationResult,
        ai_moderation_score: moderationResult.score,
        ai_moderation_at: new Date().toISOString(),
        ai_moderation_model: modelUsed,
        original_language: detectedLanguage,
        workflow_stage: 'ai_done',
      })
      .eq('id', review_id)

    return NextResponse.json({
      success: true,
      review_id,
      status: aiStatus,
      score: moderationResult.score,
      flags: moderationResult.flags,
      recommendation: moderationResult.recommendation,
      reasoning: moderationResult.reasoning,
      detected_language: detectedLanguage,
      translation_triggered: moderationResult.safe,
    })
  } catch (error) {
    console.error('[moderate] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: fetch current moderation status for a review
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const review_id = searchParams.get('review_id')

  if (!review_id) {
    return NextResponse.json({ error: 'review_id is required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('building_reviews')
    .select('id, workflow_stage, ai_moderation_status, ai_moderation_result, ai_moderation_score, ai_moderation_at, ai_moderation_model, original_language')
    .eq('id', review_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
