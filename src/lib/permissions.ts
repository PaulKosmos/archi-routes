// src/lib/permissions.ts
import { createServerClient } from './supabase-server'

export interface EditPermissions {
  canEdit: boolean
  reason?: string
  userRole?: string
}

/**
 * Проверяет права пользователя на редактирование контента
 * Используется только на сервере
 */
export async function checkEditPermissions(
  contentType: 'building' | 'route',
  contentId: string,
  userId: string | null
): Promise<EditPermissions> {

  // Если пользователь не авторизован
  if (!userId) {
    return {
      canEdit: false,
      reason: 'Необходимо войти в систему'
    }
  }

  try {
    // Создаем серверный клиент
    const supabase = await createServerClient()

    // Получаем роль пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile) {
      return {
        canEdit: false,
        reason: 'Профиль пользователя не найден'
      }
    }

    // Модераторы и админы могут редактировать всё
    if (profile.role === 'moderator' || profile.role === 'admin') {
      return {
        canEdit: true,
        userRole: profile.role
      }
    }

    // Получаем информацию о контенте
    const tableName = contentType === 'building' ? 'buildings' : 'routes'
    const { data: content } = await supabase
      .from(tableName)
      .select('created_by')
      .eq('id', contentId)
      .single()

    if (!content) {
      return {
        canEdit: false,
        reason: `${contentType === 'building' ? 'Здание' : 'Маршрут'} не найден`
      }
    }

    // Автор может редактировать свой контент
    if (content.created_by === userId) {
      return {
        canEdit: true,
        userRole: profile.role
      }
    }

    return {
      canEdit: false,
      reason: 'Только автор или модератор может редактировать контент',
      userRole: profile.role
    }

  } catch (error) {
    console.error('Error checking edit permissions:', error)
    return {
      canEdit: false,
      reason: 'Ошибка проверки прав доступа'
    }
  }
}