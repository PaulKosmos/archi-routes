// src/lib/debug-permissions.ts
import { supabase } from './supabase'

/**
 * Отладочная версия проверки прав с детальным логированием
 */
export async function debugCheckEditPermissions(
  contentType: 'building' | 'route',
  contentId: string,
  userId: string | null
) {
  console.log('🔍 DEBUG: Checking edit permissions', {
    contentType,
    contentId,
    userId
  })

  // Если пользователь не авторизован
  if (!userId) {
    console.log('❌ DEBUG: User not authenticated')
    return {
      canEdit: false,
      reason: 'Необходимо войти в систему'
    }
  }

  try {
    // Получаем роль пользователя
    console.log('🔍 DEBUG: Getting user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', userId)
      .single()

    console.log('🔍 DEBUG: Profile result', { profile, error: profileError })

    if (profileError || !profile) {
      console.log('❌ DEBUG: Profile not found')
      return {
        canEdit: false,
        reason: 'Профиль пользователя не найден'
      }
    }

    // Модераторы и админы могут редактировать всё
    if (profile.role === 'moderator' || profile.role === 'admin') {
      console.log('✅ DEBUG: User is moderator/admin', profile.role)
      return {
        canEdit: true,
        userRole: profile.role
      }
    }

    // Получаем информацию о контенте
    console.log('🔍 DEBUG: Getting content info...')
    const tableName = contentType === 'building' ? 'buildings' : 'routes'
    const { data: content, error: contentError } = await supabase
      .from(tableName)
      .select('created_by')
      .eq('id', contentId)
      .single()

    console.log('🔍 DEBUG: Content result', { content, error: contentError })

    if (contentError || !content) {
      console.log('❌ DEBUG: Content not found')
      return {
        canEdit: false,
        reason: `${contentType === 'building' ? 'Здание' : 'Маршрут'} не найден`
      }
    }

    // Автор может редактировать свой контент
    const isAuthor = content.created_by === userId
    console.log('🔍 DEBUG: Author check', {
      contentCreatedBy: content.created_by,
      currentUserId: userId,
      isAuthor
    })

    if (isAuthor) {
      console.log('✅ DEBUG: User is author')
      return {
        canEdit: true,
        userRole: profile.role
      }
    }

    console.log('❌ DEBUG: No edit permissions')
    return {
      canEdit: false,
      reason: 'Только автор или модератор может редактировать контент',
      userRole: profile.role
    }

  } catch (error) {
    console.error('💥 DEBUG: Error checking permissions:', error)
    return {
      canEdit: false,
      reason: 'Ошибка проверки прав доступа'
    }
  }
}