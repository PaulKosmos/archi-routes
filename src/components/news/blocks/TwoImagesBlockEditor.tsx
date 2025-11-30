// components/news/blocks/TwoImagesBlockEditor.tsx
// Редактор блока "Два изображения рядом"

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateContentBlock, ImageData } from '@/types/news';
import BlockEditorWrapper from './BlockEditorWrapper';
import ImageUploader from './ImageUploader';

// ============================================================
// ТИПЫ
// ============================================================

interface TwoImagesBlockEditorProps {
  block: CreateContentBlock;
  onChange: (updates: Partial<CreateContentBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  errors?: string[];
  readOnly?: boolean;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TwoImagesBlockEditor({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  readOnly = false,
}: TwoImagesBlockEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.order_index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  /**
   * Обработчик изменения изображений
   */
  const handleImagesChange = (images: ImageData[]) => {
    onChange({ images_data: images });
  };

  /**
   * Обработчик изменения пропорций
   */
  const handleRatioChange = (ratio: '50-50' | '60-40' | '40-60') => {
    onChange({
      block_settings: {
        ...block.block_settings,
        imageRatio: ratio,
      },
    });
  };

  /**
   * Обработчик изменения интервала между изображениями
   */
  const handleGapChange = (gap: 'small' | 'medium' | 'large') => {
    onChange({
      block_settings: {
        ...block.block_settings,
        gap,
      },
    });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditorWrapper
        blockType="two_images"
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        errors={errors}
        dragHandleProps={{ ...attributes, ...listeners }}
        readOnly={readOnly}
      >
        <div className="space-y-6">
          {/* Загрузка изображений */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображения (ровно 2)
            </label>
            <ImageUploader
              images={block.images_data || []}
              onChange={handleImagesChange}
              maxImages={2}
              readOnly={readOnly}
            />
          </div>

          {/* Настройки расположения */}
          {block.images_data && block.images_data.length === 2 && !readOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Пропорции */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пропорции изображений
                </label>
                <div className="space-y-2">
                  {[
                    { value: '50-50', label: '50% / 50% (равные)' },
                    { value: '60-40', label: '60% / 40% (левое больше)' },
                    { value: '40-60', label: '40% / 60% (правое больше)' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatioChange(value as '50-50' | '60-40' | '40-60')}
                      className={`w-full px-3 py-2 text-sm text-left rounded border ${
                        (block.block_settings?.imageRatio || '50-50') === value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Интервал */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Интервал между изображениями
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'small', label: 'Малый' },
                    { value: 'medium', label: 'Средний' },
                    { value: 'large', label: 'Большой' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleGapChange(value as 'small' | 'medium' | 'large')}
                      className={`w-full px-3 py-2 text-sm text-left rounded border ${
                        (block.block_settings?.gap || 'medium') === value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Превью расположения */}
          {block.images_data && block.images_data.length === 2 && (
            <div className="pt-6 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-3">ПРЕВЬЮ РАСПОЛОЖЕНИЯ</p>
              <div
                className={`grid grid-cols-2 p-4 bg-gray-50 rounded ${
                  block.block_settings?.gap === 'small' ? 'gap-2' :
                  block.block_settings?.gap === 'large' ? 'gap-6' : 'gap-4'
                }`}
              >
                {block.block_settings?.imageRatio === '60-40' ? (
                  <>
                    <div className="col-span-1 flex items-center justify-center bg-purple-100 border border-purple-300 rounded p-8 text-sm text-purple-700">
                      Изображение 1<br />(60%)
                    </div>
                    <div className="col-span-1 flex items-center justify-center bg-indigo-100 border border-indigo-300 rounded p-6 text-sm text-indigo-700">
                      Изображение 2<br />(40%)
                    </div>
                  </>
                ) : block.block_settings?.imageRatio === '40-60' ? (
                  <>
                    <div className="col-span-1 flex items-center justify-center bg-purple-100 border border-purple-300 rounded p-6 text-sm text-purple-700">
                      Изображение 1<br />(40%)
                    </div>
                    <div className="col-span-1 flex items-center justify-center bg-indigo-100 border border-indigo-300 rounded p-8 text-sm text-indigo-700">
                      Изображение 2<br />(60%)
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center bg-purple-100 border border-purple-300 rounded p-8 text-sm text-purple-700">
                      Изображение 1<br />(50%)
                    </div>
                    <div className="flex items-center justify-center bg-indigo-100 border border-indigo-300 rounded p-8 text-sm text-indigo-700">
                      Изображение 2<br />(50%)
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
