-- Назначение пользователя модератором
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем, существует ли пользователь с указанным email
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'alina.chebakova95@gmail.com';
BEGIN
    -- Ищем пользователя по email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    -- Если пользователь найден
    IF target_user_id IS NOT NULL THEN
        -- Обновляем роль в таблице profiles
        UPDATE profiles 
        SET 
            role = 'moderator',
            updated_at = NOW()
        WHERE id = target_user_id;
        
        -- Проверяем, была ли обновлена запись
        IF FOUND THEN
            RAISE NOTICE 'Пользователь % (ID: %) успешно назначен модератором', target_email, target_user_id;
        ELSE
            -- Если профиль не существует, создаём его
            INSERT INTO profiles (
                id,
                email,
                role,
                is_verified,
                verification_notes,
                created_at,
                updated_at
            ) VALUES (
                target_user_id,
                target_email,
                'moderator',
                TRUE,
                'Назначен модератором администратором',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Создан профиль модератора для % (ID: %)', target_email, target_user_id;
        END IF;
    ELSE
        RAISE NOTICE 'Пользователь с email % не найден в системе', target_email;
        RAISE NOTICE 'Пользователь должен сначала зарегистрироваться на платформе';
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
WHERE u.email = 'alina.chebakova95@gmail.com';
