'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Star,
  Eye,
  Calendar,
  MapPin,
  Filter,
  Search,
  Grid3X3,
  List,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { Building } from '@/types/building'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

interface BuildingWithStats extends Building {
  view_count: number
  review_count: number
  avg_rating: number
}

export default function ProfileBuildingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const [buildings, setBuildings] = useState<BuildingWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStyle, setFilterStyle] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('') // Фильтр по статусу модерации
  const [sortBy, setSortBy] = useState<'created_at' | 'rating' | 'view_count'>('created_at')
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadUserBuildings()
    }
  }, [user, sortBy])

  const loadUserBuildings = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Загружаем здания пользователя
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('created_by', user.id)
        .order(sortBy, { ascending: false })

      if (error) throw error

      // Обрабатываем данные и добавляем статистику
      const processedBuildings = (data || []).map(building => ({
        ...building,
        view_count: building.view_count || 0,
        review_count: building.review_count || 0,
        avg_rating: building.rating || 0
      }))

      setBuildings(processedBuildings)
    } catch (error) {
      console.error('Error loading buildings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBuilding = async (buildingId: string) => {
    if (!confirm('Are you sure you want to delete this building? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', buildingId)
        .eq('created_by', user?.id) // Дополнительная проверка безопасности

      if (error) throw error

      // Обновляем список зданий
      setBuildings(prev => prev.filter(b => b.id !== buildingId))
      setSelectedBuilding(null)
    } catch (error) {
      console.error('Error deleting building:', error)
      alert('Error deleting building')
    }
  }

  const filteredBuildings = buildings.filter(building => {
    const matchesSearch = building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      building.architect?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      building.city.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStyle = !filterStyle || building.architectural_style === filterStyle
    const matchesStatus = !filterStatus || building.moderation_status === filterStatus

    return matchesSearch && matchesStyle && matchesStatus
  })

  const uniqueStyles = Array.from(new Set(buildings.map(b => b.architectural_style).filter(Boolean)))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({rating > 0 ? rating.toFixed(1) : '—'})
        </span>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">You must sign in to view your buildings</p>
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header buildings={[]} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pt-10">
          {/* Заголовок */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  Buildings
                </h1>
                <div className="flex items-center gap-4 text-sm mt-1">
                  <span className="text-muted-foreground">
                    {buildings.length} {buildings.length === 1 ? 'building' : 'buildings'}
                  </span>
                  {buildings.filter(b => b.moderation_status === 'pending').length > 0 && (
                    <span className="text-amber-600 font-medium">
                      🟡 {buildings.filter(b => b.moderation_status === 'pending').length} pending
                    </span>
                  )}
                  {buildings.filter(b => b.moderation_status === 'approved').length > 0 && (
                    <span className="text-green-600 font-medium">
                      ✅ {buildings.filter(b => b.moderation_status === 'approved').length} approved
                    </span>
                  )}
                  {buildings.filter(b => b.moderation_status === 'rejected').length > 0 && (
                    <span className="text-red-600 font-medium">
                      ❌ {buildings.filter(b => b.moderation_status === 'rejected').length} rejected
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/buildings/new"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-[var(--radius)] hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Building</span>
              </Link>
            </div>
          </div>

          {/* Поиск и фильтры */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Поиск */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, architect or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Фильтры */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Styles</option>
                    {uniqueStyles.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>

                {/* Фильтр по статусу модерации */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="approved">✅ Approved</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="rejected">❌ Rejected</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="created_at">By Date Added</option>
                  <option value="rating">By Rating</option>
                  <option value="view_count">By Views</option>
                </select>

                {/* Переключатель вида */}
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500'} rounded-l-lg transition-colors`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500'} rounded-r-lg transition-colors`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Контент */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="h-48 bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBuildings.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {buildings.length === 0 ? (
                <>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Buildings Yet</h3>
                  <p className="text-gray-500 mb-6">Start adding interesting architectural buildings!</p>
                  <Link
                    href="/buildings/new"
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Building</span>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Nothing Found</h3>
                  <p className="text-gray-500 mb-6">Try changing search parameters or filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterStyle('')
                      setFilterStatus('')
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Сетка зданий */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBuildings.map((building) => (
                <div key={building.id} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-md transition-shadow">
                  {/* Изображение */}
                  <div className="relative h-48 bg-muted">
                    {building.image_url ? (
                      <img
                        src={building.image_url}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-gray-400" />
                      </div>
                    )}

                    {/* Меню действий */}
                    <div className="absolute top-2 right-2">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedBuilding(selectedBuilding === building.id ? null : building.id)}
                          className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-100 transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {selectedBuilding === building.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-10">
                            <Link
                              href={`/buildings/${building.id}`}
                              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setSelectedBuilding(null)}
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </Link>
                            <Link
                              href={`/buildings/${building.id}/edit`}
                              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setSelectedBuilding(null)}
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>Edit</span>
                            </Link>
                            <button
                              onClick={() => handleDeleteBuilding(building.id)}
                              className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Информация */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                        {building.name}
                      </h3>
                      {building.moderation_status && building.moderation_status !== 'approved' && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${building.moderation_status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {building.moderation_status === 'pending' ? '🟡 Pending' : '❌ Rejected'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      {building.architect && (
                        <p>Architect: {building.architect}</p>
                      )}

                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{building.city}</span>
                        {building.year_built && <span>• {building.year_built}</span>}
                      </div>

                      {building.architectural_style && (
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {building.architectural_style}
                        </span>
                      )}
                    </div>

                    {/* Статистика */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{building.view_count}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-600">{building.review_count}</span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatDate(building.created_at)}
                        </div>
                      </div>

                      {building.avg_rating > 0 && (
                        <div className="mt-2">
                          {renderStars(building.avg_rating)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Список зданий */
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredBuildings.map((building) => (
                  <div key={building.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      {/* Изображение */}
                      <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {building.image_url ? (
                          <img
                            src={building.image_url}
                            alt={building.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {building.name}
                              </h3>
                              {building.moderation_status && building.moderation_status !== 'approved' && (
                                <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${building.moderation_status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                  }`}>
                                  {building.moderation_status === 'pending' ? '🟡 Pending' : '❌ Rejected'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              {building.architect && (
                                <span>Architect: {building.architect}</span>
                              )}
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{building.city}</span>
                                {building.year_built && <span>• {building.year_built}</span>}
                              </div>
                            </div>

                            {building.architectural_style && (
                              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mb-2">
                                {building.architectural_style}
                              </span>
                            )}

                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Eye className="w-4 h-4" />
                                <span>{building.view_count} views</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4" />
                                <span>{building.review_count} reviews</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(building.created_at)}</span>
                              </div>
                            </div>

                            {building.avg_rating > 0 && (
                              <div className="mt-2">
                                {renderStars(building.avg_rating)}
                              </div>
                            )}
                          </div>

                          {/* Действия */}
                          <div className="flex items-center space-x-2 ml-4">
                            <Link
                              href={`/buildings/${building.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/buildings/${building.id}/edit`}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteBuilding(building.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <EnhancedFooter />
    </div>
  )
}
