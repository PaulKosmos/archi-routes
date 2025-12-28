'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { NewsArticle } from '@/types/news'
import { Calendar, Eye, Tag } from 'lucide-react'

interface NewsWithAuthor extends NewsArticle {
  author?: {
    id: string
    display_name?: string
    full_name?: string
    avatar_url?: string
  }
}

export default function NewsSection() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [news, setNews] = useState<NewsWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLatestNews() {
      try {
        const { data, error } = await supabase
          .from('architecture_news')
          .select('*')
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(4)

        if (error) {
          console.error('Error fetching news:', error)
          setLoading(false)
          return
        }

        if (data && data.length > 0) {
          const authorIds = [...new Set((data as any[]).map((article: any) => article.author_id).filter(Boolean))]

          let authorsData: any[] = []
          if (authorIds.length > 0) {
            const { data: fetchedAuthors } = await supabase
              .from('profiles')
              .select('id, display_name, full_name, avatar_url')
              .in('id', authorIds)
            authorsData = fetchedAuthors || []
          }

          const authorsMap = new Map(authorsData.map((author: any) => [author.id, author]))
          const newsWithAuthors = (data as any[]).map((article: any) => ({
            ...article,
            author: article.author_id ? authorsMap.get(article.author_id) : null
          }))

          setNews(newsWithAuthors as NewsWithAuthor[])
        } else {
          setNews([])
        }
      } catch (err) {
        console.error('Failed to fetch news:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestNews()
  }, [supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'projects': 'Проекты',
      'events': 'События',
      'personalities': 'Персоналии',
      'trends': 'Тренды',
      'planning': 'Планирование',
      'heritage': 'Наследие'
    }
    return labels[category] || category
  }

  const handleNewsClick = (slug: string) => {
    router.push(`/news/${slug}`)
  }

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted w-64 mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-32 h-32 bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted w-20" />
                    <div className="h-6 bg-muted" />
                    <div className="h-4 bg-muted w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (news.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="w-1 h-8 bg-foreground"></div>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Architecture News
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Architecture <span className="font-light italic">News</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Latest events and projects from the world of architecture
              </p>
            </div>

            <button
              onClick={() => router.push('/news')}
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            >
              All News
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* News Grid - Compact cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
          {news.map((article) => (
            <article
              key={article.id}
              onClick={() => handleNewsClick(article.slug)}
              className="group cursor-pointer bg-card border border-border hover:border-foreground/30 transition-all overflow-hidden flex h-full min-h-[160px]"
              style={{ borderRadius: '2px' }}
            >
              {/* Compact image left */}
              <div className="relative w-32 h-32 flex-shrink-0 bg-muted">
                {article.featured_image_url ? (
                  <Image
                    src={getStorageUrl(article.featured_image_url, 'photos')}
                    alt={article.featured_image_alt || article.title}
                    fill
                    className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                    sizes="128px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content right */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                {/* Category and date */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 bg-muted border border-border text-xs font-medium"
                    style={{ borderRadius: '2px' }}
                  >
                    {getCategoryLabel(article.category)}
                  </span>
                  {article.published_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-foreground line-clamp-2 mb-2">
                  {article.title}
                </h3>

                {/* Summary */}
                {article.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {article.summary}
                  </p>
                )}

                {/* Meta bottom */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {article.city && (
                    <div className="flex items-center gap-1">
                      <Tag size={12} />
                      <span>{article.city}</span>
                    </div>
                  )}
                  {article.views_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{article.views_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Mobile "All news" button */}
        <div className="mt-8 text-center md:hidden">
          <button
            onClick={() => router.push('/news')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
            style={{ borderRadius: '2px' }}
          >
            <span>All News</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
