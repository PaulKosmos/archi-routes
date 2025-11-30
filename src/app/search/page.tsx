// src/app/search/page.tsx
import { Suspense } from 'react'
import { SearchPage } from '@/components/search/SearchPage'

export const metadata = {
  title: 'Универсальный поиск - Архитектурная платформа',
  description: 'Найдите здания, маршруты, подкасты, статьи и новости об архитектуре в одном месте. Умный поиск по всему контенту платформы.',
  keywords: 'универсальный поиск, архитектура, здания, маршруты, подкасты, блог, новости, поиск',
  openGraph: {
    title: 'Универсальный поиск - Архитектурная платформа',
    description: 'Найдите здания, маршруты, подкасты, статьи и новости об архитектуре',
    type: 'website'
  }
}

// Компонент-обертка для работы с URL параметрами
function SearchPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Загрузка поиска...</div>
        </div>
      </div>
    }>
      <SearchPage />
    </Suspense>
  )
}

export default function SearchRoute() {
  return <SearchPageWrapper />
}