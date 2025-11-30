// app/api/news/interactions/route.ts
// API роут для работы с взаимодействиями пользователей

import { NextRequest, NextResponse } from 'next/server';
import { CreateNewsInteraction } from '@/types/news';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const interactionData: CreateNewsInteraction = {
      ...body,
      user_id: user.id,
    };

    // Валидация
    if (!interactionData.news_id || !interactionData.interaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: news_id, interaction_type' },
        { status: 400 }
      );
    }

    // Для лайков и закладок используем upsert (может быть только один)
    if (['like', 'bookmark'].includes(interactionData.interaction_type)) {
      const { data: existing } = await supabase
        .from('news_interactions')
        .select('id')
        .eq('news_id', interactionData.news_id)
        .eq('user_id', user.id)
        .eq('interaction_type', interactionData.interaction_type)
        .single();

      if (existing) {
        // Удаляем существующее взаимодействие (toggle)
        const { error } = await supabase
          .from('news_interactions')
          .delete()
          .eq('id', existing.id);

        if (error) {
          return NextResponse.json({ error: 'Failed to remove interaction' }, { status: 500 });
        }

        return NextResponse.json({ removed: true });
      }
    }

    // Создание нового взаимодействия
    const { data: interaction, error } = await supabase
      .from('news_interactions')
      .insert([interactionData])
      .select()
      .single();

    if (error) {
      console.error('Error creating interaction:', error);
      return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
    }

    return NextResponse.json(interaction, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
