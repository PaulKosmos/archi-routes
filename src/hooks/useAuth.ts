// src/hooks/useAuth.ts

'use client'

import { useState, useEffect, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types/building'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
}

export function useAuth() {
  const supabase = useMemo(() => createClient(), [])
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    initialized: false
  })

  useEffect(() => {
    // Получаем текущего пользователя
    const getCurrentUser = async () => {
      try {
        console.log('🔐 Auth: Starting session check...')

        // НОВЫЙ ПОДХОД: Используем getUser() вместо getSession()
        // getUser() проверяет JWT локально, без сетевых запросов к Supabase
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        )

        const { data: { user }, error: userError } = await Promise.race([
          userPromise,
          timeoutPromise
        ]) as Awaited<typeof userPromise>

        console.log('🔐 Auth: User check completed', {
          hasUser: !!user,
          error: userError?.message
        })

        if (userError) {
          console.error('❌ Auth: User error:', userError)

          // Если ошибка - очищаем всё и форсируем logout
          try {
            await supabase.auth.signOut()
            console.log('🔐 Auth: Cleared corrupted session')
          } catch (e) {
            console.error('Failed to clear session:', e)
          }

          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true
          })
          return
        }

        if (user) {
          console.log('🔐 Auth: Fetching profile for user:', user.id)

          // Получаем профиль пользователя с timeout
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          const profileTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
          )

          const { data: profile, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]) as Awaited<typeof profilePromise>

          if (profileError) {
            console.error('Error fetching profile:', profileError)
            // Если профиль не найден, создаем его
            if (profileError.code === 'PGRST116') {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || null,
                  role: 'explorer'
                })
                .select()
                .single()

              if (createError) {
                console.error('Error creating profile:', createError)
              } else {
                console.log('✅ Auth: Created new profile')
                setAuthState({
                  user: user,
                  profile: newProfile,
                  loading: false,
                  initialized: true
                })
                return
              }
            }
          }

          console.log('✅ Auth: Successfully loaded user and profile')
          setAuthState({
            user: user,
            profile: profile || null,
            loading: false,
            initialized: true
          })
        } else {
          console.log('🔐 Auth: No user logged in')
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true
          })
        }
      } catch (error) {
        console.error('❌ Auth: Error in getCurrentUser:', error)

        // При timeout - очищаем сессию
        try {
          await supabase.auth.signOut()
          console.log('🔐 Auth: Cleared session after error')
        } catch (e) {
          console.error('Failed to clear session:', e)
        }

        setAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true
        })
      }
    }

    getCurrentUser()

    // Подписываемся на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Пользователь вошел
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setAuthState({
            user: session.user,
            profile: profile || null,
            loading: false,
            initialized: true
          })
        } else if (event === 'SIGNED_OUT') {
          // Пользователь вышел
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true
          })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Токен обновлен
          setAuthState(prev => ({
            ...prev,
            user: session.user,
            loading: false,
            initialized: true
          }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Функция входа
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  // Функция регистрации
  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  // Функция выхода
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Функция обновления профиля
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', authState.user.id)
      .select()
      .single()

    if (!error && data) {
      setAuthState(prev => ({
        ...prev,
        profile: data
      }))
    }

    return { data, error }
  }

  // Функция проверки роли
  const hasRole = (requiredRole: string): boolean => {
    if (!authState.profile) return false
    
    const userRole = authState.profile.role || 'explorer'
    const roleHierarchy = ['guest', 'explorer', 'guide', 'expert', 'moderator', 'admin']
    
    const userRoleIndex = roleHierarchy.indexOf(userRole)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
    
    return userRoleIndex >= requiredRoleIndex
  }

  // Функция проверки, является ли пользователь админом
  const isAdmin = (): boolean => {
    return authState.profile?.role === 'admin'
  }

  // Функция проверки, является ли пользователь экспертом
  const isExpert = (): boolean => {
    return hasRole('expert')
  }

  // Функция проверки, является ли пользователь гидом
  const isGuide = (): boolean => {
    return hasRole('guide')
  }

  // Функция проверки, является ли пользователь модератором
  const isModerator = (): boolean => {
    return hasRole('moderator')
  }

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    initialized: authState.initialized,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasRole,
    isExpert,
    isGuide,
    isModerator,
    isAdmin
  }
}
