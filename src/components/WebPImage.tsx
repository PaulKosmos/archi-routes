'use client'

import { useState, useEffect } from 'react'
import OptimizedImage from './OptimizedImage'

interface WebPImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  fallback?: React.ReactNode
  sizes?: string
}

export default function WebPImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  fallback,
  sizes
}: WebPImageProps) {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null)
  const [optimizedSrc, setOptimizedSrc] = useState(src)

  // Проверяем поддержку WebP
  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setWebpSupported(false)
        return
      }

      const dataURL = canvas.toDataURL('image/webp')
      const supported = dataURL.indexOf('data:image/webp') === 0
      setWebpSupported(supported)
    }

    checkWebPSupport()
  }, [])

  // Генерируем WebP URL если поддерживается
  useEffect(() => {
    if (webpSupported === null) return

    if (webpSupported && !src.includes('.webp')) {
      // Простая логика конвертации URL в WebP
      // В реальном проекте это может быть API endpoint для конвертации
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
      setOptimizedSrc(webpSrc)
    } else {
      setOptimizedSrc(src)
    }
  }, [src, webpSupported])

  // Показываем placeholder пока определяем поддержку WebP
  if (webpSupported === null) {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
      />
    )
  }

  return (
    <OptimizedImage
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={quality}
      fallback={fallback}
      sizes={sizes}
      onError={() => {
        // Fallback на оригинальный формат если WebP не загрузился
        if (webpSupported && optimizedSrc !== src) {
          setOptimizedSrc(src)
        }
      }}
    />
  )
}

// Хук для проверки поддержки WebP
export function useWebPSupport(): boolean | null {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null)

  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setWebpSupported(false)
        return
      }

      const dataURL = canvas.toDataURL('image/webp')
      const supported = dataURL.indexOf('data:image/webp') === 0
      setWebpSupported(supported)
    }

    checkWebPSupport()
  }, [])

  return webpSupported
}
