'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface PageLoaderProps {
  /** Optional loading message */
  message?: string
  /** Size of the spinner: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg'
  /** Show full screen overlay or inline */
  fullScreen?: boolean
  /** Custom className for the container */
  className?: string
}

const sizeConfig = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}

/**
 * Unified page loading component
 * Use this across all pages for consistent loading experience
 */
export function PageLoader({
  message,
  size = 'md',
  fullScreen = true,
  className = '',
}: PageLoaderProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <Loader2 className={`${sizeConfig[size]} animate-spin text-primary`} />
      {message && (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

/**
 * Inline loader for smaller sections
 */
export function InlineLoader({ message }: { message?: string }) {
  return (
    <PageLoader
      size="sm"
      fullScreen={false}
      message={message}
      className="py-8"
    />
  )
}

/**
 * Section loader with custom height
 */
export function SectionLoader({
  message,
  height = 'py-20'
}: {
  message?: string
  height?: string
}) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <PageLoader
        size="md"
        fullScreen={false}
        message={message}
      />
    </div>
  )
}

// Default export for backward compatibility
export default PageLoader
