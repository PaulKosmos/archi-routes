// src/app/buildings/[id]/review/new/CreateReviewClient.tsx - Компонент создания обзора

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Building } from '@/types/building'
import { uploadImage, uploadAudio } from '@/lib/storage'
import {
  Star,
  Upload,
  X,
  Mic,
  Square,
  Play,
  Pause,
  ArrowLeft,
  Camera,
  FileAudio,
  Tag,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

interface CreateReviewClientProps {
  building: Building
}

interface ReviewForm {
  title: string
  content: string
  review_type: 'general' | 'expert' | 'historical' | 'amateur'
  visit_date: string
  tags: string[]
  photos: File[]
  audio: File | null
}

export default function CreateReviewClient({ building }: CreateReviewClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState<ReviewForm>({
    title: '',
    content: '',
    review_type: 'amateur',
    visit_date: '',
    tags: [],
    photos: [],
    audio: null
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [currentTag, setCurrentTag] = useState('')

  // Проверяем авторизацию
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Login Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to log in to write a review
          </p>
          <Link
            href={`/buildings/${building.id}`}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Building
          </Link>
        </div>
      </div>
    )
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + form.photos.length > 6) {
      alert('Maximum 6 photos')
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Создаем File объект для загрузки
        const audioFile = new File([blob], `review-audio-${Date.now()}.wav`, {
          type: 'audio/wav'
        })
        setForm(prev => ({ ...prev, audio: audioFile }))

        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Microphone access error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play()
      setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !form.tags.includes(currentTag.trim())) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const removeTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title.trim() || !form.content.trim()) {
      alert('Fill in title and content')
      return
    }

    setIsSubmitting(true)

    try {
      console.log('📝 Creating review...')

      // Загружаем фотографии
      let photoPaths: string[] = []
      if (form.photos.length > 0) {
        console.log('📷 Uploading photos:', form.photos.length)
        const uploadPromises = form.photos.map(photo =>
          uploadImage(photo, 'reviews', user.id)
        )
        const uploadedPhotos = await Promise.all(uploadPromises)
        photoPaths = uploadedPhotos.map(result => result.path)
        console.log('📷 Photos uploaded:', photoPaths)
      }

      // Загружаем аудио
      let audioPath: string | null = null
      let audioDuration: number | null = null
      if (form.audio) {
        console.log('🎵 Uploading audio...')
        const audioResult = await uploadAudio(form.audio, user.id)
        audioPath = audioResult.path

        // Получаем длительность аудио
        if (audioBlob) {
          const audio = new Audio(URL.createObjectURL(audioBlob))
          await new Promise((resolve) => {
            audio.onloadedmetadata = () => {
              audioDuration = Math.round(audio.duration)
              resolve(true)
            }
          })
        }
        console.log('🎵 Audio uploaded:', audioPath, 'Duration:', audioDuration)
      }

      // Создаем обзор в базе данных
      const reviewData = {
        building_id: building.id,
        user_id: user.id,
        rating: form.rating,
        title: form.title.trim(),
        content: form.content.trim(),
        review_type: form.review_type,
        visit_date: form.visit_date || null,
        photos: photoPaths.length > 0 ? photoPaths : null,
        audio_url: audioPath,
        audio_duration_seconds: audioDuration,
        tags: form.tags.length > 0 ? form.tags : null,
        language: 'ru'
      }

      console.log('💾 Saving review to database:', reviewData)

      const { data, error } = await supabase
        .from('building_reviews')
        .insert(reviewData)
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ Review created successfully:', data)

      // Перенаправляем на страницу здания
      router.push(`/buildings/${building.id}`)

    } catch (error) {
      console.error('❌ Error creating review:', error)
      alert('Error creating review. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Заголовок страницы */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            href={`/buildings/${building.id}`}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Building
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Write Review
        </h1>
        <p className="text-gray-600 mb-4">
          About building: <span className="font-medium">{building.name}</span>
        </p>

        {/* Информация о системе маршрутов */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Mic className="w-5 h-5 text-purple-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                🗺️ Your review can become part of a route!
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Quality reviews help tourists explore the city.
                Add audio commentary to make your review more useful.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                  🎧 With audio = priority
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  ⭐ High rating = popularity
                </span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  👨‍🎓 Expert = trust
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Форма создания обзора */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Карточка основной информации */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          {/* Заголовок */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of your impressions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.title.length}/100 characters
            </p>
          </div>

          {/* Тип обзора */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Review Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'general', label: 'General', icon: '📖', desc: 'Basic information' },
                { value: 'amateur', label: 'Personal Experience', icon: '✍️', desc: 'Your impressions' },
                { value: 'expert', label: 'Expert', icon: '👨‍🎓', desc: 'Professional' },
                { value: 'historical', label: 'Historical', icon: '📜', desc: 'History and facts' }
              ].map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, review_type: type.value as any }))}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${form.review_type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">{type.icon}</span>
                    <span className="font-medium text-gray-900">{type.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{type.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Expert and historical reviews have priority in routes
            </p>
          </div>

          {/* Дата посещения */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visit Date (optional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={form.visit_date}
                onChange={(e) => setForm(prev => ({ ...prev, visit_date: e.target.value }))}
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Calendar className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Карточка содержания */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Review Content</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Text *
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Share your impressions about architecture, history, atmosphere of the place..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 50 characters. Current length: {form.content.length}
            </p>
          </div>
        </div>

        {/* Карточка медиа */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Media (optional)</h2>

          {/* Фотографии */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (maximum 6)
            </label>

            {/* Кнопка загрузки */}
            <div className="mb-4">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer transition-colors">
                <div className="text-center">
                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">
                    Click to upload photos
                  </span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={form.photos.length >= 6}
                />
              </label>
            </div>

            {/* Превью загруженных фото */}
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {form.photos.map((photo, index) => (
                  <div key={index} className="relative group">
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
                ))}
              </div>
            )}
          </div>

          {/* Аудио */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Audio Commentary (optional)
              </label>
              <span className="text-xs text-purple-600 font-medium">
                🎧 Increases review priority
              </span>
            </div>

            <div className="space-y-3">
              {/* Выбор: Запись или Загрузка */}
              {!audioBlob && !form.audio && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all"
                  >
                    <Mic className="h-6 w-6 text-red-500 mb-2" />
                    <span className="text-sm font-medium text-gray-700">Record Audio</span>
                    <span className="text-xs text-gray-500">Use microphone</span>
                  </button>

                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
                    <FileAudio className="h-6 w-6 text-purple-500 mb-2" />
                    <span className="text-sm font-medium text-gray-700">Upload File</span>
                    <span className="text-xs text-gray-500">MP3, WAV, M4A</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setForm(prev => ({ ...prev, audio: file }))
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Идет запись */}
              {isRecording && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                      <span className="text-sm font-medium text-red-700">Recording...</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  </div>
                </div>
              )}

              {/* Аудио записано или загружено */}
              {(audioBlob || form.audio) && !isRecording && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileAudio className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <span className="text-sm font-medium text-green-700 block">
                          {audioBlob ? 'Audio Recorded' : form.audio?.name || 'Audio Uploaded'}
                        </span>
                        {form.audio && (
                          <span className="text-xs text-gray-500">
                            {(form.audio.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {audioBlob && (
                        <button
                          type="button"
                          onClick={playAudio}
                          disabled={isPlaying}
                          className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Listen
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAudioBlob(null)
                          setAudioUrl(null)
                          setForm(prev => ({ ...prev, audio: null }))
                        }}
                        className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              💡 Recommended length: 5-15 minutes. Speak clearly and slowly.
            </p>
          </div>
        </div>

        {/* Карточка тегов */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>

          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag (modernism, restoration, accessibility...)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Tag className="h-4 w-4" />
              </button>
            </div>
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

        {/* Кнопки действий */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-6">
          <Link
            href={`/buildings/${building.id}`}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !form.title.trim() || !form.content.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Publish Review'}
          </button>
        </div>
      </form>
    </div>
  )
}
