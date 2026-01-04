'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { X, Star, Camera, FileAudio, Tag, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { uploadImage, uploadAudio } from '@/lib/storage'
import { getStorageUrl } from '@/lib/storage'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface ReviewData {
  id: string
  building_id: string
  user_id: string
  title: string
  content: string
  tags: string[] | null
  photos: string[] | null
  audio_url: string | null
  audio_duration_seconds: number | null
  review_type: string
  moderation_status: string
  rejection_reason: string | null
  buildings: {
    id: string
    name: string
  }
}

interface ReviewForm {
  title: string
  content: string
  tags: string[]
  existingPhotos: string[]
  newPhotos: File[]
  existingAudio: string | null
  newAudio: File | null
  removeAudio: boolean
}

export default function EditReviewPage() {
  const router = useRouter()
  const params = useParams()
  const buildingId = params.id as string
  const reviewId = params.reviewId as string

  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()

  const [review, setReview] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ReviewForm>({
    title: '',
    content: '',
    tags: [],
    existingPhotos: [],
    newPhotos: [],
    existingAudio: null,
    newAudio: null,
    removeAudio: false
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTag, setCurrentTag] = useState('')
  const hasLoadedRef = useRef(false)

  // Загрузка существующего обзора
  useEffect(() => {
    const loadReview = async () => {
      // Если обзор уже был загружен, не загружаем повторно
      if (hasLoadedRef.current) {
        return
      }

      // Ждём загрузки auth - если user === undefined, значит ещё загружается
      if (user === undefined) {
        return
      }

      // Если user === null, значит не авторизован - просто возвращаемся, условный рендеринг покажет сообщение
      if (user === null) {
        return
      }

      try {
        const { data, error } = await supabase
          .from('building_reviews')
          .select(`
            *,
            buildings:building_id (
              id,
              name
            )
          `)
          .eq('id', reviewId)
          .eq('user_id', user.id) // Только автор может редактировать
          .single()

        if (error) throw error

        if (!data) {
          toast.error('Обзор не найден')
          setLoading(false)
          return
        }

        setReview(data as ReviewData)
        hasLoadedRef.current = true // Отмечаем, что обзор загружен

        // Предзаполнение формы
        setForm({
          title: data.title || '',
          content: data.content || '',
          tags: data.tags || [],
          existingPhotos: data.photos || [],
          newPhotos: [],
          existingAudio: data.audio_url,
          newAudio: null,
          removeAudio: false
        })

      } catch (error: any) {
        console.error('Error loading review:', error)
        toast.error('Ошибка загрузки обзора')
        setLoading(false)
      } finally {
        setLoading(false)
      }
    }

    loadReview()
  }, [reviewId, user, supabase, router])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalPhotos = form.existingPhotos.length + form.newPhotos.length + files.length

    if (totalPhotos > 5) {
      toast.error('Максимум 5 фотографий')
      return
    }

    setForm(prev => ({ ...prev, newPhotos: [...prev.newPhotos, ...files] }))
  }

  const removeExistingPhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      existingPhotos: prev.existingPhotos.filter((_, i) => i !== index)
    }))
  }

  const removeNewPhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      newPhotos: prev.newPhotos.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (!currentTag.trim()) return
    if (form.tags.includes(currentTag.trim())) {
      toast.error('Тег уже добавлен')
      return
    }
    if (form.tags.length >= 10) {
      toast.error('Максимум 10 тегов')
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

    if (!user || !review) {
      toast.error('Ошибка: отсутствуют данные')
      return
    }

    if (form.content.length < 50) {
      toast.error('Минимальная длина обзора: 50 символов')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Загрузка новых фотографий
      let newPhotoUrls: string[] = []
      if (form.newPhotos.length > 0) {
        toast.loading('📷 Загрузка новых фотографий...')
        const uploadPromises = form.newPhotos.map(async photo => {
          const result = await uploadImage(photo, 'buildings/gallery', user.id)
          return result.path
        })
        newPhotoUrls = await Promise.all(uploadPromises)
      }

      // Объединяем существующие и новые фото
      const allPhotos = [...form.existingPhotos, ...newPhotoUrls]

      // 2. Загрузка нового аудио (если есть)
      let audioUrl: string | null = form.existingAudio
      let audioDuration: number | null = review.audio_duration_seconds

      if (form.newAudio) {
        toast.loading('🎧 Загрузка нового аудио...')

        // Получаем длительность
        const audio = new Audio(URL.createObjectURL(form.newAudio))
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            audioDuration = Math.floor(audio.duration)
            resolve(null)
          }
        })

        const result = await uploadAudio(form.newAudio, user.id)
        audioUrl = result.path
      } else if (form.removeAudio) {
        audioUrl = null
        audioDuration = null
      }

      // 3. Обновление обзора
      toast.loading('💾 Сохранение изменений...')

      const { error } = await supabase
        .from('building_reviews')
        .update({
          title: form.title,
          content: form.content,
          photos: allPhotos.length > 0 ? allPhotos : null,
          audio_url: audioUrl,
          audio_duration_seconds: audioDuration,
          tags: form.tags.length > 0 ? form.tags : null,
          moderation_status: 'pending', // Сброс на повторную модерацию
          rejection_reason: null, // Очистка причины отклонения
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      if (error) throw error

      toast.success('🎉 Обзор успешно обновлён и отправлен на модерацию!')

      // Редирект на страницу профиля
      router.push('/profile/reviews')

    } catch (error: any) {
      console.error('Error updating review:', error)
      toast.error('Ошибка обновления обзора: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Показываем загрузчик пока auth загружается
  if (user === undefined || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка обзора...</p>
        </div>
      </div>
    )
  }

  // Если пользователь не авторизован, показываем сообщение
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Необходима авторизация</h1>
          <p className="text-gray-600 mb-4">Для редактирования обзора необходимо войти в систему</p>
          <Link
            href="/profile/reviews"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Вернуться к обзорам
          </Link>
        </div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Обзор не найден</h1>
          <p className="text-gray-600 mb-4">Возможно, обзор был удалён или у вас нет прав на его редактирование</p>
          <Link
            href="/profile/reviews"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Вернуться к обзорам
          </Link>
        </div>
      </div>
    )
  }

  const totalPhotos = form.existingPhotos.length + form.newPhotos.length
  const hasAudio = form.existingAudio || form.newAudio

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/profile/reviews"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к обзорам
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Редактировать обзор
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              О здании: <span className="font-medium">{review.buildings.name}</span>
            </p>

            {/* Статус модерации */}
            {review.moderation_status === 'rejected' && review.rejection_reason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">Причина отклонения:</p>
                <p className="text-sm text-red-700">{review.rejection_reason}</p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                После редактирования обзор будет отправлен на повторную модерацию.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Заголовок */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заголовок обзора *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Краткое описание вашего впечатления"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.title.length}/100 символов
              </p>
            </div>

            {/* Текст обзора */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст обзора *
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Поделитесь своими впечатлениями об архитектуре, истории, атмосфере места..."
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Минимум 50 символов. Текущая длина: {form.content.length}
              </p>
            </div>

            {/* Фотографии */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фотографии (максимум 5)
              </label>

              {/* Существующие фотографии */}
              {form.existingPhotos.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">Текущие фотографии:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {form.existingPhotos.map((photoUrl, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <img
                          src={getStorageUrl(photoUrl, 'photos')}
                          alt={`Фото ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Новые фотографии */}
              {form.newPhotos.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">Новые фотографии:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {form.newPhotos.map((photo, index) => (
                      <div key={`new-${index}`} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Новое фото ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Загрузка новых фото */}
              {totalPhotos < 5 && (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                  <div className="text-center">
                    <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-sm text-gray-600">
                      Добавить фото ({totalPhotos}/5)
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
            </div>

            {/* Аудио */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Аудио комментарий (опционально)
              </label>

              {/* Существующее аудио */}
              {form.existingAudio && !form.newAudio && !form.removeAudio && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileAudio className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-green-700 block">
                          Текущее аудио
                        </span>
                        {review.audio_duration_seconds && (
                          <span className="text-xs text-gray-500">
                            {Math.floor(review.audio_duration_seconds / 60)}:{(review.audio_duration_seconds % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, removeAudio: true }))}
                      className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Удалить
                    </button>
                  </div>
                </div>
              )}

              {/* Новое аудио */}
              {form.newAudio && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileAudio className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-blue-700 block">
                          {form.newAudio.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(form.newAudio.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, newAudio: null }))}
                      className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Удалить
                    </button>
                  </div>
                </div>
              )}

              {/* Загрузка аудио */}
              {!form.newAudio && (form.removeAudio || !form.existingAudio) && (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
                  <FileAudio className="h-6 w-6 text-blue-500 mb-1" />
                  <span className="text-sm font-medium text-gray-700">Загрузить аудио файл</span>
                  <span className="text-xs text-gray-500">MP3, WAV, M4A (макс. 50 МБ)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) {
                          toast.error('Максимальный размер файла: 50 МБ')
                          return
                        }
                        setForm(prev => ({ ...prev, newAudio: file, removeAudio: false }))
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Теги */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Теги (опционально)
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="модернизм, реставрация, доступность..."
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

            {/* Кнопки */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Link
                href="/profile/reviews"
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отменить
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || !form.title.trim() || form.content.length < 50}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <span>{review.moderation_status === 'rejected' ? 'Переопубликовать обзор' : 'Сохранить изменения'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
