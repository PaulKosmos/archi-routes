-- Назначение paul.kosenkov@gmail.com администратором
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем и назначаем админа
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'paul.kosenkov@gmail.com';
BEGIN
    -- Ищем пользователя по email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    -- Если пользователь найден
    IF admin_user_id IS NOT NULL THEN
        -- Обновляем роль в таблице profiles
        INSERT INTO profiles (
            id,
            email,
            role,
            is_verified,
            verification_notes,
            full_name,
            display_name,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            admin_email,
            'admin',
            TRUE,
            'Главный администратор платформы',
            'Paul Kosenkov',
            'Paul Kosenkov',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            is_verified = TRUE,
            verification_notes = 'Главный администратор платформы',
            updated_at = NOW();
        
        RAISE NOTICE 'Пользователь % (ID: %) успешно назначен главным администратором', admin_email, admin_user_id;
    ELSE
        RAISE NOTICE 'Пользователь с email % не найден в системе', admin_email;
        RAISE NOTICE 'Пользователь должен сначала зарегистрироваться на платформе';
    END IF;
END $$;

-- Также назначаем Алину модератором
DO $$
DECLARE
    moderator_user_id UUID;
    moderator_email TEXT := 'alina.chebakova95@gmail.com';
BEGIN
    -- Ищем пользователя по email
    SELECT id INTO moderator_user_id 
    FROM auth.users 
    WHERE email = moderator_email;
    
    -- Если пользователь найден
    IF moderator_user_id IS NOT NULL THEN
        -- Обновляем роль в таблице profiles
        INSERT INTO profiles (
            id,
            email,
            role,
            is_verified,
            verification_notes,
            created_at,
            updated_at
        ) VALUES (
            moderator_user_id,
            moderator_email,
            'moderator',
            TRUE,
            'Назначен модератором администратором',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'moderator',
            is_verified = TRUE,
            verification_notes = 'Назначен модератором администратором',
            updated_at = NOW();
        
        RAISE NOTICE 'Пользователь % (ID: %) успешно назначен модератором', moderator_email, moderator_user_id;
    ELSE
        RAISE NOTICE 'Пользователь с email % не найден в системе', moderator_email;
        RAISE NOTICE 'Пользователь должна сначала зарегистрироваться на платформе';
    END IF;
END $$;

-- Проверяем результат
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at as user_created_at,
    p.role,
    p.full_name,
    p.display_name,
    p.is_verified,
    p.verification_notes,
    p.updated_at as profile_updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email IN ('paul.kosenkov@gmail.com', 'alina.chebakova95@gmail.com')
ORDER BY p.role DESC;
