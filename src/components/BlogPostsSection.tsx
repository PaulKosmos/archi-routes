'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { BlogPost } from '@/types/blog'
import { Clock, User, ArrowRight, ArrowLeft, Calendar } from 'lucide-react'

interface BlogPostWithAuthor extends BlogPost {
  author?: {
    id: string
    display_name?: string
    full_name?: string
    avatar_url?: string
  }
}

export default function BlogPostsSection() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<BlogPostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    async function fetchLatestPosts() {
      try {
        // First, fetch the posts without the author relationship (workaround for relationship cache issue)
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(5)

        if (error) {
          console.error('Error fetching blog posts:', error)
          setLoading(false)
          return
        }

        // If we have posts, fetch author information separately
        if (data && data.length > 0) {
          const authorIds = [...new Set((data as any[]).map((post: any) => post.author_id))]
          
          const { data: authorsData } = await supabase
            .from('profiles')
            .select('id, display_name, full_name, avatar_url')
            .in('id', authorIds)

          // Merge author data with posts
          const authorsMap = new Map((authorsData || []).map((author: any) => [author.id, author]))
          const postsWithAuthors = (data as any[]).map((post: any) => ({
            ...post,
            author: authorsMap.get(post.author_id)
          }))

          setPosts(postsWithAuthors as BlogPostWithAuthor[])
        } else {
          setPosts([])
        }
      } catch (err) {
        console.error('Failed to fetch blog posts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestPosts()
  }, [supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const handlePostClick = (slug: string) => {
    router.push(`/blog/${slug}`)
  }

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 420
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
      setTimeout(checkScrollPosition, 300)
    }
  }

  useEffect(() => {
    checkScrollPosition()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollPosition)
      return () => container.removeEventListener('scroll', checkScrollPosition)
    }
  }, [posts])

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 w-48 bg-gray-200 rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (posts.length === 0) {
    return null // Не показываем секцию если нет постов
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-12 animate-fade-in">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Путешествия
            </h2>
            <p className="text-lg text-gray-600">
              Истории о городах и архитектурных открытиях
            </p>
          </div>
          <button
            onClick={() => router.push('/blog')}
            className="hidden md:flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
          >
            <span>Все статьи</span>
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Статьи с горизонтальным скроллом */}
        <div className="relative group">
          {/* Навигационные кнопки */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-all hover:scale-110 hidden lg:flex items-center justify-center"
              aria-label="Предыдущие статьи"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
          )}
          
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide flex gap-8 pb-2"
            onScroll={checkScrollPosition}
          >
            {posts.map((post, index) => (
            <article
              key={post.id}
              onClick={() => handlePostClick(post.slug)}
              className="group cursor-pointer animate-fade-in flex flex-col flex-shrink-0 w-96"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Изображение */}
              <div className="relative h-64 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-blue-100 to-purple-100">
                {post.featured_image_url ? (
                  <Image
                    src={getStorageUrl(post.featured_image_url, 'photos')}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  // Fallback градиент если нет изображения
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-50" />
                )}

                {/* Оверлей при hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>

              {/* Контент */}
              <div className="space-y-3">
                {/* Мета информация */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {post.published_at && (
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                  )}
                  {post.reading_time_minutes && (
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{post.reading_time_minutes} мин</span>
                    </div>
                  )}
                </div>

                {/* Заголовок */}
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
                  {post.title}
                </h3>

                {/* Описание */}
                {post.excerpt && (
                  <p className="text-gray-600 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                {/* Автор */}
                {post.author && (
                  <div className="flex items-center space-x-2 pt-2">
                    {post.author.avatar_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                        <Image
                          src={getStorageUrl(post.author.avatar_url, 'photos')}
                          alt={post.author.display_name || post.author.full_name || 'Автор'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                    )}
                    <span className="text-sm text-gray-700 font-medium">
                      {post.author.display_name || post.author.full_name || 'Аноним'}
                    </span>
                  </div>
                )}

                {/* Индикатор "Читать" при hover */}
                <div className="flex items-center space-x-2 text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-2">
                  <span className="text-sm">Читать статью</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </article>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-all hover:scale-110 hidden lg:flex items-center justify-center"
              aria-label="Следующие статьи"
            >
              <ArrowRight size={20} className="text-gray-600" />
            </button>
          )}
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
