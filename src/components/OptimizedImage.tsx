'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  quality?: number
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  quality = 75,
  onLoad,
  onError,
  fallback
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer для lazy loading
  useEffect(() => {
    if (priority) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px', // Начинаем загрузку за 50px до появления
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setIsError(true)
    onError?.()
  }, [onError])

  // Генерируем blur placeholder если не предоставлен
  const generateBlurDataURL = useCallback((w: number = 10, h: number = 10) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    canvas.width = w
    canvas.height = h

    // Создаем простой градиент
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    return canvas.toDataURL()
  }, [])

  const defaultBlurDataURL = blurDataURL || generateBlurDataURL()

  // Если изображение не в зоне видимости, показываем placeholder
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
      >
        {placeholder === 'blur' && (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>
    )
  }

  // Если произошла ошибка загрузки
  if (isError) {
    return (
      <div
        className={`bg-gray-100 border border-gray-200 rounded flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {fallback || (
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-1">🖼️</div>
            <div className="text-xs">Ошибка загрузки</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: '100%',
          height: 'auto'
        }}
      />
      
      {/* Показываем placeholder пока изображение загружается */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse">
          {placeholder === 'blur' && (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
          )}
        </div>
      )}
    </div>
  )
}
