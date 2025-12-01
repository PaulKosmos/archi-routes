# Sentry Setup Guide

Инструкция по настройке Sentry для мониторинга ошибок в production.

## 1. Создание аккаунта Sentry

### Вариант 1: Бесплатный план (рекомендуется для старта)

1. Перейти на https://sentry.io
2. Нажать "Get Started"
3. Зарегистрироваться (можно через GitHub)
4. Выбрать Free план:
   - ✅ 5,000 errors/month
   - ✅ 10,000 performance units/month
   - ✅ 1 пользователь
   - ✅ 30 дней хранения событий

### Вариант 2: Team план ($26/мес)

Если нужно больше events и членов команды:
- 50,000 errors/month
- 100,000 performance units/month
- 90 дней retention
- До 10 пользователей

---

## 2. Создание проекта в Sentry

1. **После регистрации** выбрать "Create Project"
2. **Платформа:** Next.js
3. **Alert frequency:** Default
4. **Название проекта:** archi-routes
5. Нажать "Create Project"

### Копирование DSN

После создания проекта вы увидите экран с инструкциями. Скопируйте **DSN** (выглядит как):

```
https://abc123def456ghi789@o1234567.ingest.sentry.io/8901234
```

---

## 3. Установка @sentry/nextjs

```bash
npm install --save @sentry/nextjs
```

---

## 4. Настройка переменных окружения

### Development (.env.local)

Создать файл `.env.local` (если не существует):

```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456ghi789@o1234567.ingest.sentry.io/8901234
```

### Production (Vercel Dashboard)

В Vercel Dashboard → Settings → Environment Variables:

- **Name:** `NEXT_PUBLIC_SENTRY_DSN`
- **Value:** ваш DSN
- **Environment:** Production, Preview, Development

---

## 5. Раскомментировать код в src/lib/sentry.ts

Открыть `src/lib/sentry.ts` и:

1. **Раскомментировать импорт:**
   ```typescript
   import * as Sentry from '@sentry/nextjs'
   ```

2. **Раскомментировать функцию `initSentry()`** и все экспорты

3. **Удалить или закомментировать** временные stubs внизу файла

---

## 6. Инициализация Sentry в приложении

### Вариант 1: В Root Layout (рекомендуется)

Открыть `src/app/layout.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { initSentry } from '@/lib/sentry'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry()
  }, [])

  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
```

### Вариант 2: В отдельном провайдере

Создать `src/components/SentryProvider.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { initSentry } from '@/lib/sentry'

export default function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry()
  }, [])

  return <>{children}</>
}
```

Затем обернуть приложение:

```typescript
// src/app/layout.tsx
import SentryProvider from '@/components/SentryProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <SentryProvider>{children}</SentryProvider>
      </body>
    </html>
  )
}
```

---

## 7. Использование Sentry

### Автоматический захват ошибок

Все необработанные ошибки автоматически отправляются в Sentry:

```typescript
// Эта ошибка будет автоматически поймана
throw new Error('Something went wrong!')
```

### Ручной захват ошибок

```typescript
import { captureException } from '@/lib/sentry'

try {
  await dangerousOperation()
} catch (error) {
  captureException(error as Error, {
    userId: user?.id,
    operation: 'dangerousOperation'
  })
  toast.error('Операция не удалась')
}
```

### Установка контекста пользователя

После логина:

```typescript
import { setUser } from '@/lib/sentry'

// После успешной аутентификации
setUser({
  id: user.id,
  email: user.email,
  username: user.display_name
})
```

После логаута:

```typescript
import { setUser } from '@/lib/sentry'

setUser(null)
```

### Добавление breadcrumbs (хлебные крошки)

Для отслеживания последовательности действий перед ошибкой:

```typescript
import { addBreadcrumb } from '@/lib/sentry'

addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to building page',
  level: 'info',
  data: {
    buildingId: 'abc123',
    fromPage: '/map'
  }
})
```

---

## 8. Настройка Source Maps для Vercel

Для того, чтобы видеть реальные имена файлов и строк в Sentry:

### Шаг 1: Создать Auth Token в Sentry

