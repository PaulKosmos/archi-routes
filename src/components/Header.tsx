'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import RouteCreator from './RouteCreator'
import UserDropdown from './UserDropdown'
import { GlobalSearchBar } from './search/GlobalSearchBar'
import { CreateContentDropdown } from './CreateContentDropdown'
import AuthModal from './AuthModal'
import NotificationBell from './notifications/NotificationBell'
import type { Building } from '../types/building'
import { PlusCircle, Menu, X, MapPin, Search } from 'lucide-react'

interface HeaderProps {
  buildings: Building[]
  onRouteCreated?: () => void // Callback для обновления
}

export default function Header({ buildings, onRouteCreated }: HeaderProps) {
  const { user, profile, loading } = useAuth()
  const pathname = usePathname()
  const [isRouteCreatorOpen, setIsRouteCreatorOpen] = useState(false)
  const [routeCreatorMode, setRouteCreatorMode] = useState<'manual' | 'autogenerate'>('manual')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Проверяем, находимся ли мы на главной странице
  const isHomePage = pathname === '/'

  // Решаем hydration warning
  useEffect(() => {
    setMounted(true)
  }, [])

  // Обрабатываем параметры URL для открытия RouteCreator
  useEffect(() => {
    if (mounted && isHomePage && user && typeof window !== 'undefined') {
      // Используем window.location вместо useSearchParams чтобы избежать Suspense
      const params = new URLSearchParams(window.location.search)
      const routeCreatorParam = params.get('routeCreator')
      if (routeCreatorParam === 'manual' || routeCreatorParam === 'autogenerate') {
        setRouteCreatorMode(routeCreatorParam)
        setIsRouteCreatorOpen(true)

        // Очищаем URL параметры
        params.delete('routeCreator')
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '')
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [mounted, isHomePage, user])

  const handleOpenRouteCreator = () => {
    console.log('Opening route creator with buildings:', buildings.length)
    setIsRouteCreatorOpen(true)
  }

  const handleCloseRouteCreator = () => {
    setIsRouteCreatorOpen(false)
    // Вызываем callback для обновления данных
    if (onRouteCreated) {
      console.log('🔄 Calling onRouteCreated callback')
      onRouteCreated()
    }
  }

  const handleAuthModalOpen = () => {
    setShowAuthModal(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2">
          <div className="flex justify-between items-center">
            {/* Логотип */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="/" className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 bg-primary bevel-edge flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">A</span>
                </div>
                <h1 className="hidden sm:block text-lg sm:text-xl lg:text-2xl font-bold tracking-tight font-display">ArchiRoutes</h1>
              </a>
            </div>

            {/* Навигация (десктоп) */}
            <nav className="hidden lg:flex items-center gap-8">
              <a
                href="/map"
                className={`font-medium transition-colors ${
                  pathname === '/map'
                    ? 'text-[hsl(var(--map-primary))]'
                    : 'hover:text-[hsl(var(--map-primary))]'
                }`}
              >
                Карта
              </a>
              <a
                href="/news"
                className={`font-medium transition-colors ${
                  pathname === '/news' || pathname?.startsWith('/news/')
                    ? 'text-[hsl(var(--news-primary))]'
                    : 'hover:text-[hsl(var(--news-primary))]'
                }`}
              >
                Новости
              </a>
              <a
                href="/blog"
                className={`font-medium transition-colors ${
                  pathname === '/blog' || pathname?.startsWith('/blog/')
                    ? 'text-[hsl(var(--blog-primary))]'
                    : 'hover:text-[hsl(var(--blog-primary))]'
                }`}
              >
                Блог
              </a>
              <a
                href="/podcasts"
                className={`font-medium transition-colors ${
                  pathname === '/podcasts' || pathname?.startsWith('/podcasts/')
                    ? 'text-[hsl(var(--podcast-primary))]'
                    : 'hover:text-[hsl(var(--podcast-primary))]'
                }`}
              >
                Подкасты
              </a>
            </nav>

            {/* Пользователь */}
            <div className="flex items-center gap-4">
              {!mounted ? (
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
              ) : loading ? (
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/search"
                    className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Поиск"
                  >
                    <Search className="h-5 w-5" />
                  </a>
                  <NotificationBell />
                  <UserDropdown />
                </div>
              ) : (
                <>
                  <a
                    href="/search"
                    className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Поиск"
                  >
                    <Search className="h-5 w-5" />
                  </a>
                  <button
                    onClick={handleAuthModalOpen}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Войти
                  </button>
                </>
              )}

              {/* Мобильное меню кнопка */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Мобильное меню */}
          {showMobileMenu && (
            <div className="lg:hidden border-t border-border py-4">
              <div className="space-y-4">
                {/* Навигация */}
                <div className="space-y-3">
                  <a
                    href="/search"
                    className="block text-foreground hover:text-primary font-medium transition-colors flex items-center gap-2"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Search className="h-4 w-4" />
                    <span>Поиск</span>
                  </a>
                  <a
                    href="/map"
                    className="block text-foreground hover:text-[hsl(var(--map-primary))] font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Карта
                  </a>
                  <a
                    href="/news"
                    className="block text-foreground hover:text-[hsl(var(--news-primary))] font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Новости
                  </a>
                  <a
                    href="/blog"
                    className="block text-foreground hover:text-[hsl(var(--blog-primary))] font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Блог
                  </a>
                  <a
                    href="/podcasts"
                    className="block text-foreground hover:text-[hsl(var(--podcast-primary))] font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Подкасты
                  </a>
                </div>

                {/* Мобильная версия профиля */}
                {user && (
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="space-y-2">
                      <a
                        href="/profile"
                        className="block text-foreground hover:text-primary font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Мой профиль
                      </a>
                      <a
                        href="/profile/edit"
                        className="block text-foreground hover:text-primary font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Редактировать профиль
                      </a>
                      <a
                        href="/profile/buildings"
                        className="block text-foreground hover:text-primary font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Объекты
                      </a>
                      <a
                        href="/profile/favorite-routes"
                        className="block text-foreground hover:text-primary font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Избранные маршруты
                      </a>
                      <a
                        href="/profile/liked-blogs"
                        className="block text-foreground hover:text-primary font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Избранные блоги
                      </a>
                      <a
                        href="/profile/saved-blogs"
                        className="block text-foreground hover:text-primary font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Сохраненные блоги
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Модальное окно создания маршрута */}
      {isRouteCreatorOpen && user && (
        <RouteCreator
          isOpen={isRouteCreatorOpen}
          onClose={handleCloseRouteCreator}
          user={user}
          buildings={buildings}
          initialMode={routeCreatorMode}
        />
      )}

      {/* Модальное окно авторизации */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}
