'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useRef, useMemo, useEffect } from 'react'
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
  username: string
  bio: string
  city: string
  avatar_url: string
}

export default function ProfileEditPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, updateProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Store initial profile values for comparison
  const initialProfileRef = useRef<{
    display_name: string
    username: string
    bio: string
    city: string
    avatar_url: string
  } | null>(null)

  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    username: '',
    bio: '',
    city: '',
    avatar_url: ''
  })

  // Sync form data when profile loads
  useEffect(() => {
    if (profile && !initialProfileRef.current) {
      const initialValues = {
        display_name: profile.display_name || profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        city: profile.city || '',
        avatar_url: profile.avatar_url || ''
      }
      initialProfileRef.current = initialValues
      setFormData(initialValues)
    }
  }, [profile])

  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Валидация формы
  const [errors, setErrors] = useState<Partial<FormData>>({})

  // Regex for Latin characters only (letters, spaces, common punctuation)
  const latinOnlyRegex = /^[a-zA-Z\s'-]+$/
  const latinWithNumbersRegex = /^[a-zA-Z0-9\s,.'\-]+$/

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Name is required'
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = 'Name must be at least 2 characters'
    } else if (formData.display_name.length > 50) {
      newErrors.display_name = 'Name must not exceed 50 characters'
    } else if (!latinOnlyRegex.test(formData.display_name)) {
      newErrors.display_name = 'Name can only contain Latin letters (A-Z)'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (formData.username.length > 30) {
      newErrors.username = 'Username must not exceed 30 characters'
    } else if (!/^[a-z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain lowercase letters, numbers and underscores'
    }

    if (formData.city && formData.city.length > 100) {
      newErrors.city = 'City name must not exceed 100 characters'
    } else if (formData.city && !latinWithNumbersRegex.test(formData.city)) {
      newErrors.city = 'City can only contain Latin letters (A-Z)'
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must not exceed 500 characters'
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
        throw new Error('File size must not exceed 2MB')
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Only images can be uploaded')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPG, PNG and WebP formats are supported')
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
        setMessage({ type: 'success', text: 'Avatar uploaded successfully' })
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error uploading avatar'
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
      setMessage({ type: 'error', text: 'Please correct the errors in the form' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Only send fields that have actually changed to avoid unique constraint issues
      const updates: Partial<FormData> = {}
      const initial = initialProfileRef.current

      if (!initial) {
        setMessage({ type: 'error', text: 'Profile data not loaded. Please refresh the page.' })
        setLoading(false)
        return
      }

      if (formData.display_name !== initial.display_name) {
        updates.display_name = formData.display_name
      }
      if (formData.username !== initial.username) {
        updates.username = formData.username
      }
      if (formData.bio !== initial.bio) {
        updates.bio = formData.bio
      }
      if (formData.city !== initial.city) {
        updates.city = formData.city
      }
      if (formData.avatar_url !== initial.avatar_url) {
        updates.avatar_url = formData.avatar_url
      }

      // If nothing changed, just show success
      if (Object.keys(updates).length === 0) {
        setMessage({ type: 'success', text: 'No changes to save.' })
        setLoading(false)
        return
      }

      const { error } = await updateProfile(updates)

      if (error) {
        // Extract meaningful error message from Supabase error
        let errorMessage = 'Error saving profile'
        if (typeof error === 'object' && error !== null) {
          const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string }
          if (supabaseError.message) {
            errorMessage = supabaseError.message
          } else if (supabaseError.details) {
            errorMessage = supabaseError.details
          } else if (supabaseError.hint) {
            errorMessage = supabaseError.hint
          }
          // Handle unique constraint violations
          if (supabaseError.code === '23505') {
            if (supabaseError.message?.includes('username')) {
              errorMessage = 'This username is already taken. Please choose another.'
            } else {
              errorMessage = 'This value is already in use. Please choose another.'
            }
          }
        }
        console.error('Error updating profile:', error)
        setMessage({ type: 'error', text: errorMessage })
        return
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' })

      // Update initial profile ref with new values for future comparisons
      initialProfileRef.current = { ...formData }

      // Redirect to profile page after 2 seconds
      setTimeout(() => {
        router.push('/profile')
      }, 2000)

    } catch (error) {
      console.error('Error updating profile:', error)
      let errorMessage = 'Error saving profile'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { message?: string }
        errorMessage = err.message || errorMessage
      }
      setMessage({ type: 'error', text: errorMessage })
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
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">You must sign in to edit your profile</p>
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              Sign In
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
                <h1 className="text-3xl font-heading font-bold">Edit Profile</h1>
                <p className="text-muted-foreground mt-1">Update your information</p>
              </div>
            </div>
          </div>

          {/* Сообщения */}
          {message && (
            <div className={`mb-6 p-4 rounded-[var(--radius)] border ${message.type === 'success'
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
                Avatar
              </h2>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Avatar"
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
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload New</span>
                      </>
                    )}
                  </button>
                  <p className="text-sm text-muted-foreground mt-2">
                    JPG, PNG or WebP. Maximum 2MB.
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
                Basic Information
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Имя */}
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium mb-2">
                    Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent ${errors.display_name ? 'border-red-300' : 'border-border'
                        }`}
                      placeholder={profile?.display_name || profile?.full_name || "Your name"}
                      maxLength={50}
                    />
                  </div>
                  {errors.display_name && (
                    <p className="text-destructive text-xs mt-1">{errors.display_name}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {formData.display_name.length}/50 characters
                  </p>
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-2">
                    Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">@</span>
                    <input
                      type="text"
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className={`w-full pl-8 pr-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent ${errors.username ? 'border-red-300' : 'border-border'
                        }`}
                      placeholder="your_username"
                      maxLength={30}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-destructive text-xs mt-1">{errors.username}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {formData.username.length}/30 characters. Used for your public profile URL.
                  </p>
                </div>

                {/* Город */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-2">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent ${errors.city ? 'border-red-300' : 'border-border'
                        }`}
                      placeholder={profile?.city || "Your city"}
                      maxLength={100}
                    />
                  </div>
                  {errors.city && (
                    <p className="text-destructive text-xs mt-1">{errors.city}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {formData.city.length}/100 characters
                  </p>
                </div>
              </div>

              {/* О себе */}
              <div className="mt-6">
                <label htmlFor="bio" className="block text-sm font-medium mb-2">
                  About Me
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-2 text-sm border rounded-[var(--radius)] bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${errors.bio ? 'border-red-300' : 'border-border'
                    }`}
                  placeholder={profile?.bio || "Tell us about yourself and your interests in architecture..."}
                  maxLength={500}
                />
                {errors.bio && (
                  <p className="text-destructive text-xs mt-1">{errors.bio}</p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>
            </div>

            {/* Настройки приватности */}
            <div className="bg-card border border-border rounded-[var(--radius)] p-6">
              <h2 className="text-lg font-semibold mb-4">
                Privacy
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hide_email"
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="hide_email" className="text-sm">
                    Hide email from other users
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hide_buildings"
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="hide_buildings" className="text-sm">
                    Hide my buildings list
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
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
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
