# Инструкция по применению миграции локализации контента

## Важно!
MCP не имеет прав для DDL операций. Миграцию нужно применить вручную через Supabase Dashboard.

## Быстрый способ (Рекомендуется)

### Шаг 1: Откройте Supabase SQL Editor

1. Перейдите на: https://app.supabase.com/project/gkjbxupefmdnoxmirjwv/sql/new
2. Это откроет новый SQL редактор для вашего проекта

### Шаг 2: Скопируйте миграцию

Откройте файл и скопируйте его содержимое:
```
database\migrations\030_add_content_localization.sql
```

### Шаг 3: Вставьте и запустите

1. Вставьте скопированный SQL в редактор
2. Нажмите кнопку **Run** (или Ctrl+Enter)
3. Дождитесь выполнения (займет 10-15 секунд)

### Шаг 4: Проверьте результат

После успешного выполнения проверьте добавленные столбцы:

```sql
-- Проверка buildings
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'buildings'
AND column_name IN ('original_language', 'name_en', 'description_en')
ORDER BY column_name;

-- Проверка news_posts
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'news_posts'
AND column_name IN ('original_language', 'title_en', 'content_en')
ORDER BY column_name;

-- Проверка user_preferences таблицы
SELECT * FROM user_preferences LIMIT 1;
```

---

## Что делает миграция

### 1. Добавляет поля локализации во все таблицы контента

**Buildings:**
- `original_language` (en/de/ru)
- `name_en`, `description_en`, `short_description_en`
- `historical_context_en`, `architectural_style_notes_en`

**Routes:**
- `original_language` (en/de/ru)
- `title_en`, `description_en`

**Building Reviews:**
- `original_language` (en/de/ru)
- `review_text_en`, `audio_description_en`

**Blog Posts:**
- `original_language` (en/de/ru)
- `title_en`, `content_en`, `excerpt_en`

**News Posts:**
- `original_language` (en/de/ru)
- `title_en`, `content_en`

### 2. Создает таблицу user_preferences

Хранит предпочтения пользователя:
- `ui_language` - язык интерфейса (en/de/ru)
- `content_language_preference` - original или english

### 3. Создает helper функцию

`get_localized_field()` - автоматический выбор правильной версии контента

### 4. Добавляет индексы

Для оптимизации запросов по `original_language`

---

## Проверка после применения

### Тест 1: Проверка функции локализации

```sql
SELECT get_localized_field(
  'Бранденбургские ворота',  -- original_value
  'Brandenburg Gate',         -- english_value
  'ru',                       -- original_lang
  'english'                   -- user_preference
) as result;

-- Должно вернуть: 'Brandenburg Gate'
```

### Тест 2: Проверка user_preferences

```sql
-- Вставить тестовые предпочтения
INSERT INTO user_preferences (user_id, ui_language, content_language_preference)
VALUES (auth.uid(), 'de', 'original')
ON CONFLICT (user_id) DO UPDATE
SET ui_language = 'de', content_language_preference = 'original';

-- Проверить
SELECT * FROM user_preferences WHERE user_id = auth.uid();
```

### Тест 3: Проверка constraints

```sql
-- Этот запрос должен выдать ошибку (недопустимый язык)
INSERT INTO user_preferences (user_id, ui_language, content_language_preference)
VALUES (auth.uid(), 'fr', 'original');
-- ERROR: new row violates check constraint
```

---

## Готово!

После применения миграции:
- ✅ Все таблицы имеют поля `original_language` и `*_en`
- ✅ Таблица `user_preferences` создана с RLS политиками
- ✅ Функция `get_localized_field()` готова к использованию
- ✅ Индексы созданы для производительности

Теперь можно переходить к реализации UI компонентов!
