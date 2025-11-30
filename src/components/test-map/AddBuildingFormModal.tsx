'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Building as BuildingIcon, User, Calendar, Palette, Loader2, Globe, Camera } from 'lucide-react'
import { reverseGeocode, type GeocodingResult } from '@/utils/geocoding'
import toast from 'react-hot-toast'

interface AddBuildingFormModalProps {
  isOpen: boolean
  location: { lat: number; lng: number } | null
  onClose: () => void
  onSave: (buildingData: BuildingFormData) => Promise<void>
}

export interface BuildingFormData {
  name: string
  latitude: number
  longitude: number
  city: string
  country: string
  address?: string
  architect?: string
  year_built?: number
  architectural_style?: string
  building_type?: string
  // Данные обзора (уровень 2)
  review?: {
    title: string
    content: string
    tags: string[]
    opening_hours?: string
    entry_fee?: string
  }
  // Медиа файлы
  photoFiles?: File[]
  audioFile?: File | null
}

// Список архитектурных стилей
const ARCHITECTURAL_STYLES = [
  'Классицизм',
  'Модернизм',
  'Постмодернизм',
  'Барокко',
  'Готика',
  'Ренессанс',
  'Неоренессанс',
  'Конструктивизм',
  'Ар-деко',
  'Брутализм',
  'Минимализм',
  'Хай-тек',
  'Современная архитектура',
  'Другой'
]

// Список типов зданий
const BUILDING_TYPES = [
  'Памятник архитектуры',
  'Жилой дом',
  'Общественное здание',
  'Религиозное сооружение',
  'Музей',
  'Театр',
  'Вокзал',
  'Мост',
  'Парк',
  'Другое'
]

