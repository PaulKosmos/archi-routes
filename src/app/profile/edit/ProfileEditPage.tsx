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
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
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
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Вход необходим</h1>
            <p className="text-muted-foreground mb-6">Для редактирования профиля необходимо войти в систему</p>
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Войти
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  const currentAvatar = avatarPreview || formData.avatar_url || user.user_metadata?.avatar_url

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
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-heading font-bold">Редактировать профиль</h1>
                <p className="text-muted-foreground mt-1">Обновите информацию о себе</p>
              </div>
            </div>
          </div>

          {/* Сообщения */}
          {message && (
            <div className={`mb-6 p-4 rounded-[var(--radius)] border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Аватар */}
            <div className="bg-card border border-border rounded-[var(--radius)] p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Аватар
              </h2>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Аватар"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-foreground font-bold text-2xl">
                      {formData.display_name ? formData.display_name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  <p className="text-sm text-muted-foreground mt-2">
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
            <div className="bg-card border border-border rounded-[var(--radius)] p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Основная информация
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Имя */}
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium mb-2">
                    Имя *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.display_name ? 'border-red-300' : 'border-border'
                      }`}
                      placeholder={profile?.display_name || profile?.full_name || "Ваше имя"}
                      maxLength={50}
                    />
                  </div>
                  {errors.display_name && (
                    <p className="text-destructive text-xs mt-1">{errors.display_name}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {formData.display_name.length}/50 символов
                  </p>
                </div>

                {/* Город */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-2">
                    Город
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.city ? 'border-red-300' : 'border-border'
                      }`}
                      placeholder={profile?.city || "Ваш город"}
                      maxLength={100}
                    />
                  </div>
                  {errors.city && (
                    <p className="text-destructive text-xs mt-1">{errors.city}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {formData.city.length}/100 символов
                  </p>
                </div>
              </div>

              {/* О себе */}
              <div className="mt-6">
                <label htmlFor="bio" className="block text-sm font-medium mb-2">
                  О себе
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
                    errors.bio ? 'border-red-300' : 'border-border'
                  }`}
                  placeholder={profile?.bio || "Расскажите о себе, своих интересах в архитектуре..."}
                  maxLength={500}
                />
                {errors.bio && (
                  <p className="text-destructive text-xs mt-1">{errors.bio}</p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  {formData.bio.length}/500 символов
                </p>
              </div>
            </div>

            {/* Настройки приватности */}
            <div className="bg-card border border-border rounded-[var(--radius)] p-6">
              <h2 className="text-lg font-semibold mb-4">
                Приватность
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hide_email"
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="hide_email" className="text-sm">
                    Скрыть email от других пользователей
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hide_buildings"
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="hide_buildings" className="text-sm">
                    Скрыть список моих зданий
                  </label>
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-border rounded-[var(--radius)] hover:bg-accent transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Отменить</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </main>
      <EnhancedFooter />
    </div>
  )
}
