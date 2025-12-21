'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { uploadImage, getStorageUrl } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
// Убрал импорт PhotoGallery пока не найдем компонент

interface Building {
  id: string
  name: string
  description?: string
  architect?: string
  year_built?: number
  architectural_style?: string
  address?: string
  city: string
  country: string
  latitude: number
  longitude: number
  image_url?: string
  image_urls?: string[]
  website_url?: string
  entry_fee?: string
  accessibility_info?: string
  historical_significance?: string
  height_meters?: number
  building_type?: string
  conservation_status?: string
  visit_difficulty?: string
  best_visit_time?: string
  nearby_transport?: string[]
  accessibility?: string[]
  construction_materials?: string[]
  created_by?: string
}

interface EditBuildingClientProps {
  building: Building
}

export default function EditBuildingClient({
  building
}: EditBuildingClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryFileInputRef = useRef<HTMLInputElement>(null)

  // Определяем права пользователя
  const isOwner = user?.id === building.created_by
  const isAdmin = profile?.role === 'admin'
  const isModerator = profile?.role === 'moderator'

  const [formData, setFormData] = useState({
    name: building.name || '',
    description: building.description || '',
    architect: building.architect || '',
    year_built: building.year_built || '',
    architectural_style: building.architectural_style || '',
    address: building.address || '',
    city: building.city || '',
    country: building.country || '',
    latitude: building.latitude || 0,
    longitude: building.longitude || 0,
    website_url: building.website_url || '',
    entry_fee: building.entry_fee || '',
    accessibility_info: building.accessibility_info || '',
    historical_significance: building.historical_significance || '',
    height_meters: building.height_meters || '',
    building_type: building.building_type || '',
    conservation_status: building.conservation_status || '',
    visit_difficulty: building.visit_difficulty || '',
    best_visit_time: building.best_visit_time || '',
    nearby_transport: building.nearby_transport || [],
    accessibility: building.accessibility || [],
    construction_materials: building.construction_materials || [],
  })

  const [mainImage, setMainImage] = useState<string>(building.image_url || '')
  const [galleryImages, setGalleryImages] = useState<string[]>(building.image_urls || [])
  const [loading, setLoading] = useState(false)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMainImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    try {
      setUploadingMain(true)
      console.log('📸 Uploading main image:', file.name)

      const result = await uploadImage(file, 'buildings/main', user.id)
      setMainImage(result.url)

      console.log('📸 Main image uploaded successfully:', result.url)
    } catch (error) {
      console.error('📸 Main image upload error:', error)
      alert('Ошибка загрузки изображения')
    } finally {
      setUploadingMain(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [user?.id])

  const handleGalleryUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0 || !user?.id) return

    try {
      setUploadingGallery(true)
      console.log('🖼️ Uploading gallery images:', files.length)

      const uploadPromises = files.map(file =>
        uploadImage(file, 'buildings/gallery', user.id)
      )

      const results = await Promise.all(uploadPromises)
      const newUrls = results.map(r => r.url)

      setGalleryImages(prev => [...prev, ...newUrls])
      console.log('🖼️ Gallery images uploaded successfully:', newUrls)
    } catch (error) {
      console.error('🖼️ Gallery upload error:', error)
      alert('Ошибка загрузки изображений')
    } finally {
      setUploadingGallery(false)
      if (galleryFileInputRef.current) {
        galleryFileInputRef.current.value = ''
      }
    }
  }, [user?.id])

  const removeGalleryImage = (indexToRemove: number) => {
    setGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      console.log('🗑️ Удаляем здание:', building.id)
      
      // Получаем токен пользователя
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Нет токена авторизации')
      }
      
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Ошибка удаления')
      }
      
      console.log('✅ Здание успешно удалено!')
      alert('✅ Здание успешно удалено!')
      
      // Перенаправляем на главную страницу
      router.push('/')
      router.refresh()
      
    } catch (error) {
      console.error('🗑️ Ошибка удаления:', error)
      alert(`Ошибка при удалении: ${error.message}`)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      alert('Необходимо войти в систему')
      return
    }

    try {
      setLoading(true)
      console.log('💾 Updating building:', building.id)
      console.log('💾 Form data:', formData)
      console.log('💾 Main image:', mainImage)
      console.log('💾 Gallery images:', galleryImages)

      const updateData = {
        ...formData,
        year_built: formData.year_built ? parseInt(formData.year_built.toString()) : null,
        latitude: parseFloat(formData.latitude.toString()),
        longitude: parseFloat(formData.longitude.toString()),
        height_meters: formData.height_meters ? parseFloat(formData.height_meters.toString()) : null,
        // Преобразуем пустые строки в null для CHECK-ограничений
        visit_difficulty: formData.visit_difficulty || null,
        best_visit_time: formData.best_visit_time || null,
        building_type: formData.building_type || null,
        conservation_status: formData.conservation_status || null,
        // Новые массивы
        nearby_transport: formData.nearby_transport.length > 0 ? formData.nearby_transport : null,
        accessibility: formData.accessibility.length > 0 ? formData.accessibility : null,
        construction_materials: formData.construction_materials.length > 0 ? formData.construction_materials : null,
        image_url: mainImage,
        image_urls: galleryImages,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }

      console.log('💾 Update data to send:', updateData)

      const { data, error } = await supabase
        .from('buildings')
        .update(updateData)
        .eq('id', building.id)
        .select()

      console.log('💾 Supabase response:', { data, error })

      if (error) {
        console.error('💾 Update error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('💾 Building updated successfully:', data)
      alert('✅ Здание успешно обновлено!')
      router.push(`/buildings/${building.id}`)
      router.refresh()
    } catch (error) {
      console.error('💾 Update error:', error)
      console.error('💾 Error type:', typeof error)
      console.error('💾 Error constructor:', error?.constructor?.name)
      
      if (error instanceof Error) {
        console.error('💾 Error message:', error.message)
        console.error('💾 Error stack:', error.stack)
        alert(`Ошибка при обновлении здания: ${error.message}`)
      } else {
        console.error('💾 Unknown error type:', error)
        alert('Неизвестная ошибка при обновлении здания')
      }
    } finally {
      setLoading(false)
    }
  }

  // Показываем загрузку, пока проверяем авторизацию
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Редактирование здания</h1>
          <p className="text-gray-600">
            Редактирование: <strong>{building.name}</strong>
          </p>
          <div className="mt-2 text-sm text-blue-600">
            {isOwner ? '👤 Вы автор этого здания' : ''}
            {isAdmin ? '🔧 Админ-права' : ''}
            {isModerator ? '🛡️ Модератор-права' : ''}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Основная информация */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Основная информация</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название здания *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Архитектор
                </label>
                <input
                  type="text"
                  value={formData.architect}
                  onChange={(e) => handleInputChange('architect', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Год постройки
                </label>
                <input
                  type="number"
                  min="0"
                  max="2030"
                  value={formData.year_built}
                  onChange={(e) => handleInputChange('year_built', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Архитектурный стиль
                </label>
                <input
                  type="text"
                  value={formData.architectural_style}
                  onChange={(e) => handleInputChange('architectural_style', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Модернизм, Готика, Барокко"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Подробное описание здания, его истории и особенностей"
              />
            </div>
          </div>

          {/* Изображения */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Изображения</h2>
            
            {/* Главное изображение */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Главное изображение
              </label>
              <div className="space-y-4">
                {mainImage && (
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                    <Image
                      src={getStorageUrl(mainImage)}
                      alt="Главное изображение"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        console.error('🖼️ Main image failed to load:', mainImage)
                        setMainImage('')
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMainImage('')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    className="hidden"
                    id="main-image-upload"
                  />
                  <label
                    htmlFor="main-image-upload"
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${
                      uploadingMain ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingMain ? '⏳ Загрузка...' : '📸 Выбрать главное изображение'}
                  </label>
                </div>
              </div>
            </div>

            {/* Галерея */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Галерея изображений
              </label>
              <div className="space-y-4">
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border">
                          <Image
                            src={getStorageUrl(image)}
                            alt={`Gallery ${index + 1}`}
                            fill
                            className="object-cover"
                            onError={() => removeGalleryImage(index)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <input
                    ref={galleryFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                    id="gallery-upload"
                  />
                  <label
                    htmlFor="gallery-upload"
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${
                      uploadingGallery ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingGallery ? '⏳ Загрузка...' : '🖼️ Добавить в галерею'}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Дополнительная информация</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Веб-сайт
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Стоимость входа
                </label>
                <input
                  type="text"
                  value={formData.entry_fee}
                  onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Бесплатно, €10, €5-15"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сложность посещения
                </label>
                <select
                  value={formData.visit_difficulty}
                  onChange={(e) => handleInputChange('visit_difficulty', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Не указано</option>
                  <option value="easy">Легко</option>
                  <option value="moderate">Умеренно</option>
                  <option value="difficult">Сложно</option>
                  <option value="very_difficult">Очень сложно</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Лучшее время для посещения
                </label>
                <select
                  value={formData.best_visit_time}
                  onChange={(e) => handleInputChange('best_visit_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Не указано</option>
                  <option value="morning">Утром</option>
                  <option value="afternoon">Днем</option>
                  <option value="evening">Вечером</option>
                  <option value="night">Ночью</option>
                  <option value="any_time">Любое время</option>
                  <option value="weekdays">Будни</option>
                  <option value="weekends">Выходные</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Историческое значение
              </label>
              <textarea
                value={formData.historical_significance}
                onChange={(e) => handleInputChange('historical_significance', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Историческая важность, события, связанные с зданием, культурное значение"
              />
            </div>

            {/* Дополнительная информация (новые поля) */}
            <div className="col-span-2 border-t border-gray-200 pt-6 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Транспорт и доступность</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Транспорт рядом */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Транспорт рядом
                  </label>
                  <textarea
                    value={formData.nearby_transport.join('\n')}
                    onChange={(e) => handleInputChange('nearby_transport', e.target.value.split('\n').filter(v => v.trim()))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Метро: Potsdamer Platz&#10;Автобус: M48, M85&#10;S-Bahn: S1, S2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Каждая строка - отдельная опция транспорта</p>
                </div>

                {/* Доступность */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Варианты доступности
                  </label>
                  <textarea
                    value={formData.accessibility.join('\n')}
                    onChange={(e) => handleInputChange('accessibility', e.target.value.split('\n').filter(v => v.trim()))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Пандус для инвалидных колясок&#10;Лифт&#10;Аудиогид"
                  />
                  <p className="text-xs text-gray-500 mt-1">Каждая строка - отдельная опция доступности</p>
                </div>
              </div>

              {/* Материалы строительства */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Материалы строительства
                </label>
                <textarea
                  value={formData.construction_materials.join(', ')}
                  onChange={(e) => handleInputChange('construction_materials', e.target.value.split(',').map(v => v.trim()).filter(v => v))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Сталь, Стекло, Бетон, Гранит"
                />
                <p className="text-xs text-gray-500 mt-1">Через запятую</p>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={loading || uploadingMain || uploadingGallery}
              className={`flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ${
                loading || uploadingMain || uploadingGallery ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              🔙 Отменить
            </button>
            
            <button
              type="button"
              onClick={() => router.push(`/buildings/${building.id}`)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              👁️ Просмотр
            </button>
            
            {/* Кнопка удаления */}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              🗑️ Удалить здание
            </button>
          </div>
        </form>
      </div>
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Подтвердите удаление
            </h3>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить здание <strong>"{building.name}"</strong>?
              <br /><br />
              🚨 <span className="text-red-600 font-medium">Это действие нельзя отменить!</span> Будут удалены все связанные обзоры и данные.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
                  deleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {deleting ? '⏳ Удаление...' : '🗑️ Да, удалить'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
