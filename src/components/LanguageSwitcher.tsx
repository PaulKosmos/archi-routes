'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useParams } from 'next/navigation'
import { localeNames, localeFlags, type Locale } from '@/i18n/config'

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const currentLocale = (params?.locale as Locale) || 'en'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const switchLanguage = (locale: Locale) => {
    // Save preference to localStorage
    localStorage.setItem('preferred-locale', locale)

    // Navigate to the same page with new locale
    router.push(pathname, { locale })
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg
                   hover:bg-gray-100 dark:hover:bg-gray-800
                   transition-colors duration-200"
        aria-label="Change language"
      >
        <span className="text-xl">{localeFlags[currentLocale]}</span>
        <span className="font-medium text-sm hidden sm:inline">
          {localeNames[currentLocale]}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg
                     bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                     py-1 z-50 animate-in fade-in zoom-in duration-200"
        >
          {(['en', 'de', 'ru'] as const).map((locale) => (
            <button
              key={locale}
              onClick={() => switchLanguage(locale)}
              className={`w-full flex items-center gap-3 px-4 py-2.5
                         hover:bg-gray-100 dark:hover:bg-gray-800
                         transition-colors duration-150
                         ${
                           locale === currentLocale
                             ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                             : 'text-gray-700 dark:text-gray-300'
                         }`}
            >
              <span className="text-xl">{localeFlags[locale]}</span>
              <span className="font-medium">{localeNames[locale]}</span>
              {locale === currentLocale && (
                <svg
                  className="ml-auto w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
