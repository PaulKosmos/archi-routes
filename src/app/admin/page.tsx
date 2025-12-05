'use client'

export const dynamic = 'force-dynamic'



import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { 
  Users, 
  Shield, 
  FileText, 
  Building2,
  MessageSquare,
  Route,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

interface AdminStats {
  users_count: number
  buildings_count: number
  reviews_count: number
  routes_count: number
  admins_count: number
  moderators_count: number
  experts_count: number
  guides_count: number
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user && profile && ['admin', 'moderator'].includes(profile.role || '')) {
      loadStats()
    }
  }, [user, profile])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      
      const [usersResult, buildingsResult, reviewsResult, routesResult] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('buildings').select('id'),
        supabase.from('building_reviews').select('id'),
        supabase.from('routes').select('id')
      ])

      const users = usersResult.data || []
      const buildings = buildingsResult.data || []
      const reviews = reviewsResult.data || []
      const routes = routesResult.data || []

      setStats({
        users_count: users.length,
        buildings_count: buildings.length,
        reviews_count: reviews.length,
        routes_count: routes.length,
        admins_count: users.filter(u => u.role === 'admin').length,
        moderators_count: users.filter(u => u.role === 'moderator').length,
        experts_count: users.filter(u => u.role === 'expert').length,
        guides_count: users.filter(u => u.role === 'guide').length
      })
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
    return null
  }

  const quickActions = [
    {
      name: 'Управление пользователями',
      description: 'Просмотр и изменение ролей пользователей',
      href: '/admin/users',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'Модерация контента',
      description: 'Проверка и одобрение контента',
      href: '/admin/moderation',
      icon: Shield,
      color: 'bg-purple-500'
    },
    {
      name: 'Автогенерация',
      description: 'Массовое создание контента',
      href: '/admin/autogeneration',
      icon: FileText,
      color: 'bg-green-500'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Панель администратора
        </h1>
        <p className="text-gray-600 mt-2">
          Обзор системы и быстрый доступ к инструментам управления
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Пользователи</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.users_count || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 mr-1" />
            Всего зарегистрировано
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Здания</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.buildings_count || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 mr-1" />
            В базе данных
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Обзоры</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.reviews_count || 0}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Activity className="w-4 h-4 mr-1" />
            Пользовательских обзоров
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Маршруты</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.routes_count || 0}</p>
            </div>
            <Route className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 mr-1" />
            Создано маршрутов
          </div>
        </div>
      </div>

      {/* Распределение ролей */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Распределение ролей</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.admins_count || 0}</div>
            <div className="text-sm text-gray-600">Администраторы</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats?.moderators_count || 0}</div>
            <div className="text-sm text-gray-600">Модераторы</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats?.experts_count || 0}</div>
            <div className="text-sm text-gray-600">Эксперты</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.guides_count || 0}</div>
            <div className="text-sm text-gray-600">Гиды</div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.name}
                href={action.href}
                className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    {action.name}
                  </h3>
                </div>
                <p className="text-gray-600">{action.description}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
