'use client'

import { Suspense, lazy } from 'react'
import { RouteIcon } from 'lucide-react'
import type { Route } from '@/types/building'

// Ленивая загрузка RouteList
const RouteList = lazy(() => import('./RouteList'))

interface LazyRouteListProps {
  routes: Route[]
  selectedRoute?: Route | null
  selectedRouteId?: string
  onRouteSelect?: (route: Route) => void
  onRouteClick?: (route: Route) => void
  onRouteDetails?: (route: Route) => void
  title?: string
  maxHeight?: string
}

// Компонент загрузки для маршрутов
function LoadingSkeleton({ title = "🛤️ Маршруты" }: { title?: string }) {
  return (
    <div className="p-4">
      <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-3 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded mb-2 w-4/5"></div>
                <div className="h-3 bg-gray-200 rounded mb-1 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                <div className="flex items-center space-x-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="h-3 bg-gray-200 rounded w-14"></div>
                  <div className="h-3 bg-gray-200 rounded w-18"></div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1 ml-2">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LazyRouteList(props: LazyRouteListProps) {
  const { routes, selectedRoute, selectedRouteId, onRouteSelect, onRouteClick, onRouteDetails, title, maxHeight } = props

  // Определяем выбранный маршрут
  const selected = selectedRoute || (selectedRouteId ? routes.find(r => r.id === selectedRouteId) : null) || null

  // Определяем обработчик выбора
  const handleSelect = onRouteSelect || onRouteClick || (() => {})

  return (
    <Suspense fallback={<LoadingSkeleton title={title} />}>
      <RouteList
        routes={routes}
        selectedRoute={selected}
        onRouteSelect={handleSelect}
        onRouteDetails={onRouteDetails}
        title={title}
        maxHeight={maxHeight}
      />
    </Suspense>
  )
}
