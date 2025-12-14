'use client'

export const dynamic = 'force-dynamic'

// src/app/profile/saved-blogs/page.tsx
// Страница сохраненных блогов пользователя (в коллекцию)

import { useState, useEffect, useMemo, Suspense } from 'react'
import { Bookmark, Eye, Clock, Calendar, ArrowLeft, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Header from '@/components/HeaderWithSuspense'
import Link from 'next/link'
import type { BlogPost } from '@/types/blog'

export default function SavedBlogsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading } = useAuth()
  const [savedPosts, setSavedPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSavedPosts()
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [user, loading])

  const loadSavedPosts = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Загружаем статьи через реакции
      const { data: reactions, error: reactionsError } = await supabase
        .from('blog_post_reactions')
        .select('post_id')
        .eq('user_id', user.id)
        .eq('reaction_type', 'save')

      if (reactionsError) {
        console.error('Error loading saved reactions:', reactionsError)
        toast.error('Ошибка при загрузке сохраненных статей')
        return
      }

      if (!reactions || reactions.length === 0) {
        setSavedPosts([])
        return
      }

      const postIds = reactions.map(r => r.post_id)

      // Загружаем сами статьи
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (postsError) {
        console.error('Error loading saved posts:', postsError)
        toast.error('Ошибка при загрузке статей')
        return
      }

      setSavedPosts(posts || [])
    } catch (error) {
      console.error('Exception loading saved posts:', error)
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
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div className="h-16 bg-white border-b" />}>
          <Header buildings={[]} />
        </Suspense>
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 space-y-3">
                  <div className="h-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
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
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<div className="h-16 bg-white border-b" />}>
          <Header buildings={[]} />
        </Suspense>
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="bg-white rounded-lg shadow-sm p-12">
            <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Войдите в систему
            </h1>
            <p className="text-gray-600 mb-6">
              Для просмотра сохраненных блогов необходимо войти в свою учетную запись
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="h-16 bg-white border-b" />}>
        <Header buildings={[]} />
      </Suspense>

      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок */}
        <div className="flex items-center mb-6">
          <Link
            href="/profile"
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="ml-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-blue-600" />
              Сохраненные блоги
            </h1>
            <p className="text-gray-600 mt-2">
              Статьи, которые вы сохранили в коллекцию
            </p>
          </div>
        </div>

        {/* Список статей */}
        {savedPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-12">
              <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Нет сохраненных статей
              </h3>
              <p className="text-gray-600 mb-6">
                Начните сохранять статьи в коллекцию, нажимая на кнопку с закладкой
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Перейти в блог
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
              >
                {/* Превью изображение */}
                {post.featured_image_url && (
                  <div className="relative h-40 overflow-hidden bg-gray-200">
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Категория */}
                  {post.category && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {post.category}
                      </span>
                    </div>
                  )}

                  {/* Заголовок */}
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>

                  {/* Описание */}
                  {post.excerpt && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}

                  {/* Метаданные */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(post.published_at || post.created_at)}</span>
                    </div>

                    {post.reading_time_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{post.reading_time_minutes} мин</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{post.view_count || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
