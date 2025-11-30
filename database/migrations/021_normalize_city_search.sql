-- Migration: Normalize city search for multilingual support
-- Date: 2025-11-24
-- Description: Enables accent-insensitive and transliteration-aware city searches
-- Handles "Берлин" and "Berlin" as the same city

-- 1. Enable the unaccent extension for accent-insensitive searches
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create a function to normalize city names for searching
-- This handles: accents, case, and common Cyrillic<->Latin transliterations
CREATE OR REPLACE FUNCTION normalize_city_name(city_name TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF city_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Start with the input
  normalized := city_name;
  
  -- Convert to lowercase
  normalized := LOWER(normalized);
  
  -- Remove accents and diacritics
  normalized := unaccent(normalized);
  
  -- Apply common Cyrillic to Latin transliterations
  -- Russian/Cyrillic alphabet
  normalized := REPLACE(normalized, 'а', 'a');
  normalized := REPLACE(normalized, 'б', 'b');
  normalized := REPLACE(normalized, 'в', 'v');
  normalized := REPLACE(normalized, 'г', 'g');
  normalized := REPLACE(normalized, 'д', 'd');
  normalized := REPLACE(normalized, 'е', 'e');
  normalized := REPLACE(normalized, 'ё', 'e');
  normalized := REPLACE(normalized, 'ж', 'zh');
  normalized := REPLACE(normalized, 'з', 'z');
  normalized := REPLACE(normalized, 'и', 'i');
  normalized := REPLACE(normalized, 'й', 'i');
  normalized := REPLACE(normalized, 'к', 'k');
  normalized := REPLACE(normalized, 'л', 'l');
  normalized := REPLACE(normalized, 'м', 'm');
  normalized := REPLACE(normalized, 'н', 'n');
  normalized := REPLACE(normalized, 'о', 'o');
  normalized := REPLACE(normalized, 'п', 'p');
  normalized := REPLACE(normalized, 'р', 'r');
  normalized := REPLACE(normalized, 'с', 's');
  normalized := REPLACE(normalized, 'т', 't');
  normalized := REPLACE(normalized, 'у', 'u');
  normalized := REPLACE(normalized, 'ф', 'f');
  normalized := REPLACE(normalized, 'х', 'kh');
  normalized := REPLACE(normalized, 'ц', 'ts');
  normalized := REPLACE(normalized, 'ч', 'ch');
  normalized := REPLACE(normalized, 'ш', 'sh');
  normalized := REPLACE(normalized, 'щ', 'shch');
  normalized := REPLACE(normalized, 'ъ', '');
  normalized := REPLACE(normalized, 'ы', 'y');
  normalized := REPLACE(normalized, 'ь', '');
  normalized := REPLACE(normalized, 'э', 'e');
  normalized := REPLACE(normalized, 'ю', 'yu');
  normalized := REPLACE(normalized, 'я', 'ya');
  
  -- Ukrainian specific characters
  normalized := REPLACE(normalized, 'є', 'ye');
  normalized := REPLACE(normalized, 'і', 'i');
  normalized := REPLACE(normalized, 'ї', 'yi');
  normalized := REPLACE(normalized, 'ґ', 'g');
  
  -- Remove extra whitespace
  normalized := TRIM(normalized);
  normalized := REGEXP_REPLACE(normalized, '\s+', ' ', 'g');
  
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Add a normalized city column to the buildings table (generated column)
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS city_normalized TEXT 
GENERATED ALWAYS AS (normalize_city_name(city)) STORED;

-- 4. Create an index on the normalized city column for fast searches
CREATE INDEX IF NOT EXISTS idx_buildings_city_normalized 
ON buildings(city_normalized);

-- 5. Add comment explaining the column
COMMENT ON COLUMN buildings.city_normalized IS 
'Normalized city name for accent-insensitive and transliteration-aware searches. Auto-generated from city column.';

-- 6. Create a table for known city name variants (optional, for future enhancement)
CREATE TABLE IF NOT EXISTS city_name_variants (
  id SERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  language_code VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_name)
);

-- 7. Create index on variants table
CREATE INDEX IF NOT EXISTS idx_city_variants_canonical 
ON city_name_variants(canonical_name);

CREATE INDEX IF NOT EXISTS idx_city_variants_variant 
ON city_name_variants(variant_name);

-- 8. Add some common city name mappings
INSERT INTO city_name_variants (canonical_name, variant_name, language_code) VALUES
  ('berlin', 'берлин', 'ru'),
  ('berlin', 'berlin', 'en'),
  ('berlin', 'berlín', 'es'),
  ('moscow', 'москва', 'ru'),
  ('moscow', 'moscow', 'en'),
  ('moscow', 'moscú', 'es'),
  ('kyiv', 'київ', 'uk'),
  ('kyiv', 'киев', 'ru'),
  ('kyiv', 'kyiv', 'en'),
  ('kyiv', 'kiev', 'en'),
  ('prague', 'praha', 'cs'),
  ('prague', 'prague', 'en'),
  ('prague', 'прага', 'ru'),
  ('paris', 'париж', 'ru'),
  ('paris', 'paris', 'en'),
  ('paris', 'parís', 'es'),
  ('vienna', 'wien', 'de'),
  ('vienna', 'vienna', 'en'),
  ('vienna', 'вена', 'ru'),
  ('rome', 'roma', 'it'),
  ('rome', 'rome', 'en'),
  ('rome', 'рим', 'ru'),
  ('london', 'london', 'en'),
  ('london', 'лондон', 'ru'),
  ('barcelona', 'barcelona', 'es'),
  ('barcelona', 'барселона', 'ru'),
  ('amsterdam', 'amsterdam', 'nl'),
  ('amsterdam', 'амстердам', 'ru'),
  ('saint petersburg', 'санкт-петербург', 'ru'),
  ('saint petersburg', 'saint petersburg', 'en'),
  ('saint petersburg', 'petersburg', 'en')
ON CONFLICT (variant_name) DO NOTHING;

-- 9. Helper function to search cities by normalized name or variant
CREATE OR REPLACE FUNCTION find_city_canonical_name(search_term TEXT)
RETURNS TEXT AS $$
DECLARE
  canonical TEXT;
  normalized_search TEXT;
BEGIN
  -- Normalize the search term
  normalized_search := normalize_city_name(search_term);
  
  -- Try to find a canonical name from variants
  SELECT canonical_name INTO canonical
  FROM city_name_variants
  WHERE normalize_city_name(variant_name) = normalized_search
  LIMIT 1;
  
  -- If found, return canonical name, otherwise return normalized search
  RETURN COALESCE(canonical, normalized_search);
END;
$$ LANGUAGE plpgsql STABLE;

-- Information about migration
SELECT 'Migration 021: City name normalization completed successfully' as status;
SELECT 'Buildings with cities: ' || COUNT(*) FROM buildings WHERE city IS NOT NULL;
SELECT 'Unique normalized cities: ' || COUNT(DISTINCT city_normalized) FROM buildings WHERE city_normalized IS NOT NULL;
