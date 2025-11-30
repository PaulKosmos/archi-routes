// components/blog/blocks/BuildingCardBlock.tsx
// Интерактивная карточка архитектурного объекта с зелёными кнопками

'use client';

import { BlogContentBlock } from '@/types/blog';
import { MapPin, Plus, Calendar, User } from 'lucide-react';
import { useState } from 'react';

// ============================================================
// ТИПЫ
// ============================================================

interface BuildingCardBlockProps {
  block: BlogContentBlock;
  onShowOnMap?: (buildingId: string) => void;
  onAddToRoute?: (buildingId: string) => void;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BuildingCardBlock({
  block,
  onShowOnMap,
  onAddToRoute
}: BuildingCardBlockProps) {
  const { building_id, building, block_settings } = block;
  const [imageError, setImageError] = useState(false);

  if (!building_id || !building) {
    return (
      <div className="building-card-block my-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-center">Объект не найден</p>
      </div>
    );
  }

  const showDescription = block_settings?.showDescription !== false;
  const showArchitect = block_settings?.showArchitect !== false;
  const showYear = block_settings?.showYear !== false;
  const showStyle = block_settings?.showStyle !== false;
  const showMapButton = block_settings?.showMapButton !== false;
  const showRouteButton = block_settings?.showRouteButton !== false;
  const cardLayout = block_settings?.cardLayout || 'horizontal';

  const handleShowOnMap = () => {
    if (onShowOnMap && building_id) {
      onShowOnMap(building_id);
    } else {
      // Fallback - открыть /map?building=ID
      window.location.href = `/map?building=${building_id}`;
    }
  };

  const handleAddToRoute = () => {
    if (onAddToRoute && building_id) {
      onAddToRoute(building_id);
    } else {
      // TODO: Открыть модальное окно добавления в маршрут
      console.log('Добавить в маршрут:', building_id);
    }
  };

  // Вертикальная раскладка
  if (cardLayout === 'vertical') {
    return (
      <div className="building-card-block my-10 max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          {/* Изображение */}
          {building.image_url && !imageError && (
            <div className="relative h-64 overflow-hidden">
              <img
                src={building.image_url}
                alt={building.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Контент */}
          <div className="p-6">
            {/* Название */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {building.name}
            </h3>

            {/* Метаинформация */}
            <div className="space-y-2 mb-4">
              {showArchitect && building.architect && (
                <div className="flex items-center text-gray-600 text-sm">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{building.architect}</span>
                </div>
              )}
              {showYear && building.year_built && (
                <div className="flex items-center text-gray-600 text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{building.year_built}</span>
                </div>
              )}
              {showStyle && building.architectural_style && (
                <div className="flex items-center text-gray-600 text-sm">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs">
                    {building.architectural_style}
                  </span>
                </div>
              )}
            </div>

            {/* Описание */}
            {showDescription && building.description && (
              <p className="text-gray-700 text-sm mb-6 line-clamp-3">
                {building.description}
              </p>
            )}

            {/* Зелёные кнопки */}
            <div className="flex gap-3">
              {showMapButton && (
                <button
                  onClick={handleShowOnMap}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <MapPin className="h-5 w-5" />
                  <span>На карте</span>
                </button>
              )}
              {showRouteButton && (
                <button
                  onClick={handleAddToRoute}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <Plus className="h-5 w-5" />
                  <span>В маршрут</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Горизонтальная раскладка (по умолчанию)
  return (
    <div className="building-card-block my-10 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <div className="flex flex-col md:flex-row">
          {/* Изображение */}
          {building.image_url && !imageError && (
            <div className="relative md:w-2/5 h-64 md:h-auto overflow-hidden flex-shrink-0">
              <img
                src={building.image_url}
                alt={building.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Контент */}
          <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
            <div>
              {/* Название */}
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                {building.name}
              </h3>

              {/* Метаинформация */}
              <div className="flex flex-wrap gap-4 mb-4">
                {showArchitect && building.architect && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{building.architect}</span>
                  </div>
                )}
                {showYear && building.year_built && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{building.year_built}</span>
                  </div>
                )}
                {showStyle && building.architectural_style && (
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                    {building.architectural_style}
                  </span>
                )}
              </div>

              {/* Описание */}
              {showDescription && building.description && (
                <p className="text-gray-700 text-base mb-6 line-clamp-4">
                  {building.description}
                </p>
              )}
            </div>

            {/* Зелёные кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {showMapButton && (
                <button
                  onClick={handleShowOnMap}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Показать на карте</span>
                </button>
              )}
              {showRouteButton && (
                <button
                  onClick={handleAddToRoute}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  <span>Добавить в маршрут</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
