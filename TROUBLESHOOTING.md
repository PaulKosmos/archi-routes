# Troubleshooting Guide

Документация известных проблем и их решений для проекта Archi-Routes.

---

## Supabase Auth Deadlock в Production (Декабрь 2024)

### 🔴 Проблема

**Симптомы:**
- Страницы `/blog`, `/news`, `/podcast` зависают в loading state после авторизации пользователя
- В консоли браузера появляются ошибки:
  ```
  ❌ Auth: Error in getCurrentUser: Error: Auth check timeout
  ❌ Blog posts query timeout: Error: Blog posts query timeout
  ```
- Проблема возникает **ТОЛЬКО в production** (Vercel), локально всё работает
- Проблема возникает **ТОЛЬКО для авторизованных пользователей**, без авторизации всё работает
- `supabase.auth.getUser()` и `supabase.auth.getSession()` зависают на 5-10+ секунд
- Database queries к Supabase также зависают
- Очистка cookies помогает временно, но проблема возвращается

### 🔍 Корневая причина

**Использование `async/await` внутри `onAuthStateChange` callback вызывает deadlock всех Supabase запросов.**

```typescript
// ❌ НЕПРАВИЛЬНО - вызывает deadlock
supabase.auth.onAuthStateChange(
  async (event, session) => {
    const { data } = await supabase.from('profiles').select()  // Зависает здесь!
  }
)
```

**Почему это происходит:**
1. `async` функция внутри `onAuthStateChange` активирует внутренний lock механизм Supabase
2. Любой `await` внутри callback пытается сделать Supabase запрос
3. Но lock уже активен, поэтому запрос блокируется
4. Это блокирует **ВСЕ** последующие Supabase запросы в приложении
5. Результат: полный deadlock всех auth и database операций

### ✅ Решение

**1. Убрать `async` из `onAuthStateChange` callback:**

```typescript
// ✅ ПРАВИЛЬНО - используем синхронный callback
supabase.auth.onAuthStateChange(
  (event, session) => {  // Без async!
    if (event === 'SIGNED_IN' && session?.user) {
      // Используем .then() вместо await
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profile }) => {
          // Обрабатываем результат
          setAuthState({
            user: session.user,
            profile: profile,
            loading: false,
            initialized: true
          })
        })
        .catch(err => {
          console.error('Error loading profile:', err)
        })
    }
  }
)
```

**2. Использовать `getSession()` вместо `getUser()` для начальной проверки:**

```typescript
// ✅ ПРАВИЛЬНО - getSession() читает из localStorage
const { data: { session } } = await supabase.auth.getSession()

// ❌ ИЗБЕГАТЬ в onAuthStateChange - getUser() делает network запрос
const { data: { user } } = await supabase.auth.getUser()
```

**Ключевые моменты:**
- `getSession()` - читает сессию из localStorage (быстро, без сети)
- `getUser()` - делает запрос к Supabase API (медленно, может зависнуть)
- В `onAuthStateChange` НИКОГДА не используйте `async/await`
- Используйте `.then()/.catch()` для асинхронных операций внутри callback

### 📝 Исправленный код

**Файл: `src/hooks/useAuth.ts`**

```typescript
useEffect(() => {
  const getCurrentUser = async () => {
    try {
      // ✅ Используем getSession() для начальной проверки
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true
        })
        return
      }

      if (session?.user) {
        // Загружаем профиль
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setAuthState({
          user: session.user,
          profile: profile || null,
          loading: false,
          initialized: true
        })
      }
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        initialized: true
      })
    }
  }

  getCurrentUser()

  // ✅ КРИТИЧЕСКИ ВАЖНО: НЕ используем async!
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {  // Без async!
      if (event === 'SIGNED_IN' && session?.user) {
        // Используем .then() вместо await
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            setAuthState({
              user: session.user,
              profile: profile || null,
              loading: false,
              initialized: true
            })
          })
          .catch(err => {
            console.error('Error loading profile:', err)
            setAuthState({
              user: session.user,
              profile: null,
              loading: false,
              initialized: true
            })
          })
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true
        })
      }
    }
  )

  return () => {
    subscription.unsubscribe()
  }
}, [supabase])
```

