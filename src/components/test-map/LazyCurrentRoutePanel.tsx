'use client'

import { Suspense, lazy } from 'react'
import { RouteIcon } from 'lucide-react'
import type { Building } from '@/types/building'

// Ленивая загрузка CurrentRoutePanel
const CurrentRoutePanel = lazy(() => import('./CurrentRoutePanel'))

interface LazyCurrentRoutePanelProps {
  routeBuildings: string[]
  buildings: Building[]
  onRemove: (buildingId: string) => void
  onClear: () => void
  onCreateRoute: () => void
  title?: string
}

// Компонент загрузки для текущего маршрута
function LoadingSkeleton({ title = "🗺️ Текущий маршрут" }: { title?: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full mr-3"></div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded mb-1 w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="text-center">
          <div className="h-3 bg-gray-200 rounded mx-auto mb-1 w-3/4 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded mx-auto w-1/2 animate-pulse"></div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export default function LazyCurrentRoutePanel(props: LazyCurrentRoutePanelProps) {
  return (
    <Suspense fallback={<LoadingSkeleton title={props.title} />}>
      <CurrentRoutePanel {...props} />
    </Suspense>
  )
}
