'use client'

export const dynamic = 'force-dynamic'

// src/app/profile/articles/page.tsx
// Страница управления статьями блога пользователя

import { useState, useEffect, useMemo, Suspense } from 'react'
import {
  FileText,
  Eye,
  Clock,
  Edit,
  Trash2,
  Plus,
  Search,
  Calendar,
  TrendingUp,
  Archive,
  Send,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Header from '@/components/Header'
import Link from 'next/link'
import type { BlogPost } from '@/types/blog'

type TabType = 'all' | 'draft' | 'published' | 'archived'

export default function ProfileArticlesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading } = useAuth()
  const [articles, setArticles] = useState<BlogPost[]>([])
  const [filteredArticles, setFilteredArticles] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'view_count' | 'published_at'>('created_at')

  useEffect(() => {
    if (user) {
      loadUserArticles()
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [user, loading, sortBy])

  useEffect(() => {
    applyFilters()
  }, [articles, activeTab, searchQuery])

  const loadUserArticles = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('author_id', user.id)
        .order(sortBy, { ascending: false })

      if (error) {
        console.error('Error loading user articles:', error)
        toast.error('Ошибка при загрузке статей')
        return
      }

      setArticles(data || [])
    } catch (error) {
      console.error('Exception loading user articles:', error)
      toast.error('Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = articles

    // Фильтрация по табам
    switch (activeTab) {
      case 'draft':
        filtered = articles.filter(article => article.status === 'draft')
        break
      case 'published':
        filtered = articles.filter(article => article.status === 'published')
        break
      case 'archived':
        filtered = articles.filter(article => article.status === 'archived')
        break
      // 'all' показывает все статьи
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt?.toLowerCase().includes(query)
      )
    }

    setFilteredArticles(filtered)
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) {
      return
    }

    try {
      // Удаляем блоки контента
      await supabase
        .from('blog_content_blocks')
        .delete()
        .eq('blog_post_id', articleId)

      // Удаляем связи с тегами
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', articleId)

      // Удаляем саму статью
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', articleId)

      if (error) {
        throw error
      }

      toast.success('Статья удалена')
      setArticles(prev => prev.filter(article => article.id !== articleId))
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Ошибка при удалении статьи')
    }
  }

  const handlePublishArticle = async (article: BlogPost) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', article.id)

      if (error) throw error

      toast.success('Статья опубликована')
      loadUserArticles()
    } catch (error) {
      console.error('Error publishing article:', error)
      toast.error('Ошибка при публикации статьи')
    }
  }

  const handleArchiveArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ status: 'archived' })
        .eq('id', articleId)

      if (error) throw error

      toast.success('Статья архивирована')
      loadUserArticles()
    } catch (error) {
      console.error('Error archiving article:', error)
      toast.error('Ошибка при архивировании статьи')
    }
  }

  const getTabCounts = () => {
    return {
      all: articles.length,
      draft: articles.filter(a => a.status === 'draft').length,
      published: articles.filter(a => a.status === 'published').length,
      archived: articles.filter(a => a.status === 'archived').length
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const counts = getTabCounts()

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
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Войдите в систему
            </h1>
            <p className="text-gray-600 mb-6">
              Для просмотра статей необходимо войти в свою учетную запись
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Войти в систему
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
        {/* Заголовок и кнопка создания */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Мои статьи
              </h1>
              <p className="text-gray-600 mt-2">
                Управляйте своими статьями в блоге
              </p>
            </div>
          </div>

          <Link
            href="/blog/create"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать статью
          </Link>
        </div>

        {/* Поиск и сортировка */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">По дате создания</option>
              <option value="published_at">По дате публикации</option>
              <option value="view_count">По просмотрам</option>
            </select>
          </div>
        </div>

        {/* Табы */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'Все статьи', count: counts.all },
                { key: 'draft', label: 'Черновики', count: counts.draft },
                { key: 'published', label: 'Опубликованные', count: counts.published },
                { key: 'archived', label: 'Архивные', count: counts.archived }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Список статей */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {articles.length === 0 ? 'Нет созданных статей' : 'Нет статей в этой категории'}
              </h3>
              <p className="text-gray-600 mb-6">
                {articles.length === 0
                  ? 'Создайте свою первую статью, чтобы поделиться знаниями'
                  : searchQuery
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Попробуйте выбрать другую категорию'
                }
              </p>
              {articles.length === 0 && (
                <Link
                  href="/blog/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первую статью
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onEdit={() => window.open(`/blog/${article.slug}/edit`, '_blank')}
                onDelete={() => handleDeleteArticle(article.id)}
                onPublish={() => handlePublishArticle(article)}
                onArchive={() => handleArchiveArticle(article.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Компонент карточки статьи
function ArticleCard({
  article,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
  formatDate
}: {
  article: BlogPost
  onEdit: () => void
  onDelete: () => void
  onPublish: () => void
  onArchive: () => void
  formatDate: (date: string) => string
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Опубликовано'
      case 'draft': return 'Черновик'
      case 'archived': return 'Архив'
      default: return status
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden">
      {/* Превью изображение */}
      {article.featured_image_url && (
        <div className="relative h-40 overflow-hidden bg-gray-200">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Link
            href={article.status === 'published' ? `/blog/${article.slug}` : `/blog/${article.slug}/edit`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 flex-1"
          >
            {article.title}
          </Link>

          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(article.status)}`}>
            {getStatusText(article.status)}
          </div>
        </div>

        {article.excerpt && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(article.created_at)}</span>
          </div>

          {article.reading_time_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{article.reading_time_minutes} мин</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{article.view_count || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {article.status === 'published' ? (
              <Link
                href={`/blog/${article.slug}`}
                className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1" />
                Открыть
              </Link>
            ) : (
              <Link
                href={`/blog/${article.slug}/edit`}
                className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4 mr-1" />
                Редактировать
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {article.status === 'draft' && (
              <button
                onClick={onPublish}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Опубликовать"
              >
                <Send className="w-4 h-4" />
              </button>
            )}

            {article.status === 'published' && (
              <button
                onClick={onArchive}
                className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                title="Архивировать"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onDelete}
              className="inline-flex items-center px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
