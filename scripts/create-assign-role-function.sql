-- Функция для назначения ролей пользователям
-- Выполните этот скрипт в Supabase SQL Editor для создания переиспользуемой функции

CREATE OR REPLACE FUNCTION assign_user_role(
    user_email TEXT,
    new_role TEXT,
    notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    old_role TEXT;
    result JSON;
BEGIN
    -- Проверяем валидность роли
    IF new_role NOT IN ('guest', 'explorer', 'guide', 'expert', 'moderator', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Недопустимая роль: ' || new_role,
            'valid_roles', ARRAY['guest', 'explorer', 'guide', 'expert', 'moderator', 'admin']
        );
    END IF;
    
    -- Ищем пользователя по email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    -- Если пользователь не найден
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Пользователь с email ' || user_email || ' не найден',
            'message', 'Пользователь должен сначала зарегистрироваться на платформе'
        );
    END IF;
    
    -- Получаем старую роль
    SELECT role INTO old_role FROM profiles WHERE id = target_user_id;
    
    -- Обновляем или создаём профиль
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
        user_email,
        new_role,
        CASE WHEN new_role IN ('moderator', 'admin', 'expert') THEN TRUE ELSE FALSE END,
        COALESCE(notes, 'Роль назначена: ' || new_role),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        is_verified = CASE WHEN EXCLUDED.role IN ('moderator', 'admin', 'expert') THEN TRUE ELSE profiles.is_verified END,
        verification_notes = COALESCE(EXCLUDED.verification_notes, profiles.verification_notes),
        updated_at = NOW();
    
    -- Возвращаем результат
    RETURN json_build_object(
        'success', true,
        'user_id', target_user_id,
        'email', user_email,
        'old_role', COALESCE(old_role, 'не задана'),
        'new_role', new_role,
        'message', 'Роль успешно обновлена'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Ошибка при обновлении роли: ' || SQLERRM
    );
END;
$$;

-- Пример использования функции:
-- SELECT assign_user_role('alina.chebakova95@gmail.com', 'moderator', 'Назначен модератором администратором');

-- Назначаем Алину модератором
SELECT assign_user_role('alina.chebakova95@gmail.com', 'moderator', 'Назначен модератором администратором');
