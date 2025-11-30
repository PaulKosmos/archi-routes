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
      alert('Выберите хотя бы один объект для маршрута');
      return;
    }

    if (!user) {
      alert('Войдите, чтобы создать маршрут');
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
      <div className="blog-route-builder bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden my-8">
        {/* Заголовок */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <RouteIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Составить маршрут по статье
              </h3>
              <p className="text-sm text-gray-600">
                Выберите объекты, которые хотите посетить, и мы построим оптимальный маршрут
              </p>
            </div>
          </div>
        </div>

        {/* Содержимое */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <RouteIcon className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-gray-500">Загрузка объектов...</p>
            </div>
          ) : buildings.length > 0 ? (
            <>
              {/* Управление выбором */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  Выбрано: <strong>{selectedBuildingIds.size}</strong> из <strong>{buildings.length}</strong>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Выбрать все
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Снять все
                  </button>
                </div>
              </div>

              {/* Список зданий с чекбоксами */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {buildings.map((building) => {
                  const isSelected = selectedBuildingIds.has(building.id);
                  return (
                    <label
                      key={building.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Чекбокс */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBuilding(building.id)}
                          className="sr-only"
                        />
                      </div>

                      {/* Изображение */}
                      {building.image_url ? (
                        <img
                          src={building.image_url}
                          alt={building.name}
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 mb-1">
                          {building.name}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{building.city}</span>
                        </div>
                        {building.architectural_style && (
                          <div className="text-xs text-gray-500 truncate">
                            {building.architectural_style}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Информация о выбранных объектах */}
              {selectedBuildingIds.size > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <RouteIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium mb-2">
                        Выбрано {selectedBuildingIds.size}{' '}
                        {selectedBuildingIds.size === 1
                          ? 'объект'
                          : selectedBuildingIds.size < 5
                          ? 'объекта'
                          : 'объектов'}
                      </p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div className="flex items-center gap-2">
                          <Footprints className="h-3 w-3" />
                          <span>Оптимальный порядок посещения будет рассчитан автоматически</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Расстояние и время в пути будут показаны после построения маршрута
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Кнопка создания маршрута */}
              <button
                type="button"
                onClick={handleCreateRoute}
                disabled={selectedBuildingIds.size === 0}
                className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <RouteIcon className="h-6 w-6" />
                <span>
                  Составить маршрут ({selectedBuildingIds.size}{' '}
                  {selectedBuildingIds.size === 1 ? 'объект' : 'объекта'})
                </span>
              </button>

              {/* Подсказка для неавторизованных */}
              {!user && (
                <p className="mt-3 text-sm text-center text-gray-600">
                  💡 Войдите в аккаунт, чтобы сохранить созданный маршрут
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
