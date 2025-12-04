// src/components/search/SearchResults.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import OptimizedImage from '@/components/OptimizedImage'
import { Building, Star, MapPin, Calendar, User, Eye, MessageSquare, MoreHorizontal, Grid, List } from 'lucide-react'
import { Building as BuildingType } from '@/hooks/useSearch'
import { highlightMatches } from '@/utils/searchUtils'

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
    const primaryImage = building.image_url || building.image_urls?.[0]
    // Валидация URL изображения
    const isValidImageUrl = primaryImage && (
      primaryImage.startsWith('http://') ||
      primaryImage.startsWith('https://') ||
      primaryImage.startsWith('/')
    )
    const hasImages = Boolean(isValidImageUrl)

    const highlightedName = query ? highlightMatches(building.name, query) : building.name
    const highlightedArchitect = query && building.architect 
      ? highlightMatches(building.architect, query) 
      : building.architect

    return (
      <Link href={`/buildings/${building.id}`} className="group block">
        <div className={`
          bg-white border border-gray-200 rounded-lg overflow-hidden 
          hover:shadow-lg transition-all duration-200 hover:border-gray-300
          ${viewMode === 'list' ? 'flex' : ''}
        `}>
          {/* Изображение */}
          <div className={`
            relative bg-gray-100
            ${viewMode === 'grid' ? 'aspect-[4/3]' : 'w-48 h-32 flex-shrink-0'}
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
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Building className="w-12 h-12" />
              </div>
            )}
            
            {/* Рейтинг в углу */}
            {building.rating > 0 && (
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs font-medium">{building.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Информация */}
          <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
            <div className="space-y-2">
              {/* Название */}
              <h3 
                className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2"
                dangerouslySetInnerHTML={{ __html: highlightedName }}
              />

              {/* Архитектор */}
              {building.architect && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span 
                    className="truncate"
                    dangerouslySetInnerHTML={{ __html: highlightedArchitect || '' }}
                  />
                </div>
              )}

              {/* Год и стиль */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  {building.year_built && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{building.year_built}</span>
                    </div>
                  )}
                  
                  {building.architectural_style && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                      {building.architectural_style}
                    </span>
                  )}
                </div>
              </div>

              {/* Адрес */}
              {building.address && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{building.address}</span>
                </div>
              )}

              {/* Статистика */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{building.view_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{building.review_count || 0}</span>
                  </div>
                </div>
                
                {hasImages && (
                  <div className="text-xs text-gray-400">
                    {Array.isArray(building.image_urls) 
                      ? `${building.image_urls.length} фото` 
                      : '1 фото'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-2">⚠️ Ошибка поиска</div>
        <div className="text-gray-600">{error}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Заголовок с результатами и переключателем вида */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {loading ? 'Поиск...' : `Найдено ${totalCount} ${
              totalCount === 1 ? 'здание' : 
              totalCount < 5 ? 'здания' : 'зданий'
            }`}
          </h2>
          {query && !loading && (
            <p className="text-sm text-gray-600 mt-1">
              по запросу "<span className="font-medium">{query}</span>"
            </p>
          )}
        </div>

        {/* Переключатель вида */}
        {results.length > 0 && (
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Сетка"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Список"
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
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-[4/3] rounded-t-lg"></div>
              <div className="bg-white border-x border-b border-gray-200 rounded-b-lg p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
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
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            </div>
          )}
        </>
      ) : !loading ? (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ничего не найдено
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {query 
              ? `По запросу "${query}" зданий не найдено. Попробуйте изменить поисковый запрос или фильтры.`
              : 'Попробуйте изменить фильтры или воспользуйтесь поиском.'
            }
          </p>
        </div>
      ) : null}

      {/* Индикатор загрузки при дозагрузке */}
      {loading && results.length > 0 && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            Загрузка дополнительных результатов...
          </div>
        </div>
      )}
    </div>
  )
}