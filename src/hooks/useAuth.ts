// src/hooks/useAuth.ts

'use client'

import { useState, useEffect, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { devLog } from '@/lib/logger'
import { Profile } from '@/types/building'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  isBanned: boolean
  banInfo: {
    status: string
    reason?: string
    until?: string
  } | null
}

export function useAuth() {
  const supabase = useMemo(() => createClient(), [])
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    initialized: false,
    isBanned: false,
    banInfo: null
  })

  // Helper to check if user is blocked
  const checkBanStatus = (profile: any): { isBanned: boolean; banInfo: AuthState['banInfo'] } => {
    if (!profile) return { isBanned: false, banInfo: null }

    const banStatus = profile.ban_status || 'active'

    // Permanent ban
    if (banStatus === 'banned') {
      return {
        isBanned: true,
        banInfo: {
          status: 'banned',
          reason: profile.ban_reason
        }
      }
    }

    // Suspended - check if expired
    if (banStatus === 'suspended' && profile.banned_until) {
      const bannedUntil = new Date(profile.banned_until)
      if (bannedUntil > new Date()) {
        return {
          isBanned: true,
          banInfo: {
            status: 'suspended',
            reason: profile.ban_reason,
            until: profile.banned_until
          }
        }
      }
    }

    // Restricted - can login but can't publish
    if (banStatus === 'restricted') {
      return {
        isBanned: false,
        banInfo: {
          status: 'restricted',
          reason: profile.ban_reason
        }
      }
    }

    return { isBanned: false, banInfo: null }
  }

  useEffect(() => {
    // Получаем текущего пользователя
    const getCurrentUser = async () => {
      try {
        devLog('🔐 Auth: Starting session check...')

        // Используем getSession() - читает из localStorage без сетевых запросов
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        devLog('🔐 Auth: Session check completed', {
          hasSession: !!session,
          error: sessionError?.message
        })

        if (sessionError) {
          console.error('❌ Auth: Session error:', sessionError)
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true,
            isBanned: false,
            banInfo: null
          })
          return
        }

        if (session?.user) {
          devLog('🔐 Auth: Fetching profile for user:', session.user.id)

          // Получаем профиль пользователя
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError) {
            console.error('Error fetching profile:', profileError)
            // Если профиль не найден, создаем его
            if (profileError.code === 'PGRST116') {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || null,
                  role: 'explorer'
                })
                .select()
                .single()

              if (createError) {
                console.error('Error creating profile:', createError)
              } else {
                devLog('✅ Auth: Created new profile')
                setAuthState({
                  user: session.user,
                  profile: newProfile,
                  loading: false,
                  initialized: true,
                  isBanned: false,
                  banInfo: null
                })
                return
              }
            }
          }

          devLog('✅ Auth: Successfully loaded user and profile')
          const { isBanned, banInfo } = checkBanStatus(profile)

          if (isBanned) {
            devLog('🚫 Auth: User is banned, signing out')
            // Sign out banned user
            supabase.auth.signOut()
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              initialized: true,
              isBanned: true,
              banInfo
            })
            return
          }

          setAuthState({
            user: session.user,
            profile: profile || null,
            loading: false,
            initialized: true,
            isBanned: false,
            banInfo
          })
        } else {
          devLog('🔐 Auth: No user logged in')
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true,
            isBanned: false,
            banInfo: null
          })
        }
      } catch (error) {
        console.error('❌ Auth: Error in getCurrentUser:', error)
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
          isBanned: false,
          banInfo: null
        })
      }
    }

    getCurrentUser()

    // КРИТИЧЕСКИ ВАЖНО: НЕ ИСПОЛЬЗУЕМ async в onAuthStateChange!
    // async внутри callback вызывает deadlock (Issue #35754)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {  // ✅ Убрали async!
        devLog('🔐 Auth state changed:', event)

        if (event === 'SIGNED_IN' && session?.user) {
          // Пользователь вошел - загружаем профиль БЕЗ await
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile, error }) => {
              if (error) {
                console.error('Error loading profile on sign in:', error)
                setAuthState({
                  user: session.user,
                  profile: null,
                  loading: false,
                  initialized: true,
                  isBanned: false,
                  banInfo: null
                })
              } else {
                const { isBanned, banInfo } = checkBanStatus(profile)

                if (isBanned) {
                  devLog('🚫 Auth: User is banned, signing out')
                  supabase.auth.signOut()
                  setAuthState({
                    user: null,
                    profile: null,
                    loading: false,
                    initialized: true,
                    isBanned: true,
                    banInfo
                  })
                  return
                }

                setAuthState({
                  user: session.user,
                  profile: profile || null,
                  loading: false,
                  initialized: true,
                  isBanned: false,
                  banInfo
                })
              }
            })
        } else if (event === 'SIGNED_OUT') {
          // Пользователь вышел
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true,
            isBanned: false,
            banInfo: null
          })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Токен обновлен - просто обновляем user объект
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

  // Функция проверки, может ли пользователь публиковать контент
  const canPublish = (): boolean => {
    if (!authState.profile) return false
    const banStatus = (authState.profile as any).ban_status || 'active'

    // Banned and restricted users cannot publish
    if (banStatus === 'banned' || banStatus === 'restricted') {
      return false
    }

    // Suspended users cannot publish if suspension is active
    if (banStatus === 'suspended') {
      const bannedUntil = (authState.profile as any).banned_until
      if (bannedUntil && new Date(bannedUntil) > new Date()) {
        return false
      }
    }

    return true
  }

  // Функция проверки, заблокирован ли пользователь
  const isBlocked = (): boolean => {
    return authState.isBanned
  }

  // Функция проверки, ограничен ли пользователь
  const isRestricted = (): boolean => {
    return authState.banInfo?.status === 'restricted'
  }

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    initialized: authState.initialized,
    isBanned: authState.isBanned,
    banInfo: authState.banInfo,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasRole,
    isExpert,
    isGuide,
    isModerator,
    isAdmin,
    canPublish,
    isBlocked,
    isRestricted
  }
}
