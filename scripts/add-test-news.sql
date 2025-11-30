-- Add test news data if table is empty
-- Run this in Supabase SQL Editor if no news exist

-- First, check if we have any news
-- SELECT COUNT(*) FROM architecture_news;

-- Insert test news only if table is empty
INSERT INTO architecture_news (
    title, 
    slug, 
    summary, 
    content, 
    category, 
    status, 
    published_at,
    featured,
    author_id,
    city,
    country,
    tags,
    views_count,
    likes_count
) 
SELECT 
    'Новая архитектура будущего: тенденции 2025 года',
    'novaya-arhitektura-budushchego-tendencii-2025',
    'Обзор ключевых архитектурных трендов, которые будут определять облик городов в ближайшие годы.',
    'Архитектура постоянно эволюционирует, отражая изменения в технологиях, экологических требованиях и образе жизни людей. В 2025 году мы наблюдаем несколько ключевых тенденций, которые формируют будущее городской среды.

Устойчивая архитектура становится не просто трендом, а необходимостью. Архитекторы все чаще используют экологически чистые материалы, солнечные панели и системы сбора дождевой воды. Здания проектируются с учетом минимизации углеродного следа на всех этапах жизненного цикла.

Умные технологии интегрируются в архитектуру на фундаментальном уровне. Здания становятся адаптивными, способными реагировать на изменения окружающей среды и потребности жителей. Системы искусственного интеллекта управляют освещением, климатом и безопасностью.

Биофилический дизайн приобретает новые формы выражения. Живые стены, внутренние сады и интеграция природных элементов в архитектуру помогают создавать более здоровую и комфортную среду для людей.',
    'trends',
    'published',
    NOW(),
    true,
    auth.uid(), -- Will use current user
    'Санкт-Петербург',
    'Россия',
    ARRAY['архитектура', 'будущее', 'тренды', '2025', 'экология'],
    156,
    23
WHERE NOT EXISTS (SELECT 1 FROM architecture_news LIMIT 1);

-- Insert second test article
INSERT INTO architecture_news (
    title, 
    slug, 
    summary, 
    content, 
    category, 
    status, 
    published_at,
    featured,
    author_id,
    city,
    country,
    tags,
    views_count,
    likes_count
) 
SELECT 
    'Реставрация исторического центра: проект завершен',
    'restavracia-istoricheskogo-centra-proekt-zavershen',
    'Масштабный проект по восстановлению архитектурного наследия XVIII века успешно завершен.',
    'После трех лет кропотливой работы завершен проект реставрации исторического квартала в центре города. Команда реставраторов и архитекторов восстановила первоначальный облик зданий XVIII века, сохранив их историческую ценность.

Проект включал в себя восстановление фасадов, крыш, внутренних интерьеров и инженерных систем. Особое внимание уделялось сохранению аутентичных материалов и технологий строительства той эпохи.

Результатом стало не только сохранение культурного наследия, но и создание современного культурного пространства, которое будет служить горожанам и туристам.',
    'heritage',
    'published',
    NOW() - INTERVAL '2 days',
    false,
    auth.uid(),
    'Москва',
    'Россия',
    ARRAY['реставрация', 'наследие', 'история', 'центр', 'проект'],
    89,
    12
WHERE (SELECT COUNT(*) FROM architecture_news) <= 1;

-- Insert third test article (draft)
INSERT INTO architecture_news (
    title, 
    slug, 
    summary, 
    content, 
    category, 
    status,
    featured,
    author_id,
    city,
    country,
    tags
) 
SELECT 
    'Конкурс молодых архитекторов: итоги 2025',
    'konkurs-molodyh-arhitektorov-itogi-2025',
    'Подведены итоги ежегодного конкурса архитектурных проектов среди студентов и молодых специалистов.',
    'Традиционный конкурс молодых архитекторов в этом году собрал рекордное количество участников. Более 200 проектов было представлено в различных номинациях...

Первое место в категории "Жилая архитектура" занял проект экологичного микрорайона...

В номинации "Общественные здания" победил проект культурного центра...',
    'events',
    'draft', -- This is a draft
    false,
    auth.uid(),
    'Екатеринбург',
    'Россия',
    ARRAY['конкурс', 'молодые', 'архитекторы', 'студенты', 'проекты']
WHERE (SELECT COUNT(*) FROM architecture_news) <= 2;

-- Verify the data was inserted
SELECT 
    id, 
    title, 
    slug, 
    status, 
    published_at,
    created_at
FROM architecture_news 
ORDER BY created_at DESC;
