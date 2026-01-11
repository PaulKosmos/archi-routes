'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { BlogPost, BlogContentBlock } from '@/types/blog'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  User,
  Heart
} from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import ContentBlockRenderer from '@/components/blog/ContentBlockRenderer'
import BlogRouteBuilder from '@/components/blog/BlogRouteBuilder'
import SocialActions from '@/components/blog/SocialActions'
// Глобальный Set для отслеживания просмотренных статей в текущей сессии
const viewedPosts = new Set<string>()

// Встроенный компонент ScrollToTop с "убеганием" от курсора
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [buttonBottom, setButtonBottom] = useState(32) // 32px = 2rem (default bottom-8)
  const [buttonRight, setButtonRight] = useState(0) // смещение по горизонтали
  const [isRunningAway, setIsRunningAway] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      // Показываем кнопку после прокрутки 300px
      setIsVisible(window.scrollY > 300)

      // Проверяем положение футера
      const footer = document.querySelector('footer')
      if (footer) {
        const footerRect = footer.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const buttonHeight = 48 // примерная высота кнопки
        const spacing = 32 // отступ от футера (2rem)

        // Если футер виден в viewport (его верх выше нижнего края окна)
        if (footerRect.top < windowHeight) {
          // Вычисляем, насколько нужно поднять кнопку
          const overlap = windowHeight - footerRect.top
          const newBottom = spacing + overlap
          setButtonBottom(newBottom)
        } else {
          // Футер не виден - возвращаем к стандартному положению
          setButtonBottom(spacing)
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Отслеживание позиции мыши для "убегания"
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return

      const button = buttonRef.current
      const buttonRect = button.getBoundingClientRect()
      const buttonCenterX = buttonRect.left + buttonRect.width / 2
      const buttonCenterY = buttonRect.top + buttonRect.height / 2

      // Вычисляем расстояние от курсора до центра кнопки
      const distanceX = e.clientX - buttonCenterX
      const distanceY = e.clientY - buttonCenterY
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

      // Если курсор ближе 100px - кнопка "убегает" (с задержкой)
      const triggerDistance = 100

      if (distance < triggerDistance) {
        // Очищаем предыдущий таймер, если курсор двигается
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
        }

        // Задержка 200ms перед убеганием - дает шанс "поймать" кнопку быстрым движением
        escapeTimeoutRef.current = setTimeout(() => {
          setIsRunningAway(true)

          // Вычисляем направление убегания (противоположное от курсора)
          const angle = Math.atan2(distanceY, distanceX)
          const escapeDistance = 80 // уменьшено для более плавного движения

          const newRight = -Math.cos(angle) * escapeDistance
          const newBottomOffset = -Math.sin(angle) * escapeDistance

          // Получаем положение футера
          const footer = document.querySelector('footer')
          const windowHeight = window.innerHeight
          const buttonHeight = 48

          let maxBottom = buttonBottom + 150 // максимальная высота подъема

          if (footer) {
            const footerRect = footer.getBoundingClientRect()
            // Вычисляем максимальную высоту, чтобы не заходить за футер
            const footerTop = footerRect.top
            const maxAllowedBottom = windowHeight - footerTop - buttonHeight - 32

            if (maxAllowedBottom > 32) {
              maxBottom = Math.min(maxBottom, maxAllowedBottom + buttonBottom)
            }
          }

          // Ограничиваем перемещение
          const maxRight = 200
          const newBottomValue = buttonBottom + newBottomOffset

          setButtonRight(Math.max(-maxRight, Math.min(maxRight, newRight)))
          setButtonBottom(Math.max(32, Math.min(maxBottom, newBottomValue)))
        }, 200) // задержка 200ms
      } else if (distance > triggerDistance + 100) {
        // Очищаем таймер убегания, если курсор отдалился
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
          escapeTimeoutRef.current = null
        }

        // Возвращаем кнопку на место, когда курсор отдаляется
        setIsRunningAway(false)
        setButtonRight(0)

        // Пересчитываем исходное положение относительно футера
        const footer = document.querySelector('footer')
        if (footer) {
          const footerRect = footer.getBoundingClientRect()
          const windowHeight = window.innerHeight
          const spacing = 32

          if (footerRect.top < windowHeight) {
            const overlap = windowHeight - footerRect.top
            setButtonBottom(spacing + overlap)
          } else {
            setButtonBottom(spacing)
          }
        }
      }
    }

    if (isVisible) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        // Очищаем таймер при размонтировании
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
        }
      }
    }
  }, [isVisible, buttonBottom])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={scrollToTop}
      className="fixed z-[9999] p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 hover:scale-110"
      style={{
        bottom: `${buttonBottom}px`,
        right: `calc(50% - 640px + 2rem + ${buttonRight}px)`,
        transition: isRunningAway
          ? 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' // плавное убегание с пружинящим эффектом
          : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', // плавный возврат
        willChange: 'bottom, right' // оптимизация производительности
      }}
      aria-label="Scroll to top"
    >
      <ArrowLeft className="h-6 w-6 rotate-90" />
    </button>
  )
}

