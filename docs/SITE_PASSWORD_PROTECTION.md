# Защита сайта паролем

Система защиты всего сайта паролем для ограничения доступа во время разработки или тестирования.

## Возможности

- ✅ Защита всего сайта одним паролем
- ✅ Красивая страница входа
- ✅ Безопасное хранение пароля (SHA-256 хеш)
- ✅ Cookie-based авторизация (7 дней)
- ✅ Легко включить/выключить
- ✅ Работает на localhost и Vercel

## Быстрый старт

### 1. Включить защиту

Откройте `.env.local` и измените:

```env
NEXT_PUBLIC_SITE_PASSWORD_ENABLED=true
```

### 2. Использовать пароль по умолчанию

**Пароль:** `ArchiRoutes2024!`

Этот пароль уже настроен в `.env.local`.

### 3. Перезапустить сервер

```bash
npm run dev
```

Теперь при попытке открыть любую страницу сайта вы увидите форму ввода пароля.

## Изменить пароль

### Шаг 1: Сгенерировать новый хеш

```bash
node scripts/generate-password-hash.js
```

Введите новый пароль когда скрипт спросит.

### Шаг 2: Обновить .env.local

Скопируйте сгенерированный хеш и замените значение `SITE_PASSWORD_HASH` в `.env.local`.

### Шаг 3: Перезапустить

```bash
npm run dev
```

## Отключить защиту

В `.env.local` установите:

```env
NEXT_PUBLIC_SITE_PASSWORD_ENABLED=false
```

## Использование на Vercel

### При деплое на Vercel:

1. Откройте настройки проекта в Vercel Dashboard
2. Перейдите в Settings → Environment Variables
3. Добавьте две переменные:

```
NEXT_PUBLIC_SITE_PASSWORD_ENABLED=true
SITE_PASSWORD_HASH=<ваш хеш пароля>
```

4. Redeploy проекта

### Важно для production:

⚠️ **Используйте надежный пароль!**

Рекомендуется:
- Минимум 12 символов
- Комбинация букв, цифр и символов
- Не используйте пароль из этой документации

### Пример сильного пароля:

```bash
node scripts/generate-password-hash.js
# Введите: MyS3cur3P@ssw0rd!2024
```

## Как это работает

1. **Middleware** проверяет каждый запрос
2. Если защита включена и нет cookie → редирект на `/site-password`
3. Пользователь вводит пароль
4. API проверяет хеш пароля
5. При успехе устанавливается cookie на 7 дней
6. Пользователь редиректится на запрошенную страницу

## Безопасность

✅ Пароль хешируется с SHA-256
✅ Cookie только HTTP (не доступна JavaScript)
✅ Secure cookie в production
✅ SameSite strict
✅ Пароль не хранится в открытом виде

## Файлы системы

```
src/
├── middleware.ts                    # Проверка пароля
├── app/
│   ├── site-password/
│   │   └── page.tsx                 # Страница ввода пароля
│   └── api/
│       └── site-password/
│           └── route.ts             # API проверки пароля
scripts/
└── generate-password-hash.js        # Генератор хеша
```

## Troubleshooting

### Забыл пароль

1. Запустите `node scripts/generate-password-hash.js`
2. Введите новый пароль
3. Обновите `SITE_PASSWORD_HASH` в `.env.local`
4. Перезапустите сервер

### Cookie не сохраняется

Проверьте что в production используется HTTPS.

### Защита не работает

1. Проверьте что `NEXT_PUBLIC_SITE_PASSWORD_ENABLED=true`
2. Проверьте что переменные есть в Vercel dashboard
3. Сделайте redeploy после добавления переменных

## Полезные команды

```bash
# Включить защиту локально
# Отредактируйте .env.local: NEXT_PUBLIC_SITE_PASSWORD_ENABLED=true

# Сгенерировать новый хеш пароля
node scripts/generate-password-hash.js

# Перезапустить dev сервер
npm run dev

# Тестовый билд
npm run build
```
