'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Building as BuildingIcon, User, Calendar, Palette, Loader2, Globe, Camera, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
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
  // Building practical info (now at building level)
  opening_hours?: string
  entry_fee?: string
  website?: string
  visit_difficulty?: string
  best_visit_time?: string
  accessibility_info?: string
  // Review data
  review?: {
    title: string
    content: string
    tags: string[]
    rating?: number
    language?: string
  }
  // Building photo
  buildingPhotoFile?: File | null
  isOwnPhoto?: boolean
  photoSource?: string
  // Review media
  reviewPhotoFiles?: File[]
  audioFile?: File | null
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
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'uz', name: 'Oʻzbek', flag: '🇺🇿' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
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
  const [showPracticalInfo, setShowPracticalInfo] = useState(false) // Collapsible practical info
  const [showReview, setShowReview] = useState(false) // Expandable review section
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

  // Practical info (building level)
  const [practicalInfo, setPracticalInfo] = useState({
    opening_hours: '',
    entry_fee: '',
    website: '',
    visit_difficulty: '',
    best_visit_time: '',
    accessibility_info: '',
  })

  // Данные обзора
  const [reviewData, setReviewData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    rating: 0,
    language: 'en' as ReviewLanguage
  })

  const [currentTag, setCurrentTag] = useState('')

  // Building photo (single main photo)
  const [buildingPhotoFile, setBuildingPhotoFile] = useState<File | null>(null)
  const [buildingPhotoPreview, setBuildingPhotoPreview] = useState<string | null>(null)

  // Photo attribution
  const [isOwnPhoto, setIsOwnPhoto] = useState(true)
  const [photoSource, setPhotoSource] = useState('')

  // Review photos (up to 5)
  const [reviewPhotoFiles, setReviewPhotoFiles] = useState<File[]>([])
  const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState<string[]>([])

  // Аудио
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)

  // Геокодирование при получении локации
  useEffect(() => {
    if (location && isOpen) {
      console.log('🏛️ [FORM] Location received:', location)

      setFormData(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng
      }))

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

    if (field === 'name') {
      setUserConfirmedDuplicate(false)
    }

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
    if (buildingPhotoFile && !isOwnPhoto && !photoSource.trim()) {
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
      const dataToSave: BuildingFormData = {
        ...formData,
        // Include practical info at building level
        opening_hours: practicalInfo.opening_hours || undefined,
        entry_fee: practicalInfo.entry_fee || undefined,
        website: practicalInfo.website || undefined,
        visit_difficulty: practicalInfo.visit_difficulty || undefined,
        best_visit_time: practicalInfo.best_visit_time || undefined,
        accessibility_info: practicalInfo.accessibility_info || undefined,
      }

      // Add review data if review section is expanded and has content
      if (showReview && (reviewData.rating > 0 || reviewData.content.trim())) {
        dataToSave.review = {
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content,
          tags: reviewData.tags,
          language: reviewData.language
        }
      }

      // Building photo
      if (buildingPhotoFile) {
        dataToSave.buildingPhotoFile = buildingPhotoFile
        dataToSave.isOwnPhoto = isOwnPhoto
        if (!isOwnPhoto && photoSource.trim()) {
          dataToSave.photoSource = photoSource.trim()
        }
      }

      // Review photos
      if (reviewPhotoFiles.length > 0) {
        dataToSave.reviewPhotoFiles = reviewPhotoFiles
      }

      if (audioFile) {
        dataToSave.audioFile = audioFile
      }

      await onSave(dataToSave)
      toast.success(showReview && dataToSave.review ? 'Building and review successfully added!' : 'Building successfully added!')
      handleClose()
    } catch (error: any) {
      console.error('🏛️ [FORM] Save error:', error)
      toast.error(error.message || 'Error saving building')
    } finally {
      setSaving(false)
    }
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

  // Building photo handler
  const handleBuildingPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large (max 5MB)')
      return
    }

    setBuildingPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setBuildingPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBuildingPhoto = () => {
    setBuildingPhotoFile(null)
    if (buildingPhotoPreview) {
      setBuildingPhotoPreview(null)
    }
  }

  // Review photos handler
  const handleReviewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (reviewPhotoFiles.length + files.length > 5) {
      toast.error('Maximum 5 review photos')
      return
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 5MB)`)
        return false
      }
      return true
    })

    setReviewPhotoFiles(prev => [...prev, ...validFiles])

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReviewPhotoPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveReviewPhoto = (index: number) => {
    setReviewPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setReviewPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Аудио
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Audio file is too large (max 10MB)')
      return
    }

    setAudioFile(file)
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
    if (buildingPhotoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(buildingPhotoPreview)
    }
    reviewPhotoPreviews.forEach(url => {
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
    setPracticalInfo({
      opening_hours: '',
      entry_fee: '',
      website: '',
      visit_difficulty: '',
      best_visit_time: '',
      accessibility_info: '',
    })
    setReviewData({
      rating: 0,
      title: '',
      content: '',
      tags: [],
      language: 'en'
    })
    setBuildingPhotoFile(null)
    setBuildingPhotoPreview(null)
    setIsOwnPhoto(true)
    setPhotoSource('')
    setReviewPhotoFiles([])
    setReviewPhotoPreviews([])
    setAudioFile(null)
    setAudioPreview(null)
    setErrors({})
    setShowPracticalInfo(false)
    setShowReview(false)
    setCurrentTag('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Фон */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Модальное окно */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col">

        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add Building</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Контент формы */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-5">

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 1: BUILDING INFO                   */}
            {/* ═══════════════════════════════════════════ */}

            {/* Location + Name group */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              {/* Местоположение */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 font-mono">
                      {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </div>
                    {geocoding ? (
                      <div className="text-xs text-gray-500 flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Determining address...
                      </div>
                    ) : formData.address ? (
                      <div className="text-xs text-gray-500 truncate">
                        {formData.address}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Название здания */}
              <div>
                <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <BuildingIcon className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                  Building Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="e.g. Reichstag"
                  />
                  {checking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Предупреждение о дубликатах */}
            {showDuplicateWarning && (quickResults.length > 0 || fullCheckResult?.duplicates.length) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg animate-slideDown">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      {hasHighConfidenceDuplicates
                        ? 'This building may already be added!'
                        : 'Similar buildings found'}
                    </h3>
                    <p className="text-sm text-yellow-800 mb-3">
                      {hasHighConfidenceDuplicates
                        ? 'We found buildings with very similar characteristics. Please check before adding.'
                        : 'Found buildings with similar names in this city.'}
                    </p>

                    <div className="space-y-2 mb-3">
                      {(fullCheckResult?.duplicates || quickResults).slice(0, 3).map((duplicate, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-yellow-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{duplicate.name}</p>
                              <p className="text-xs text-gray-600 mt-1">{duplicate.address || 'Address not specified'}</p>
                              {duplicate.distance_meters && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {Math.round(duplicate.distance_meters)}m from selected point
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

            {/* City & Country row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Berlin"
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                  Country *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Germany"
                />
                {errors.country && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.country}</p>
                )}
              </div>
            </div>

            {/* Architecture Details group */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Architecture Details</p>

              {/* Архитектор */}
              <div>
                <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <User className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Architect
                </label>
                <input
                  type="text"
                  value={formData.architect || ''}
                  onChange={(e) => handleInputChange('architect', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g. Norman Foster"
                />
              </div>

              {/* Год и Стиль */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                    Year Built
                  </label>
                  <input
                    type="number"
                    value={formData.year_built || ''}
                    onChange={(e) => handleInputChange('year_built', e.target.value ? parseInt(e.target.value) : undefined)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.year_built ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="1894"
                    min="1000"
                    max="2025"
                  />
                  {errors.year_built && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.year_built}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <Palette className="w-3.5 h-3.5 mr-1.5 text-pink-600" />
                    Style
                  </label>
                  <select
                    value={formData.architectural_style || ''}
                    onChange={(e) => handleInputChange('architectural_style', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <BuildingIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Object Type
                </label>
                <select
                  value={formData.building_type || ''}
                  onChange={(e) => handleInputChange('building_type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select type</option>
                  {OBJECT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* BUILDING PHOTO                              */}
            {/* ═══════════════════════════════════════════ */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                <Camera className="w-3.5 h-3.5 mr-1.5 text-blue-600 inline" />
                Building Photo <span className="text-gray-400 font-normal">(optional, max 5MB)</span>
              </label>
              {!buildingPhotoFile ? (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-green-500 hover:bg-green-50 transition-colors">
                    <div className="flex items-center justify-center gap-2">
                      <Camera className="h-5 w-5 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Click to upload photo
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBuildingPhotoUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative group">
                  {buildingPhotoPreview && (
                    <img
                      src={buildingPhotoPreview}
                      alt="Building"
                      className="w-full h-32 sm:h-40 object-cover rounded-lg border-2 border-gray-200"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveBuildingPhoto}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Photo Attribution */}
              {buildingPhotoFile && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOwnPhoto}
                      onChange={(e) => setIsOwnPhoto(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      This is my own photo
                    </span>
                  </label>

                  {!isOwnPhoto && (
                    <div className="animate-slideDown">
                      <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                        Photo Source / Credit *
                      </label>
                      <input
                        type="text"
                        value={photoSource}
                        onChange={(e) => setPhotoSource(e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.photoSource ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="e.g. Wikipedia, ArchDaily..."
                      />
                      {errors.photoSource && (
                        <p className="text-red-500 text-xs mt-0.5">{errors.photoSource}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 2: COLLAPSIBLE BUILDING DETAILS     */}
            {/* ═══════════════════════════════════════════ */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPracticalInfo(!showPracticalInfo)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">Practical Info</span>
                  <span className="text-xs text-gray-400 hidden sm:inline">(hours, fees, transport)</span>
                </div>
                {showPracticalInfo ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {showPracticalInfo && (
                <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 border-t border-gray-200 animate-slideDown">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                        Opening Hours
                      </label>
                      <input
                        type="text"
                        value={practicalInfo.opening_hours}
                        onChange={(e) => setPracticalInfo(prev => ({ ...prev, opening_hours: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Mon-Sun 9-18"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                        Entry Fee
                      </label>
                      <input
                        type="text"
                        value={practicalInfo.entry_fee}
                        onChange={(e) => setPracticalInfo(prev => ({ ...prev, entry_fee: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Free / $10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                      Website
                    </label>
                    <input
                      type="url"
                      value={practicalInfo.website}
                      onChange={(e) => setPracticalInfo(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                        Visit Difficulty
                      </label>
                      <select
                        value={practicalInfo.visit_difficulty}
                        onChange={(e) => setPracticalInfo(prev => ({ ...prev, visit_difficulty: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="easy">Easy</option>
                        <option value="moderate">Moderate</option>
                        <option value="difficult">Difficult</option>
                        <option value="exterior_only">Exterior only</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                        Best Visit Time
                      </label>
                      <input
                        type="text"
                        value={practicalInfo.best_visit_time}
                        onChange={(e) => setPracticalInfo(prev => ({ ...prev, best_visit_time: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Morning..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                      Transport & Accessibility
                    </label>
                    <textarea
                      value={practicalInfo.accessibility_info}
                      onChange={(e) => setPracticalInfo(prev => ({ ...prev, accessibility_info: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Metro nearby, wheelchair accessible..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 3: EXPANDABLE REVIEW                */}
            {/* ═══════════════════════════════════════════ */}
            {!showReview && (
              <div className="bg-green-50/70 border border-green-200 rounded-lg px-3 py-2.5">
                <p className="text-xs sm:text-sm text-gray-600">
                  Want to share your experience? Click <span className="font-medium text-blue-600">&ldquo;Add Review&rdquo;</span> below.
                </p>
              </div>
            )}

            {showReview && (
              <div className="space-y-3 sm:space-y-4 pt-3 border-t-2 border-dashed border-gray-300 animate-slideDown">

                {/* Review header + language selector */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">Your Review</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Share your impressions</p>
                    </div>
                    <select
                      value={reviewData.language}
                      onChange={(e) => setReviewData(prev => ({ ...prev, language: e.target.value as ReviewLanguage }))}
                      className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {REVIEW_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title + Description group */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                      Title
                    </label>
                    <input
                      type="text"
                      value={reviewData.title}
                      onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief impression of the place"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={reviewData.content}
                      onChange={(e) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Tell about the building, its history, architectural features..."
                      maxLength={4000}
                    />
                    <div className="text-xs text-gray-400 mt-0.5 text-right">
                      {reviewData.content.length} / 4000
                    </div>
                  </div>
                </div>

                {/* Media uploads group */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Media</p>

                  {/* Review Photos */}
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                      Photos <span className="text-gray-400 font-normal">(up to 5)</span>
                    </label>
                    {reviewPhotoFiles.length < 5 && (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                          <div className="flex items-center justify-center gap-2">
                            <Camera className="h-4 w-4 text-gray-400" />
                            <p className="text-xs sm:text-sm text-gray-600">
                              Upload review photos ({5 - reviewPhotoFiles.length} left)
                            </p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleReviewPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}

                    {reviewPhotoPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {reviewPhotoPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Review photo ${index + 1}`}
                              className="w-full h-20 sm:h-28 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveReviewPhoto(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audio */}
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                      Audio Guide <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    {!audioFile ? (
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 hover:border-purple-500 hover:bg-purple-50 transition-colors">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-base">🎙️</span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              Upload audio (mp3, wav, m4a)
                            </span>
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
                      <div className="border border-gray-300 rounded-lg p-2.5 bg-purple-50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-base">🎵</span>
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
                            className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {audioPreview && (
                          <audio
                            src={audioPreview}
                            controls
                            className="w-full mt-2 h-8"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags - FIXED overflow */}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                    Tags
                  </label>
                  <div className="flex items-center gap-2 mb-1.5">
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
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. museum, modernism"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  {reviewData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {reviewData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Футер с кнопками */}
        <div className="bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-4 border-t border-gray-200 flex-shrink-0">
          {/* Mobile: stacked layout */}
          <div className="flex sm:hidden flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {!showReview ? (
                <button
                  type="button"
                  onClick={() => setShowReview(true)}
                  disabled={saving}
                  className="flex-1 px-3 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-1 disabled:opacity-50 text-sm"
                >
                  <span>Add Review</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  disabled={saving}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-1 disabled:opacity-50 text-sm"
                >
                  <span>←</span>
                  <span>Hide</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving || geocoding}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{showReview ? 'Save All' : 'Create'}</span>
                )}
              </button>
            </div>
            <button
              onClick={handleClose}
              disabled={saving}
              className="w-full px-3 py-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Desktop: horizontal layout */}
          <div className="hidden sm:flex items-center justify-between">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-3">
              {/* Кнопка "Add Review" - переключатель расширения */}
              {!showReview ? (
                <button
                  type="button"
                  onClick={() => setShowReview(true)}
                  disabled={saving}
                  className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>Add Review</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  disabled={saving}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>←</span>
                  <span>Hide Review</span>
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
                  <span>{showReview ? 'Save All' : 'Create'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}
