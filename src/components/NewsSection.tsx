'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { NewsArticle } from '@/types/news'
import { Calendar, Eye, ArrowRight, Tag } from 'lucide-react'

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
        // Try to fetch from architecture_news table
        const { data, error } = await supabase
          .from('architecture_news')
          .select('*')
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(4)

        if (error) {
          // If table doesn't exist or there's an error, log it but don't crash
          console.error('Error fetching news:', error)
          setLoading(false)
          return
        }

        // If we have news, fetch author information separately
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

          // Merge author data with news
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

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'projects': 'bg-blue-100 text-blue-700',
      'events': 'bg-green-100 text-green-700',
      'personalities': 'bg-purple-100 text-purple-700',
      'trends': 'bg-orange-100 text-orange-700',
      'planning': 'bg-teal-100 text-teal-700',
      'heritage': 'bg-amber-100 text-amber-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  const handleNewsClick = (slug: string) => {
    router.push(`/news/${slug}`)
  }

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 w-48 bg-gray-200 rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-32 h-32 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (news.length === 0) {
    return null // Не показываем секцию если нет новостей
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-12 animate-fade-in">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Новости архитектуры
            </h2>
            <p className="text-lg text-gray-600">
              Актуальные события и проекты из мира архитектуры
            </p>
          </div>
          <button
            onClick={() => router.push('/news')}
            className="hidden md:flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
          >
            <span>Все новости</span>
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Сетка новостей - компактный вид как на archi.ru */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((article, index) => (
            <article
              key={article.id}
              onClick={() => handleNewsClick(article.slug)}
              className="group cursor-pointer bg-white rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in flex"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Компактное изображение слева */}
              <div className="relative w-32 h-32 flex-shrink-0 bg-gradient-to-br from-blue-100 to-purple-100">
                {article.featured_image_url ? (
                  <Image
                    src={getStorageUrl(article.featured_image_url, 'photos')}
                    alt={article.featured_image_alt || article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="128px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-300 to-purple-300 opacity-50" />
                )}
              </div>

              {/* Контент справа */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                {/* Категория и дата */}
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                    {getCategoryLabel(article.category)}
                  </span>
                  {article.published_at && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 font-metrics">
                      <Calendar size={12} />
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                  )}
                </div>

                {/* Заголовок */}
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2 mb-2">
                  {article.title}
                </h3>

                {/* Описание */}
                {article.summary && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {article.summary}
                  </p>
                )}

                {/* Метаданные внизу */}
                <div className="flex items-center justify-between text-xs text-gray-500 font-metrics">
                  {article.city && (
                    <div className="flex items-center space-x-1">
                      <Tag size={12} />
                      <span>{article.city}</span>
                    </div>
                  )}
                  {article.views_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <Eye size={12} />
                      <span>{article.views_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Кнопка "Все новости" для мобильных */}
        <div className="mt-12 text-center md:hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => router.push('/news')}
            className="inline-flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <span>Все новости</span>
            <ArrowRight size={20} />
          </button>
        </div>


      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
