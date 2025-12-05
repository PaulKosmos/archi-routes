'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AdminLayout from '@/app/admin/layout'
import { PodcastEpisode } from '@/types/podcast'
import { Loader2, Plus, Trash2, Edit, Eye, MoreVertical } from 'lucide-react'
import Link from 'next/link'

export default function AdminPodcastsPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => {
    if (!user || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      router.push('/admin')
      return
    }

    fetchEpisodes()
  }, [user, profile, router, supabase, filter])

  const fetchEpisodes = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('podcast_episodes')
        .select(`
          *,
          podcast_series (
            id,
            title,
            slug
          ),
          profiles!author_id (
            id,
            full_name,
            display_name
          )
        `)
        .order('published_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped = (data || []).map(ep => ({
        ...ep,
        series: ep.podcast_series,
        author: ep.profiles
      }))

      setEpisodes(mapped)
    } catch (err) {
      console.error('Error fetching episodes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (episodeId: string) => {
    if (!window.confirm('Вы уверены? Это действие нельзя отменить.')) {
      return
    }

    try {
      setDeleting(episodeId)

      // Delete audio file
      const episode = episodes.find(ep => ep.id === episodeId)
      if (episode?.audio_url) {
        await supabase.storage.from('podcasts').remove([episode.audio_url])
      }

      // Delete cover image if exists
      if (episode?.cover_image_url) {
        await supabase.storage.from('podcasts').remove([episode.cover_image_url])
      }

      // Delete episode record
      const { error } = await supabase
        .from('podcast_episodes')
        .delete()
        .eq('id', episodeId)

      if (error) throw error

      setEpisodes(prev => prev.filter(ep => ep.id !== episodeId))
    } catch (err) {
      console.error('Error deleting episode:', err)
      alert('Ошибка при удалении эпизода')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление подкастами</h1>
            <p className="text-gray-600">Администрирование эпизодов и серий</p>
          </div>
          <Link
            href="/admin/podcasts/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Загрузить новый подкаст
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                filter === f
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'all' && 'Все'}
              {f === 'published' && 'Опубликованные'}
              {f === 'draft' && 'Черновики'}
              ({episodes.filter(ep => f === 'all' || ep.status === f).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-600" size={40} />
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Нет эпизодов в этой категории</p>
            <Link
              href="/admin/podcasts/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Plus size={18} />
              Загрузить первый подкаст
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Название</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Серия</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Статус</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Дата публикации</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Автор</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {episodes.map(episode => (
                  <tr key={episode.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 line-clamp-2">
                        {episode.title}
                      </div>
                      {episode.episode_number && (
                        <div className="text-sm text-gray-500">
                          Выпуск #{episode.episode_number}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {episode.series?.title || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        episode.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : episode.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {episode.status === 'published' && 'Опубликовано'}
                        {episode.status === 'draft' && 'Черновик'}
                        {episode.status === 'archived' && 'Архивировано'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(episode.published_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {episode.author?.full_name || episode.author?.display_name || 'Неизвестный'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/podcasts/${episode.id}`}
                          title="Просмотр"
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/admin/podcasts/${episode.id}/edit`}
                          title="Редактировать"
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(episode.id)}
                          disabled={deleting === episode.id}
                          title="Удалить"
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
