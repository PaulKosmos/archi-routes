# 📋 План реализации интернационализации (i18n)

**Дата:** 1 декабря 2025
**Статус:** Планирование
**Приоритет:** ВЫСОКИЙ (для международной аудитории)
**Оценка времени:** 2-3 недели
**Готовность к старту:** ✅ Да

---

## 📊 Обзор задачи

### Цель
Реализовать двухъязычную систему (Русский + Английский) для платформы Archi-Routes.

### Стратегия
**"Перевести один раз и хранить в БД"**

1. Контент создаётся на русском (оригинал)
2. Перевод делается ОДИН РАЗ → сохраняется в БД
3. Пользователь выбирает язык → видит оригинал или перевод

### Что будет переведено

**UI (интерфейс):**
- Кнопки, меню, навигация
- Сообщения об ошибках
- Формы и подсказки
- Общие тексты

**Контент (из БД):**
- Названия и описания зданий
- Маршруты
- Блог посты
- Новости
- Отзывы пользователей

---

## 🏗️ Архитектура решения

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ                              │
│              [Выбирает язык: RU / EN]                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴────────────┐
           │                        │
    ┌──────▼──────┐         ┌──────▼──────┐
    │  UI тексты  │         │   Контент   │
    │  (next-intl)│         │    (БД)     │
    └──────┬──────┘         └──────┬──────┘
           │                        │
    ┌──────▼──────────┐    ┌────────▼────────────┐
    │ JSON файлы      │    │ content_translations│
    │ ru/common.json  │    │      таблица        │
    │ en/common.json  │    │                     │
    └─────────────────┘    └─────────────────────┘
```

### Две независимые системы

| Система | Что переводит | Хранение | Технология |
|---------|---------------|----------|------------|
| **UI переводы** | Интерфейс, кнопки, меню | JSON файлы | next-intl |
| **Контент переводы** | Здания, маршруты, блоги | PostgreSQL таблица | Custom service |

---

## 📝 Детальный план работы

### 🎯 Этап 1: Подготовка и настройка (2-3 дня)

**Цель:** Установить библиотеки, создать структуру, настроить конфигурацию

#### 1.1 Установка зависимостей
**Время:** 30 минут

```bash
npm install next-intl
npm install @google-cloud/translate  # Опционально
npm install deepl-node               # Опционально
```

**Что делает:**
- `next-intl` - библиотека для UI переводов в Next.js 15
- `@google-cloud/translate` - Google Translate API (для автоперевода)
- `deepl-node` - DeepL API (альтернатива Google)

---

#### 1.2 Создание структуры папок
**Время:** 15 минут

```bash
src/
├── i18n/
│   ├── config.ts           # Конфигурация языков
│   ├── request.ts          # Серверная конфигурация
│   └── locales/
│       ├── ru/
│       │   ├── common.json        # Общие тексты
│       │   ├── navigation.json    # Навигация
│       │   ├── forms.json         # Формы
│       │   └── errors.json        # Ошибки
│       └── en/
│           ├── common.json
│           ├── navigation.json
│           ├── forms.json
│           └── errors.json
```

**Объяснение:**
- `config.ts` - список языков, язык по умолчанию
- `request.ts` - определяет язык из URL или cookie
- `locales/` - JSON файлы с переводами UI

---

#### 1.3 Создание миграции БД
**Время:** 1 час

**Файл:** `database/migrations/030_add_content_translations.sql`

```sql
-- Таблица для хранения переводов контента
CREATE TABLE content_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,      -- 'building', 'route', 'blog_post', etc.
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,       -- 'name', 'description', 'content'
  source_lang TEXT NOT NULL DEFAULT 'ru',
  target_lang TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  translation_method TEXT NOT NULL, -- 'manual', 'google', 'deepl', 'gpt4'
  is_approved BOOLEAN DEFAULT FALSE,
  translated_by UUID REFERENCES auth.users(id),
  translated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Один перевод на комбинацию
  UNIQUE(entity_type, entity_id, field_name, target_lang)
);

