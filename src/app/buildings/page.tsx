// src/app/buildings/page.tsx
import { Suspense } from 'react'
import { BuildingsPage } from '@/components/buildings/BuildingsPage'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

export const metadata = {
  title: 'Каталог зданий - Архитектурная платформа',
  description: 'Каталог архитектурных объектов, зданий и памятников с возможностью поиска и фильтрации по стилям, архитекторам, годам постройки и другим параметрам.',
  keywords: 'каталог зданий, архитектура, памятники, архитектурные объекты, поиск зданий',
  openGraph: {
    title: 'Каталог зданий - Архитектурная платформа',
    description: 'Каталог архитектурных объектов, зданий и памятников с умным поиском и фильтрами',
    type: 'website'
  }
}

// Обертка для работы с URL параметрами поиска
function BuildingsPageWrapper() {
  return (
    <>
      <Header buildings={[]} />
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600">Загрузка каталога зданий...</div>
          </div>
        </div>
      }>
        <BuildingsPage />
      </Suspense>
      <EnhancedFooter />
    </>
  )
}

export default function BuildingsRoute() {
  return <BuildingsPageWrapper />
}