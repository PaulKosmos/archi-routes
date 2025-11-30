// src/utils/admin-setup.ts - Утилита для настройки администратора

import { createClient } from '@/lib/supabase'

export interface AdminSetupResult {
  success: boolean
  message: string
  userFound: boolean
  wasAdmin: boolean
  isAdminNow: boolean
  userProfile?: any
}

/**
 * Проверяет и устанавливает права администратора для пользователя
 */
export async function setupAdminUser(email: string): Promise<AdminSetupResult> {
  const supabase = createClient()
  
  try {
    console.log(`🔧 Setting up admin rights for: ${email}`)
    
    // Ищем пользователя по email
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return {
          success: false,
          message: `Пользователь с email ${email} не найден в базе данных`,
          userFound: false,
          wasAdmin: false,
          isAdminNow: false
        }
      }
      throw profileError
    }

    const wasAdmin = userProfile.role === 'admin'

    if (wasAdmin) {
      return {
        success: true,
        message: `Пользователь ${email} уже является администратором`,
        userFound: true,
        wasAdmin: true,
        isAdminNow: true,
        userProfile
      }
    }

    // Обновляем роли пользователя
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    console.log(`✅ Successfully set admin rights for: ${email}`)

    return {
      success: true,
      message: `Пользователь ${email} успешно назначен администратором`,
      userFound: true,
      wasAdmin: false,
      isAdminNow: true,
      userProfile: updatedProfile
    }

  } catch (error) {
    console.error('❌ Error setting up admin user:', error)
    return {
      success: false,
      message: `Ошибка при настройке администратора: ${error instanceof Error ? error.message : 'Unknown error'}`,
      userFound: false,
      wasAdmin: false,
      isAdminNow: false
    }
  }
}

/**
 * Проверяет текущий статус пользователя
 */
export async function checkUserStatus(email: string): Promise<{
  found: boolean
  profile?: any
  isAdmin: boolean
  roles: {
    user_role?: string
    role?: string
  }
}> {
  const supabase = createClient()
  
  try {
    const { data: userProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          found: false,
          isAdmin: false,
          roles: {}
        }
      }
      throw error
    }

    const isAdmin = userProfile.role === 'admin'

    return {
      found: true,
      profile: userProfile,
      isAdmin,
      roles: {
        role: userProfile.role
      }
    }

  } catch (error) {
    console.error('Error checking user status:', error)
    return {
      found: false,
      isAdmin: false,
      roles: {}
    }
  }
}

/**
 * Получает список всех администраторов
 */
export async function getAdminUsers(): Promise<any[]> {
  const supabase = createClient()
  
  try {
    const { data: adminUsers, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return adminUsers || []

  } catch (error) {
    console.error('Error getting admin users:', error)
    return []
  }
}
