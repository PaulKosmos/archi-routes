'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import {
  Heart,
  ArrowLeft,
  BookOpen,
  Newspaper,
  Route,
  Building2,
  Calendar,
  Eye,
  MessageCircle,
  Clock,
  MapPin,
  User as UserIcon,
  FolderPlus
} from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import BlogCard from '@/components/blog/BlogCard'
import NewsCard from '@/components/news/NewsCard'
import AddToCollectionModal from '@/components/AddToCollectionModal'
import CollectionsBadgeDropdown from '@/components/CollectionsBadgeDropdown'
import { BlogPost } from '@/types/blog'
import { NewsArticleWithDetails } from '@/types/news'

// ============================================================
// ТИПЫ
// ============================================================

type FilterType = 'all' | 'blog' | 'news' | 'route' | 'building'

interface FavoritedBlog extends BlogPost {
  favorited_at: string
}

interface FavoritedNews extends NewsArticleWithDetails {
  favorited_at: string
}

interface FavoritedRoute {
  id: string
  favorited_at: string
  route: {
    id: string
    title: string
    description: string | null
    route_visibility: string
    city: string
    thumbnail_url: string | null
    distance_km: number | null
    estimated_duration_minutes: number | null
    created_at: string
    profiles?: {
      username: string | null
      avatar_url: string | null
    }
  }
}

