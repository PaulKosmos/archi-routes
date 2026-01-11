'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import ShareCollectionModal from '@/components/ShareCollectionModal'
import { Folder, Plus, Lock, Globe, ArrowLeft, Loader2, Trash2, Edit2, Share2, Copy, Check, ExternalLink, MapPin, Calendar, BookOpen, Newspaper, Route as RouteIcon, Building2 } from 'lucide-react'
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
}

interface CollectionItem {
  id: string
  collection_id: string
  item_type: 'blog' | 'news' | 'route' | 'building'
  item_id: string
  added_at: string
  // Данные элемента из соответствующей таблицы
  item_data?: any
}

export default function CollectionDetailPage({ collectionId }: { collectionId: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [collection, setCollection] = useState<Collection | null>(null)
  const [items, setItems] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const isOwner = user && collection && user.id === collection.user_id

  useEffect(() => {
    if (!authLoading) {
      loadCollection()
    }
  }, [collectionId, user, authLoading])

  const loadCollection = async () => {
    setLoading(true)
    try {
      // Загружаем коллекцию
      const { data: collectionData, error: collectionError } = await supabase
        .from('user_collections')
        .select('*')
        .eq('id', collectionId)
        .single()

      if (collectionError) throw collectionError

      // Проверяем права доступа
      if (!collectionData.is_public && (!user || collectionData.user_id !== user.id)) {
        toast.error("You don't have access to this collection")
        router.push('/profile/collections')
        return
      }

      setCollection(collectionData)
      setNewName(collectionData.name)
      setNewDescription(collectionData.description || '')

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
      toast.error('Error loading collection')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateName = async () => {
    if (!isOwner || !newName.trim()) {
      toast.error('Enter collection name')
      return
    }

    try {
      const { error } = await supabase
        .from('user_collections')
        .update({ name: newName.trim() })
        .eq('id', collectionId)

      if (error) throw error

      setCollection(prev => prev ? { ...prev, name: newName.trim() } : null)
      setEditingName(false)
      toast.success('Name updated')
    } catch (error) {
      console.error('Error updating name:', error)
      toast.error('Error updating name')
    }
  }

  const handleUpdateDescription = async () => {
    if (!isOwner) return

    try {
      const { error } = await supabase
        .from('user_collections')
        .update({ description: newDescription.trim() || null })
        .eq('id', collectionId)

      if (error) throw error

      setCollection(prev => prev ? { ...prev, description: newDescription.trim() || null } : null)
      setEditingDescription(false)
      toast.success('Description updated')
    } catch (error) {
      console.error('Error updating description:', error)
      toast.error('Error updating description')
    }
  }

  const togglePublic = async () => {
    if (!isOwner || !collection) return

    try {
      const newIsPublic = !collection.is_public

      const { error } = await supabase
        .from('user_collections')
        .update({ is_public: newIsPublic })
        .eq('id', collectionId)

      if (error) throw error

      setCollection(prev => prev ? { ...prev, is_public: newIsPublic } : null)
      toast.success(newIsPublic ? 'Collection is now public' : 'Collection is now private')
    } catch (error) {
      console.error('Error toggling public:', error)
      toast.error('Error changing privacy')
    }
  }

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true)
  }

  const removeItem = async (itemId: string) => {
    if (!isOwner) return

    const confirmed = confirm('Remove item from collection?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Item removed from collection')
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error('Error removing item')
    }
  }

  const deleteCollection = async () => {
    if (!isOwner) return

    const confirmed = confirm('Delete collection? This action cannot be undone.')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('user_collections')
        .delete()
        .eq('id', collectionId)

      if (error) throw error

      toast.success('Collection deleted')
      router.push('/profile/collections')
    } catch (error) {
      console.error('Error deleting collection:', error)
      toast.error('Error deleting collection')
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
            {isOwner && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
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
            {isOwner && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
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
              <span>{new Date(item_data.published_at).toLocaleDateString('ru-RU')}</span>
              <span>{new Date(item.added_at).toLocaleDateString('ru-RU')}</span>
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
            {isOwner && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
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
              {item_data.distance_km && <span>{item_data.distance_km} км</span>}
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
            {isOwner && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
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

  if (authLoading || loading) {
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
            <h2 className="text-2xl font-bold mb-2">Collection Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The collection doesn't exist or you don't have access to it
            </p>
            <Link
              href="/profile/collections"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Collections
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
        {/* Навигация */}
        <div className="mb-6">
          <Link
            href="/profile/collections"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collections
          </Link>
        </div>

        {/* Заголовок коллекции */}
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm mb-8">
          <div className="p-6">
            {/* Название и кнопки управления */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false)
                        setNewName(collection.name)
                      }}
                      className="px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Folder className="w-8 h-8 text-primary" />
                    {collection.name}
                    {isOwner && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-2">
                {collection.is_public ? (
                  <div className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1 bg-background border border-border text-sm rounded-full">
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </div>
                )}
              </div>
            </div>

            {/* Описание */}
            <div className="mb-6">
              {editingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add collection description..."
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateDescription}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(false)
                        setNewDescription(collection.description || '')
                      }}
                      className="px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : collection.description ? (
                <div className="flex items-start gap-2">
                  <p className="text-muted-foreground flex-1">{collection.description}</p>
                  {isOwner && (
                    <button
                      onClick={() => setEditingDescription(true)}
                      className="p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ) : isOwner ? (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  + Add description
                </button>
              ) : null}
            </div>

            {/* Действия */}
            <div className="flex items-center justify-between border-t border-border pt-6">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  Items: <span className="font-semibold text-foreground">{items.length}</span>
                </div>
                <div>
                  Created: {new Date(collection.created_at).toLocaleDateString('en-US')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    <button
                      onClick={togglePublic}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors text-sm"
                    >
                      {collection.is_public ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Make Private
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4" />
                          Make Public
                        </>
                      )}
                    </button>
                  </>
                )}

                <button
                  onClick={handleOpenShareModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors text-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>

                {isOwner && (
                  <button
                    onClick={deleteCollection}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-[var(--radius)] hover:bg-red-50 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Collection
                  </button>
                )}
              </div>
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
            <p className="text-muted-foreground mb-6">
              Add items from favorites using the "Add to collection" button
            </p>
            <Link
              href="/profile/favorites"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              Go to Favorites
            </Link>
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

      {/* Share Collection Modal */}
      {collection && (
        <ShareCollectionModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          collectionId={collection.id}
          collectionName={collection.name}
          shareToken={collection.share_token}
          isPublic={collection.is_public}
          onMakePublic={togglePublic}
        />
      )}
    </div>
  )
}
