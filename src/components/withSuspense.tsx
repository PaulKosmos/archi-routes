import { Suspense, ComponentType } from 'react'

/**
 * HOC для оборачивания компонентов в Suspense boundary
 * Используется для страниц, которые используют useSearchParams через Header
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  const defaultFallback = (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Загрузка...</p>
      </div>
    </div>
  )

  return function WithSuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback || defaultFallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}