export default function BlogPostPage() {
  const supabase = useMemo(() => createClient(), [])
  const { slug } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [blocks, setBlocks] = useState<BlogContentBlock[]>([])
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const viewCountUpdated = useRef(false)

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

      // Увеличиваем счетчик просмотров через безопасную функцию (только один раз за сессию)
      if (!viewedPosts.has(postData.id)) {
        viewedPosts.add(postData.id)

        const newViewCount = (postData.view_count || 0) + 1
        console.log(`📈 Updating view count for "${postData.title}" from ${postData.view_count || 0} to ${newViewCount}`)

        const { error: updateError } = await supabase
          .rpc('increment_blog_post_view_count', { post_id: postData.id })

        if (updateError) {
          console.error('❌ Error updating view count:', updateError)
        } else {
          console.log('✅ View count updated successfully in database')
          // Обновляем локальное состояние
          postData.view_count = newViewCount
        }
      }

      setPost(postData)

      // Загружаем блоки контента если это блог с блоками
      if (postData.editor_version === 'blocks') {
        const { data: blocksData } = await supabase
          .from('blog_content_blocks')
          .select(`
            *,
            building:buildings(*)
          `)
          .eq('blog_post_id', postData.id)
          .order('order_index', { ascending: true })

        setBlocks(blocksData || [])
      }

      // Загружаем похожие статьи (той же категории)
      console.log('🔍 Current post category:', postData.category)

      // Загружаем похожие статьи только если есть категория
      if (postData.category) {
        const { data: relatedData, error: relatedError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .eq('category', postData.category)
          .neq('id', postData.id)
          .order('published_at', { ascending: false })
          .limit(2)

        console.log('📚 Related posts found:', relatedData?.length || 0)
        if (relatedError) console.error('❌ Error loading related posts:', relatedError)

        setRelatedPosts(relatedData || [])
      } else {
        console.log('⚠️ No category set for this post')
        setRelatedPosts([])
      }

      // Загружаем рекомендуемые статьи (самые популярные)
      const { data: recommendedData } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .neq('id', postData.id)
        .order('view_count', { ascending: false })
        .limit(2)

      setRecommendedPosts(recommendedData || [])

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
      <div className="min-h-screen bg-background">
        <Header buildings={[]} />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/6"></div>
            </div>
          </div>
        </div>
        <ScrollToTopButton />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article may have been deleted or never existed</p>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
          >
            To Blog
          </Link>
        </div>
        <ScrollToTopButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header buildings={[]} />

      <main className="container mx-auto px-6 py-8">
        {/* Back button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Articles</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <article className="lg:col-span-2">
            {/* Cover image with action buttons */}
            {post.featured_image_url ? (
              <div className="relative mb-8">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full aspect-[16/9] object-cover"
                />

                {/* Action buttons overlay */}
                <div className="absolute top-4 right-4">
                  <SocialActions
                    blogPostId={post.id}
                    blogPostTitle={post.title}
                    blogPostUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                    userId={user?.id}
                    showCounts={false}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-8 flex justify-end">
                <SocialActions
                  blogPostId={post.id}
                  blogPostTitle={post.title}
                  blogPostUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                  userId={user?.id}
                  showCounts={false}
                />
              </div>
            )}

            {/* Header section */}
            <header className="mb-8">
              {post.category && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-[var(--radius)]">
                    {post.category}
                  </span>
                </div>
              )}

              <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-sans">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Article Author</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(post.published_at || post.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{post.reading_time_minutes} min read</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{post.view_count}</span>
                </div>
              </div>
            </header>

            {/* Content */}
            <div className="space-y-12">
              {post.editor_version === 'blocks' && blocks.length > 0 ? (
                <>
                  {blocks.map((block) => (
                    <ContentBlockRenderer key={block.id} block={block} />
                  ))}
                </>
              ) : post.content ? (
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : null}
            </div>

            {/* Построение маршрута */}
            {post.editor_version === 'blocks' && blocks.length > 0 && (
              <div className="mt-12">
                <BlogRouteBuilder
                  blocks={blocks}
                  blogPostId={post.id}
                  blogPostTitle={post.title}
                  user={user}
                />
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-8">
            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-card border border-border p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>More from Category</h3>
                <div className="space-y-4">
                  {relatedPosts.map(relatedPost => (
                    <Link
                      key={relatedPost.id}
                      href={`/blog/${relatedPost.slug}`}
                      className="flex gap-4 group"
                    >
                      {relatedPost.featured_image_url && (
                        <img
                          src={relatedPost.featured_image_url}
                          alt={relatedPost.title}
                          className="w-20 h-20 object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {relatedPost.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(relatedPost.published_at || relatedPost.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended posts */}
            {recommendedPosts.length > 0 && (
              <div className="bg-card border border-border p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>Recommended</h3>
                <div className="space-y-4">
                  {recommendedPosts.map(recommendedPost => (
                    <Link
                      key={recommendedPost.id}
                      href={`/blog/${recommendedPost.slug}`}
                      className="flex gap-4 group"
                    >
                      {recommendedPost.featured_image_url && (
                        <img
                          src={recommendedPost.featured_image_url}
                          alt={recommendedPost.title}
                          className="w-20 h-20 object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {recommendedPost.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(recommendedPost.published_at || recommendedPost.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <EnhancedFooter />
      <ScrollToTopButton />
    </div>
  )
}
