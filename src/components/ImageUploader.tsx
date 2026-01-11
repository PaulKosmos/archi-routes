// src/components/ImageUploader.tsx (ИСПРАВЛЕННАЯ ВЕРСИЯ)
'use client'

import { useState, useCallback, useEffect } from 'react'
import { uploadImage, compressImage, createImagePreview, deleteImage } from '../lib/imageUtils'

interface ImageFile {
  id: string
  file: File
  preview: string
  url?: string
  uploading: boolean
  progress: number
  error?: string
}

interface ImageUploaderProps {
  maxFiles?: number
  folder?: 'buildings' | 'routes' | 'profiles' | 'news'
  onImagesChange?: (urls: string[]) => void
  existingImages?: string[]
  className?: string
}

export default function ImageUploader({
  maxFiles = 5,
  folder = 'buildings',
  onImagesChange,
  existingImages = [],
  className = ''
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageFile[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Обновляем родительский компонент только когда действительно изменились URL
  useEffect(() => {
    const newUrls = images
      .filter(img => img.url && !img.uploading)
      .map(img => img.url!)

    // Только вызываем callback если URLs действительно изменились
    const currentUrls = JSON.stringify(newUrls.sort())
    const existingUrls = JSON.stringify([...existingImages].sort())

    if (currentUrls !== existingUrls && newUrls.length > 0) {
      onImagesChange?.(newUrls)
    }
  }, [images]) // Убираем onImagesChange и existingImages из зависимостей

  // Обработка выбора файлов
  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)

    // Проверяем лимит файлов
    if (images.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} images`)
      return
    }

    // Создаем объекты изображений
    const newImages: ImageFile[] = []

    for (const file of fileArray) {
      if (file.type.startsWith('image/')) {
        const preview = await createImagePreview(file)
        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          uploading: false,
          progress: 0
        })
      }
    }

    // Добавляем новые изображения и начинаем загрузку
    setImages(prev => [...prev, ...newImages])

    // Загружаем каждое изображение
    for (const newImage of newImages) {
      uploadSingleImage(newImage)
    }
  }

  // Загрузка одного изображения
  const uploadSingleImage = async (imageToUpload: ImageFile) => {
    // Помечаем как загружающееся
    setImages(prev => prev.map(img =>
      img.id === imageToUpload.id
        ? { ...img, uploading: true, progress: 0, error: undefined }
        : img
    ))

    try {
      // Сжимаем изображение
      const compressedFile = await compressImage(imageToUpload.file)

      // Загружаем с отслеживанием прогресса
      const result = await uploadImage(compressedFile, folder, (progress) => {
        setImages(prev => prev.map(img =>
          img.id === imageToUpload.id
            ? { ...img, progress }
            : img
        ))
      })

      if (result.success && result.url) {
        // Успешная загрузка
        setImages(prev => prev.map(img =>
          img.id === imageToUpload.id
            ? { ...img, uploading: false, url: result.url, progress: 100 }
            : img
        ))
      } else {
        // Ошибка загрузки
        setImages(prev => prev.map(img =>
          img.id === imageToUpload.id
            ? { ...img, uploading: false, error: result.error }
            : img
        ))
      }
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === imageToUpload.id
          ? { ...img, uploading: false, error: 'Ошибка загрузки' }
          : img
      ))
    }
  }

  // Удаление изображения
  const removeImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId)
    if (image?.url) {
      await deleteImage(image.url)
    }

    setImages(prev => prev.filter(img => img.id !== imageId))
  }

  // Удаление существующего изображения
  const removeExistingImage = (index: number) => {
    const newExisting = existingImages.filter((_, i) => i !== index)
    onImagesChange?.(newExisting)
  }

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Подсчет всех изображений
  const totalImages = existingImages.length + images.filter(img => img.url).length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Область загрузки */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-gray-600">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-500 font-medium">
                Нажмите для выбора
              </span>
              <span> или перетащите изображения сюда</span>
            </label>
            <input
              id="file-upload"
              type="file"
              className="sr-only"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
          <p className="text-sm text-gray-500">
            PNG, JPG, GIF до 10MB (максимум {maxFiles} файлов)
          </p>
          <p className="text-xs text-gray-400">
            Загружено: {totalImages} / {maxFiles}
          </p>
        </div>
      </div>

      {/* Существующие изображения */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Текущие изображения ({existingImages.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative group">
                <img
                  src={url}
                  alt={`Изображение ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removeExistingImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Новые изображения */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Новые изображения ({images.filter(img => img.url).length}/{images.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.preview}
                  alt="Превью"
                  className="w-full h-24 object-cover rounded-lg border"
                />

                {/* Индикатор загрузки */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                      <div className="text-xs">{image.progress}%</div>
                    </div>
                  </div>
                )}

                {/* Ошибка */}
                {image.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center text-xs p-2">
                      {image.error}
                    </div>
                  </div>
                )}

                {/* Успешная загрузка */}
                {image.url && !image.uploading && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}

                {/* Кнопка удаления */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}