// src/app/profile/page.tsx
// Базовая страница профиля с навигацией

'use client'

import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import Link from 'next/link'
import { User, Heart, MapPin, Building2, Settings, Edit3 } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="bg-white rounded-lg shadow-sm p-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Войдите в систему
            </h1>
            <p className="text-gray-600 mb-6">
              Для просмотра профиля необходимо войти в свою учетную запись
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const displayName = profile?.display_name || profile?.full_name || user.user_metadata?.full_name || 'Пользователь'
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Заголовок профиля */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-blue-600 capitalize">
                {profile?.role || 'explorer'}
              </p>
            </div>
          </div>
        </div>

        {/* Навигация по разделам профиля */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/profile/edit"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Edit3 className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Редактировать профиль
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Обновите информацию о себе, фото и настройки
            </p>
          </Link>

          <Link
            href="/profile/buildings"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Building2 className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Объекты
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Архитектурные объекты, которые вы добавили на платформу
            </p>
          </Link>

          <Link
            href="/profile/routes"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Мои маршруты
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Маршруты, которые вы создали
            </p>
          </Link>

          <Link
            href="/profile/favorite-routes"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Heart className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Избранные маршруты
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Маршруты, которые вы добавили в избранное
            </p>
          </Link>

          <Link
            href="/profile/reviews"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-3">
              <User className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Мои обзоры
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Обзоры зданий, которые вы написали
            </p>
          </Link>

          <Link
            href="/profile/settings"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Settings className="w-6 h-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Настройки
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Приватность, уведомления и другие настройки
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
