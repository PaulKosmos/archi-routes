// components/blog/BlocksSidebarPanel.tsx
// Правая боковая панель с типами блоков для drag & drop

'use client';

import { BlogContentBlockType } from '@/types/blog';
import {
  FileText,
  ImageIcon,
  Images,
  LayoutGrid,
  Building2,
  Image as ImageIconAlt,
} from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface BlockTypeItem {
  type: BlogContentBlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface BlocksSidebarPanelProps {
  onAddBlock: (blockType: BlogContentBlockType) => void;
}

// ============================================================
// КОНФИГУРАЦИЯ ТИПОВ БЛОКОВ
// ============================================================

const BLOCK_TYPES: BlockTypeItem[] = [
  {
    type: 'text',
    label: 'Текст',
    description: 'Простой текстовый блок',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
  },
  {
    type: 'text_image_right',
    label: 'Текст + Фото справа',
    description: 'Текст слева, изображение справа',
    icon: <LayoutGrid className="w-5 h-5" />,
    color: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
  },
  {
    type: 'image_text_left',
    label: 'Фото + Текст слева',
    description: 'Изображение слева, текст справа',
    icon: <LayoutGrid className="w-5 h-5 transform scale-x-[-1]" />,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
  },
  {
    type: 'full_width_image',
    label: 'Широкое фото',
    description: 'Изображение на всю ширину',
    icon: <ImageIcon className="w-5 h-5" />,
    color: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
  },
  {
    type: 'gallery',
    label: 'Галерея',
    description: 'Несколько изображений',
    icon: <Images className="w-5 h-5" />,
    color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
  },
  {
    type: 'building_card',
    label: 'Объект',
    description: 'Карточка здания/места',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
  },
];

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BlocksSidebarPanel({ onAddBlock }: BlocksSidebarPanelProps) {
  const handleBlockClick = (blockType: BlogContentBlockType) => {
    onAddBlock(blockType);
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-40 pt-20">
      {/* Заголовок панели */}
      <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h3 className="font-semibold text-gray-900 text-lg">Добавить блок</h3>
        <p className="text-sm text-gray-500 mt-1">
          Нажмите на блок, чтобы добавить его в конец
        </p>
      </div>

      {/* Список типов блоков */}
      <div className="px-4 py-6 space-y-3">
        {BLOCK_TYPES.map((blockType) => (
          <button
            key={blockType.type}
            onClick={() => handleBlockClick(blockType.type)}
            className={`
              w-full p-4 rounded-lg border-2 transition-all duration-200
              ${blockType.color}
              cursor-pointer transform hover:scale-105 active:scale-95
              flex flex-col items-start gap-2
              group relative overflow-hidden
            `}
          >
            {/* Фоновый градиент при наведении */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Иконка и заголовок */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/50 rounded-lg">
                {blockType.icon}
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">{blockType.label}</div>
                <div className="text-xs opacity-75 mt-0.5">{blockType.description}</div>
              </div>
            </div>

            {/* Индикатор добавления */}
            <div className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity relative z-10 ml-auto">
              <span>Нажмите для добавления</span>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Подсказка внизу */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium">Совет:</p>
            <p className="mt-1">После добавления вы можете перемещать блоки, редактировать содержимое и удалять ненужные.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
