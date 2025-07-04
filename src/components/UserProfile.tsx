// components/UserProfile.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '../types/building'
import { User, LogOut, Settings, Star, Map, Camera } from 'lucide-react'

interface UserProfileProps {
  user: any
  onLogout: () => void
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Профиль не существует, создаем новый
        await createProfile()
      } else if (error) {
        throw error
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    try {
      const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        city: user.user_metadata?.city || '',
        role: 'explorer' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Ошибка создания профиля:', error)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      setIsEditing(false)
    } catch (error) {
      console.error('Ошибка обновления профиля:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      explorer: { label: 'Исследователь', color: 'bg-blue-100 text-blue-800', icon: '🔍' },
      guide: { label: 'Гид', color: 'bg-green-100 text-green-800', icon: '🗺️' },
      expert: { label: 'Эксперт', color: 'bg-purple-100 text-purple-800', icon: '🎓' },
      moderator: { label: 'Модератор', color: 'bg-red-100 text-red-800', icon: '⚡' }
    }
    
    const badge = badges[role as keyof typeof badges] || badges.explorer
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center text-red-600">
          Ошибка загрузки профиля
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Шапка профиля */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {profile.full_name || 'Пользователь'}
              </h3>
              <p className="text-gray-600">{profile.email}</p>
              <div className="mt-2 flex items-center space-x-2">
                {getRoleBadge(profile.role)}
                {profile.city && (
                  <span className="text-sm text-gray-500 flex items-center">
                    <Map size={14} className="mr-1" />
                    {profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Форма редактирования */}
      {isEditing && (
        <div className="p-6 border-b bg-gray-50">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Редактировать профиль</h4>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            updateProfile({
              full_name: formData.get('full_name') as string,
              bio: formData.get('bio') as string,
              city: formData.get('city') as string
            })
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Полное имя
              </label>
              <input
                name="full_name"
                type="text"
                defaultValue={profile.full_name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Город
              </label>
              <input
                name="city"
                type="text"
                defaultValue={profile.city || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                О себе
              </label>
              <textarea
                name="bio"
                rows={3}
                defaultValue={profile.bio || ''}
                placeholder="Расскажите о своих интересах в архитектуре..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Статистика пользователя */}
      <div className="p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Активность</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Маршрутов</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Отзывов</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Избранных</div>
          </div>
        </div>
        
        {profile.bio && (
          <div className="mt-6">
            <h5 className="font-medium text-gray-900 mb-2">О себе</h5>
            <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>
    </div>
  )
}