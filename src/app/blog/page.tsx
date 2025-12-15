'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { BlogPost } from '@/types/blog'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { supabaseQueryWithTimeout } from '@/lib/query-timeout'
import BlogCard from '@/components/blog/BlogCard'
import BlogFilters from '@/components/blog/BlogFilters'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { Search, Grid, List } from 'lucide-react'
import Link from 'next/link'

export default function BlogPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadPosts()
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
      console.log('📚 Blog: Starting to load posts...')
      setLoading(true)

      // Загружаем посты с timeout защитой
      console.log('📚 Blog: Fetching posts from database...')
      const { data: postsData, error } = await supabaseQueryWithTimeout(
        () => supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
        {
          timeout: 8000,
          errorMessage: 'Blog posts query timeout',
          fallbackValue: { data: [], error: null }
        }
      )

      console.log('📚 Blog: Posts query completed', {
        count: postsData?.length || 0,
        hasError: !!error
      })

      if (error) {
        console.error('📚 Blog: Error loading posts:', error)
        setPosts([])
        setLoading(false)
        return
      }

      if (!postsData || postsData.length === 0) {
        console.log('📚 Blog: No posts found')
        setPosts([])
        setLoading(false)
        return
      }

      // Загружаем реакции для всех постов с timeout защитой
      console.log('📚 Blog: Fetching reactions...')
      const postIds = postsData.map(post => post.id)
      const { data: reactions } = await supabaseQueryWithTimeout(
        () => supabase
          .from('blog_post_reactions')
          .select('post_id, reaction_type')
          .in('post_id', postIds),
        {
          timeout: 5000,
          errorMessage: 'Blog reactions query timeout',
          fallbackValue: { data: [], error: null }
        }
      )

      console.log('📚 Blog: Reactions query completed', {
        count: reactions?.length || 0
      })

      // Агрегируем счётчики для каждого поста
      const reactionCounts = new Map()
      reactions?.forEach(reaction => {
        if (!reactionCounts.has(reaction.post_id)) {
          reactionCounts.set(reaction.post_id, { like_count: 0, save_count: 0, share_count: 0 })
        }
        const counts = reactionCounts.get(reaction.post_id)
        if (reaction.reaction_type === 'like') counts.like_count++
        else if (reaction.reaction_type === 'save') counts.save_count++
        else if (reaction.reaction_type === 'share') counts.share_count++
      })

      // Объединяем посты со счётчиками
      const postsWithCounts = postsData.map(post => ({
        ...post,
        like_count: reactionCounts.get(post.id)?.like_count || 0,
        save_count: reactionCounts.get(post.id)?.save_count || 0,
        share_count: reactionCounts.get(post.id)?.share_count || 0,
        comment_count: 0
      }))

      console.log('📚 Blog: Setting posts state with', postsWithCounts.length, 'posts')
      setPosts(postsWithCounts)
      setLoading(false)
      console.log('✅ Blog: Successfully loaded all posts')

    } catch (error) {
      console.error('❌ Blog: Fatal error loading posts:', error)
      setPosts([])
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header buildings={[]} />
      <main className="container mx-auto px-6 py-8 flex-1">

        {/* Поиск и фильтры */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск статей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 h-12 border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--blog-primary))] transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-12 w-12 rounded-[var(--radius)] flex items-center justify-center transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[hsl(var(--blog-primary))] text-[hsl(var(--blog-primary-foreground))]'
                  : 'bg-background border border-border text-foreground hover:bg-muted'
              }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-12 w-12 rounded-[var(--radius)] flex items-center justify-center transition-colors ${
                viewMode === 'list'
                  ? 'bg-[hsl(var(--blog-primary))] text-[hsl(var(--blog-primary-foreground))]'
                  : 'bg-background border border-border text-foreground hover:bg-muted'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Информация и кнопка создания */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-border">
          <span className="text-sm font-medium">
            Найдено статей: <span className="font-bold text-[hsl(var(--blog-primary))]">{filteredPosts.length}</span>
          </span>
          <Link
            href="/blog/create"
            className="inline-flex items-center gap-2 bg-[hsl(var(--blog-primary))] text-[hsl(var(--blog-primary-foreground))] px-6 py-3 rounded-[var(--radius)] hover:opacity-90 transition-opacity font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать статью
          </Link>
        </div>

        {/* Список статей */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Статьи не найдены</h3>
            <p className="text-muted-foreground">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
              : 'grid grid-cols-1 gap-8'
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
      </main>
      <EnhancedFooter />
    </div>
  )
}
