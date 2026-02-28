// src/app/api/reviews/translate/route.ts
// AI translation of building reviews to 7 languages using Google Gemini

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { performTranslation } from '@/lib/ai/translateReview'

// Vercel: allow up to 120s for Gemini translation (requires Pro plan)
export const maxDuration = 120

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
    const result = await performTranslation(review_id, original_language, supabase)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[translate] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
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
