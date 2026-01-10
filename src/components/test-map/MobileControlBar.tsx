'use client'

import { Filter, List, MapPin } from 'lucide-react'

interface MobileControlBarProps {
  onShowFilters: () => void
  onShowBuildings: () => void
  onShowRoutes: () => void
  buildingsCount: number
  routesCount: number
}

export default function MobileControlBar({
  onShowFilters,
  onShowBuildings,
  onShowRoutes,
  buildingsCount,
  routesCount
}: MobileControlBarProps) {
  return (
    <div className="
      md:hidden
      fixed bottom-4 left-4 right-4
      bg-card/95 backdrop-blur-md
      border-2 border-border
      rounded-[var(--radius)]
      shadow-lg
      z-30
      p-2
    ">
      <div className="flex items-center justify-around gap-2">
        {/* Filters button */}
        <button
          onClick={onShowFilters}
          className="
            flex-1 flex flex-col items-center gap-1
            px-3 py-2
            hover:bg-muted
            rounded-[var(--radius)]
            transition-colors
          "
        >
          <Filter className="w-5 h-5 text-[hsl(var(--map-primary))]" />
          <span className="text-xs font-medium">Filters</span>
        </button>

        {/* Buildings button */}
        <button
          onClick={onShowBuildings}
          className="
            flex-1 flex flex-col items-center gap-1
            px-3 py-2
            hover:bg-muted
            rounded-[var(--radius)]
            transition-colors
          "
        >
          <MapPin className="w-5 h-5 text-[hsl(var(--map-primary))]" />
          <span className="text-xs font-medium">
            Buildings
            {buildingsCount > 0 && (
              <span className="ml-1 text-[hsl(var(--map-primary))]">
                ({buildingsCount})
              </span>
            )}
          </span>
        </button>

        {/* Routes button */}
        <button
          onClick={onShowRoutes}
          className="
            flex-1 flex flex-col items-center gap-1
            px-3 py-2
            hover:bg-muted
            rounded-[var(--radius)]
            transition-colors
          "
        >
          <List className="w-5 h-5 text-[hsl(var(--map-primary))]" />
          <span className="text-xs font-medium">
            Routes
            {routesCount > 0 && (
              <span className="ml-1 text-[hsl(var(--map-primary))]">
                ({routesCount})
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
