// Тестовый API для диагностики новостей
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || 'test-news-draft';

    console.log('🧪 TEST API: Looking for slug:', slug);

    // Прямой запрос к таблице
    const { data: allNews, error: allError } = await supabase
      .from('architecture_news')
      .select('id, title, slug, status, author_id, created_at')
      .order('created_at', { ascending: false });

    console.log('📊 All news count:', allNews?.length || 0);
    console.log('📝 All news:', allNews?.slice(0, 5)); // Первые 5

    // Поиск конкретного slug
    const { data: specificNews, error: specificError } = await supabase
      .from('architecture_news')
      .select('*')
      .eq('slug', slug);

    console.log('🎯 Specific search for slug:', slug);
    console.log('📄 Found specific news:', specificNews);

    // Поиск с LIKE
    const { data: likeNews, error: likeError } = await supabase
      .from('architecture_news')
      .select('*')
      .ilike('slug', `%${slug}%`);

    console.log('🔤 LIKE search results:', likeNews);

    return NextResponse.json({
      slug,
      total_news: allNews?.length || 0,
      first_5_news: allNews?.slice(0, 5),
      exact_match: specificNews,
      like_matches: likeNews,
      errors: {
        all: allError,
        specific: specificError,
        like: likeError
      }
    });

  } catch (error) {
    console.error('🚨 Test API Error:', error);
    return NextResponse.json(
      { error: 'Test API failed', details: error },
      { status: 500 }
    );
  }
}
