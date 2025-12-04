# 📋 План реализации интернационализации и локализации (i18n/l10n)

**Дата:** 2 декабря 2025
**Статус:** Планирование (обновлённая версия v2)
**Приоритет:** ВЫСОКИЙ (международная аудитория)
**Готовность к старту:** ✅ Да

---

## 📊 Обзор задачи

### Цель
Локализовать платформу Archi-Routes для международной аудитории с поддержкой трёх языков интерфейса и сохранением оригинального контента.

### Стратегия
**"Оригинал + английский перевод"**

1. **UI локализован** на 3 языка (English, Deutsch, Русский)
2. **Контент хранится в оригинале** (язык автора) + английский перевод
3. **Пользователь выбирает**:
   - Язык интерфейса (EN/DE/RU)
   - Для контента: оригинал или английский перевод
4. **Перевод контента ручной** (без автоматизации на первом этапе)

---

## 🌍 Языковая модель

### UI (Интерфейс платформы)
Полная локализация на **3 языка**:
- 🇬🇧 **English** (основной международный)
- 🇩🇪 **Deutsch** (немецкий)
- 🇷🇺 **Русский**

### Контент (из БД)
**Двухъязычная модель**:
- **Оригинальный язык** (тот, на котором автор создал контент)
- **Английский перевод** (для международной аудитории)

**Пример:**
```
Здание "Brandenburger Tor"
├── original_language: "de"
├── name (оригинал): "Brandenburger Tor"
└── name_en (перевод): "Brandenburg Gate"

Пользователь видит:
- Если выбрал "Read in original" → "Brandenburger Tor"
- Если выбрал "Read in English" → "Brandenburg Gate"
```

---

## 🏗️ Архитектура решения

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         ПОЛЬЗОВАТЕЛЬ                             │
│                                                                  │
│  При первом визите:                                              │
│  ┌──────────────────────────────────────────────────┐           │
│  │  🌐 Language Selection Modal                      │           │
│  │  Choose your language: EN | DE | RU              │           │
│  └──────────────────────────────────────────────────┘           │
└──────────────────────┬───────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
  ┌──────▼──────┐            ┌───────▼────────┐
  │  UI ЯЗЫК    │            │  КОНТЕНТ ЯЗЫК  │
  │  (3 языка)  │            │  (оригинал+EN) │
  └──────┬──────┘            └───────┬────────┘
         │                           │
  ┌──────▼──────────┐       ┌────────▼────────────────┐
  │ JSON файлы      │       │ БД таблицы:             │
  │ en/common.json  │       │ - original_language     │
  │ de/common.json  │       │ - field (оригинал)      │
  │ ru/common.json  │       │ - field_en (перевод)    │
  └─────────────────┘       └─────────────────────────┘
```

### Две независимые системы

| Система | Что локализует | Языки | Технология | Хранение |
|---------|----------------|-------|------------|----------|
| **UI локализация** | Интерфейс, кнопки, меню | EN, DE, RU | next-intl | JSON файлы |
| **Контент перевод** | Здания, маршруты, блоги | Оригинал + EN | Custom | PostgreSQL столбцы |

---

## 📝 Детальный план работы

### 🎯 Этап 1: Подготовка и настройка (1-2 дня)

**Цель:** Установить библиотеки, создать структуру, настроить конфигурацию

#### 1.1 Установка зависимостей

```bash
npm install next-intl
```

**Что делает:**
- `next-intl` - библиотека для UI локализации в Next.js 15 App Router

**НЕ устанавливаем** (на первом этапе):
- ❌ Google Translate API
- ❌ DeepL API
- ❌ OpenAI API

Переводы контента будут **ручными**.

---

#### 1.2 Создание структуры папок

```bash
src/
├── i18n/
│   ├── config.ts              # Конфигурация: 3 языка
│   ├── request.ts             # Серверная конфигурация
│   └── locales/
│       ├── en/
│       │   ├── common.json          # Общие тексты
│       │   ├── navigation.json      # Навигация
│       │   ├── forms.json           # Формы
│       │   ├── buildings.json       # Здания
│       │   ├── routes.json          # Маршруты
│       │   └── errors.json          # Ошибки
│       ├── de/
│       │   ├── common.json
│       │   ├── navigation.json
│       │   ├── forms.json
│       │   ├── buildings.json
│       │   ├── routes.json
│       │   └── errors.json
│       └── ru/
│           ├── common.json
│           ├── navigation.json
│           ├── forms.json
│           ├── buildings.json
│           ├── routes.json
│           └── errors.json
```

---

#### 1.3 Миграция БД для контента

**Файл:** `database/migrations/030_add_content_localization.sql`

**Стратегия:** Добавляем столбцы `_en` для английских переводов и `original_language` для отслеживания языка оригинала.

```sql
-- ============================================
-- BUILDINGS: Добавляем поля локализации
-- ============================================

