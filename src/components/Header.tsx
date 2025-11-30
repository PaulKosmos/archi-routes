'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
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
    if (mounted && isHomePage && user) {
      const routeCreatorParam = searchParams?.get('routeCreator')
      if (routeCreatorParam === 'manual' || routeCreatorParam === 'autogenerate') {
        setRouteCreatorMode(routeCreatorParam)
        setIsRouteCreatorOpen(true)
        
        // Очищаем URL параметры
        const url = new URL(window.location.href)
        url.searchParams.delete('routeCreator')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [mounted, isHomePage, user, searchParams])

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
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Логотип */}
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">ArchiRoutes</span>
              </a>
            </div>

            {/* Навигация (десктоп) */}
            <nav className="hidden lg:flex items-center space-x-6">
              <a href="/map" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 py-1 border-b-2 border-transparent hover:border-blue-600">
                Карта
              </a>
              <a href="/news" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 py-1 border-b-2 border-transparent hover:border-blue-600">
                Новости
              </a>
              <a href="/blog" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 py-1 border-b-2 border-transparent hover:border-blue-600">
                Блог
              </a>
              <a href="/podcasts" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 py-1 border-b-2 border-transparent hover:border-blue-600">
                Подкасты
              </a>
            </nav>

            {/* Пользователь */}
            <div className="flex items-center space-x-2">
              {!mounted ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : loading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : user ? (
                <div className="flex items-center space-x-2">
                  <a
                    href="/search"
                    className="p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    aria-label="Поиск"
                  >
                    <Search size={20} />
                  </a>
                  <NotificationBell />
                  <UserDropdown />
                </div>
              ) : (
                <>
                  <a
                    href="/search"
                    className="p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    aria-label="Поиск"
                  >
                    <Search size={20} />
                  </a>
                  <button
                    onClick={handleAuthModalOpen}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Войти
                  </button>
                </>
              )}

              {/* Мобильное меню кнопка */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Мобильное меню */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-4">
                {/* Навигация */}
                <div className="space-y-3">
                  <a
                    href="/search"
                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center space-x-2"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Search size={18} />
                    <span>Поиск</span>
                  </a>
                  <a
                    href="/map"
                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Карта
                  </a>
                  <a
                    href="/news"
                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Новости
                  </a>
                  <a
                    href="/blog"
                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Блог
                  </a>
                  <a
                    href="/podcasts"
                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Подкасты
                  </a>
                </div>

                {/* Мобильная версия профиля */}
                {user && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="space-y-2">
                      <a
                        href="/profile"
                        className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Мой профиль
                      </a>
                      <a
                        href="/profile/edit"
                        className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Редактировать профиль
                      </a>
                      <a
                        href="/profile/buildings"
                        className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Объекты
                      </a>
                      <a
                        href="/profile/favorite-routes"
                        className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        Избранное
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