-- Индексы для быстрого поиска переводов
CREATE INDEX idx_translations_lookup
  ON content_translations(entity_type, entity_id, target_lang);

CREATE INDEX idx_translations_approval
  ON content_translations(is_approved, entity_type);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_translations_updated_at
BEFORE UPDATE ON content_translations
FOR EACH ROW
EXECUTE FUNCTION update_translations_updated_at();

-- RLS политики
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- Все могут читать утверждённые переводы
CREATE POLICY "Anyone can view approved translations"
ON content_translations FOR SELECT
USING (is_approved = true);

-- Админы могут всё
CREATE POLICY "Admins can manage translations"
ON content_translations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);
```

**Объяснение:**
- Одна таблица для всех переводов (универсальная схема)
- `entity_type` + `entity_id` = ссылка на контент
- `field_name` = какое поле переводим (name, description)
- `is_approved` = модерация переводов
- RLS защита + индексы для производительности

---

### 🎯 Этап 2: UI переводы (next-intl) (3-4 дня)

**Цель:** Перевести весь интерфейс на английский

#### 2.1 Настройка next-intl
**Время:** 2 часа

**Файл:** `src/i18n/config.ts`

```typescript
export const locales = ['ru', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ru'

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English'
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
    messages: (await import(`./locales/${locale}/common.json`)).default
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

**Объяснение:**
- next-intl интегрируется в Next.js 15 App Router
- URL будет: `/ru/buildings`, `/en/buildings`
- Автоматическое определение языка из URL

---

#### 2.2 Реструктуризация app/ под локали
**Время:** 3 часа

**Было:**
```
src/app/
├── page.tsx
├── buildings/
│   └── page.tsx
└── map/
    └── page.tsx
```

**Станет:**
```
src/app/
├── [locale]/
│   ├── layout.tsx         # Root layout с провайдером
│   ├── page.tsx
│   ├── buildings/
│   │   └── page.tsx
│   └── map/
│       └── page.tsx
└── not-found.tsx          # 404 страница
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

**Объяснение:**
- Все страницы перемещаются под `[locale]/`
- next-intl провайдер оборачивает всё приложение
- Автоматическая генерация статических страниц для обоих языков

---

#### 2.3 Создание JSON файлов переводов
**Время:** 6-8 часов

**Файл:** `src/i18n/locales/ru/common.json`

```json
{
  "nav": {
    "home": "Главная",
    "buildings": "Здания",
    "routes": "Маршруты",
    "map": "Карта",
    "blog": "Блог",
    "news": "Новости",
    "podcasts": "Подкасты",
    "about": "О проекте",
    "contact": "Контакты"
  },
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
    "readMore": "Читать далее"
  },
  "auth": {
    "login": "Войти",
    "logout": "Выйти",
    "register": "Регистрация",
    "email": "Email",
    "password": "Пароль",
    "forgotPassword": "Забыли пароль?"
  },
  "buildings": {
    "title": "Здания",
    "description": "Архитектурные объекты",
    "addReview": "Добавить отзыв",
    "viewOnMap": "Посмотреть на карте"
  }
  // ... ещё ~200-300 строк
}
```

**Файл:** `src/i18n/locales/en/common.json`

```json
{
  "nav": {
    "home": "Home",
    "buildings": "Buildings",
    "routes": "Routes",
    "map": "Map",
    "blog": "Blog",
    "news": "News",
    "podcasts": "Podcasts",
    "about": "About",
    "contact": "Contact"
  },
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
    "readMore": "Read more"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "register": "Sign up",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?"
  },
  "buildings": {
    "title": "Buildings",
    "description": "Architectural objects",
    "addReview": "Add review",
    "viewOnMap": "View on map"
  }
  // ... ещё ~200-300 строк
}
```

**Процесс:**
1. Собрать все жестко закодированные тексты из компонентов
2. Сгруппировать по категориям (nav, auth, buildings, etc.)
3. Создать структуру JSON
4. Перевести на английский (можно использовать GPT-4)

**Оценка:** ~300-400 строк переводов для UI

---

#### 2.4 Обновление компонентов
**Время:** 8-10 часов

**Было:**
```typescript
export default function Navigation() {
  return (
    <nav>
      <Link href="/">Главная</Link>
      <Link href="/buildings">Здания</Link>
      <Link href="/routes">Маршруты</Link>
    </nav>
  )
}
```

**Станет:**
```typescript
'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