-- Поле для языка оригинала
ALTER TABLE buildings
ADD COLUMN original_language TEXT NOT NULL DEFAULT 'ru';

-- Английские переводы
ALTER TABLE buildings
ADD COLUMN name_en TEXT,
ADD COLUMN description_en TEXT,
ADD COLUMN short_description_en TEXT,
ADD COLUMN historical_context_en TEXT,
ADD COLUMN architectural_style_notes_en TEXT;

-- Комментарий
COMMENT ON COLUMN buildings.original_language IS 'Language of original content: en, de, or ru';
COMMENT ON COLUMN buildings.name_en IS 'English translation of building name';
COMMENT ON COLUMN buildings.description_en IS 'English translation of description';

-- ============================================
-- ROUTES: Добавляем поля локализации
-- ============================================

ALTER TABLE routes
ADD COLUMN original_language TEXT NOT NULL DEFAULT 'ru',
ADD COLUMN title_en TEXT,
ADD COLUMN description_en TEXT;

COMMENT ON COLUMN routes.original_language IS 'Language of original content: en, de, or ru';

-- ============================================
-- BUILDING_REVIEWS: Добавляем поля локализации
-- ============================================

ALTER TABLE building_reviews
ADD COLUMN original_language TEXT NOT NULL DEFAULT 'ru',
ADD COLUMN review_text_en TEXT,
ADD COLUMN audio_description_en TEXT;

COMMENT ON COLUMN building_reviews.original_language IS 'Language of original content: en, de, or ru';

-- ============================================
-- BLOG_POSTS: Добавляем поля локализации
-- ============================================

ALTER TABLE blog_posts
ADD COLUMN original_language TEXT NOT NULL DEFAULT 'ru',
ADD COLUMN title_en TEXT,
ADD COLUMN content_en TEXT,
ADD COLUMN excerpt_en TEXT;

-- ============================================
-- NEWS_POSTS: Добавляем поля локализации
-- ============================================

ALTER TABLE news_posts
ADD COLUMN original_language TEXT NOT NULL DEFAULT 'ru',
ADD COLUMN title_en TEXT,
ADD COLUMN content_en TEXT;

-- ============================================
-- ИНДЕКСЫ для производительности
-- ============================================

CREATE INDEX idx_buildings_original_language ON buildings(original_language);
CREATE INDEX idx_routes_original_language ON routes(original_language);
CREATE INDEX idx_blog_posts_original_language ON blog_posts(original_language);

-- ============================================
-- ТАБЛИЦА: user_preferences (для хранения настроек)
-- ============================================

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Язык интерфейса
  ui_language TEXT NOT NULL DEFAULT 'en' CHECK (ui_language IN ('en', 'de', 'ru')),

  -- Предпочтение для контента
  content_language_preference TEXT NOT NULL DEFAULT 'original'
    CHECK (content_language_preference IN ('original', 'english')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Один набор настроек на пользователя
  UNIQUE(user_id)
);

-- RLS политики
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================
-- ФУНКЦИЯ: Получить контент на нужном языке
-- ============================================

CREATE OR REPLACE FUNCTION get_localized_field(
  original_value TEXT,
  english_value TEXT,
  original_lang TEXT,
  user_preference TEXT
) RETURNS TEXT AS $$
BEGIN
  -- Если пользователь выбрал оригинал
  IF user_preference = 'original' THEN
    RETURN original_value;
  END IF;

  -- Если пользователь выбрал английский
  IF user_preference = 'english' THEN
    -- Если есть перевод, возвращаем его
    IF english_value IS NOT NULL AND english_value != '' THEN
      RETURN english_value;
    END IF;

    -- Если перевода нет, возвращаем оригинал
    RETURN original_value;
  END IF;

  -- По умолчанию - оригинал
  RETURN original_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_localized_field IS
