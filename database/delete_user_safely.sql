-- ========================================
-- БЕЗОПАСНОЕ КАСКАДНОЕ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
-- ========================================
-- Версия 2.0 - Обновлено 2025-10-09
-- Удаляет ВСЕ связанные данные из всех таблиц

-- ИНСТРУКЦИЯ:
-- 1. ЗАМЕНИТЕ email ниже на нужный
-- 2. Скопируйте весь скрипт
-- 3. Вставьте в Supabase SQL Editor
-- 4. Запустите "Run"
-- 5. Проверьте логи

DO $$
DECLARE
  user_uuid UUID;
  user_email TEXT := 'ЗАМЕНИТЕ_НА_EMAIL'; -- ⚠️ ЗАМЕНИТЕ НА НУЖНЫЙ EMAIL!
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'НАЧАЛО УДАЛЕНИЯ ПОЛЬЗОВАТЕЛЯ';
  RAISE NOTICE '========================================';
  
  -- Получаем ID пользователя
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = user_email;

  IF user_uuid IS NULL THEN
    RAISE NOTICE '❌ Пользователь с email "%" не найден', user_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Email: %', user_email;
  RAISE NOTICE 'User ID: %', user_uuid;
  RAISE NOTICE '';

  -- ========================================
  -- УДАЛЕНИЕ СВЯЗАННЫХ ДАННЫХ
  -- ========================================
  
  -- 1. Уведомления
  DELETE FROM notifications WHERE user_id = user_uuid;
  RAISE NOTICE '✓ Уведомления удалены';

  -- 2. Обзоры
  DELETE FROM building_reviews WHERE user_id = user_uuid;
  DELETE FROM route_reviews WHERE user_id = user_uuid;
  RAISE NOTICE '✓ Обзоры удалены';

  -- 3. Избранное и рейтинги
  DELETE FROM user_building_favorites WHERE user_id = user_uuid;
  DELETE FROM user_route_favorites WHERE user_id = user_uuid;
  DELETE FROM route_favorites WHERE user_id = user_uuid;
  DELETE FROM route_ratings WHERE user_id = user_uuid;
  RAISE NOTICE '✓ Избранное и рейтинги удалены';

  -- 4. Прогресс и коллекции
  DELETE FROM route_completions WHERE user_id = user_uuid;
  DELETE FROM user_collections WHERE user_id = user_uuid;
  RAISE NOTICE '✓ Прогресс и коллекции удалены';

  -- 5. Подписки
  DELETE FROM user_follows WHERE follower_id = user_uuid OR following_id = user_uuid;
  RAISE NOTICE '✓ Подписки удалены';

  -- 6. Запросы на публикацию и шаблоны
  DELETE FROM route_publication_requests WHERE requested_by = user_uuid OR reviewed_by = user_uuid;
  DELETE FROM auto_route_templates WHERE created_by = user_uuid;
  RAISE NOTICE '✓ Запросы и шаблоны удалены';

  -- ========================================
  -- ОБРАБОТКА ОБЪЕКТОВ (НЕ УДАЛЯЕМ, УБИРАЕМ АВТОРА)
  -- ========================================
  
  -- 7. Здания - убираем ссылки на пользователя
  UPDATE buildings SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE buildings SET updated_by = NULL WHERE updated_by = user_uuid;
  UPDATE buildings SET moderated_by = NULL WHERE moderated_by = user_uuid;
  RAISE NOTICE '✓ Здания обработаны (автор убран)';

  -- 8. Маршруты - убираем ссылки
  UPDATE routes SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE routes SET updated_by = NULL WHERE updated_by = user_uuid;
  UPDATE routes SET moderated_by = NULL WHERE moderated_by = user_uuid;
  RAISE NOTICE '✓ Маршруты обработаны (автор убран)';

  -- 9. Новости - убираем ссылки
  UPDATE news_posts SET author_id = NULL WHERE author_id = user_uuid;
  UPDATE architecture_news SET author_id = NULL WHERE author_id = user_uuid;
  RAISE NOTICE '✓ Новости обработаны (автор убран)';

  -- ========================================
  -- УДАЛЕНИЕ ПРОФИЛЯ И AUTH
  -- ========================================
  
  -- 10. Удаляем профиль
  DELETE FROM profiles WHERE id = user_uuid;
  RAISE NOTICE '✓ Профиль удален';

  -- 11. Удаляем из auth.users
  DELETE FROM auth.users WHERE id = user_uuid;
  RAISE NOTICE '✓ Auth запись удалена';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 ПОЛЬЗОВАТЕЛЬ "%" УСПЕШНО УДАЛЕН!', user_email;
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ОШИБКА: %', SQLERRM;
END $$;

-- Проверка
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'ЗАМЕНИТЕ_НА_EMAIL') 
    THEN '❌ НЕ удален' 
    ELSE '✅ Успешно удален' 
  END as результат;

-- ========================================
-- АЛЬТЕРНАТИВА: УДАЛЕНИЕ С УДАЛЕНИЕМ ОБЪЕКТОВ
-- ========================================
-- Если хотите удалить ВСЕ объекты пользователя (не только ссылки),
-- раскомментируйте эти строки вместо UPDATE выше:

/*
DELETE FROM buildings WHERE created_by = user_uuid;
DELETE FROM routes WHERE created_by = user_uuid;
RAISE NOTICE '✓ Здания и маршруты УДАЛЕНЫ (не только ссылки)';
*/
