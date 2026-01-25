// src/app/search/page.tsx
import { Suspense } from 'react'
import { SearchPage } from '@/components/search/SearchPage'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { PageLoader } from '@/components/ui/PageLoader'

export const metadata = {
  title: 'Universal Search - Architecture Platform',
  description: 'Find buildings, routes, podcasts, articles and architecture news in one place. Smart search across all platform content.',
  keywords: 'universal search, architecture, buildings, routes, podcasts, blog, news, search',
  openGraph: {
    title: 'Universal Search - Architecture Platform',
    description: 'Find buildings, routes, podcasts, articles and architecture news',
    type: 'website'
  }
}

// Компонент-обертка для работы с URL параметрами
function SearchPageWrapper() {
  return (
    <>
      <Header buildings={[]} />
      <Suspense fallback={<PageLoader message="Loading search..." size="md" />}>
        <SearchPage />
      </Suspense>
      <EnhancedFooter />
    </>
  )
}

export default function SearchRoute() {
  return <SearchPageWrapper />
}