'Returns appropriate content based on user language preference';
```

**Объяснение:**
- Каждая сущность получает `original_language` (en/de/ru)
- Добавляются столбцы `*_en` для английских переводов
- `user_preferences` хранит предпочтения пользователя
- Функция `get_localized_field()` автоматически выбирает правильную версию

---

### 🎯 Этап 2: UI локализация (next-intl) (3-4 дня)

**Цель:** Перевести весь интерфейс на 3 языка

#### 2.1 Настройка next-intl

**Файл:** `src/i18n/config.ts`

```typescript
export const locales = ['en', 'de', 'ru'] as const
export type Locale = (typeof locales)[number]

// Английский как основной международный
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  ru: 'Русский'
}

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  ru: '🇷🇺'
}
```

**Файл:** `src/i18n/request.ts`

```typescript
import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from './config'

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  if (!locales.includes(locale as any)) notFound()

  return {
    messages: {
      ...(await import(`./locales/${locale}/common.json`)).default,
      ...(await import(`./locales/${locale}/navigation.json`)).default,
      ...(await import(`./locales/${locale}/forms.json`)).default,
      ...(await import(`./locales/${locale}/buildings.json`)).default,
      ...(await import(`./locales/${locale}/routes.json`)).default,
      ...(await import(`./locales/${locale}/errors.json`)).default,
    }
  }
})
```

**Файл:** `next.config.ts` (обновить)

```typescript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig = {
  // ... existing config
}

export default withNextIntl(nextConfig)
```

---

#### 2.2 Реструктуризация app/ под локали

**Было:**
```
src/app/
├── page.tsx
├── test-map/
│   └── page.tsx
└── admin/
    └── page.tsx
```

**Станет:**
```
src/app/
├── [locale]/
│   ├── layout.tsx         # Root layout с next-intl провайдером
│   ├── page.tsx           # Home page
│   ├── test-map/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   └── translations/
│   │       └── page.tsx   # Новая страница управления переводами
│   └── not-found.tsx
├── middleware.ts          # Редирект на /en по умолчанию
└── not-found.tsx
```

**Файл:** `src/app/[locale]/layout.tsx`

```typescript
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n/config'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound()
  }

  // Load messages
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

**Файл:** `src/middleware.ts` (создать)

```typescript
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/config'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always' // URLs всегда с префиксом: /en, /de, /ru
})

export const config = {
  matcher: ['/', '/(de|en|ru)/:path*']
}
```

---

#### 2.3 Создание JSON переводов

**Примеры файлов:**

**`src/i18n/locales/en/common.json`**

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "filter": "Filter",
    "readMore": "Read more",
    "showOriginal": "Read in original language",
    "showEnglish": "Read in English",
    "originalLanguage": "Original language"
  }
}
```

**`src/i18n/locales/de/common.json`**

```json
{
  "common": {
    "loading": "Lädt...",
    "error": "Fehler",
    "success": "Erfolg",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "search": "Suchen",
    "filter": "Filter",
    "readMore": "Mehr lesen",
    "showOriginal": "In Originalsprache lesen",
    "showEnglish": "Auf Englisch lesen",
    "originalLanguage": "Originalsprache"
  }
}
```

**`src/i18n/locales/ru/common.json`**

```json
{
  "common": {
    "loading": "Загрузка...",
    "error": "Ошибка",
    "success": "Успешно",
    "save": "Сохранить",
    "cancel": "Отменить",
    "delete": "Удалить",
    "edit": "Редактировать",
    "search": "Поиск",
    "filter": "Фильтр",
    "readMore": "Читать далее",
    "showOriginal": "Читать на языке оригинала",
    "showEnglish": "Читать на английском",
    "originalLanguage": "Язык оригинала"
  }
}
```

**Оценка:** ~400-500 строк переводов на каждый язык

---

#### 2.4 Language Selection Modal (при первом визите)

**Файл:** `src/components/LanguageSelectionModal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { localeNames, localeFlags, type Locale } from '@/i18n/config'

