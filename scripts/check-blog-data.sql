-- =====================================================
-- СКРИПТ ПРОВЕРКИ И ДОБАВЛЕНИЯ ТЕСТОВЫХ ДАННЫХ В БЛОГ
-- =====================================================

-- 1. Проверяем наличие таблицы blog_posts
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'blog_posts'
) AS blog_posts_exists;

-- 2. Проверяем количество статей в блоге
SELECT
  COUNT(*) AS total_posts,
  COUNT(CASE WHEN status = 'published' THEN 1 END) AS published_posts,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) AS draft_posts
FROM blog_posts;

-- 3. Показываем все статьи (если есть)
SELECT id, title, slug, status, author_id, created_at
FROM blog_posts
ORDER BY created_at DESC;

-- 4. Если нет статей, создаем тестовые данные
-- Получаем первого пользователя для авторства
DO $$
DECLARE
  test_author_id UUID;
  test_tag_architecture_id UUID;
  test_tag_modernism_id UUID;
  test_post_1_id UUID;
  test_post_2_id UUID;
  test_post_3_id UUID;
BEGIN
  -- Получаем ID первого пользователя
  SELECT id INTO test_author_id
  FROM profiles
  LIMIT 1;

  -- Проверяем, есть ли пользователи
  IF test_author_id IS NULL THEN
    RAISE NOTICE 'Нет пользователей в системе. Создайте пользователя сначала.';
    RETURN;
  END IF;

  -- Проверяем, есть ли уже статьи
  IF EXISTS (SELECT 1 FROM blog_posts LIMIT 1) THEN
    RAISE NOTICE 'Статьи уже существуют в блоге. Пропускаем создание тестовых данных.';
    RETURN;
  END IF;

  RAISE NOTICE 'Создаем тестовые статьи для блога...';

  -- Получаем ID тегов
  SELECT id INTO test_tag_architecture_id FROM blog_tags WHERE slug = 'architecture';
  SELECT id INTO test_tag_modernism_id FROM blog_tags WHERE slug = 'modernism';

  -- Создаем тестовую статью 1
  INSERT INTO blog_posts (
    title,
    slug,
    content,
    excerpt,
    featured_image_url,
    author_id,
    status,
    published_at,
    reading_time_minutes,
    seo_title,
    seo_description
  ) VALUES (
    'Знаменитая архитектура Москвы: путеводитель по столице',
    'famous-architecture-moscow-guide',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Архитектурные жемчужины Москвы"}]},{"type":"paragraph","content":[{"type":"text","text":"Москва — город с богатейшей архитектурной историей, где переплелись разные эпохи и стили. От древних монастырей до современных небоскребов — столица России предлагает уникальное путешествие во времени через архитектуру."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Кремль и Красная площадь"}]},{"type":"paragraph","content":[{"type":"text","text":"Начнем с сердца Москвы — Кремля. Этот архитектурный ансамбль формировался веками и включает соборы, дворцы и башни разных эпох. Успенский собор, построенный итальянским архитектором Аристотелем Фиораванти в XV веке, стал образцом для многих российских храмов."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Сталинские высотки"}]},{"type":"paragraph","content":[{"type":"text","text":"Семь сталинских высоток — визитная карточка Москвы XX века. Эти грандиозные здания в стиле сталинского ампира до сих пор формируют силуэт столицы. Главное здание МГУ на Воробьевых горах — самая высокая из них."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Современная архитектура"}]},{"type":"paragraph","content":[{"type":"text","text":"Деловой центр Москва-Сити демонстрирует современные тенденции в архитектуре. Башня Федерация, башня Меркурий и другие небоскребы создают впечатляющий футуристический пейзаж."}]}]}',
    'Путешествие по самым знаменитым архитектурным достопримечательностям Москвы — от Кремля до Москва-Сити',
    'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&h=600&fit=crop',
    test_author_id,
    'published',
    NOW() - INTERVAL '5 days',
    8,
    'Архитектура Москвы: полный путеводитель',
    'Откройте для себя архитектурные жемчужины Москвы — от исторических памятников до современных небоскребов'
  ) RETURNING id INTO test_post_1_id;

  -- Создаем тестовую статью 2
  INSERT INTO blog_posts (
    title,
    slug,
    content,
    excerpt,
    featured_image_url,
    author_id,
    status,
    published_at,
    reading_time_minutes
  ) VALUES (
    'Модернизм в архитектуре: революция XX века',
    'modernism-architecture-revolution',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Модернизм: новая эра архитектуры"}]},{"type":"paragraph","content":[{"type":"text","text":"Модернизм в архитектуре стал революцией, которая изменила представление о том, какими должны быть здания. Отказ от декора, функциональность, простота форм — вот основные принципы модернизма."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Ле Корбюзье и пять принципов"}]},{"type":"paragraph","content":[{"type":"text","text":"Швейцарско-французский архитектор Ле Корбюзье сформулировал пять принципов современной архитектуры: свободная планировка, свободный фасад, ленточные окна, плоская крыша-терраса и дом на столбах."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Баухаус"}]},{"type":"paragraph","content":[{"type":"text","text":"Немецкая школа Баухаус объединила искусство и ремесло, промышленность и дизайн. Вальтер Гропиус, Мис ван дер Роэ и другие мастера школы создали язык современной архитектуры."}]}]}',
    'История модернизма в архитектуре: от Баухауса до современности. Основные принципы и знаковые здания.',
    'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop',
    test_author_id,
    'published',
    NOW() - INTERVAL '3 days',
    6
  ) RETURNING id INTO test_post_2_id;

  -- Создаем тестовую статью 3 (черновик)
  INSERT INTO blog_posts (
    title,
    slug,
    content,
    excerpt,
    author_id,
    status,
    reading_time_minutes
  ) VALUES (
    'Будущее архитектуры: зеленые здания и устойчивое развитие',
    'future-architecture-green-buildings',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Архитектура будущего"}]},{"type":"paragraph","content":[{"type":"text","text":"Экологичность и устойчивое развитие становятся ключевыми факторами в современной архитектуре. Зеленые здания, использование возобновляемых источников энергии, переработка материалов — все это определяет будущее строительства."}]}]}',
    'Как экологичность и технологии формируют архитектуру будущего',
    test_author_id,
    'draft',
    4
  ) RETURNING id INTO test_post_3_id;

  -- Связываем статьи с тегами
  IF test_tag_architecture_id IS NOT NULL THEN
    INSERT INTO blog_post_tags (post_id, tag_id) VALUES
      (test_post_1_id, test_tag_architecture_id),
      (test_post_2_id, test_tag_architecture_id),
      (test_post_3_id, test_tag_architecture_id);
  END IF;

  IF test_tag_modernism_id IS NOT NULL THEN
    INSERT INTO blog_post_tags (post_id, tag_id) VALUES
      (test_post_2_id, test_tag_modernism_id);
  END IF;

  RAISE NOTICE 'Создано 3 тестовых статьи (2 опубликованных, 1 черновик)';
END $$;

-- 5. Проверяем результат
SELECT
  COUNT(*) AS total_posts,
  COUNT(CASE WHEN status = 'published' THEN 1 END) AS published_posts,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) AS draft_posts
FROM blog_posts;

-- 6. Показываем опубликованные статьи
SELECT
  bp.id,
  bp.title,
  bp.slug,
  bp.excerpt,
  bp.status,
  bp.published_at,
  bp.view_count,
  p.full_name AS author_name
FROM blog_posts bp
LEFT JOIN profiles p ON bp.author_id = p.id
WHERE bp.status = 'published'
ORDER BY bp.published_at DESC;
