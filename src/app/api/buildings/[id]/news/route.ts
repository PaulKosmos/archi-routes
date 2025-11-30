// app/api/buildings/[id]/news/route.ts
// API endpoint для получения новостей, связанных с конкретным зданием

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { id: buildingId } = await params;

  console.log(`🏛️ Fetching news for building: ${buildingId}`);

  try {
    // Получаем новости, связанные с этим зданием через related_buildings array
    const { data: newsArticles, error } = await supabase
      .from('architecture_news')
      .select('*')
      .contains('related_buildings', [buildingId])
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching news:', error);
      throw error;
    }

    console.log(`✅ Found ${newsArticles?.length || 0} news articles for building ${buildingId}`);

    return NextResponse.json({
      success: true,
      count: newsArticles?.length || 0,
      news: newsArticles || []
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch news'
      },
      { status: 500 }
    );
  }
}
