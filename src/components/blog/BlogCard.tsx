'use client'

import { BlogPost } from '@/types/blog'
import Link from 'next/link'
import { Calendar, Clock, Eye, Heart, MessageCircle } from 'lucide-react'
import LikeButton from '@/components/LikeButton'

interface BlogCardProps {
  post: BlogPost
  viewMode: 'grid' | 'list'
  userId?: string
}

export default function BlogCard({ post, viewMode }: BlogCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (viewMode === 'list') {
    return (
      <Link href={`/blog/${post.slug}`}>
        <article className="bg-card border border-border overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-row">
          {/* Изображение */}
          {post.featured_image_url && (
            <div className="relative w-32 h-32 md:w-1/2 md:h-auto min-h-[8rem] overflow-hidden flex-shrink-0">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Контент */}
          <div className="p-3 md:p-6 md:w-1/2 flex flex-col justify-between flex-1 min-w-0">
            <div>
              <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-3 line-clamp-2 hover:text-[hsl(var(--blog-primary))] transition-colors cursor-pointer">
                {post.title}
              </h3>

              {post.excerpt && (
                <p className="text-muted-foreground mb-2 md:mb-4 line-clamp-2 md:line-clamp-3 text-xs md:text-sm">
                  {post.excerpt}
                </p>
              )}
            </div>

            {/* Мета-информация */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 md:pt-4 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>
              {post.reading_time_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span>{post.reading_time_minutes} min</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span>{post.view_count || 0}</span>
              </div>
              <LikeButton
                type="blog"
                itemId={post.id}
                initialCount={post.like_count || 0}
                variant="compact"
                showCount={true}
              />
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span>{post.comment_count || 0}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // Grid режим
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="bg-card border border-border overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg h-full flex flex-col">
        {/* Изображение */}
        <div className="relative h-48 overflow-hidden">
          {post.featured_image_url ? (
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
              <span className="text-4xl">📝</span>
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="p-6 flex flex-col justify-between flex-1">
          <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-[hsl(var(--blog-primary))] transition-colors cursor-pointer">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
              {post.excerpt}
            </p>
          )}

          {/* Мета-информация */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 border-t-2 border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>{formatDate(post.published_at || post.created_at)}</span>
            </div>
            {post.reading_time_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span>{post.reading_time_minutes} min</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>{post.view_count || 0}</span>
            </div>
            <LikeButton
              type="blog"
              itemId={post.id}
              initialCount={post.like_count || 0}
              variant="compact"
              showCount={true}
            />
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>{post.comment_count || 0}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
