'use client';

import React, { useState } from 'react';
import { CARD_SIZE_CONFIGS, CardSizeConfig } from '@/types/news';

interface CardSizePopoverProps {
  currentColSpan: number;
  currentRowSpan: number;
  onSelectSize: (config: CardSizeConfig) => void;
  onClose: () => void;
}

/**
 * CardSizePopover - Popover для выбора размера карточки
 *
 * Отображает 4 кнопки с визуальными иконками размеров:
 * - 1×1 (□) - Стандартная карточка (medium)
 * - 2×1 (▭) - Широкая карточка (large)
 * - 1×2 (▯) - Высокая карточка (large)
 * - 2×2 (▢) - Крупная featured карточка (featured)
 *
 * Bauhaus минималистичный дизайн.
 */
export default function CardSizePopover({
  currentColSpan,
  currentRowSpan,
  onSelectSize,
  onClose
}: CardSizePopoverProps) {
  const [hoveredConfig, setHoveredConfig] = useState<CardSizeConfig | null>(null);

  const handleSelectSize = (config: CardSizeConfig) => {
    onSelectSize(config);
    onClose();
  };

  const isCurrentSize = (config: CardSizeConfig) => {
    return config.colSpan === currentColSpan && config.rowSpan === currentRowSpan;
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border-2 border-gray-900 p-4 min-w-[280px]">
      {/* Заголовок */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          Размер карточки
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Текущий: {currentColSpan}×{currentRowSpan}
        </p>
      </div>

      {/* Сетка кнопок размеров */}
      <div className="grid grid-cols-2 gap-3">
        {CARD_SIZE_CONFIGS.map((config) => {
          const isCurrent = isCurrentSize(config);
          const isHovered = hoveredConfig?.label === config.label;

          return (
            <button
              key={config.label}
              onClick={() => handleSelectSize(config)}
              onMouseEnter={() => setHoveredConfig(config)}
              onMouseLeave={() => setHoveredConfig(null)}
              className={`
                relative
                flex flex-col items-center justify-center
                p-4
                border-2
                rounded-lg
                transition-all duration-200
                ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-900 hover:bg-gray-50'
                }
                ${isHovered ? 'shadow-md transform scale-105' : ''}
              `}
              aria-label={`Размер ${config.label}: ${config.description}`}
            >
              {/* Иконка размера */}
              <div
                className={`
                  text-4xl mb-2
                  ${isCurrent ? 'text-blue-600' : 'text-gray-700'}
                `}
              >
                {config.icon}
              </div>

              {/* Лейбл */}
              <div
                className={`
                  text-sm font-bold
                  ${isCurrent ? 'text-blue-600' : 'text-gray-900'}
                `}
              >
                {config.label}
              </div>

              {/* Описание */}
              <div className="text-xs text-gray-600 mt-1 text-center">
                {config.description}
              </div>

              {/* Индикатор текущего выбора */}
              {isCurrent && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Подсказка внизу */}
      {hoveredConfig && (
        <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
          <p className="text-xs text-gray-700">
            <span className="font-bold">{hoveredConfig.label}:</span>{' '}
            {hoveredConfig.description}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Тип: {hoveredConfig.cardSize}
          </p>
        </div>
      )}

      {/* Кнопка закрытия */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
