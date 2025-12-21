'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useRef, useMemo } from 'react'
import {
  Save,
  X,
  Upload,
  User,
  MapPin,
  FileText,
  Camera,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

interface FormData {
  display_name: string
  bio: string
  city: string
  avatar_url: string
}

export default function ProfileEditPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, updateProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<FormData>({
    display_name: profile?.display_name || profile?.full_name || '',
    bio: profile?.bio || '',
    city: profile?.city || '',
    avatar_url: profile?.avatar_url || ''
  })
  
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // Валидация формы
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}
    
    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Имя обязательно для заполнения'
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = 'Имя должно содержать минимум 2 символа'
    } else if (formData.display_name.length > 50) {
      newErrors.display_name = 'Имя не должно превышать 50 символов'
    } else if (!/^[a-zA-Zа-яА-Я\s]+$/.test(formData.display_name)) {
      newErrors.display_name = 'Имя может содержать только буквы и пробелы'
    }
    
    if (formData.city && formData.city.length > 100) {
      newErrors.city = 'Название города не должно превышать 100 символов'
    }
    
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Описание не должно превышать 500 символов'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user) return

    setUploadingAvatar(true)
    try {
      // Валидация файла
      if (file.size > 2 * 1024 * 1024) { // 2MB
        throw new Error('Размер файла не должен превышать 2MB')
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Можно загружать только изображения')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Поддерживаются только форматы JPG, PNG и WebP')
      }

      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      if (urlData?.publicUrl) {
        setFormData(prev => ({
          ...prev,
          avatar_url: urlData.publicUrl
        }))
        setAvatarPreview(urlData.publicUrl)
        setMessage({ type: 'success', text: 'Аватар успешно загружен' })
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Ошибка загрузки аватара' 
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleAvatarUpload(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Пожалуйста, исправьте ошибки в форме' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await updateProfile(formData)
      
      if (error) {
        throw error
      }

      setMessage({ type: 'success', text: 'Профиль успешно обновлен!' })
      
      // Перенаправляем на страницу профиля через 2 секунды
      setTimeout(() => {
        router.push('/profile')
      }, 2000)
      
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Ошибка при сохранении профиля' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/profile')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход необходим</h1>
          <p className="text-gray-600 mb-6">Для редактирования профиля необходимо войти в систему</p>
          <Link 
            href="/auth" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    )
  }

  const currentAvatar = avatarPreview || formData.avatar_url || user.user_metadata?.avatar_url

  return (
    <>
      <Header buildings={[]} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Редактировать профиль</h1>
              <p className="text-gray-600">Обновите информацию о себе</p>
            </div>
          </div>
        </div>

        {/* Сообщения */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Аватар */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Аватар
            </h2>
            
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center flex-shrink-0">
                {currentAvatar ? (
                  <img 
                    src={currentAvatar} 
                    alt="Аватар"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-2xl">
                    {formData.display_name ? formData.display_name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Загрузка...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Загрузить новый</span>
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  JPG, PNG или WebP. Максимум 2MB.
                </p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Основная информация */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Основная информация
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Имя */}
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Имя *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.display_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={profile?.display_name || profile?.full_name || "Ваше имя"}
                    maxLength={50}
                  />
                </div>
                {errors.display_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.display_name}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  {formData.display_name.length}/50 символов
                </p>
              </div>

              {/* Город */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  Город
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={profile?.city || "Ваш город"}
                    maxLength={100}
                  />
                </div>
                {errors.city && (
                  <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  {formData.city.length}/100 символов
                </p>
              </div>
            </div>

            {/* О себе */}
            <div className="mt-6">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                О себе
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.bio ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={profile?.bio || "Расскажите о себе, своих интересах в архитектуре..."}
                maxLength={500}
              />
              {errors.bio && (
                <p className="text-red-600 text-sm mt-1">{errors.bio}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                {formData.bio.length}/500 символов
              </p>
            </div>
          </div>

          {/* Настройки приватности */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Приватность
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hide_email"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="hide_email" className="text-sm text-gray-700">
                  Скрыть email от других пользователей
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hide_buildings"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="hide_buildings" className="text-sm text-gray-700">
                  Скрыть список моих зданий
                </label>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Отменить</span>
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
      <EnhancedFooter />
    </>
  )
}
