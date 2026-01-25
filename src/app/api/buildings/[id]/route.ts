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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🗑️ API Route: Начало удаления здания')

    // Создаем Supabase admin клиент
    const supabaseAdmin = getSupabaseAdmin()

    const { id: buildingId } = await params
    console.log('🗑️ API Route: ID здания для удаления:', buildingId)

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
    
    // Получаем здание для проверки прав
    const { data: building, error: getBuildingError } = await supabaseAdmin
      .from('buildings')
      .select('id, name, created_by')
      .eq('id', buildingId)
      .single()
    
    if (getBuildingError || !building) {
      console.error('❌ API Route: Здание не найдено:', getBuildingError)
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }
    
    // Получаем профиль пользователя для проверки роли админа/модератора
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Проверяем права: только автор, админ или модератор может удалить
    const isOwner = building.created_by === user.id
    const isAdmin = profile?.role === 'admin'
    const isModerator = profile?.role === 'moderator'
    
    if (!isOwner && !isAdmin && !isModerator) {
      console.error('❌ API Route: Нет прав на удаление')
      return NextResponse.json({ 
        error: 'Access denied', 
        message: 'Только автор здания, администратор или модератор может его удалить' 
      }, { status: 403 })
    }
    
    console.log('🗑️ API Route: Удаляем связанные данные и здание...')
    
    // 1. Удаляем связи с маршрутами (route_points)
    const { error: routePointsDeleteError } = await supabaseAdmin
      .from('route_points')
      .delete()
      .eq('building_id', buildingId)
    
    if (routePointsDeleteError) {
      console.warn('⚠️ API Route: Ошибка удаления route_points:', routePointsDeleteError)
    } else {
      console.log('✅ API Route: route_points удалены')
    }
    
    // 2. Удаляем связанные обзоры
    const { error: reviewsDeleteError } = await supabaseAdmin
      .from('building_reviews')
      .delete()
      .eq('building_id', buildingId)
    
    if (reviewsDeleteError) {
      console.warn('⚠️ API Route: Ошибка удаления обзоров:', reviewsDeleteError)
    } else {
      console.log('✅ API Route: building_reviews удалены')
    }
    
    // 3. Удаляем избранное
    const { error: favoritesDeleteError } = await supabaseAdmin
      .from('user_building_favorites')
      .delete()
      .eq('building_id', buildingId)
    
    if (favoritesDeleteError) {
      console.warn('⚠️ API Route: Ошибка удаления favorites:', favoritesDeleteError)
    }
    
    // 4. Удаляем связи с коллекциями
    const { error: collectionsDeleteError } = await supabaseAdmin
      .from('collection_buildings')
      .delete()
      .eq('building_id', buildingId)
    
    if (collectionsDeleteError) {
      console.warn('⚠️ API Route: Ошибка удаления collection_buildings:', collectionsDeleteError)
    }
    
    // 5. Удаляем связи с блог-постами
    const { error: blogDeleteError } = await supabaseAdmin
      .from('blog_post_buildings')
      .delete()
      .eq('building_id', buildingId)
    
    if (blogDeleteError) {
      console.warn('⚠️ API Route: Ошибка удаления blog_post_buildings:', blogDeleteError)
    }
    
    // 6. Наконец, удаляем само здание
    const { error: buildingDeleteError } = await supabaseAdmin
      .from('buildings')
      .delete()
      .eq('id', buildingId)
    
    console.log('✅ API Route: Результат удаления здания:', { buildingDeleteError })
    
    if (buildingDeleteError) {
      console.error('❌ API Route: Ошибка удаления здания:', buildingDeleteError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: buildingDeleteError 
      }, { status: 500 })
    }
    
    console.log('✅ API Route: Здание успешно удалено:', building.name)
    
    return NextResponse.json({ 
      success: true,
      message: `Здание "${building.name}" успешно удалено`,
      buildingId
    })
    
  } catch (error) {
    console.error('💥 API Route: Глобальная ошибка:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
