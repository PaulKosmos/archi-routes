-- Migration: 004_migrate_existing_data
-- Description: Миграция существующих данных в новую структуру
-- Date: 2025-11-06
-- Author: Claude Code
-- ВАЖНО: Этот скрипт безопасен для повторного запуска (idempotent)

-- ============================================================
-- Шаг 1: Миграция тегов из массива в таблицу news_tags
-- ============================================================

DO $$
DECLARE
  tag_record RECORD;
  tag_name_var TEXT;
  tag_slug_var TEXT;
  new_tag_id UUID;
BEGIN
  RAISE NOTICE 'Начало миграции тегов из массива architecture_news.tags в таблицу news_tags...';

  -- Получаем все уникальные теги из массивов
  FOR tag_record IN
    SELECT DISTINCT unnest(tags) as tag_name
    FROM architecture_news
    WHERE tags IS NOT NULL
    AND array_length(tags, 1) > 0
  LOOP
    tag_name_var := tag_record.tag_name;

    -- Генерируем slug из названия тега
    tag_slug_var := lower(
      regexp_replace(
        regexp_replace(tag_name_var, '[^a-zA-Z0-9А-Яа-яЁё\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    );

    -- Вставляем тег, если его еще нет
    INSERT INTO news_tags (name, slug, description)
    VALUES (tag_name_var, tag_slug_var, NULL)
    ON CONFLICT (slug) DO NOTHING;

  END LOOP;

  RAISE NOTICE 'Миграция тегов завершена. Всего тегов в таблице: %', (SELECT COUNT(*) FROM news_tags);
END $$;

-- ============================================================
-- Шаг 2: Создание связей в news_article_tags
-- ============================================================

DO $$
DECLARE
  news_record RECORD;
  tag_name_var TEXT;
  tag_id_var UUID;
  links_created INTEGER := 0;
BEGIN
  RAISE NOTICE 'Начало создания связей в news_article_tags...';

  -- Для каждой новости с тегами
  FOR news_record IN
    SELECT id, tags
    FROM architecture_news
    WHERE tags IS NOT NULL
    AND array_length(tags, 1) > 0
  LOOP
    -- Для каждого тега в массиве
    FOREACH tag_name_var IN ARRAY news_record.tags
    LOOP
      -- Находим ID тега
      SELECT id INTO tag_id_var
      FROM news_tags
      WHERE name = tag_name_var;

      -- Если тег найден, создаем связь
      IF tag_id_var IS NOT NULL THEN
        INSERT INTO news_article_tags (news_id, tag_id)
        VALUES (news_record.id, tag_id_var)
        ON CONFLICT (news_id, tag_id) DO NOTHING;

        links_created := links_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Создание связей завершено. Всего связей создано: %', links_created;
END $$;

-- ============================================================
-- Шаг 3: Установка базовых категорий для тегов
-- ============================================================

-- Отмечаем некоторые теги как "featured categories" для отображения в верхней панели
-- Это можно настроить позже через админку

DO $$
DECLARE
  categories_to_feature TEXT[] := ARRAY[
    'Новые проекты',
    'События',
    'Архитекторы',
    'Тренды',
    'Градостроительство',
    'Наследие'
  ];
  category_name TEXT;
  parent_categories VARCHAR[] := ARRAY['projects', 'events', 'personalities', 'trends', 'planning', 'heritage'];
  idx INTEGER := 1;
BEGIN
  RAISE NOTICE 'Установка featured категорий...';

  FOREACH category_name IN ARRAY categories_to_feature
  LOOP
    -- Обновляем существующий тег или создаем новый
    INSERT INTO news_tags (
      name,
      slug,
      is_featured_category,
      parent_category,
      display_order,
      description
    )
    VALUES (
      category_name,
      lower(regexp_replace(category_name, '\s+', '-', 'g')),
      TRUE,
      parent_categories[idx],
      idx,
      'Категория для фильтрации новостей'
    )
    ON CONFLICT (slug) DO UPDATE SET
      is_featured_category = TRUE,
      parent_category = parent_categories[idx],
      display_order = idx;

    idx := idx + 1;
  END LOOP;

  RAISE NOTICE 'Featured категории установлены';
END $$;

-- ============================================================
-- Шаг 4: Конвертация существующего content в блоки
-- ============================================================

DO $$
DECLARE
  news_record RECORD;
  blocks_created INTEGER := 0;
  existing_blocks INTEGER;
BEGIN
  RAISE NOTICE 'Начало конвертации content в блоки...';

  -- Для каждой новости, у которой еще нет блоков
  FOR news_record IN
    SELECT id, content
    FROM architecture_news
    WHERE content IS NOT NULL
    AND content != ''
    AND NOT EXISTS (
      SELECT 1 FROM news_content_blocks
      WHERE news_content_blocks.news_id = architecture_news.id
    )
  LOOP
    -- Создаем один блок типа "text" с существующим контентом
    INSERT INTO news_content_blocks (
      news_id,
      order_index,
      block_type,
      content,
      images_data,
      block_settings
    )
    VALUES (
      news_record.id,
      0,
      'text',
      news_record.content,
      '{}'::jsonb,
      '{"textAlign": "left"}'::jsonb
    );

    blocks_created := blocks_created + 1;
  END LOOP;

  RAISE NOTICE 'Конвертация завершена. Создано блоков: %', blocks_created;

  -- Проверяем результат
  SELECT COUNT(*) INTO existing_blocks FROM news_content_blocks;
  RAISE NOTICE 'Всего блоков в таблице: %', existing_blocks;
END $$;

-- ============================================================
-- Шаг 5: Обновление usage_count для всех тегов
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Обновление usage_count для всех тегов...';

  UPDATE news_tags t
  SET usage_count = (
    SELECT COUNT(*)
    FROM news_article_tags nat
    WHERE nat.tag_id = t.id
  );

  RAISE NOTICE 'Usage_count обновлен для всех тегов';
END $$;

-- ============================================================
-- Шаг 6: Очистка устаревших таблиц (ОПЦИОНАЛЬНО)
-- ============================================================

-- ВНИМАНИЕ: Раскомментируйте эти строки только если уверены,
-- что старые таблицы больше не используются

-- DO $$
-- BEGIN
--   RAISE NOTICE 'Очистка устаревших таблиц...';
--
--   -- Удаляем устаревшие таблицы
--   DROP TABLE IF EXISTS news_post_buildings CASCADE;
--   DROP TABLE IF EXISTS news_posts CASCADE;
--
--   RAISE NOTICE 'Устаревшие таблицы удалены';
-- END $$;

-- ============================================================
-- Шаг 7: Создание тестовых данных (ОПЦИОНАЛЬНО)
-- ============================================================

-- Вставка нескольких тестовых тегов для разработки

INSERT INTO news_tags (name, slug, description, is_featured_category, parent_category, display_order, color, icon)
VALUES
  ('Модернизм', 'modernism', 'Архитектурное направление модернизм', FALSE, 'trends', 10, '#3B82F6', 'Building'),
  ('Реконструкция', 'reconstruction', 'Новости о реконструкции зданий', FALSE, 'projects', 11, '#10B981', 'Wrench'),
  ('Конкурсы', 'competitions', 'Архитектурные конкурсы', TRUE, 'events', 7, '#F59E0B', 'Trophy'),
  ('Урбанистика', 'urbanism', 'Городское планирование и урбанистика', FALSE, 'planning', 12, '#8B5CF6', 'Map')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Финальные проверки и статистика
-- ============================================================

DO $$
DECLARE
  news_count INTEGER;
  tags_count INTEGER;
  links_count INTEGER;
  blocks_count INTEGER;
  featured_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO news_count FROM architecture_news;
  SELECT COUNT(*) INTO tags_count FROM news_tags;
  SELECT COUNT(*) INTO links_count FROM news_article_tags;
  SELECT COUNT(*) INTO blocks_count FROM news_content_blocks;
  SELECT COUNT(*) INTO featured_count FROM news_tags WHERE is_featured_category = TRUE;

  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'МИГРАЦИЯ ДАННЫХ ЗАВЕРШЕНА УСПЕШНО';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'Статистика:';
  RAISE NOTICE '  - Всего новостей: %', news_count;
  RAISE NOTICE '  - Всего тегов: %', tags_count;
  RAISE NOTICE '  - Связей новость-тег: %', links_count;
  RAISE NOTICE '  - Блоков контента: %', blocks_count;
  RAISE NOTICE '  - Featured категорий: %', featured_count;
  RAISE NOTICE '==========================================================';
END $$;
