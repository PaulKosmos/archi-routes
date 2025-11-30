// components/blog/BlockToolbar.tsx
// Панель для добавления новых блоков в блог

'use client';

import { useState } from 'react';
import { BlogContentBlockType } from '@/types/blog';
import {
  getBlockTypeName,
  getBlockTypeIcon,
  getBlockTypeDescription
} from '@/utils/blogBlocks';
import { Plus, X } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface BlockToolbarProps {
  onAddBlock: (blockType: BlogContentBlockType) => void;
  disabled?: boolean;
}

// Доступные типы блоков
const BLOCK_TYPES: BlogContentBlockType[] = [
  'text',
  'text_image_right',
  'image_text_left',
  'full_width_image',
  'gallery',
  'building_card'
];

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BlockToolbar({ onAddBlock, disabled = false }: BlockToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddBlock = (blockType: BlogContentBlockType) => {
    onAddBlock(blockType);
    setIsOpen(false);
  };

  return (
    <div className="block-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        {/* Кнопка добавления блока */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isOpen ? (
            <>
              <X className="h-5 w-5" />
              <span>Закрыть</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>Добавить блок</span>
            </>
          )}
        </button>

        {/* Dropdown меню с типами блоков */}
        {isOpen && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BLOCK_TYPES.map((blockType) => (
              <button
                key={blockType}
                type="button"
                onClick={() => handleAddBlock(blockType)}
                className="flex flex-col items-start p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
              >
                {/* Иконка и название */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getBlockTypeIcon(blockType)}</span>
                  <span className="font-medium text-gray-900 group-hover:text-green-700">
                    {getBlockTypeName(blockType)}
                  </span>
                </div>

                {/* Описание */}
                <p className="text-sm text-gray-600 group-hover:text-gray-700">
                  {getBlockTypeDescription(blockType)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
