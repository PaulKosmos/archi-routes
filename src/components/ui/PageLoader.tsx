'use client'

import React from 'react'

interface PageLoaderProps {
  /** Optional loading message */
  message?: string
  /** Size of the globe icon: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg'
  /** Show full screen overlay or inline */
  fullScreen?: boolean
  /** Custom className for the container */
  className?: string
}

// Size configurations
const sizeConfig = {
  sm: { globe: 32, container: 'w-12 h-12' },
  md: { globe: 48, container: 'w-16 h-16' },
  lg: { globe: 64, container: 'w-24 h-24' },
}

// Coral color for the theme
const CORAL_COLOR = '#FF6B6B'

/**
 * Globe icon SVG - animated spinning globe
 * Single color, vector-based
 */
function GlobeIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-spin"
      style={{ animationDuration: '2s' }}
    >
      {/* Outer circle - globe outline */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={CORAL_COLOR}
        strokeWidth="1.5"
        fill="none"
      />

      {/* Horizontal line - equator */}
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke={CORAL_COLOR}
        strokeWidth="1.5"
        fill="none"
      />

      {/* Vertical ellipse - meridian */}
      <ellipse
        cx="12"
        cy="12"
        rx="4"
        ry="10"
        stroke={CORAL_COLOR}
        strokeWidth="1.5"
        fill="none"
      />

      {/* Middle horizontal line */}
      <line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        stroke={CORAL_COLOR}
        strokeWidth="1.5"
      />
    </svg>
  )
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
  const config = sizeConfig[size]

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Globe container with pulse effect */}
      <div className={`relative ${config.container} flex items-center justify-center`}>
        {/* Pulse ring animation */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: CORAL_COLOR }}
        />
        {/* Globe icon */}
        <GlobeIcon size={config.globe} />
      </div>

      {/* Optional message */}
      {message && (
        <p
          className="mt-4 text-sm font-medium"
          style={{ color: CORAL_COLOR }}
        >
          {message}
        </p>
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
