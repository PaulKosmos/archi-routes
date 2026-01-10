'use client'

import dynamic from 'next/dynamic'

// Динамически импортируем весь компонент карты с отключенным SSR
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  )
})

export default function MapPage() {
  return <MapClient />
}
