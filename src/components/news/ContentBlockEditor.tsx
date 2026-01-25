// components/news/ContentBlockEditor.tsx
// Главный компонент редактора блоков контента с drag & drop

'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ContentBlock, ContentBlockType, CreateContentBlock } from '@/types/news';
import { createBlockByType, reorderBlocks } from '@/utils/newsBlocks';
import { validateSingleBlock } from '@/utils/newsValidation';
import BlockToolbar from './BlockToolbar';
import TextBlockEditor from './blocks/TextBlockEditor';
import TextImageRightBlockEditor from './blocks/TextImageRightBlockEditor';
import ImageTextLeftBlockEditor from './blocks/ImageTextLeftBlockEditor';
import TwoImagesBlockEditor from './blocks/TwoImagesBlockEditor';
import GalleryBlockEditor from './blocks/GalleryBlockEditor';

// ============================================================
// ТИПЫ
// ============================================================

interface ContentBlockEditorProps {
  newsId: string;
  initialBlocks?: ContentBlock[] | CreateContentBlock[];
  onChange: (blocks: CreateContentBlock[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ContentBlockEditor({
  newsId,
  initialBlocks = [],
  onChange,
  onSave,
  readOnly = false,
}: ContentBlockEditorProps) {
  const [blocks, setBlocks] = useState<CreateContentBlock[]>(
    initialBlocks.map((block) => ({
      news_id: newsId,
      order_index: block.order_index,
      block_type: block.block_type,
      content: block.content,
      images_data: block.images_data,
      block_settings: block.block_settings,
    }))
  );

  const [errors, setErrors] = useState<Record<number, string[]>>({});

  // Настройка сенсоров для drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Начинать drag только после движения на 8px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ============================================================
  // ОБРАБОТЧИКИ БЛОКОВ
  // ============================================================

  /**
   * Добавляет новый блок
   */
  const handleAddBlock = useCallback(
    (blockType: ContentBlockType) => {
      const newBlock = createBlockByType(blockType, newsId, blocks.length);
      const updatedBlocks = [...blocks, newBlock];
      setBlocks(updatedBlocks);
      onChange(updatedBlocks);
    },
    [blocks, newsId, onChange]
  );

  /**
   * Обновляет блок
   */
  const handleUpdateBlock = useCallback(
    (index: number, updates: Partial<CreateContentBlock>) => {
      const updatedBlocks = blocks.map((block, i) =>
        i === index ? { ...block, ...updates } : block
      );
      setBlocks(updatedBlocks);
      onChange(updatedBlocks);

      // Валидация
      const validation = validateSingleBlock({ ...blocks[index], ...updates } as ContentBlock);
      if (!validation.valid) {
        setErrors((prev) => ({
          ...prev,
          [index]: validation.errors.map((e) => e.message),
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[index];
          return newErrors;
        });
      }
    },
    [blocks, onChange]
  );

  /**
   * Удаляет блок
   */
  const handleDeleteBlock = useCallback(
    (index: number) => {
      const updatedBlocks = blocks.filter((_, i) => i !== index);
      const reorderedBlocks = reorderBlocks(updatedBlocks);
      setBlocks(reorderedBlocks);
      onChange(reorderedBlocks);

      // Очищаем ошибки для удаленного блока
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    },
    [blocks, onChange]
  );

  /**
   * Дублирует блок
   */
  const handleDuplicateBlock = useCallback(
    (index: number) => {
      const blockToDuplicate = blocks[index];
      const newBlock = {
        ...blockToDuplicate,
        order_index: blocks.length,
      };
      const updatedBlocks = [...blocks, newBlock];
      setBlocks(updatedBlocks);
      onChange(updatedBlocks);
    },
    [blocks, onChange]
  );

  /**
   * Перемещает блок вверх
   */
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updatedBlocks = [...blocks];
      [updatedBlocks[index - 1], updatedBlocks[index]] = [
        updatedBlocks[index],
        updatedBlocks[index - 1],
      ];
      const reorderedBlocks = reorderBlocks(updatedBlocks);
      setBlocks(reorderedBlocks);
      onChange(reorderedBlocks);
    },
    [blocks, onChange]
  );

  /**
   * Перемещает блок вниз
   */
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === blocks.length - 1) return;
      const updatedBlocks = [...blocks];
      [updatedBlocks[index], updatedBlocks[index + 1]] = [
        updatedBlocks[index + 1],
        updatedBlocks[index],
      ];
      const reorderedBlocks = reorderBlocks(updatedBlocks);
      setBlocks(reorderedBlocks);
      onChange(reorderedBlocks);
    },
    [blocks, onChange]
  );

  /**
   * Обработчик завершения drag & drop
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((_, i) => i === Number(active.id));
        const newIndex = blocks.findIndex((_, i) => i === Number(over.id));

        const reordered = arrayMove(blocks, oldIndex, newIndex);
        const reorderedBlocks = reorderBlocks(reordered);
        setBlocks(reorderedBlocks);
        onChange(reorderedBlocks);
      }
    },
    [blocks, onChange]
  );

  // ============================================================
  // РЕНДЕР РЕДАКТОРА БЛОКА
  // ============================================================

  /**
   * Рендерит редактор в зависимости от типа блока
   */
  const renderBlockEditor = (block: CreateContentBlock, index: number) => {
    const commonProps = {
      block,
      onChange: (updates: Partial<CreateContentBlock>) => handleUpdateBlock(index, updates),
      onDelete: () => handleDeleteBlock(index),
      onDuplicate: () => handleDuplicateBlock(index),
      onMoveUp: index > 0 ? () => handleMoveUp(index) : undefined,
      onMoveDown: index < blocks.length - 1 ? () => handleMoveDown(index) : undefined,
      errors: errors[index],
      readOnly,
    };

    switch (block.block_type) {
      case 'text':
        return <TextBlockEditor key={index} {...commonProps} />;
      case 'text_image_right':
        return <TextImageRightBlockEditor key={index} {...commonProps} />;
      case 'image_text_left':
        return <ImageTextLeftBlockEditor key={index} {...commonProps} />;
      case 'two_images':
        return <TwoImagesBlockEditor key={index} {...commonProps} />;
      case 'gallery':
        return <GalleryBlockEditor key={index} {...commonProps} />;
      default:
        return null;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="content-block-editor">
      {/* Toolbar для добавления блоков */}
      {!readOnly && (
        <BlockToolbar
          onAddBlock={handleAddBlock}
          onSave={onSave}
          hasBlocks={blocks.length > 0}
        />
      )}

      {/* Список блоков с drag & drop */}
      <div className="blocks-container mt-6 space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              Добавьте первый блок контента, используя панель инструментов выше
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blocks.map((_, i) => i)} strategy={verticalListSortingStrategy}>
              {blocks.map((block, index) => (
                <div key={index} id={String(index)}>
                  {renderBlockEditor(block, index)}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Индикатор ошибок */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            Ошибки валидации:
          </h3>
          <ul className="text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([index, blockErrors]) => (
              <li key={index}>
                <strong>Блок {Number(index) + 1}:</strong> {blockErrors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
