'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Building } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'

interface BuildingsGridProps {
  buildings: Building[]
  loading?: boolean
}

export default function BuildingsGrid({ buildings, loading }: BuildingsGridProps) {

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4"></div>
            <div className="h-4 bg-muted rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-80 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 bg-muted/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-foreground/5 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-foreground/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header - left-aligned with style filters */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="w-1 h-8 bg-foreground"></div>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Architecture Catalog
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Architectural <span className="font-light italic">Masterpieces</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Explore our collection from classic to contemporary architecture
              </p>
            </div>

            <button
              onClick={() => window.location.href = '/buildings'}
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:gap-3 transition-all"
            >
              All Buildings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Buildings Grid */}
        {buildings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {buildings.slice(0, 8).map((building) => (
                <Link
                  key={building.id}
                  href={`/buildings/${building.id}`}
                  className="group relative bg-card border border-border hover:border-foreground/30 transition-all overflow-hidden"
                  style={{ borderRadius: '2px' }}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {building.image_url ? (
                      <Image
                        src={getStorageUrl(building.image_url, 'photos')}
                        alt={building.name}
                        fill
                        className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <svg className="w-12 h-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-5a1 1 0 011-1h4a1 1 0 011 1v5M7 7h10M7 10h10M7 13h10" />
                        </svg>
                      </div>
                    )}

                    {/* Architectural style badge */}
                    {building.architectural_style && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-background/95 border border-border text-xs font-medium">
                          {building.architectural_style}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Building Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight">
                      {building.name}
                    </h3>

                    {/* Location */}
                    {building.city && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {building.city}{building.country && `, ${building.country}`}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-xs">
                      {building.architect && (
                        <span className="text-muted-foreground truncate mr-2">
                          {building.architect}
                        </span>
                      )}
                      {building.year_built && (
                        <span className="text-muted-foreground flex-shrink-0">
                          {building.year_built}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {building.rating && building.rating > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs mt-2 pt-2 border-t border-border">
                        <div className="flex items-center">
                          <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                          <span className="ml-1 font-medium text-foreground">
                            {building.rating.toFixed(1)}
                          </span>
                        </div>
                        {building.review_count && building.review_count > 0 && (
                          <span className="text-muted-foreground">
                            ({building.review_count})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                        Нет оценок
                      </div>
                    )}
                  </div>
                </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Buildings coming soon
            </p>
          </div>
        )}

        {/* Mobile "View All" Button */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/buildings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all"
            style={{ borderRadius: '2px' }}
          >
            All Buildings
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
