'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { Folder, Plus, Lock, Globe, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Collection {
  id: string
  name: string
  description: string | null
  is_public: boolean
  thumbnail_url: string | null
  items_count: number
  created_at: string
  updated_at: string
}

export default function ProfileCollectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/profile')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadCollections()
    }
  }, [user, supabase])

  const loadCollections = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setCollections(data || [])
    } catch (error) {
      console.error('Error loading collections:', error)
      toast.error('Error loading collections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) {
      toast.error('Enter collection name')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('user_collections')
        .insert({
          user_id: user.id,
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim() || null,
          is_public: false
        })
        .select()
        .single()

      if (error) throw error

      // Добавляем новую коллекцию в список
      setCollections(prev => [data, ...prev])

      // Очищаем форму
      setNewCollectionName('')
      setNewCollectionDescription('')
      setShowCreateModal(false)

      toast.success('Collection created')

      // Перенаправляем на страницу коллекции
      router.push(`/collections/${data.id}`)
    } catch (error) {
      console.error('Error creating collection:', error)
      toast.error('Error creating collection')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-6 sm:pt-10 max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Link
              href="/profile"
              className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Collections
              </h1>
              <p className="text-muted-foreground text-xs sm:text-base mt-0.5">
                {collections.length === 0
                  ? "You don't have any collections yet"
                  : `${collections.length} ${collections.length === 1 ? 'collection' : 'collections'}`}
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium shadow-sm text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Collection</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-[var(--radius)] p-6 sm:p-8">
            <Folder className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">
              You don't have any collections yet
            </h3>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              Create your first collection to save favorite buildings, routes and articles
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Create First Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow block"
              >
                {/* Thumbnail */}
                <div className="relative h-32 sm:h-48 bg-muted">
                  {collection.thumbnail_url ? (
                    <img
                      src={collection.thumbnail_url}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                    </div>
                  )}

                  {/* Public/Private Badge */}
                  <div className="absolute top-2 right-2">
                    {collection.is_public ? (
                      <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white bg-opacity-90 backdrop-blur-sm text-[10px] sm:text-xs rounded-lg shadow-sm">
                        <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" />
                        <span className="text-gray-700">Public</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white bg-opacity-90 backdrop-blur-sm text-[10px] sm:text-xs rounded-lg shadow-sm">
                        <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500" />
                        <span className="text-gray-700">Private</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-2.5 sm:p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm sm:text-base mb-1 sm:mb-2">
                    {collection.name}
                  </h3>

                  {collection.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2 hidden sm:block">
                      {collection.description}
                    </p>
                  )}

                  <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">
                        {collection.items_count || 0} {collection.items_count === 1 ? 'item' : 'items'}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                        {new Date(collection.updated_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Collection Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">Create Collection</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="E.g.: Modernism in Berlin"
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={100}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    placeholder="Describe your collection..."
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewCollectionName('')
                    setNewCollectionDescription('')
                  }}
                  disabled={creating}
                  className="px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={creating || !newCollectionName.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
      <EnhancedFooter />
    </div>
  )
}
