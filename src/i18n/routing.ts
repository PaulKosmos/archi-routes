/**
 * i18n Routing Configuration
 * Stub file for internationalized routing
 */

import { useRouter as useNextRouter, usePathname as useNextPathname } from 'next/navigation'
import { locales, defaultLocale, type Locale } from './config'

export { locales, defaultLocale, type Locale }

/**
 * Create a localized path
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  if (locale === defaultLocale) {
    return path
  }
  return `/${locale}${path}`
}

/**
 * Get locale from path
 */
export function getLocaleFromPath(path: string): Locale {
  const segments = path.split('/')
  const potentialLocale = segments[1]

  if (locales.includes(potentialLocale as Locale)) {
    return potentialLocale as Locale
  }

  return defaultLocale
}

/**
 * Localized router hook
 * Wraps Next.js router with locale support
 */
export function useRouter() {
  const router = useNextRouter()

  return {
    push: (pathname: string, options?: { locale?: Locale }) => {
      const locale = options?.locale
      const localizedPath = locale ? getLocalizedPath(pathname, locale) : pathname
      router.push(localizedPath)
    },
    replace: (pathname: string, options?: { locale?: Locale }) => {
      const locale = options?.locale
      const localizedPath = locale ? getLocalizedPath(pathname, locale) : pathname
      router.replace(localizedPath)
    },
    back: () => router.back(),
    forward: () => router.forward(),
    refresh: () => router.refresh(),
    prefetch: (pathname: string) => router.prefetch(pathname)
  }
}

/**
 * Localized pathname hook
 * Returns current pathname without locale prefix
 */
export function usePathname() {
  const pathname = useNextPathname()

  // Remove locale prefix if present
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1)
    }
    if (pathname === `/${locale}`) {
      return '/'
    }
  }

  return pathname
}