### 🔧 Как диагностировать эту проблему

**Признаки deadlock:**
1. `supabase.auth.getSession()` или `getUser()` не возвращается более 5 секунд
2. Database queries зависают после auth проверок
3. Проблема только в production, локально работает
4. Проблема только для авторизованных пользователей

**Где искать:**
```bash
# Найти все использования async в onAuthStateChange
grep -r "onAuthStateChange" src/
grep -A 5 "onAuthStateChange" src/hooks/useAuth.ts
```

**Что проверить:**
- [ ] Есть ли `async` в callback функции `onAuthStateChange`?
- [ ] Используются ли `await` внутри `onAuthStateChange`?
- [ ] Используется ли `getUser()` внутри `onAuthStateChange`?

Если на любой из этих вопросов ответ "Да" - это источник проблемы.

### 📚 Источники и ссылки

- **GitHub Issue #35754**: [Client-side supabase.auth.getUser() hangs indefinitely](https://github.com/supabase/supabase/issues/35754)
  - Детальное описание проблемы с deadlock
  - Подтверждённые решения от сообщества
  - Объяснение lock механизма Supabase

- **GitHub Issue #38238**: [Connection Timeout Issue](https://github.com/supabase/supabase/issues/38238)
  - Проблемы с timeout после периодов неактивности
  - Связанные проблемы с session refresh

- **Supabase Docs**: [Troubleshooting Next.js Auth](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV)
  - Официальная документация по troubleshooting
  - Лучшие практики для Next.js + Supabase

- **Supabase Docs**: [User Sessions](https://supabase.com/docs/guides/auth/sessions)
  - Документация по работе с сессиями
  - Различия между getSession() и getUser()

### ⚠️ Что НЕ делать

```typescript
// ❌ НЕ использовать async в onAuthStateChange
supabase.auth.onAuthStateChange(async (event, session) => {
  await something()  // Deadlock!
})

// ❌ НЕ использовать getUser() внутри onAuthStateChange
supabase.auth.onAuthStateChange((event, session) => {
  const { data: { user } } = await supabase.auth.getUser()  // Deadlock!
})

// ❌ НЕ делать Supabase запросы с await внутри callback
supabase.auth.onAuthStateChange((event, session) => {
  const profile = await supabase.from('profiles').select()  // Deadlock!
})
```

### ✅ Что делать вместо этого

```typescript
// ✅ Используйте синхронный callback
supabase.auth.onAuthStateChange((event, session) => {
  // OK
})

// ✅ Используйте .then() для асинхронных операций
supabase.auth.onAuthStateChange((event, session) => {
  supabase.from('profiles').select()
    .then(result => { /* ... */ })
    .catch(err => { /* ... */ })
})

// ✅ Используйте getSession() для начальных проверок
const { data: { session } } = await supabase.auth.getSession()
```

### 🎯 Проверочный чек-лист после исправления

После применения исправления проверьте:

- [ ] Страница `/blog` загружается для авторизованных пользователей
- [ ] Страница `/news` загружается для авторизованных пользователей
- [ ] В консоли НЕТ ошибок "Auth check timeout"
- [ ] В консоли НЕТ ошибок "query timeout"
- [ ] Логин/логаут работают корректно
- [ ] Profile загружается после логина
- [ ] Проблема НЕ возвращается после нескольких минут использования

### 📊 Дата исправления

**Когда:** 15 декабря 2024
**Коммиты:**
- `d108555` - CRITICAL FIX: Remove async from onAuthStateChange to prevent deadlock
- `43a148c` - REVERT: Fix middleware - only run on protected routes
- `39f0851` - Critical fix: Switch from getSession() to getUser() to resolve timeouts (частично неверное решение, откатили)

**Время на решение:** ~6 часов debugging
**Затронутые файлы:**
- `src/hooks/useAuth.ts`
- `src/app/blog/page.tsx`
- `src/middleware.ts`

---

## Другие известные проблемы

_(будут добавлены по мере возникновения)_

---

**Последнее обновление:** 15 декабря 2024
