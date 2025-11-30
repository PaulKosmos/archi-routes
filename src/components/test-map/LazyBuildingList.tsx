'use client'

import { Suspense, lazy } from 'react'
import { Building2 } from 'lucide-react'
import type { Building } from '@/types/building'

// Ленивая загрузка BuildingList
const BuildingList = lazy(() => import('./BuildingList'))

interface LazyBuildingListProps {
  buildings: Building[]
  selectedBuilding: Building | null
  currentRouteBuildings: string[]
  onBuildingSelect: (building: Building) => void
  onAddToRoute: (buildingId: string) => void
  onStartRouteFrom: (buildingId: string) => void
  onRemoveFromRoute: (buildingId: string) => void
  title?: string
  maxHeight?: string
}

// Компонент загрузки
function LoadingSkeleton({ title = "🏛️ Здания" }: { title?: string }) {
  return (
    <div className="p-4">
      <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-3 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded mb-1 w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 w-2/3"></div>
                <div className="flex items-center space-x-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
              <div className="flex flex-col space-y-1 ml-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LazyBuildingList(props: LazyBuildingListProps) {
  return (
    <Suspense fallback={<LoadingSkeleton title={props.title} />}>
      <BuildingList {...props} />
    </Suspense>
  )
}
