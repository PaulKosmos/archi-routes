/**
 * i18n Configuration
 * Stub file for internationalization setup
 */

export const locales = ['ru', 'en', 'de'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ru'

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch'
}

export const localeFlags: Record<Locale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  de: '🇩🇪'
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
