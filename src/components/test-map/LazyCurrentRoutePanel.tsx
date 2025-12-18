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
    <div className="p-4 bg-card border-2 border-border rounded-[var(--radius)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium font-display text-foreground">{title}</h3>
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
          <div className="h-6 bg-muted rounded-[var(--radius)] w-16 animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-4 bg-background rounded-[var(--radius)] p-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center p-2 bg-card rounded-[var(--radius)] border border-border border-l-2 border-l-[hsl(var(--map-primary))] animate-pulse">
            <div className="flex-shrink-0 w-6 h-6 bg-muted rounded-full mr-3"></div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-muted rounded mb-1 w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
            <div className="flex-shrink-0 w-6 h-6 bg-muted rounded-full"></div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="w-full h-12 bg-muted rounded-[var(--radius)] animate-pulse"></div>
        <div className="text-center">
          <div className="h-3 bg-muted rounded mx-auto mb-1 w-3/4 animate-pulse"></div>
          <div className="h-3 bg-muted rounded mx-auto w-1/2 animate-pulse"></div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-muted rounded animate-pulse"></div>
          <div className="h-8 bg-muted rounded animate-pulse"></div>
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
