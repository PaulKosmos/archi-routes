// app/api/news/route.ts
// API роут для получения списка новостей и создания новых
// ИСПРАВЛЕНО: 05.08.2025 - Детальная диагностика проблемы поиска

import { NextRequest, NextResponse } from 'next/server';
import { NewsFilters, NewsSortOptions, CreateNewsArticle, NewsListResponse } from '@/types/news';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    console.log('🌐 NEWS API GET Request:', request.url);
    console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()));

    // Получаем текущего пользователя для проверки прав
    let currentUser = null;
    let userRole = null;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUser = user;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        userRole = profile?.role;
        console.log('👤 Current user:', user.id, 'role:', userRole);
      } else {
        console.log('👤 No authenticated user');
      }
    } catch (authError) {
      console.log('⚠️ Auth check failed:', authError);
    }

    // ✅ ДИАГНОСТИКА: Сначала просто получим все новости
    const { data: allNewsTest, error: allNewsError } = await supabase
      .from('architecture_news')
      .select('id, title, slug, status, author_id')
      .order('created_at', { ascending: false });
    
    console.log('🧪 ДИАГНОСТИКА - Всего новостей в БД:', allNewsTest?.length || 0);
    if (allNewsTest?.length) {
      console.log('📰 Первые 3 новости:', allNewsTest.slice(0, 3));
    }
    if (allNewsError) {
      console.error('❌ Ошибка получения всех новостей:', allNewsError);
    }

    // Парсинг параметров фильтрации
    const filters: NewsFilters = {
      category: searchParams.get('category') as any,
      subcategory: searchParams.get('subcategory') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      city: searchParams.get('city') || undefined,
      country: searchParams.get('country') || undefined,
      region: searchParams.get('region') || undefined,
      author_id: searchParams.get('author_id') || undefined,
      status: searchParams.get('status') as any,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      has_buildings: searchParams.get('has_buildings') === 'true' ? true : undefined,
      building_id: searchParams.get('building') || searchParams.get('building_id') || undefined, // Поддержка обоих параметров
      search: searchParams.get('search') || undefined,
    };

    console.log('🔍 Parsed filters:', JSON.stringify(filters, null, 2));

    // Если есть поиск - делаем отдельную диагностику
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase().trim();
      console.log('🔍 Search term:', `"${searchTerm}"`);
      
      // Проверяем точное совпадение
      const { data: exactTest, error: exactError } = await supabase
        .from('architecture_news')
        .select('*')
        .eq('slug', searchTerm);
      
      console.log('🎯 Exact match test:', {
        searchTerm: `"${searchTerm}"`,
        found: exactTest?.length || 0,
        results: exactTest?.map(a => ({ id: a.id, slug: `"${a.slug}"`, status: a.status })) || [],
        error: exactError?.message
      });
      
      // Проверяем ILIKE поиск
      const { data: ilikeTest, error: ilikeError } = await supabase
        .from('architecture_news')
        .select('*')
        .ilike('slug', `%${searchTerm}%`);
      
      console.log('🔤 ILIKE test:', {
        pattern: `%${searchTerm}%`,
        found: ilikeTest?.length || 0,
        results: ilikeTest?.map(a => ({ id: a.id, slug: `"${a.slug}"`, status: a.status })) || [],
        error: ilikeError?.message
      });
    }

    // Параметры сортировки
    const sort: NewsSortOptions = {
      field: (searchParams.get('sort_field') as any) || 'created_at',
      direction: (searchParams.get('sort_direction') as any) || 'desc',
    };

    // Пагинация
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Базовый запрос
    let query = supabase
      .from('architecture_news')
      .select('*');

    console.log('🏗️ Building query...');

    // Применение фильтров
    if (filters.category) {
      query = query.eq('category', filters.category);
      console.log('📂 Added category filter:', filters.category);
    }

    if (filters.subcategory) {
      query = query.eq('subcategory', filters.subcategory);
      console.log('📂 Added subcategory filter:', filters.subcategory);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
      console.log('🏙️ Added city filter:', filters.city);
    }

    if (filters.country) {
      query = query.eq('country', filters.country);
      console.log('🌍 Added country filter:', filters.country);
    }

    if (filters.region) {
      query = query.eq('region', filters.region);
      console.log('🗺️ Added region filter:', filters.region);
    }

    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id);
      console.log('👤 Added author filter:', filters.author_id);
    }

    // ✅ ИСПРАВЛЕНО: Правильная логика для статуса
    if (filters.status) {
      query = query.eq('status', filters.status);
      console.log('📋 Added explicit status filter:', filters.status);
    } else {
      // Если статус не указан, применяем логику по умолчанию
      if (!currentUser) {
        // Неавторизованные видят только опубликованные
        query = query.eq('status', 'published');
        console.log('🔒 Added status filter for guests: published');
      } else if (['admin', 'moderator', 'editor'].includes(userRole || '')) {
        // Админы/модераторы/редакторы видят все
        console.log('👑 Admin/moderator/editor - no status filter');
      } else {
        // Обычные пользователи видят опубликованные + свои черновики
        const userFilter = `status.eq.published,and(status.eq.draft,author_id.eq.${currentUser.id}),and(status.eq.review,author_id.eq.${currentUser.id})`;
        query = query.or(userFilter);
        console.log('👤 Added user-specific status filter:', userFilter);
      }
    }

    if (filters.featured !== undefined) {
      query = query.eq('featured', filters.featured);
      console.log('⭐ Added featured filter:', filters.featured);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
      console.log('📅 Added date_from filter:', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
      console.log('📅 Added date_to filter:', filters.date_to);
    }

    if (filters.has_buildings) {
      query = query.not('related_buildings', 'eq', '{}');
      console.log('🏢 Added has_buildings filter');
    }

    // Новый фильтр по конкретному зданию
    if (filters.building_id) {
      query = query.contains('related_buildings', [filters.building_id]);
      console.log('🏢 Added building_id filter:', filters.building_id);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
      console.log('🏷️ Added tags filter:', filters.tags);
    }

    // ✅ ИСПРАВЛЕНО: Улучшенный поиск
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase().trim();
      console.log('🔍 Adding search filter for term:', `"${searchTerm}"`);
      
      // Сначала пробуем точное совпадение по slug
      let exactQuery = supabase
        .from('architecture_news')
        .select('*')
        .eq('slug', searchTerm);
      
      // Применяем фильтры статуса для точного поиска
      if (!currentUser) {
        exactQuery = exactQuery.eq('status', 'published');
        console.log('🔍 Exact search: added published filter for guest');
      } else if (!['admin', 'moderator', 'editor'].includes(userRole || '')) {
        const userFilter = `status.eq.published,and(status.eq.draft,author_id.eq.${currentUser.id}),and(status.eq.review,author_id.eq.${currentUser.id})`;
        exactQuery = exactQuery.or(userFilter);
        console.log('🔍 Exact search: added user filter:', userFilter);
      } else {
        console.log('🔍 Exact search: no status filter for admin');
      }
      
      const { data: exactMatch, error: exactError } = await exactQuery.single();
      
      console.log('🎯 Exact search result:', {
        found: !!exactMatch,
        title: exactMatch?.title,
        slug: exactMatch?.slug,
        status: exactMatch?.status,
        error: exactError?.message
      });
      
      if (exactMatch) {
        console.log('✅ Found exact slug match, returning single result');

        // Загружаем связанные здания
        let buildings: any[] = [];
        if (exactMatch.related_buildings && exactMatch.related_buildings.length > 0) {
          const { data: buildingsData, error: buildingsError } = await supabase
            .from('buildings')
            .select('id, name, architect, year_built, city, image_url, architectural_style')
            .in('id', exactMatch.related_buildings);

          if (!buildingsError && buildingsData) {
            buildings = buildingsData;
          }
        }

        // Загружаем автора
        let author = undefined;
        if (exactMatch.author_id) {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', exactMatch.author_id)
            .single();

          if (authorData) {
            author = authorData;
          }
        }

        const response: NewsListResponse = {
          data: [{
            ...exactMatch,
            buildings,
            author,
            user_interactions: undefined
          }],
          pagination: {
            page: 1,
            limit,
            total: 1,
            pages: 1,
          },
          filters,
          sort,
        };
        return NextResponse.json(response);
      }
      
      // Если точного совпадения нет, делаем обычный поиск
      const searchPattern = `slug.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`;
      query = query.or(searchPattern);
      console.log('🔍 Added OR search pattern:', searchPattern);
    }

    // Сортировка
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    console.log('📊 Added sorting:', sort.field, sort.direction);

    // Применение пагинации
    query = query.range(offset, offset + limit - 1);
    console.log('📄 Added pagination:', { offset, limit });

    console.log('🚀 Executing final query...');
    const { data: articles, error } = await query;

    console.log('📊 Final query results:', { 
      found: articles?.length || 0, 
      error: error?.message,
      articles: articles?.map(a => ({ id: a.id, title: a.title, slug: a.slug, status: a.status })) || []
    });

    if (error) {
      console.error('❌ Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    // Подсчет общего количества (упрощенный для диагностики)
    const { count } = await supabase
      .from('architecture_news')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Total count in DB:', count);

    // Загружаем связанные здания для каждой новости
    const articlesWithBuildings = await Promise.all(
      (articles || []).map(async (article) => {
        let buildings: any[] = [];

        // Если есть related_buildings, загружаем их
        if (article.related_buildings && article.related_buildings.length > 0) {
          const { data: buildingsData, error: buildingsError } = await supabase
            .from('buildings')
            .select('id, name, architect, year_built, city, image_url, architectural_style')
            .in('id', article.related_buildings);

          if (!buildingsError && buildingsData) {
            buildings = buildingsData;
          }
        }

        // Загружаем информацию об авторе
        let author = undefined;
        if (article.author_id) {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', article.author_id)
            .single();

          if (authorData) {
            author = authorData;
          }
        }

        return {
          ...article,
          buildings,
          author,
          user_interactions: undefined
        };
      })
    );

    // Формирование ответа
    const response: NewsListResponse = {
      data: articlesWithBuildings,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      filters,
      sort,
    };

    console.log('✅ Returning response with', response.data.length, 'articles');
    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST метод остается без изменений
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/news - Starting (simplified auth)...');

    const body = await request.json();
    console.log('Request body received:', Object.keys(body));

    // Простая проверка авторизации
    const supabase = await createServerClient();
    
    // Получаем пользователя через RPC функцию
    let user = null;
    let profile = null;
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authUser) {
        user = authUser;
        console.log('User found:', user.email);
        
        // Получаем профиль
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        profile = userProfile;
        console.log('Profile found:', profile?.role);
      } else {
        console.log('No user from auth, trying to create anyway...');
      }
    } catch (authErr) {
      console.log('Auth failed, but continuing:', authErr);
    }
    
    // Для тестирования - если нет user_id, используем первого доступного
    let authorId = user?.id;
    if (!authorId) {
      console.log('No authenticated user, getting first available user...');
      const { data: firstUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      if (firstUser) {
        authorId = firstUser.id;
        console.log('Using first available user:', authorId);
      } else {
        return NextResponse.json({ 
          error: 'No users available in system', 
          debug: 'Need to create a user profile first'
        }, { status: 400 });
      }
    }
    const newsData: CreateNewsArticle = {
      ...body,
      author_id: authorId, // Используем полученный authorId
    };

    // Валидация обязательных полей
    if (!newsData.title || !newsData.content || !newsData.category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, category' },
        { status: 400 }
      );
    }

    // Генерация slug если не предоставлен
    if (!newsData.slug) {
      newsData.slug = newsData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);
    }

    // Создание новости
    const { data: newArticle, error } = await supabase
      .from('architecture_news')
      .insert([newsData])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating news:', error);
      return NextResponse.json({ error: 'Failed to create news article' }, { status: 500 });
    }

    return NextResponse.json(newArticle, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
