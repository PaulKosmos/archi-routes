'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { localeNames, localeFlags, type Locale } from '@/i18n/config'

export default function LanguageSelectionModal() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if language has already been selected
    const hasSelectedLanguage = localStorage.getItem('language-selected')

    if (!hasSelectedLanguage) {
      setIsOpen(true)
    }
  }, [])

  const selectLanguage = (locale: Locale) => {
    // Save selection
    localStorage.setItem('language-selected', 'true')
    localStorage.setItem('preferred-locale', locale)

    // Use next-intl's router which handles locale switching automatically
    router.push(pathname, { locale })

    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-6">
          <div className="mb-4">
            <span className="text-6xl">🌐</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Archi-Routes
          </h2>
          <p className="text-gray-600">
            Please select your preferred language
          </p>
        </div>

        <div className="space-y-3">
          {(['en', 'de', 'ru'] as const).map((locale) => (
            <button
              key={locale}
              onClick={() => selectLanguage(locale)}
              className="w-full flex items-center justify-between px-6 py-4
                       border-2 border-gray-200 rounded-xl
                       hover:border-blue-500 hover:bg-blue-50
                       transition-all duration-200 group"
            >
              <span className="text-3xl">{localeFlags[locale]}</span>
              <span className="text-lg font-medium group-hover:text-blue-600 transition-colors">
                {localeNames[locale]}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                →
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          You can change the language anytime in settings
        </p>
      </div>
    </div>
  )
}
