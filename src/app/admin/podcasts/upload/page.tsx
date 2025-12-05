'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import PodcastUploadForm from '@/components/PodcastUploadForm'
import { PodcastSeries, PodcastTag } from '@/types/podcast'
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import AdminLayout from '@/app/admin/layout'

export default function PodcastUploadPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, initialized } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [series, setSeries] = useState<PodcastSeries[]>([])
  const [tags, setTags] = useState<PodcastTag[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Check authorization
  useEffect(() => {
    // Wait for auth to initialize
    if (!initialized) {
      return
    }

    if (!user || !profile) {
      router.push('/auth')
      return
    }

    if (profile.role !== 'admin' && profile.role !== 'moderator') {
      router.push('/admin')
      return
    }

    // Fetch series and tags
    const fetchData = async () => {
      try {
        const { data: seriesData } = await supabase
          .from('podcast_series')
          .select('*')
          .order('title')

        const { data: tagsData } = await supabase
          .from('podcast_tags')
          .select('*')
          .order('name')

        setSeries(seriesData || [])
        setTags(tagsData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Ошибка при загрузке данных')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, profile, router, supabase, initialized])

  const handleUpload = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const audioFile = formData.get('audio_file') as File
      const coverImage = formData.get('cover_image') as File | null
      const title = formData.get('title') as string
      const description = formData.get('description') as string
      const episodeNumber = formData.get('episode_number') as string
      const seriesId = formData.get('series_id') as string
      const status = formData.get('status') as 'draft' | 'published'
      const publishedAt = formData.get('published_at') as string
      const tagsJson = formData.get('tags') as string
      const selectedTags: string[] = JSON.parse(tagsJson || '[]')
      const applePodcastsUrl = formData.get('apple_podcasts_url') as string
      const spotifyUrl = formData.get('spotify_url') as string
      const yandexMusicUrl = formData.get('yandex_music_url') as string
      const googlePodcastsUrl = formData.get('google_podcasts_url') as string

      // Upload audio file
      const audioFileName = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: audioError, data: audioData } = await supabase.storage
        .from('podcasts')
        .upload(`audio/${audioFileName}`, audioFile)

      if (audioError) throw new Error(`Ошибка загрузки аудио: ${audioError.message}`)

      const audioUrl = `audio/${audioFileName}`

      // Upload cover image if provided
      let coverImageUrl: string | undefined
      if (coverImage) {
        const coverFileName = `${Date.now()}-${coverImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: coverError } = await supabase.storage
          .from('podcasts')
          .upload(`covers/${coverFileName}`, coverImage)

        if (coverError) throw new Error(`Ошибка загрузки обложки: ${coverError.message}`)
        coverImageUrl = `covers/${coverFileName}`
      }

      // Create episode record
      const { data: episodeData, error: createError } = await supabase
        .from('podcast_episodes')
        .insert([
          {
            title,
            description,
            episode_number: episodeNumber ? parseInt(episodeNumber) : null,
            series_id: seriesId || null,
            audio_url: audioUrl,
            cover_image_url: coverImageUrl,
            author_id: user?.id,
            status,
            published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
            duration_seconds: 0, // Will be updated after processing
            apple_podcasts_url: applePodcastsUrl || null,
            spotify_url: spotifyUrl || null,
            yandex_music_url: yandexMusicUrl || null,
            google_podcasts_url: googlePodcastsUrl || null
          }
        ])
        .select()
        .single()

      if (createError) throw new Error(`Ошибка создания эпизода: ${createError.message}`)

      // Add tags if selected
      if (selectedTags.length > 0 && episodeData) {
        const episodeTagsData = selectedTags.map(tagId => ({
          episode_id: episodeData.id,
          tag_id: tagId
        }))

        const { error: tagsError } = await supabase
          .from('episode_tags')
          .insert(episodeTagsData)

        if (tagsError) console.error('Error adding tags:', tagsError)
      }

      setSuccess(true)
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/podcasts/${episodeData.id}`)
      }, 2000)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-600" size={40} />
        </div>
      </AdminLayout>
    )
  }

  if (success) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-green-900 mb-2">Успешно загружено!</h2>
            <p className="text-green-700 mb-6">
              Ваш подкаст был загружен. Вы будете перенаправлены на страницу эпизода...
            </p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Загрузить новый подкаст</h1>
          <p className="text-gray-600">
            Загрузите новый эпизод подкаста с аудиофайлом и обложкой
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-700 font-semibold">Ошибка</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <PodcastUploadForm
            series={series}
            tags={tags}
            onSubmit={handleUpload}
            isSubmitting={submitting}
          />
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Советы по загрузке:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Поддерживаемые форматы аудио: MP3, WAV, OGG, FLAC</li>
            <li>• Максимальный размер файла: 500MB</li>
            <li>• Рекомендуемый размер обложки: 1:1 (например, 600x600px)</li>
            <li>• Вы можете добавить несколько тегов для лучшей категоризации</li>
            <li>• Сохраняйте информацию в черновике перед публикацией</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/admin/podcasts"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Вернуться к управлению подкастами
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}
