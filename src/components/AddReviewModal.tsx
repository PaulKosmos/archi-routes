'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { X, Star, Camera, FileAudio, Tag, Bot } from 'lucide-react'
import { Building } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { uploadImage, uploadAudio } from '@/lib/storage'
import toast from 'react-hot-toast'

interface AddReviewModalProps {
  isOpen: boolean
  onClose: () => void
  building: Building
  onSuccess?: () => void
}

interface ReviewForm {
  title: string
  content: string
  language: string
  tags: string[]
  photos: File[]
  audio: File | null
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'uz', label: '🇺🇿 Oʻzbek' },
  { value: 'tr', label: '🇹🇷 Türkçe' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'ko', label: '🇰🇷 한국어' },
  { value: 'zh', label: '🇨🇳 中文' },
  { value: 'pt', label: '🇵🇹 Português' },
  { value: 'ar', label: '🇸🇦 العربية' },
]

export default function AddReviewModal({
  isOpen,
  onClose,
  building,
  onSuccess
}: AddReviewModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()

  const [form, setForm] = useState<ReviewForm>({
    title: '',
    content: '',
    language: 'en',
    tags: [],
    photos: [],
    audio: null
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTag, setCurrentTag] = useState('')

  // Per-photo source attribution (parallel to form.photos)
  const [photoSources, setPhotoSources] = useState<Array<{ isOwnPhoto: boolean; source: string }>>([])

  const updatePhotoSource = (index: number, field: 'isOwnPhoto' | 'source', value: boolean | string) => {
    setPhotoSources(prev => prev.map((ps, i) => i === index ? { ...ps, [field]: value } : ps))
  }

  if (!isOpen) return null

  // Автоопределение типа обзора по роли пользователя
  const getReviewType = (): 'expert' | 'general' => {
    // Гиды и эксперты автоматически получают статус "expert"
    if (profile?.role === 'guide' || profile?.role === 'expert') {
      return 'expert'
    }
    // Остальные - general (модератор потом может изменить на historical/amateur)
    return 'general'
  }

  // Проверка на "Полный обзор" - яркий маркер качества
  const isFullReview = () => {
    return form.content.length >= 200 &&  // Минимум 200 символов текста
      form.photos.length >= 2 &&      // Минимум 2 фото
      form.audio !== null             // Есть аудио
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + form.photos.length > 5) {
      toast.error('Maximum 5 photos')
      return
    }
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...files] }))
    setPhotoSources(prev => [...prev, ...files.map(() => ({ isOwnPhoto: true, source: '' }))])
  }

  const removePhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
    setPhotoSources(prev => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (!currentTag.trim()) return
    if (form.tags.includes(currentTag.trim())) {
      toast.error('Tag already added')
      return
    }
    if (form.tags.length >= 10) {
      toast.error('Maximum 10 tags')
      return
    }
    setForm(prev => ({ ...prev, tags: [...prev.tags, currentTag.trim()] }))
    setCurrentTag('')
  }

  const removeTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Authorization required')
      return
    }

    if (form.content.length < 50) {
      toast.error('Minimum review length: 50 characters')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Upload photos
      let photoUrls: string[] = []
      if (form.photos.length > 0) {
        toast.loading('📷 Uploading photos...')
        const uploadPromises = form.photos.map(async photo => {
          const result = await uploadImage(photo, 'reviews', user.id)
          return result.path // Return only path, not object
        })
        photoUrls = await Promise.all(uploadPromises)
      }

      // 2. Upload audio
      let audioUrl: string | null = null
      let audioDuration: number | null = null

      if (form.audio) {
        toast.loading('🎧 Uploading audio...')

        // Get duration first
        const audio = new Audio(URL.createObjectURL(form.audio))
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            audioDuration = Math.floor(audio.duration)
            resolve(null)
          }
        })

        // Upload file (corrected signature)
        const result = await uploadAudio(form.audio, user.id)
        audioUrl = result.path // Save path, not url
      }

      // 3. Create review
      toast.loading('💾 Saving review...')

      const reviewType = getReviewType()

      // Build photo_sources array (same length as photos)
      const photoSourcesForDB = photoUrls.length > 0
        ? photoSources.slice(0, photoUrls.length).map(ps =>
            ps.isOwnPhoto ? 'My photo' : (ps.source.trim() || null)
          )
        : null

      const { data: insertedRows, error } = await supabase
        .from('building_reviews')
        .insert({
          building_id: building.id,
          user_id: user.id,
          rating: null,
          title: form.title,
          content: form.content,
          review_type: reviewType,
          photos: photoUrls.length > 0 ? photoUrls : null,
          photo_sources: photoSourcesForDB,
          audio_url: audioUrl,
          audio_duration_seconds: audioDuration,
          tags: form.tags.length > 0 ? form.tags : null,
          is_verified: false,
          is_featured: false,
          language: form.language,
          original_language: form.language,
          workflow_stage: 'submitted',
          ai_moderation_status: 'pending',
        })
        .select('id')

      if (error) {
        // Handle duplicate review gracefully
        const msg: string = error?.message || (error as any)?.details || JSON.stringify(error)
        if (msg.includes('duplicate key') || msg.includes('building_id_user_id_language')) {
          throw new Error('You have already submitted a review in this language for this building. You can edit your existing review.')
        }
        throw new Error(msg || 'Failed to save review')
      }

      const newReviewId = insertedRows?.[0]?.id

      // 4. Update review count
      const { data: buildingData } = await supabase
        .from('buildings')
        .select('review_count')
        .eq('id', building.id)
        .single()

      await supabase
        .from('buildings')
        .update({
          review_count: (buildingData?.review_count || 0) + 1
        })
        .eq('id', building.id)

      toast.success('Review submitted! It will appear after moderation.')

      // Очистка формы
      setForm({
        title: '',
        content: '',
        language: 'en',
        tags: [],
        photos: [],
        audio: null
      })
      setPhotoSources([])

      onClose()
      if (onSuccess) onSuccess()

    } catch (error: any) {
      console.error('Error creating review:', error)
      toast.error('Error creating review: ' + (error.message || 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Write a Review
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              About object: <span className="font-medium">{building.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Information banner */}
            <div className={`border-2 rounded-lg p-4 transition-all ${isFullReview()
              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
              : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
              }`}>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{isFullReview() ? '⭐' : '🗺️'}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center">
                    {isFullReview() ? (
                      <>
                        Full Review!
                        <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
                          BEST
                        </span>
                      </>
                    ) : (
                      'Create a full review for maximum impact'
                    )}
                  </h3>
                  <p className="text-sm text-gray-700 mb-2">
                    {isFullReview()
                      ? 'Your review will get maximum priority in routes!'
                      : 'Add at least 2 photos and audio to 200+ character text'
                    }
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {/* Role status */}
                    {(profile?.role === 'guide' || profile?.role === 'expert') && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center">
                        👨‍🎓 Expert Review
                      </span>
                    )}

                    {/* Progress to "Full Review" */}
                    <span className={`px-2 py-1 rounded-full font-medium ${form.content.length >= 200 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {form.content.length >= 200 ? '✓' : '○'} 200+ characters text
                    </span>
                    <span className={`px-2 py-1 rounded-full font-medium ${form.photos.length >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {form.photos.length >= 2 ? '✓' : '○'} 2+ photos ({form.photos.length}/2)
                    </span>
                    <span className={`px-2 py-1 rounded-full font-medium ${form.audio ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {form.audio ? '✓' : '○'} Audio
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Заголовок */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of your impression"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.title.length}/100 characters
              </p>
            </div>

            {/* Текст обзора */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Text *
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your impressions about the architecture, history, atmosphere of the place..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 50 characters. Current length: {form.content.length}
              </p>
            </div>

            {/* Язык обзора */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌐 Review Language
              </label>
              <select
                value={form.language}
                onChange={(e) => setForm(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {LANGUAGE_OPTIONS.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Фотографии */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (2-3 recommended for full review)
              </label>

              {form.photos.length < 5 && (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                  <div className="text-center">
                    <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-sm text-gray-600">
                      Upload photo (max. 5)
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}

              {form.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {form.photos.map((photo, index) => {
                    const ps = photoSources[index] ?? { isOwnPhoto: true, source: '' }
                    return (
                      <div key={index} className="group">
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Per-photo source attribution */}
                        <div className="mt-1.5 space-y-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ps.isOwnPhoto}
                              onChange={(e) => updatePhotoSource(index, 'isOwnPhoto', e.target.checked)}
                              className="w-3 h-3 accent-blue-600"
                            />
                            <span className="text-xs text-gray-600">My photo</span>
                          </label>
                          {!ps.isOwnPhoto && (
                            <input
                              type="text"
                              value={ps.source}
                              onChange={(e) => updatePhotoSource(index, 'source', e.target.value)}
                              placeholder="Source / credit..."
                              className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Аудио */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Audio Commentary (optional)
                </label>
                <span className="text-xs text-purple-600 font-medium">
                  🎧 Increases priority
                </span>
              </div>

              {!form.audio ? (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                  <FileAudio className="h-6 w-6 text-purple-500 mb-1" />
                  <span className="text-sm font-medium text-gray-700">Upload audio file</span>
                  <span className="text-xs text-gray-500">MP3, WAV, M4A (max. 50 MB)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) {
                          toast.error('Maximum file size: 50 MB')
                          return
                        }
                        setForm(prev => ({ ...prev, audio: file }))
                      }
                    }}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileAudio className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-green-700 block">
                          {form.audio.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(form.audio.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, audio: null }))}
                      className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Теги */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (optional)
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="modernism, restoration, accessibility..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Tag className="h-4 w-4" />
                </button>
              </div>

              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* AI processing notice */}
        <div className="flex items-start gap-2 px-6 py-3 bg-blue-50 border-t border-blue-100">
          <Bot className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-600 leading-relaxed">
            By submitting, you agree that your review text will be processed by AI (Google Gemini) for automatic translation into 7 languages and audio guide generation.{' '}
            <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-blue-800">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim() || form.content.length < 50}
            className={`px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${isFullReview()
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-xl'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                {isFullReview() && <span className="text-xl">⭐</span>}
                <span>{isFullReview() ? 'Publish Full Review' : 'Publish Review'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

