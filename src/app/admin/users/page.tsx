'use client'

export const dynamic = 'force-dynamic'



import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import Header from '@/components/Header'
import {
  Users,
  Search,
  Filter,
  Crown,
  Shield,
  Star,
  User,
  Eye,
  Edit,
  MoreVertical,
  XCircle,
  MapPin,
  Calendar,
  Building2,
  MessageSquare,
  Ban,
  Clock,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react'

type BanStatus = 'active' | 'banned' | 'suspended' | 'restricted'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  display_name?: string
  role: string
  city?: string
  country?: string
  bio?: string
  created_at: string
  updated_at: string
  buildings_count?: number
  reviews_count?: number
  routes_count?: number
  avatar_url?: string
  // Ban system fields
  ban_status?: BanStatus
  banned_at?: string
  banned_until?: string
  ban_reason?: string
  banned_by?: string
}

interface BanModalState {
  user: UserProfile | null
  action: 'ban' | 'suspend' | 'restrict' | 'unban' | null
}

export default function UsersManagementPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [banModal, setBanModal] = useState<BanModalState>({ user: null, action: null })
  const [banReason, setBanReason] = useState('')
  const [suspendDays, setSuspendDays] = useState(7)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Загрузка пользователей
  useEffect(() => {
    if (user && profile) {
      if (!['admin', 'moderator'].includes(profile.role || '')) {
        toast.error('You do not have access to this page')
        return
      }
      loadUsers()
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [user, profile, loading])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      console.log('Начинаем загрузку пользователей...')

      // Загружаем колонки из таблицы profiles включая поля блокировки
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          display_name,
          role,
          city,
          country,
          bio,
          avatar_url,
          created_at,
          updated_at,
          ban_status,
          banned_at,
          banned_until,
          ban_reason,
          banned_by
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log(`Найдено ${usersData?.length || 0} пользователей`)

      // Загружаем статистику по зданиям, обзорам и маршрутам
      let buildingsCounts: Record<string, number> = {}
      let reviewsCounts: Record<string, number> = {}
      let routesCounts: Record<string, number> = {}

      if (usersData && usersData.length > 0) {
        console.log('Загружаем статистику...')
        const userIds = usersData.map(u => u.id)

        try {
          const [buildingsResult, reviewsResult, routesResult] = await Promise.all([
            supabase
              .from('buildings')
              .select('created_by')
              .in('created_by', userIds),
            supabase
              .from('building_reviews')
              .select('user_id')
              .in('user_id', userIds),
            supabase
              .from('routes')
              .select('created_by')
              .in('created_by', userIds)
          ])

          console.log('Статистика зданий:', buildingsResult)
          console.log('Статистика обзоров:', reviewsResult)
          console.log('Статистика маршрутов:', routesResult)

          // Подсчитываем статистику
          buildingsCounts = buildingsResult.data?.reduce((acc, b) => {
            acc[b.created_by] = (acc[b.created_by] || 0) + 1
            return acc
          }, {} as Record<string, number>) || {}

          reviewsCounts = reviewsResult.data?.reduce((acc, r) => {
            acc[r.user_id] = (acc[r.user_id] || 0) + 1
            return acc
          }, {} as Record<string, number>) || {}

          routesCounts = routesResult.data?.reduce((acc, r) => {
            acc[r.created_by] = (acc[r.created_by] || 0) + 1
            return acc
          }, {} as Record<string, number>) || {}
        } catch (statsError) {
          console.warn('Ошибка загрузки статистики, продолжаем без нее:', statsError)
        }
      }

      // Объединяем данные
      const enrichedUsers = (usersData || []).map(user => ({
        ...user,
        buildings_count: buildingsCounts[user.id] || 0,
        reviews_count: reviewsCounts[user.id] || 0,
        routes_count: routesCounts[user.id] || 0
      }))

      console.log('Обогащенные данные пользователей:', enrichedUsers)

      setUsers(enrichedUsers)
      console.log('Пользователи успешно загружены!')
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
      const errorMessage = (error as any)?.message || 'Unknown error'
      toast.error(`Error loading users: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!userId || !newRole) {
      toast.error('Invalid parameters')
      return
    }

    setIsUpdating(true)
    try {
      console.log('🔄 Updating user role:', { userId, newRole, currentUser: user?.id })

      // Проверяем права текущего пользователя
      if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
        throw new Error('You do not have permission to change roles')
      }

      // Простое обновление без сложных проверок
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        console.error('❌ Supabase error:', error)
        throw new Error(`Update error: ${error.message}`)
      }

      console.log('✅ Role update successful')
      toast.success(`User role has been changed to "${getRoleLabel(newRole)}"`)

      // Обновляем локальные данные
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId
            ? { ...u, role: newRole }
            : u
        )
      )

      setSelectedUser(null)
    } catch (error: any) {
      console.error('❌ Error updating role:', error)
      toast.error(error.message || 'Error updating role')
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция блокировки пользователя
  const banUser = async (userId: string, banType: 'banned' | 'suspended' | 'restricted', reason: string, days?: number) => {
    if (!userId || !reason.trim()) {
      toast.error('Please provide a reason for the ban')
      return
    }

    setIsUpdating(true)
    try {
      const updateData: Record<string, any> = {
        ban_status: banType,
        banned_at: new Date().toISOString(),
        ban_reason: reason,
        banned_by: user?.id
      }

      // Для временной блокировки устанавливаем дату окончания
      if (banType === 'suspended' && days) {
        const bannedUntil = new Date()
        bannedUntil.setDate(bannedUntil.getDate() + days)
        updateData.banned_until = bannedUntil.toISOString()
      } else {
        updateData.banned_until = null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error

      const actionLabels = {
        banned: 'permanently banned',
        suspended: `suspended for ${days} days`,
        restricted: 'restricted from publishing'
      }

      toast.success(`User has been ${actionLabels[banType]}`)

      // Обновляем локальные данные
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId
            ? { ...u, ...updateData }
            : u
        )
      )

      closeBanModal()
    } catch (error: any) {
      console.error('Error banning user:', error)
      toast.error(error.message || 'Error banning user')
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция разблокировки пользователя
  const unbanUser = async (userId: string) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ban_status: 'active',
          banned_at: null,
          banned_until: null,
          ban_reason: null,
          banned_by: null
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('User has been unblocked')

      // Обновляем локальные данные
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId
            ? { ...u, ban_status: 'active' as BanStatus, banned_at: undefined, banned_until: undefined, ban_reason: undefined, banned_by: undefined }
            : u
        )
      )

      closeBanModal()
    } catch (error: any) {
      console.error('Error unbanning user:', error)
      toast.error(error.message || 'Error unbanning user')
    } finally {
      setIsUpdating(false)
    }
  }

  const openBanModal = (user: UserProfile, action: 'ban' | 'suspend' | 'restrict' | 'unban') => {
    setBanModal({ user, action })
    setBanReason('')
    setSuspendDays(7)
  }

  const closeBanModal = () => {
    setBanModal({ user: null, action: null })
    setBanReason('')
    setSuspendDays(7)
  }

  const handleBanSubmit = () => {
    if (!banModal.user || !banModal.action) return

    if (banModal.action === 'unban') {
      unbanUser(banModal.user.id)
    } else if (banModal.action === 'ban') {
      banUser(banModal.user.id, 'banned', banReason)
    } else if (banModal.action === 'suspend') {
      banUser(banModal.user.id, 'suspended', banReason, suspendDays)
    } else if (banModal.action === 'restrict') {
      banUser(banModal.user.id, 'restricted', banReason)
    }
  }

  // Получение информации о статусе блокировки
  const getBanStatusInfo = (userProfile: UserProfile) => {
    const status = userProfile.ban_status || 'active'

    switch (status) {
      case 'banned':
        return { label: 'Banned', color: 'text-red-600 bg-red-50', icon: Ban }
      case 'suspended':
        const isExpired = userProfile.banned_until && new Date(userProfile.banned_until) < new Date()
        if (isExpired) {
          return { label: 'Expired', color: 'text-gray-600 bg-gray-50', icon: Clock }
        }
        return { label: 'Suspended', color: 'text-orange-600 bg-orange-50', icon: Clock }
      case 'restricted':
        return { label: 'Restricted', color: 'text-yellow-600 bg-yellow-50', icon: Lock }
      default:
        return { label: 'Active', color: 'text-green-600 bg-green-50', icon: Unlock }
    }
  }

  const formatBanUntil = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days === 1) return '1 day left'
    return `${days} days left`
  }

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    const matchesStatus = statusFilter === 'all' || (user.ban_status || 'active') === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-red-600" />
      case 'moderator': return <Shield className="w-4 h-4 text-purple-600" />
      case 'expert': return <Star className="w-4 h-4 text-yellow-600" />
      case 'guide': return <Eye className="w-4 h-4 text-green-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      'guest': 'Guest',
      'explorer': 'Explorer',
      'guide': 'Guide',
      'expert': 'Expert',
      'moderator': 'Moderator',
      'admin': 'Administrator'
    }
    return labels[role as keyof typeof labels] || role
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLocationDisplay = (user: UserProfile) => {
    if (user.city && user.country) {
      return `${user.city}, ${user.country}`
    } else if (user.city) {
      return user.city
    } else if (user.country) {
      return user.country
    }
    return null
  }

  if (loading || isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="bg-white rounded-lg p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="bg-white rounded-lg shadow-sm p-12">
          <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to manage users
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header buildings={[]} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              User Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage user roles and permissions on the platform
            </p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                  <div className="text-sm text-gray-600">Admins</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'expert').length}
                  </div>
                  <div className="text-sm text-gray-600">Experts</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'guide').length}
                  </div>
                  <div className="text-sm text-gray-600">Guides</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Ban className="w-8 h-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.ban_status && u.ban_status !== 'active').length}
                  </div>
                  <div className="text-sm text-gray-600">Blocked</div>
                </div>
              </div>
            </div>
          </div>

          {/* Поиск и фильтры */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by email, name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrators</option>
                  <option value="moderator">Moderators</option>
                  <option value="expert">Experts</option>
                  <option value="guide">Guides</option>
                  <option value="explorer">Explorers</option>
                  <option value="guest">Guests</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                  <option value="suspended">Suspended</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Список пользователей */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10">
                            {user.avatar_url ? (
                              <img
                                className="w-10 h-10 rounded-full object-cover"
                                src={user.avatar_url}
                                alt={user.display_name || user.full_name || 'User'}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.display_name || user.full_name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {getLocationDisplay(user) && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                {getLocationDisplay(user)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <span className="text-sm text-gray-900">
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const statusInfo = getBanStatusInfo(user)
                          const StatusIcon = statusInfo.icon
                          return (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </span>
                              {user.ban_status === 'suspended' && user.banned_until && (
                                <div className="text-xs text-gray-500">
                                  {formatBanUntil(user.banned_until)}
                                </div>
                              )}
                              {user.ban_reason && user.ban_status !== 'active' && (
                                <div className="text-xs text-gray-400 truncate max-w-[120px]" title={user.ban_reason}>
                                  {user.ban_reason}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>Buildings: {user.buildings_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>Reviews: {user.reviews_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Routes: {user.routes_count}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Role
                          </button>
                          {(!user.ban_status || user.ban_status === 'active') ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openBanModal(user, 'ban')}
                                className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs"
                                title="Permanent ban"
                              >
                                <Ban className="w-3 h-3" />
                                Ban
                              </button>
                              <button
                                onClick={() => openBanModal(user, 'suspend')}
                                className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-xs"
                                title="Temporary suspension"
                              >
                                <Clock className="w-3 h-3" />
                                Suspend
                              </button>
                              <button
                                onClick={() => openBanModal(user, 'restrict')}
                                className="text-yellow-600 hover:text-yellow-800 flex items-center gap-1 text-xs"
                                title="Restrict publishing"
                              >
                                <Lock className="w-3 h-3" />
                                Restrict
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openBanModal(user, 'unban')}
                              className="text-green-600 hover:text-green-800 flex items-center gap-1"
                            >
                              <Unlock className="w-4 h-4" />
                              Unblock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно изменения роли */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Change user role
            </h3>

            <div className="mb-4">
              <div className="text-sm text-gray-600">User:</div>
              <div className="font-medium">{selectedUser.email}</div>
              <div className="text-sm text-gray-600">
                Current role: {getRoleLabel(selectedUser.role)}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {['explorer', 'guide', 'expert', 'moderator', 'admin'].map(role => (
                <button
                  key={role}
                  onClick={() => updateUserRole(selectedUser.id, role)}
                  disabled={isUpdating}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedUser.role === role
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                    } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    {getRoleLabel(role)}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно блокировки/разблокировки */}
      {banModal.user && banModal.action && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {banModal.action === 'unban' ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Unlock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Unblock User</h3>
                    <p className="text-sm text-gray-500">Remove all restrictions</p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">User:</div>
                  <div className="font-medium">{banModal.user.display_name || banModal.user.email}</div>
                  {banModal.user.ban_reason && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-600">Ban reason:</div>
                      <div className="text-sm text-gray-900">{banModal.user.ban_reason}</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeBanModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBanSubmit}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isUpdating ? 'Processing...' : 'Unblock'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    banModal.action === 'ban' ? 'bg-red-100' :
                    banModal.action === 'suspend' ? 'bg-orange-100' : 'bg-yellow-100'
                  }`}>
                    {banModal.action === 'ban' && <Ban className="w-6 h-6 text-red-600" />}
                    {banModal.action === 'suspend' && <Clock className="w-6 h-6 text-orange-600" />}
                    {banModal.action === 'restrict' && <Lock className="w-6 h-6 text-yellow-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {banModal.action === 'ban' && 'Ban User'}
                      {banModal.action === 'suspend' && 'Suspend User'}
                      {banModal.action === 'restrict' && 'Restrict User'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {banModal.action === 'ban' && 'Permanently block access'}
                      {banModal.action === 'suspend' && 'Temporarily block access'}
                      {banModal.action === 'restrict' && 'Block publishing only'}
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">User:</div>
                  <div className="font-medium">{banModal.user.display_name || banModal.user.email}</div>
                </div>

                {banModal.action === 'suspend' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suspension Duration
                    </label>
                    <select
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Describe the reason for this action..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {banModal.action === 'ban' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700">
                        <strong>Warning:</strong> This will permanently block the user from accessing the platform. This action can be reversed by an administrator.
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeBanModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBanSubmit}
                    disabled={isUpdating || !banReason.trim()}
                    className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                      banModal.action === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                      banModal.action === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' :
                      'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                  >
                    {isUpdating ? 'Processing...' : (
                      banModal.action === 'ban' ? 'Ban User' :
                      banModal.action === 'suspend' ? 'Suspend User' :
                      'Restrict User'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
