// app/api/buildings/search/route.ts
// API роут для поиска зданий (упрощенный для админки новостей)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// Helper function to normalize city name using database function
async function getNormalizedCity(supabase: any, cityName: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('normalize_city_name', { city_name: cityName });

  if (error) {
    console.warn('Error normalizing city name:', error);
    return cityName.toLowerCase();
  }

  return data || cityName.toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/buildings/search - Starting (simplified)...');
    const { searchParams } = new URL(request.url);

    // Создаем серверный клиент
    const supabase = await createServerClient();

    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('Building search query:', query);

    if (query.length < 2) {
      return NextResponse.json({ buildings: [] });
    }

    // Простой поиск по зданиям без проверки авторизации
    // Используем нормализацию для поиска по городам
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, architect, city, main_image_url, year_built')
      .or(`name.ilike.%${query}%, architect.ilike.%${query}%, city_normalized.eq.${await getNormalizedCity(supabase, query)}`)
      .limit(limit);

    // Fallback: if no results, try regular search
    if (!buildings || buildings.length === 0) {
      const { data: fallbackBuildings, error: fallbackError } = await supabase
        .from('buildings')
        .select('id, name, architect, city, main_image_url, year_built')
        .or(`name.ilike.%${query}%, architect.ilike.%${query}%, city.ilike.%${query}%`)
        .limit(limit);

      if (!fallbackError && fallbackBuildings) {
        return NextResponse.json({ buildings: fallbackBuildings });
      }
    }

    if (error) {
      console.error('Error searching buildings:', error);
      return NextResponse.json({ error: 'Failed to search buildings' }, { status: 500 });
    }

    return NextResponse.json({ buildings: buildings || [] });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
