'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { PodcastSeries, PodcastTag } from '@/types/podcast'
import { X, Calendar, Clock, Tag, Headphones, FileAudio } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'

interface PodcastPreviewProps {
  isOpen: boolean
  onClose: () => void
  previewData: {
    title: string
    description: string
    episode_number?: number | null
    series_id?: string | null
    cover_image_url?: string | null
    cover_image_file?: File | null
    audio_file?: File | null
    published_at?: string | null
    status: 'draft' | 'published'
    tags: string[]
  }
  series: PodcastSeries[]
  tags: PodcastTag[]
}

export default function PodcastPreview({
  isOpen,
  onClose,
  previewData,
  series,
  tags
}: PodcastPreviewProps) {
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [audioFileName, setAudioFileName] = useState<string | null>(null)

  useEffect(() => {
    // Generate preview URL for cover image
    if (previewData.cover_image_file) {
      const url = URL.createObjectURL(previewData.cover_image_file)
      setCoverPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (previewData.cover_image_url) {
      setCoverPreviewUrl(getStorageUrl(previewData.cover_image_url, 'photos'))
    } else {
      setCoverPreviewUrl(null)
    }
  }, [previewData.cover_image_file, previewData.cover_image_url])

  useEffect(() => {
    if (previewData.audio_file) {
      setAudioFileName(previewData.audio_file.name)
    }
  }, [previewData.audio_file])

  if (!isOpen) return null

  const selectedSeries = series.find(s => s.id === previewData.series_id)
  const selectedTags = tags.filter(tag => previewData.tags.includes(tag.id))

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Не указано'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Предпросмотр подкаста</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                previewData.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {previewData.status === 'published' ? 'Опубликовано' : 'Черновик'}
            </span>
            {previewData.episode_number && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-700">
                Выпуск #{previewData.episode_number}
              </span>
            )}
          </div>

          {/* Cover Image */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-purple-200 to-blue-200 shadow-lg">
            {coverPreviewUrl ? (
              <Image
                src={coverPreviewUrl}
                alt={previewData.title || 'Обложка'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                <Headphones size={64} className="text-white opacity-50" />
              </div>
            )}
          </div>

          {/* Series */}
          {selectedSeries && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                Серия
              </p>
              <h3 className="text-lg font-bold text-purple-900">{selectedSeries.title}</h3>
              {selectedSeries.description && (
                <p className="text-sm text-purple-700 mt-1">{selectedSeries.description}</p>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              {previewData.title || 'Название подкаста'}
            </h1>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            {previewData.published_at && (
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-purple-600" />
                <span>{formatDate(previewData.published_at)}</span>
              </div>
            )}
            {audioFileName && (
              <div className="flex items-center gap-2">
                <FileAudio size={18} className="text-purple-600" />
                <span>{audioFileName}</span>
                {previewData.audio_file && (
                  <span className="text-gray-400">
                    ({formatFileSize(previewData.audio_file.size)})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Audio File Info */}
          {previewData.audio_file && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileAudio size={24} className="text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-blue-900">Аудиофайл</p>
                  <p className="text-sm text-blue-700">{audioFileName}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Размер: {formatFileSize(previewData.audio_file.size)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {previewData.description && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Описание</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {previewData.description}
                </p>
              </div>
            </div>
          )}

          {/* Tags */}
          {selectedTags.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Теги</h2>
              <div className="flex flex-wrap gap-3">
                {selectedTags.map(tag => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium"
                  >
                    <Tag size={16} />
                    {tag.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">Итоговая информация</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Статус:</span>
                <span className="font-semibold text-gray-900">
                  {previewData.status === 'published' ? 'Опубликовано' : 'Черновик'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Серия:</span>
                <span className="font-semibold text-gray-900">
                  {selectedSeries ? selectedSeries.title : 'Без серии'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Количество тегов:</span>
                <span className="font-semibold text-gray-900">{selectedTags.length}</span>
              </div>
              {previewData.episode_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Номер выпуска:</span>
                  <span className="font-semibold text-gray-900">#{previewData.episode_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Обложка:</span>
                <span className="font-semibold text-gray-900">
                  {coverPreviewUrl ? 'Загружена' : 'Не указана'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Аудиофайл:</span>
                <span className="font-semibold text-gray-900">
                  {audioFileName ? 'Загружен' : 'Не указан'}
                </span>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Это предпросмотр того, как будет выглядеть ваш подкаст после публикации.
              Закройте это окно, чтобы вернуться к редактированию.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Закрыть предпросмотр
          </button>
        </div>
      </div>
    </div>
  )
}
