// src/hooks/useEditPermissions.ts
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '../lib/supabase'

export interface EditPermissions {
  canEdit: boolean
  reason?: string
  userRole?: string
  isLoading: boolean
  isAuthenticated: boolean
}

// Для обратной совместимости - старый формат
export interface EditPermissionsOld {
  permissions: EditPermissions
  loading: boolean
  isReady: boolean
}

/**
 * Универсальный хук для проверки прав редактирования
 * Теперь всегда возвращает единый формат
 */
export function useEditPermissions(
  contentType: 'building' | 'route',
  contentId: string,
  userId?: string | null // Опциональный параметр для обратной совместимости
): EditPermissions {
  const supabase = useMemo(() => createClient(), [])
  
  const [permissions, setPermissions] = useState<EditPermissions>({
    canEdit: false,
    isLoading: true,
    isAuthenticated: false
  })

  useEffect(() => {
    let isMounted = true // Защита от race condition

    const checkFullPermissions = async () => {
      console.log('🔍 Starting full permission check for:', { contentType, contentId })
      
      try {
        // 1. Проверяем авторизацию
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          if (isMounted) {
            setPermissions({
              canEdit: false,
              reason: 'Ошибка получения сессии',
              isLoading: false,
              isAuthenticated: false
            })
          }
          return
        }

        if (!session?.user) {
          console.log('❌ No user session')
          if (isMounted) {
            setPermissions({
              canEdit: false,
              reason: 'Необходимо войти в систему',
              isLoading: false,
              isAuthenticated: false
            })
          }
          return
        }

        const userIdToUse = session.user.id
        console.log('✅ User authenticated:', userIdToUse)

        // 2. Получаем профиль пользователя
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, email, full_name')
          .eq('id', userIdToUse)
          .single()

        if (profileError || !profile) {
          console.error('❌ Profile error:', profileError)
          if (isMounted) {
            setPermissions({
              canEdit: false,
              reason: 'Профиль пользователя не найден',
              isLoading: false,
              isAuthenticated: true
            })
          }
          return
        }

        console.log('✅ User profile loaded:', { role: profile.role, email: profile.email })

        // 3. Проверяем роли модератора/админа (они могут редактировать всё)
        if (profile.role === 'moderator' || profile.role === 'admin') {
          console.log('✅ User is moderator/admin - full access granted')
          if (isMounted) {
            setPermissions({
              canEdit: true,
              userRole: profile.role,
              isLoading: false,
              isAuthenticated: true
            })
          }
          return
        }

        // 4. Проверяем авторство контента
        const tableName = contentType === 'building' ? 'buildings' : 'routes'
        const { data: content, error: contentError } = await supabase
          .from(tableName)
          .select('created_by')
          .eq('id', contentId)
          .single()

        if (contentError || !content) {
          console.error('❌ Content error:', contentError)
          if (isMounted) {
            setPermissions({
              canEdit: false,
              reason: `${contentType === 'building' ? 'Здание' : 'Маршрут'} не найден`,
              isLoading: false,
              isAuthenticated: true,
              userRole: profile.role
            })
          }
          return
        }

        // 5. Проверяем является ли пользователь автором
        const isAuthor = content.created_by === userIdToUse
        console.log('🔍 Author check:', {
          contentCreatedBy: content.created_by,
          currentUserId: userIdToUse,
          isAuthor
        })

        if (isAuthor) {
          console.log('✅ User is author - access granted')
          if (isMounted) {
            setPermissions({
              canEdit: true,
              userRole: profile.role,
              isLoading: false,
              isAuthenticated: true
            })
          }
          return
        }

        // 6. Нет прав на редактирование
        console.log('❌ No edit permissions')
        if (isMounted) {
          setPermissions({
            canEdit: false,
            reason: 'Только автор или модератор может редактировать контент',
            userRole: profile.role,
            isLoading: false,
            isAuthenticated: true
          })
        }

      } catch (error) {
        console.error('💥 Unexpected error in permission check:', error)
        if (isMounted) {
          setPermissions({
            canEdit: false,
            reason: 'Ошибка проверки прав доступа',
            isLoading: false,
            isAuthenticated: false
          })
        }
      }
    }

    checkFullPermissions()

    // Cleanup function для предотвращения race condition
    return () => {
      isMounted = false
    }
  }, [contentType, contentId, userId])

  return permissions
}