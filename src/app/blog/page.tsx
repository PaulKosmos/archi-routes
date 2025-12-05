'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo } from 'react'
import { BlogPost } from '@/types/blog'
import { createClient } from '@/lib/supabase'
import BlogCard from '@/components/blog/BlogCard'
import BlogFilters from '@/components/blog/BlogFilters'
import Header from '@/components/Header'
import { Search, Grid, List } from 'lucide-react'
import Link from 'next/link'

export default function BlogPage() {
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadPosts()
    
    // Периодическое обновление каждые 10 секунд
    const interval = setInterval(loadPosts, 10000)
    
    // Обновление при возвращении на страницу
    const handleFocus = () => {
      loadPosts()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    // Простая фильтрация по поисковому запросу
    if (searchTerm) {
      const filtered = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredPosts(filtered)
    } else {
      setFilteredPosts(posts)
    }
  }, [posts, searchTerm])

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (error) throw error
      
      // Принудительное обновление состояния
      const freshData = JSON.parse(JSON.stringify(data || []))
      setPosts([])
      setTimeout(() => setPosts(freshData), 10)
      
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">
              Блог об архитектуре
            </h1>
            {/* Кнопка создать статью */}
            <Link
              href="/blog/create"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Создать статью</span>
            </Link>
          </div>
          <p className="text-lg text-gray-600">
            Исследуйте архитектурные жемчужины городов мира
          </p>
        </div>

        {/* Поиск и фильтры */}
        <div className="mb-8 space-y-4">

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск статей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Переключатель вида */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Найдено статей: {filteredPosts.length}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Список статей */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Статьи не найдены
            </h3>
            <p className="text-gray-600">
              Попробуйте изменить поисковый запрос
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-6'
          }>
            {filteredPosts.map((post) => (
              <BlogCard
                key={`${post.id}-${Date.now()}-${post.view_count || 0}`}
                post={post}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
