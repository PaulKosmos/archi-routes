# Ссылки на платформы подкастов

## 🎯 Обзор

Добавлена поддержка отображения иконок внешних платформ для подкастов:
- 🍎 **Apple Podcasts**
- 🟢 **Spotify**
- 🔴 **Yandex Music**
- 🔵 **Google Podcasts**

## 📦 Что было добавлено

### 1. Новые поля в базе данных

Добавлены 4 новых поля в таблицу `podcast_episodes`:

```sql
- apple_podcasts_url (TEXT)
- spotify_url (TEXT)
- yandex_music_url (TEXT)
- google_podcasts_url (TEXT)
```

### 2. Новый компонент

**`src/components/PodcastPlatformLinks.tsx`**
- Отображает иконки платформ
- Автоматически скрывает платформы без URL
- Hover эффект: `scale(1.1)`
- Размер иконок: 20-24px

### 3. Обновленные типы

**`src/types/podcast.ts`**
- Добавлены поля в `PodcastEpisode`
- Добавлены поля в `PodcastUploadPayload`

## 🚀 Применение изменений

### Шаг 1: Применить миграцию базы данных

Выполните SQL миграцию через Supabase Dashboard или CLI:

```bash
# Через Supabase CLI
npx supabase db push

# Или через SQL Editor в Supabase Dashboard
# Выполните файл: database/migrations/016_add_platform_links_to_podcasts.sql
```

**Содержимое миграции:**
```sql
ALTER TABLE podcast_episodes
ADD COLUMN IF NOT EXISTS apple_podcasts_url TEXT,
ADD COLUMN IF NOT EXISTS spotify_url TEXT,
ADD COLUMN IF NOT EXISTS yandex_music_url TEXT,
ADD COLUMN IF NOT EXISTS google_podcasts_url TEXT;
```

### Шаг 2: (Опционально) Добавить тестовые данные

Для тестирования выполните:

```bash
# Выполните файл через SQL Editor
database/add_test_podcast_links.sql
```

Это добавит примеры ссылок к существующим подкастам.

## 📝 Использование

### В карточках подкастов

Иконки автоматически отображаются в карточках подкастов на странице `/podcasts`:

```tsx
<PodcastCard
  episode={episode}
  variant="grid"
  // ... другие пропсы
/>
```

Компонент `PodcastPlatformLinks` уже интегрирован в `PodcastCard`.

### Как выглядит UI

```
┌─────────────────────────────────┐
│  Podcast Title                  │
│  Description...                 │
│                                 │
│  Слушать: 🍎 🟢 🔴 🔵          │
│                                 │
│  ⏱ 45 min    📅 27 окт. 2025   │
└─────────────────────────────────┘
```

### Условное отображение

- Если ни одной ссылки нет → блок не отображается
- Если есть только Spotify и Apple → показываются только эти 2 иконки
- Hover на иконке → увеличение на 10% (`scale(1.1)`)

## 🔧 Добавление ссылок к подкасту

### Вручную через SQL

```sql
UPDATE podcast_episodes
SET
  apple_podcasts_url = 'https://podcasts.apple.com/us/podcast/your-podcast/id123456789',
  spotify_url = 'https://open.spotify.com/episode/your-episode-id',
  yandex_music_url = 'https://music.yandex.ru/album/your-album/track/your-track',
  google_podcasts_url = 'https://podcasts.google.com/feed/your-feed-id'
WHERE id = 'your-episode-id';
```

### Через API (когда будет реализован UI форм)

На страницах `/podcasts/new` и `/podcasts/[id]/edit` можно будет добавить поля:

```tsx
<input
  type="url"
  name="apple_podcasts_url"
  placeholder="https://podcasts.apple.com/..."
/>
<input
  type="url"
  name="spotify_url"
  placeholder="https://open.spotify.com/..."
/>
// и т.д.
```

## 🎨 Кастомизация

### Изменить размер иконок

```tsx
<PodcastPlatformLinks episode={episode} size={24} />
```

### Изменить цвета

Отредактируйте файл `src/components/PodcastPlatformLinks.tsx`:

```tsx
const platforms = [
  {
    name: 'Apple Podcasts',
    // ...
    color: 'text-purple-600 hover:text-purple-700' // ← измените цвет
  },
  // ...
]
```

## ✅ Проверка работоспособности

### 1. Проверьте, что миграция применена

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'podcast_episodes'
  AND column_name LIKE '%url';
```

Должно вернуть:
- `apple_podcasts_url`
- `spotify_url`
- `yandex_music_url`
- `google_podcasts_url`

### 2. Добавьте тестовые данные

```sql
UPDATE podcast_episodes
SET spotify_url = 'https://open.spotify.com/episode/test'
WHERE id = (SELECT id FROM podcast_episodes LIMIT 1);
```

### 3. Проверьте на странице

Откройте http://localhost:3000/podcasts

Должны увидеть иконку Spotify под описанием подкаста.

## 🐛 Troubleshooting

### Иконки не отображаются

1. **Проверьте миграцию:**
   ```sql
   \d podcast_episodes  -- PostgreSQL
   ```

2. **Проверьте данные:**
   ```sql
   SELECT id, title, spotify_url, apple_podcasts_url
   FROM podcast_episodes
   LIMIT 5;
   ```

3. **Проверьте консоль браузера:**
   - Откройте DevTools (F12)
   - Проверьте ошибки в консоли

### Ошибка "column does not exist"

Значит миграция не применена. Выполните:
```bash
npx supabase db push
```

## 📚 Дополнительно

### Файлы, которые были изменены/созданы:

1. ✅ `src/types/podcast.ts` - обновлены типы
2. ✅ `src/components/PodcastPlatformLinks.tsx` - новый компонент
3. ✅ `src/components/PodcastCard.tsx` - добавлены иконки
4. ✅ `database/migrations/016_add_platform_links_to_podcasts.sql` - миграция
5. ✅ `database/add_test_podcast_links.sql` - тестовые данные

### Следующие шаги (TODO):

- [ ] Создать формы для редактирования ссылок на `/podcasts/new`
- [ ] Создать формы для редактирования ссылок на `/podcasts/[id]/edit`
- [ ] Добавить валидацию URL на фронтенде
- [ ] Добавить API endpoints для сохранения ссылок

---

**Автор:** Claude Code
**Дата:** 2025-11-04
**Версия:** 1.0
