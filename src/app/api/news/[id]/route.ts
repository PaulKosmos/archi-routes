// app/api/news/[id]/route.ts
// API роут для работы с конкретной новостью

import { NextRequest, NextResponse } from 'next/server';
import { UpdateNewsArticle } from '@/types/news';
import { createServerClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    // Получение новости - упрощенный запрос без JOIN на profiles пока
    const { data: article, error } = await supabase
      .from('architecture_news')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 });
    }

    // Попробуем получить информацию об авторе отдельно
    let authorInfo = null;
    let editorInfo = null;

    if (article.author_id) {
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', article.author_id)
        .single();
      
      authorInfo = authorProfile;
    }

    if (article.editor_id) {
      const { data: editorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', article.editor_id)
        .single();
      
      editorInfo = editorProfile;
    }

    // Получение связанных зданий
    const { data: buildingRelations } = await supabase
      .from('news_building_relations')
      .select(`
        relation_type,
        description,
        building:buildings!building_id(
          id,
          name,
          architect,
          year_built,
          style,
          city,
          main_image_url
        )
      `)
      .eq('news_id', id);

    // Получение взаимодействий текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    let userInteractions = null;

    if (user) {
      const { data: interactions } = await supabase
        .from('news_interactions')
        .select('interaction_type')
        .eq('news_id', id)
        .eq('user_id', user.id);

      userInteractions = {
        liked: interactions?.some(i => i.interaction_type === 'like') || false,
        bookmarked: interactions?.some(i => i.interaction_type === 'bookmark') || false,
        shared: interactions?.some(i => i.interaction_type === 'share') || false,
      };

      // Записываем просмотр
      await supabase
        .from('news_interactions')
        .upsert({
          news_id: id,
          user_id: user.id,
          interaction_type: 'view',
        });
    }

    // Формирование полного ответа
    const articleWithDetails = {
      ...article,
      author: authorInfo,
      editor: editorInfo,
      buildings: buildingRelations?.map(rel => ({
        ...rel.building,
        relation_type: rel.relation_type,
        relation_description: rel.description,
      })) || [],
      user_interactions: userInteractions,
    };

    return NextResponse.json(articleWithDetails);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получение текущей новости
    const { data: currentArticle, error: fetchError } = await supabase
      .from('architecture_news')
      .select('author_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentArticle) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 });
    }

    // Проверка прав на редактирование
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canEdit = 
      ['editor', 'moderator', 'admin'].includes(profile?.role) ||
      (currentArticle.author_id === user.id && currentArticle.status === 'draft');

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Partial<UpdateNewsArticle> = {
      ...body,
      editor_id: user.id !== currentArticle.author_id ? user.id : undefined,
    };

    // Если редактор публикует статью
    if (updateData.status === 'published' && currentArticle.status !== 'published') {
      updateData.published_at = new Date().toISOString();
    }

    // Обновление новости
    const { data: updatedArticle, error } = await supabase
      .from('architecture_news')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating news:', error);
      return NextResponse.json({ error: 'Failed to update news article' }, { status: 500 });
    }

    return NextResponse.json(updatedArticle);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверка роли (только админы могут удалять)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete news articles' }, { status: 403 });
    }

    // Удаление новости (связанные записи удалятся автоматически из-за CASCADE)
    const { error } = await supabase
      .from('architecture_news')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting news:', error);
      return NextResponse.json({ error: 'Failed to delete news article' }, { status: 500 });
    }

    return NextResponse.json({ message: 'News article deleted successfully' });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