export default function Navigation() {
  const t = useTranslations('nav')

  return (
    <nav>
      <Link href="/">{t('home')}</Link>
      <Link href="/buildings">{t('buildings')}</Link>
      <Link href="/routes">{t('routes')}</Link>
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
1. Navigation / Header (~2 часа)
2. Footer (~1 час)
3. AuthModal (~1 час)
4. BuildingModalNew (~2 часа)
5. RouteViewerModal (~2 часа)
6. Forms (AddReviewModal, etc.) (~3 часа)

**Итого:** ~30-40 компонентов для обновления

---

#### 2.5 Language Switcher (переключатель языка)
**Время:** 2 часа

**Файл:** `src/components/LanguageSwitcher.tsx`

```typescript
'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { localeNames } from '@/i18n/config'
import type { Locale } from '@/i18n/config'

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    // Replace locale in pathname
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <div className="flex items-center space-x-2">
      {(['ru', 'en'] as const).map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-3 py-1 rounded ${
            locale === loc
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  )
}
```

**Разместить:**
- В Header (правый верхний угол)
- В Footer (дополнительно)
- В настройках профиля (сохранять предпочтение)

---

### 🎯 Этап 3: Переводы контента из БД (4-5 дней)

**Цель:** Система автоперевода и хранения переводов контента

#### 3.1 Сервис перевода
**Время:** 4-5 часов

**Файл:** `src/lib/translation-service.ts`

```typescript
import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export type TranslationMethod = 'google' | 'deepl' | 'gpt4' | 'manual'

export interface TranslateOptions {
  entityType: 'building' | 'route' | 'blog_post' | 'news_post' | 'review'
  entityId: string
  fieldName: string
  originalText: string
  sourceLang: string
  targetLang: string
  method?: TranslationMethod
}

export async function translateAndStore(options: TranslateOptions): Promise<string> {
  const {
    entityType,
    entityId,
    fieldName,
    originalText,
    sourceLang,
    targetLang,
    method = 'google'
  } = options

  const supabase = createClient()

  // 1. Проверяем кэш (уже есть перевод?)
  const { data: existing } = await supabase
    .from('content_translations')
    .select('translated_text')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('field_name', fieldName)
    .eq('target_lang', targetLang)
    .single()

  if (existing) {
    logger.info('Translation cache hit', { entityType, entityId, fieldName })
    return existing.translated_text
  }

  // 2. Выполняем перевод
  logger.info('Translating content', { entityType, entityId, fieldName, method })

  const translatedText = await performTranslation(
    originalText,
    sourceLang,
    targetLang,
    method
  )

  // 3. Сохраняем в БД
  await supabase.from('content_translations').insert({
    entity_type: entityType,
    entity_id: entityId,
    field_name: fieldName,
    source_lang: sourceLang,
    target_lang: targetLang,
    original_text: originalText,
    translated_text: translatedText,
    translation_method: method,
    is_approved: false  // Требует модерации
  })

  logger.info('Translation stored', { entityType, entityId, fieldName })

  return translatedText
}

async function performTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  method: TranslationMethod
): Promise<string> {
  try {
    switch (method) {
      case 'google':
        return await translateWithGoogle(text, sourceLang, targetLang)
      case 'deepl':
        return await translateWithDeepL(text, sourceLang, targetLang)
      case 'gpt4':
        return await translateWithGPT4(text, sourceLang, targetLang)
      case 'manual':
        return text // Placeholder для ручного перевода
      default:
        throw new Error(`Unknown translation method: ${method}`)
    }
  } catch (error) {
    logger.error('Translation failed', error as Error, { text: text.substring(0, 100) })
    throw error
  }
}

// Google Translate API
async function translateWithGoogle(text: string, from: string, to: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY not configured')
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: 'text'
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.translations[0].translatedText
}

// DeepL API
async function translateWithDeepL(text: string, from: string, to: string): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY

  if (!apiKey) {
    throw new Error('DEEPL_API_KEY not configured')
  }

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: [text],
      source_lang: from.toUpperCase(),
      target_lang: to.toUpperCase()
    })
  })

  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.translations[0].text
}

// OpenAI GPT-4
async function translateWithGPT4(text: string, from: string, to: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in architectural content.
Translate from ${from} to ${to}. Preserve technical terms, proper nouns, and formatting.
Maintain the tone and style of the original text.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
```

**Объяснение:**
- Три метода перевода: Google (дешевле), DeepL (качественнее), GPT-4 (лучше для длинных текстов)
- Кэширование: перевод делается ОДИН РАЗ, потом берется из БД
- Логирование через наш logger
- Error handling для всех API

---

#### 3.2 Получение переводов
**Время:** 2 часа

**Файл:** `src/lib/get-translated-content.ts`

```typescript
import { createClient } from '@/lib/supabase'

export async function getTranslatedContent(
  entityType: string,
  entityId: string,
  fieldName: string,
  targetLang: string,
  originalText: string
): Promise<string> {
  // Если русский (оригинал), возвращаем как есть
  if (targetLang === 'ru') {
    return originalText
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('content_translations')
    .select('translated_text')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('field_name', fieldName)
    .eq('target_lang', targetLang)
    .eq('is_approved', true)  // Только утверждённые переводы
    .single()

  if (error || !data) {
    // Если перевода нет, возвращаем оригинал
    return originalText
  }

  return data.translated_text
}

// Batch версия для оптимизации
export async function getBatchTranslatedContent(
  entityType: string,
  entityIds: string[],
  targetLang: string
): Promise<Map<string, Record<string, string>>> {
  if (targetLang === 'ru') {
    return new Map()
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('content_translations')
    .select('entity_id, field_name, translated_text')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .eq('target_lang', targetLang)
    .eq('is_approved', true)

  if (error || !data) {
    return new Map()
  }

  // Группируем по entity_id
  const result = new Map<string, Record<string, string>>()

  data.forEach(translation => {
    if (!result.has(translation.entity_id)) {
      result.set(translation.entity_id, {})
    }
    result.get(translation.entity_id)![translation.field_name] = translation.translated_text
  })

  return result
}
```

**Объяснение:**
- Простая функция: если перевод есть → возвращаем, если нет → оригинал
- Batch версия для списков (например, список зданий)
- Только утверждённые переводы (`is_approved = true`)

---

#### 3.3 React Hook для переводов
**Время:** 2 часа

**Файл:** `src/hooks/useContentTranslation.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { getTranslatedContent } from '@/lib/get-translated-content'

export function useContentTranslation(
  entityType: string,
  entityId: string,
  fields: Record<string, string>
) {
  const locale = useLocale()
  const [translatedFields, setTranslatedFields] = useState(fields)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (locale === 'ru') {
      // Русский - показываем оригинал
      setTranslatedFields(fields)
      return
    }

    async function loadTranslations() {
      setLoading(true)

      const translations: Record<string, string> = {}

      for (const [fieldName, originalText] of Object.entries(fields)) {
        const translated = await getTranslatedContent(
          entityType,
          entityId,
          fieldName,
          locale,
          originalText
        )
        translations[fieldName] = translated
      }

      setTranslatedFields(translations)
      setLoading(false)
    }

    loadTranslations()
  }, [locale, entityId, entityType])

  return { ...translatedFields, loading }
}
```

**Использование:**

```typescript
'use client'

import { useContentTranslation } from '@/hooks/useContentTranslation'

export default function BuildingCard({ building }: { building: Building }) {
  const { name, description, loading } = useContentTranslation(
    'building',
    building.id,
    {
      name: building.name,
      description: building.description
    }
  )

  if (loading) {
    return <div>Loading translation...</div>
  }

  return (
    <div>
      <h2>{name}</h2>
      <p>{description}</p>
    </div>
  )
}
```

---

#### 3.4 Админ-панель переводов
**Время:** 8-10 часов

**Файл:** `src/app/[locale]/admin/translations/page.tsx`

Функционал:
1. **Просмотр всех переводов** - таблица с фильтрами
2. **Утверждение переводов** - кнопка approve/reject
3. **Редактирование переводов** - inline edit
4. **Массовый перевод** - кнопка "Translate all buildings"
5. **Статистика** - сколько переведено, сколько ждёт модерации

**Примерный UI:**

```typescript
export default async function TranslationsAdminPage() {
  const supabase = createClient()

  const { data: translations } = await supabase
    .from('content_translations')
    .select('*')
    .eq('is_approved', false)
    .order('translated_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Управление переводами</h1>

      {/* Фильтры */}
      <div className="flex gap-4 mb-6">
        <select className="px-4 py-2 border rounded">
          <option value="">Все типы</option>
          <option value="building">Здания</option>
          <option value="route">Маршруты</option>
          <option value="blog_post">Блог</option>
        </select>

        <select className="px-4 py-2 border rounded">
          <option value="pending">Ожидают проверки</option>
          <option value="approved">Утверждены</option>
        </select>

        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Массовый перевод
        </button>
      </div>

      {/* Таблица */}
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th>Тип</th>
            <th>Поле</th>
            <th>Оригинал</th>
            <th>Перевод</th>
            <th>Метод</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {translations?.map(t => (
            <tr key={t.id}>
              <td>{t.entity_type}</td>
              <td>{t.field_name}</td>
              <td className="max-w-xs truncate">{t.original_text}</td>
              <td className="max-w-xs truncate">{t.translated_text}</td>
              <td>{t.translation_method}</td>
              <td>
                <button className="text-green-600">✓ Approve</button>
                <button className="text-red-600 ml-2">✗ Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

### 🎯 Этап 4: Тестирование (2-3 дня)

#### 4.1 Unit тесты
**Время:** 4 hours

Тесты для:
- `translation-service.ts`
- `get-translated-content.ts`
- `useContentTranslation` hook

#### 4.2 Integration тесты
**Время:** 4 часа

Тесты для:
- Переключение языка в UI
- Загрузка переводов из БД
- Создание новых переводов

#### 4.3 Manual тестирование
**Время:** 1 день

Проверить:
- [ ] Все страницы на RU
- [ ] Все страницы на EN
- [ ] Language Switcher работает
- [ ] Переводы контента загружаются
- [ ] Админ-панель переводов
- [ ] Mobile версия
- [ ] SEO (hreflang tags)

---

## 📊 Оценка времени и ресурсов

### Временная шкала

| Этап | Описание | Время | Кумулятивно |
|------|----------|-------|-------------|
| **Этап 1** | Подготовка и настройка | 2-3 дня | 2-3 дня |
| **Этап 2** | UI переводы (next-intl) | 3-4 дня | 5-7 дней |
| **Этап 3** | Переводы контента (БД) | 4-5 дней | 9-12 дней |
| **Этап 4** | Тестирование | 2-3 дня | 11-15 дней |
| **Буфер** | Непредвиденные задачи | 2-3 дня | **13-18 дней** |

**Итого:** 2.5-3.5 недели

---

### Стоимость API (месячно)

#### Вариант 1: Только Google Translate (минимум)
- **Google Translate API:** ~$20-40/мес
- **Итого:** $20-40/мес

#### Вариант 2: Google + DeepL (оптимально)
- **Google Translate API:** ~$20/мес (для коротких текстов)
- **DeepL API:** ~$20/мес (для важных текстов)
- **Итого:** $40/мес

#### Вариант 3: Полный (Google + DeepL + GPT-4)
- **Google Translate:** ~$20/мес
- **DeepL:** ~$20/мес
- **OpenAI GPT-4:** ~$50-100/мес (для блогов)
- **Итого:** $90-140/мес

**Рекомендация для старта:** Вариант 1 (только Google)

---

## 🎯 Приоритизация контента для перевода

### Фаза 1: Критичный контент (первая неделя после запуска)
1. **UI тексты** - 100% (через next-intl)
2. **Landing page** - описания, призывы к действию
3. **Топ-20 зданий** - самые популярные
4. **Топ-10 маршрутов** - featured routes

### Фаза 2: Основной контент (1-2 месяца)
1. Все здания (~200-300 шт)
2. Все маршруты (~50-100 шт)
3. Блог посты (новые автоматически)

### Фаза 3: Дополнительный контент (2-3 месяца)
1. Отзывы пользователей
2. Новости
3. Подкасты

---

## ✅ Чек-лист готовности

### Перед началом:
- [ ] Прочитал этот план
- [ ] Понятна архитектура
- [ ] Выбрал метод перевода (Google/DeepL/GPT-4)
- [ ] Готов API key для выбранного метода
- [ ] Согласован бюджет ($20-140/мес)

### После Этапа 1:
- [ ] next-intl установлен
- [ ] Миграция БД применена
- [ ] Структура папок создана

### После Этапа 2:
- [ ] UI переведён на английский
- [ ] Language Switcher работает
- [ ] Все страницы доступны на /ru и /en

### После Этапа 3:
- [ ] Сервис перевода работает
- [ ] Переводы сохраняются в БД
- [ ] Админ-панель переводов готова

### После Этапа 4:
- [ ] Все тесты пройдены
- [ ] Manual проверка завершена
- [ ] SEO настроен (hreflang)
- [ ] **ГОТОВО К ЗАПУСКУ** 🚀

---

## 🔗 Дополнительные ресурсы

### Документация:
- **next-intl:** https://next-intl-docs.vercel.app/
- **Google Translate API:** https://cloud.google.com/translate/docs
- **DeepL API:** https://www.deepl.com/docs-api
- **OpenAI GPT-4:** https://platform.openai.com/docs

### Инструменты:
- **i18n Ally (VS Code):** Расширение для работы с переводами
- **JSON Translator:** Онлайн инструмент для batch перевода JSON

---

## ❓ FAQ

### Q: Можно ли сделать быстрее?
**A:** Да, если сократить scope:
- Только UI переводы (без контента) - 1 неделя
- UI + ручной перевод топ-20 зданий - 1.5 недели

### Q: Нужно ли сразу делать автоперевод?
**A:** Нет, можно начать с ручных переводов:
1. Перевести UI (next-intl)
2. Вручную перевести топ-20 зданий
3. Позже добавить автоперевод

### Q: Можно ли обойтись без платных API?
**A:** Да, но качество будет ниже:
- Использовать бесплатные лимиты Google Translate
- Переводить вручную через ChatGPT
- Краудсорсинг (пользователи помогают переводить)

### Q: Когда лучше запускать i18n?
**A:** **Рекомендация:** Через 1-2 месяца после запуска
- Сначала запуститесь на русском
- Соберите feedback
- Потом добавьте английский
- Это снизит риски и даст время на качественный перевод

---

**Подготовил:** Claude (Anthropic)
**Дата:** 1 декабря 2025
**Статус:** Ready to implement
**Следующий шаг:** Обсудить приоритеты и scope
