'use client'

import { useState, useMemo } from 'react'
import WebPImage from './WebPImage'

interface ResponsiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  fallback?: React.ReactNode
  breakpoints?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

export default function ResponsiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  fallback,
  breakpoints = {
    mobile: 400,
    tablet: 768,
    desktop: 1200
  }
}: ResponsiveImageProps) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('desktop')

  // Определяем текущий breakpoint
  useMemo(() => {
    const updateBreakpoint = () => {
      const screenWidth = window.innerWidth
      
      if (screenWidth < breakpoints.tablet) {
        setCurrentBreakpoint('mobile')
      } else if (screenWidth < breakpoints.desktop) {
        setCurrentBreakpoint('tablet')
      } else {
        setCurrentBreakpoint('desktop')
      }
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [breakpoints])

  // Генерируем responsive sizes
  const responsiveSizes = useMemo(() => {
    return `(max-width: ${breakpoints.tablet - 1}px) ${breakpoints.mobile}px, (max-width: ${breakpoints.desktop - 1}px) ${breakpoints.tablet}px, ${breakpoints.desktop}px`
  }, [breakpoints])

  // Адаптивные размеры изображения
  const adaptiveDimensions = useMemo(() => {
    const aspectRatio = height && width ? height / width : 1
    
    switch (currentBreakpoint) {
      case 'mobile':
        return {
          width: Math.min(breakpoints.mobile, width || breakpoints.mobile),
          height: height ? Math.round(Math.min(breakpoints.mobile, width || breakpoints.mobile) * aspectRatio) : undefined
        }
      case 'tablet':
        return {
          width: Math.min(breakpoints.tablet, width || breakpoints.tablet),
          height: height ? Math.round(Math.min(breakpoints.tablet, width || breakpoints.tablet) * aspectRatio) : undefined
        }
      default:
        return {
          width: width || breakpoints.desktop,
          height: height
        }
    }
  }, [currentBreakpoint, breakpoints, width, height])

  return (
    <WebPImage
      src={src}
      alt={alt}
      width={adaptiveDimensions.width}
      height={adaptiveDimensions.height}
      className={className}
      priority={priority}
      quality={quality}
      fallback={fallback}
      sizes={responsiveSizes}
    />
  )
}

// Хук для определения текущего breakpoint
export function useResponsiveBreakpoint(breakpoints = {
  mobile: 400,
  tablet: 768,
  desktop: 1200
}): string {
  const [breakpoint, setBreakpoint] = useState<string>('desktop')

  useMemo(() => {
    const updateBreakpoint = () => {
      const screenWidth = window.innerWidth
      
      if (screenWidth < breakpoints.tablet) {
        setBreakpoint('mobile')
      } else if (screenWidth < breakpoints.desktop) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('desktop')
      }
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [breakpoints])

  return breakpoint
}
