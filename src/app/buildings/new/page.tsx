// src/app/buildings/new/page.tsx (обновленная версия с автозаполнением)
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import ImageUploader from '../../../components/ImageUploader'
import LocationPicker from '../../../components/LocationPicker'
import Header from '../../../components/Header'

// ... (интерфейсы и константы остаются теми же)
interface BuildingFormData {
  name: string
  architect: string
  year_built: number | null
  architectural_style: string
  building_type: string
  description: string
  address: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  website_url: string
  entry_fee: string
  conservation_status: string
  accessibility_info: string
  historical_significance: string
  images: string[]
}

const ARCHITECTURAL_STYLES = [
  'Готика', 'Ренессанс', 'Барокко', 'Классицизм', 'Ампир', 'Модерн',
  'Конструктивизм', 'Функционализм', 'Модернизм', 'Брутализм',
  'Постмодернизм', 'Деконструктивизм', 'Хай-тек', 'Минимализм',
  'Эклектика', 'Неоклассицизм', 'Современная архитектура', 'Другое'
]

const BUILDING_TYPES = [
  'Жилой дом', 'Офисное здание', 'Торговый центр', 'Музей', 'Театр',
  'Церковь', 'Мечеть', 'Синагога', 'Школа', 'Университет', 'Больница',
  'Вокзал', 'Аэропорт', 'Мост', 'Башня', 'Завод', 'Склад', 'Памятник', 'Другое'
]

const CONSERVATION_STATUSES = [
  { value: '', label: 'Не указан' },
  { value: 'unesco', label: 'Объект ЮНЕСКО' },
  { value: 'national', label: 'Национальный памятник' },
  { value: 'regional', label: 'Региональный памятник' },
  { value: 'local', label: 'Местный памятник' },
  { value: 'none', label: 'Не охраняется' }
]

