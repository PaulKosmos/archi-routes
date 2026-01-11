'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import PodcastUploadForm from '@/components/PodcastUploadForm'
import { PodcastSeries, PodcastTag, PodcastEpisode } from '@/types/podcast'
import { AlertCircle, CheckCircle, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

export default function PodcastEditPage() {
  const router = useRouter()
  const params = useParams()
  const episodeId = params.id as string
  const { user, profile, loading: authLoading, initialized } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [buildings, setBuildings] = useState<any[]>([])
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null)
  const [series, setSeries] = useState<PodcastSeries[]>([])
  const [tags, setTags] = useState<PodcastTag[]>([])
  const [episodeTags, setEpisodeTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Check authorization and load data
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
      router.push(`/podcasts/${episodeId}`)
      return
    }

    const fetchData = async () => {
      try {
        // Fetch episode
        const { data: episodeData, error: episodeError } = await supabase
          .from('podcast_episodes')
          .select('*')
          .eq('id', episodeId)
          .single()

        if (episodeError) throw episodeError
        setEpisode(episodeData)

        // Fetch episode tags
        const { data: episodeTagsData } = await supabase
          .from('episode_tags')
          .select('tag_id')
          .eq('episode_id', episodeId)

        if (episodeTagsData) {
          setEpisodeTags(episodeTagsData.map((et: any) => et.tag_id))
        }

        // Fetch buildings for header
        const { data: buildingsData } = await supabase
          .from('buildings')
          .select('*')
          .limit(10)

        // Fetch series
        const { data: seriesData } = await supabase
          .from('podcast_series')
          .select('*')
          .order('title')

        // Fetch tags
        const { data: tagsData } = await supabase
          .from('podcast_tags')
          .select('*')
          .order('name')

        setBuildings(buildingsData || [])
        setSeries(seriesData || [])
        setTags(tagsData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Error loading data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, profile, router, episodeId, supabase, initialized])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this podcast? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      // Delete episode tags first (foreign key constraint)
      await supabase
        .from('episode_tags')
        .delete()
        .eq('episode_id', episodeId)

      // Delete episode
      const { error: deleteError } = await supabase
        .from('podcast_episodes')
        .delete()
        .eq('id', episodeId)

      if (deleteError) throw new Error(`Ошибка удаления подкаста: ${deleteError.message}`)

      // Delete files from storage if they exist
      if (episode?.audio_url) {
        await supabase.storage.from('podcasts').remove([episode.audio_url])
      }
      if (episode?.cover_image_url) {
        await supabase.storage.from('podcasts').remove([episode.cover_image_url])
      }

      // Redirect to podcasts page
      router.push('/podcasts')
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Error deleting podcast')
      setDeleting(false)
    }
  }

  const handleUpdate = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const audioFile = formData.get('audio_file') as File | null
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

      let audioUrl = episode?.audio_url
      let coverImageUrl = episode?.cover_image_url

      // Upload new audio file if provided
      if (audioFile && audioFile.size > 0) {
        const audioFileName = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: audioError } = await supabase.storage
          .from('podcasts')
          .upload(`audio/${audioFileName}`, audioFile)

        if (audioError) throw new Error(`Ошибка загрузки аудио: ${audioError.message}`)
        audioUrl = `audio/${audioFileName}`
      }

      // Upload new cover image if provided
      if (coverImage && coverImage.size > 0) {
        const coverFileName = `${Date.now()}-${coverImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: coverError } = await supabase.storage
          .from('podcasts')
          .upload(`covers/${coverFileName}`, coverImage)

        if (coverError) throw new Error(`Ошибка загрузки обложки: ${coverError.message}`)
        coverImageUrl = `covers/${coverFileName}`
      }

      // Update episode record
      const { error: updateError } = await supabase
        .from('podcast_episodes')
        .update({
          title,
          description,
          episode_number: episodeNumber ? parseInt(episodeNumber) : null,
          series_id: seriesId || null,
          audio_url: audioUrl,
          cover_image_url: coverImageUrl,
          status,
          published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
          apple_podcasts_url: applePodcastsUrl || null,
          spotify_url: spotifyUrl || null,
          yandex_music_url: yandexMusicUrl || null,
          google_podcasts_url: googlePodcastsUrl || null
        })
        .eq('id', episodeId)

      if (updateError) throw new Error(`Ошибка обновления эпизода: ${updateError.message}`)

      // Update tags - delete old ones and insert new ones
      await supabase
        .from('episode_tags')
        .delete()
        .eq('episode_id', episodeId)

      if (selectedTags.length > 0) {
        const episodeTagsData = selectedTags.map(tagId => ({
          episode_id: episodeId,
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
        router.push(`/podcasts/${episodeId}`)
      }, 2000)
    } catch (err) {
      console.error('Update error:', err)
      setError(err instanceof Error ? err.message : 'Error updating')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Header buildings={buildings} />
        <main className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-600" size={40} />
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Header buildings={buildings} />
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Episode Not Found</h2>
              <Link href="/podcasts" className="text-purple-600 hover:text-purple-700 font-medium">
                Back to Podcasts
              </Link>
            </div>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Header buildings={buildings} />
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-green-900 mb-2">Successfully Updated!</h2>
              <p className="text-green-700 mb-6">
                Changes saved. You will be redirected to the episode page...
              </p>
            </div>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Header buildings={buildings} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <Link href={`/podcasts/${episodeId}`} className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-8 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Episode
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Podcast</h1>
            <p className="text-gray-600">
              Update podcast information
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 max-w-3xl">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-700 font-semibold">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main form - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                <PodcastUploadForm
                  series={series}
                  tags={tags}
                  onSubmit={handleUpdate}
                  isSubmitting={submitting}
                  isEditing={true}
                  initialData={{
                    title: episode.title,
                    description: episode.description || '',
                    episode_number: episode.episode_number,
                    series_id: episode.series_id,
                    status: episode.status,
                    published_at: episode.published_at,
                    apple_podcasts_url: episode.apple_podcasts_url,
                    spotify_url: episode.spotify_url,
                    yandex_music_url: episode.yandex_music_url,
                    google_podcasts_url: episode.google_podcasts_url,
                    tags: episodeTags,
                    cover_image_url: episode.cover_image_url
                  }}
                />
              </div>
            </div>

            {/* Sidebar - Takes 1 column on large screens */}
            <div className="lg:col-span-1 space-y-6">
              {/* Notes Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 sticky top-4">
                <h3 className="font-semibold text-blue-900 mb-3">Notes:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>• Audio and cover can be left unchanged</li>
                  <li>• If you upload a new file, the old one will be replaced</li>
                  <li>• Changes will take effect immediately after saving</li>
                </ul>
              </div>

              {/* Delete Section */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                  <Trash2 size={20} />
                  Danger Zone
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Deleting the podcast will permanently delete all data, including audio, cover, tags, and statistics.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={deleting || submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={20} />
                      Delete Podcast
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <EnhancedFooter />
    </div>
  )
}
