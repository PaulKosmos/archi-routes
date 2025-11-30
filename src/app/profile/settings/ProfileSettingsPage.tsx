'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { 
  Settings,
  Bell,
  Globe,
  Shield,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  Languages,
  ArrowLeft,
  Save,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface UserSettings {
  notifications_email: boolean
  notifications_reviews: boolean
  notifications_mentions: boolean
  profile_visibility: 'public' | 'private' | 'friends'
  email_visibility: boolean
  buildings_visibility: boolean
  language: 'ru' | 'en' | 'de'
  delete_account_requested: boolean
}

export default function ProfileSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  const [settings, setSettings] = useState<UserSettings>({
    notifications_email: true,
    notifications_reviews: true,
    notifications_mentions: true,
    profile_visibility: 'public',
    email_visibility: false,
    buildings_visibility: true,
    language: 'ru',
    delete_account_requested: false
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Ошибка загрузки настроек:', error)
        return
      }

      if (data) {
        setSettings({
          notifications_email: data.notifications_email ?? true,
          notifications_reviews: data.notifications_reviews ?? true,
          notifications_mentions: data.notifications_mentions ?? true,
          profile_visibility: data.profile_visibility ?? 'public',
          email_visibility: data.email_visibility ?? false,
          buildings_visibility: data.buildings_visibility ?? true,
          language: data.language ?? 'ru',
          delete_account_requested: data.delete_account_requested ?? false
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      alert('Не удалось сохранить настройки')
    } finally {
      setSaving(false)
    }
  }

  const exportData = async () => {
    if (!user) return
    
    setExportLoading(true)
    try {
      // Получаем все данные пользователя
      const [profileData, buildingsData, reviewsData, favoritesData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('buildings').select('*').eq('created_by', user.id),
        supabase.from('building_reviews').select('*').eq('user_id', user.id),
        supabase.from('user_building_favorites').select('building:buildings(*)').eq('user_id', user.id)
      ])

      const exportData = {
        profile: profileData.data,
        buildings: buildingsData.data || [],
        reviews: reviewsData.data || [],
        favorites: favoritesData.data || [],
        export_date: new Date().toISOString()
      }

      // Создаем и скачиваем файл
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `archi-routes-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Ошибка экспорта данных:', error)
      alert('Не удалось экспортировать данные')
    } finally {
      setExportLoading(false)
    }
  }

  const requestDeleteAccount = async () => {
    if (!user) return
    
    try {
      // Помечаем аккаунт на удаление
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          delete_account_requested: true,
          delete_requested_at: new Date().toISOString()
        })

      if (error) throw error

      alert('Запрос на удаление аккаунта отправлен. Ваши данные будут удалены в течение 30 дней.')
      setShowDeleteConfirm(false)
      setSettings(prev => ({ ...prev, delete_account_requested: true }))
    } catch (error) {
      console.error('Ошибка запроса удаления:', error)
      alert('Не удалось отправить запрос на удаление')
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Необходима авторизация
          </h2>
          <p className="text-yellow-700 mb-4">
            Для доступа к настройкам необходимо войти в систему
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Загрузка настроек...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/profile"
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Settings className="h-8 w-8 mr-3 text-blue-600" />
              Настройки
            </h1>
            <p className="text-gray-600 mt-1">
              Управление вашим аккаунтом и персональными настройками
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Уведомления */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-blue-600" />
            Уведомления
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Email уведомления</h3>
                <p className="text-sm text-gray-500">Получать важные уведомления на email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, notifications_email: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Новые обзоры</h3>
                <p className="text-sm text-gray-500">Уведомления о новых обзорах ваших зданий</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications_reviews}
                  onChange={(e) => setSettings(prev => ({ ...prev, notifications_reviews: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Упоминания</h3>
                <p className="text-sm text-gray-500">Когда вас упоминают в обзорах или комментариях</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications_mentions}
                  onChange={(e) => setSettings(prev => ({ ...prev, notifications_mentions: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Приватность */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Приватность
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Видимость профиля</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value="public"
                    checked={settings.profile_visibility === 'public'}
                    onChange={(e) => setSettings(prev => ({ ...prev, profile_visibility: e.target.value as 'public' | 'private' | 'friends' }))}
                    className="mr-2"
                  />
                  <div>
                    <span className="font-medium">Публичный</span>
                    <p className="text-sm text-gray-500">Все могут видеть ваш профиль и активность</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value="private"
                    checked={settings.profile_visibility === 'private'}
                    onChange={(e) => setSettings(prev => ({ ...prev, profile_visibility: e.target.value as 'public' | 'private' | 'friends' }))}
                    className="mr-2"
                  />
                  <div>
                    <span className="font-medium">Приватный</span>
                    <p className="text-sm text-gray-500">Только базовая информация видна другим</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Показывать email</h3>
                <p className="text-sm text-gray-500">Разрешить другим пользователям видеть ваш email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_visibility}
                  onChange={(e) => setSettings(prev => ({ ...prev, email_visibility: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Показывать мои здания</h3>
                <p className="text-sm text-gray-500">Разрешить другим видеть список созданных вами зданий</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.buildings_visibility}
                  onChange={(e) => setSettings(prev => ({ ...prev, buildings_visibility: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Язык */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Languages className="h-5 w-5 mr-2 text-blue-600" />
            Язык интерфейса
          </h2>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="language"
                value="ru"
                checked={settings.language === 'ru'}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value as 'ru' | 'en' | 'de' }))}
                className="mr-3"
              />
              <span>🇷🇺 Русский</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="language"
                value="en"
                checked={settings.language === 'en'}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value as 'ru' | 'en' | 'de' }))}
                className="mr-3"
              />
              <span>🇺🇸 English</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="language"
                value="de"
                checked={settings.language === 'de'}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value as 'ru' | 'en' | 'de' }))}
                className="mr-3"
              />
              <span>🇩🇪 Deutsch</span>
            </label>
          </div>
        </div>

        {/* Экспорт данных */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Download className="h-5 w-5 mr-2 text-blue-600" />
            Экспорт данных
          </h2>
          
          <p className="text-gray-600 mb-4">
            Скачайте архив всех ваших данных: профиль, созданные здания, обзоры и избранное
          </p>
          
          <button
            onClick={exportData}
            disabled={exportLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {exportLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Подготовка данных...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Скачать данные
              </>
            )}
          </button>
        </div>

        {/* Удаление аккаунта */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-red-800">
            <Trash2 className="h-5 w-5 mr-2" />
            Удаление аккаунта
          </h2>
          
          {settings.delete_account_requested ? (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800">
                  <strong>Запрос на удаление отправлен.</strong> Ваш аккаунт будет удален в течение 30 дней.
                  Для отмены свяжитесь с поддержкой.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-red-700 mb-4">
                <strong>Внимание!</strong> Удаление аккаунта необратимо. Все ваши данные, включая созданные здания и обзоры, будут удалены навсегда.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить аккаунт
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-800 font-medium">
                    Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={requestDeleteAccount}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Да, удалить аккаунт
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Кнопка сохранения */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Link
            href="/profile"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Назад к профилю
          </Link>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Сохранено!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить изменения
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}