1. Sentry Dashboard → Settings → Account → API → Auth Tokens
2. Нажать "Create New Token"
3. **Scopes:** `project:releases`, `project:write`
4. Скопировать токен

### Шаг 2: Добавить в Vercel Environment Variables

- **Name:** `SENTRY_AUTH_TOKEN`
- **Value:** ваш токен
- **Environment:** Production

### Шаг 3: Создать sentry.properties

```bash
# sentry.properties
defaults.url=https://sentry.io/
defaults.org=your-organization-slug
defaults.project=archi-routes
```

### Шаг 4: Обновить next.config.ts

```typescript
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  // ... ваша конфигурация
}

export default withSentryConfig(
  nextConfig,
  {
    // Sentry build time configuration
    silent: true,
    org: "your-organization-slug",
    project: "archi-routes",
  },
  {
    // Sentry webpack plugin options
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
  }
)
```

---

## 9. Тестирование Sentry

### Создать тестовую ошибку

Создать страницу `src/app/sentry-test/page.tsx`:

```typescript
'use client'

import { captureException, captureMessage } from '@/lib/sentry'

export default function SentryTestPage() {
  const testError = () => {
    try {
      throw new Error('Test error from Archi-Routes')
    } catch (error) {
      captureException(error as Error, {
        testContext: 'manual test',
        timestamp: Date.now()
      })
    }
  }

  const testMessage = () => {
    captureMessage('Test message from Archi-Routes', 'info')
  }

  const testUnhandled = () => {
    throw new Error('Unhandled test error')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sentry Test Page</h1>
      <div className="space-y-4">
        <button
          onClick={testError}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Handled Error
        </button>
        <button
          onClick={testMessage}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Test Message
        </button>
        <button
          onClick={testUnhandled}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Test Unhandled Error
        </button>
      </div>
    </div>
  )
}
```

### Проверить в Sentry Dashboard

1. Перейти на `/sentry-test`
2. Нажать кнопки
3. Проверить Sentry Dashboard → Issues
4. Через 1-2 минуты должны появиться события

---

## 10. Best Practices

### Фильтрация чувствительных данных

Убедитесь, что `beforeSend` хук в `sentry.ts` удаляет:
- ✅ Cookies
- ✅ Authorization headers
- ✅ Пароли
- ✅ Токены

### Игнорирование неважных ошибок

В `ignoreErrors` добавьте паттерны ошибок, которые не нужно отслеживать:
- Browser extensions errors
- Network errors (опционально)
- Third-party script errors

### Использование Release tracking

Для связи ошибок с конкретными версиями:

```typescript
// В sentry.ts добавить
release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development'
```

---

## 11. Мониторинг

### Alerts

Настроить алерты в Sentry:
1. Project Settings → Alerts
2. Create Alert Rule
3. Условие: например, "When an event is seen more than 10 times in 1 hour"
4. Действие: Email или Slack уведомление

### Performance Monitoring

Для мониторинга производительности увеличить `tracesSampleRate`:

```typescript
// В sentry.ts
tracesSampleRate: 0.1, // 10% для старта
// Позже можно увеличить до 0.5 (50%)
```

---

## 12. Стоимость

### Free Plan (достаточно для старта)
- **Цена:** $0/месяц
- **Events:** 5,000 errors/мес
- **Performance:** 10,000 units/мес
- **Retention:** 30 дней

### Team Plan (при росте)
- **Цена:** $26/месяц
- **Events:** 50,000 errors/мес
- **Performance:** 100,000 units/мес
- **Retention:** 90 дней

---

## Итоговый чеклист

- [ ] Создать аккаунт на sentry.io
- [ ] Создать проект для Next.js
- [ ] Скопировать DSN
- [ ] Установить `@sentry/nextjs`
- [ ] Добавить `NEXT_PUBLIC_SENTRY_DSN` в .env.local
- [ ] Раскомментировать код в `src/lib/sentry.ts`
- [ ] Инициализировать Sentry в root layout
- [ ] Протестировать на `/sentry-test`
- [ ] Настроить source maps для production
- [ ] Настроить alerts

---

**Подготовил:** Claude (Anthropic)
**Дата:** 1 декабря 2025
**Статус:** Ready to use after domain setup
