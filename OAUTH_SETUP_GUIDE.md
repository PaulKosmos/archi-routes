# Руководство по настройке OAuth авторизации

**Дата создания:** 27 ноября 2025
**Базовый документ:** LAUNCH_READINESS_REPORT.md раздел 1.7
**Приоритет:** ВЫСОКИЙ (для удобства пользователей)

---

## Часть 0: Подготовка к запуску (Domain & Email)

### Важно! Сделайте это ПЕРЕД настройкой OAuth

Для полноценной работы OAuth и профессионального имиджа проекта вам необходимо:

### 0.1. Покупка домена

**Рекомендуемые регистраторы доменов:**

1. **Namecheap** (рекомендуется)
   - Доступные цены (.com $8-15/год, .ru $5-10/год)
   - Бесплатный WhoisGuard (скрывает личные данные)
   - Простой интерфейс
   - Хорошая поддержка
   - Ссылка: https://www.namecheap.com

2. **Cloudflare Registrar**
   - Минимальная цена (по себестоимости + $0)
   - Бесплатный SSL
   - Отличный CDN
   - Но требует перенос, нельзя купить новый домен
   - Ссылка: https://www.cloudflare.com/products/registrar/

3. **Google Domains** → **Squarespace Domains**
   - Простая интеграция с Google Services
   - Цена: $12-15/год для .com
   - Ссылка: https://domains.google (теперь https://domains.squarespace.com)

4. **Reg.ru** (для .ru доменов)
   - Хороший выбор для российских доменов
   - Цена: 200-400₽/год
   - Ссылка: https://www.reg.ru

**Рекомендуемые доменные зоны для Archi-Routes:**
- `.com` - международный, профессиональный ($8-15/год)
- `.ru` - российская аудитория ($5-10/год или 200-400₽/год)
- `.io` - технологический, стартап ($30-50/год)
- `.app` - современный, подходит для веб-приложений ($15-20/год)

**Примеры доменов:**
- `archiroutes.com` ⭐ (рекомендуется)
- `archi-routes.com`
- `archiroutes.ru`
- `archiroutes.io`
- `archiroutes.app`

