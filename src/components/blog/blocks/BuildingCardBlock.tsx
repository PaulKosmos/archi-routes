// components/blog/blocks/BuildingCardBlock.tsx
// Компактная карточка архитектурного объекта с выпадающей картой

'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BlogContentBlock } from '@/types/blog';
import { Calendar, User, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

// Динамический импорт карты MapLibre
const EnhancedMap = dynamic(() => import('@/components/MapLibreEnhanced'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-muted flex items-center justify-center">
      <MapPin className="h-12 w-12 text-muted-foreground animate-pulse" />
    </div>
  ),
});

// ============================================================
// ТИПЫ
// ============================================================

interface BuildingCardBlockProps {
  block: BlogContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BuildingCardBlock({ block }: BuildingCardBlockProps) {
  const { building_id, building, block_settings } = block;
  const [imageError, setImageError] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  if (!building_id || !building) {
    return (
      <div className="building-card-block my-8 p-6 bg-muted border border-border">
        <p className="text-muted-foreground text-center">Building not found</p>
      </div>
    );
  }

  const showDescription = block_settings?.showDescription !== false;
  const showArchitect = block_settings?.showArchitect !== false;
  const showYear = block_settings?.showYear !== false;
  const showStyle = block_settings?.showStyle !== false;

  // Формируем массив зданий для карты с полными данными
  const buildingsForMap = useMemo(() => [{
    ...building,
    country: building.city || '', // Use city as fallback
    style: building.architectural_style || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    latitude: building.latitude ?? 0,
    longitude: building.longitude ?? 0,
  }], [building]);

  return (
    <section className="building-card-block my-10 max-w-5xl mx-auto">
      <div className="border border-border bg-card overflow-hidden">
        {/* Верхняя часть - информация о здании */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Изображение слева */}
          {building.image_url && !imageError && (
            <div className="relative md:col-span-1">
              <img
                src={building.image_url}
                alt={building.name}
                className="w-full aspect-[4/3] md:aspect-auto md:h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Информация справа */}
          <div className={`${building.image_url && !imageError ? 'md:col-span-2' : 'md:col-span-3'} p-6`}>
            {/* Категория и локация */}
            <div className="flex items-center gap-2 mb-3">
              {showStyle && building.architectural_style && (
                <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-1">
                  {building.architectural_style}
                </span>
              )}
              {building.city && (
                <span className="text-xs text-muted-foreground">
                  {building.city}
                </span>
              )}
            </div>

            {/* Название */}
            <h3 className="text-xl font-bold font-display mb-2">
              {building.name}
            </h3>

            {/* Описание */}
            {showDescription && building.description && (
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">
                {building.description}
              </p>
            )}

            {/* Метаинформация */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {showYear && building.year_built && (
                <>
                  <span>{building.year_built}</span>
                  <span>•</span>
                </>
              )}
              {showArchitect && building.architect && (
                <>
                  <span>{building.architect}</span>
                  <span>•</span>
                </>
              )}
              {building.architectural_style && (
                <span>{building.architectural_style}</span>
              )}
            </div>
          </div>
        </div>

        {/* Выпадающая шторка с картой */}
        <div className="border-t border-border">
          {/* Кнопка разворачивания карты */}
          <button
            type="button"
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {isMapExpanded ? 'Hide map' : 'Show on map'}
              </span>
            </div>
            {isMapExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {/* Карта (разворачивается) */}
          {isMapExpanded && (
            <div className="p-4 bg-background">
              <div className="overflow-hidden border-2 border-border">
                <EnhancedMap
                  buildings={buildingsForMap}
                  routes={[]}
                  selectedBuilding={building_id}
                  onBuildingClick={() => {}}
                  onBuildingDetails={(building) => {
                    // Переход на страницу объекта
                    window.location.href = `/map?building=${building.id}`;
                  }}
                  showRoutes={false}
                  showBuildings={true}
                  hideLegend={true}
                  compactControls={true}
                  className="h-[300px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
