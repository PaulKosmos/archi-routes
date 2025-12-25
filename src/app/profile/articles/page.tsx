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
import EnhancedFooter from '@/components/EnhancedFooter'
import Link from 'next/link'
import type { BlogPost } from '@/types/blog'

type TabType = 'all' | 'draft' | 'published' | 'archived'

export default function ProfileArticlesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading } = useAuth()
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
    // Только админы могут архивировать
    if (profile?.role !== 'admin') {
      toast.error('Только админы могут архивировать статьи')
      return
    }

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

  const handleUnarchiveArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ status: 'draft' })
        .eq('id', articleId)

      if (error) throw error

      toast.success('Статья восстановлена в черновики')
      loadUserArticles()
    } catch (error) {
      console.error('Error unarchiving article:', error)
      toast.error('Ошибка при восстановлении статьи')
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
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
          <Header buildings={[]} />
        </Suspense>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
          <Header buildings={[]} />
        </Suspense>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">
              Войдите в систему
            </h1>
            <p className="text-muted-foreground mb-6">
              Для просмотра статей необходимо войти в свою учетную запись
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Войти в систему
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
        <Header buildings={[]} />
      </Suspense>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pt-10">
          {/* Заголовок и кнопка создания */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Мои блоги
                </h1>
                <p className="text-muted-foreground mt-1">
                  Управляйте своими блогами
                </p>
              </div>
              <Link
                href="/blog/create"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать статью
              </Link>
            </div>
          </div>

          {/* Поиск и сортировка */}
          <div className="bg-card border border-border rounded-[var(--radius)] p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск по названию или описанию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-border rounded-[var(--radius)] px-4 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="created_at">По дате создания</option>
                <option value="published_at">По дате публикации</option>
                <option value="view_count">По просмотрам</option>
              </select>
            </div>
          </div>

          {/* Табы */}
          <div className="bg-card border border-border rounded-[var(--radius)] mb-6">
            <div className="border-b border-border">
              <nav className="flex gap-8 px-6">
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
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {articles.length === 0 ? 'Нет созданных статей' : 'Нет статей в этой категории'}
              </h3>
              <p className="text-muted-foreground mb-6">
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
                  className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первую статью
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isAdmin={profile?.role === 'admin'}
                  onEdit={() => window.open(`/blog/${article.slug}/edit`, '_blank')}
                  onDelete={() => handleDeleteArticle(article.id)}
                  onPublish={() => handlePublishArticle(article)}
                  onArchive={() => handleArchiveArticle(article.id)}
                  onUnarchive={() => handleUnarchiveArticle(article.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <EnhancedFooter />
    </div>
  )
}

// Компонент карточки статьи
function ArticleCard({
  article,
  isAdmin,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
  onUnarchive,
  formatDate
}: {
  article: BlogPost
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
  onPublish: () => void
  onArchive: () => void
  onUnarchive: () => void
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
    <div className="bg-card border border-border rounded-[var(--radius)] hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
      {/* Превью изображение */}
      {article.featured_image_url && (
        <div className="relative h-32 overflow-hidden bg-muted">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={article.status === 'published' ? `/blog/${article.slug}` : `/blog/${article.slug}/edit`}
            className="text-base font-semibold hover:text-primary transition-colors line-clamp-1 flex-1"
          >
            {article.title}
          </Link>

          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(article.status)}`}>
            {getStatusText(article.status)}
          </div>
        </div>

        {article.excerpt && (
          <p className="text-muted-foreground text-xs mb-3 line-clamp-2 h-8">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 h-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="truncate">{formatDate(article.created_at)}</span>
          </div>

          {article.reading_time_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{article.reading_time_minutes} мин</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{article.view_count || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border mt-auto">
          <div className="flex items-center gap-2">
            {article.status === 'published' ? (
              <Link
                href={`/blog/${article.slug}`}
                className="inline-flex items-center px-3 py-1.5 text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <Eye className="w-3 h-3 mr-1" />
                Открыть
              </Link>
            ) : (
              <Link
                href={`/blog/${article.slug}/edit`}
                className="inline-flex items-center px-3 py-1.5 text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <Edit className="w-3 h-3 mr-1" />
                Редактировать
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {article.status === 'draft' && (
              <button
                onClick={onPublish}
                className="inline-flex items-center p-1.5 text-xs bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                title="Опубликовать"
              >
                <Send className="w-3 h-3" />
              </button>
            )}

            {article.status === 'published' && isAdmin && (
              <button
                onClick={onArchive}
                className="inline-flex items-center p-1.5 text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
                title="Архивировать (только для админов)"
              >
                <Archive className="w-3 h-3" />
              </button>
            )}

            {article.status === 'archived' && (
              <button
                onClick={onUnarchive}
                className="inline-flex items-center p-1.5 text-xs bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                title="Разархивировать"
              >
                <Archive className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={onDelete}
              className="inline-flex items-center p-1.5 text-xs border border-destructive/50 text-destructive rounded-[var(--radius)] hover:bg-destructive/10 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
