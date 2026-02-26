// src/app/api/reviews/translate-trigger/route.ts
// Allows moderators/admins to manually trigger AI translation for a review

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

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

    // Check review exists and moderation passed
    const { data: review } = await supabaseAdmin
      .from('building_reviews')
      .select('id, ai_moderation_status, workflow_stage, original_language, language')
      .eq('id', review_id)
      .single()

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (review.workflow_stage === 'translating') {
      return NextResponse.json({ error: 'Translation already in progress' }, { status: 409 })
    }

    // Call translate endpoint internally
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const translateRes = await fetch(`${appUrl}/api/reviews/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        review_id,
        original_language: review.original_language || review.language || 'en',
      }),
    })

    if (!translateRes.ok) {
      const err = await translateRes.text()
      console.error('[translate-trigger] translate failed:', err)
      return NextResponse.json({ error: 'Translation failed', details: err }, { status: 500 })
    }

    const result = await translateRes.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[translate-trigger] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
