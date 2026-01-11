'use client'

import { X, ExternalLink } from 'lucide-react'
import type { Route } from '@/types/route'

interface RouteModalProps {
  route: Route | null
  isOpen: boolean
  onClose: () => void
}

export default function RouteModal({ route, isOpen, onClose }: RouteModalProps) {
  if (!isOpen || !route) return null

  const handleOpenInNewTab = () => {
    window.open(`/routes/${route.id}`, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Прозрачный фон 50% */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Модальное окно */}
      <div className="relative w-11/12 max-w-6xl max-h-[95vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Минимальный заголовок с кнопками */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {route.title}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Open in New Window"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              New Window
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Iframe с существующей страницей маршрута */}
        <div className="relative h-[calc(95vh-60px)]">
          <iframe
            src={`/routes/${route.id}?hideHeader=true`}
            className="w-full h-full border-0"
            title={`Detailed route information for ${route.title}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            allow="fullscreen"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  )
}
