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
      toast.error('Ошибка загрузки коллекций')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) {
      toast.error('Введите название коллекции')
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

      toast.success('Коллекция создана')

      // Перенаправляем на страницу коллекции
      router.push(`/collections/${data.id}`)
    } catch (error) {
      console.error('Error creating collection:', error)
      toast.error('Ошибка создания коллекции')
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
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад в профиль
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Folder className="w-8 h-8 text-primary" />
                Мои коллекции
              </h1>
              <p className="text-muted-foreground">
                {collections.length === 0
                  ? 'У вас пока нет коллекций'
                  : `${collections.length} ${collections.length === 1 ? 'коллекция' : collections.length < 5 ? 'коллекции' : 'коллекций'}`}
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Создать коллекцию
            </button>
          </div>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-[var(--radius)] p-8">
            <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              У вас пока нет коллекций
            </h3>
            <p className="text-muted-foreground mb-6">
              Создайте свою первую коллекцию, чтобы собирать избранные здания, маршруты и статьи
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Создать первую коллекцию
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg transition-all hover:border-primary/50"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-muted">
                  {collection.thumbnail_url ? (
                    <img
                      src={collection.thumbnail_url}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder className="w-16 h-16 text-muted-foreground opacity-30" />
                    </div>
                  )}

                  {/* Public/Private Badge */}
                  <div className="absolute top-3 right-3">
                    {collection.is_public ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full shadow-sm">
                        <Globe className="w-3 h-3" />
                        <span>Публичная</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-background/90 border border-border text-xs rounded-full shadow-sm">
                        <Lock className="w-3 h-3" />
                        <span>Приватная</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {collection.name}
                  </h3>

                  {collection.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {collection.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {collection.items_count || 0} {collection.items_count === 1 ? 'элемент' : collection.items_count < 5 ? 'элемента' : 'элементов'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(collection.updated_at).toLocaleDateString('ru-RU')}
                    </span>
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
                <h2 className="text-xl font-semibold text-foreground">Создать коллекцию</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Название коллекции
                  </label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Например: Модернизм в Берлине"
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={100}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Описание <span className="text-muted-foreground font-normal">(опционально)</span>
                  </label>
                  <textarea
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    placeholder="Опишите вашу коллекцию..."
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
                  Отмена
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={creating || !newCollectionName.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Создать
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <EnhancedFooter />
    </div>
  )
}
