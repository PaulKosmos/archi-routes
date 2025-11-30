'use client'

import { useState, useMemo } from 'react'
import { X, Building2, MapPin, User, Calendar, Palette, Camera, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface BuildingCreatorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (building: any) => void
}

export default function BuildingCreator({ 
  isOpen, 
  onClose, 
  onSuccess 
}: BuildingCreatorProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: 'Germany',
    architect: '',
    year_built: '',
    architectural_style: '',
    description: '',
    image_url: '',
    address: '',
    latitude: '',
    longitude: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название здания обязательно'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Город обязателен'
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Страна обязательна'
    }

    if (formData.year_built && (isNaN(Number(formData.year_built)) || Number(formData.year_built) < 1 || Number(formData.year_built) > new Date().getFullYear())) {
      newErrors.year_built = 'Введите корректный год постройки'
    }

    if (formData.latitude && (isNaN(Number(formData.latitude)) || Number(formData.latitude) < -90 || Number(formData.latitude) > 90)) {
      newErrors.latitude = 'Введите корректную широту (-90 до 90)'
    }

    if (formData.longitude && (isNaN(Number(formData.longitude)) || Number(formData.longitude) < -180 || Number(formData.longitude) > 180)) {
      newErrors.longitude = 'Введите корректную долготу (-180 до 180)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!user) {
      alert('Необходимо войти в систему для создания зданий')
      return
    }

    setLoading(true)
    
    try {
      const buildingData = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        architect: formData.architect.trim() || null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        architectural_style: formData.architectural_style.trim() || null,
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        address: formData.address.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        created_by: user.id,
        is_verified: false,
        rating: 0,
      }

      const { data, error } = await supabase
        .from('buildings')
        .insert([buildingData])
        .select()
        .single()

      if (error) throw error

      console.log('✅ Building created successfully:', data)
      
      // Уведомляем родительский компонент об успехе
      onSuccess(data)
      
      // Сбрасываем форму
      setFormData({
        name: '',
        city: '',
        country: 'Germany',
        architect: '',
        year_built: '',
        architectural_style: '',
        description: '',
        image_url: '',
        address: '',
        latitude: '',
        longitude: ''
      })
      
      // Закрываем модальное окно
      onClose()
      
    } catch (error) {
      console.error('❌ Error creating building:', error)
      alert('Ошибка при создании здания. Попробуйте еще раз.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем размер файла (макс 5МБ)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5МБ')
      return
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Можно загружать только изображения')
      return
    }

    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `building-${Date.now()}.${fileExt}`
      const filePath = `buildings/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      handleChange('image_url', publicUrl)
      console.log('✅ Image uploaded successfully:', publicUrl)
    } catch (error) {
      console.error('❌ Error uploading image:', error)
      alert('Ошибка при загрузке изображения')
    } finally {
      setLoading(false)
    }
  }



  const handleClose = () => {
    if (!loading) {
      onClose()
      setErrors({})
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Создать новое здание
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Название здания *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Например: Рейхстаг"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Город *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Например: Берлин"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Страна *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="Germany">Германия</option>
                  <option value="Russia">Россия</option>
                  <option value="France">Франция</option>
                  <option value="Italy">Италия</option>
                  <option value="Spain">Испания</option>
                  <option value="United Kingdom">Великобритания</option>
                  <option value="Austria">Австрия</option>
                  <option value="Netherlands">Нидерланды</option>
                  <option value="Czech Republic">Чехия</option>
                  <option value="Other">Другая</option>
                </select>
                {errors.country && <p className="text-sm text-red-600 mt-1">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Архитектор
                </label>
                <input
                  type="text"
                  value={formData.architect}
                  onChange={(e) => handleChange('architect', e.target.value)}
                  placeholder="Например: Норман Фостер"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Год постройки
                </label>
                <input
                  type="number"
                  value={formData.year_built}
                  onChange={(e) => handleChange('year_built', e.target.value)}
                  placeholder="1894"
                  min="1"
                  max={new Date().getFullYear()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.year_built ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.year_built && <p className="text-sm text-red-600 mt-1">{errors.year_built}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Архитектурный стиль
                </label>
                <input
                  type="text"
                  value={formData.architectural_style}
                  onChange={(e) => handleChange('architectural_style', e.target.value)}
                  placeholder="Например: Модернизм"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Краткое описание здания, его истории и особенностей..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Изображение здания
              </label>
              
              {formData.image_url ? (
                <div className="relative">
                  <img
                    src={formData.image_url}
                    alt="Превью здания"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('image_url', '')}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="text-center text-gray-500">
                    <span className="text-sm">или</span>
                  </div>
                  <label className="block w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center justify-center h-full">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Загрузить с компьютера</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Адрес
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Полный адрес здания"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Широта
                </label>
                <input
                  type="number"
                  value={formData.latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  placeholder="52.5170"
                  step="any"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.latitude ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.latitude && <p className="text-sm text-red-600 mt-1">{errors.latitude}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Долгота
                </label>
                <input
                  type="number"
                  value={formData.longitude}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  placeholder="13.3888"
                  step="any"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.longitude ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.longitude && <p className="text-sm text-red-600 mt-1">{errors.longitude}</p>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              * Обязательные поля
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Создание...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Создать здание
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}