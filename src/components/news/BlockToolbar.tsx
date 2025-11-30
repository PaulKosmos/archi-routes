// components/news/BlockToolbar.tsx
// Панель инструментов для добавления блоков контента

'use client';

import { useState } from 'react';
import { ContentBlockType } from '@/types/news';
import { getBlockTypeName, getBlockTypeIcon } from '@/utils/newsBlocks';

// ============================================================
// ТИПЫ
// ============================================================

interface BlockToolbarProps {
  onAddBlock: (blockType: ContentBlockType) => void;
  onSave?: () => void;
  hasBlocks?: boolean;
}

// ============================================================
// КОНФИГУРАЦИЯ ТИПОВ БЛОКОВ
// ============================================================

const BLOCK_TYPES: Array<{
  type: ContentBlockType;
  description: string;
}> = [
  {
    type: 'text',
    description: 'Текстовый блок без изображений',
  },
  {
    type: 'text_image_right',
    description: 'Текст с изображением справа',
  },
  {
    type: 'image_text_left',
    description: 'Изображение слева, текст справа',
  },
  {
    type: 'two_images',
    description: 'Два изображения рядом',
  },
  {
    type: 'gallery',
    description: 'Галерея из нескольких изображений',
  },
];

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BlockToolbar({ onAddBlock, onSave, hasBlocks = false }: BlockToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Обработчик добавления блока
   */
  const handleAddBlock = (blockType: ContentBlockType) => {
    onAddBlock(blockType);
    setIsOpen(false);
  };

  return (
    <div className="block-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Левая часть - кнопка добавления блока */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Добавить блок
          </button>

          {/* Dropdown меню с типами блоков */}
          {isOpen && (
            <div className="absolute left-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
              <div className="py-1" role="menu">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Выберите тип блока
                  </p>
                </div>
                {BLOCK_TYPES.map(({ type, description }) => (
                  <button
                    key={type}
                    onClick={() => handleAddBlock(type)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    role="menuitem"
                  >
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">{getBlockTypeIcon(type)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getBlockTypeName(type)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Правая часть - действия */}
        <div className="flex items-center space-x-3">
          {/* Счетчик блоков */}
          {hasBlocks && (
            <span className="text-sm text-gray-500">
              Блоков: <span className="font-semibold text-gray-900">{hasBlocks}</span>
            </span>
          )}

          {/* Кнопка сохранения */}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Сохранить
            </button>
          )}
        </div>
      </div>

      {/* Overlay для закрытия dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