**Что делать после покупки:**
1. Настроить DNS на Vercel/Netlify (где хостится проект)
2. Настроить SSL сертификат (обычно бесплатно через Let's Encrypt)
3. Настроить редирект с www на без www (или наоборот)

**Важно:** Не используйте домен с дефисами в названии для OAuth (Google не рекомендует).

---

### 0.2. Создание корпоративной почты

**Вариант 1: Google Workspace (рекомендуется)**

**Почему Google Workspace:**
- Профессиональный вид (`support@archiroutes.com` вместо `archiroutes@gmail.com`)
- Лучшая интеграция с Google OAuth
- Google доверяет доменам с корпоративной почтой
- Удобный интерфейс Gmail

**Цена:** $6-12/месяц за пользователя (есть 14-дневный trial)

**Как настроить:**
1. Перейдите на https://workspace.google.com
2. Нажмите "Get Started"
3. Введите домен: `archiroutes.com`
4. Создайте учетную запись администратора
5. Подтвердите владение доменом:
   - Добавьте TXT запись в DNS
   - Или загрузите HTML файл на сайт
6. Настройте MX записи для почты:
   ```
   Priority  Hostname
   1         ASPMX.L.GOOGLE.COM
   5         ALT1.ASPMX.L.GOOGLE.COM
   5         ALT2.ASPMX.L.GOOGLE.COM
   10        ALT3.ASPMX.L.GOOGLE.COM
   10        ALT4.ASPMX.L.GOOGLE.COM
   ```
7. Создайте почтовые ящики:
   - `admin@archiroutes.com` - для администрирования
   - `support@archiroutes.com` - для пользователей
   - `noreply@archiroutes.com` - для автоматических писем
   - `team@archiroutes.com` - для команды

**Вариант 2: Yandex 360 для Бизнеса (бесплатно)**

**Почему Yandex:**
- Бесплатно до 5 пользователей
- Русскоязычная поддержка
- Хорошо для российской аудитории

**Как настроить:**
1. Перейдите на https://360.yandex.ru
2. Зарегистрируйтесь с доменом
3. Подтвердите домен через DNS
4. Настройте MX записи:
   ```
   Priority  Hostname
   10        mx.yandex.net
   ```
5. Создайте почтовые ящики

**Вариант 3: Mailgun / SendGrid (для автоматических писем)**

Если нужна только отправка писем (без чтения):
- **Mailgun**: Бесплатно 5000 писем/месяц - https://www.mailgun.com
- **SendGrid**: Бесплатно 100 писем/день - https://sendgrid.com
- **AWS SES**: $0.10 за 1000 писем - https://aws.amazon.com/ses/

**Рекомендуемая структура почтовых ящиков:**
```
admin@archiroutes.com         - Главный администратор
support@archiroutes.com       - Поддержка пользователей (используйте в OAuth)
noreply@archiroutes.com       - Автоматические письма (Supabase Auth)
team@archiroutes.com          - Команда разработки
hello@archiroutes.com         - Общие вопросы
partners@archiroutes.com      - Партнеры и коллаборации
press@archiroutes.com         - СМИ и пресса
```

---

### 0.3. Настройка Supabase Email

После создания корпоративной почты, настройте Supabase:

1. **Откройте Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/jkozshkubprsvkayfvhf
   ```

2. **Настройте SMTP:**
   ```
   Settings → Authentication → Email

   Sender email: noreply@archiroutes.com
   Sender name: Archi-Routes

   Enable Custom SMTP: ✅ ВКЛ

   SMTP настройки (для Google Workspace):
   Host: smtp.gmail.com
   Port: 587
   Username: noreply@archiroutes.com
   Password: [App Password - создайте в Google Account]

   SMTP настройки (для Yandex):
   Host: smtp.yandex.ru
   Port: 587
   Username: noreply@archiroutes.com
   Password: [ваш пароль]
   ```

3. **Создайте App Password для Gmail:**
   - Перейдите на https://myaccount.google.com/security
   - Включите 2-Step Verification
   - Перейдите в App Passwords
   - Создайте пароль для "Mail"
   - Используйте этот пароль в Supabase SMTP

4. **Настройте email templates:**
   ```
   Settings → Authentication → Email Templates

   Обновите шаблоны для:
   - Confirm signup
   - Reset password
   - Magic link
   - Change email address
   ```

---

### 0.4. Обновление OAuth redirect URLs

После покупки домена, обновите redirect URLs во всех сервисах:

**Google Cloud Console:**
```
Authorized JavaScript origins:
- https://archiroutes.com
- https://www.archiroutes.com

Authorized redirect URIs:
- https://archiroutes.com/auth/callback
- https://jkozshkubprsvkayfvhf.supabase.co/auth/v1/callback
```

**GitHub OAuth App:**
```
Homepage URL: https://archiroutes.com
Authorization callback URL: https://jkozshkubprsvkayfvhf.supabase.co/auth/v1/callback
```

**Supabase Dashboard:**
```
Authentication → URL Configuration

Site URL: https://archiroutes.com

Redirect URLs:
- https://archiroutes.com/**
- https://www.archiroutes.com/**
```

---

### 0.5. Бюджет на запуск

**Минимальный бюджет (первый год):**
- Домен .com: $12/год
- Yandex 360 (бесплатно): $0
- **Итого: ~$12/год** (~1000₽/год)

**Рекомендуемый бюджет (первый год):**
- Домен .com: $12/год
- Google Workspace (1 пользователь): $72/год
- Vercel Pro (если нужно): $240/год (опционально)
- Supabase Pro: $300/год (опционально, если нужно больше ресурсов)
- **Итого: ~$84-624/год**

**Оптимальный старт:**
- Купите домен на Namecheap ($12/год)
- Используйте Yandex 360 бесплатно
- Оставайтесь на Free план Supabase и Vercel
- **Затраты: $12/год** (можно начать сегодня!)

---

## Обзор OAuth авторизации

В Archi-Routes реализована OAuth авторизация через:
- ✅ **Google** (приоритет #1) - самый популярный провайдер
- ✅ **GitHub** (приоритет #2) - популярен среди технической аудитории
- 🔜 **Apple Sign In** (приоритет #3) - для iOS приложения в будущем

---

## Файлы, которые были созданы/изменены

### Созданные файлы:
1. ✅ `src/app/auth/callback/route.ts` - обработчик OAuth callback
2. ✅ `OAUTH_SETUP_GUIDE.md` - эта инструкция

### Измененные файлы:
1. ✅ `src/components/AuthModal.tsx` - добавлены кнопки Google и GitHub OAuth

---

## Часть 1: Настройка Google OAuth

### Шаг 1: Google Cloud Console

1. **Перейдите на** https://console.cloud.google.com

2. **Создайте новый проект** (или выберите существующий):
   - Нажмите на выпадающий список проектов вверху
   - Нажмите "New Project"
   - Название: `Archi-Routes`
   - Нажмите "Create"

3. **Включите Google+ API**:
   ```
   APIs & Services → Library → Поиск "Google+ API" → Enable
   ```

4. **Настройте OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen

   User Type: External
   Нажмите "Create"

   App information:
   - App name: Archi-Routes
   - User support email: [ваш email]
   - App logo: [загрузите логотип приложения]

   Developer contact information:
   - Email addresses: [ваш email]

   Нажмите "Save and Continue"

   Scopes:
   - Добавьте: email, profile, openid (они должны быть по умолчанию)
   - Нажмите "Save and Continue"

   Test users (опционально):
   - Можете пропустить или добавить тестовых пользователей
   - Нажмите "Save and Continue"
   ```

5. **Создайте OAuth 2.0 Client ID**:
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID

   Application type: Web application
   Name: Archi-Routes Web Client

   Authorized JavaScript origins:
   - http://localhost:3000 (для разработки)
   - https://archiroutes.com (для production)
   - https://www.archiroutes.com (если используете www)

   Authorized redirect URIs:
   - http://localhost:3000/auth/callback (для разработки)
   - https://jkozshkubprsvkayfvhf.supabase.co/auth/v1/callback (для Supabase)
   - https://archiroutes.com/auth/callback (для production)

   Нажмите "Create"
   ```

6. **Сохраните учетные данные**:
   ```
   После создания вы получите:
   - Client ID: 1234567890-abcdefghijklmnop.apps.googleusercontent.com
   - Client Secret: GOCSPX-xxxxxxxxxxxxxx

   ⚠️ ВАЖНО: Сохраните эти данные в безопасном месте!
   ```

### Шаг 2: Настройка Supabase Dashboard

1. **Перейдите в Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/jkozshkubprsvkayfvhf
   ```

2. **Настройте Google провайдер**:
   ```
   Authentication → Providers → Google

   Enable Google provider: ✅ ВКЛ

   Client ID (for OAuth): [вставьте Client ID из Google Cloud Console]
   Client Secret (for OAuth): [вставьте Client Secret]

   Authorized Client IDs: [оставьте пустым, если не используете]

   Skip nonce check: ❌ ВЫКЛ (для безопасности)

   Нажмите "Save"
   ```

3. **Проверьте Redirect URL в Supabase**:
   ```
   Вернитесь в: Authentication → URL Configuration

   Убедитесь, что указан:
   Site URL: https://archiroutes.com (ваш production домен)

   Redirect URLs:
   - https://archiroutes.com/**
   - http://localhost:3000/** (для разработки)
   ```

### Шаг 3: Тестирование Google OAuth

1. **Запустите dev сервер**:
   ```bash
   npm run dev
   ```

2. **Откройте приложение**:
   ```
   http://localhost:3000
   ```

3. **Попробуйте войти через Google**:
   - Нажмите "Войти"
   - Нажмите "Продолжить с Google"
   - Выберите Google аккаунт
   - Разрешите доступ к email и профилю
   - Вы должны быть перенаправлены обратно на сайт и авторизованы

4. **Проверьте профиль**:
   ```
   Откройте: http://localhost:3000/profile

   Убедитесь, что:
   - Отображается ваше имя из Google
   - Отображается аватар из Google
   - Email соответствует Google аккаунту
   ```

---

## Часть 2: Настройка GitHub OAuth

### Шаг 1: GitHub Settings

1. **Перейдите на GitHub**:
   ```
   https://github.com/settings/developers
   ```

2. **Создайте новый OAuth App**:
   ```
   OAuth Apps → New OAuth App

   Application name: Archi-Routes

   Homepage URL: https://archiroutes.com

   Application description:
   Architectural discovery and route planning platform with audio guides

   Authorization callback URL:
   https://jkozshkubprsvkayfvhf.supabase.co/auth/v1/callback

   Для разработки также можно добавить:
   http://localhost:3000/auth/callback

   Нажмите "Register application"
   ```

3. **Сохраните учетные данные**:
   ```
   После создания вы получите:
   - Client ID: Iv1.1234567890abcdef
   - Нажмите "Generate a new client secret"
   - Client Secret: 1234567890abcdef1234567890abcdef12345678

   ⚠️ ВАЖНО: Сохраните Client Secret сразу, он больше не будет показан!
   ```

### Шаг 2: Настройка Supabase Dashboard

1. **Перейдите в Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/jkozshkubprsvkayfvhf
   ```

2. **Настройте GitHub провайдер**:
   ```
   Authentication → Providers → GitHub

   Enable GitHub provider: ✅ ВКЛ

   Client ID (for OAuth): [вставьте Client ID из GitHub]
   Client Secret (for OAuth): [вставьте Client Secret]

   Нажмите "Save"
   ```

### Шаг 3: Тестирование GitHub OAuth

1. **Запустите dev сервер** (если не запущен):
   ```bash
   npm run dev
   ```

2. **Попробуйте войти через GitHub**:
   - Нажмите "Войти"
   - Нажмите "Продолжить с GitHub"
   - Авторизуйте приложение
   - Вы должны быть перенаправлены обратно на сайт

3. **Проверьте профиль**:
   ```
   Откройте: http://localhost:3000/profile

   Убедитесь, что отображаются данные из GitHub
   ```

---

## Часть 3: Переменные окружения

### Development (.env.local)

Создайте файл `.env.local` если его нет:

```env
# Supabase (уже есть)
NEXT_PUBLIC_SUPABASE_URL=https://jkozshkubprsvkayfvhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# OAuth (добавьте если нужны для дополнительной валидации)
# Обычно не требуются, так как Supabase управляет OAuth
# GOOGLE_CLIENT_ID=xxx
# GOOGLE_CLIENT_SECRET=xxx
# GITHUB_CLIENT_ID=xxx
# GITHUB_CLIENT_SECRET=xxx
```

### Production

В Vercel/Netlify/другом хостинге добавьте те же переменные окружения.

---

## Часть 4: Troubleshooting

### Проблема: "Redirect URI mismatch" (Google)

**Решение:**
1. Убедитесь, что в Google Cloud Console добавлены все URI:
   ```
   https://jkozshkubprsvkayfvhf.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   https://archiroutes.com/auth/callback
   ```

2. Проверьте точное совпадение (с/без слэша, http vs https)

### Проблема: "Invalid client" (GitHub)

**Решение:**
1. Проверьте, что Client ID и Client Secret правильно скопированы в Supabase
2. Убедитесь, что в GitHub OAuth App указан правильный callback URL:
   ```
   https://jkozshkubprsvkayfvhf.supabase.co/auth/v1/callback
   ```

### Проблема: Пользователь авторизуется, но профиль не создается

**Решение:**
1. Проверьте консоль браузера на ошибки
2. Проверьте логи в Supabase Dashboard → Logs
3. Убедитесь, что callback route работает:
   ```typescript
   // src/app/auth/callback/route.ts должен создавать профиль
   ```

### Проблема: После OAuth редирект на неправильную страницу

**Решение:**
1. Проверьте параметр `redirectTo` в `handleGoogleSignIn` и `handleGitHubSignIn`:
   ```typescript
   redirectTo: `${window.location.origin}/auth/callback`
   ```

2. В callback route проверьте, что используется правильный redirectedFrom:
   ```typescript
   const redirectedFrom = requestUrl.searchParams.get('redirectedFrom') || '/'
   ```

---

## Часть 5: Безопасность

### Важные моменты:

1. **НИКОГДА не коммитьте в Git**:
   - Client Secrets
   - API ключи
   - Токены доступа

2. **Используйте HTTPS в production**:
   - OAuth требует HTTPS для безопасной передачи данных
   - Locahost может использовать HTTP только для разработки

3. **Регулярно ротируйте секреты**:
   - Google Client Secret - раз в 6-12 месяцев
   - GitHub Client Secret - раз в 6-12 месяцев

4. **Мониторьте OAuth логи**:
   ```
   Supabase Dashboard → Authentication → Logs

   Следите за:
   - Неудачные попытки авторизации
   - Подозрительные IP адреса
   - Массовые регистрации
   ```

---

## Часть 6: Следующие шаги (опционально)

### Apple Sign In (в будущем)

**Требования:**
- Apple Developer аккаунт ($99/год)
- Настройка в Apple Developer Console
- Более сложная настройка, чем Google/GitHub

**Когда добавлять:**
- При создании iOS приложения
- Если обязательно по политике App Store (если есть другие соцсети)

### Дополнительные провайдеры:

- **Facebook** - если целевая аудитория активна в Facebook
- **Twitter/X** - для социальных функций
- **LinkedIn** - если планируется B2B функционал

---

## Чек-лист завершения

- [x] ✅ Создан callback route (`src/app/auth/callback/route.ts`)
- [x] ✅ Обновлен AuthModal с кнопками Google и GitHub
- [ ] 🔲 Настроен Google Cloud Console
- [ ] 🔲 Настроен Google OAuth в Supabase
- [ ] 🔲 Протестирован Google OAuth
- [ ] 🔲 Настроен GitHub OAuth App
- [ ] 🔲 Настроен GitHub OAuth в Supabase
- [ ] 🔲 Протестирован GitHub OAuth
- [ ] 🔲 Проверена работа на production
- [ ] 🔲 Обновлена документация для команды

---

## Полезные ссылки

**Google OAuth:**
- Google Cloud Console: https://console.cloud.google.com
- Документация Google OAuth: https://developers.google.com/identity/protocols/oauth2

**GitHub OAuth:**
- GitHub Developer Settings: https://github.com/settings/developers
- Документация GitHub OAuth: https://docs.github.com/en/apps/oauth-apps

**Supabase:**
- Dashboard: https://supabase.com/dashboard
- Документация Auth: https://supabase.com/docs/guides/auth
- OAuth провайдеры: https://supabase.com/docs/guides/auth/social-login

---

**Последнее обновление:** 27 ноября 2025
**Автор:** Claude (Anthropic)
**Статус:** ✅ Готово к настройке
