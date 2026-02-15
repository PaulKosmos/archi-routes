// components/blog/BlogRouteBuilder.tsx
// Построение маршрутов из объектов блога

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { BlogContentBlock } from '@/types/blog';
import { Building } from '@/types/building';
import { extractBuildingIds } from '@/utils/blogBlocks';
import { Route as RouteIcon, MapPin, Check, Building2, Clock, Footprints } from 'lucide-react';
import dynamic from 'next/dynamic';

// Динамический импорт RouteCreator
const RouteCreator = dynamic(() => import('@/components/RouteCreator'), {
  ssr: false,
});

// ============================================================
// ТИПЫ
// ============================================================

interface BlogRouteBuilderProps {
  blocks: BlogContentBlock[];
  blogPostId: string;
  blogPostTitle?: string;
  user: any;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BlogRouteBuilder({
  blocks,
  blogPostId,
  blogPostTitle,
  user,
}: BlogRouteBuilderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRouteCreatorOpen, setIsRouteCreatorOpen] = useState(false);

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
        // По умолчанию выбираем все здания
        setSelectedBuildingIds(new Set(data.map((b) => b.id)));
      } else {
        console.error('Error loading buildings for route:', error);
        setBuildings([]);
      }
      setIsLoading(false);
    };

    loadBuildings();
  }, [buildingIds, supabase]);

  /**
   * Переключает выбор здания
   */
  const toggleBuilding = useCallback((buildingId: string) => {
    setSelectedBuildingIds((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  }, []);

  /**
   * Выбрать все здания
   */
  const selectAll = useCallback(() => {
    setSelectedBuildingIds(new Set(buildings.map((b) => b.id)));
  }, [buildings]);

  /**
   * Снять выбор со всех зданий
   */
  const deselectAll = useCallback(() => {
    setSelectedBuildingIds(new Set());
  }, []);

  /**
   * Открыть создатель маршрута
   */
  const handleCreateRoute = useCallback(() => {
    if (selectedBuildingIds.size === 0) {
      alert('Select at least one building for the route');
      return;
    }

    if (!user) {
      alert('Sign in to create a route');
      return;
    }

    setIsRouteCreatorOpen(true);
  }, [selectedBuildingIds, user]);

  const selectedBuildings = buildings.filter((b) => selectedBuildingIds.has(b.id));

  // Если нет зданий, не показываем компонент
  if (buildingIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="blog-route-builder border border-border bg-card overflow-hidden my-10 max-w-5xl mx-auto">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-xl font-bold font-display mb-2">
            Составить маршрут по статье
          </h3>
          <p className="text-sm text-muted-foreground">
            Выберите объекты для маршрута
          </p>
        </div>

        {/* Содержимое */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <RouteIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">Загрузка объектов...</p>
            </div>
          ) : buildings.length > 0 ? (
            <>
              {/* Управление выбором */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  Выбрано: <strong className="text-foreground">{selectedBuildingIds.size}</strong> из <strong className="text-foreground">{buildings.length}</strong>
                </div>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-primary hover:underline font-medium"
                  >
                    Выбрать все
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Снять все
                  </button>
                </div>
              </div>

              {/* Список зданий с чекбоксами - упрощенный */}
              <div className="space-y-2 mb-6">
                {buildings.map((building) => {
                  const isSelected = selectedBuildingIds.has(building.id);
                  return (
                    <label
                      key={building.id}
                      className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {/* Чекбокс */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-border bg-background'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBuilding(building.id)}
                          className="sr-only"
                        />
                      </div>

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">
                          {building.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {building.city}
                          {building.architectural_style && ` • ${building.architectural_style}`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Кнопка создания маршрута */}
              <button
                type="button"
                onClick={handleCreateRoute}
                disabled={selectedBuildingIds.size === 0}
                className="w-full py-3 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RouteIcon className="h-5 w-5" />
                <span>
                  Составить маршрут
                  {selectedBuildingIds.size > 0 && ` (${selectedBuildingIds.size})`}
                </span>
              </button>

              {/* Подсказка для неавторизованных */}
              {!user && (
                <p className="mt-3 text-xs text-center text-muted-foreground">
                  Войдите в аккаунт, чтобы сохранить созданный маршрут
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Объекты не найдены или находятся на модерации</p>
            </div>
          )}
        </div>
      </div>

      {/* RouteCreator модальное окно */}
      {isRouteCreatorOpen && (
        <RouteCreator
          isOpen={isRouteCreatorOpen}
          onClose={() => setIsRouteCreatorOpen(false)}
          user={user}
          buildings={selectedBuildings}
          initialMode="manual"
        />
      )}
    </>
  );
}
