// src/app/api/reviews/audio-generate/route.ts
// Generates AI TTS audio for each translation of a review (admin-triggered)

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { callGeminiTTS } from '@/lib/ai/gemini'

function getSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Small delay between TTS calls to stay within 10 RPM */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { review_id, languages } = body  // languages?: string[] — optional filter

    if (!review_id) {
      return NextResponse.json({ error: 'review_id is required' }, { status: 400 })
    }

    // Auth: Bearer token must belong to admin/moderator
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabaseAdmin()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch review (to check if it has user-uploaded audio)
    const { data: review } = await supabase
      .from('building_reviews')
      .select('id, audio_url, original_language, language')
      .eq('id', review_id)
      .single()

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

    const hasUserAudio = !!review.audio_url
    const originalLang = review.original_language || review.language || 'en'

    // Fetch all translations
    const { data: translations } = await supabase
      .from('review_translations')
      .select('id, language, is_original, content, title, ai_audio_url')
      .eq('review_id', review_id)
      .in('status', ['approved', 'ready', 'edited_by_admin'])

    if (!translations || translations.length === 0) {
      return NextResponse.json({ error: 'No translations found — run translation first' }, { status: 400 })
    }

    // Filter to requested languages if provided
    const translationsToProcess = Array.isArray(languages) && languages.length > 0
      ? translations.filter((t) => languages.includes(t.language))
      : translations

    const results: { lang: string; status: string; path?: string }[] = []

    for (const t of translationsToProcess) {
      // Skip: original lang when user already uploaded audio
      if (t.is_original && hasUserAudio) {
        results.push({ lang: t.language, status: 'skipped_user_audio' })
        continue
      }

      // Skip: already generated
      if (t.ai_audio_url) {
        results.push({ lang: t.language, status: 'already_exists' })
        continue
      }

      const textForTTS = [t.title, t.content].filter(Boolean).join('\n\n')

      try {
        const { wavBuffer, modelUsed } = await callGeminiTTS(textForTTS, {
          model: 'gemini-2.5-flash-preview-tts',
          voiceName: 'Kore',
        })

        // Upload WAV to Supabase storage
        const filePath = `ai_tts/${review_id}/${t.language}_${Date.now()}.wav`
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(filePath, wavBuffer, { contentType: 'audio/wav', upsert: true })

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

        // Save URL to translation row
        await supabase
          .from('review_translations')
          .update({ ai_audio_url: filePath, ai_audio_model: modelUsed })
          .eq('id', t.id)

        results.push({ lang: t.language, status: 'generated', path: filePath })
        console.log(`[audio-generate] ✓ ${t.language}`)
      } catch (err) {
        console.error(`[audio-generate] ✗ ${t.language}:`, err)
        results.push({ lang: t.language, status: 'error' })
      }

      // ~1s delay between calls to respect 10 RPM
      await sleep(1200)
    }

    return NextResponse.json({ success: true, review_id, results })
  } catch (error) {
    console.error('[audio-generate] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
