// src/components/ui/PhotoGallery.tsx - Кликабельная галерея фото

'use client'

import { useState } from 'react'
import { getStorageUrl } from '@/lib/storage'
import PhotoModal from './PhotoModal'

interface PhotoGalleryProps {
  photos: string[]
  className?: string
  maxPhotos?: number
}

export default function PhotoGallery({ photos, className = '', maxPhotos = 6 }: PhotoGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStartIndex, setModalStartIndex] = useState(0)

  // Получаем полные URL для фотографий с проверкой
  const photoUrls = photos
    .filter(path => path && path.trim() !== '') // Убираем пустые пути
    .map(path => {
      console.log('📷 Processing photo path:', path)
      const url = getStorageUrl(path, 'photos')
      console.log('📷 Generated URL:', url)
      return url
    })
    .filter(url => url && url !== '')

  console.log('📷 PhotoGallery:', { originalPhotos: photos, processedUrls: photoUrls })
  const displayPhotos = photoUrls.slice(0, maxPhotos)
  const remainingCount = photoUrls.length - maxPhotos

  const openModal = (index: number) => {
    setModalStartIndex(index)
    setModalOpen(true)
  }

  if (photos.length === 0) return null

  return (
    <>
      <div className={`grid gap-2 ${className}`}>
        {displayPhotos.map((photo, index) => (
          <div
            key={index}
            className="relative group cursor-pointer overflow-hidden rounded-lg"
            onClick={() => openModal(index)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-24 object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                console.error('🖼️ Photo loading error:', photo)
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />

            {/* Overlay при наведении */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                  Click to view
                </div>
              </div>
            </div>

            {/* Показываем количество оставшихся фото на последнем изображении */}
            {index === maxPhotos - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модальное окно */}
      <PhotoModal
        photos={photoUrls}
        isOpen={modalOpen}
        initialIndex={modalStartIndex}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}