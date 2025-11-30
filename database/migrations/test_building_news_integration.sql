-- Test migration: Create a building in Berlin and link it to the Berlin news article
-- This tests the building-news integration (Stage 6)

-- First, check if we have the Berlin news article
DO $$
DECLARE
  v_news_id UUID;
  v_building_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the Berlin news article ID
  SELECT id INTO v_news_id
  FROM news_articles
  WHERE slug = 'sustainable-architecture-berlin-2025'
  LIMIT 1;

  -- Get any existing user to be the creator
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;

  IF v_news_id IS NULL THEN
    RAISE NOTICE 'Berlin news article not found!';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Berlin news article: %', v_news_id;

  -- Create a test building in Berlin (if it doesn't exist)
  INSERT INTO buildings (
    id,
    name,
    city,
    country,
    latitude,
    longitude,
    description,
    architect,
    year_built,
    architectural_style,
    image_url,
    created_by,
    moderation_status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Берлинский центр устойчивой архитектуры',
    'Берлин',
    'Германия',
    52.5200,
    13.4050,
    'Инновационный центр, демонстрирующий концепции устойчивого строительства с использованием 100% переработанных материалов. Здание является примером применения новых энергоэффективных решений.',
    'Schmidt & Partners',
    2025,
    'Современная архитектура',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    v_user_id,
    'approved',
    NOW(),
    NOW()
  )
  ON CONFLICT (name, city) DO NOTHING
  RETURNING id INTO v_building_id;

  IF v_building_id IS NULL THEN
    -- Building already exists, get its ID
    SELECT id INTO v_building_id
    FROM buildings
    WHERE name = 'Берлинский центр устойчивой архитектуры'
    AND city = 'Берлин'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Building ID: %', v_building_id;

  -- Link the building to the news article
  INSERT INTO news_article_buildings (
    news_article_id,
    building_id,
    created_at
  ) VALUES (
    v_news_id,
    v_building_id,
    NOW()
  )
  ON CONFLICT (news_article_id, building_id) DO NOTHING;

  RAISE NOTICE '✅ Successfully linked building % to news article %', v_building_id, v_news_id;

END $$;

-- Verify the link
SELECT
  na.title AS news_title,
  na.slug AS news_slug,
  b.name AS building_name,
  b.city AS building_city,
  nab.created_at AS linked_at
FROM news_article_buildings nab
JOIN news_articles na ON na.id = nab.news_article_id
JOIN buildings b ON b.id = nab.building_id
WHERE na.slug = 'sustainable-architecture-berlin-2025';
