-- Скрипт для сброса пароля тестового аккаунта Guide
-- Email: testtestovich@gmail.com
-- Новый пароль: TestGuide2024!

-- ВАЖНО: Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Вариант 1: Сброс пароля через Dashboard UI
-- 1. Откройте: Supabase Dashboard → Authentication → Users
-- 2. Найдите пользователя: testtestovich@gmail.com
-- 3. Кликните "..." → "Reset password"
-- 4. Введите новый пароль: TestGuide2024!

-- Вариант 2: Создание нового тестового пользователя (РЕКОМЕНДУЕТСЯ)
-- 1. Откройте: Supabase Dashboard → Authentication → Users
-- 2. Кликните "Add user" → "Create new user"
-- 3. Заполните:
--    Email: testguide@archiroutes.com
--    Password: TestGuide2024!
--    Auto Confirm User: ✓ (поставьте галочку)
-- 4. Кликните "Create user"

-- 5. После создания выполните этот SQL:
/*
-- Узнаем ID нового пользователя
SELECT id, email FROM auth.users WHERE email = 'testguide@archiroutes.com';

-- Создаем профиль (ЗАМЕНИТЕ user_id на полученный ID!)
INSERT INTO profiles (id, email, full_name, role, bio)
VALUES (
  'ВСТАВЬТЕ_ID_СЮДА', -- ЗАМЕНИТЕ!
  'testguide@archiroutes.com',
  'Тестовый Гид',
  'guide',
  'Тестовый аккаунт для проверки системы модерации'
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'guide',
  full_name = 'Тестовый Гид',
  bio = 'Тестовый аккаунт для проверки системы модерации';
*/

-- ГОТОВЫЕ ДАННЫЕ ДЛЯ ВХОДА:
-- Email: testguide@archiroutes.com
-- Пароль: TestGuide2024!
-- Роль: guide (создает pending объекты)

SELECT 'Test guide account instructions created' as status;

