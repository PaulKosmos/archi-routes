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
    <footer className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,96%)] mt-16">
      <div className="container mx-auto px-6 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">

          {/* Column 1: About Project */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-[var(--radius)] flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AR</span>
              </div>
              <span className="text-xl font-bold">ArchiRoutes</span>
            </div>
            <p className="text-sm leading-relaxed text-[hsl(215,20%,65%)]">
              Откройте архитектуру города через призму сообщества энтузиастов. Исследуйте здания, делитесь маршрутами и создавайте вместе с нами.
            </p>
            <p className="text-xs text-[hsl(215,20%,55%)]">
              Платформа для путешествия по архитектурным сокровищам мира
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Навигация</h3>
            <ul className="space-y-2">
              {[
                { label: "Главная", href: "/" },
                { label: "Карта", href: "/map" },
                { label: "Новости", href: "/news" },
                { label: "Блог", href: "/blog" },
                { label: "Подкасты", href: "/podcasts" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(215,20%,65%)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Information */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Информация</h3>
            <ul className="space-y-2">
              {[
                { label: "О нас", href: "#" },
                { label: "Контакты", href: "#" },
                { label: "Политика конфиденциальности", href: "#" },
                { label: "Условия использования", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(215,20%,65%)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Social & Newsletter */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Подпишитесь</h3>
            <p className="text-sm text-[hsl(215,20%,65%)] mb-4">
              Получайте обновления об архитектуре и новых маршрутах
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 bg-[hsl(222,47%,15%)] border border-[hsl(222,47%,20%)] text-white placeholder:text-[hsl(215,20%,50%)] h-10 px-3 rounded-[var(--radius)] outline-none focus:border-primary transition-colors"
                aria-label="Email for newsletter"
              />
              <button
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="h-10 w-10 bg-primary hover:bg-primary/90 rounded-[var(--radius)] flex items-center justify-center transition-opacity"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[hsl(215,20%,55%)] mt-4">Следите за нами</p>
            <div className="flex gap-3 mt-2">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-9 h-9 rounded-full border border-[hsl(222,47%,25%)] flex items-center justify-center hover:border-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[hsl(222,47%,18%)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[hsl(215,20%,55%)]">
              © {currentYear} ArchiRoutes. Все права защищены.
            </p>
            <div className="flex items-center gap-6">
              {["Карта сайта", "Статус", "Документация"].map((link) => (
                <Link
                  key={link}
                  href="#"
                  className="text-sm text-[hsl(215,20%,55%)] hover:text-white transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Made with Love */}
      <div className="border-t border-[hsl(222,47%,18%)]">
        <div className="container mx-auto px-6 py-3 text-center">
          <p className="text-sm text-[hsl(215,20%,55%)]">
            Сделано с любовью к архитектуре ❤️
          </p>
        </div>
      </div>
    </footer>
  )
}
