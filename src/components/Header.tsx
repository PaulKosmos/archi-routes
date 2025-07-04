// components/Header.tsx (ОБНОВЛЕННЫЙ)
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'
import UserProfile from './UserProfile'
import RouteCreator from './RouteCreator'
import { User, Menu, Plus, Search, Building } from 'lucide-react'

interface HeaderProps {
  buildings?: any[]
}

export default function Header({ buildings = [] }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showProfile, setShowProfile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showRouteCreator, setShowRouteCreator] = useState(false)

  useEffect(() => {
    // Проверяем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (event === 'SIGNED_IN') {
          setShowAuthModal(false)
          setShowProfile(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  const handleLogout = () => {
    setShowProfile(false)
    setUser(null)
  }

  const handleCreateRoute = () => {
    if (!user) {
      handleAuthClick('login')
      return
    }
    console.log('Opening route creator with buildings:', buildings.length)
    console.log('Buildings data:', buildings)
    setShowRouteCreator(true)
  }

  const handleAddBuilding = () => {
    if (!user) {
      handleAuthClick('login')
      return
    }
    // Перенаправляем на страницу добавления здания
    window.location.href = '/buildings/new'
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Логотип */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AR</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  <a href="/" className="hover:text-blue-600 transition-colors">
                    ArchRoutes
                  </a>
                </h1>
              </div>
            </div>

            {/* Навигация для десктопа */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Главная
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                Маршруты
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                Сообщество
              </a>
              
              {/* Кнопки действий */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleAddBuilding}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Building size={16} />
                  <span>Добавить здание</span>
                </button>
                
                <button 
                  onClick={handleCreateRoute}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus size={16} />
                  <span>Создать маршрут</span>
                </button>
              </div>
            </nav>

            {/* Правая часть */}
            <div className="flex items-center space-x-4">
              {/* Поиск */}
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Search size={20} />
              </button>

              {/* Авторизация/Профиль */}
              {loading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.email[0].toUpperCase()}
                    </div>
                  </button>
                  
                  {showProfile && (
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border z-50">
                      <UserProfile user={user} onLogout={handleLogout} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Вход
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Регистрация
                  </button>
                </div>
              )}

              {/* Мобильное меню */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Мобильная навигация */}
          {showMobileMenu && (
            <div className="md:hidden border-t bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a href="/" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                  Главная
                </a>
                <a href="#" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                  Маршруты
                </a>
                <a href="#" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                  Сообщество
                </a>
                
                {/* Разделитель */}
                <div className="border-t my-2"></div>
                
                {/* Кнопки действий в мобильном меню */}
                <button 
                  onClick={handleAddBuilding}
                  className="w-full text-left px-3 py-2 text-green-600 hover:bg-green-50 rounded-md flex items-center space-x-2"
                >
                  <Building size={16} />
                  <span>Добавить здание</span>
                </button>
                
                <button 
                  onClick={handleCreateRoute}
                  className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Создать маршрут</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Модальные окна */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onToggleMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
      />

      <RouteCreator
        isOpen={showRouteCreator}
        onClose={() => setShowRouteCreator(false)}
        user={user}
        buildings={buildings}
      />

      {/* Оверлей для закрытия профиля */}
      {showProfile && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowProfile(false)}
        />
      )}
    </>
  )
}