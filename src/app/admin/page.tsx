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
  Activity,
  Newspaper,
  Podcast,
  Bot
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
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded-[var(--radius)] w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded-[var(--radius)]"></div>
              ))}
            </div>
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
      icon: Users
    },
    {
      name: 'Модерация контента',
      description: 'Проверка и одобрение контента',
      href: '/admin/moderation',
      icon: Shield
    },
    {
      name: 'Новости',
      description: 'Управление архитектурными новостями',
      href: '/admin/news',
      icon: Newspaper
    },
    {
      name: 'Подкасты',
      description: 'Управление аудио подкастами',
      href: '/admin/podcasts',
      icon: Podcast
    },
    {
      name: 'Автогенерация',
      description: 'Массовое создание контента',
      href: '/admin/autogeneration',
      icon: Bot
    }
  ]

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Обзор системы и быстрый доступ к инструментам управления
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Пользователи</p>
                <p className="text-3xl font-metrics font-bold text-foreground mt-2">{stats?.users_count || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-[var(--radius)]">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />
              Всего зарегистрировано
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Здания</p>
                <p className="text-3xl font-metrics font-bold text-foreground mt-2">{stats?.buildings_count || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-[var(--radius)]">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />
              В базе данных
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Обзоры</p>
                <p className="text-3xl font-metrics font-bold text-foreground mt-2">{stats?.reviews_count || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-[var(--radius)]">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <Activity className="w-4 h-4 mr-1" />
              Пользовательских обзоров
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Маршруты</p>
                <p className="text-3xl font-metrics font-bold text-foreground mt-2">{stats?.routes_count || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-[var(--radius)]">
                <Route className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />
              Создано маршрутов
            </div>
          </div>
        </div>

        {/* Распределение ролей */}
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Распределение ролей</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-[var(--radius)]">
              <div className="text-3xl font-metrics font-bold text-primary mb-1">{stats?.admins_count || 0}</div>
              <div className="text-sm text-muted-foreground">Администраторы</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-[var(--radius)]">
              <div className="text-3xl font-metrics font-bold text-primary mb-1">{stats?.moderators_count || 0}</div>
              <div className="text-sm text-muted-foreground">Модераторы</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-[var(--radius)]">
              <div className="text-3xl font-metrics font-bold text-primary mb-1">{stats?.experts_count || 0}</div>
              <div className="text-sm text-muted-foreground">Эксперты</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-[var(--radius)]">
              <div className="text-3xl font-metrics font-bold text-primary mb-1">{stats?.guides_count || 0}</div>
              <div className="text-sm text-muted-foreground">Гиды</div>
            </div>
          </div>
        </div>

        {/* Быстрые действия */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-6">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.name}
                  href={action.href}
                  className="block bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 hover:shadow-md hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="ml-3 text-lg font-medium text-foreground">
                      {action.name}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm">{action.description}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
