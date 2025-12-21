'use client'

export const dynamic = 'force-dynamic'

// src/app/profile/saved-news/page.tsx
// Страница сохраненных новостей пользователя (в закладках)

import { useState, useEffect, useMemo, Suspense } from 'react'
import { Bookmark, Eye, Calendar, ArrowLeft, Newspaper } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import Link from 'next/link'
import type { NewsArticle } from '@/types/news'

export default function SavedNewsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading } = useAuth()
  const [savedNews, setSavedNews] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSavedNews()
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [user, loading])

  const loadSavedNews = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Загружаем новости через взаимодействия (bookmark)
      const { data: interactions, error: interactionsError } = await supabase
        .from('news_interactions')
        .select('news_id')
        .eq('user_id', user.id)
        .eq('interaction_type', 'bookmark')

      if (interactionsError) {
        console.error('Error loading saved interactions:', interactionsError)
        toast.error('Ошибка при загрузке сохраненных новостей')
        return
      }

      if (!interactions || interactions.length === 0) {
        setSavedNews([])
        return
      }

      const newsIds = interactions.map(i => i.news_id)

      // Загружаем сами новости
      const { data: news, error: newsError } = await supabase
        .from('architecture_news')
        .select('*')
        .in('id', newsIds)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (newsError) {
        console.error('Error loading saved news:', newsError)
        toast.error('Ошибка при загрузке новостей')
        return
      }

      setSavedNews(news || [])
    } catch (error) {
      console.error('Exception loading saved news:', error)
      toast.error('Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background news-theme">
        <Suspense fallback={<div className="h-16 bg-card border-b" />}>
          <Header buildings={[]} />
        </Suspense>
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-card rounded-lg p-4 space-y-3">
                  <div className="h-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background news-theme">
        <Suspense fallback={<div className="h-16 bg-card border-b" />}>
          <Header buildings={[]} />
        </Suspense>
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="bg-card rounded-lg shadow-sm border p-12">
            <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Войдите в систему
            </h1>
            <p className="text-muted-foreground mb-6">
              Для просмотра сохраненных новостей необходимо войти в свою учетную запись
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-[hsl(var(--news-primary))] text-white rounded-lg hover:bg-[hsl(var(--news-primary))]/90 transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background news-theme">
      <Suspense fallback={<div className="h-16 bg-card border-b" />}>
        <Header buildings={[]} />
      </Suspense>

      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок */}
        <div className="flex items-center mb-6">
          <Link
            href="/profile"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="ml-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-[hsl(var(--news-primary))]" />
              Сохраненные новости
            </h1>
            <p className="text-muted-foreground mt-2">
              Новости, которые вы сохранили в закладки
            </p>
          </div>
        </div>

        {/* Список новостей */}
        {savedNews.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-card rounded-lg shadow-sm border p-12">
              <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Нет сохраненных новостей
              </h3>
              <p className="text-muted-foreground mb-6">
                Начните сохранять новости в закладки, нажимая на кнопку с закладкой
              </p>
              <Link
                href="/news"
                className="inline-flex items-center px-6 py-3 bg-[hsl(var(--news-primary))] text-white rounded-lg hover:bg-[hsl(var(--news-primary))]/90 transition-colors"
              >
                <Newspaper className="w-4 h-4 mr-2" />
                Перейти к новостям
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedNews.map((newsItem) => (
              <Link
                key={newsItem.id}
                href={`/news/${newsItem.slug}`}
                className="bg-card rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
              >
                {/* Превью изображение */}
                {newsItem.featured_image_url && (
                  <div className="relative h-40 overflow-hidden bg-muted">
                    <img
                      src={newsItem.featured_image_url}
                      alt={newsItem.featured_image_alt || newsItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Категория */}
                  {newsItem.category && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[hsl(var(--news-primary))]/10 text-[hsl(var(--news-primary))]">
                        {newsItem.category}
                      </span>
                    </div>
                  )}

                  {/* Заголовок */}
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-[hsl(var(--news-primary))] transition-colors line-clamp-2 mb-2">
                    {newsItem.title}
                  </h3>

                  {/* Описание */}
                  {newsItem.summary && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {newsItem.summary}
                    </p>
                  )}

                  {/* Метаданные */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(newsItem.published_at || newsItem.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{newsItem.views_count || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <EnhancedFooter />
    </div>
  )
}
