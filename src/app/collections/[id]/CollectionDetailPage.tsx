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
          className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow block"
        >
          <div className="relative h-32 sm:h-48 bg-muted">
            {item_data.featured_image_url ? (
              <Image
                src={item_data.featured_image_url}
                alt={item_data.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
              </div>
            )}
            {isOwner && (
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
          </div>
          <div className="p-2.5 sm:p-4">
            <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm sm:text-base mb-1 sm:mb-2">
              {item_data.title}
            </h3>
            {item_data.excerpt && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 hidden sm:block">
                {item_data.excerpt}
              </p>
            )}
            <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="inline-block bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                  Blog
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                  {new Date(item.added_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>
        </Link>
      )
    }

    if (item_type === 'news') {
      return (
        <Link
          href={`/news/${item.item_id}`}
          className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow block"
        >
          <div className="relative h-32 sm:h-48 bg-muted">
            {item_data.featured_image_url ? (
              <Image
                src={item_data.featured_image_url}
                alt={item_data.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Newspaper className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
              </div>
            )}
            {isOwner && (
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
          </div>
          <div className="p-2.5 sm:p-4">
            <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm sm:text-base mb-1 sm:mb-2">
              {item_data.title}
            </h3>
            {item_data.summary && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 hidden sm:block">
                {item_data.summary}
              </p>
            )}
            <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="inline-block bg-green-100 text-green-800 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                  News
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                  {new Date(item_data.published_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>
        </Link>
      )
    }

    if (item_type === 'route') {
      return (
        <Link
          href={`/routes/${item.item_id}`}
          className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow block"
        >
          <div className="relative h-32 sm:h-48 bg-muted">
            {item_data.thumbnail_url ? (
              <Image
                src={item_data.thumbnail_url}
                alt={item_data.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <RouteIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
              </div>
            )}
            {isOwner && (
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
          </div>
          <div className="p-2.5 sm:p-4">
            <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm sm:text-base mb-1 sm:mb-2">
              {item_data.title}
            </h3>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              {item_data.description && (
                <p className="line-clamp-2 hidden sm:block">{item_data.description}</p>
              )}
              {item_data.distance_km && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{item_data.distance_km} km</span>
                </div>
              )}
            </div>
            <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="inline-block bg-purple-100 text-purple-800 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                  Route
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                  {new Date(item.added_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>
        </Link>
      )
    }

    if (item_type === 'building') {
      return (
        <Link
          href={`/buildings/${item.item_id}`}
          className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow block"
        >
          <div className="relative h-32 sm:h-48 bg-muted">
            {item_data.image_url ? (
              <Image
                src={item_data.image_url}
                alt={item_data.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
              </div>
            )}
            {isOwner && (
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    removeItem(item.id)
                  }}
                  className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
          </div>
          <div className="p-2.5 sm:p-4">
            <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm sm:text-base mb-1 sm:mb-2">
              {item_data.name}
            </h3>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              {item_data.architect && (
                <p className="truncate">{item_data.architect}</p>
              )}
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{item_data.city}</span>
                {item_data.year_built && <span className="flex-shrink-0">• {item_data.year_built}</span>}
              </div>
            </div>
            <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="inline-block bg-orange-100 text-orange-800 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                  Building
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                  {new Date(item.added_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
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
      <main className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-6 sm:pt-10 max-w-7xl">
        {/* Навигация */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/profile/collections"
              className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <span className="truncate">{collection.name}</span>
                {isOwner && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1.5 hover:bg-muted rounded-[var(--radius)] transition-colors flex-shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </button>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
                {collection.is_public ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full">
                    <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-background border border-border text-[10px] sm:text-xs rounded-full">
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Private
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Editing name inline */}
        {editingName && (
          <div className="flex items-center gap-2 mb-4 bg-card border border-border rounded-[var(--radius)] p-3 sm:p-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              autoFocus
            />
            <button
              onClick={handleUpdateName}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingName(false)
                setNewName(collection.name)
              }}
              className="px-3 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Описание и действия - компактный блок */}
        <div className="bg-white rounded-lg shadow-sm border mb-3 sm:mb-6">
          <div className="p-3 sm:p-6">
            {/* Описание */}
            <div className="mb-3 sm:mb-4">
              {editingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add collection description..."
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateDescription}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(false)
                        setNewDescription(collection.description || '')
                      }}
                      className="px-3 py-1.5 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : collection.description ? (
                <div className="flex items-start gap-2">
                  <p className="text-muted-foreground text-sm flex-1">{collection.description}</p>
                  {isOwner && (
                    <button
                      onClick={() => setEditingDescription(true)}
                      className="p-1.5 hover:bg-muted rounded-[var(--radius)] transition-colors flex-shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ) : isOwner ? (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm"
                >
                  + Add description
                </button>
              ) : null}
            </div>

            {/* Действия */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:pt-4">
              <span className="text-xs sm:text-sm text-muted-foreground mr-auto">
                Created {new Date(collection.created_at).toLocaleDateString('en-US')}
              </span>

              {isOwner && (
                <button
                  onClick={togglePublic}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors text-xs sm:text-sm"
                >
                  {collection.is_public ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Make Private</span>
                      <span className="sm:hidden">Private</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Make Public</span>
                      <span className="sm:hidden">Public</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleOpenShareModal}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors text-xs sm:text-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>

              {isOwner && (
                <button
                  onClick={deleteCollection}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-red-300 text-red-600 rounded-[var(--radius)] hover:bg-red-50 transition-colors text-xs sm:text-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Элементы коллекции */}
        {items.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-[var(--radius)] p-6 sm:p-8">
            <Folder className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
              Collection is empty
            </h3>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              Add items from favorites using the "Add to collection" button
            </p>
            <Link
              href="/profile/favorites"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium text-sm sm:text-base"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
              Go to Favorites
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
            {items.map(item => (
              <div key={item.id}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
        </div>
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
