// src/app/buildings/[id]/edit/BuildingEditClient.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { useEditPermissions } from '../../../../hooks/useEditPermissions'
import type { Building } from '../../../../types/building'
import { Save, X, Upload, MapPin, ArrowLeft } from 'lucide-react'

interface BuildingEditClientProps {
  building: Building & {
    profiles?: {
      id: string
      full_name: string | null
      role: string
    }
  }
}

export default function BuildingEditClient({
  building
}: BuildingEditClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Получаем права доступа для отображения роли (новый API без userId)
  const permissions = useEditPermissions('building', building.id)

  // Форма данных
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
    image_url: building.image_url || '',
    website_url: building.website_url || '',
    entry_fee: building.entry_fee || '',
    accessibility_info: building.accessibility_info || '',
    historical_significance: building.historical_significance || '',
    building_type: building.building_type || '',
    conservation_status: building.conservation_status || '',
    height_meters: building.height_meters || ''
  })

  // Состояния
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Загрузка изображения
  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null

    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `building_${building.id}_${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('building-images')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('building-images')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading image:', error)
      throw new Error('Ошибка загрузки изображения')
    } finally {
      setUploadingImage(false)
    }
  }

  // Сохранение изменений
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Название здания обязательно')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Загружаем новое изображение если есть
      let imageUrl = formData.image_url
      if (imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      // Подготавливаем данные для обновления
      const updateData = {
        ...formData,
        image_url: imageUrl,
        year_built: formData.year_built ? parseInt(formData.year_built.toString()) : null,
        height_meters: formData.height_meters ? parseFloat(formData.height_meters.toString()) : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('buildings')
        .update(updateData)
        .eq('id', building.id)

      if (error) {
        throw new Error(`Ошибка сохранения: ${error.message}`)
      }

      setSuccess(true)

      // Редирект на страницу здания через 2 секунды
      setTimeout(() => {
        router.push(`/buildings/${building.id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Error saving building:', error)
      setError(error.message || 'Произошла ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  // Обработчики изменений
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
    }
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Изменения сохранены!
          </h2>
          <p className="text-green-700">
            Перенаправляем на страницу здания...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Редактирование здания
            </h1>
            <p className="text-sm text-gray-600">
              {building.profiles?.full_name && (
                <>Автор: {building.profiles.full_name} • </>
              )}
              Создано: {new Date(building.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Показываем роль только если она есть */}
        {permissions.userRole && (
          <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            Ваша роль: {permissions.userRole === 'moderator' ? 'Модератор' : permissions.userRole === 'admin' ? 'Администратор' : 'Автор'}
          </div>
        )}
      </div>

      {/* Ошибки */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Форма */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-6">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название здания *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Building name"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Architect name"
              />
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Building description, its history and features"
            />
          </div>

          {/* Год и стиль */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Год постройки
              </label>
              <input
                type="number"
                value={formData.year_built}
                onChange={(e) => handleInputChange('year_built', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1850"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Baroque, Modern, Brutalism..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип здания
              </label>
              <input
                type="text"
                value={formData.building_type}
                onChange={(e) => handleInputChange('building_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Residential, Office, Cultural..."
              />
            </div>
          </div>

          {/* Адрес */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Адрес
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Street, house number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Город
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Страна
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Country"
              />
            </div>
          </div>

          {/* Координаты */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Широта
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="52.5200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Долгота
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="13.4050"
              />
            </div>
          </div>

          {/* Изображение */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Главное изображение
            </label>
            <div className="space-y-4">
              {formData.image_url && (
                <div>
                  <img
                    src={formData.image_url}
                    alt="Current image"
                    className="w-48 h-32 object-cover rounded-lg"
                  />
                  <p className="text-sm text-gray-600 mt-1">Текущее изображение</p>
                </div>
              )}

              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imageFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Выбрано: {imageFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сайт
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Free, €5, €10-15..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Отмена
        </button>

        <button
          onClick={handleSave}
          disabled={loading || uploadingImage}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save size={16} />
          <span>
            {loading ? 'Сохранение...' : uploadingImage ? 'Загрузка фото...' : 'Сохранить изменения'}
          </span>
        </button>
      </div>
    </div>
  )
}