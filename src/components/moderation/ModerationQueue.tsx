'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building,
  MessageSquare,
  FileText,
  Filter,
  Search,
  Loader2,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ModerationQueueItem {
  id: string
  content_type: 'building' | 'review' | 'blog'
  content_id: string
  created_by: string
  created_at: string
  priority: number
  status: 'pending' | 'in_review' | 'completed'
  assigned_to: string | null
  title: string
  preview_data: any
  is_duplicate_check_needed: boolean
  duplicate_confidence: 'high' | 'medium' | 'low' | null
  potential_duplicates: any

  // Joined data
  profiles?: {
    id: string
    username: string | null
    full_name: string | null
    email: string | null
  }
}

export default function ModerationQueue() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()

  const [queue, setQueue] = useState<ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'building' | 'review' | 'blog'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [itemToReject, setItemToReject] = useState<ModerationQueueItem | null>(null)

  // Проверка прав доступа
  const isModerator = profile?.role === 'moderator' || profile?.role === 'admin'

  useEffect(() => {
    if (!user || !isModerator) return

    loadQueue()

    // Realtime подписка на изменения
    const channel = supabase
      .channel('moderation-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moderation_queue'
        },
        () => {
          loadQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isModerator, supabase])

  const loadQueue = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('moderation_queue')
        .select(`
          *,
          profiles:created_by (
            id,
            username,
            full_name,
            email
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      // Фильтры
      if (filterType !== 'all') {
        query = query.eq('content_type', filterType)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      } else {
        // По умолчанию не показываем completed
        query = query.in('status', ['pending', 'in_review'])
      }

      const { data, error } = await query

      if (error) throw error

      setQueue(data || [])
    } catch (error) {
      console.error('Error loading moderation queue:', error)
      toast.error('Failed to load moderation queue')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (item: ModerationQueueItem) => {
    if (!confirm('Approve this content?')) return

    try {
      const { error } = await supabase.rpc('approve_content', {
        p_content_type: item.content_type,
        p_content_id: item.content_id,
        p_moderator_id: user!.id
      })

      if (error) throw error

      // Помечаем в очереди как completed
      await supabase
        .from('moderation_queue')
        .update({ status: 'completed' })
        .eq('id', item.id)

      toast.success('Content approved!')
      loadQueue()
    } catch (error: any) {
      console.error('Approval error:', error)
      toast.error(error.message || 'Failed to approve content')
    }
  }

  const handleReject = (item: ModerationQueueItem) => {
    setItemToReject(item)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const confirmReject = async () => {
    if (!itemToReject || !rejectReason.trim()) {
      toast.error('Please specify rejection reason')
      return
    }

    try {
      const { error } = await supabase.rpc('reject_content', {
        p_content_type: itemToReject.content_type,
        p_content_id: itemToReject.content_id,
        p_moderator_id: user!.id,
        p_rejection_reason: rejectReason
      })

      if (error) throw error

      // Помечаем в очереди как completed
      await supabase
        .from('moderation_queue')
        .update({ status: 'completed' })
        .eq('id', itemToReject.id)

      toast.success('Content rejected')
      setRejectModalOpen(false)
      setItemToReject(null)
      setRejectReason('')
      loadQueue()
    } catch (error: any) {
      console.error('Rejection error:', error)
      toast.error(error.message || 'Failed to reject content')
    }
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'building':
        return <Building className="w-5 h-5" />
      case 'review':
        return <MessageSquare className="w-5 h-5" />
      case 'blog':
        return <FileText className="w-5 h-5" />
      default:
        return null
    }
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'building':
        return 'Building'
      case 'review':
        return 'Review'
      case 'blog':
        return 'Article'
      default:
        return type
    }
  }

  const getPriorityBadge = (priority: number) => {
    if (priority >= 2) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">Urgent</span>
    } else if (priority === 1) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">High</span>
    }
    return null
  }

  const getContentLink = (item: ModerationQueueItem) => {
    switch (item.content_type) {
      case 'building':
        return `/buildings/${item.content_id}`
      case 'review':
        return `/buildings/${item.preview_data?.building_id || ''}`
      case 'blog':
        return `/blog/${item.preview_data?.slug || item.content_id}`
      default:
        return '#'
    }
  }

  const filteredQueue = useMemo(() => {
    if (!searchQuery) return queue

    return queue.filter(item =>
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [queue, searchQuery])

  if (!isModerator) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Access Denied
          </h2>
          <p className="text-yellow-700">
            You don't have permission to view the moderation queue
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Moderation Queue
        </h1>
        <p className="text-gray-600">
          Review and approve user-generated content
        </p>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or author..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Фильтр по типу */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="building">Buildings</option>
              <option value="review">Reviews</option>
              <option value="blog">Articles</option>
            </select>
          </div>

          {/* Фильтр по статусу */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="all">All Statuses</option>
          </select>

          {/* Кнопка обновить */}
          <button
            onClick={loadQueue}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-900">
                {queue.filter(i => i.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">In Review</p>
              <p className="text-2xl font-bold text-blue-900">
                {queue.filter(i => i.status === 'in_review').length}
              </p>
            </div>
            <Search className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Possible Duplicates</p>
              <p className="text-2xl font-bold text-red-900">
                {queue.filter(i => i.duplicate_confidence === 'high').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Список элементов */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading queue...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Queue is Empty!
          </h3>
          <p className="text-gray-600">
            No content pending moderation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueue.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all ${item.duplicate_confidence === 'high'
                ? 'border-red-300 bg-red-50'
                : item.priority >= 1
                  ? 'border-orange-300'
                  : 'border-gray-200'
                }`}
            >
              <div className="p-6">
                {/* Заголовок */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Иконка типа */}
                    <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
                      {getContentTypeIcon(item.content_type)}
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {getContentTypeLabel(item.content_type)}
                        </span>
                        {getPriorityBadge(item.priority)}
                        {item.duplicate_confidence === 'high' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Possible Duplicate</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.title}
                      </h3>

                      {item.content_type === 'review' && item.preview_data?.building_name && (
                        <p className="text-sm text-blue-600 mb-1">
                          Building: {item.preview_data.building_name}
                        </p>
                      )}

                      <p className="text-sm text-gray-600">
                        Author: {item.profiles?.full_name || item.profiles?.username || item.profiles?.email || 'Unknown'}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(item.created_at).toLocaleString('en-US')}
                      </p>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={getContentLink(item)}
                      target="_blank"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View</span>
                    </Link>

                    <button
                      onClick={() => handleApprove(item)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleReject(item)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Предупреждение о дубликатах */}
                {item.is_duplicate_check_needed && item.potential_duplicates && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900 mb-2">
                          Possible duplicates found (confidence: {item.duplicate_confidence})
                        </p>
                        <div className="space-y-2">
                          {Array.isArray(item.potential_duplicates) &&
                            item.potential_duplicates.slice(0, 3).map((dup: any, idx: number) => (
                              <div key={idx} className="text-sm text-yellow-800">
                                • {dup.name} - {dup.address || 'Address not specified'}
                                {dup.distance_meters && ` (${Math.round(dup.distance_meters)}м)`}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно отклонения */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Reject Content
            </h2>

            <p className="text-gray-600 mb-4">
              Specify the rejection reason. The user will receive this message in a notification.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Example: Low quality photos, insufficient information, inaccurate data..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectReason.length} characters
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setRejectModalOpen(false)
                  setItemToReject(null)
                  setRejectReason('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
