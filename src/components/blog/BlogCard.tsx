'use client'

import { BlogPost } from '@/types/blog'
import Link from 'next/link'
import { Calendar, Clock, Eye, Heart, MessageCircle } from 'lucide-react'
import SocialActions from './SocialActions'

interface BlogCardProps {
  post: BlogPost
  viewMode: 'grid' | 'list'
  userId?: string
}

export default function BlogCard({ post, viewMode }: BlogCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (viewMode === 'list') {
    return (
      <Link href={`/blog/${post.slug}`}>
        <article className="bg-card overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col md:flex-row">
          {/* Изображение */}
          {post.featured_image_url && (
            <div className="relative md:w-1/2 h-48 overflow-hidden">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Контент */}
          <div className="p-6 md:w-1/2 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-[hsl(var(--blog-primary))] transition-colors cursor-pointer">
                {post.title}
              </h3>

              {post.excerpt && (
                <p className="text-muted-foreground mb-4 line-clamp-3 text-sm">
                  {post.excerpt}
                </p>
              )}
            </div>

            {/* Мета-информация */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {post.reading_time_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{post.reading_time_minutes} мин</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{post.view_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  <span>{post.like_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{post.comment_count || 0}</span>
                </div>
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
      <article className="bg-card overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg h-full">
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
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-[hsl(var(--blog-primary))] transition-colors cursor-pointer">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
              {post.excerpt}
            </p>
          )}

          {/* Мета-информация */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(post.published_at || post.created_at)}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {post.reading_time_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{post.reading_time_minutes} мин</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{post.view_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                <span>{post.like_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{post.comment_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
