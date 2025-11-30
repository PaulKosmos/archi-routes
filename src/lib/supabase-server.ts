// src/lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Создает серверный клиент Supabase с правильной авторизацией
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  
  // Получаем все cookies и ищем токен авторизации Supabase
  const allCookies = cookieStore.getAll()
  const authCookie = allCookies.find(cookie => 
    cookie.name.includes('auth-token') && cookie.name.includes('sb-')
  )
  
  console.log('🔍 DEBUG: Available cookies:', allCookies.map(c => c.name))
  console.log('🔍 DEBUG: Found auth cookie:', authCookie?.name)
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  // Если есть токен авторизации, устанавливаем сессию
  if (authCookie?.value) {
    try {
      const session = JSON.parse(authCookie.value)
      console.log('🔍 DEBUG: Parsed session data:', { 
        hasAccessToken: !!session.access_token,
        hasRefreshToken: !!session.refresh_token 
      })
      
      if (session.access_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
        console.log('✅ DEBUG: Session set successfully')
      }
    } catch (error) {
      console.warn('❌ DEBUG: Failed to parse auth cookie:', error)
    }
  } else {
    console.warn('❌ DEBUG: No auth cookie found')
  }

  return supabase
}

/**
 * Получает текущего авторизованного пользователя
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.warn('Error getting current user:', error.message)
    return null
  }
  
  return user
}