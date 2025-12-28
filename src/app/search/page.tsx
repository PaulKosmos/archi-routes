// src/app/search/page.tsx
import { Suspense } from 'react'
import { SearchPage } from '@/components/search/SearchPage'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

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
    <>
      <Header buildings={[]} />
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-muted-foreground">Загрузка поиска...</div>
          </div>
        </div>
      }>
        <SearchPage />
      </Suspense>
      <EnhancedFooter />
    </>
  )
}

export default function SearchRoute() {
  return <SearchPageWrapper />
}