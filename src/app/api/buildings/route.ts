import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Создаем серверный клиент с service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('🔑 Отладка ключей:', {
  url: supabaseUrl,
  serviceKeyExists: !!supabaseServiceKey,
  serviceKeyLength: supabaseServiceKey?.length || 0,
  serviceKeyStart: supabaseServiceKey?.substring(0, 20) + '...',
  allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
})

if (!supabaseServiceKey) {
  throw new Error('Нет SUPABASE_SERVICE_ROLE_KEY в переменных окружения')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ API Route: Начало создания здания')
    
    const body = await request.json()
    console.log('📝 API Route: Полученные данные:', body)
    
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Проверяем токен через обычный supabase клиент
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
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
