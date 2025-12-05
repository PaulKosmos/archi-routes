'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
  Star,
  Camera,
  Mic,
  MicOff,
  Play,
  Pause,
  X,
  Clock,
  DollarSign,
  Tag,
  Loader2,
  MapPin,
  Building,
  User,
  Calendar,
  Map,
  Navigation
} from 'lucide-react'

// Динамически импортируем карту для избежания проблем с SSR
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">Загрузка карты...</span>
    </div>
  )
})

export default function AddBuildingClient() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { user } = useAuth()

  // Состояние здания
  const [buildingData, setBuildingData] = useState({
    name: '',
    architect: '',
    year_built: '',
    architectural_style: '',
    address: '',
    city: '',
    country: 'Россия',
    latitude: 0,
    longitude: 0,
    description: ''
  })

  // Координаты (управляемые отдельно для удобства)
  const [coordinates, setCoordinates] = useState({
    lat: '',
    lng: ''
  })

  // Режим выбора местоположения: 'coordinates' | 'map'
  const [locationMode, setLocationMode] = useState<'coordinates' | 'map'>('map')

  // Состояние обзора
  const [reviewData, setReviewData] = useState({
    rating: 0,
    title: '',
    content: '',
    review_type: 'general' as 'general' | 'expert' | 'historical',
    tags: [] as string[]
  })

  // Добавляем состояние для выбора создания обзора
  const [createReview, setCreateReview] = useState(true)

  // Аудио запись
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Фотографии
  const [buildingPhotoFiles, setBuildingPhotoFiles] = useState<File[]>([])
  const [buildingPhotoPreviews, setBuildingPhotoPreviews] = useState<string[]>([])
  const [reviewPhotoFiles, setReviewPhotoFiles] = useState<File[]>([])
  const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState<string[]>([])

  // Практическая информация
  const [openingHours, setOpeningHours] = useState('')
  const [entryFee, setEntryFee] = useState('')

  // Теги
  const [currentTag, setCurrentTag] = useState('')

  // Отправка
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1 = здание, 2 = обзор

  // Проверка авторизации
  useEffect(() => {
    console.log('Auth state:', { user: !!user, initialized: true })
  }, [user])

  // Обработчик выбора местоположения на карте
  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    const latStr = lat.toFixed(6)
    const lngStr = lng.toFixed(6)

    setCoordinates({ lat: latStr, lng: lngStr })

    // Пытаемся извлечь город и страну из адреса
    let cityFromAddress = ''
    let countryFromAddress = ''

    if (address) {
      console.log('Полученный адрес:', address)

      // Разбиваем адрес по запятым
      const addressParts = address.split(', ').map(part => part.trim())
      console.log('Части адреса:', addressParts)

      // Последняя часть обычно страна
      if (addressParts.length > 0) {
        const lastPart = addressParts[addressParts.length - 1]
        if (lastPart.includes('Россия') || lastPart.includes('Russia')) {
          countryFromAddress = 'Россия'
        } else if (lastPart.includes('Германия') || lastPart.includes('Germany')) {
          countryFromAddress = 'Германия'
        } else if (lastPart.includes('Франция') || lastPart.includes('France')) {
          countryFromAddress = 'Франция'
        }
      }

      // Город обычно находится во второй с конца части
      if (addressParts.length >= 2) {
        // Пробуем найти город по ключевым словам
        for (let i = addressParts.length - 2; i >= 0; i--) {
          const part = addressParts[i]
          // Пропускаем почтовые коды и короткие части
          if (part.length > 2 && !/^\d+$/.test(part) && !part.includes('область') && !part.includes('район')) {
            cityFromAddress = part
            break
          }
        }
      }

      console.log('Извлеченный город:', cityFromAddress)
      console.log('Извлеченная страна:', countryFromAddress)
    }

    setBuildingData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address || prev.address,
      city: cityFromAddress || prev.city,
      country: countryFromAddress || prev.country
    }))
  }

  // Получение геолокации
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          setCoordinates({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6)
          })
          setBuildingData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }))
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error)
          alert('Не удалось получить текущее местоположение. Проверьте разрешения браузера.')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    } else {
      alert('Геолокация не поддерживается браузером')
    }
  }

  // Обновление координат из полей ввода
  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    setCoordinates(prev => ({ ...prev, [field]: value }))

    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      setBuildingData(prev => ({
        ...prev,
        [field === 'lat' ? 'latitude' : 'longitude']: numValue
      }))
    }
  }

  // Обработка рейтинга
  const handleRatingClick = (rating: number) => {
    setReviewData(prev => ({ ...prev, rating }))
  }

  // Аудио запись
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Ошибка начала записи:', error)
      alert('Не удалось начать запись. Проверьте разрешения микрофона.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Обработка фотографий здания
  const handleBuildingPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const remainingSlots = 8 - buildingPhotoFiles.length
    const filesToAdd = files.slice(0, remainingSlots)

    const validFiles = filesToAdd.filter(file => file.size <= 5 * 1024 * 1024)

    if (validFiles.length !== filesToAdd.length) {
      alert('Некоторые файлы превышают лимит в 5 МБ')
    }

    setBuildingPhotoFiles(prev => [...prev, ...validFiles])

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setBuildingPhotoPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeBuildingPhoto = (index: number) => {
    setBuildingPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setBuildingPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Обработка фотографий обзора
  const handleReviewPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const remainingSlots = 6 - reviewPhotoFiles.length
    const filesToAdd = files.slice(0, remainingSlots)

    const validFiles = filesToAdd.filter(file => file.size <= 5 * 1024 * 1024)

    if (validFiles.length !== filesToAdd.length) {
      alert('Некоторые файлы превышают лимит в 5 МБ')
    }

    setReviewPhotoFiles(prev => [...prev, ...validFiles])

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setReviewPhotoPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeReviewPhoto = (index: number) => {
    setReviewPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setReviewPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Обработка тегов
  const addTag = () => {
    const tag = currentTag.trim().toLowerCase()
    if (tag && !reviewData.tags.includes(tag)) {
      setReviewData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setReviewData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Валидация шага 1 (здание)
  const validateBuildingData = () => {
    if (!buildingData.name.trim()) {
      alert('Введите название здания')
      return false
    }
    if (!buildingData.address.trim()) {
      alert('Введите адрес здания')
      return false
    }
    if (!buildingData.city.trim()) {
      alert('Введите город')
      return false
    }
    if (buildingData.latitude === 0 || buildingData.longitude === 0) {
      alert('Укажите координаты здания на карте')
      return false
    }
    return true
  }

  // Переход к следующему шагу
  const nextStep = () => {
    if (validateBuildingData()) {
      setCurrentStep(2)
    }
  }

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Начало handleSubmit функции')

    if (!user) {
      console.error('❌ Пользователь не авторизован')
      alert('Необходима авторизация')
      return
    }

    console.log('✅ Пользователь авторизован:', user.id)
    console.log('📝 createReview:', createReview)

    // Проверяем обзор только если пользователь выбрал его создавать
    if (createReview && (reviewData.rating === 0 || !reviewData.title.trim())) {
      console.error('❌ Валидация обзора не пройдена')
      alert('Для создания обзора укажите рейтинг и заголовок')
      return
    }

    console.log('✅ Валидация пройдена, начинаем создание...')

    setSubmitting(true)

    try {
      console.log('📊 Статистика файлов:')
      console.log('  - Фото здания:', buildingPhotoFiles.length)
      console.log('  - Фото обзора:', reviewPhotoFiles.length)
      console.log('  - Аудио:', !!audioBlob)

      // 1. Загрузка фотографий здания (временно отключено для диагностики)
      const buildingImageUrls: string[] = []

      console.log('⚠️ ВРЕМЕННО: Пропускаем загрузку фотографий для диагностики')

      console.log(`📸 Итого загружено фотографий здания: ${buildingImageUrls.length} (временно отключено)`)

      // 2. Подготовка данных для создания здания
      console.log('🏗️ Подготавливаем данные для создания здания...')

      // Оптимизированные данные - только обязательные поля
      const buildingInsertData: any = {
        name: buildingData.name.trim(),
        address: buildingData.address.trim(),
        city: buildingData.city.trim(),
        country: buildingData.country,
        latitude: buildingData.latitude,
        longitude: buildingData.longitude,
        created_by: user.id
      }

      // Добавляем опциональные поля только если они не пустые
      if (buildingData.description?.trim()) {
        buildingInsertData.description = buildingData.description.trim()
      }
      if (buildingData.architect?.trim() && buildingData.architect !== buildingData.name) {
        buildingInsertData.architect = buildingData.architect.trim()
      }
      if (buildingData.year_built) {
        buildingInsertData.year_built = parseInt(buildingData.year_built)
      }
      if (buildingData.architectural_style) {
        buildingInsertData.architectural_style = buildingData.architectural_style
      }
      if (buildingImageUrls.length > 0) {
        buildingInsertData.image_urls = buildingImageUrls
        buildingInsertData.image_url = buildingImageUrls[0]
      }
      if (openingHours?.trim()) {
        buildingInsertData.opening_hours = { text: openingHours }
      }
      if (entryFee?.trim()) {
        buildingInsertData.entry_fee = entryFee
      }

      console.log('🏗️ Данные для создания здания:', buildingInsertData)

      let building = null // Объявляем переменную в области видимости

      // 3. Создание здания через API Route
      console.log('🏗️ Отправляем запрос на создание здания через API...')

      try {
        // Получаем токен пользователя
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('Нет токена авторизации')
        }

        console.log('🏗️ Ожидаем ответ от API...')

        const apiResponse = await fetch('/api/buildings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(buildingInsertData)
        })

        const result = await apiResponse.json()

        console.log('🏗️ Ответ от API получен:')
        console.log('   - API Response:', result)
        console.log('   - Status:', apiResponse.status)

        if (!apiResponse.ok) {
          console.error('❌ Ошибка API:', result)
          console.error('❌ Полные детали ошибки API:', JSON.stringify(result, null, 2))
          throw new Error(`API Error: ${result.error}. Details: ${JSON.stringify(result.details)}`)
        }

        if (!result.building) {
          throw new Error('Здание не было создано - получен null')
        }

        building = result.building // Присваиваем значение
        console.log('✅ Здание создано через API! ID:', building.id)

      } catch (apiError) {
        console.error('💥 Исключение при работе с API:', apiError)
        throw apiError
      }

      // 4. Обработка обзора (если выбран)
      if (createReview && reviewData.rating > 0 && reviewData.title.trim()) {
        console.log('📝 Начинаем создание обзора...')

        // 4.1. Загрузка аудио файла обзора
        let audioUrl = null
        if (audioBlob) {
          console.log('🎵 Загружаем аудио файл...')
          console.log(`   - Размер аудио: ${(audioBlob.size / 1024).toFixed(2)} KB`)

          try {
            const audioFileName = `reviews/${Date.now()}-review.wav`
            console.log(`   - Путь аудио: ${audioFileName}`)

            const { data: audioData, error: audioError } = await supabase.storage
              .from('audio')
              .upload(audioFileName, audioBlob)

            if (audioError) {
              console.error('   ❌ Ошибка загрузки аудио:', audioError)
            } else {
              console.log('   ✅ Аудио загружено:', audioData)
              const { data: { publicUrl } } = supabase.storage
                .from('audio')
                .getPublicUrl(audioData.path)
              audioUrl = publicUrl
              console.log(`   🔗 URL аудио: ${audioUrl}`)
            }
          } catch (audioUploadError) {
            console.error('   💥 Исключение при загрузке аудио:', audioUploadError)
          }
        }

        // 4.2. Загрузка фотографий обзора (временно отключено)
        console.log('📸 Пропускаем загрузку фотографий обзора (временно отключено)')
        const reviewImageUrls: string[] = []

        console.log(`📸 Итого загружено фотографий обзора: ${reviewImageUrls.length} (временно отключено)`)

        // 4.3. Создание обзора
        const reviewInsertData: any = {
          building_id: building.id,
          user_id: user.id,
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content || null,
          review_type: reviewData.review_type || 'general',
          is_verified: false,
          helpful_count: 0,
          is_featured: false,
          language: 'ru',
          source_type: 'user_generated'
        }

        // Добавляем опциональные поля только если они есть
        if (audioUrl) {
          reviewInsertData.audio_url = audioUrl
        }
        if (reviewImageUrls.length > 0) {
          reviewInsertData.photos = reviewImageUrls
        }
        if (reviewData.tags && reviewData.tags.length > 0) {
          reviewInsertData.tags = reviewData.tags
        }

        console.log('📝 Данные для создания обзора:', reviewInsertData)

        const { data: reviewResult, error: reviewError } = await supabase
          .from('building_reviews')
          .insert(reviewInsertData)
          .select()
          .single()

        console.log('📝 Результат создания обзора:')
        console.log('   - Review data:', reviewResult)
        console.log('   - Review error:', reviewError)

        if (reviewError) {
          console.error('❌ Ошибка создания обзора:', reviewError)
          console.error('📋 Детали ошибки обзора:', {
            message: reviewError.message,
            details: reviewError.details,
            hint: reviewError.hint,
            code: reviewError.code
          })
          // Не прерываем выполнение, так как здание уже создано
          alert('Здание создано, но произошла ошибка при создании обзора. Вы можете добавить обзор позже.')
        } else {
          console.log('✅ Обзор создан успешно! ID:', reviewResult?.id)
        }
      } else {
        console.log('📝 Создание обзора пропущено')
      }

      console.log('🎉 Процесс завершен успешно! Перенаправляем на страницу здания...')

      // 5. Перенаправление на страницу созданного здания
      router.push(`/buildings/${building.id}`)

    } catch (error: any) {
      console.error('💥 Глобальная ошибка создания объекта:', error)
      console.error('📋 Детали глобальной ошибки:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      })
      alert(`Не удалось создать объект: ${error?.message || 'Неизвестная ошибка'}`)
    } finally {
      console.log('🏁 Завершаем процесс, снимаем флаг submitting')
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Необходима авторизация
          </h2>
          <p className="text-yellow-700 mb-4">
            Для создания объектов необходимо войти в систему
          </p>
          <div className="space-x-4">
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Добавить архитектурный объект
        </h1>
        <p className="text-gray-600">
          Создайте карточку здания и поделитесь своим первым впечатлением
        </p>
      </div>

      {/* Индикатор прогресса */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              <Building className="h-4 w-4" />
            </div>
            <span className="ml-2 font-medium">Здание</span>
          </div>

          <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>

          <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              <Star className="h-4 w-4" />
            </div>
            <span className="ml-2 font-medium">Обзор</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Шаг 1: Информация о здании */}
        {currentStep === 1 && (
          <>
            {/* Основная информация о здании */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Основная информация о здании</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название здания *
                  </label>
                  <input
                    type="text"
                    value={buildingData.name}
                    onChange={(e) => setBuildingData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Например: Дом Мельникова, ГУМ, Собор Василия Блаженного"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-1" />
                      Архитектор
                    </label>
                    <input
                      type="text"
                      value={buildingData.architect}
                      onChange={(e) => setBuildingData(prev => ({ ...prev, architect: e.target.value }))}
                      placeholder="Имя архитектора"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Год постройки
                    </label>
                    <input
                      type="number"
                      value={buildingData.year_built}
                      onChange={(e) => setBuildingData(prev => ({ ...prev, year_built: e.target.value }))}
                      placeholder="1925"
                      min="800"
                      max="2025"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Город *
                    </label>
                    <input
                      type="text"
                      value={buildingData.city}
                      onChange={(e) => setBuildingData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Москва"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Страна *
                    </label>
                    <select
                      value={buildingData.country}
                      onChange={(e) => setBuildingData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Россия">Россия</option>
                      <option value="Беларусь">Беларусь</option>
                      <option value="Казахстан">Казахстан</option>
                      <option value="Украина">Украина</option>
                      <option value="Германия">Германия</option>
                      <option value="Франция">Франция</option>
                      <option value="Италия">Италия</option>
                      <option value="Другая">Другая</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Архитектурный стиль
                  </label>
                  <select
                    value={buildingData.architectural_style}
                    onChange={(e) => setBuildingData(prev => ({ ...prev, architectural_style: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Выберите стиль</option>
                    <option value="Модернизм">Модернизм</option>
                    <option value="Конструктивизм">Конструктивизм</option>
                    <option value="Сталинский ампир">Сталинский ампир</option>
                    <option value="Брутализм">Брутализм</option>
                    <option value="Классицизм">Классицизм</option>
                    <option value="Барокко">Барокко</option>
                    <option value="Готика">Готика</option>
                    <option value="Романский">Романский</option>
                    <option value="Арт-деко">Арт-деко</option>
                    <option value="Постмодернизм">Постмодернизм</option>
                    <option value="Современный">Современный</option>
                    <option value="Другой">Другой</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Местоположение */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Местоположение *</h2>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setLocationMode('map')}
                    className={`flex items-center px-3 py-1 rounded-lg transition-colors ${
                      locationMode === 'map'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Map className="h-4 w-4 mr-1" />
                    Карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('coordinates')}
                    className={`flex items-center px-3 py-1 rounded-lg transition-colors ${
                      locationMode === 'coordinates'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Координаты
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Адрес *
                  </label>
                  <input
                    type="text"
                    value={buildingData.address}
                    onChange={(e) => setBuildingData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Улица, дом, город"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Интерактивная карта */}
                {locationMode === 'map' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Кликните на карту для выбора местоположения здания
                      </p>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Моя позиция
                      </button>
                    </div>

                    <LocationPicker
                      latitude={buildingData.latitude}
                      longitude={buildingData.longitude}
                      onLocationSelect={handleLocationSelect}
                    />

                    {buildingData.latitude !== 0 && buildingData.longitude !== 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✅ <strong>Выбрано:</strong> {buildingData.latitude.toFixed(6)}, {buildingData.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ручной ввод координат */}
                {locationMode === 'coordinates' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Совет:</strong> Используйте карту для более удобного выбора местоположения
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Широта *
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={coordinates.lat}
                          onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                          placeholder="55.755831"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Долгота *
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={coordinates.lng}
                          onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                          placeholder="37.617673"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Моя локация
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Фотографии здания */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Фотографии здания</h2>
              <p className="text-gray-600 mb-4">
                Добавьте до 8 фотографий здания (максимум 5 МБ каждая)
              </p>

              {buildingPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {buildingPhotoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Фото здания ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeBuildingPhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {buildingPhotoFiles.length < 8 && (
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors block">
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Нажмите для выбора фотографий</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {8 - buildingPhotoFiles.length} фото осталось
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleBuildingPhotoUpload}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {/* Описание */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Краткое описание</h2>
              <textarea
                value={buildingData.description}
                onChange={(e) => setBuildingData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Краткое описание здания, его особенности, историческое значение..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Кнопки навигации для шага 1 */}
            <div className="flex items-center justify-between pt-6">
              <Link
                href="/"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </Link>

              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Далее: Создать обзор
              </button>
            </div>
          </>
        )}

        {/* Шаг 2: Создание обзора */}
        {currentStep === 2 && (
          <>
            {/* Выбор создания обзора */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Создание обзора</h2>

              <div className="flex items-center space-x-4 mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createReview}
                    onChange={(e) => setCreateReview(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-gray-900 font-medium">
                    Создать обзор для этого здания
                  </span>
                </label>
              </div>

              <p className="text-gray-600 text-sm">
                {createReview
                  ? 'Вы можете создать обзор сразу или добавить его позже на странице здания.'
                  : 'Здание будет создано без обзора. Вы сможете добавить обзор позже.'
                }
              </p>
            </div>

            {/* Обзор - только если выбран */}
            {createReview && (
              <>
                {/* Рейтинг */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Ваша оценка здания *</h2>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewData.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-4 text-gray-600">
                  {reviewData.rating > 0 ? `${reviewData.rating} из 5` : 'Выберите оценку'}
                </span>
              </div>
            </div>

            {/* Обзор */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Ваш обзор</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Заголовок обзора *
                  </label>
                  <input
                    type="text"
                    value={reviewData.title}
                    onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Краткое описание вашего впечатления"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип обзора
                  </label>
                  <select
                    value={reviewData.review_type}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      review_type: e.target.value as 'general' | 'expert' | 'historical'
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">Общий обзор</option>
                    <option value="expert">Экспертный анализ</option>
                    <option value="historical">Историческая справка</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ваше впечатление
                  </label>
                  <textarea
                    value={reviewData.content}
                    onChange={(e) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Расскажите о здании: что вас впечатлило, какие детали заметили, что чувствовали..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Аудио запись */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Аудио комментарий</h2>
              <p className="text-gray-600 mb-4">
                Добавьте голосовой комментарий для более живого восприятия
              </p>

              <div className="space-y-4">
                {!audioUrl ? (
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        isRecording
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2" />
                          Остановить запись
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Начать запись
                        </>
                      )}
                    </button>

                    {isRecording && (
                      <div className="flex items-center text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
                        Идет запись...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={playAudio}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Пауза
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Прослушать
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAudioUrl(null)
                          setAudioBlob(null)
                          setIsPlaying(false)
                        }}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Удалить
                      </button>
                    </div>

                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Практическая информация */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Практическая информация</h2>
              <p className="text-gray-600 mb-4">
                Помогите другим посетителям - добавьте информацию о времени работы и стоимости посещения
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Время работы
                  </label>
                  <input
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    placeholder="Пн-Пт: 9:00-18:00, Сб-Вс: 10:00-16:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Стоимость входа
                  </label>
                  <input
                    type="text"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="Бесплатно / 200₽ / 150₽ льготный"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Фотографии обзора */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Дополнительные фотографии</h2>
              <p className="text-gray-600 mb-4">
                Добавьте до 6 фотографий для обзора - детали, интерьеры, особые ракурсы (максимум 5 МБ каждая)
              </p>

              {reviewPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {reviewPhotoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Фото обзора ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeReviewPhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {reviewPhotoFiles.length < 6 && (
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors block">
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Нажмите для выбора фотографий</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {6 - reviewPhotoFiles.length} фото осталось
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleReviewPhotoUpload}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {/* Теги */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Теги</h2>
              <p className="text-gray-600 mb-4">
                Добавьте теги для лучшей категоризации обзора
              </p>

              {/* Существующие теги */}
              {reviewData.tags && reviewData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {reviewData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Поле добавления тега */}
              <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Введите тег и нажмите Enter"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Добавить
                </button>
              </div>

              {/* Популярные теги */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Популярные теги:</p>
                <div className="flex flex-wrap gap-2">
                  {['архитектура', 'история', 'красота', 'уникальность', 'реставрация', 'детали'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!reviewData.tags?.includes(tag)) {
                          setReviewData(prev => ({
                            ...prev,
                            tags: [...(prev.tags || []), tag]
                          }))
                        }
                      }}
                      className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
              </>
            )} {/* Закрываем блок createReview */}

            {/* Кнопки навигации для шага 2 */}
            <div className="flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Назад к зданию
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {createReview ? 'Создание объекта...' : 'Создание здания...'}
                  </>
                ) : (
                  createReview ? 'Создать объект' : 'Создать здание'
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
