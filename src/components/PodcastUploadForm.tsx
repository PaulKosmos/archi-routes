'use client'

import { useState, useRef } from 'react'
import { Upload, X, Music, Image as ImageIcon, AlertCircle, Eye } from 'lucide-react'
import { PodcastSeries, PodcastTag } from '@/types/podcast'
import SeriesManager from './SeriesManager'
import TagsManager from './TagsManager'
import PodcastPreview from './PodcastPreview'

interface PodcastUploadFormProps {
  series: PodcastSeries[]
  tags: PodcastTag[]
  onSubmit: (formData: FormData) => Promise<void>
  isSubmitting?: boolean
  initialData?: {
    title?: string
    description?: string
    episode_number?: number | null
    series_id?: string | null
    status?: 'draft' | 'published'
    published_at?: string | null
    apple_podcasts_url?: string | null
    spotify_url?: string | null
    yandex_music_url?: string | null
    google_podcasts_url?: string | null
    tags?: string[]
    cover_image_url?: string | null
  }
  isEditing?: boolean
}

export default function PodcastUploadForm({
  series: initialSeries,
  tags: initialTags,
  onSubmit,
  isSubmitting = false,
  initialData,
  isEditing = false
}: PodcastUploadFormProps) {
  // State for dynamic series and tags
  const [series, setSeries] = useState<PodcastSeries[]>(initialSeries)
  const [tags, setTags] = useState<PodcastTag[]>(initialTags)

  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [episodeNumber, setEpisodeNumber] = useState(initialData?.episode_number?.toString() || '')
  const [selectedSeries, setSelectedSeries] = useState(initialData?.series_id || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || [])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [publishedAt, setPublishedAt] = useState(initialData?.published_at ? new Date(initialData.published_at).toISOString().slice(0, 16) : '')
  const [status, setStatus] = useState<'draft' | 'published'>(initialData?.status || 'draft')
  const [error, setError] = useState<string | null>(null)
  const [audioFileName, setAudioFileName] = useState<string>('')
  const [coverFileName, setCoverFileName] = useState<string>('')
  const [audioPreview, setAudioPreview] = useState<string>('')
  const [coverPreview, setCoverPreview] = useState(initialData?.cover_image_url || '')
  const [applePodcastsUrl, setApplePodcastsUrl] = useState(initialData?.apple_podcasts_url || '')
  const [spotifyUrl, setSpotifyUrl] = useState(initialData?.spotify_url || '')
  const [yandexMusicUrl, setYandexMusicUrl] = useState(initialData?.yandex_music_url || '')
  const [googlePodcastsUrl, setGooglePodcastsUrl] = useState(initialData?.google_podcasts_url || '')
  const [showPreview, setShowPreview] = useState(false)
  const [audioDuration, setAudioDuration] = useState<number>(0)

  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Handlers for dynamic series/tags
  const handleSeriesCreated = (newSeries: PodcastSeries) => {
    setSeries(prev => [...prev, newSeries])
  }

  const handleSeriesUpdated = (updatedSeries: PodcastSeries) => {
    setSeries(prev => prev.map(s => s.id === updatedSeries.id ? updatedSeries : s))
  }

  const handleSeriesDeleted = (seriesId: string) => {
    setSeries(prev => prev.filter(s => s.id !== seriesId))
  }

  const handleTagCreated = (newTag: PodcastTag) => {
    setTags(prev => [...prev, newTag])
  }

  const handleTagUpdated = (updatedTag: PodcastTag) => {
    setTags(prev => prev.map(t => t.id === updatedTag.id ? updatedTag : t))
  }

  const handleTagDeleted = (tagId: string) => {
    setTags(prev => prev.filter(t => t.id !== tagId))
  }

  const handlePreview = () => {
    setShowPreview(true)
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      setError('Пожалуйста, выберите аудиофайл')
      return
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('Размер файла не должен превышать 500MB')
      return
    }

    setAudioFile(file)
    setAudioFileName(file.name)
    const audioUrl = URL.createObjectURL(file)
    setAudioPreview(audioUrl)
    setError(null)

    // Extract audio duration
    const audio = new Audio(audioUrl)
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.floor(audio.duration)
      setAudioDuration(duration)
      console.log('Audio duration extracted:', duration, 'seconds')
    })
    audio.addEventListener('error', (err) => {
      console.error('Error loading audio metadata:', err)
      setError('Не удалось загрузить метаданные аудио')
    })
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    setCoverImage(file)
    setCoverFileName(file.name)
    setCoverPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Название эпизода обязательно')
      return
    }

    if (!audioFile && !isEditing) {
      setError('Аудиофайл обязателен')
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('episode_number', episodeNumber)
      formData.append('series_id', selectedSeries)
      if (audioFile) {
        formData.append('audio_file', audioFile)
      }
      if (coverImage) {
        formData.append('cover_image', coverImage)
      }
      formData.append('tags', JSON.stringify(selectedTags))
      formData.append('status', status)
      formData.append('published_at', publishedAt)
      formData.append('apple_podcasts_url', applePodcastsUrl)
      formData.append('spotify_url', spotifyUrl)
      formData.append('yandex_music_url', yandexMusicUrl)
      formData.append('google_podcasts_url', googlePodcastsUrl)
      // Include audio duration
      formData.append('duration_seconds', audioDuration.toString())

      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Название эпизода *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите название эпизода"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Введите описание эпизода (можно использовать Markdown)"
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* Episode Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Номер выпуска
        </label>
        <input
          type="number"
          value={episodeNumber}
          onChange={(e) => setEpisodeNumber(e.target.value)}
          placeholder="Например: 24"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
          disabled={isSubmitting}
        />
      </div>

      {/* Series Manager */}
      <SeriesManager
        series={series}
        selectedSeriesId={selectedSeries}
        onSeriesSelect={setSelectedSeries}
        onSeriesCreated={handleSeriesCreated}
        onSeriesUpdated={handleSeriesUpdated}
        onSeriesDeleted={handleSeriesDeleted}
      />

      {/* Audio File Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Аудиофайл {!isEditing && '*'}
        </label>
        <div
          onClick={() => audioInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
        >
          {audioPreview ? (
            <div className="space-y-3">
              <Music className="mx-auto text-purple-600" size={32} />
              <div>
                <p className="font-medium text-gray-900">{audioFileName}</p>
                <p className="text-xs text-gray-500">
                  {(audioFile!.size / 1024 / 1024).toFixed(2)} MB
                  {audioDuration > 0 && (
                    <> • {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}</>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setAudioFile(null)
                  setAudioFileName('')
                  setAudioPreview('')
                  setAudioDuration(0)
                }}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Удалить
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto text-gray-400" size={32} />
              <p className="font-medium text-gray-900">Нажмите для загрузки аудиофайла</p>
              <p className="text-xs text-gray-500">MP3, WAV, OGG и т.д. до 500MB</p>
            </div>
          )}
        </div>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioChange}
          className="hidden"
          disabled={isSubmitting}
        />
      </div>

      {/* Cover Image Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Обложка (опционально)
        </label>
        <div
          onClick={() => coverInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
        >
          {coverPreview ? (
            <div className="space-y-3">
              <div className="relative w-24 h-24 mx-auto rounded-lg overflow-hidden">
                <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <p className="font-medium text-gray-900 text-sm">{coverFileName}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCoverImage(null)
                  setCoverFileName('')
                  setCoverPreview('')
                }}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Удалить
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageIcon className="mx-auto text-gray-400" size={32} />
              <p className="font-medium text-gray-900">Нажмите для загрузки обложки</p>
              <p className="text-xs text-gray-500">PNG, JPG, WebP. Рекомендуется 1:1 соотношение</p>
            </div>
          )}
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
          className="hidden"
          disabled={isSubmitting}
        />
      </div>

      {/* Tags Manager */}
      <TagsManager
        tags={tags}
        selectedTagIds={selectedTags}
        onTagsSelect={setSelectedTags}
        onTagCreated={handleTagCreated}
        onTagUpdated={handleTagUpdated}
        onTagDeleted={handleTagDeleted}
      />

      {/* Platform Links */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ссылки на платформы</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Apple Podcasts
            </label>
            <input
              type="url"
              value={applePodcastsUrl}
              onChange={(e) => setApplePodcastsUrl(e.target.value)}
              placeholder="https://podcasts.apple.com/..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Spotify
            </label>
            <input
              type="url"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/episode/..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Yandex Music
            </label>
            <input
              type="url"
              value={yandexMusicUrl}
              onChange={(e) => setYandexMusicUrl(e.target.value)}
              placeholder="https://music.yandex.ru/album/..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Google Podcasts
            </label>
            <input
              type="url"
              value={googlePodcastsUrl}
              onChange={(e) => setGooglePodcastsUrl(e.target.value)}
              placeholder="https://podcasts.google.com/feed/..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Publish Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Статус
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
            disabled={isSubmitting}
          >
            <option value="draft">Черновик</option>
            <option value="published">Опубликовать</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Дата публикации
          </label>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Submit and Preview Buttons */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handlePreview}
          disabled={isSubmitting || !title.trim()}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Eye size={20} />
          Предпросмотр
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (!audioFile && !isEditing)}
          className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {isEditing ? 'Сохранение...' : 'Загрузка...'}
            </>
          ) : (
            <>
              <Upload size={20} />
              {isEditing ? 'Сохранить изменения' : 'Загрузить эпизод'}
            </>
          )}
        </button>
      </div>

      {/* Preview Modal */}
      <PodcastPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        previewData={{
          title,
          description,
          episode_number: episodeNumber ? parseInt(episodeNumber) : null,
          series_id: selectedSeries || null,
          cover_image_url: initialData?.cover_image_url || null,
          cover_image_file: coverImage,
          audio_file: audioFile,
          published_at: publishedAt || null,
          status,
          tags: selectedTags
        }}
        series={series}
        tags={tags}
      />
    </form>
  )
}
