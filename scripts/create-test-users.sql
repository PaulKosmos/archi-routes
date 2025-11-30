-- Создание тестовых пользователей для демонстрации админ-панели
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем тестовые профили (без auth.users, так как они уже могут существовать)
INSERT INTO profiles (
    id,
    email,
    full_name,
    display_name,
    role,
    is_verified,
    location,
    bio,
    created_at,
    updated_at
) VALUES 
    -- Генерируем UUID для тестовых пользователей
    (gen_random_uuid(), 'architect.test@example.com', 'Анна Архитектова', 'Анна А.', 'expert', true, 'Москва, Россия', 'Архитектор с 15-летним опытом', NOW() - INTERVAL '6 months', NOW()),
    (gen_random_uuid(), 'guide.test@example.com', 'Петр Гидов', 'Петр Г.', 'guide', true, 'Санкт-Петербург, Россия', 'Городской гид и любитель архитектуры', NOW() - INTERVAL '4 months', NOW()),
    (gen_random_uuid(), 'explorer1@example.com', 'Мария Исследова', 'Мария И.', 'explorer', false, 'Казань, Россия', 'Студентка архитектурного факультета', NOW() - INTERVAL '2 months', NOW()),
    (gen_random_uuid(), 'explorer2@example.com', 'Иван Путешественник', 'Иван П.', 'explorer', false, 'Новосибирск, Россия', 'Увлекаюсь историей архитектуры', NOW() - INTERVAL '1 month', NOW()),
    (gen_random_uuid(), 'newuser@example.com', 'Елена Новичкова', 'Елена Н.', 'explorer', false, 'Екатеринбург, Россия', 'Недавно открыла для себя архитектуру', NOW() - INTERVAL '1 week', NOW())
ON CONFLICT (id) DO NOTHING;

-- Добавляем статистику для тестовых пользователей (создаем фиктивные здания и обзоры)
-- Это поможет продемонстрировать работу статистики в админ-панели

-- Сначала получаем ID созданных тестовых пользователей
DO $$
DECLARE
    architect_id UUID;
    guide_id UUID;
    explorer1_id UUID;
    explorer2_id UUID;
    
    building1_id UUID;
    building2_id UUID;
    building3_id UUID;
BEGIN
    -- Получаем ID пользователей
    SELECT id INTO architect_id FROM profiles WHERE email = 'architect.test@example.com';
    SELECT id INTO guide_id FROM profiles WHERE email = 'guide.test@example.com';
    SELECT id INTO explorer1_id FROM profiles WHERE email = 'explorer1@example.com';
    SELECT id INTO explorer2_id FROM profiles WHERE email = 'explorer2@example.com';
    
    -- Создаем тестовые здания (если пользователи существуют)
    IF architect_id IS NOT NULL THEN
        INSERT INTO buildings (
            id, name, description, address, city, country,
            architectural_style, construction_year, architect_name,
            created_by, created_at, updated_at
        ) VALUES 
            (gen_random_uuid(), 'Тестовое здание 1', 'Современный офисный комплекс', 'ул. Тестовая, 1', 'Москва', 'Россия', 'Современная архитектура', 2020, 'Анна Архитектова', architect_id, NOW() - INTERVAL '3 months', NOW()),
            (gen_random_uuid(), 'Тестовое здание 2', 'Жилой комплекс в стиле модерн', 'пр. Примерный, 5', 'Москва', 'Россия', 'Модерн', 2019, 'Анна Архитектова', architect_id, NOW() - INTERVAL '2 months', NOW())
        RETURNING id INTO building1_id;
    END IF;
    
    IF guide_id IS NOT NULL THEN
        INSERT INTO buildings (
            id, name, description, address, city, country,
            architectural_style, construction_year, architect_name,
            created_by, created_at, updated_at
        ) VALUES 
            (gen_random_uuid(), 'Историческое здание', 'Памятник архитектуры XVIII века', 'Дворцовая пл., 2', 'Санкт-Петербург', 'Россия', 'Барокко', 1750, 'Растрелли', guide_id, NOW() - INTERVAL '1 month', NOW())
        RETURNING id INTO building2_id;
    END IF;
    
    -- Создаем тестовые обзоры
    IF explorer1_id IS NOT NULL AND building1_id IS NOT NULL THEN
        INSERT INTO building_reviews (
            id, building_id, user_id, rating, title, content, review_type,
            created_at, updated_at
        ) VALUES 
            (gen_random_uuid(), building1_id, explorer1_id, 5, 'Отличное здание!', 'Очень впечатляющая архитектура, современный дизайн.', 'general', NOW() - INTERVAL '1 week', NOW()),
            (gen_random_uuid(), building2_id, explorer1_id, 4, 'Исторический шедевр', 'Классический пример барочной архитектуры.', 'historical', NOW() - INTERVAL '3 days', NOW());
    END IF;
    
    IF explorer2_id IS NOT NULL AND building1_id IS NOT NULL THEN
        INSERT INTO building_reviews (
            id, building_id, user_id, rating, title, content, review_type,
            created_at, updated_at
        ) VALUES 
            (gen_random_uuid(), building1_id, explorer2_id, 4, 'Интересное решение', 'Современная архитектура на высоком уровне.', 'general', NOW() - INTERVAL '2 days', NOW());
    END IF;
    
    RAISE NOTICE 'Тестовые данные созданы успешно';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при создании тестовых данных: %', SQLERRM;
END $$;

-- Проверяем созданные данные
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.is_verified,
    p.location,
    (SELECT COUNT(*) FROM buildings WHERE created_by = p.id) as buildings_count,
    (SELECT COUNT(*) FROM building_reviews WHERE user_id = p.id) as reviews_count
FROM profiles p
WHERE p.email LIKE '%@example.com'
ORDER BY p.role DESC, p.created_at DESC;

-- Также проверим админа и модератора
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.is_verified,
    'Системный пользователь' as location
FROM profiles p
WHERE p.email IN ('paul.kosenkov@gmail.com', 'alina.chebakova95@gmail.com')
ORDER BY p.role DESC;
