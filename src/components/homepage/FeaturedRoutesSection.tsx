'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Route } from '@/types/route'

// Динамический импорт карты
const RoutePreviewMap = dynamic(() => import('./RoutePreviewMap'), {
  ssr: false,
  loading: () => (
    <div className="aspect-[4/3] bg-muted animate-pulse flex items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading map...</span>
    </div>
  )
})

interface FeaturedRoutesSectionProps {
  routes: Route[]
  loading?: boolean
}

// Transport mode icons and labels
const transportModes = {
  walking: { icon: '🚶', label: 'Walking', color: 'text-green-600' },
  cycling: { icon: '🚴', label: 'Cycling', color: 'text-blue-600' },
  driving: { icon: '🚗', label: 'Driving', color: 'text-purple-600' },
  public_transport: { icon: '🚌', label: 'Transit', color: 'text-orange-600' }
}

// Difficulty badges
const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700 border-green-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700 border-red-200' }
}

export default function FeaturedRoutesSection({ routes, loading }: FeaturedRoutesSectionProps) {
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null)

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4"></div>
            <div className="h-4 bg-muted rounded w-96 mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!routes || routes.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-background relative">
      {/* Section Header - Asymmetric */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-foreground"></div>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Featured Routes
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Featured <span className="font-light italic">Routes</span>
            </h2>
            <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
              Curated architectural walks from experts and community
            </p>
          </div>

          <Link
            href="/routes"
            className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
          >
            All Routes
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Routes Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route, index) => {
            const transport = transportModes[route.transport_mode || 'walking']
            const difficulty = difficultyConfig[route.difficulty_level || 'easy']
            const isHovered = hoveredRoute === route.id

            return (
              <Link
                key={route.id}
                href={`/routes/${route.id}`}
                className="group relative bg-card border border-border hover:border-foreground/20 transition-all duration-300 overflow-hidden"
                style={{
                  borderRadius: '2px',
                  // Staggered animation delay
                  animationDelay: `${index * 100}ms`
                }}
                onMouseEnter={() => setHoveredRoute(route.id)}
                onMouseLeave={() => setHoveredRoute(null)}
              >
                {/* Route Preview Map */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {route.route_geometry && route.route_points && route.route_points.length > 0 ? (
                    <RoutePreviewMap
                      geometry={route.route_geometry}
                      points={route.route_points}
                      isHovered={isHovered}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <svg className="w-12 h-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                  )}

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Transport & Difficulty badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-1 bg-background/90 backdrop-blur-sm border border-border text-xs font-medium flex items-center gap-1">
                      <span className={transport.color}>{transport.icon}</span>
                      <span>{transport.label}</span>
                    </span>
                    {route.difficulty_level && (
                      <span className={`px-2 py-1 border text-xs font-medium ${difficulty.color}`}>
                        {difficulty.label}
                      </span>
                    )}
                  </div>

                  {/* Author badge */}
                  {route.profiles && (
                    <div className="absolute top-3 right-3">
                      <div className="px-2 py-1 bg-background/90 backdrop-blur-sm border border-border text-xs font-medium flex items-center gap-1.5">
                        {route.profiles.role === 'expert' && <span className="text-yellow-600">★</span>}
                        {route.profiles.role === 'guide' && <span className="text-blue-600">◆</span>}
                        <span className="text-foreground/80">{route.profiles.role === 'expert' ? 'Expert' : route.profiles.role === 'guide' ? 'Guide' : 'User'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Route Info */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-foreground/80 transition-colors">
                    {route.title}
                  </h3>

                  {/* Description */}
                  {route.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {route.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                    {route.distance_km && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="font-medium">{route.distance_km.toFixed(1)} km</span>
                      </div>
                    )}

                    {route.estimated_duration_minutes && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">
                          {route.estimated_duration_minutes < 60
                            ? `${route.estimated_duration_minutes} min`
                            : `${Math.floor(route.estimated_duration_minutes / 60)}h ${route.estimated_duration_minutes % 60}m`}
                        </span>
                      </div>
                    )}

                    {route.route_points && route.route_points.length > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{route.route_points.length} points</span>
                      </div>
                    )}
                  </div>

                  {/* CTA - appears on hover */}
                  <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium flex items-center gap-2">
                      View Route
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Hover line accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </Link>
            )
          })}
        </div>

        {/* Mobile "View All" button */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/routes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
            style={{ borderRadius: '2px' }}
          >
            All Routes
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-1/3 h-1 bg-gradient-to-l from-border to-transparent"></div>
    </section>
  )
}
