'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { BlogPost, BlogContentBlock } from '@/types/blog'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  User
} from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import ContentBlockRenderer from '@/components/blog/ContentBlockRenderer'
import BlogArticleMap from '@/components/blog/BlogArticleMap'
import BlogRouteBuilder from '@/components/blog/BlogRouteBuilder'
import SocialActions from '@/components/blog/SocialActions'

export default function BlogPostPage() {
  const supabase = useMemo(() => createClient(), [])
  const { slug } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [blocks, setBlocks] = useState<BlogContentBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      loadPost()
    }
  }, [slug])

  const loadPost = async () => {
    setLoading(true)
    try {
      // Загружаем статью
      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (postError) throw postError
      if (!postData) {
        router.push('/blog')
        return
      }

      setPost(postData)

      // Увеличиваем счетчик просмотров и обновляем состояние
      const newViewCount = (postData.view_count || 0) + 1
      console.log(`📈 Updating view count for "${postData.title}" from ${postData.view_count || 0} to ${newViewCount}`)
      
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ view_count: newViewCount })
        .eq('id', postData.id)

      if (updateError) {
        console.error('❌ Error updating view count:', updateError)
      } else {
        console.log('✅ View count updated successfully in database')
      }

      // Обновляем локальное состояние
      setPost(prev => prev ? { ...prev, view_count: newViewCount } : null)

      // Загружаем блоки контента если это блог с блоками
      if (postData.editor_version === 'blocks') {
        const { data: blocksData } = await supabase
          .from('blog_content_blocks')
          .select('*')
          .eq('blog_post_id', postData.id)
          .order('order_index', { ascending: true })

        setBlocks(blocksData || [])
      }

    } catch (error) {
      console.error('Error loading post:', error)
      router.push('/blog')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Статья не найдена</h1>
          <p className="text-gray-600 mb-6">Возможно, статья была удалена или никогда не существовала</p>
          <Link 
            href="/blog" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            К блогу
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Навигация */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>К блогу</span>
          </Link>
        </div>

        {/* Заголовок статьи */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Мета-информация */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Автор статьи</p>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(post.published_at || post.created_at)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {post.reading_time_minutes} мин чтения
                  </span>
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {post.view_count} просмотров
                  </span>
                </div>
              </div>
            </div>

            {/* Социальные действия */}
            <SocialActions
              blogPostId={post.id}
              blogPostTitle={post.title}
              blogPostUrl={typeof window !== 'undefined' ? window.location.href : undefined}
              userId={user?.id}
              showCounts={true}
            />
          </div>
        </header>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Левая колонка - контент статьи */}
          <div className="lg:col-span-2 space-y-8">

            {/* Главное изображение */}
            {post.featured_image_url && (
              <div>
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Контент статьи */}
            {post.editor_version === 'blocks' && blocks.length > 0 ? (
              <article className="space-y-6">
                <ContentBlockRenderer blocks={blocks} />
              </article>
            ) : post.content ? (
              <article className="bg-white rounded-lg shadow-sm border p-8">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </article>
            ) : null}

            {/* Карта объектов из статьи */}
            {post.editor_version === 'blocks' && blocks.length > 0 && (
              <BlogArticleMap
                blocks={blocks}
                blogPostId={post.id}
                blogPostTitle={post.title}
              />
            )}

            {/* Построение маршрута */}
            {post.editor_version === 'blocks' && blocks.length > 0 && (
              <BlogRouteBuilder
                blocks={blocks}
                blogPostId={post.id}
                blogPostTitle={post.title}
                user={user}
              />
            )}
          </div>

          {/* Правая колонка - статистика */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">

              {/* Статистика статьи */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">О статье</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Время чтения:</span>
                    <span className="font-medium">{post.reading_time_minutes} мин</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Просмотров:</span>
                    <span className="font-medium">{post.view_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Опубликовано:</span>
                    <span className="font-medium">{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