export default function AddBuildingFormModal({ 
  isOpen, 
  location, 
  onClose, 
  onSave 
}: AddBuildingFormModalProps) {
  const [formData, setFormData] = useState<BuildingFormData>({
    name: '',
    latitude: 0,
    longitude: 0,
    city: '',
    country: '',
    address: '',
    architect: '',
    year_built: undefined,
    architectural_style: '',
    building_type: ''
  })

  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isExpanded, setIsExpanded] = useState(false) // Состояние расширения формы
  
  // Данные обзора
  const [reviewData, setReviewData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    opening_hours: '',
    entry_fee: ''
  })
  
  const [currentTag, setCurrentTag] = useState('') // Для ввода нового тега
  
  // Фотографии
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  
  // Аудио
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)

  // Геокодирование при получении локации
  useEffect(() => {
    if (location && isOpen) {
      console.log('🏛️ [FORM] Location received:', location)
      
      // Устанавливаем координаты
      setFormData(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng
      }))

      // Запускаем геокодирование
      performGeocoding(location.lat, location.lng)
    }
  }, [location, isOpen])

  const performGeocoding = async (lat: number, lng: number) => {
    setGeocoding(true)
    
    try {
      const result = await reverseGeocode(lat, lng)
      
      if (result) {
        console.log('🏛️ [FORM] Geocoding successful:', result)
        setFormData(prev => ({
          ...prev,
          address: result.formattedAddress,
          city: result.city,
          country: result.country
        }))
      } else {
        console.warn('🏛️ [FORM] Geocoding failed, using defaults')
        toast.error('Не удалось определить адрес. Заполните вручную.')
      }
    } catch (error) {
      console.error('🏛️ [FORM] Geocoding error:', error)
    } finally {
      setGeocoding(false)
    }
  }

  const handleInputChange = (field: keyof BuildingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Очищаем ошибку при вводе
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = 'Введите название (минимум 3 символа)'
    }

    if (!formData.city || formData.city.trim().length < 2) {
      newErrors.city = 'Введите город'
    }

    if (!formData.country || formData.country.trim().length < 2) {
      newErrors.country = 'Введите страну'
    }

    if (formData.year_built && (formData.year_built < 1000 || formData.year_built > 2025)) {
      newErrors.year_built = 'Год должен быть между 1000 и 2025'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Пожалуйста, исправьте ошибки в форме')
      return
    }

    setSaving(true)
    
    try {
      // Добавляем данные обзора если форма расширена и заполнены поля
      const dataToSave: BuildingFormData = {
        ...formData
      }
      
      if (isExpanded && (reviewData.rating > 0 || reviewData.content.trim())) {
        dataToSave.review = {
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content,
          tags: reviewData.tags,
          opening_hours: reviewData.opening_hours,
          entry_fee: reviewData.entry_fee
        }
      }
      
      // Добавляем медиа файлы если есть
      if (photoFiles.length > 0) {
        dataToSave.photoFiles = photoFiles
      }
      
      if (audioFile) {
        dataToSave.audioFile = audioFile
      }
      
      await onSave(dataToSave)
      toast.success(isExpanded && dataToSave.review ? 'Объект и обзор успешно добавлены!' : 'Объект успешно добавлен!')
      handleClose()
    } catch (error: any) {
      console.error('🏛️ [FORM] Save error:', error)
      toast.error(error.message || 'Ошибка при сохранении объекта')
    } finally {
      setSaving(false)
    }
  }
  
  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }
  
  const handleAddTag = () => {
    if (currentTag.trim() && !reviewData.tags.includes(currentTag.trim())) {
      setReviewData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }
  
  const handleRemoveTag = (tagToRemove: string) => {
    setReviewData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }
  
  // Обработчики для фотографий
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (photoFiles.length + files.length > 5) {
      toast.error('Максимум 5 фотографий')
      return
    }
    
    // Проверка размера (макс 5MB на файл)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Файл ${file.name} слишком большой (макс 5MB)`)
        return false
      }
      return true
    })
    
    setPhotoFiles(prev => [...prev, ...validFiles])
    
    // Создаем превью
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }
  
  const handleRemovePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }
  
  // Обработчики для аудио
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Аудио файл слишком большой (макс 10MB)')
      return
    }
    
    setAudioFile(file)
    
    // Создаем URL для превью
    const url = URL.createObjectURL(file)
    setAudioPreview(url)
  }
  
  const handleRemoveAudio = () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview)
    }
    setAudioFile(null)
    setAudioPreview(null)
  }

  const handleClose = () => {
    // Очищаем URL превью
    photoPreviews.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview)
    }
    
    setFormData({
      name: '',
      latitude: 0,
      longitude: 0,
      city: '',
      country: '',
      address: '',
      architect: '',
      year_built: undefined,
      architectural_style: '',
      building_type: ''
    })
    setReviewData({
      rating: 0,
      title: '',
      content: '',
      tags: [],
      opening_hours: '',
      entry_fee: ''
    })
    setPhotoFiles([])
    setPhotoPreviews([])
    setAudioFile(null)
    setAudioPreview(null)
    setErrors({})
    setIsExpanded(false)
    setCurrentTag('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Фон */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* Модальное окно */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Добавить объект</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Контент формы */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            
            {/* Местоположение */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                Местоположение
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 font-mono">
                      📍 {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </div>
                    {geocoding ? (
                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Определение адреса...
                      </div>
                    ) : formData.address ? (
                      <div className="text-xs text-gray-500 mt-1">
                        📧 {formData.address}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-gray-400">🔒</div>
                </div>
              </div>
            </div>

            {/* Название здания */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <BuildingIcon className="w-4 h-4 mr-2 text-green-600" />
                Название здания *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Например: Рейхстаг"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Город и Страна */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 mr-2 text-blue-600" />
                  Город *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Берлин"
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  🏳️ Страна *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Германия"
                />
                {errors.country && (
                  <p className="text-red-500 text-xs mt-1">{errors.country}</p>
                )}
              </div>
            </div>

            {/* Архитектор */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2 text-purple-600" />
                Архитектор (опционально)
              </label>
              <input
                type="text"
                value={formData.architect || ''}
                onChange={(e) => handleInputChange('architect', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Например: Норман Фостер"
              />
            </div>

            {/* Год и Стиль */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                  Год постройки
                </label>
                <input
                  type="number"
                  value={formData.year_built || ''}
                  onChange={(e) => handleInputChange('year_built', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.year_built ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1894"
                  min="1000"
                  max="2025"
                />
                {errors.year_built && (
                  <p className="text-red-500 text-xs mt-1">{errors.year_built}</p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 mr-2 text-pink-600" />
                  Стиль
                </label>
                <select
                  value={formData.architectural_style || ''}
                  onChange={(e) => handleInputChange('architectural_style', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Выбрать стиль</option>
                  {ARCHITECTURAL_STYLES.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Тип здания */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <BuildingIcon className="w-4 h-4 mr-2 text-indigo-600" />
                Тип здания
              </label>
              <select
                value={formData.building_type || ''}
                onChange={(e) => handleInputChange('building_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Выбрать тип</option>
                {BUILDING_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Информационный блок */}
            {!isExpanded && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div className="flex items-start space-x-2">
                  <div className="text-green-600 text-xl flex-shrink-0">ℹ️</div>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Минимальная информация для добавления объекта</p>
                    <p className="text-gray-600">
                      Хотите добавить детальное описание? Нажмите "Добавить детали" внизу.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* РАСШИРЕННАЯ ЧАСТЬ ФОРМЫ - Уровень 2 */}
            {isExpanded && (
              <div className="space-y-5 mt-6 pt-6 border-t-2 border-dashed border-gray-300 animate-slideDown">
                
                {/* Заголовок расширенной секции */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="text-2xl mr-2">📝</span>
                    ВАШЕ ОПИСАНИЕ ОБЪЕКТА (обзор)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Поделитесь своими впечатлениями и знаниями об этом месте
                  </p>
                </div>

                {/* Заголовок обзора */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    📄 Заголовок обзора
                  </label>
                  <input
                    type="text"
                    value={reviewData.title}
                    onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Краткое впечатление о месте"
                    maxLength={100}
                  />
                </div>

                {/* Описание обзора */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    📝 Описание (минимум 50 символов для качественного обзора)
                  </label>
                  <textarea
                    value={reviewData.content}
                    onChange={(e) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                    placeholder="Расскажите подробнее о здании, его истории, архитектурных особенностях..."
                    maxLength={2000}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {reviewData.content.length} / 2000 символов
                  </div>
                </div>

                {/* Загрузка фотографий */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    📷 Фотографии (до 5 шт, макс 5MB каждое)
                  </label>
                  <div className="space-y-3">
                    {/* Кнопка загрузки */}
                    {photoFiles.length < 5 && (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📤</div>
                            <p className="text-sm text-gray-600">
                              Нажмите для загрузки фото
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {5 - photoFiles.length} из 5 доступно
                            </p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                    
                    {/* Превью загруженных фото */}
                    {photoPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {photoPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Фото ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Аудио комментарий */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    🎤 Аудио-гид (опционально, макс 10MB)
                  </label>
                  {!audioFile ? (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 transition-colors">
                        <div className="flex items-center justify-center space-x-3">
                          <div className="text-2xl">🎙️</div>
                          <div className="text-sm text-gray-600">
                            Загрузить аудио файл (mp3, wav, m4a)
                          </div>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-4 bg-purple-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="text-2xl">🎵</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {audioFile.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveAudio}
                          className="ml-3 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {audioPreview && (
                        <audio
                          src={audioPreview}
                          controls
                          className="w-full mt-3"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Практическая информация */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      🕐 Часы работы
                    </label>
                    <input
                      type="text"
                      value={reviewData.opening_hours}
                      onChange={(e) => setReviewData(prev => ({ ...prev, opening_hours: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Пн-Вс 9:00-18:00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      💰 Стоимость входа
                    </label>
                    <input
                      type="text"
                      value={reviewData.entry_fee}
                      onChange={(e) => setReviewData(prev => ({ ...prev, entry_fee: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Бесплатно / 500₽"
                    />
                  </div>
                </div>

                {/* Теги */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    🏷️ Теги (помогают в поиске)
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Например: музей, модернизм"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      + Добавить
                    </button>
                  </div>
                  {reviewData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {reviewData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Информационный блок для обзора */}
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                  <div className="flex items-start space-x-2">
                    <div className="text-purple-600 text-xl flex-shrink-0">💡</div>
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Ваш обзор поможет другим!</p>
                      <p className="text-gray-600">
                        Качественные обзоры с высоким рейтингом будут использоваться в маршрутах и показываться чаще.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Футер с кнопками */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Отмена
          </button>
          
          <div className="flex items-center space-x-3">
            {/* Кнопка "Добавить детали" - переключатель расширения */}
            {!isExpanded ? (
              <button
                type="button"
                onClick={handleToggleExpanded}
                disabled={saving}
                className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <span>📝</span>
                <span>Добавить детали</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleExpanded}
                disabled={saving}
                className="px-4 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <span>←</span>
                <span>Скрыть детали</span>
              </button>
            )}
            
            {/* Кнопка сохранения */}
            <button
              onClick={handleSave}
              disabled={saving || geocoding}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{isExpanded ? 'Сохранить всё' : 'Создать'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

