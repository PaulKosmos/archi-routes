'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Facebook, Twitter, Instagram, Linkedin, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function EnhancedFooter() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Пожалуйста, введите корректный email')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Simulate form submission (placeholder)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.success('Спасибо за подписку! 🎉')
      setEmail('')
    } catch (error) {
      toast.error('Ошибка при подписке. Пожалуйста, попробуйте позже.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: About Project */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                AR
              </div>
              <span className="text-lg font-bold text-white">ArchiRoutes</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Откройте архитектуру города через призму сообщества энтузиастов. Исследуйте здания, делитесь маршрутами и создавайте вместе с нами.
            </p>
            <p className="text-xs text-gray-500">
              Платформа для путешествия по архитектурным сокровищам мира
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Навигация
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Главная</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/map" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Карта</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/news" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Новости</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Блог</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Подкасты</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Информация
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">О нас</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Контакты</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Политика конфиденциальности</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="#" 
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Условия использования</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Social & Newsletter */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Подпишитесь
            </h3>
            
            {/* Newsletter form */}
            <form onSubmit={handleSubscribe} className="space-y-3">
              <p className="text-xs text-gray-400">
                Получайте обновления об архитектуре и новых маршрутах
              </p>
              <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors focus-within:border-blue-500">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
                  aria-label="Email for newsletter"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-3 py-2.5 transition-colors"
                  aria-label="Subscribe to newsletter"
                >
                  {isSubmitting ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </div>
            </form>

            {/* Social Icons */}
            <div>
              <p className="text-xs text-gray-400 mb-3">Следите за нами</p>
              <div className="flex items-center space-x-3">
                <a
                  href="#"
                  aria-label="Twitter"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <Twitter size={16} />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <Facebook size={16} />
                </a>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <Linkedin size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-xs text-gray-500 text-center sm:text-left">
              © {currentYear} ArchiRoutes. Все права защищены.
            </p>
            <div className="flex items-center space-x-6 mt-4 sm:mt-0 text-xs text-gray-500">
              <Link href="#" className="hover:text-gray-300 transition-colors">
                Карта сайта
              </Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">
                Статус
              </Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">
                Документация
              </Link>
            </div>
          </div>
        </div>

        {/* Made with love */}
        <div className="text-center pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-600">
            Сделано с любовью к архитектуре ❤️
          </p>
        </div>
      </div>
    </footer>
  )
}
