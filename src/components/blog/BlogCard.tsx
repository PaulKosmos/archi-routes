'use client'

import { BlogPost } from '@/types/blog'
import Link from 'next/link'
import { Calendar, Clock, Eye, User, MapPin } from 'lucide-react'

interface BlogCardProps {
  post: BlogPost
  viewMode: 'grid' | 'list'
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
        <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-6">
          <div className="flex gap-6">
            
            {/* Изображение */}
            {post.featured_image_url && (
              <div className="flex-shrink-0 w-48 h-32">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}

            {/* Контент */}
            <div className="flex-1 space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                {post.title}
              </h2>

              {post.excerpt && (
                <p className="text-gray-600 line-clamp-2">
                  {post.excerpt}
                </p>
              )}

              {/* Мета-информация */}
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(post.published_at || post.created_at)}
                </span>
                
                {post.reading_time_minutes && (
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {post.reading_time_minutes} мин
                  </span>
                )}
                
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {post.view_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Grid режим
  return (
    <Link href={`/blog/${post.slug}`}>
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden">
        
        {/* Изображение */}
        {post.featured_image_url ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-blue-600" />
          </div>
        )}

        {/* Контент */}
        <div className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-gray-600 text-sm line-clamp-3">
              {post.excerpt}
            </p>
          )}

          {/* Мета-информация */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(post.published_at || post.created_at)}
            </span>
            
            <div className="flex items-center space-x-3">
              {post.reading_time_minutes && (
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {post.reading_time_minutes}м
                </span>
              )}
              
              <span className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {post.view_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
