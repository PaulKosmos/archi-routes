-- $C=:F8O 4;O 0B><0@=>3> C25;8G5=8O AG5BG8:0 ?@>A<>B@>2 =>2>AB8
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- B><0@=> C25;8G8205< AG5BG8: ?@>A<>B@>2
  UPDATE architecture_news
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = news_id;
END;
$$;

-- 05< ?@020 =0 2K?>;=5=85 DC=:F88 4;O 0=>=8<=KE ?>;L7>20B5;59 8 02B>@87>20==KE
GRANT EXECUTE ON FUNCTION increment_news_views(UUID) TO anon, authenticated;

-- ><<5=B0@89 : DC=:F88
COMMENT ON FUNCTION increment_news_views IS 'B><0@=> C25;8G8205B AG5BG8: ?@>A<>B@>2 =>2>AB8. >ABC?=> 4;O 2A5E ?>;L7>20B5;59.';