interface FavoritedBuilding {
  id: string
  favorited_at: string
  building: {
    id: string
    name: string
    description: string | null
    architect: string | null
    year_built: number | null
    architectural_style: string | null
    city: string
    image_url: string | null
    latitude: number
    longitude: number
  }
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ProfileFavoritesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)

  const [favoritedBlogs, setFavoritedBlogs] = useState<FavoritedBlog[]>([])
  const [favoritedNews, setFavoritedNews] = useState<FavoritedNews[]>([])
  const [favoritedRoutes, setFavoritedRoutes] = useState<FavoritedRoute[]>([])
  const [favoritedBuildings, setFavoritedBuildings] = useState<FavoritedBuilding[]>([])

  // Состояние для модалки добавления в коллекцию
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'blog' | 'news' | 'route' | 'building'; title: string } | null>(null)

  // Состояние для хранения информации о коллекциях каждого элемента
  const [itemCollections, setItemCollections] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map())

  const handleAddToCollection = (id: string, type: 'blog' | 'news' | 'route' | 'building', title: string) => {
    setSelectedItem({ id, type, title })
    setIsCollectionModalOpen(true)
  }

  const handleCloseCollectionModal = () => {
    setIsCollectionModalOpen(false)
    setSelectedItem(null)
  }

  /**
   * Загружает все избранное пользователя
   */
  useEffect(() => {
    if (user) {
      loadAllFavorites()
    }
  }, [user])

  /**
   * Загружает информацию о коллекциях когда избранные элементы изменяются
   */
  useEffect(() => {
    if (user && !loading) {
      loadItemCollections()
    }
  }, [favoritedBlogs, favoritedNews, favoritedRoutes, favoritedBuildings, user, loading])

  const loadAllFavorites = async () => {
    if (!user) return

    setLoading(true)
    try {
      await Promise.all([
        loadFavoritedBlogs(),
        loadFavoritedNews(),
        loadFavoritedRoutes(),
        loadFavoritedBuildings()
      ])
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Загружает информацию о том, в каких коллекциях находятся избранные элементы
   */
  const loadItemCollections = async () => {
    if (!user) return

    try {
      // Собираем все ID избранных элементов
      const allItemIds: string[] = [
        ...favoritedBlogs.map(b => b.id),
        ...favoritedNews.map(n => n.id),
        ...favoritedRoutes.map(r => r.route.id),
        ...favoritedBuildings.map(b => b.building.id)
      ]

      if (allItemIds.length === 0) return

      // Загружаем все коллекции пользователя с их элементами
      const { data: collections, error } = await supabase
        .from('user_collections')
        .select(`
          id,
          name,
          collection_items!inner (
            item_id
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Создаем Map для быстрого поиска коллекций по item_id
      const collectionsMap = new Map<string, Array<{ id: string; name: string }>>()

      collections?.forEach(collection => {
        collection.collection_items?.forEach((item: any) => {
          if (!collectionsMap.has(item.item_id)) {
            collectionsMap.set(item.item_id, [])
          }
          collectionsMap.get(item.item_id)!.push({
            id: collection.id,
            name: collection.name
          })
        })
      })

      setItemCollections(collectionsMap)
    } catch (error) {
      console.error('Error loading item collections:', error)
    }
  }

  /**
   * Загружает лайкнутые блоги
   */
  const loadFavoritedBlogs = async () => {
    if (!user) return

    try {
      // Сначала получаем реакции пользователя
      const { data: reactions, error: reactionsError } = await supabase
        .from('blog_post_reactions')
        .select('post_id, created_at')
        .eq('user_id', user.id)
        .eq('reaction_type', 'like')
        .order('created_at', { ascending: false })

      if (reactionsError) throw reactionsError
      if (!reactions || reactions.length === 0) {
        setFavoritedBlogs([])
        return
      }

      // Получаем IDs постов
      const postIds = reactions.map(r => r.post_id)

      // Теперь получаем сами посты
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          content,
          featured_image_url,
          author_id,
          published_at,
          created_at,
          updated_at,
          view_count,
          reading_time_minutes,
          status
        `)
        .in('id', postIds)

      if (postsError) throw postsError

      // Объединяем данные
      const blogs: FavoritedBlog[] = (posts || []).map(post => {
        const reaction = reactions.find(r => r.post_id === post.id)
        return {
          ...post,
          favorited_at: reaction?.created_at || post.created_at
        }
      })

      // Сортируем по дате добавления в избранное
      blogs.sort((a, b) => new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime())

      setFavoritedBlogs(blogs)
    } catch (error) {
      console.error('Error loading favorited blogs:', error)
    }
  }

  /**
   * Загружает лайкнутые новости
   */
  const loadFavoritedNews = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('news_interactions')
        .select(`
          created_at,
          architecture_news (
            id,
            title,
            slug,
            summary,
            content,
            featured_image_url,
            author_id,
            published_at,
            created_at,
            updated_at,
            category,
            tags,
            views_count,
            likes_count,
            shares_count,
            featured,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('interaction_type', 'like')
        .order('created_at', { ascending: false })

      if (error) throw error

      const news: FavoritedNews[] = (data || [])
        .filter(item => item.architecture_news)
        .map(item => ({
          ...(item.architecture_news as unknown as NewsArticleWithDetails),
          favorited_at: item.created_at
        }))

      setFavoritedNews(news)
    } catch (error) {
      console.error('Error loading favorited news:', error)
    }
  }

  /**
   * Загружает избранные маршруты
   */
  const loadFavoritedRoutes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_route_favorites')
        .select(`
          id,
          created_at,
          routes (
            id,
            title,
            description,
            route_visibility,
            city,
            thumbnail_url,
            distance_km,
            estimated_duration_minutes,
            created_at,
            profiles:created_by (
              username,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const routes: FavoritedRoute[] = (data || [])
        .filter(item => item.routes)
        .map(item => ({
          id: item.id,
          favorited_at: item.created_at,
          route: item.routes as any
        }))

      setFavoritedRoutes(routes)
    } catch (error) {
      console.error('Error loading favorited routes:', error)
    }
  }

  /**
   * Загружает избранные здания
   */
  const loadFavoritedBuildings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_building_favorites')
        .select(`
          id,
          created_at,
          buildings:building_id (
            id,
            name,
            description,
            architect,
            year_built,
            architectural_style,
            city,
            image_url,
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const buildings: FavoritedBuilding[] = (data || [])
        .filter(item => item.buildings)
        .map(item => ({
          id: item.id,
          favorited_at: item.created_at,
          building: item.buildings as any
        }))

      setFavoritedBuildings(buildings)
    } catch (error) {
      console.error('Error loading favorited buildings:', error)
    }
  }

  /**
   * Форматирование даты
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  /**
   * Подсчет общего количества избранного
   */
  const totalFavorites = favoritedBlogs.length + favoritedNews.length + favoritedRoutes.length + favoritedBuildings.length

  /**
   * Фильтры
   */
  const filters: { type: FilterType; label: string; icon: any; count: number }[] = [
    { type: 'all', label: 'Все', icon: Heart, count: totalFavorites },
    { type: 'blog', label: 'Блоги', icon: BookOpen, count: favoritedBlogs.length },
    { type: 'news', label: 'Новости', icon: Newspaper, count: favoritedNews.length },
    { type: 'route', label: 'Маршруты', icon: Route, count: favoritedRoutes.length },
    { type: 'building', label: 'Здания', icon: Building2, count: favoritedBuildings.length }
  ]

  // ============================================================
  // РЕНДЕР
  // ============================================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Вход необходим</h1>
            <p className="text-muted-foreground mb-6">Для просмотра избранного необходимо войти в систему</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Войти
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header buildings={[]} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pt-10">
          {/* Шапка */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                  <Heart className="w-6 h-6" />
                  Избранное
                </h1>
                <p className="text-muted-foreground mt-1">
                  {totalFavorites} {totalFavorites === 1 ? 'элемент' : totalFavorites < 5 ? 'элемента' : 'элементов'}
                </p>
              </div>
            </div>
          </div>

        {/* Фильтры */}
        <div className="mb-8 bg-card border border-border rounded-[var(--radius)] p-2">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.type}
                onClick={() => setActiveFilter(filter.type)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius)] font-medium transition-all ${
                  activeFilter === filter.type
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                <filter.icon className="w-4 h-4" />
                <span>{filter.label}</span>
                <span className={`text-sm ${
                  activeFilter === filter.type ? 'opacity-90' : 'text-muted-foreground'
                }`}>
                  ({filter.count})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : totalFavorites === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-20 h-20 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Пока нет избранного</h3>
            <p className="text-muted-foreground mb-6">Лайкайте контент, который вам нравится!</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Начать изучать
            </Link>
          </div>
        ) : (
          <>
            {/* Блоги */}
            {(activeFilter === 'all' || activeFilter === 'blog') && favoritedBlogs.length > 0 && (
              <div className="mb-12">
                {activeFilter === 'all' && (
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-[hsl(var(--blog-primary))]" />
                    Блоги ({favoritedBlogs.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoritedBlogs.map((blog) => {
                    const collections = itemCollections.get(blog.id) || []
                    return (
                      <div key={blog.id} className="relative group">
                        <BlogCard post={blog} viewMode="grid" userId={user.id} />

                        {/* Индикатор коллекций */}
                        {collections.length > 0 && (
                          <div className="absolute top-3 left-3 z-10">
                            <CollectionsBadgeDropdown collections={collections} />
                          </div>
                        )}

                        {/* Кнопка добавления в коллекцию */}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleAddToCollection(blog.id, 'blog', blog.title)
                          }}
                          className="absolute top-3 right-3 p-2 bg-background/90 border border-border rounded-[var(--radius)] hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-md"
                          title="Добавить в коллекцию"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Новости */}
            {(activeFilter === 'all' || activeFilter === 'news') && favoritedNews.length > 0 && (
              <div className="mb-12">
                {activeFilter === 'all' && (
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-[hsl(var(--news-primary))]" />
                    Новости ({favoritedNews.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoritedNews.map((news) => {
                    const collections = itemCollections.get(news.id) || []
                    return (
                      <div key={news.id} className="relative group">
                        <NewsCard news={news} variant="compact" />

                        {/* Индикатор коллекций */}
                        {collections.length > 0 && (
                          <div className="absolute top-3 left-3 z-10">
                            <CollectionsBadgeDropdown collections={collections} />
                          </div>
                        )}

                        {/* Кнопка добавления в коллекцию */}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleAddToCollection(news.id, 'news', news.title)
                          }}
                          className="absolute top-3 right-3 p-2 bg-background/90 border border-border rounded-[var(--radius)] hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-md"
                          title="Добавить в коллекцию"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Маршруты */}
            {(activeFilter === 'all' || activeFilter === 'route') && favoritedRoutes.length > 0 && (
              <div className="mb-12">
                {activeFilter === 'all' && (
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                    <Route className="w-6 h-6 text-[hsl(var(--route-primary))]" />
                    Маршруты ({favoritedRoutes.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoritedRoutes.map((item) => {
                    const collections = itemCollections.get(item.route.id) || []
                    return (
                      <div key={item.id} className="relative group/wrapper">
                        <Link
                          href={`/routes/${item.route.id}`}
                          className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-shadow block"
                        >
                        <div className="relative h-48 bg-muted">
                          {item.route.thumbnail_url ? (
                            <img
                              src={item.route.thumbnail_url}
                              alt={item.route.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Route className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-[hsl(var(--route-primary))] transition-colors">
                            {item.route.title}
                          </h3>
                          {item.route.description && (
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {item.route.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                            {item.route.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{item.route.city}</span>
                              </div>
                            )}
                            {item.route.distance_km && (
                              <span>{item.route.distance_km.toFixed(1)} км</span>
                            )}
                          </div>
                        </div>
                        </Link>

                        {/* Индикатор коллекций */}
                        {collections.length > 0 && (
                          <div className="absolute top-3 left-3 z-10">
                            <CollectionsBadgeDropdown collections={collections} />
                          </div>
                        )}

                        {/* Кнопка добавления в коллекцию */}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleAddToCollection(item.route.id, 'route', item.route.title)
                          }}
                          className="absolute top-3 right-3 p-2 bg-background/90 border border-border rounded-[var(--radius)] hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 group-hover/wrapper:opacity-100 z-10 shadow-md"
                          title="Добавить в коллекцию"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Здания */}
            {(activeFilter === 'all' || activeFilter === 'building') && favoritedBuildings.length > 0 && (
              <div className="mb-12">
                {activeFilter === 'all' && (
                  <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-primary" />
                    Здания ({favoritedBuildings.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoritedBuildings.map((item) => {
                    const collections = itemCollections.get(item.building.id) || []
                    return (
                      <div key={item.id} className="relative group/wrapper">
                        <Link
                          href={`/buildings/${item.building.id}`}
                          className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-shadow block"
                        >
                        <div className="relative h-48 bg-muted">
                          {item.building.image_url ? (
                            <img
                              src={item.building.image_url}
                              alt={item.building.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {item.building.name}
                          </h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {item.building.architect && (
                              <p>Архитектор: {item.building.architect}</p>
                            )}
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{item.building.city}</span>
                              {item.building.year_built && <span>• {item.building.year_built}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>

                      {/* Индикаторы коллекций */}
                      {collections.length > 0 && (
                        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1 max-w-[60%]">
                          {collections.slice(0, 2).map((collection) => (
                            <Link
                              key={collection.id}
                              href={`/collections/${collection.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500 text-white text-xs rounded-full hover:bg-indigo-600 transition-colors shadow-sm"
                              title={collection.name}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Folder className="w-3 h-3" />
                              <span className="max-w-[80px] truncate">{collection.name}</span>
                            </Link>
                          ))}
                          {collections.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 bg-indigo-500 text-white text-xs rounded-full shadow-sm">
                              +{collections.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Кнопка добавления в коллекцию */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleAddToCollection(item.building.id, 'building', item.building.name)
                        }}
                        className="absolute top-3 right-3 p-2 bg-background/90 border border-border rounded-[var(--radius)] hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 group-hover/wrapper:opacity-100 z-10 shadow-md"
                        title="Добавить в коллекцию"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>
      <EnhancedFooter />

      {/* Модалка добавления в коллекцию */}
      {selectedItem && (
        <AddToCollectionModal
          isOpen={isCollectionModalOpen}
          onClose={handleCloseCollectionModal}
          itemId={selectedItem.id}
          itemType={selectedItem.type}
          itemTitle={selectedItem.title}
        />
      )}
    </div>
  )
}
