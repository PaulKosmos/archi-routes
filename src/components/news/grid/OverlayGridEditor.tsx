/**
 * @deprecated This component is deprecated and will be removed in a future version.
 * Use GridEditor instead for inline editing without overlay.
 *
 * DEPRECATION NOTICE (13.11.2025):
 * This overlay-based editor has been replaced with an inline editor (GridEditor)
 * that provides better UX with real-time preview and no modal overlay.
 *
 * Migration: Replace <OverlayGridEditor /> with <GridEditor /> in your code.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit, Trash2, GripVertical, Save, X as XIcon } from 'lucide-react';
import { useNewsGridAPI } from '@/hooks/useNewsGridAPI';
import GridBlockRenderer from './GridBlockRenderer';
import BlockTypeSelector from './BlockTypeSelector';
import NewsSelector from './NewsSelector';
import {
  NewsGridBlockWithNews,
  NewsGridBlockType,
  getGridBlockNewsCount,
  getGridBlockConfig
} from '@/types/news';

interface OverlayGridEditorProps {
  blocks: NewsGridBlockWithNews[];
  onSave?: () => void;
  onCancel?: () => void;
  onBlocksChange?: (blocks: NewsGridBlockWithNews[]) => void;
}

export default function OverlayGridEditor({
  blocks: initialBlocks,
  onSave,
  onCancel,
  onBlocksChange
}: OverlayGridEditorProps) {
  const {
    fetchGridBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlock,
    loading,
    error
  } = useNewsGridAPI();

  const [blocks, setBlocks] = useState<NewsGridBlockWithNews[]>(initialBlocks);
  const [showBlockTypeSelector, setShowBlockTypeSelector] = useState(false);
  const [showNewsSelector, setShowNewsSelector] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<NewsGridBlockType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Синхронизация с внешними блоками
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  // Уведомление об изменениях
  useEffect(() => {
    onBlocksChange?.(blocks);
  }, [blocks, onBlocksChange]);

  // Перезагрузка блоков
  const loadBlocks = async () => {
    const data = await fetchGridBlocks(true) as NewsGridBlockWithNews[];
    setBlocks(data);
  };

  // Получить все используемые ID новостей
  const usedNewsIds = useMemo(() => {
    return blocks.flatMap((block) => block.news_ids);
  }, [blocks]);

  // Обработчик завершения перетаскивания
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = arrayMove(blocks, oldIndex, newIndex);
        setBlocks(newBlocks);
        setHasChanges(true);

        // Обновляем позиции на сервере
        try {
          await reorderBlock(active.id as string, newIndex);
        } catch (err) {
          console.error('Error reordering block:', err);
          // Откатываем изменения при ошибке
          setBlocks(blocks);
        }
      }
    }
  };

  // Открыть модал выбора типа блока для нового блока
  const handleAddBlock = () => {
    setEditingBlockId(null);
    setShowBlockTypeSelector(true);
  };

  // После выбора типа блока - открыть модал выбора новостей
  const handleBlockTypeSelected = (blockType: NewsGridBlockType) => {
    setSelectedBlockType(blockType);
    setShowNewsSelector(true);
  };

  // После выбора новостей - создать блок
  const handleNewsSelected = async (newsIds: string[]) => {
    if (!selectedBlockType) return;

    try {
      const newBlock = await createBlock({
        block_type: selectedBlockType,
        position: blocks.length,
        news_ids: newsIds,
        is_active: true
      });

      if (newBlock) {
        await loadBlocks(); // Перезагружаем с полными данными
        setHasChanges(true);
      }
    } catch (err) {
      console.error('Error creating block:', err);
    } finally {
      setSelectedBlockType(null);
    }
  };

  // Редактировать блок (изменить новости)
  const handleEditBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      setEditingBlockId(blockId);
      setSelectedBlockType(block.block_type);
      setShowNewsSelector(true);
    }
  };

  // Обновить новости в блоке
  const handleUpdateBlockNews = async (newsIds: string[]) => {
    if (!editingBlockId) return;

    try {
      await updateBlock(editingBlockId, { news_ids: newsIds });
      await loadBlocks();
      setHasChanges(true);
    } catch (err) {
      console.error('Error updating block:', err);
    } finally {
      setEditingBlockId(null);
      setSelectedBlockType(null);
    }
  };

  // Удалить блок
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот блок?')) return;

    try {
      await deleteBlock(blockId);
      await loadBlocks();
      setHasChanges(true);
    } catch (err) {
      console.error('Error deleting block:', err);
    }
  };

  // Сохранить изменения
  const handleSave = () => {
    setHasChanges(false);
    onSave?.();
  };

  // Отмена
  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('У вас есть несохраненные изменения. Вы уверены, что хотите выйти?')) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  return (
    <>
      {/* Полупрозрачный фон */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={handleCancel} />

      {/* Основной контейнер редактора */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Toolbar сверху */}
        <div className="pointer-events-auto bg-white border-b-2 border-blue-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <h2 className="text-lg font-bold text-gray-900">Режим редактирования</h2>
                </div>
                {hasChanges && (
                  <span className="text-sm text-orange-600 font-medium bg-orange-50 px-3 py-1 rounded-full">
                    ● Несохраненные изменения
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                >
                  <XIcon className="w-4 h-4" />
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${hasChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <Save className="w-4 h-4" />
                  Сохранить и выйти
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="pointer-events-auto max-w-7xl mx-auto px-4 mt-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-lg">
              <p className="font-medium">Ошибка:</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Контейнер блоков с оверлеем */}
        <div className="pointer-events-auto max-w-7xl mx-auto px-4 py-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {blocks.map((block) => (
                  <OverlayBlock
                    key={block.id}
                    block={block}
                    onEdit={handleEditBlock}
                    onDelete={handleDeleteBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Floating Add button */}
          <button
            onClick={handleAddBlock}
            disabled={loading}
            className="mt-6 w-full p-6 border-2 border-dashed border-blue-400 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-white/90 backdrop-blur-sm shadow-lg"
          >
            <Plus className="w-6 h-6" />
            <span className="text-lg">Добавить блок</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <BlockTypeSelector
        isOpen={showBlockTypeSelector}
        onClose={() => setShowBlockTypeSelector(false)}
        onSelect={handleBlockTypeSelected}
      />

      <NewsSelector
        isOpen={showNewsSelector}
        onClose={() => {
          setShowNewsSelector(false);
          setEditingBlockId(null);
          setSelectedBlockType(null);
        }}
        onSelect={editingBlockId ? handleUpdateBlockNews : handleNewsSelected}
        requiredCount={selectedBlockType ? getGridBlockNewsCount(selectedBlockType) : 1}
        initialSelectedIds={
          editingBlockId
            ? blocks.find((b) => b.id === editingBlockId)?.news_ids || []
            : []
        }
        excludeIds={
          editingBlockId
            ? usedNewsIds.filter(
              (id) => !blocks.find((b) => b.id === editingBlockId)?.news_ids.includes(id)
            )
            : usedNewsIds
        }
      />
    </>
  );
}

