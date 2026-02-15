// src/components/search/SearchResults.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import { Building, Star, MapPin, Calendar, User, Eye, MessageSquare, MoreHorizontal, Grid, List } from 'lucide-react'
import { Building as BuildingType } from '@/hooks/useSearch'
import { highlightMatches } from '@/utils/searchUtils'
import { getStorageUrl } from '@/lib/storage'

interface SearchResultsProps {
  results: BuildingType[]
  totalCount: number
  loading: boolean
  error: string | null
  query: string
  hasMore: boolean
  onLoadMore: () => void
  className?: string
}

export function SearchResults({
  results,
  totalCount,
  loading,
  error,
  query,
  hasMore,
  onLoadMore,
  className = ''
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Компонент карточки здания
  const BuildingCard = ({ building }: { building: BuildingType }) => {
    const rawImage = building.image_url || building.image_urls?.[0]
    const primaryImage = rawImage ? getStorageUrl(rawImage, 'photos') : ''
    const hasImages = Boolean(primaryImage)

    const highlightedName = query ? highlightMatches(building.name, query) : building.name
    const highlightedArchitect = query && building.architect
      ? highlightMatches(building.architect, query)
      : building.architect

    return (
      <Link href={`/buildings/${building.id}`} className="group block">
        <div className={`
          bg-card border border-border overflow-hidden flex
          hover:shadow-lg hover:-translate-y-1 transition-all duration-300
          ${viewMode === 'list' ? 'flex-row h-[200px]' : 'flex-col h-full'}
        `}>
          {/* Изображение */}
          <div className={`
            relative bg-muted
            ${viewMode === 'grid' ? 'h-48' : 'w-48 h-full flex-shrink-0'}
          `}>
            {hasImages ? (
              <OptimizedImage
                src={primaryImage!}
                alt={building.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                objectFit="cover"
                sizes={viewMode === 'grid' ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' : '192px'}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Building className="w-12 h-12" />
              </div>
            )}

            {/* Архитектурный стиль в правом верхнем углу */}
            {building.architectural_style && (
              <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm px-2 py-1">
                <span className="text-xs font-medium text-primary-foreground">{building.architectural_style}</span>
              </div>
            )}

            {/* Рейтинг в левом верхнем углу */}
            {building.rating > 0 && (
              <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm px-2 py-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs font-semibold font-metrics">{building.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Информация */}
          <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
            <div className="space-y-2">
              {/* Название */}
              <h3
                className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2"
                dangerouslySetInnerHTML={{ __html: highlightedName }}
              />

              {/* Архитектор */}
              {building.architect && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span
                    className="truncate"
                    dangerouslySetInnerHTML={{ __html: highlightedArchitect || '' }}
                  />
                </div>
              )}

              {/* Год постройки */}
              {building.year_built && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground font-metrics">
                  <Calendar className="w-4 h-4" />
                  <span>{building.year_built}</span>
                </div>
              )}

              {/* Адрес */}
              {building.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{building.address}</span>
                </div>
              )}
            </div>

            {/* Статистика */}
            <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-metrics">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{building.view_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{building.review_count || 0}</span>
                </div>
              </div>


              {hasImages && (() => {
                let count = building.image_url ? 1 : 0
                if (Array.isArray(building.image_urls)) {
                  count += building.image_urls.length
                }
                return (
                  <div className="text-xs text-muted-foreground/60">
                    {count} {count === 1 ? 'photo' : 'photos'}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-destructive font-semibold mb-2">Search Error</div>
        <div className="text-muted-foreground">{error}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Заголовок с результатами и переключателем вида */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {loading ? 'Searching...' : `Found ${totalCount} ${totalCount === 1 ? 'building' :
                totalCount < 5 ? 'buildings' : 'buildings'
              }`}
          </h2>
          {query && !loading && (
            <p className="text-sm text-muted-foreground mt-1">
              for query "<span className="font-medium">{query}</span>"
            </p>
          )}
        </div>

        {/* Переключатель вида */}
        {results.length > 0 && (
          <div className="flex items-center bg-muted p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              title="List"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Результаты */}
      {loading && results.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border overflow-hidden animate-pulse h-full flex flex-col">
              <div className="bg-muted h-48"></div>
              <div className="p-4 space-y-3 flex-1">
                <div className="h-5 bg-muted w-3/4"></div>
                <div className="h-4 bg-muted w-1/2"></div>
                <div className="h-4 bg-muted w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {results.map((building) => (
              <BuildingCard key={building.id} building={building} />
            ))}
          </div>

          {/* Кнопка "Загрузить ещё" */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : !loading ? (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            Nothing Found
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {query
              ? `No buildings found for "${query}". Try changing your search query or filters.`
              : 'Try changing filters or use search.'
            }
          </p>
        </div>
      ) : null}

      {/* Индикатор загрузки при дозагрузке */}
      {loading && results.length > 0 && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin"></div>
            Loading additional results...
          </div>
        </div>
      )}
    </div>
  )
}