export default function LanguageSelectionModal() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Проверяем, был ли уже выбран язык
    const hasSelectedLanguage = localStorage.getItem('language-selected')

    if (!hasSelectedLanguage) {
      setIsOpen(true)
    }
  }, [])

  const selectLanguage = (locale: Locale) => {
    // Сохраняем выбор
    localStorage.setItem('language-selected', 'true')
    localStorage.setItem('preferred-locale', locale)

    // Редирект на выбранный язык
    router.push(`/${locale}${pathname}`)
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome to Archi-Routes</h2>
          <p className="text-gray-600">Please select your preferred language</p>
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
              <span className="text-lg font-medium group-hover:text-blue-600">
                {localeNames[locale]}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
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
```

**Разместить:** В `src/app/[locale]/layout.tsx` (внутри body)

---

#### 2.5 Language Switcher (переключатель в header)

**Файл:** `src/components/LanguageSwitcher.tsx`

```typescript
'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { localeNames, localeFlags, type Locale } from '@/i18n/config'
import { useState } from 'react'

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const switchLocale = (newLocale: Locale) => {
    // Update localStorage
    localStorage.setItem('preferred-locale', newLocale)

    // Navigate to new locale
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg
                 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl">{localeFlags[locale]}</span>
        <span className="font-medium">{locale.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg
                      shadow-xl border border-gray-200 py-2 z-50">
          {(['en', 'de', 'ru'] as const).map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`w-full flex items-center space-x-3 px-4 py-2
                       hover:bg-gray-100 transition-colors ${
                         locale === loc ? 'bg-blue-50 text-blue-600' : ''
                       }`}
            >
              <span className="text-xl">{localeFlags[loc]}</span>
              <span className="font-medium">{localeNames[loc]}</span>
              {locale === loc && (
                <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

#### 2.6 Обновление компонентов

**Было:**
```typescript
export default function Navigation() {
  return (
    <nav>
      <Link href="/">Главная</Link>
      <Link href="/test-map">Карта</Link>
    </nav>
  )
}
```

**Станет:**
```typescript
'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function Navigation() {
  const t = useTranslations('navigation')

  return (
    <nav>
      <Link href="/">{t('home')}</Link>
      <Link href="/test-map">{t('map')}</Link>
    </nav>
  )
}
```

**Файл:** `src/i18n/navigation.ts` (создать)

```typescript
import { createSharedPathnamesNavigation } from 'next-intl/navigation'
import { locales } from './config'

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales })
```

**Компоненты для обновления (приоритет):**
1. Header/Navigation (~2 часа)
2. Footer (~1 час)
3. BuildingModalNew (~2 часа)
4. RouteViewerModal (~2 часа)
5. AddReviewModal (~2 часа)
6. AuthModal (~1 час)
7. Forms и другие UI компоненты (~4 часа)

**Итого:** ~40-50 компонентов

---

### 🎯 Этап 3: Система перевода контента (3-4 дня)

**Цель:** Реализовать ручной перевод контента с выбором оригинал/английский

#### 3.1 React Hook для выбора языка контента

**Файл:** `src/hooks/useContentLanguage.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type ContentLanguagePreference = 'original' | 'english'

export function useContentLanguage() {
  const [preference, setPreference] = useState<ContentLanguagePreference>('original')
  const { user } = useAuth()
  const supabase = createClient()

  // Загружаем предпочтение пользователя
  useEffect(() => {
    async function loadPreference() {
      if (user) {
        const { data } = await supabase
          .from('user_preferences')
          .select('content_language_preference')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setPreference(data.content_language_preference)
        }
      } else {
        // Для неавторизованных - из localStorage
        const saved = localStorage.getItem('content-language-preference')
        if (saved) {
          setPreference(saved as ContentLanguagePreference)
        }
      }
    }

    loadPreference()
  }, [user, supabase])

  // Обновить предпочтение
  const updatePreference = async (newPreference: ContentLanguagePreference) => {
    setPreference(newPreference)

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          content_language_preference: newPreference
        })
    } else {
      localStorage.setItem('content-language-preference', newPreference)
    }
  }

  return { preference, updatePreference }
}
```

---

#### 3.2 Утилита для получения локализованного контента

**Файл:** `src/lib/get-localized-content.ts`

```typescript
export type ContentLanguagePreference = 'original' | 'english'

export function getLocalizedText(
  originalText: string,
  englishText: string | null,
  preference: ContentLanguagePreference
): string {
  if (preference === 'english' && englishText) {
    return englishText
  }
  return originalText
}

// Для множественных полей
export function getLocalizedFields<T extends Record<string, any>>(
  original: T,
  englishFields: Partial<Record<keyof T, string>>,
  preference: ContentLanguagePreference,
  fieldsToLocalize: (keyof T)[]
): T {
  if (preference === 'original') {
    return original
  }

  const localized = { ...original }

  fieldsToLocalize.forEach(field => {
    const englishValue = englishFields[field]
    if (englishValue) {
      localized[field] = englishValue as T[keyof T]
    }
  })

  return localized
}
```

---

#### 3.3 Компонент переключения языка контента

**Файл:** `src/components/ContentLanguageToggle.tsx`

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { useContentLanguage } from '@/hooks/useContentLanguage'
import { localeFlags } from '@/i18n/config'

interface ContentLanguageToggleProps {
  originalLanguage: 'en' | 'de' | 'ru'
  hasEnglishTranslation: boolean
}

export default function ContentLanguageToggle({
  originalLanguage,
  hasEnglishTranslation
}: ContentLanguageToggleProps) {
  const t = useTranslations('common')
  const { preference, updatePreference } = useContentLanguage()

  // Если оригинал уже на английском, не показываем переключатель
  if (originalLanguage === 'en') {
    return null
  }

  return (
    <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
      <button
        onClick={() => updatePreference('original')}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
          preference === 'original'
            ? 'bg-white shadow-sm text-blue-600 font-medium'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <span>{localeFlags[originalLanguage]}</span>
        <span className="text-sm">{t('showOriginal')}</span>
      </button>

      {hasEnglishTranslation && (
        <button
          onClick={() => updatePreference('english')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
            preference === 'english'
              ? 'bg-white shadow-sm text-blue-600 font-medium'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>{localeFlags.en}</span>
          <span className="text-sm">{t('showEnglish')}</span>
        </button>
      )}

      {!hasEnglishTranslation && preference === 'english' && (
        <span className="text-xs text-amber-600 ml-2">
          Translation not available yet
        </span>
      )}
    </div>
  )
}
```

---

#### 3.4 Интеграция в BuildingModalNew

**Обновляем:** `src/components/BuildingModalNew.tsx`

```typescript
'use client'

import { useMemo } from 'react'
import { useContentLanguage } from '@/hooks/useContentLanguage'
import { getLocalizedText } from '@/lib/get-localized-content'
import ContentLanguageToggle from './ContentLanguageToggle'

export default function BuildingModalNew({ building }: { building: Building }) {
  const { preference } = useContentLanguage()

  // Получаем локализованный контент
  const displayName = useMemo(
    () => getLocalizedText(building.name, building.name_en, preference),
    [building.name, building.name_en, preference]
  )

  const displayDescription = useMemo(
    () => getLocalizedText(building.description, building.description_en, preference),
    [building.description, building.description_en, preference]
  )

  const hasEnglishTranslation = Boolean(building.name_en)

  return (
    <div className="building-modal">
      {/* Переключатель языка */}
      <ContentLanguageToggle
        originalLanguage={building.original_language}
        hasEnglishTranslation={hasEnglishTranslation}
      />

      {/* Контент */}
      <h1>{displayName}</h1>
      <p>{displayDescription}</p>

      {/* ... остальной контент */}
    </div>
  )
}
```

---

#### 3.5 Админ-панель для управления переводами

**Файл:** `src/app/[locale]/admin/translations/page.tsx`

```typescript
import { createClient } from '@/lib/supabase'
import TranslationEditor from '@/components/admin/TranslationEditor'

export default async function TranslationsAdminPage() {
  const supabase = createClient()

  // Получаем здания без английского перевода
  const { data: buildingsNeedingTranslation } = await supabase
    .from('buildings')
    .select('id, name, description, original_language, name_en, description_en')
    .is('name_en', null)
    .limit(20)

  // Статистика
  const { count: totalBuildings } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })

  const { count: translatedBuildings } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })
    .not('name_en', 'is', null)

  const translationProgress = totalBuildings
    ? Math.round((translatedBuildings / totalBuildings) * 100)
    : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Content Translation Management</h1>

        {/* Прогресс */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Translation Progress</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${translationProgress}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {translationProgress}%
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {translatedBuildings} of {totalBuildings} buildings translated
          </p>
        </div>
      </div>

      {/* Список для перевода */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Buildings Needing Translation</h2>
        </div>

        <div className="divide-y">
          {buildingsNeedingTranslation?.map(building => (
            <TranslationEditor
              key={building.id}
              entityType="building"
              entityId={building.id}
              originalLanguage={building.original_language}
              fields={{
                name: building.name,
                description: building.description
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Файл:** `src/components/admin/TranslationEditor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { localeFlags } from '@/i18n/config'

interface TranslationEditorProps {
  entityType: 'building' | 'route' | 'blog_post' | 'news_post'
  entityId: string
  originalLanguage: 'en' | 'de' | 'ru'
  fields: Record<string, string>
}

export default function TranslationEditor({
  entityType,
  entityId,
  originalLanguage,
  fields
}: TranslationEditorProps) {
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)

    // Подготовка объекта для обновления
    const updates: Record<string, string> = {}
    Object.keys(translations).forEach(fieldName => {
      updates[`${fieldName}_en`] = translations[fieldName]
    })

    const { error } = await supabase
      .from(entityType === 'building' ? 'buildings' : `${entityType}s`)
      .update(updates)
      .eq('id', entityId)

    if (!error) {
      alert('Translation saved successfully!')
    }

    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{localeFlags[originalLanguage]}</span>
          <span className="text-sm text-gray-500">→</span>
          <span className="text-2xl">{localeFlags.en}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Translation'}
        </button>
      </div>

      {Object.entries(fields).map(([fieldName, originalText]) => (
        <div key={fieldName} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {fieldName} (Original)
          </label>
          <div className="p-3 bg-gray-50 rounded-lg mb-2 text-sm">
            {originalText}
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            {fieldName} (English Translation)
          </label>
          <textarea
            value={translations[fieldName] || ''}
            onChange={(e) => setTranslations({
              ...translations,
              [fieldName]: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter English translation..."
          />
        </div>
      ))}
    </div>
  )
}
```

---

### 🎯 Этап 4: Обновление форм создания контента (2 дня)

**Цель:** Добавить поля для языка оригинала и английского перевода

#### 4.1 Обновление формы создания отзыва

**В `AddReviewModal.tsx` добавить:**

```typescript
// Добавить поле выбора языка
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Review Language
  </label>
  <select
    value={originalLanguage}
    onChange={(e) => setOriginalLanguage(e.target.value)}
    className="w-full px-3 py-2 border rounded-lg"
  >
    <option value="en">🇬🇧 English</option>
    <option value="de">🇩🇪 Deutsch</option>
    <option value="ru">🇷🇺 Русский</option>
  </select>
</div>

{/* Опционально: поле для английского перевода */}
{originalLanguage !== 'en' && (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2">
      English Translation (optional)
    </label>
    <textarea
      value={reviewTextEn}
      onChange={(e) => setReviewTextEn(e.target.value)}
      className="w-full px-3 py-2 border rounded-lg"
      rows={4}
      placeholder="Add English translation to reach international audience..."
    />
  </div>
)}
```

#### 4.2 Аналогично обновить:
- RouteCreator - добавить `original_language` и `title_en`, `description_en`
- BlogPostEditor - добавить поля перевода
- NewsPostEditor - добавить поля перевода

---

### 🎯 Этап 5: SEO и метаданные (1 день)

**Цель:** Настроить hreflang теги и мультиязычные метаданные

**Файл:** `src/app/[locale]/layout.tsx` (обновить)

```typescript
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'de': '/de',
        'ru': '/ru'
      }
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale,
      alternateLocale: ['en', 'de', 'ru'].filter(l => l !== locale)
    }
  }
}
```

---

### 🎯 Этап 6: Тестирование (2-3 дня)

#### 6.1 Ручное тестирование

**Чеклист:**
- [ ] Language Selection Modal появляется при первом визите
- [ ] Переключение UI языка (EN/DE/RU) работает
- [ ] Переключение языка контента (Original/English) работает
- [ ] Админ-панель переводов функционирует
- [ ] Формы создания контента сохраняют `original_language`
- [ ] SEO теги (hreflang) корректны
- [ ] Mobile версия работает
- [ ] Персистентность настроек (localStorage + БД)

---

## 📊 Временная шкала

| Этап | Описание | Детали |
|------|----------|---------|
| **Этап 1** | Подготовка и настройка | Установка next-intl, миграция БД, структура папок |
| **Этап 2** | UI локализация | JSON переводы (EN/DE/RU), Language Modal, Switcher |
| **Этап 3** | Система перевода контента | Hooks, утилиты, ContentLanguageToggle |
| **Этап 4** | Обновление форм | Добавление полей original_language и *_en |
| **Этап 5** | SEO и метаданные | hreflang теги, Open Graph |
| **Этап 6** | Тестирование | Ручное и автоматическое тестирование |

---

## 💰 Стоимость

### Вариант 1: Только ручной перевод (рекомендуется для старта)
- **Затраты:** $0/мес на API
- **Время на перевод:** Зависит от объёма контента
- **Качество:** Наивысшее (ручной перевод)

### Вариант 2: Добавить автоперевод позже
Когда контента станет много, можно добавить:
- Google Translate API (~$20/мес)
- DeepL API (~$20/мес)

**Рекомендация:** Начать с ручного перевода, добавить автоматизацию через 2-3 месяца.

---

## ✅ Чек-лист готовности

### Перед началом:
- [ ] Прочитал план v2
- [ ] Понятна концепция (UI 3 языка, контент оригинал+EN)
- [ ] Согласован объём работ
- [ ] Определены приоритеты контента для перевода

### После Этапа 1:
- [ ] next-intl установлен
- [ ] Миграция БД применена
- [ ] Структура i18n создана

### После Этапа 2:
- [ ] UI переведён на 3 языка
- [ ] Language Selection Modal работает
- [ ] Language Switcher в header

### После Этапа 3:
- [ ] Система выбора языка контента работает
- [ ] Админ-панель переводов готова

### После Этапа 6:
- [ ] Все тесты пройдены
- [ ] SEO настроен
- [ ] **ГОТОВО К ЗАПУСКУ** 🚀

---

## 🎯 Приоритизация контента для перевода

### Фаза 1: Критичный контент (первый месяц)
1. **UI тексты** - 100% на всех 3 языках
2. **Топ-20 зданий** - перевести на английский
3. **Featured маршруты** (~10 шт) - перевести на английский

### Фаза 2: Основной контент (2-3 месяца)
1. Все здания с высоким рейтингом
2. Популярные маршруты
3. Ключевые блог посты

### Фаза 3: Полное покрытие (3-6 месяцев)
1. Все оставшиеся здания
2. Все маршруты
3. Весь блог

---

## 🔑 Ключевые отличия от предыдущего плана

| Аспект | Старый план | Новый план |
|--------|-------------|------------|
| **UI языки** | 2 (RU, EN) | 3 (EN, DE, RU) |
| **Основной язык** | Русский | Английский |
| **Контент** | Всегда русский оригинал | Язык автора (EN/DE/RU) |
| **Переводы** | Автоматические (API) | Ручные |
| **Выбор языка** | Простой switcher | Modal при первом визите |
| **Хранение переводов** | Таблица translations | Столбцы *_en в основных таблицах |
| **Затраты** | $20-140/мес | $0/мес |

---

**Статус:** ✅ Ready to implement
**Следующий шаг:** Получить утверждение плана и начать с Этапа 1

---

Вопросы для обсуждения:
1. Согласованы ли 3 языка UI (EN/DE/RU)?
2. Достаточно ли только английского для переводов контента?
3. Когда планируется запуск?
4. Есть ли приоритетный контент для первоочередного перевода?
