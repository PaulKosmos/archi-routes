// components/news/blocks/BlockEditorWrapper.tsx
// Обертка для всех редакторов блоков с общими элементами управления

'use client';

import { useState } from 'react';
import { ContentBlockType } from '@/types/news';
import { getBlockTypeName, getBlockTypeIcon } from '@/utils/newsBlocks';

// ============================================================
// ТИПЫ
// ============================================================

interface BlockEditorWrapperProps {
  blockType: ContentBlockType;
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
      className={`block-editor-wrapper bg-white border rounded-lg shadow-sm ${
        errors && errors.length > 0 ? 'border-red-300' : 'border-gray-200'
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
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Перетащите для изменения порядка"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8h16M4 16h16"
                />
              </svg>
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
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
              title={isCollapsed ? "Развернуть блок" : "Свернуть блок"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isCollapsed ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                )}
              </svg>
            </button>

            {/* Переместить вверх */}
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Переместить вверх"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
            )}

            {/* Переместить вниз */}
            {onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Переместить вниз"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}

            {/* Дублировать */}
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Дублировать блок"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>

            {/* Удалить */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-red-400 hover:text-red-600 focus:outline-none"
              title="Удалить блок"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Содержимое блока */}
      {!isCollapsed && (
        <div className="p-4">{children}</div>
      )}

      {/* Ошибки валидации */}
      {errors && errors.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
