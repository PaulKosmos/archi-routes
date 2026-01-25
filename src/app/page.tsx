import { Suspense } from 'react'
import HomePage from './HomePage'
import { PageLoader } from '@/components/ui/PageLoader'

export default function Page() {
  return (
    <Suspense fallback={<PageLoader message="Loading..." size="md" />}>
      <HomePage />
    </Suspense>
  )
}
