// components/blog/BlogArticleMap.tsx
// Интерактивная карта объектов из блога

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';
import { BlogContentBlock } from '@/types/blog';
import { Building } from '@/types/building';
import { extractBuildingIds } from '@/utils/blogBlocks';
import { ChevronDown, ChevronUp, Map as MapIcon, Building2 } from 'lucide-react';

// Динамический импорт MapLibre карты (миграция с Leaflet)
const MapLibreEnhanced = dynamic(() => import('@/components/MapLibreEnhanced'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-muted rounded-[var(--radius)] flex items-center justify-center">
      <div className="text-center">
        <MapIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    </div>
  ),
});

// ============================================================
// ТИПЫ
// ============================================================

interface BlogArticleMapProps {
  blocks: BlogContentBlock[];
  blogPostId?: string;
  blogPostTitle?: string;
  onBuildingClick?: (buildingId: string) => void;
  defaultCollapsed?: boolean;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BlogArticleMap({
  blocks,
  blogPostId,
  blogPostTitle,
  onBuildingClick,
  defaultCollapsed = false,
}: BlogArticleMapProps) {
  const supabase = useMemo(() => createClient(), []);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  // Извлекаем ID зданий из блоков
  const buildingIds = useMemo(() => extractBuildingIds(blocks), [blocks]);

  /**
   * Загружает данные зданий
   */
  useEffect(() => {
    const loadBuildings = async () => {
      if (buildingIds.length === 0) {
        setBuildings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .in('id', buildingIds)
        .eq('moderation_status', 'approved');

      if (data && !error) {
        setBuildings(data);
      } else {
        console.error('Error loading buildings for map:', error);
        setBuildings([]);
      }
      setIsLoading(false);
    };

    loadBuildings();
  }, [buildingIds, supabase]);

  /**
   * Обработчик клика по зданию
   */
  const handleBuildingClick = useCallback(
    (buildingId: string) => {
      setSelectedBuilding(buildingId);
      if (onBuildingClick) {
        onBuildingClick(buildingId);
      } else {
        // По умолчанию - переход на страницу карты
        window.location.href = `/map?building=${buildingId}`;
      }
    },
    [onBuildingClick]
  );

  /**
   * Обработчик открытия деталей здания
   */
  const handleBuildingDetails = useCallback((building: Building) => {
    // Открываем BuildingModal или переходим на страницу
    window.location.href = `/buildings/${building.id}`;
  }, []);

  // Если нет зданий, не показываем карту
  if (buildingIds.length === 0) {
    return null;
  }

  return (
    <div className="blog-article-map bg-card rounded-[var(--radius)] border border-border overflow-hidden my-8">
      {/* Заголовок с кнопкой сворачивания */}
      <div className="flex items-center justify-between px-6 py-4 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-[var(--radius)]">
            <MapIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground font-display">
              Объекты из статьи на карте
            </h3>
            <p className="text-sm text-muted-foreground">
              {buildings.length} {buildings.length === 1 ? 'объект' : 'объекта'} упомянуто в статье
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-[var(--radius)] transition-all"
          aria-label={isCollapsed ? 'Развернуть карту' : 'Свернуть карту'}
        >
          {isCollapsed ? (
            <ChevronDown className="h-6 w-6" />
          ) : (
            <ChevronUp className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Содержимое */}
      {!isCollapsed && (
        <div className="p-6">
          {isLoading ? (
            <div className="w-full h-[400px] bg-muted rounded-[var(--radius)] flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Загрузка объектов...</p>
              </div>
            </div>
          ) : buildings.length > 0 ? (
            <>
              {/* Список объектов */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {buildings.map((building) => (
                  <button
                    key={building.id}
                    onClick={() => handleBuildingClick(building.id)}
                    className={`flex items-start gap-3 p-3 rounded-[var(--radius)] border-2 transition-all text-left ${
                      selectedBuilding === building.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    {building.image_url ? (
                      <img
                        src={building.image_url}
                        alt={building.name}
                        className="w-12 h-12 object-cover rounded-[var(--radius)]"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-[var(--radius)] flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate text-sm">
                        {building.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {building.city}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Карта MapLibre */}
              <div className="rounded-[var(--radius)] overflow-hidden border-2 border-border">
                <MapLibreEnhanced
                  buildings={buildings}
                  routes={[]}
                  selectedBuilding={selectedBuilding}
                  onBuildingClick={handleBuildingClick}
                  onBuildingDetails={handleBuildingDetails}
                  showRoutes={false}
                  showBuildings={true}
                  hideLegend={true}
                  className="h-[400px]"
                />
              </div>

              {/* Подсказка */}
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-[var(--radius)]">
                <p className="text-sm text-foreground/80">
                  💡 <strong>Совет:</strong> Нажмите на объект, чтобы открыть его на полной карте.
                  Используйте кнопку "Составить маршрут" ниже, чтобы построить маршрут через выбранные объекты.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Объекты не найдены или находятся на модерации</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
