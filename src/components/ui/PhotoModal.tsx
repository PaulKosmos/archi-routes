// src/components/ui/PhotoModal.tsx - Модальное окно для просмотра фото

'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react'

interface PhotoModalProps {
  photos: string[]
  isOpen: boolean
  initialIndex: number
  onClose: () => void
}

export default function PhotoModal({ photos, isOpen, initialIndex, onClose }: PhotoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoom(1)
  }, [initialIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || photos.length === 0) return null

  const currentPhoto = photos[currentIndex]

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
    setZoom(1)
  }

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
    setZoom(1)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(currentPhoto)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `photo-${currentIndex + 1}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      {/* Фон для закрытия */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Контрол панель сверху */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          {currentIndex + 1} of {photos.length}
        </div>

        <div className="flex items-center space-x-2">
          {/* Зум */}
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="text-white text-sm min-w-[3rem] text-center bg-black bg-opacity-50 px-2 py-1 rounded">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Скачать */}
          <button
            onClick={handleDownload}
            className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Закрыть */}
          <button
            onClick={onClose}
            className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Навигация влево */}
      {photos.length > 1 && (
        <button
          onClick={prevPhoto}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors z-10"
          title="Previous photo (←)"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Основное изображение */}
      <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto">
        <img
          src={currentPhoto}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-none transition-transform duration-200 select-none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center'
          }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {/* Навигация вправо */}
      {photos.length > 1 && (
        <button
          onClick={nextPhoto}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors z-10"
          title="Next photo (→)"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Миниатюры снизу */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 max-w-[90vw] overflow-x-auto bg-black bg-opacity-50 p-2 rounded-lg">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                setZoom(1)
              }}
              className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${index === currentIndex ? 'border-blue-400' : 'border-transparent'
                }`}
            >
              <img
                src={photo}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}