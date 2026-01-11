'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { Folder, Globe, ArrowLeft, Loader2, Copy, Check, BookOpen, Newspaper, Route as RouteIcon, Building2, MapPin, Calendar, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  share_token: string | null
  thumbnail_url: string | null
  items_count: number
  created_at: string
  updated_at: string
  profiles?: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

interface CollectionItem {
  id: string
  collection_id: string
  item_type: 'blog' | 'news' | 'route' | 'building'
  item_id: string
  added_at: string
  item_data?: any
}

export default function PublicCollectionPage({ collectionId, shareToken }: { collectionId: string; shareToken: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [collection, setCollection] = useState<Collection | null>(null)
  const [items, setItems] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    loadCollection()
  }, [collectionId, shareToken])

  const loadCollection = async () => {
    setLoading(true)
    try {
      // Загружаем коллекцию по share_token
      const { data: collectionData, error: collectionError } = await supabase
        .from('user_collections')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('id', collectionId)
        .eq('share_token', shareToken)
        .single()

      if (collectionError) throw collectionError

      // Проверяем что коллекция публичная
      if (!collectionData.is_public) {
        toast.error('This collection is private')
        router.push('/')
        return
      }

      setCollection(collectionData)

      // Загружаем элементы коллекции
      const { data: itemsData, error: itemsError } = await supabase
        .from('collection_items')
        .select('*')
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false })

      if (itemsError) throw itemsError

      // Загружаем данные для каждого элемента
      const itemsWithData = await Promise.all(
        (itemsData || []).map(async (item) => {
          let itemData = null

          try {
            if (item.item_type === 'blog') {
              const { data } = await supabase
                .from('blog_posts')
                .select('id, title, excerpt, featured_image_url, created_at')
                .eq('id', item.item_id)
                .single()
              itemData = data
            } else if (item.item_type === 'news') {
              const { data } = await supabase
                .from('architecture_news')
                .select('id, title, summary, featured_image_url, published_at')
                .eq('id', item.item_id)
                .single()
              itemData = data
            } else if (item.item_type === 'route') {
              const { data } = await supabase
                .from('routes')
                .select('id, title, description, thumbnail_url, created_at, distance_km')
                .eq('id', item.item_id)
                .single()
              itemData = data
            } else if (item.item_type === 'building') {
              const { data } = await supabase
                .from('buildings')
                .select('id, name, city, country, architect, year_built, image_url, latitude, longitude')
                .eq('id', item.item_id)
                .single()
              itemData = data
            }
          } catch (err) {
            console.error(`Error loading ${item.item_type} ${item.item_id}:`, err)
          }

          return {
            ...item,
            item_data: itemData
          }
        })
      )

      setItems(itemsWithData.filter(item => item.item_data !== null))
    } catch (error) {
      console.error('Error loading collection:', error)
      toast.error('Collection not found')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const copyCollection = async () => {
    if (!user) {
      toast.error('Sign in to copy collection')
      return
    }

    if (!collection) return

    setCopying(true)
    try {
      // Создаем новую коллекцию
      const { data: newCollection, error: createError } = await supabase
        .from('user_collections')
        .insert({
          user_id: user.id,
          name: `${collection.name} (copy)`,
          description: collection.description,
          is_public: false
        })
        .select()
        .single()

      if (createError) throw createError

      // Копируем все элементы
      const itemsToInsert = items.map(item => ({
        collection_id: newCollection.id,
        item_type: item.item_type,
        item_id: item.item_id
      }))

      const { error: itemsError } = await supabase
        .from('collection_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast.success('Collection copied to your profile!')

      // Перенаправляем на новую коллекцию
      setTimeout(() => {
        router.push(`/collections/${newCollection.id}`)
      }, 1000)
    } catch (error) {
      console.error('Error copying collection:', error)
      toast.error('Error copying collection')
    } finally {
      setCopying(false)
    }
  }

  const renderItem = (item: CollectionItem) => {
    const { item_type, item_data } = item

    if (!item_data) return null

    if (item_type === 'blog') {
      return (
        <Link
          href={`/blog/${item.item_id}`}
          className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-all"
        >
          <div className="relative h-48 bg-muted">
            {item_data.featured_image_url ? (
              <Image
                src={item_data.featured_image_url}
                alt={item_data.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-muted-foreground opacity-30" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                Blog
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item_data.title}
            </h3>
            {item_data.excerpt && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {item_data.excerpt}
              </p>
            )}
            <div className="flex items-center justify-end text-xs text-muted-foreground">
              <span>Added {new Date(item.added_at).toLocaleDateString('en-US')}</span>
            </div>
          </div>
        </Link>
      )
    }

    if (item_type === 'news') {
      return (
        <Link
          href={`/news/${item.item_id}`}
          className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-all"
        >
          <div className="relative h-48 bg-muted">
            {item_data.featured_image_url ? (
              <Image
                src={item_data.featured_image_url}
                alt={item_data.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Newspaper className="w-12 h-12 text-muted-foreground opacity-30" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                News
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item_data.title}
            </h3>
            {item_data.summary && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {item_data.summary}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(item_data.published_at).toLocaleDateString('en-US')}</span>
              <span>{new Date(item.added_at).toLocaleDateString('en-US')}</span>
            </div>
          </div>
        </Link>
      )
    }

    if (item_type === 'route') {
      return (
        <Link
          href={`/routes/${item.item_id}`}
          className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-all"
        >
          <div className="relative h-48 bg-muted">
            {item_data.thumbnail_url ? (
              <Image
                src={item_data.thumbnail_url}
                alt={item_data.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <RouteIcon className="w-12 h-12 text-muted-foreground opacity-30" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                Route
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item_data.title}
            </h3>
            {item_data.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {item_data.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {item_data.distance_km && <span>{item_data.distance_km} km</span>}
              <span>{new Date(item.added_at).toLocaleDateString('en-US')}</span>
            </div>
          </div>
        </Link>
      )
    }

    if (item_type === 'building') {
      return (
        <Link
          href={`/buildings/${item.item_id}`}
          className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-all"
        >
          <div className="relative h-48 bg-muted">
            {item_data.image_url ? (
              <Image
                src={item_data.image_url}
                alt={item_data.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-12 h-12 text-muted-foreground opacity-30" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
                Building
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item_data.name}
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground mb-3">
              {item_data.architect && (
                <p className="line-clamp-1">{item_data.architect}</p>
              )}
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{item_data.city}, {item_data.country}</span>
              </div>
              {item_data.year_built && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{item_data.year_built}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Added {new Date(item.added_at).toLocaleDateString('en-US')}
            </div>
          </div>
        </Link>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Collection not found</h2>
            <p className="text-muted-foreground mb-6">
              The collection doesn't exist or the link is invalid
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-10 pb-8 max-w-7xl">
        {/* Баннер публичной коллекции */}
        <div className="bg-primary/10 border border-primary/20 rounded-[var(--radius)] p-4 mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Public Collection</p>
              <p className="text-sm text-muted-foreground">
                You are viewing the collection from{' '}
                <span className="font-semibold text-foreground">
                  {collection.profiles?.full_name || collection.profiles?.username || 'Anonymous'}
                </span>
              </p>
            </div>
            {user && (
              <button
                onClick={copyCollection}
                disabled={copying}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {copying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to my collections
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Заголовок коллекции */}
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Folder className="w-8 h-8 text-primary" />
                {collection.name}
              </h1>
              <div className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </div>
            </div>

            {collection.description && (
              <p className="text-muted-foreground mb-6">{collection.description}</p>
            )}

            <div className="flex items-center justify-between border-t border-border pt-6">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  Items: <span className="font-semibold text-foreground">{items.length}</span>
                </div>
                <div>
                  Created: {new Date(collection.created_at).toLocaleDateString('en-US')}
                </div>
              </div>

              {/* Автор коллекции */}
              {collection.profiles && (
                <div className="flex items-center gap-3 bg-muted/50 rounded-[var(--radius)] px-4 py-2">
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {collection.profiles.full_name || collection.profiles.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">Collection Author</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Элементы коллекции */}
        {items.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-[var(--radius)] p-8">
            <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Collection is empty
            </h3>
            <p className="text-muted-foreground">
              This collection doesn't have any items yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
      </main>
      <EnhancedFooter />
    </div>
  )
}
