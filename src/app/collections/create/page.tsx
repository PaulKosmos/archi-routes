'use client'

export const dynamic = 'force-dynamic'

// src/app/collections/create/page.tsx - Создание новой коллекции


import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Globe, Lock, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { validateCollection } from '@/utils/collectionsUtils'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

export default function CreateCollectionPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false,
    cover_image: ''
  })

  // UI состояния
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Обработка изменений формы
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Очищаем ошибки при изменении
    if (errors.length > 0) {
      setErrors([])
    }
  }

  // Валидация и отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Валидация
    const validation = validateCollection(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setLoading(true)
    setErrors([])

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Создаем коллекцию
      const { data: collection, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_public: formData.is_public,
          cover_image: formData.cover_image || null
        })
        .select()
        .single()

      if (error) throw error

      // Переходим к созданной коллекции
      router.push(`/collections/${collection.id}`)

    } catch (err: any) {
      console.error('Error creating collection:', err)
      setErrors([err.message || 'Error creating collection'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header buildings={[]} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Навигация */}
          <div className="mb-8">
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Collections
            </Link>
          </div>

          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">New Collection</h1>
            <p className="text-gray-600 mt-1">
              Create a personal selection of architectural objects
            </p>
          </div>

          {/* Форма */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Отображение ошибок */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800">
                    <strong>Fix errors:</strong>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Название */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Modernist Architecture in Berlin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={100}
                  required
                />
                <div className="mt-1 text-xs text-gray-500">
                  {formData.name.length}/100 characters
                </div>
              </div>

              {/* Описание */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the collection and object selection criteria..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={500}
                />
                <div className="mt-1 text-xs text-gray-500">
                  {formData.description.length}/500 characters
                </div>
              </div>

              {/* Обложка */}
              <div>
                <label htmlFor="cover_image" className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Cover
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    id="cover_image"
                    value={formData.cover_image}
                    onChange={(e) => handleInputChange('cover_image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  {/* Предварительный просмотр */}
                  {formData.cover_image && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.cover_image}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={() => handleInputChange('cover_image', '')}
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    If not specified, the photo of the first building in the collection will be used
                  </div>
                </div>
              </div>

              {/* Настройки приватности */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Privacy Settings
                </label>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      checked={!formData.is_public}
                      onChange={() => handleInputChange('is_public', false)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">Private Collection</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Only you can view and edit this collection
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      checked={formData.is_public}
                      onChange={() => handleInputChange('is_public', true)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-gray-900">Public Collection</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Other users will be able to find and view the collection
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Дополнительная информация */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• After creation, you can add objects to the collection</li>
                  <li>• Use object pages or search results to add objects</li>
                  <li>• Privacy settings can be changed at any time</li>
                  <li>• Public collections will appear in the general catalog</li>
                </ul>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Link
                  href="/collections"
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Collection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <EnhancedFooter />
    </>
  )
}
