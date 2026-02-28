// src/app/api/reviews/translate-trigger/route.ts
// Allows moderators/admins to manually trigger AI translation for a review

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { performTranslation } from '@/lib/ai/translateReview'

// Vercel: allow up to 120s for Gemini translation (requires Pro plan)
export const maxDuration = 120

function getSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { review_id } = body

    if (!review_id) {
      return NextResponse.json({ error: 'review_id is required' }, { status: 400 })
    }

    // Verify the caller is an authenticated admin/moderator
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check review exists
    const { data: review } = await supabaseAdmin
      .from('building_reviews')
      .select('id, workflow_stage, original_language, language')
      .eq('id', review_id)
      .single()

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (review.workflow_stage === 'translating') {
      return NextResponse.json({ error: 'Translation already in progress' }, { status: 409 })
    }

    // Call translation logic directly (no internal HTTP call)
    const result = await performTranslation(
      review_id,
      review.original_language || review.language || 'en',
      supabaseAdmin
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[translate-trigger] Error:', error)
    return NextResponse.json(
      { error: 'Translation failed', details: String(error) },
      { status: 500 }
    )
  }
}
