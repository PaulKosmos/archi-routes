'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import OptimizedImage from '@/components/OptimizedImage'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { BlogPost } from '@/types/blog'
import { Clock, User, Calendar, Eye, Heart, MessageCircle } from 'lucide-react'

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

        if (data && data.length > 0) {
          const authorIds = [...new Set((data as any[]).map((post: any) => post.author_id))]

          const { data: authorsData } = await supabase
            .from('profiles')
            .select('id, display_name, full_name, avatar_url')
            .in('id', authorIds)

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
    return new Intl.DateTimeFormat('en-US', {
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
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted w-64 mb-12"></div>
            <div className="flex gap-6 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-96 space-y-4">
                  <div className="h-64 bg-muted"></div>
                  <div className="h-6 bg-muted"></div>
                  <div className="h-4 bg-muted w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (posts.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="w-1 h-8 bg-foreground"></div>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Travel Stories
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Travel <span className="font-light italic">Stories</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Discoveries, impressions and architectural findings
              </p>
            </div>

            <button
              onClick={() => router.push('/blog')}
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            >
              All Stories
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Articles Carousel */}
        <div className="relative">
          {/* Navigation Buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-2 lg:left-0 top-1/2 -translate-y-1/2 lg:-translate-x-6 z-10 bg-background/90 backdrop-blur-sm border border-border p-2 lg:p-3 hover:border-foreground/30 transition-all flex items-center justify-center shadow-lg"
              style={{ borderRadius: '2px' }}
              aria-label="Previous articles"
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide flex gap-6 pb-2"
            onScroll={checkScrollPosition}
          >
            {posts.map((post) => (
            <article
              key={post.id}
              onClick={() => handlePostClick(post.slug)}
              className="group cursor-pointer flex flex-col flex-shrink-0 w-96"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden mb-4 bg-muted border border-border hover:border-foreground/30 transition-all"
                style={{ borderRadius: '2px' }}
              >
                {post.featured_image_url ? (
                  <OptimizedImage
                    src={getStorageUrl(post.featured_image_url, 'photos')}
                    alt={post.title}
                    fill
                    className="transition-opacity duration-300 group-hover:opacity-90"
                    objectFit="cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-3">
                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {post.published_at && (
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                  )}
                  {post.reading_time_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{post.reading_time_minutes} min</span>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-foreground line-clamp-2 leading-tight">
                  {post.title}
                </h3>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed text-sm">
                    {post.excerpt}
                  </p>
                )}

                {/* Engagement metrics */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    <span>{post.view_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart size={14} />
                    <span>{post.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={14} />
                    <span>{post.comment_count || 0}</span>
                  </div>
                </div>

                {/* Author */}
                {post.author && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {post.author.avatar_url ? (
                      <div className="relative w-6 h-6 overflow-hidden bg-muted border border-border"
                        style={{ borderRadius: '2px' }}
                      >
                        <OptimizedImage
                          src={getStorageUrl(post.author.avatar_url, 'photos')}
                          alt={post.author.display_name || post.author.full_name || 'Author'}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-muted border border-border flex items-center justify-center"
                        style={{ borderRadius: '2px' }}
                      >
                        <User size={14} className="text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs text-foreground font-medium">
                      {post.author.display_name || post.author.full_name || 'Anonymous'}
                    </span>
                  </div>
                )}
              </div>
            </article>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-2 lg:right-0 top-1/2 -translate-y-1/2 lg:translate-x-6 z-10 bg-background/90 backdrop-blur-sm border border-border p-2 lg:p-3 hover:border-foreground/30 transition-all flex items-center justify-center shadow-lg"
              style={{ borderRadius: '2px' }}
              aria-label="Next articles"
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
