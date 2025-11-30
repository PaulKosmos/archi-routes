-- Создание демо-пользователя для тестирования
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем, есть ли уже демо-пользователь
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Проверяем, существует ли демо-пользователь
    SELECT id INTO demo_user_id 
    FROM auth.users 
    WHERE email = 'demo@example.com';
    
    -- Если пользователь не существует, создаём его
    IF demo_user_id IS NULL THEN
        -- Создаём пользователя в auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'demo@example.com',
            crypt('demo123', gen_salt('bf')), -- Пароль: demo123
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Demo User"}',
            FALSE,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            '',
            ''
        ) RETURNING id INTO demo_user_id;
        
        -- Создаём профиль пользователя
        INSERT INTO profiles (
            id,
            email,
            full_name,
            display_name,
            role,
            bio,
            location,
            website,
            social_links,
            avatar_url,
            is_verified,
            verification_notes,
            created_at,
            updated_at
        ) VALUES (
            demo_user_id,
            'demo@example.com',
            'Demo User',
            'Demo User',
            'explorer',
            'Демонстрационный аккаунт для тестирования платформы ArchiRoutes',
            'Berlin, Germany',
            NULL,
            '{}',
            NULL,
            TRUE,
            'Demo account',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Демо-пользователь создан с ID: %', demo_user_id;
    ELSE
        RAISE NOTICE 'Демо-пользователь уже существует с ID: %', demo_user_id;
    END IF;
END $$;

-- Проверяем результат
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.role,
    p.location
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'demo@example.com';
