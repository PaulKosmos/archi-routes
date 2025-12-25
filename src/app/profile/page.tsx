'use client'

export const dynamic = 'force-dynamic'

// src/app/profile/page.tsx
// Базовая страница профиля с навигацией



import { Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import Link from 'next/link'
import { User, Heart, MapPin, Building2, Settings, Edit3, FileText, Folder } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
          <Header buildings={[]} />
        </Suspense>
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 pt-10">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded-[var(--radius)] w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-card border border-border rounded-[var(--radius)] p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
          <Header buildings={[]} />
        </Suspense>
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-card border border-border rounded-[var(--radius)] p-12 max-w-md mx-auto">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">
              Войдите в систему
            </h1>
            <p className="text-muted-foreground mb-6">
              Для просмотра профиля необходимо войти в свою учетную запись
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              Войти в систему
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  const displayName = profile?.display_name || profile?.full_name || user.user_metadata?.full_name || 'Пользователь'
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
        <Header buildings={[]} />
      </Suspense>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pt-10">
        {/* Заголовок профиля */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary flex items-center justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary-foreground font-medium text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold mb-1">{displayName}</h1>
              <p className="text-muted-foreground mb-1">{user.email}</p>
              <p className="text-sm text-primary font-medium capitalize">
                {profile?.role || 'explorer'}
              </p>
            </div>
          </div>
        </div>

        {/* Навигация по разделам профиля */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/profile/edit"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <Edit3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Редактировать профиль
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Обновите информацию о себе, фото и настройки
            </p>
          </Link>

          <Link
            href="/profile/buildings"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Объекты
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Архитектурные объекты, которые вы добавили на платформу
            </p>
          </Link>

          <Link
            href="/profile/routes"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Мои маршруты
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Маршруты, которые вы создали
            </p>
          </Link>

          <Link
            href="/profile/favorites"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <Heart className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Избранное
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Блоги, новости, маршруты и объекты, которые вам понравились
            </p>
          </Link>

          <Link
            href="/profile/collections"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <Folder className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Коллекции
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Организуйте избранное в тематические коллекции
            </p>
          </Link>

          <Link
            href="/profile/reviews"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Мои обзоры
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Обзоры зданий, которые вы написали
            </p>
          </Link>

          <Link
            href="/profile/articles"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Мои блоги
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Блоги, которые вы создали
            </p>
          </Link>

          <Link
            href="/profile/settings"
            className="group bg-card border border-border rounded-[var(--radius)] p-6 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                Настройки
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Приватность, уведомления и другие настройки
            </p>
          </Link>
        </div>
        </div>
      </main>
      <EnhancedFooter />
    </div>
  )
}
