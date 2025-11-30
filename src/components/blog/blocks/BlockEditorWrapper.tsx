// components/blog/blocks/BlockEditorWrapper.tsx
// Обертка для всех редакторов блоков блога с общими элементами управления

'use client';

import { useState } from 'react';
import { BlogContentBlockType } from '@/types/blog';
import { getBlockTypeName, getBlockTypeIcon } from '@/utils/blogBlocks';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface BlockEditorWrapperProps {
  blockType: BlogContentBlockType;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  errors?: string[];
  dragHandleProps?: any;
  readOnly?: boolean;
  children: React.ReactNode;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BlockEditorWrapper({
  blockType,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  dragHandleProps,
  readOnly = false,
  children,
}: BlockEditorWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`block-editor-wrapper bg-white border-2 rounded-lg shadow-sm mb-4 transition-all ${
        errors && errors.length > 0 ? 'border-red-300 bg-red-50/20' : 'border-gray-200 hover:border-green-300'
      }`}
    >
      {/* Заголовок блока с действиями */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        {/* Левая часть - тип блока и drag handle */}
        <div className="flex items-center space-x-3">
          {/* Drag handle */}
          {!readOnly && (
            <button
              type="button"
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-green-600 focus:outline-none transition-colors"
              title="Перетащите для изменения порядка"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          {/* Иконка типа блока */}
          <span className="text-xl">{getBlockTypeIcon(blockType)}</span>

          {/* Название типа блока */}
          <span className="text-sm font-medium text-gray-700">
            {getBlockTypeName(blockType)}
          </span>
        </div>

        {/* Правая часть - действия */}
        {!readOnly && (
          <div className="flex items-center space-x-1">
            {/* Свернуть/Развернуть */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
              title={isCollapsed ? "Развернуть блок" : "Свернуть блок"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            {/* Переместить вверх */}
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
                title="Переместить вверх"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}

            {/* Переместить вниз */}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
                title="Переместить вниз"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}

            {/* Дублировать */}
            <button
              type="button"
              onClick={onDuplicate}
              className="p-2 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50 focus:outline-none transition-colors"
              title="Дублировать блок"
            >
              <Copy className="h-4 w-4" />
            </button>

            {/* Удалить */}
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 focus:outline-none transition-colors"
              title="Удалить блок"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Ошибки валидации */}
      {errors && errors.length > 0 && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              • {error}
            </p>
          ))}
        </div>
      )}

      {/* Содержимое блока */}
      {!isCollapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
