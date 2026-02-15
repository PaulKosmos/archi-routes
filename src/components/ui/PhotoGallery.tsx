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
    .filter(path => path && path.trim() !== '')
    .map(path => getStorageUrl(path, 'photos'))
    .filter(url => url && url !== '')

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
          <button
            key={index}
            type="button"
            className="relative overflow-hidden rounded-lg bg-muted cursor-pointer group"
            onClick={() => openModal(index)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-24 object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.visibility = 'hidden'
              }}
            />

            {/* "+N" badge on last photo */}
            {index === maxPhotos - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  +{remainingCount}
                </span>
              </div>
            )}
          </button>
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
