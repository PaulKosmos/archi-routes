'use client'

import { useState, useMemo } from 'react'
import { X, Star, Camera, FileAudio, Tag } from 'lucide-react'
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
  tags: string[]
  photos: File[]
  audio: File | null
}

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
    tags: [],
    photos: [],
    audio: null
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTag, setCurrentTag] = useState('')

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
      toast.error('Максимум 5 фотографий')
      return
    }
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...files] }))
  }

  const removePhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
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
    
    if (!user) {
      toast.error('Необходимо авторизоваться')
      return
    }

    if (form.content.length < 50) {
      toast.error('Минимальная длина обзора: 50 символов')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Загрузка фотографий
      let photoUrls: string[] = []
      if (form.photos.length > 0) {
        toast.loading('📷 Загрузка фотографий...')
        const uploadPromises = form.photos.map(async photo => {
          const result = await uploadImage(photo, 'buildings/gallery', user.id)
          return result.path // Возвращаем только path, не объект
        })
        photoUrls = await Promise.all(uploadPromises)
      }

      // 2. Загрузка аудио
      let audioUrl: string | null = null
      let audioDuration: number | null = null
      
      if (form.audio) {
        toast.loading('🎧 Загрузка аудио...')
        
        // Получаем длительность сначала
        const audio = new Audio(URL.createObjectURL(form.audio))
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            audioDuration = Math.floor(audio.duration)
            resolve(null)
          }
        })
        
        // Загружаем файл (исправленная сигнатура)
        const result = await uploadAudio(form.audio, user.id)
        audioUrl = result.path // Сохраняем path, не url
      }

      // 3. Создание обзора
      toast.loading('💾 Сохранение обзора...')
      
      const reviewType = getReviewType()
      
      const { error } = await supabase
        .from('building_reviews')
        .insert({
          building_id: building.id,
          user_id: user.id,
          rating: 5, // Значение по умолчанию (не используется, рейтинг от пользователей)
          title: form.title,
          content: form.content,
          review_type: reviewType,
          photos: photoUrls.length > 0 ? photoUrls : null,
          audio_url: audioUrl,
          audio_duration_seconds: audioDuration,
          tags: form.tags.length > 0 ? form.tags : null,
          is_verified: false,
          is_featured: false,
          language: 'ru'
        })

      if (error) throw error

      // 4. Обновление счетчика обзоров
      await supabase
        .from('buildings')
        .update({
          review_count: supabase.rpc('increment', { row_id: building.id, increment_by: 1 })
        })
        .eq('id', building.id)

      toast.success('🎉 Обзор успешно создан!')
      
      // Очистка формы
      setForm({
        title: '',
        content: '',
        tags: [],
        photos: [],
        audio: null
      })
      
      onClose()
      if (onSuccess) onSuccess()
      
    } catch (error: any) {
      console.error('Error creating review:', error)
      toast.error('Ошибка создания обзора: ' + (error.message || 'Неизвестная ошибка'))
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
              Написать обзор
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              О здании: <span className="font-medium">{building.name}</span>
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
            {/* Информационный баннер */}
            <div className={`border-2 rounded-lg p-4 transition-all ${
              isFullReview() 
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
            }`}>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{isFullReview() ? '⭐' : '🗺️'}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center">
                    {isFullReview() ? (
                      <>
                        Полный обзор!
                        <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
                          ЛУЧШИЙ
                        </span>
                      </>
                    ) : (
                      'Создайте полный обзор для максимального эффекта'
                    )}
                  </h3>
                  <p className="text-sm text-gray-700 mb-2">
                    {isFullReview() 
                      ? 'Ваш обзор получит максимальный приоритет в маршрутах!'
                      : 'Добавьте минимум 2 фото и аудио к тексту 200+ символов'
                    }
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {/* Статус роли */}
                    {(profile?.role === 'guide' || profile?.role === 'expert') && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center">
                        👨‍🎓 Экспертный обзор
                      </span>
                    )}
                    
                    {/* Прогресс к "Полному обзору" */}
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      form.content.length >= 200 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {form.content.length >= 200 ? '✓' : '○'} Текст 200+ символов
                    </span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      form.photos.length >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {form.photos.length >= 2 ? '✓' : '○'} 2+ фото ({form.photos.length}/2)
                    </span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      form.audio ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {form.audio ? '✓' : '○'} Аудио
                    </span>
                  </div>
                </div>
              </div>
            </div>

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
                rows={6}
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
                Фотографии (рекомендуется 2-3 для полного обзора)
              </label>
              
              {form.photos.length < 5 && (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                  <div className="text-center">
                    <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-sm text-gray-600">
                      Загрузить фото (макс. 5)
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
                  {form.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Фото ${index + 1}`}
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
                  ))}
                </div>
              )}
            </div>

            {/* Аудио */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Аудио комментарий (опционально)
                </label>
                <span className="text-xs text-purple-600 font-medium">
                  🎧 Повышает приоритет
                </span>
              </div>
              
              {!form.audio ? (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all">
                  <FileAudio className="h-6 w-6 text-purple-500 mb-1" />
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
                      Удалить
                    </button>
                  </div>
                </div>
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
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Отменить
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim() || form.content.length < 50}
            className={`px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
              isFullReview()
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Создание...</span>
              </>
            ) : (
              <>
                {isFullReview() && <span className="text-xl">⭐</span>}
                <span>{isFullReview() ? 'Опубликовать полный обзор' : 'Опубликовать обзор'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