export default function AddBuildingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  
  const [formData, setFormData] = useState<BuildingFormData>({
    name: '',
    architect: '',
    year_built: null,
    architectural_style: '',
    building_type: '',
    description: '',
    address: '',
    city: 'Berlin',
    country: 'Germany',
    latitude: null,
    longitude: null,
    website_url: '',
    entry_fee: '',
    conservation_status: '',
    accessibility_info: '',
    historical_significance: '',
    images: []
  })

  // Проверка авторизации
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  // Обновление полей формы
  const updateField = (field: keyof BuildingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Обработка местоположения с карты
  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address || prev.address
    }))
  }

  // НОВОЕ: Обработка автозаполнения адреса, города и страны
  const handleAddressUpdate = (address: string, city: string, country: string) => {
    setFormData(prev => ({
      ...prev,
      address: address,
      city: city || prev.city,
      country: country || prev.country
    }))
  }

  // Остальные функции остаются теми же...
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.latitude !== null && 
               formData.longitude !== null &&
               formData.city.trim() !== '' &&
               formData.country.trim() !== ''
      case 2:
        return formData.name.trim() !== '' && 
               formData.architect.trim() !== '' && 
               formData.architectural_style !== '' &&
               formData.building_type !== ''
      case 3:
        return formData.images.length > 0
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
      setError(null)
    } else {
      if (currentStep === 1) {
        setError('Пожалуйста, выберите местоположение на карте и укажите город/страну')
      } else if (currentStep === 2) {
        setError('Пожалуйста, заполните название, архитектора, стиль и тип здания')
      } else if (currentStep === 3) {
        setError('Пожалуйста, загрузите хотя бы одну фотографию')
      }
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError('Пожалуйста, заполните все обязательные поля')
      return
    }

    if (!user) {
      setError('Необходимо войти в систему')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const buildingData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        architect: formData.architect.trim(),
        year_built: formData.year_built,
        architectural_style: formData.architectural_style,
        address: formData.address.trim() || null,
        city: formData.city.trim(),
        country: formData.country.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        image_url: formData.images[0] || null,
        image_urls: formData.images.length > 1 ? formData.images : null,
        website_url: formData.website_url.trim() || null,
        entry_fee: formData.entry_fee.trim() || null,
        accessibility_info: formData.accessibility_info.trim() || null,
        historical_significance: formData.historical_significance.trim() || null,
        building_type: formData.building_type,
        conservation_status: formData.conservation_status || null,
        created_by: user.id,
        verified: false,
        rating: null,
        review_count: 0,
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('💾 Сохраняем здание:', buildingData)

      const { data, error: dbError } = await supabase
        .from('buildings')
        .insert([buildingData])
        .select()
        .single()

      if (dbError) {
        console.error('❌ Ошибка сохранения:', dbError)
        setError(`Ошибка сохранения: ${dbError.message}`)
        return
      }

      console.log('✅ Здание создано:', data)
      router.push(`/buildings/${data.id}`)

    } catch (error) {
      console.error('💥 Неожиданная ошибка:', error)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка авторизации...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок и прогресс */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Добавить архитектурный объект
          </h1>
          
          {/* Индикатор прогресса */}
          <div className="flex items-center space-x-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 ml-4 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Названия шагов */}
          <div className="text-sm text-gray-600">
            {currentStep === 1 && "Шаг 1: Местоположение и адрес"}
            {currentStep === 2 && "Шаг 2: Основная информация"}
            {currentStep === 3 && "Шаг 3: Фотографии и дополнительно"}
          </div>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          {/* Ошибки */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {/* Шаг 1: Местоположение */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Где находится здание?
              </h2>

              {/* Город и страна - теперь автозаполняются */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Город *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Berlin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Автоматически заполняется при выборе на карте</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Страна *
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="Germany"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Автоматически заполняется при выборе на карте</p>
                </div>
              </div>

              {/* Адрес */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Panoramastraße 1A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Автоматически заполняется при поиске или выборе на карте</p>
              </div>

              {/* Карта для выбора местоположения - с новыми возможностями */}
              <div>
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  onAddressUpdate={handleAddressUpdate} // Новый колбэк для автозаполнения
                  initialLocation={
                    formData.latitude && formData.longitude 
                      ? { lat: formData.latitude, lng: formData.longitude }
                      : undefined
                  }
                />
              </div>

              {/* Координаты */}
              {formData.latitude && formData.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ Местоположение выбрано: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {formData.city && formData.country && `📍 ${formData.city}, ${formData.country}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Шаг 2: Основная информация */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Основная информация о здании
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Название */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название здания *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Например: Берлинская телебашня"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Архитектор */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Архитектор *
                  </label>
                  <input
                    type="text"
                    value={formData.architect}
                    onChange={(e) => updateField('architect', e.target.value)}
                    placeholder="Имя архитектора или бюро"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Год постройки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Год постройки
                  </label>
                  <input
                    type="number"
                    value={formData.year_built || ''}
                    onChange={(e) => updateField('year_built', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="1969"
                    min="1000"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Архитектурный стиль */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Архитектурный стиль *
                  </label>
                  <select
                    value={formData.architectural_style}
                    onChange={(e) => updateField('architectural_style', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите стиль</option>
                    {ARCHITECTURAL_STYLES.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>

                {/* Тип здания */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип здания *
                  </label>
                  <select
                    value={formData.building_type}
                    onChange={(e) => updateField('building_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите тип</option>
                    {BUILDING_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Расскажите об истории здания, интересных особенностях архитектуры..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Шаг 3: Фотографии и дополнительно */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Фотографии здания
                </h2>
                
                <p className="text-gray-600 mb-4">
                  Загрузите качественные фотографии здания. Первое изображение будет использоваться как главное.
                </p>

                <ImageUploader
                  maxFiles={5}
                  folder="buildings"
                  onImagesChange={(urls) => updateField('images', urls)}
                  existingImages={formData.images}
                />

                {formData.images.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    * Необходимо загрузить хотя бы одну фотографию
                  </p>
                )}
              </div>

              {/* Дополнительная информация */}
              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Дополнительная информация (опционально)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Веб-сайт */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Веб-сайт
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => updateField('website_url', e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Входная плата */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Входная плата
                    </label>
                    <input
                      type="text"
                      value={formData.entry_fee}
                      onChange={(e) => updateField('entry_fee', e.target.value)}
                      placeholder="Бесплатно / €10 / €5 льготный"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Статус охраны */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Статус охраны
                    </label>
                    <select
                      value={formData.conservation_status}
                      onChange={(e) => updateField('conservation_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {CONSERVATION_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Доступность */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Доступность
                  </label>
                  <textarea
                    value={formData.accessibility_info}
                    onChange={(e) => updateField('accessibility_info', e.target.value)}
                    placeholder="Информация о доступности для людей с ограниченными возможностями"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Историческое значение */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Историческое значение
                  </label>
                  <textarea
                    value={formData.historical_significance}
                    onChange={(e) => updateField('historical_significance', e.target.value)}
                    placeholder="Расскажите об исторической важности здания, известных событиях..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Кнопки навигации */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              ← Назад
            </button>

            <div className="text-sm text-gray-500">
              Шаг {currentStep} из 3
            </div>

            <div className="flex space-x-4">
              {currentStep < 3 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Далее →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Сохранение...
                    </>
                  ) : (
                    'Создать здание'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}