'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PodcastSeries } from '@/types/podcast'
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface SeriesManagerProps {
  series: PodcastSeries[]
  selectedSeriesId: string | null
  onSeriesSelect: (seriesId: string | null) => void
  onSeriesCreated: (newSeries: PodcastSeries) => void
  onSeriesUpdated: (updatedSeries: PodcastSeries) => void
  onSeriesDeleted: (seriesId: string) => void
}

export default function SeriesManager({
  series,
  selectedSeriesId,
  onSeriesSelect,
  onSeriesCreated,
  onSeriesUpdated,
  onSeriesDeleted
}: SeriesManagerProps) {
  const supabase = createClient()

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for new/edited series
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    cover_image_url: ''
  })
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      description: '',
      cover_image_url: ''
    })
    setCoverImageFile(null)
    setError(null)
  }

  const handleStartCreate = () => {
    resetForm()
    setIsCreating(true)
    setEditingId(null)
  }

  const handleStartEdit = (s: PodcastSeries) => {
    setFormData({
      title: s.title,
      slug: s.slug || '',
      description: s.description || '',
      cover_image_url: s.cover_image_url || ''
    })
    setCoverImageFile(null)
    setEditingId(s.id)
    setIsCreating(false)
    setError(null)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    resetForm()
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    })
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Series title is required')
      return false
    }
    if (!formData.slug.trim()) {
      setError('Slug is required')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      let coverImageUrl = formData.cover_image_url

      // Upload cover image if provided
      if (coverImageFile) {
        const fileName = `${Date.now()}-${coverImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('podcasts')
          .upload(`series/${fileName}`, coverImageFile)

        if (uploadError) throw new Error(`Cover upload error: ${uploadError.message}`)
        coverImageUrl = `series/${fileName}`
      }

      if (editingId) {
        // Update existing series
        const { data, error: updateError } = await supabase
          .from('podcast_series')
          .update({
            title: formData.title,
            slug: formData.slug,
            description: formData.description || null,
            cover_image_url: coverImageUrl || null
          })
          .eq('id', editingId)
          .select()
          .single()

        if (updateError) throw updateError

        onSeriesUpdated(data)
        setEditingId(null)
      } else {
        // Create new series
        const { data, error: createError } = await supabase
          .from('podcast_series')
          .insert([{
            title: formData.title,
            slug: formData.slug,
            description: formData.description || null,
            cover_image_url: coverImageUrl || null
          }])
          .select()
          .single()

        if (createError) throw createError

        onSeriesCreated(data)
        onSeriesSelect(data.id)
        setIsCreating(false)
      }

      resetForm()
    } catch (err) {
      console.error('Error saving series:', err)
      setError(err instanceof Error ? err.message : 'Error saving series')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (seriesId: string) => {
    if (!confirm('Delete this series? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('podcast_series')
        .delete()
        .eq('id', seriesId)

      if (deleteError) throw deleteError

      onSeriesDeleted(seriesId)
      if (selectedSeriesId === seriesId) {
        onSeriesSelect(null)
      }
    } catch (err) {
      console.error('Error deleting series:', err)
      setError(err instanceof Error ? err.message : 'Error deleting series')
    } finally {
      setLoading(false)
    }
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must not exceed 5MB')
        return
      }
      setCoverImageFile(file)
      setError(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Series
        </label>
        {!isCreating && !editingId && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
            disabled={loading}
          >
            <Plus size={16} />
            Create Series
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Series selector */}
      {!isCreating && !editingId && (
        <div className="space-y-3">
          <select
            value={selectedSeriesId || ''}
            onChange={(e) => onSeriesSelect(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          >
            <option value="">No series</option>
            {series.map(s => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {/* List of existing series with edit/delete */}
          {series.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Series Management
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {series.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.title}
                      </p>
                      {s.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(s)}
                        className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                        disabled={loading}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        disabled={loading}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit form */}
      {(isCreating || editingId) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
          <h4 className="font-semibold text-gray-900">
            {editingId ? 'Edit Series' : 'New Series'}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Series title"
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
              placeholder="series-slug"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated from title
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief series description..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Series Cover
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            {coverImageFile && (
              <p className="text-xs text-green-600 mt-1">
                File selected: {coverImageFile.name}
              </p>
            )}
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
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save
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
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
