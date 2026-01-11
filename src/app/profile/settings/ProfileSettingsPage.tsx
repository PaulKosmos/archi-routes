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
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

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
        console.error('Error loading settings:', error)
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
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
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
      console.error('Error exporting data:', error)
      alert('Failed to export data')
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

      alert('Account deletion request sent. Your data will be deleted within 30 days.')
      setShowDeleteConfirm(false)
      setSettings(prev => ({ ...prev, delete_account_requested: true }))
    } catch (error) {
      console.error('Error requesting deletion:', error)
      alert('Failed to send deletion request')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-[var(--radius)] p-6 text-center max-w-md">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">
              Authorization Required
            </h2>
            <p className="text-yellow-700 mb-4">
              You must sign in to access settings
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Home
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading settings...</span>
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
        <div className="container mx-auto px-4 py-8 pt-10 max-w-4xl">
          {/* Заголовок */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/profile"
                className="p-2 rounded-[var(--radius)] hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your account and personal settings
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Уведомления */}
            <div className="bg-card border border-border rounded-[var(--radius)] p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive important notifications via email</p>
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
                    <h3 className="font-medium text-gray-900">New Reviews</h3>
                    <p className="text-sm text-gray-500">Notifications about new reviews of your buildings</p>
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
                    <h3 className="font-medium text-gray-900">Mentions</h3>
                    <p className="text-sm text-gray-500">When you are mentioned in reviews or comments</p>
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
                Privacy
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Profile Visibility</h3>
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
                        <span className="font-medium">Public</span>
                        <p className="text-sm text-gray-500">Everyone can see your profile and activity</p>
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
                        <span className="font-medium">Private</span>
                        <p className="text-sm text-gray-500">Only basic information visible to others</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Show Email</h3>
                    <p className="text-sm text-gray-500">Allow other users to see your email</p>
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
                    <h3 className="font-medium text-gray-900">Show My Buildings</h3>
                    <p className="text-sm text-gray-500">Allow others to see the list of buildings you created</p>
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
                Interface Language
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
                  <span>🇷🇺 Russian</span>
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
                Data Export
              </h2>

              <p className="text-gray-600 mb-4">
                Download an archive of all your data: profile, created buildings, reviews and favorites
              </p>

              <button
                onClick={exportData}
                disabled={exportLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing data...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Data
                  </>
                )}
              </button>
            </div>

            {/* Удаление аккаунта */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center text-red-800">
                <Trash2 className="h-5 w-5 mr-2" />
                Account Deletion
              </h2>

              {settings.delete_account_requested ? (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-yellow-800">
                      <strong>Deletion request sent.</strong> Your account will be deleted within 30 days.
                      To cancel, contact support.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-red-700 mb-4">
                    <strong>Warning!</strong> Account deletion is irreversible. All your data, including created buildings and reviews, will be deleted forever.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-red-800 font-medium">
                        Are you sure you want to delete your account? This action cannot be undone.
                      </p>
                      <div className="flex space-x-4">
                        <button
                          onClick={requestDeleteAccount}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Yes, Delete Account
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Cancel
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
                Back to Profile
              </Link>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
      <EnhancedFooter />
    </div>
  )
}
