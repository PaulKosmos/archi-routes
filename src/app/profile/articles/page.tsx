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
        toast.error('Error loading articles')
        return
      }

      setArticles(data || [])
    } catch (error) {
      console.error('Exception loading user articles:', error)
      toast.error('An error occurred')
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
    if (!confirm('Are you sure you want to delete this article?')) {
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

      toast.success('Article deleted')
      setArticles(prev => prev.filter(article => article.id !== articleId))
    } catch (error) {
      console.error('Error deleting article:', error)
      toast.error('Error deleting article')
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

      toast.success('Article published')
      loadUserArticles()
    } catch (error) {
      console.error('Error publishing article:', error)
      toast.error('Error publishing article')
    }
  }

  const handleArchiveArticle = async (articleId: string) => {
    // Только админы могут архивировать
    if (profile?.role !== 'admin') {
      toast.error('Only admins can archive articles')
      return
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ status: 'archived' })
        .eq('id', articleId)

      if (error) throw error

      toast.success('Article archived')
      loadUserArticles()
    } catch (error) {
      console.error('Error archiving article:', error)
      toast.error('Error archiving article')
    }
  }

  const handleUnarchiveArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ status: 'draft' })
        .eq('id', articleId)

      if (error) throw error

      toast.success('Article restored to drafts')
      loadUserArticles()
    } catch (error) {
      console.error('Error unarchiving article:', error)
      toast.error('Error restoring article')
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
            <p className="text-muted-foreground">Loading...</p>
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
              Sign In
            </h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to view articles
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex-col">
      <Suspense fallback={<div className="h-16 bg-card border-b border-border" />}>
        <Header buildings={[]} />
      </Suspense>

      <main className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-6 sm:pt-10">
          {/* Заголовок и кнопка создания */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-3xl font-heading font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                  Blogs
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm mt-1">
                  <span className="text-muted-foreground">
                    {articles.length} {articles.length === 1 ? 'article' : 'articles'}
                  </span>
                  {counts.draft > 0 && (
                    <span className="text-amber-600 font-medium">{counts.draft} drafts</span>
                  )}
                  {counts.published > 0 && (
                    <span className="text-green-600 font-medium">{counts.published} published</span>
                  )}
                </div>
              </div>
              <Link
                href="/blog/create"
                className="hidden sm:inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Article
              </Link>
            </div>
          </div>

          {/* Поиск и сортировка */}
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-6 mb-3 sm:mb-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at">By Date</option>
                  <option value="published_at">By Publication</option>
                  <option value="view_count">By Views</option>
                </select>
              </div>
            </div>
          </div>

          {/* Табы */}
          <div className="mb-3 sm:mb-6 bg-card border border-border rounded-[var(--radius)] p-1.5 sm:p-2">
            <div className="flex gap-1 sm:gap-2">
              {[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'draft', label: 'Drafts', count: counts.draft },
                { key: 'published', label: 'Published', count: counts.published },
                { key: 'archived', label: 'Archive', count: counts.archived }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-[var(--radius)] font-medium transition-all text-xs sm:text-sm flex-1 sm:flex-none justify-center sm:justify-start ${activeTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background hover:bg-accent'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`hidden sm:inline text-sm ${activeTab === tab.key ? 'opacity-90' : 'text-muted-foreground'}`}>
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Список статей */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {articles.length === 0 ? 'No articles created' : 'No articles in this category'}
              </h3>
              <p className="text-gray-500 mb-6">
                {articles.length === 0
                  ? 'Create your first article to share knowledge'
                  : searchQuery
                    ? 'Try changing your search query'
                    : 'Try selecting another category'
                }
              </p>
              {articles.length === 0 && (
                <Link
                  href="/blog/create"
                  className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Article
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
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
      case 'published': return 'Published'
      case 'draft': return 'Draft'
      case 'archived': return 'Archived'
      default: return status
    }
  }

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
      {/* Превью изображение */}
      <div className="relative h-28 sm:h-36 overflow-hidden bg-muted">
        {article.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
        )}
      </div>

      <div className="p-2.5 sm:p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-1.5 mb-1 sm:mb-2">
          <Link
            href={article.status === 'published' ? `/blog/${article.slug}` : `/blog/${article.slug}/edit`}
            className="text-sm sm:text-base font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2 flex-1"
          >
            {article.title}
          </Link>

          <div className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${getStatusColor(article.status)}`}>
            {getStatusText(article.status)}
          </div>
        </div>

        {article.excerpt && (
          <p className="text-gray-600 text-xs mb-2 line-clamp-2 hidden sm:block">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Calendar className="w-3 h-3" />
            <span className="truncate">{formatDate(article.created_at)}</span>
          </div>

          {article.reading_time_minutes && (
            <div className="flex items-center gap-0.5 sm:gap-1 hidden sm:flex">
              <Clock className="w-3 h-3" />
              <span>{article.reading_time_minutes} min</span>
            </div>
          )}

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Eye className="w-3 h-3" />
            <span>{article.view_count || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            {article.status === 'published' ? (
              <Link
                href={`/blog/${article.slug}`}
                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <Eye className="w-3 h-3 mr-0.5 sm:mr-1" />
                View
              </Link>
            ) : (
              <Link
                href={`/blog/${article.slug}/edit`}
                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <Edit className="w-3 h-3 mr-0.5 sm:mr-1" />
                Edit
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {article.status === 'draft' && (
              <button
                onClick={onPublish}
                className="inline-flex items-center p-1 sm:p-1.5 text-xs bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                title="Publish"
              >
                <Send className="w-3 h-3" />
              </button>
            )}

            {article.status === 'published' && isAdmin && (
              <button
                onClick={onArchive}
                className="inline-flex items-center p-1 sm:p-1.5 text-xs border border-border rounded-[var(--radius)] hover:bg-accent transition-colors"
                title="Archive (admins only)"
              >
                <Archive className="w-3 h-3" />
              </button>
            )}

            {article.status === 'archived' && (
              <button
                onClick={onUnarchive}
                className="inline-flex items-center p-1 sm:p-1.5 text-xs bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                title="Unarchive"
              >
                <Archive className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={onDelete}
              className="inline-flex items-center p-1 sm:p-1.5 text-xs border border-destructive/50 text-destructive rounded-[var(--radius)] hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
