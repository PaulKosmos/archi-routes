'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { NewsArticleWithDetails, getNewsCategoryIcon, ContentBlock } from '@/types/news';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Глобальный Set для отслеживания просмотренных новостей в текущей сессии
const viewedNews = new Set<string>();

// Компонент ScrollToTop с "убеганием" от курсора
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [buttonBottom, setButtonBottom] = useState(32) // 32px = 2rem (default bottom-8)
  const [buttonRight, setButtonRight] = useState(0) // смещение по горизонтали
  const [isRunningAway, setIsRunningAway] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      // Показываем кнопку после прокрутки 300px
      setIsVisible(window.scrollY > 300)

      // Проверяем положение футера
      const footer = document.querySelector('footer')
      if (footer) {
        const footerRect = footer.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const buttonHeight = 48 // примерная высота кнопки
        const spacing = 32 // отступ от футера (2rem)

        // Если футер виден в viewport (его верх выше нижнего края окна)
        if (footerRect.top < windowHeight) {
          // Вычисляем, насколько нужно поднять кнопку
          const overlap = windowHeight - footerRect.top
          const newBottom = spacing + overlap
          setButtonBottom(newBottom)
        } else {
          // Футер не виден - возвращаем к стандартному положению
          setButtonBottom(spacing)
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Отслеживание позиции мыши для "убегания"
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return

      const button = buttonRef.current
      const buttonRect = button.getBoundingClientRect()
      const buttonCenterX = buttonRect.left + buttonRect.width / 2
      const buttonCenterY = buttonRect.top + buttonRect.height / 2

      // Вычисляем расстояние от курсора до центра кнопки
      const distanceX = e.clientX - buttonCenterX
      const distanceY = e.clientY - buttonCenterY
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

      // Если курсор ближе 100px - кнопка "убегает" (с задержкой)
      const triggerDistance = 100

      if (distance < triggerDistance) {
        // Очищаем предыдущий таймер, если курсор двигается
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
        }

        // Задержка 200ms перед убеганием - дает шанс "поймать" кнопку быстрым движением
        escapeTimeoutRef.current = setTimeout(() => {
          setIsRunningAway(true)

          // Вычисляем направление убегания (противоположное от курсора)
          const angle = Math.atan2(distanceY, distanceX)
          const escapeDistance = 80 // уменьшено для более плавного движения

          const newRight = -Math.cos(angle) * escapeDistance
          const newBottomOffset = -Math.sin(angle) * escapeDistance

          // Получаем положение футера
          const footer = document.querySelector('footer')
          const windowHeight = window.innerHeight
          const buttonHeight = 48

          let maxBottom = buttonBottom + 150 // максимальная высота подъема

          if (footer) {
            const footerRect = footer.getBoundingClientRect()
            // Вычисляем максимальную высоту, чтобы не заходить за футер
            const footerTop = footerRect.top
            const maxAllowedBottom = windowHeight - footerTop - buttonHeight - 32

            if (maxAllowedBottom > 32) {
              maxBottom = Math.min(maxBottom, maxAllowedBottom + buttonBottom)
            }
          }

          // Ограничиваем перемещение
          const maxRight = 200
          const newBottomValue = buttonBottom + newBottomOffset

          setButtonRight(Math.max(-maxRight, Math.min(maxRight, newRight)))
          setButtonBottom(Math.max(32, Math.min(maxBottom, newBottomValue)))
        }, 200) // задержка 200ms
      } else if (distance > triggerDistance + 100) {
        // Очищаем таймер убегания, если курсор отдалился
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
          escapeTimeoutRef.current = null
        }

        // Возвращаем кнопку на место, когда курсор отдаляется
        setIsRunningAway(false)
        setButtonRight(0)

        // Пересчитываем исходное положение относительно футера
        const footer = document.querySelector('footer')
        if (footer) {
          const footerRect = footer.getBoundingClientRect()
          const windowHeight = window.innerHeight
          const spacing = 32

          if (footerRect.top < windowHeight) {
            const overlap = windowHeight - footerRect.top
            setButtonBottom(spacing + overlap)
          } else {
            setButtonBottom(spacing)
          }
        }
      }
    }

    if (isVisible) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        // Очищаем таймер при размонтировании
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
        }
      }
    }
  }, [isVisible, buttonBottom])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={scrollToTop}
      className="fixed z-[9999] p-3 bg-[hsl(var(--news-primary))] text-white rounded-full shadow-lg hover:bg-[hsl(var(--news-primary))]/90 hover:scale-110"
      style={{
        bottom: `${buttonBottom}px`,
        right: `max(1.5rem, calc(50% - 640px + 2rem + ${buttonRight}px))`,
        transition: isRunningAway
          ? 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' // плавное убегание с пружинящим эффектом
          : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', // плавный возврат
        willChange: 'bottom, right' // оптимизация производительности
      }}
      aria-label="Scroll to top"
    >
      <ArrowLeft className="h-6 w-6 rotate-90" />
    </button>
  )
}

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
  Globe,
  Share2
} from 'lucide-react';
import NewsStructuredData from '@/components/news/NewsStructuredData';
import NewsBreadcrumbs, { BreadcrumbsStructuredData } from '@/components/news/NewsBreadcrumbs';
import ContentBlockRenderer from '@/components/news/ContentBlockRenderer';
import Header from '@/components/Header';
import EnhancedFooter from '@/components/EnhancedFooter';
import dynamic from 'next/dynamic';

