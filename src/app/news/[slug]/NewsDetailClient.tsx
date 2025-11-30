'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { NewsArticleWithDetails, getNewsCategoryIcon, ContentBlock } from '@/types/news';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';
import {
  Calendar,
  Eye,
  Heart,
  Bookmark,
  MapPin,
  User,
  Building2,
  ArrowLeft,
  Tag,
  Edit,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import NewsStructuredData from '@/components/news/NewsStructuredData';
import NewsBreadcrumbs, { BreadcrumbsStructuredData } from '@/components/news/NewsBreadcrumbs';
import ContentBlockRenderer from '@/components/news/ContentBlockRenderer';
import ShareButton from '@/components/news/ShareButton';
import RelatedNews from '@/components/news/RelatedNews';
import Header from '@/components/Header';
import EnhancedFooter from '@/components/EnhancedFooter';
import dynamic from 'next/dynamic';

// Динамический импорт карты (только на клиенте)
const NewsObjectsMap = dynamic(
  () => import('@/components/news/NewsObjectsMap'),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 animate-pulse rounded-xl"></div> }
);

interface NewsDetailClientProps {
  slug: string;
}

export default function NewsDetailClient({ slug }: NewsDetailClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [article, setArticle] = useState<NewsArticleWithDetails | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionLoading, setInteractionLoading] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);

  const { user, profile, initialized } = useAuth();
  const router = useRouter();

  // Fetch buildings for header
  useEffect(() => {
    const fetchBuildings = async () => {
      const { data } = await supabase
        .from('buildings')
        .select('*')
        .limit(100);
      setBuildings(data || []);
    };
    fetchBuildings();
  }, [supabase]);

  // ✅ УЛУЧШЕННАЯ ЗАГРУЗКА С ЗДАНИЯМИ
  const fetchArticleWithBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading article with buildings for slug:', slug);
      console.log('👤 Current user:', user ? user.id : 'not authenticated');
      console.log('💼 User role:', profile?.role || 'no role');

      // Шаг 1: Загружаем основную новость
      let query = supabase
        .from('architecture_news')
        .select('*')
        .eq('slug', slug);

      // Применяем фильтры статуса в зависимости от роли
      if (!user) {
        query = query.eq('status', 'published');
        console.log('🔒 Guest filter: only published');
      } else if (['admin', 'moderator', 'editor'].includes(profile?.role || '')) {
        console.log('👑 Admin access: no status filter');
      } else {
        query = query.or(`status.eq.published,and(status.eq.draft,author_id.eq.${user.id}),and(status.eq.review,author_id.eq.${user.id})`);
        console.log('👤 User filter: published + own drafts');
      }

      const { data: newsData, error: newsError } = await query.single();

      if (newsError) {
        if (newsError.code === 'PGRST116') {
          throw new Error('Новость не найдена');
        } else {
          throw new Error(`Ошибка базы данных: ${newsError.message}`);
        }
      }

      if (!newsData) {
        throw new Error('Новость не найдена');
      }

      console.log('✅ Base article loaded:', newsData.title);

      // Проверяем права доступа к неопубликованным статьям
      if (newsData.status !== 'published') {
        const canViewDraft = user && (
          ['admin', 'moderator', 'editor'].includes(profile?.role || '') ||
          newsData.author_id === user.id
        );
        
        if (!canViewDraft) {
          throw new Error('У вас нет прав для просмотра этой новости');
        }
      }

      // Шаг 2: Загружаем связанные здания
      let buildings = [];
      if (newsData.related_buildings && newsData.related_buildings.length > 0) {
        console.log('🏢 Loading related buildings:', newsData.related_buildings);
        
        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name, architect, year_built, city, country, latitude, longitude, image_url, architectural_style') // ✅ Added latitude, longitude for map
          .in('id', newsData.related_buildings);
        
        if (buildingsError) {
          console.error('❌ Error loading buildings:', buildingsError);
        } else {
          console.log('✅ Loaded buildings:', buildingsData?.length || 0);
          buildings = buildingsData || [];
        }
      }

      // Шаг 3: Загружаем информацию об авторе
      let author = null;
      if (newsData.author_id) {
        const { data: authorData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', newsData.author_id)
          .single();
        
        if (authorData) {
          author = authorData;
          console.log('✅ Loaded author:', authorData.full_name);
        }
      }

      // Шаг 4: Загружаем блоки контента
      let blocks: ContentBlock[] = [];
      console.log('📦 Loading content blocks for article:', newsData.id);

      const { data: blocksData, error: blocksError } = await supabase
        .from('news_content_blocks')
        .select('*')
        .eq('news_id', newsData.id)
        .order('order_index', { ascending: true });

      if (blocksError) {
        console.error('❌ Error loading content blocks:', blocksError);
      } else {
        console.log('✅ Loaded content blocks:', blocksData?.length || 0);
        blocks = blocksData || [];
      }

      setContentBlocks(blocks);

      // Шаг 5: Собираем полную статью
      const fullArticle: NewsArticleWithDetails = {
        ...newsData,
        buildings,
        author,
        user_interactions: undefined // Загрузим отдельно если нужно
      };

      setArticle(fullArticle);
      console.log('✅ Full article with buildings loaded successfully');

      // Записываем просмотр
      if (user) {
        recordView(newsData.id);
      }

    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке новости');
    } finally {
      setLoading(false);
    }
  };

  // Запись просмотра через клиентский метод
  const recordView = async (articleId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('news_interactions')
        .upsert({
          news_id: articleId,
          user_id: user.id,
          interaction_type: 'view',
        }, {
          onConflict: 'news_id,user_id,interaction_type'
        });
      
      console.log('✅ View recorded for article:', articleId);
    } catch (error) {
      console.error('❌ Error recording view:', error);
    }
  };

  // Обработка взаимодействий
  const handleInteraction = async (type: 'like' | 'bookmark' | 'share') => {
    if (!user || !article) return;

    try {
      setInteractionLoading(type);

      const response = await fetch('/api/news/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          news_id: article.id,
          interaction_type: type,
          metadata: type === 'share' ? { platform: 'web' } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка взаимодействия');
      }

      const result = await response.json();

      // Обновляем состояние статьи
      setArticle(prev => {
        if (!prev) return prev;
        
        const newUserInteractions = { ...prev.user_interactions };
        const newArticle = { ...prev };

        if (type === 'like') {
          newUserInteractions.liked = !result.removed;
          newArticle.likes_count += result.removed ? -1 : 1;
        } else if (type === 'bookmark') {
          newUserInteractions.bookmarked = !result.removed;
        } else if (type === 'share') {
          newUserInteractions.shared = true;
          newArticle.shares_count += 1;
        }

        return {
          ...newArticle,
          user_interactions: newUserInteractions,
        };
      });

    } catch (error) {
      console.error('Ошибка взаимодействия:', error);
    } finally {
      setInteractionLoading(null);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Проверка прав на редактирование
  const canEdit = article && user && (
    ['admin', 'moderator', 'editor'].includes(profile?.role || '') ||
    (article.author_id === user.id && ['draft', 'review'].includes(article.status))
  );

  useEffect(() => {
    if (initialized) {
      console.log('🚀 Auth initialized, fetching article with buildings...');
      fetchArticleWithBuildings();
    } else {
      console.log('⏳ Waiting for auth initialization...');
    }
  }, [slug, initialized, user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4 w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-600 mb-4">{error || 'Новость не найдена'}</p>
              <div className="space-y-2">
                <button
                  onClick={() => router.back()}
                  className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Назад
                </button>
                <Link
                  href="/news"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Все новости
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* JSON-LD для поисковых систем */}
      <NewsStructuredData article={article} />
      <BreadcrumbsStructuredData article={article} />

      <div className="min-h-screen bg-gray-50">
        {/* Sticky Header */}
        <Header buildings={buildings} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Хлебные крошки */}
        <NewsBreadcrumbs article={article} className="mb-4" />
        
        {/* Навигация */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/news"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Все новости
            </Link>
            
            {canEdit && (
              <Link
                href={`/admin/news/${article.id}/edit`}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Редактировать
              </Link>
            )}
          </div>
        </div>

        {/* Основной контент */}
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Главное изображение */}
          {article.featured_image_url && (
            <div className="relative h-96 overflow-hidden">
              <Image
                src={article.featured_image_url}
                alt={article.featured_image_alt || article.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              />
              
              {/* Категория */}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="text-lg">{getNewsCategoryIcon(article.category)}</span>
                  {article.category === 'projects' && 'Архитектурные проекты'}
                  {article.category === 'events' && 'События'}
                  {article.category === 'personalities' && 'Персоналии'}
                  {article.category === 'trends' && 'Тренды'}
                  {article.category === 'planning' && 'Городское планирование'}
                  {article.category === 'heritage' && 'Наследие'}
                </span>
              </div>

              {/* Featured метка */}
              {article.featured && (
                <div className="absolute top-4 right-4">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                    ⭐ Главная новость
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="p-8">
            
            {/* Заголовок */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Краткое описание */}
            {article.summary && (
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                {article.summary}
              </p>
            )}

            {/* Метаданные */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
              {/* Статус новости */}
              {article.status !== 'published' && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    article.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    article.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {article.status === 'draft' && 'Черновик'}
                    {article.status === 'review' && 'На модерации'}
                    {article.status === 'archived' && 'Архивировано'}
                  </span>
                </div>
              )}
              
              {article.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
              )}

              {article.created_at && !article.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Создано: {formatDate(article.created_at)}</span>
                </div>
              )}

              {article.author && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{article.author.full_name}</span>
                </div>
              )}

              {article.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{article.city}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>~{Math.max(1, Math.round(article.content.length / 1000))} мин чтения</span>
              </div>
            </div>

            {/* Взаимодействия */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">

                {/* Лайк */}
                <button
                  onClick={() => handleInteraction('like')}
                  disabled={!user || interactionLoading === 'like'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    article.user_interactions?.liked
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  <Heart className={`w-4 h-4 ${article.user_interactions?.liked ? 'fill-current' : ''}`} />
                  <span>{article.likes_count || 0}</span>
                </button>

                {/* Закладка */}
                <button
                  onClick={() => handleInteraction('bookmark')}
                  disabled={!user || interactionLoading === 'bookmark'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    article.user_interactions?.bookmarked
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  <Bookmark className={`w-4 h-4 ${article.user_interactions?.bookmarked ? 'fill-current' : ''}`} />
                  <span>В закладки</span>
                </button>

                {/* Поделиться - используем новый ShareButton */}
                <ShareButton
                  article={article}
                  onShare={() => handleInteraction('share')}
                  variant="default"
                />
              </div>

              {/* Просмотры */}
              <div className="flex items-center gap-2 text-gray-500">
                <Eye className="w-4 h-4" />
                <span>{article.views_count || 0} просмотров</span>
              </div>
            </div>

            {/* Основной контент */}
            {contentBlocks.length > 0 ? (
              // Используем новую систему блоков контента
              <div className="mb-8 space-y-6">
                {contentBlocks.map((block) => (
                  <ContentBlockRenderer key={block.id} block={block} />
                ))}
              </div>
            ) : (
              // Fallback на старый формат для статей без блоков
              <>
                <div className="prose prose-lg max-w-none mb-8">
                  {article.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>

                {/* Галерея изображений (старый формат) */}
                {article.gallery_images && article.gallery_images.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Галерея изображений
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {article.gallery_images.map((imageUrl, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer">
                          <Image
                            src={imageUrl}
                            alt={`Изображение ${index + 1} к статье`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                              <Eye className="w-5 h-5 text-gray-700" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Связанные здания */}
            {article.buildings && article.buildings.length > 0 && (
              <div className="mb-8 space-y-6">
                {/* Список зданий */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Упоминаемые здания ({article.buildings.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {article.buildings.map((building) => (
                      <Link
                        key={building.id}
                        href={`/buildings/${building.id}`}
                        className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 group transform hover:-translate-y-1 hover:shadow-md"
                      >
                        {building.image_url && (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={building.image_url}
                              alt={building.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              sizes="80px"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                            {building.name}
                          </h4>
                          {building.architect && (
                            <p className="text-sm text-gray-600 mb-1">
                              Архитектор: {building.architect}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {building.year_built && (
                              <span>{building.year_built} г.</span>
                            )}
                            {building.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {building.city}
                              </span>
                            )}
                            {building.architectural_style && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {building.architectural_style}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Карта со зданиями */}
                <NewsObjectsMap
                  buildings={article.buildings}
                  onBuildingClick={(buildingId) => router.push(`/buildings/${buildingId}`)}
                />
              </div>
            )}

            {/* Теги */}
            {article.tags && article.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Теги
                </h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/news?tags=${encodeURIComponent(tag)}`}
                      className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors transform hover:scale-105"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </article>

        {/* Похожие новости */}
        <div className="mt-8">
          <RelatedNews
            newsId={article.id}
            limit={6}
            title="Похожие новости"
          />
        </div>

        {/* Навигация между статьями */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/news"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Все новости
          </Link>
        </div>

        </div>

        {/* Footer */}
        <EnhancedFooter />
      </div>
    </>
  );
}
