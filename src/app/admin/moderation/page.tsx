'use client'

export const dynamic = 'force-dynamic'



import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import { 
  Shield, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Filter,
  RefreshCw,
  X
} from 'lucide-react'
import Link from 'next/link'
import { Building } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'
import toast from 'react-hot-toast'

interface PendingBuilding extends Building {
  creator_email?: string
  creator_name?: string
}

export default function ModerationPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading: authLoading } = useAuth()
  const [pendingBuildings, setPendingBuildings] = useState<PendingBuilding[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [buildingToReject, setBuildingToReject] = useState<string | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })

  useEffect(() => {
    if (user && profile) {
      loadPendingBuildings()
      loadStats()
    }
  }, [user, profile])

  const loadPendingBuildings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          *,
          profiles!buildings_created_by_fkey(email, full_name)
        `)
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      const buildingsWithCreators = (data || []).map(building => ({
        ...building,
        creator_email: building.profiles?.email,
        creator_name: building.profiles?.full_name
      }))

      setPendingBuildings(buildingsWithCreators)
    } catch (error) {
      console.error('Error loading pending buildings:', error)
      toast.error('Ошибка загрузки объектов на модерации')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('moderation_status')

      if (error) throw error

      const pending = data.filter(b => b.moderation_status === 'pending').length
      const approved = data.filter(b => b.moderation_status === 'approved').length
      const rejected = data.filter(b => b.moderation_status === 'rejected').length

      setStats({
        pending,
        approved,
        rejected,
        total: data.length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleApprove = async (buildingId: string) => {
    if (!confirm('Одобрить этот объект? Он станет виден всем пользователям.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          moderation_status: 'approved',
          moderated_by: user?.id,
          moderated_at: new Date().toISOString()
        })
        .eq('id', buildingId)

      if (error) throw error

      toast.success('Объект одобрен!')
      loadPendingBuildings()
      loadStats()
    } catch (error) {
      console.error('Error approving building:', error)
      toast.error('Ошибка при одобрении объекта')
    }
  }

  const handleReject = async () => {
    if (!buildingToReject || !rejectionReason.trim()) {
      toast.error('Укажите причину отклонения')
      return
    }

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          moderation_status: 'rejected',
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', buildingToReject)

      if (error) throw error

      toast.success('Объект отклонен')
      setShowRejectionModal(false)
      setBuildingToReject(null)
      setRejectionReason('')
      loadPendingBuildings()
      loadStats()
    } catch (error) {
      console.error('Error rejecting building:', error)
      toast.error('Ошибка при отклонении объекта')
    }
  }

  const openRejectionModal = (buildingId: string) => {
    setBuildingToReject(buildingId)
    setShowRejectionModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Проверка прав доступа
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка прав доступа...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !['moderator', 'admin'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h1>
          <p className="text-gray-600 mb-6">Эта страница доступна только модераторам и администраторам</p>
          <Link 
            href="/" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            На главную
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-blue-600" />
                Панель модерации
              </h1>
              <p className="text-gray-600 mt-1">
                Проверка и одобрение контента от пользователей
              </p>
            </div>
            <button
              onClick={() => {
                loadPendingBuildings()
                loadStats()
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              title="Обновить"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">На модерации</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Одобрено</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Отклонено</p>
                  <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Всего объектов</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Контент */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : pendingBuildings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Нет объектов на модерации
            </h3>
            <p className="text-gray-500">
              Все объекты проверены! Новые будут появляться здесь автоматически.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingBuildings.map((building) => (
              <div
                key={building.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-6">
                    {/* Изображение */}
                    <div className="w-48 h-48 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {building.image_url ? (
                        <img
                          src={getStorageUrl(building.image_url, 'photos')}
                          alt={building.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MapPin className="w-12 h-12" />
                        </div>
                      )}
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {building.name}
                          </h3>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{building.creator_name || building.creator_email || 'Неизвестный'}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{building.city}, {building.country}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(building.created_at)}</span>
                            </div>
                          </div>

                          {building.description && (
                            <p className="text-gray-700 mb-3 line-clamp-2">
                              {building.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {building.architect && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                                👤 {building.architect}
                              </span>
                            )}
                            {building.year_built && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                📅 {building.year_built}
                              </span>
                            )}
                            {building.architectural_style && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                🎨 {building.architectural_style}
                              </span>
                            )}
                            {building.building_type && (
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                                🏛️ {building.building_type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badge статуса */}
                        <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium whitespace-nowrap">
                          🟡 На модерации
                        </span>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setExpandedBuilding(expandedBuilding === building.id ? null : building.id)}
                            className="flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            {expandedBuilding === building.id ? '↑ Свернуть' : '↓ Подробнее'}
                          </button>

                          <Link
                            href={`/buildings/${building.id}`}
                            target="_blank"
                            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Открыть в новой вкладке</span>
                          </Link>
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleApprove(building.id)}
                            className="flex items-center space-x-2 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Одобрить</span>
                          </button>

                          <button
                            onClick={() => openRejectionModal(building.id)}
                            className="flex items-center space-x-2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Отклонить</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable детали */}
                      {expandedBuilding === building.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 bg-gray-50 p-4 rounded-lg animate-slideDown">
                          {/* Полное описание */}
                          {building.description && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">📝 Описание:</h4>
                              <p className="text-gray-700 leading-relaxed">{building.description}</p>
                            </div>
                          )}

                          {/* Галерея фотографий */}
                          {building.image_urls && building.image_urls.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">📷 Галерея ({building.image_urls.length} фото):</h4>
                              <div className="grid grid-cols-4 gap-3">
                                {building.image_urls.map((imageUrl, index) => (
                                  <div key={index} className="aspect-square overflow-hidden rounded-lg border-2 border-gray-200">
                                    <img
                                      src={getStorageUrl(imageUrl, 'photos')}
                                      alt={`Фото ${index + 1}`}
                                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Координаты и адрес */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">📍 Координаты:</h4>
                              <p className="text-sm text-gray-700">
                                Широта: {building.latitude.toFixed(6)}<br />
                                Долгота: {building.longitude.toFixed(6)}
                              </p>
                            </div>
                            {building.address && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">🏠 Адрес:</h4>
                                <p className="text-sm text-gray-700">{building.address}</p>
                              </div>
                            )}
                          </div>

                          {/* Рейтинг и обзоры */}
                          {building.rating && building.rating > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">⭐ Рейтинг:</h4>
                              <div className="flex items-center space-x-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={star <= building.rating! ? 'text-yellow-400 text-xl' : 'text-gray-300 text-xl'}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-600">
                                  {building.rating.toFixed(1)} ({building.review_count || 0} отзывов)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно отклонения */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRejectionModal(false)} />
          
          <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Отклонить объект</h3>
              <button
                onClick={() => setShowRejectionModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Пожалуйста, укажите причину отклонения. Это поможет пользователю улучшить объект.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Например: недостаточно информации, некорректные данные, дубликат..."
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectionModal(false)
                  setRejectionReason('')
                  setBuildingToReject(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отклонить объект
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
