import { Suspense } from 'react'
import Header from './Header'
import type { Building } from '../types/building'

interface HeaderWithSuspenseProps {
  buildings: Building[]
  onRouteCreated?: () => void
}

/**
 * Header wrapped in Suspense boundary to handle useSearchParams
 * Use this component in pages instead of direct Header import
 */
export default function HeaderWithSuspense(props: HeaderWithSuspenseProps) {
  return (
    <Suspense fallback={
      <div className="h-16 bg-card/80 backdrop-blur-md border-b border-border">
        {/* Minimal header skeleton during loading */}
      </div>
    }>
      <Header {...props} />
    </Suspense>
  )
}
