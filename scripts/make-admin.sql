-- Скрипт для назначения админских прав
-- Замените 'your-email@example.com' на ваш email

UPDATE profiles 
SET role = 'admin'
WHERE email = 'paul.kosenkov@gmail.com';

-- Проверяем результат
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'paul.kosenkov@gmail.com';
