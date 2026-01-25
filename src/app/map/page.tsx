'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/ui/PageLoader'

// Динамически импортируем весь компонент карты с отключенным SSR
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => <PageLoader message="Loading map..." size="lg" />
})

export default function MapPage() {
  return <MapClient />
}
