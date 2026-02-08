'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Building as BuildingIcon, User, Calendar, Palette, Loader2, Globe, Camera, AlertTriangle } from 'lucide-react'
import { reverseGeocode, type GeocodingResult } from '@/utils/geocoding'
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck'
import { useRouter } from 'next/navigation'
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
    rating?: number
    opening_hours?: string
    entry_fee?: string
    website?: string
    visit_difficulty?: string
    best_visit_time?: string
    transport_accessibility?: string
    language?: string
  }
  // Медиа файлы
  photoFiles?: File[]
  audioFile?: File | null
  // Photo attribution
  isOwnPhoto?: boolean
  photoSource?: string
}

// Список архитектурных стилей
const ARCHITECTURAL_STYLES = [
  'Classicism',
  'Modernism',
  'Postmodernism',
  'Baroque',
  'Gothic',
  'Renaissance',
  'Neo-Renaissance',
  'Constructivism',
  'Art Deco',
  'Brutalism',
  'Minimalism',
  'High-tech',
  'Contemporary Architecture',
  'Other'
]

// List of object types
const OBJECT_TYPES = [
  'Architectural Monument',
  'Residential Building',
  'Public Building',
  'Religious Structure',
  'Museum',
  'Theater',
  'Railway Station',
  'Bridge',
  'Park',
  'Sculpture / Monument',
  'Historic Personality',
  'Memorial Place',
  'Cafe',
  'Bar',
  'Other'
]

// Review languages
const REVIEW_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' }
] as const

type ReviewLanguage = typeof REVIEW_LANGUAGES[number]['code']

