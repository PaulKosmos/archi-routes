'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
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
  MessageSquare
} from 'lucide-react'

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

  // Загрузка пользователей
  useEffect(() => {
    if (user && profile) {
      if (!['admin', 'moderator'].includes(profile.role || '')) {
        toast.error('У вас нет прав доступа к этой странице')
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
      
      // Загружаем только существующие колонки из таблицы profiles
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
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log(`Найдено ${usersData?.length || 0} пользователей`)

      // Загружаем статистику по зданиям, обзорам и маршрутам
      let buildingsCounts = {}
      let reviewsCounts = {}
      let routesCounts = {}
      
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
      const errorMessage = (error as any)?.message || 'Неизвестная ошибка'
      toast.error(`Ошибка загрузки пользователей: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!userId || !newRole) {
      toast.error('Некорректные параметры')
      return
    }

    setIsUpdating(true)
    try {
      console.log('🔄 Updating user role:', { userId, newRole, currentUser: user?.id })
      
      // Проверяем права текущего пользователя
      if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
        throw new Error('У вас нет прав для изменения ролей')
      }
      
      // Простое обновление без сложных проверок
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        console.error('❌ Supabase error:', error)
        throw new Error(`Ошибка обновления: ${error.message}`)
      }

      console.log('✅ Role update successful')
      toast.success(`Роль пользователя успешно изменена на "${getRoleLabel(newRole)}"`)
      
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
      toast.error(error.message || 'Ошибка обновления роли')
    } finally {
      setIsUpdating(false)
    }
  }

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
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
      'guest': 'Гость',
      'explorer': 'Исследователь',
      'guide': 'Гид',
      'expert': 'Эксперт',
      'moderator': 'Модератор',
      'admin': 'Администратор'
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
            Доступ запрещен
          </h1>
          <p className="text-gray-600 mb-6">
            У вас нет прав для управления пользователями
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          Управление пользователями
        </h1>
        <p className="text-gray-600 mt-2">
          Управление ролями и правами пользователей платформы
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-600">Всего пользователей</div>
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
              <div className="text-sm text-gray-600">Администраторов</div>
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
              <div className="text-sm text-gray-600">Экспертов</div>
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
              <div className="text-sm text-gray-600">Гидов</div>
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
                placeholder="Поиск по email, имени..."
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
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="moderator">Модераторы</option>
              <option value="expert">Эксперты</option>
              <option value="guide">Гиды</option>
              <option value="explorer">Исследователи</option>
              <option value="guest">Гости</option>
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
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Регистрация
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
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
                            alt={user.display_name || user.full_name || 'Пользователь'}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.display_name || user.full_name || 'Без имени'}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>Зданий: {user.buildings_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Обзоров: {user.reviews_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>Маршрутов: {user.routes_count}</span>
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
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Изменить роль
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Пользователи не найдены</p>
          </div>
        )}
      </div>

      {/* Модальное окно изменения роли */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Изменить роль пользователя
            </h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600">Пользователь:</div>
              <div className="font-medium">{selectedUser.email}</div>
              <div className="text-sm text-gray-600">
                Текущая роль: {getRoleLabel(selectedUser.role)}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {['explorer', 'guide', 'expert', 'moderator', 'admin'].map(role => (
                <button
                  key={role}
                  onClick={() => updateUserRole(selectedUser.id, role)}
                  disabled={isUpdating}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    selectedUser.role === role
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
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
