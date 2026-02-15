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
      reason: 'You must be logged in'
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
        reason: 'User profile not found'
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
        reason: `${contentType === 'building' ? 'Building' : 'Route'} not found`
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
      reason: 'Only the author or a moderator can edit this content',
      userRole: profile.role
    }

  } catch (error) {
    console.error('Error checking edit permissions:', error)
    return {
      canEdit: false,
      reason: 'Permission check error'
    }
  }
}