// Динамический импорт карты (только на клиенте)
const NewsObjectsMap = dynamic(
  () => import('@/components/news/NewsObjectsMap'),
  { ssr: false, loading: () => <div className="h-[400px] bg-muted animate-pulse"></div> }
);

interface NewsDetailClientProps {
  slug: string;
}

interface RelatedNewsArticle {
  id: string;
  title: string;
  slug: string;
  featured_image_url?: string;
  published_at: string;
  created_at: string;
}

export default function NewsDetailClient({ slug }: NewsDetailClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [article, setArticle] = useState<NewsArticleWithDetails | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [relatedNews, setRelatedNews] = useState<RelatedNewsArticle[]>([]);
  const [recommendedNews, setRecommendedNews] = useState<RelatedNewsArticle[]>([]);
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

  // Загрузка новости с зданиями и связанными новостями
  const fetchArticleWithBuildings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading article with buildings for slug:', slug);

      // Шаг 1: Загружаем основную новость
      let query = supabase
        .from('architecture_news')
        .select('*')
        .eq('slug', slug);

      // Применяем фильтры статуса в зависимости от роли
      if (!user) {
        query = query.eq('status', 'published');
      } else if (['admin', 'moderator', 'editor'].includes(profile?.role || '')) {
        // Админы видят все
      } else {
        query = query.or(`status.eq.published,and(status.eq.draft,author_id.eq.${user.id}),and(status.eq.review,author_id.eq.${user.id})`);
      }

      const { data: newsData, error: newsError } = await query.single();

      if (newsError) {
        if (newsError.code === 'PGRST116') {
          throw new Error('News not found');
        } else {
          throw new Error(`Ошибка базы данных: ${newsError.message}`);
        }
      }

      if (!newsData) {
        throw new Error('News not found');
      }

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
      let buildingsData: Array<{
        id: string;
        name: string;
        architect?: string;
        year_built?: number;
        city?: string;
        image_url?: string;
        architectural_style?: string;
      }> = [];
      if (newsData.related_buildings && newsData.related_buildings.length > 0) {
        const { data: buildings, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name, architect, year_built, city, image_url, architectural_style')
          .in('id', newsData.related_buildings);

        if (!buildingsError) {
          buildingsData = buildings || [];
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
        }
      }

      // Шаг 4: Загружаем блоки контента
      const { data: blocksData } = await supabase
        .from('news_content_blocks')
        .select('*')
        .eq('news_id', newsData.id)
        .order('order_index', { ascending: true });

      setContentBlocks(blocksData || []);

      // Шаг 5: Загружаем похожие новости (из той же категории)
      if (newsData.category) {
        const { data: related } = await supabase
          .from('architecture_news')
          .select('id, title, slug, featured_image_url, published_at, created_at')
          .eq('status', 'published')
          .eq('category', newsData.category)
          .neq('id', newsData.id)
          .order('published_at', { ascending: false })
          .limit(2);

        setRelatedNews(related || []);
      }

      // Шаг 6: Загружаем рекомендуемые новости (самые популярные)
      const { data: recommended } = await supabase
        .from('architecture_news')
        .select('id, title, slug, featured_image_url, published_at, created_at')
        .eq('status', 'published')
        .neq('id', newsData.id)
        .order('views_count', { ascending: false })
        .limit(2);

      setRecommendedNews(recommended || []);

      // Шаг 6.5: Загружаем взаимодействия пользователя (если авторизован)
      let userInteractions = undefined;
      if (user) {
        const { data: interactions } = await supabase
          .from('news_interactions')
          .select('interaction_type')
          .eq('news_id', newsData.id)
          .eq('user_id', user.id);

        if (interactions) {
          userInteractions = {
            liked: interactions.some(i => i.interaction_type === 'like'),
            bookmarked: interactions.some(i => i.interaction_type === 'bookmark'),
            shared: interactions.some(i => i.interaction_type === 'share'),
          };
        }
      }

      // Шаг 7: Собираем полную новость
      const fullArticle: NewsArticleWithDetails = {
        ...newsData,
        buildings: buildingsData,
        author,
        user_interactions: userInteractions
      };

      // Увеличиваем счетчик просмотров (только один раз за сессию)
      if (!viewedNews.has(newsData.id)) {
        viewedNews.add(newsData.id);

        const newViewCount = (newsData.views_count || 0) + 1;
        console.log(`📈 Updating view count for "${newsData.title}" from ${newsData.views_count || 0} to ${newViewCount}`);

        const { error: updateError } = await supabase
          .rpc('increment_news_views', { news_id: newsData.id });

        if (updateError) {
          console.error('❌ Error updating view count:', updateError);
        } else {
          newsData.views_count = newViewCount;
        }
      }

      setArticle(fullArticle);

    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading news');
    } finally {
      setLoading(false);
    }
  };

  // Обработка взаимодействий
  const handleInteraction = async (type: 'like' | 'bookmark' | 'share') => {
    if (!user || !article) {
      toast.error('Please log in to interact with news');
      return;
    }

    try {
      setInteractionLoading(type);

      if (type === 'like' || type === 'bookmark') {
        const isActive = type === 'like' ? article.user_interactions?.liked : article.user_interactions?.bookmarked;

        if (isActive) {
          const { error } = await supabase
            .from('news_interactions')
            .delete()
            .eq('news_id', article.id)
            .eq('user_id', user.id)
            .eq('interaction_type', type);

          if (error) throw error;

          setArticle(prev => prev ? {
            ...prev,
            user_interactions: {
              liked: type === 'like' ? false : (prev.user_interactions?.liked ?? false),
              bookmarked: type === 'bookmark' ? false : (prev.user_interactions?.bookmarked ?? false),
              shared: prev.user_interactions?.shared ?? false
            },
            likes_count: type === 'like' ? Math.max(0, (prev.likes_count || 0) - 1) : prev.likes_count,
            bookmarks_count: type === 'bookmark' ? Math.max(0, (prev.bookmarks_count || 0) - 1) : prev.bookmarks_count
          } : null);
        } else {
          const { error } = await supabase
            .from('news_interactions')
            .upsert(
              { news_id: article.id, user_id: user.id, interaction_type: type },
              { onConflict: 'news_id,user_id,interaction_type', ignoreDuplicates: true }
            );

          if (error) throw error;

          setArticle(prev => prev ? {
            ...prev,
            user_interactions: {
              liked: type === 'like' ? true : (prev.user_interactions?.liked ?? false),
              bookmarked: type === 'bookmark' ? true : (prev.user_interactions?.bookmarked ?? false),
              shared: prev.user_interactions?.shared ?? false
            },
            likes_count: type === 'like' ? (prev.likes_count || 0) + 1 : prev.likes_count,
            bookmarks_count: type === 'bookmark' ? (prev.bookmarks_count || 0) + 1 : prev.bookmarks_count
          } : null);
        }
      } else if (type === 'share') {
        // upsert — не падает при повторном клике
        const { error } = await supabase
          .from('news_interactions')
          .upsert(
            { news_id: article.id, user_id: user.id, interaction_type: 'share' },
            { onConflict: 'news_id,user_id,interaction_type', ignoreDuplicates: true }
          );

        if (error) throw error;

        setArticle(prev => prev ? {
          ...prev,
          shares_count: (prev.shares_count || 0) + 1
        } : null);
      }
    } catch (error) {
      console.error('Ошибка взаимодействия:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setInteractionLoading(null);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Получение названия категории
  const getCategoryName = (category?: string) => {
    const categories: Record<string, string> = {
      'projects': 'Architectural Projects',
      'events': 'Events',
      'personalities': 'Personalities',
      'trends': 'Trends',
      'planning': 'Urban Planning',
      'heritage': 'Heritage'
    };
    return category ? categories[category] || category : '';
  };

  // Проверка прав на редактирование
  const canEdit = article && user && (
    ['admin', 'moderator', 'editor'].includes(profile?.role || '') ||
    (article.author_id === user.id && ['draft', 'review'].includes(article.status))
  );

  useEffect(() => {
    if (initialized) {
      fetchArticleWithBuildings();
    }
  }, [slug, initialized, user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header buildings={[]} />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted w-3/4"></div>
            <div className="h-64 bg-muted"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted w-full"></div>
              <div className="h-4 bg-muted w-5/6"></div>
              <div className="h-4 bg-muted w-4/6"></div>
            </div>
          </div>
        </div>
        <ScrollToTopButton />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">News Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'The news may have been deleted or never existed'}</p>
          <Link
            href="/news"
            className="inline-flex items-center justify-center px-6 py-3 bg-[hsl(var(--news-primary))] text-white hover:bg-[hsl(var(--news-primary))]/90 transition-colors"
          >
            К новостям
          </Link>
        </div>
        <ScrollToTopButton />
      </div>
    );
  }

  return (
    <>
      {/* JSON-LD для поисковых систем */}
      <NewsStructuredData article={article} />
      <BreadcrumbsStructuredData article={article} />

      <div className="min-h-screen bg-background">
        <Header buildings={buildings} />

        <main className="container mx-auto px-6 py-8">
          {/* Back button */}
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to News</span>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <article className="lg:col-span-2">
              {/* Cover image with action buttons */}
              {article.featured_image_url ? (
                <div className="relative mb-8">
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full aspect-[16/9] object-cover"
                  />

                  {/* Featured badge */}
                  {article.featured && (
                    <span className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 text-xs font-medium border-0 rounded-full">
                      Главная новость
                    </span>
                  )}

                  {/* Action buttons overlay */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => handleInteraction('like')}
                      disabled={interactionLoading === 'like'}
                      className={`p-3 rounded backdrop-blur-md transition-all ${article.user_interactions?.liked
                        ? 'bg-[hsl(var(--news-primary))] text-white'
                        : 'bg-white/90 text-gray-700 hover:bg-white'
                        } disabled:opacity-50`}
                      title="Like"
                    >
                      <Heart className={`h-5 w-5 ${article.user_interactions?.liked ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleInteraction('bookmark')}
                      disabled={interactionLoading === 'bookmark'}
                      className={`p-3 rounded backdrop-blur-md transition-all ${article.user_interactions?.bookmarked
                        ? 'bg-[hsl(var(--news-primary))] text-white'
                        : 'bg-white/90 text-gray-700 hover:bg-white'
                        } disabled:opacity-50`}
                      title="Bookmark"
                    >
                      <Bookmark className={`h-5 w-5 ${article.user_interactions?.bookmarked ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: article.title,
                            text: article.summary || article.title,
                            url: window.location.href
                          });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success('Link copied!');
                        }
                        if (user) handleInteraction('share');
                      }}
                      disabled={interactionLoading === 'share'}
                      className="p-3 rounded bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white transition-all disabled:opacity-50"
                      title="Share"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8 flex justify-end gap-2">
                  <button
                    onClick={() => handleInteraction('like')}
                    disabled={interactionLoading === 'like'}
                    className={`p-3 rounded transition-all ${article.user_interactions?.liked
                      ? 'bg-[hsl(var(--news-primary))] text-white'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                      } disabled:opacity-50`}
                  >
                    <Heart className={`h-5 w-5 ${article.user_interactions?.liked ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleInteraction('bookmark')}
                    disabled={interactionLoading === 'bookmark'}
                    className={`p-3 rounded transition-all ${article.user_interactions?.bookmarked
                      ? 'bg-[hsl(var(--news-primary))] text-white'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                      } disabled:opacity-50`}
                  >
                    <Bookmark className={`h-5 w-5 ${article.user_interactions?.bookmarked ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: article.title,
                          text: article.summary || article.title,
                          url: window.location.href
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Link copied!');
                      }
                      if (user) handleInteraction('share');
                    }}
                    disabled={interactionLoading === 'share'}
                    className="p-3 rounded bg-card border border-border text-foreground hover:bg-muted transition-all disabled:opacity-50"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Header section */}
              <header className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  {article.category && (
                    <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--news-primary))] bg-[hsl(var(--news-primary))]/10 px-3 py-1 rounded-[var(--radius)]">
                      {getCategoryName(article.category)}
                    </span>
                  )}
                  {article.featured && (
                    <span className="text-xs font-medium uppercase tracking-wider bg-orange-500 text-white px-3 py-1 rounded-[var(--radius)]">
                      Главная новость
                    </span>
                  )}
                  {canEdit && (
                    <Link
                      href={`/admin/news/${article.id}/edit`}
                      className="ml-auto flex items-center gap-1 px-3 py-1 text-xs bg-muted text-foreground rounded-[var(--radius)] hover:bg-muted/80 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      Редактировать
                    </Link>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight font-display">
                  {article.title}
                </h1>

                {article.summary && (
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {article.summary}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-metrics">
                  {article.author && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{article.author.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(article.published_at || article.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{Math.max(1, Math.round(article.content.length / 1000))} мин чтения</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{article.views_count || 0}</span>
                  </div>
                  {article.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{article.city}{article.country && `, ${article.country}`}</span>
                    </div>
                  )}
                </div>
              </header>

              {/* Content */}
              <div className="space-y-12">
                {contentBlocks.length > 0 ? (
                  <>
                    {contentBlocks.map((block) => (
                      <ContentBlockRenderer key={block.id} block={block} />
                    ))}
                  </>
                ) : article.content ? (
                  <div className="prose prose-lg max-w-none">
                    {article.content.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="mb-4 leading-relaxed">
                          {paragraph}
                        </p>
                      )
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Связанные здания */}
              {article.buildings && article.buildings.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-lg font-bold mb-6 font-display">Featured Objects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {article.buildings.map((building) => (
                      <Link
                        key={building.id}
                        href={`/buildings/${building.id}`}
                        className="flex gap-4 bg-card border border-border p-4 group hover:bg-muted transition-colors"
                      >
                        {building.image_url && (
                          <img
                            src={building.image_url}
                            alt={building.name}
                            className="w-20 h-20 object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-[hsl(var(--news-primary))] transition-colors mb-1">
                            {building.name}
                          </h4>
                          {building.architect && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {building.architect}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {building.year_built && <span>{building.year_built}</span>}
                            {building.city && <span>{building.city}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
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
                <div className="mt-12">
                  <h3 className="text-lg font-bold mb-4 font-display">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag, index) => (
                      <Link
                        key={index}
                        href={`/news?tags=${encodeURIComponent(tag)}`}
                        className="text-xs px-3 py-1 bg-[hsl(var(--news-primary))]/10 text-[hsl(var(--news-primary))] rounded-full hover:bg-[hsl(var(--news-primary))]/20 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-8">
              {/* Related news */}
              {relatedNews.length > 0 && (
                <div className="bg-card border border-border p-6">
                  <h3 className="text-lg font-bold mb-4 font-display">Ещё из категории</h3>
                  <div className="space-y-4">
                    {relatedNews.map(news => (
                      <Link
                        key={news.id}
                        href={`/news/${news.slug}`}
                        className="flex gap-4 group"
                      >
                        {news.featured_image_url && (
                          <img
                            src={news.featured_image_url}
                            alt={news.title}
                            className="w-20 h-20 object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-[hsl(var(--news-primary))] transition-colors">
                            {news.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(news.published_at || news.created_at)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended news */}
              {recommendedNews.length > 0 && (
                <div className="bg-card border border-border p-6">
                  <h3 className="text-lg font-bold mb-4 font-display">Recommended</h3>
                  <div className="space-y-4">
                    {recommendedNews.map(news => (
                      <Link
                        key={news.id}
                        href={`/news/${news.slug}`}
                        className="flex gap-4 group"
                      >
                        {news.featured_image_url && (
                          <img
                            src={news.featured_image_url}
                            alt={news.title}
                            className="w-20 h-20 object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-[hsl(var(--news-primary))] transition-colors">
                            {news.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(news.published_at || news.created_at)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>

        <EnhancedFooter />
        <ScrollToTopButton />
      </div>
    </>
  );
}
