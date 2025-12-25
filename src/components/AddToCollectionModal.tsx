'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Plus, Check, Folder, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Collection {
  id: string
  name: string
  description: string | null
  items_count: number
  is_public: boolean
}

interface AddToCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemType: 'blog' | 'news' | 'route' | 'building'
  itemTitle?: string
}

export default function AddToCollectionModal({
  isOpen,
  onClose,
  itemId,
  itemType,
  itemTitle
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCollections()
    }
  }, [isOpen, itemId])

  const loadCollections = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Войдите, чтобы добавить в коллекцию')
        onClose()
        return
      }

      // Загружаем коллекции пользователя
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('user_collections')
        .select('id, name, description, is_public')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (collectionsError) throw collectionsError

      // Для каждой коллекции получаем количество элементов
      const collectionsWithCounts = await Promise.all(
        (collectionsData || []).map(async (collection) => {
          const { count } = await supabase
            .from('collection_items')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id)

          return {
            ...collection,
            items_count: count || 0
          }
        })
      )

      setCollections(collectionsWithCounts)

      // Проверяем, в каких коллекциях уже есть этот элемент
      const { data: existingItems } = await supabase
        .from('collection_items')
        .select('collection_id')
        .eq('item_id', itemId)
        .eq('item_type', itemType)

      const existingCollectionIds = new Set(
        (existingItems || []).map(item => item.collection_id)
      )
      setSelectedCollections(existingCollectionIds)

    } catch (error) {
      console.error('Error loading collections:', error)
      toast.error('Ошибка загрузки коллекций')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections)
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId)
    } else {
      newSelected.add(collectionId)
    }
    setSelectedCollections(newSelected)
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Введите название коллекции')
      return
    }

    setCreating(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newCollection, error } = await supabase
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
      setCollections(prev => [{
        ...newCollection,
        items_count: 0
      }, ...prev])

      // Автоматически выбираем новую коллекцию
      setSelectedCollections(prev => new Set([...prev, newCollection.id]))

      // Очищаем форму
      setNewCollectionName('')
      setNewCollectionDescription('')
      setShowCreateForm(false)

      toast.success('Коллекция создана')
    } catch (error) {
      console.error('Error creating collection:', error)
      toast.error('Ошибка создания коллекции')
    } finally {
      setCreating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Получаем текущие элементы в коллекциях для этого item
      const { data: currentItems } = await supabase
        .from('collection_items')
        .select('collection_id')
        .eq('item_id', itemId)
        .eq('item_type', itemType)

      const currentCollectionIds = new Set(
        (currentItems || []).map(item => item.collection_id)
      )

      // Определяем, что нужно добавить и что удалить
      const toAdd = Array.from(selectedCollections).filter(
        id => !currentCollectionIds.has(id)
      )
      const toRemove = Array.from(currentCollectionIds).filter(
        id => !selectedCollections.has(id)
      )

      // Удаляем из коллекций
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('collection_items')
          .delete()
          .eq('item_id', itemId)
          .eq('item_type', itemType)
          .in('collection_id', toRemove)

        if (deleteError) throw deleteError
      }

      // Добавляем в коллекции
      if (toAdd.length > 0) {
        const itemsToInsert = toAdd.map(collectionId => ({
          collection_id: collectionId,
          item_id: itemId,
          item_type: itemType
        }))

        const { error: insertError } = await supabase
          .from('collection_items')
          .insert(itemsToInsert)

        if (insertError) throw insertError
      }

      toast.success('Изменения сохранены')
      onClose()
    } catch (error) {
      console.error('Error saving to collections:', error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Добавить в коллекцию</h2>
            {itemTitle && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{itemTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Create new collection form */}
              {showCreateForm ? (
                <div className="border border-border rounded-[var(--radius)] p-4 bg-muted/50">
                  <h3 className="font-semibold text-sm mb-3">Новая коллекция</h3>
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Название коллекции"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Описание (опционально)"
                        value={newCollectionDescription}
                        onChange={(e) => setNewCollectionDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-[var(--radius)] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        rows={2}
                        maxLength={500}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateCollection}
                        disabled={creating || !newCollectionName.trim()}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2"
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
                      <button
                        onClick={() => {
                          setShowCreateForm(false)
                          setNewCollectionName('')
                          setNewCollectionDescription('')
                        }}
                        className="px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors text-sm"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-border rounded-[var(--radius)] hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Создать новую коллекцию</span>
                </button>
              )}

              {/* Collections list */}
              {collections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">У вас пока нет коллекций</p>
                  <p className="text-xs mt-1">Создайте первую коллекцию выше</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Мои коллекции</h3>
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => handleToggleCollection(collection.id)}
                      className="w-full p-4 border border-border rounded-[var(--radius)] hover:bg-muted/50 transition-colors flex items-start gap-3 text-left"
                    >
                      <div
                        className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                          selectedCollections.has(collection.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {selectedCollections.has(collection.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground truncate">
                            {collection.name}
                          </h4>
                          {collection.is_public && (
                            <span className="text-xs text-primary">🔗</span>
                          )}
                        </div>
                        {collection.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {collection.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {collection.items_count} {collection.items_count === 1 ? 'элемент' : 'элементов'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
