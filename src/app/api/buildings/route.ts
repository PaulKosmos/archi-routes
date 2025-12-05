import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Создает Supabase admin клиент с service role
 * Создаем внутри функции, чтобы избежать ошибок при build на Vercel
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL и Service Role Key обязательны')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ API Route: Начало создания здания')

    // Создаем Supabase admin клиент
    const supabaseAdmin = getSupabaseAdmin()

    const body = await request.json()
    console.log('📝 API Route: Полученные данные:', body)

    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Проверяем токен через admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ API Route: Ошибка авторизации:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ API Route: Пользователь авторизован:', user.id)

    // Добавляем user_id к данным
    const buildingData = {
      ...body,
      created_by: user.id
    }

    console.log('🏗️ API Route: Отправляем запрос в Supabase через admin client...')

    // Создаем здание через admin клиент (обходит RLS)
    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .insert(buildingData)
      .select()
      .single()
    
    console.log('✅ API Route: Ответ от Supabase:', { building, buildingError })
    
    if (buildingError) {
      console.error('❌ API Route: Ошибка Supabase:', buildingError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: buildingError 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      building 
    })
    
  } catch (error) {
    console.error('💥 API Route: Глобальная ошибка:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