interface OverlayBlockProps {
  block: NewsGridBlockWithNews;
  onEdit: (blockId: string) => void;
  onDelete: (blockId: string) => void;
}

function OverlayBlock({ block, onEdit, onDelete }: OverlayBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const config = getGridBlockConfig(block.block_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Полупрозрачный оверлей на блоке при наведении */}
      <div className="absolute inset-0 bg-blue-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>

      {/* Block controls - показываются при наведении */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
        <button
          {...attributes}
          {...listeners}
          className="p-2.5 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 cursor-grab active:cursor-grabbing shadow-lg transition-all"
          aria-label="Drag"
        >
          <GripVertical className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => onEdit(block.id)}
          className="p-2.5 bg-white border-2 border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 shadow-lg transition-all"
          aria-label="Edit"
        >
          <Edit className="w-5 h-5 text-gray-700 hover:text-blue-600" />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="p-2.5 bg-white border-2 border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-500 shadow-lg transition-all"
          aria-label="Delete"
        >
          <Trash2 className="w-5 h-5 text-gray-700 hover:text-red-600" />
        </button>
      </div>

      {/* Block type label - показывается при наведении */}
      <div className="absolute top-4 left-4 z-20 bg-white px-3 py-1.5 rounded-lg shadow-lg border-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-y-1 group-hover:translate-y-0">
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
          {config?.label || block.block_type}
        </span>
      </div>

      {/* Рамка вокруг блока при наведении */}
      <div className="absolute inset-0 border-3 border-transparent group-hover:border-blue-500 rounded-xl transition-all duration-200 pointer-events-none z-10"></div>

      {/* Block content - оригинальный контент */}
      <div className="relative z-0">
        <GridBlockRenderer block={block} />
      </div>
    </div>
  );
}
