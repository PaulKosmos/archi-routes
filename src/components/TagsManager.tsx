'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PodcastTag } from '@/types/podcast'
import { Plus, Edit2, Trash2, Save, X, Loader2, Tag } from 'lucide-react'

interface TagsManagerProps {
  tags: PodcastTag[]
  selectedTagIds: string[]
  onTagsSelect: (tagIds: string[]) => void
  onTagCreated: (newTag: PodcastTag) => void
  onTagUpdated: (updatedTag: PodcastTag) => void
  onTagDeleted: (tagId: string) => void
}

export default function TagsManager({
  tags,
  selectedTagIds,
  onTagsSelect,
  onTagCreated,
  onTagUpdated,
  onTagDeleted
}: TagsManagerProps) {
  const supabase = createClient()

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for new/edited tag
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      slug: ''
    })
    setError(null)
  }

  const handleStartCreate = () => {
    resetForm()
    setIsCreating(true)
    setEditingId(null)
  }

  const handleStartEdit = (tag: PodcastTag) => {
    setFormData({
      name: tag.name,
      slug: tag.slug || ''
    })
    setEditingId(tag.id)
    setIsCreating(false)
    setError(null)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    resetForm()
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: generateSlug(name)
    })
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Название тега обязательно')
      return false
    }
    if (!formData.slug.trim()) {
      setError('Slug обязателен')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      if (editingId) {
        // Update existing tag
        const { data, error: updateError } = await supabase
          .from('podcast_tags')
          .update({
            name: formData.name,
            slug: formData.slug
          })
          .eq('id', editingId)
          .select()
          .single()

        if (updateError) throw updateError

        onTagUpdated(data)
        setEditingId(null)
      } else {
        // Create new tag
        const { data, error: createError } = await supabase
          .from('podcast_tags')
          .insert([{
            name: formData.name,
            slug: formData.slug
          }])
          .select()
          .single()

        if (createError) throw createError

        onTagCreated(data)
        // Auto-select newly created tag
        onTagsSelect([...selectedTagIds, data.id])
        setIsCreating(false)
      }

      resetForm()
    } catch (err) {
      console.error('Error saving tag:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении тега')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (tagId: string) => {
    if (!confirm('Удалить этот тег? Это действие нельзя отменить.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('podcast_tags')
        .delete()
        .eq('id', tagId)

      if (deleteError) throw deleteError

      onTagDeleted(tagId)
      // Remove from selection if selected
      if (selectedTagIds.includes(tagId)) {
        onTagsSelect(selectedTagIds.filter(id => id !== tagId))
      }
    } catch (err) {
      console.error('Error deleting tag:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при удалении тега')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsSelect(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagsSelect([...selectedTagIds, tagId])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Теги
        </label>
        {!isCreating && !editingId && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
            disabled={loading}
          >
            <Plus size={16} />
            Создать тег
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tag selection */}
      {!isCreating && !editingId && (
        <div className="space-y-3">
          {tags.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Выберите теги для подкаста
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      className="inline-flex items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                        disabled={loading}
                      >
                        <Tag size={14} />
                        {tag.name}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Management section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Управление тегами
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-gray-500" />
                        <p className="text-sm font-medium text-gray-900">
                          {tag.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tag)}
                          className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                          disabled={loading}
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag.id)}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                          disabled={loading}
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <Tag size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Нет доступных тегов. Создайте первый тег!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit form */}
      {(isCreating || editingId) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
          <h4 className="font-semibold text-gray-900">
            {editingId ? 'Редактировать тег' : 'Новый тег'}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Название тега"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="tag-slug"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Генерируется автоматически из названия
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Сохранить
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
              Отменить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