export default function AddBuildingFormModal({
  isOpen,
  location,
  onClose,
  onSave
}: AddBuildingFormModalProps) {
  const router = useRouter()
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
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [userConfirmedDuplicate, setUserConfirmedDuplicate] = useState(false)

  // Проверка дубликатов
  const {
    hasDuplicates,
    hasHighConfidenceDuplicates,
    quickResults,
    fullCheckResult,
    checking
  } = useDuplicateCheck({
    name: formData.name,
    city: formData.city,
    latitude: formData.latitude,
    longitude: formData.longitude,
    debounceMs: 800
  })

  // Данные обзора
  const [reviewData, setReviewData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    rating: 0,
    opening_hours: '',
    entry_fee: '',
    website: '',
    visit_difficulty: '',
    best_visit_time: '',
    transport_accessibility: '',
    language: 'en' as ReviewLanguage
  })

  const [currentTag, setCurrentTag] = useState('') // Для ввода нового тега

  // Фотографии
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  // Photo attribution
  const [isOwnPhoto, setIsOwnPhoto] = useState(true)
  const [photoSource, setPhotoSource] = useState('')

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
        toast.error('Could not determine address. Please fill manually.')
      }
    } catch (error) {
      console.error('🏛️ [FORM] Geocoding error:', error)
    } finally {
      setGeocoding(false)
    }
  }

  // Показываем предупреждение о дубликатах
  useEffect(() => {
    if (hasDuplicates && !userConfirmedDuplicate) {
      setShowDuplicateWarning(true)
    } else {
      setShowDuplicateWarning(false)
    }
  }, [hasDuplicates, userConfirmedDuplicate])

  const handleInputChange = (field: keyof BuildingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Сбрасываем подтверждение дубликата при изменении названия
    if (field === 'name') {
      setUserConfirmedDuplicate(false)
    }

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
      newErrors.name = 'Enter name (minimum 3 characters)'
    }

    if (!formData.city || formData.city.trim().length < 2) {
      newErrors.city = 'Enter city'
    }

    if (!formData.country || formData.country.trim().length < 2) {
      newErrors.country = 'Enter country'
    }

    if (formData.year_built && (formData.year_built < 1000 || formData.year_built > 2025)) {
      newErrors.year_built = 'Year must be between 1000 and 2025'
    }

    // Photo attribution validation
    if (photoFiles.length > 0 && !isOwnPhoto && !photoSource.trim()) {
      newErrors.photoSource = 'Please provide photo source/credit'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix errors in the form')
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
          entry_fee: reviewData.entry_fee,
          website: reviewData.website,
          visit_difficulty: reviewData.visit_difficulty,
          best_visit_time: reviewData.best_visit_time,
          transport_accessibility: reviewData.transport_accessibility,
          language: reviewData.language
        }
      }

      // Добавляем медиа файлы если есть
      if (photoFiles.length > 0) {
        dataToSave.photoFiles = photoFiles
        dataToSave.isOwnPhoto = isOwnPhoto
        if (!isOwnPhoto && photoSource.trim()) {
          dataToSave.photoSource = photoSource.trim()
        }
      }

      if (audioFile) {
        dataToSave.audioFile = audioFile
      }

      await onSave(dataToSave)
      toast.success(isExpanded && dataToSave.review ? 'Building and review successfully added!' : 'Building successfully added!')
      handleClose()
    } catch (error: any) {
      console.error('🏛️ [FORM] Save error:', error)
      toast.error(error.message || 'Error saving building')
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
      toast.error('Maximum 5 photos')
      return
    }

    // Проверка размера (макс 5MB на файл)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 5MB)`)
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
      toast.error('Audio file is too large (max 10MB)')
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
      entry_fee: '',
      website: '',
      visit_difficulty: '',
      best_visit_time: '',
      transport_accessibility: '',
      language: 'en'
    })
    setPhotoFiles([])
    setPhotoPreviews([])
    setIsOwnPhoto(true)
    setPhotoSource('')
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
            <h2 className="text-xl font-semibold text-gray-900">Add Building</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
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
                Location
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
                        Determining address...
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
                Building Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g. Reichstag"
                />
                {checking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Предупреждение о дубликатах */}
            {showDuplicateWarning && (quickResults.length > 0 || fullCheckResult?.duplicates.length) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg animate-slideDown">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      {hasHighConfidenceDuplicates
                        ? '⚠️ This building may already be added!'
                        : '📋 Similar buildings found'}
                    </h3>
                    <p className="text-sm text-yellow-800 mb-3">
                      {hasHighConfidenceDuplicates
                        ? 'We found buildings with very similar characteristics. Please check before adding.'
                        : 'Found buildings with similar names in this city.'}
                    </p>

                    {/* Список дубликатов */}
                    <div className="space-y-2 mb-3">
                      {(fullCheckResult?.duplicates || quickResults).slice(0, 3).map((duplicate, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-yellow-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{duplicate.name}</p>
                              <p className="text-xs text-gray-600 mt-1">{duplicate.address || 'Address not specified'}</p>
                              {duplicate.distance_meters && (
                                <p className="text-xs text-gray-500 mt-1">
                                  📍 {Math.round(duplicate.distance_meters)}m from selected point
                                </p>
                              )}
                              {duplicate.confidence && (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${duplicate.confidence === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : duplicate.confidence === 'medium'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  Match: {
                                    duplicate.confidence === 'high' ? 'High' :
                                      duplicate.confidence === 'medium' ? 'Medium' : 'Low'
                                  }
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/buildings/${duplicate.id}`)
                                onClose()
                              }}
                              className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                            >
                              Open →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Подтверждение */}
                    {!userConfirmedDuplicate ? (
                      <div className="flex items-center justify-between pt-2 border-t border-yellow-300">
                        <p className="text-sm text-yellow-800">
                          {hasHighConfidenceDuplicates
                            ? 'Make sure this is a different building'
                            : 'Check the list above'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setUserConfirmedDuplicate(true)}
                          className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700 transition-colors"
                        >
                          This is a different building, continue
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-2 border-t border-yellow-300">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Confirmed: this is a new building
                        </p>
                        <button
                          type="button"
                          onClick={() => setUserConfirmedDuplicate(false)}
                          className="text-sm text-yellow-700 hover:text-yellow-900 underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Город и Страна */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 mr-2 text-blue-600" />
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Berlin"
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  🏳️ Country *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Germany"
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
                Architect (optional)
              </label>
              <input
                type="text"
                value={formData.architect || ''}
                onChange={(e) => handleInputChange('architect', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g. Norman Foster"
              />
            </div>

            {/* Год и Стиль */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                  Year Built
                </label>
                <input
                  type="number"
                  value={formData.year_built || ''}
                  onChange={(e) => handleInputChange('year_built', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.year_built ? 'border-red-500' : 'border-gray-300'
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
                  Style
                </label>
                <select
                  value={formData.architectural_style || ''}
                  onChange={(e) => handleInputChange('architectural_style', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select style</option>
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
                Object Type
              </label>
              <select
                value={formData.building_type || ''}
                onChange={(e) => handleInputChange('building_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select type</option>
                {OBJECT_TYPES.map(type => (
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
                    <p className="font-medium mb-1">Minimum information to add building</p>
                    <p className="text-gray-600">
                      Want to add a detailed description? Click "Add Details" below.
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
                    YOUR DESCRIPTION OF THE BUILDING (review)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Share your impressions and knowledge about this place
                  </p>
                </div>

                {/* Review Language Selector */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    🌐 Review Language
                  </label>
                  <select
                    value={reviewData.language}
                    onChange={(e) => setReviewData(prev => ({ ...prev, language: e.target.value as ReviewLanguage }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg"
                  >
                    {REVIEW_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-600 mt-2">
                    Title, description and audio will be saved for the selected language
                  </p>
                </div>

                {/* Заголовок обзора */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    📄 Review Title ({REVIEW_LANGUAGES.find(l => l.code === reviewData.language)?.name || 'English'})
                  </label>
                  <input
                    type="text"
                    value={reviewData.title}
                    onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief impression of the place"
                    maxLength={100}
                  />
                </div>

                {/* Описание обзора */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    📝 Description ({REVIEW_LANGUAGES.find(l => l.code === reviewData.language)?.name || 'English'})
                  </label>
                  <textarea
                    value={reviewData.content}
                    onChange={(e) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                    placeholder="Tell more about the building, its history, architectural features..."
                    maxLength={4000}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {reviewData.content.length} / 4000 characters
                  </div>
                </div>

                {/* Загрузка фотографий */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    📷 Photos (up to 5, max 5MB each)
                  </label>
                  <div className="space-y-3">
                    {/* Кнопка загрузки */}
                    {photoFiles.length < 5 && (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📤</div>
                            <p className="text-sm text-gray-600">
                              Click to upload photos
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {5 - photoFiles.length} of 5 available
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
                              alt={`Photo ${index + 1}`}
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

                    {/* Photo Attribution */}
                    {photoFiles.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isOwnPhoto}
                            onChange={(e) => setIsOwnPhoto(e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">
                            📸 This is my own photo
                          </span>
                        </label>

                        {!isOwnPhoto && (
                          <div className="animate-slideDown">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              🔗 Photo Source / Credit *
                            </label>
                            <input
                              type="text"
                              value={photoSource}
                              onChange={(e) => setPhotoSource(e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.photoSource ? 'border-red-500' : 'border-gray-300'
                                }`}
                              placeholder="e.g. Wikipedia, ArchDaily, photographer name..."
                            />
                            {errors.photoSource ? (
                              <p className="text-red-500 text-xs mt-1">{errors.photoSource}</p>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">
                                Please provide the source or photographer credit
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Аудио комментарий */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    🎤 Audio Guide (optional, max 10MB)
                  </label>
                  {!audioFile ? (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 transition-colors">
                        <div className="flex items-center justify-center space-x-3">
                          <div className="text-2xl">🎙️</div>
                          <div className="text-sm text-gray-600">
                            Upload audio file (mp3, wav, m4a)
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
                      🕐 Opening Hours
                    </label>
                    <input
                      type="text"
                      value={reviewData.opening_hours}
                      onChange={(e) => setReviewData(prev => ({ ...prev, opening_hours: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mon-Sun 9:00-18:00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      💰 Entry Fee
                    </label>
                    <input
                      type="text"
                      value={reviewData.entry_fee}
                      onChange={(e) => setReviewData(prev => ({ ...prev, entry_fee: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Free / $10"
                    />
                  </div>
                </div>

                {/* Additional Practical Information */}
                <div className="space-y-4">
                  {/* Website */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      🌐 Website
                    </label>
                    <input
                      type="url"
                      value={reviewData.website}
                      onChange={(e) => setReviewData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Visit Difficulty */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        🎯 Visit Difficulty
                      </label>
                      <select
                        value={reviewData.visit_difficulty}
                        onChange={(e) => setReviewData(prev => ({ ...prev, visit_difficulty: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="easy">Easy - Open to public</option>
                        <option value="moderate">Moderate - Requires booking</option>
                        <option value="difficult">Difficult - Limited access</option>
                        <option value="exterior_only">Exterior only</option>
                      </select>
                    </div>

                    {/* Best Visit Time */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        ⏰ Best Visit Time
                      </label>
                      <input
                        type="text"
                        value={reviewData.best_visit_time}
                        onChange={(e) => setReviewData(prev => ({ ...prev, best_visit_time: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Morning, golden hour..."
                      />
                    </div>
                  </div>

                  {/* Transport & Accessibility */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      🚇 Transport & Accessibility
                    </label>
                    <textarea
                      value={reviewData.transport_accessibility}
                      onChange={(e) => setReviewData(prev => ({ ...prev, transport_accessibility: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Metro station nearby, parking available, wheelchair accessible..."
                    />
                  </div>
                </div>

                {/* Теги */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    🏷️ Tags (help with search)
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
                      placeholder="e.g. museum, modernism"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      + Add
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
                      <p className="font-medium mb-1">Your review will help others!</p>
                      <p className="text-gray-600">
                        Quality reviews with high ratings will be used in routes and shown more often.
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
            Cancel
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
                <span>Add Details</span>
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
                <span>Hide Details</span>
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{isExpanded ? 'Save All' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div >
  )
}

