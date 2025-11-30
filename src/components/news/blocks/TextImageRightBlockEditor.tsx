// components/news/blocks/TextImageRightBlockEditor.tsx
// Редактор блока "Текст с изображением справа"

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateContentBlock, ImageData } from '@/types/news';
import BlockEditorWrapper from './BlockEditorWrapper';
import ImageUploader from './ImageUploader';

// ============================================================
// ТИПЫ
// ============================================================

interface TextImageRightBlockEditorProps {
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

export default function TextImageRightBlockEditor({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  readOnly = false,
}: TextImageRightBlockEditorProps) {
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
   * Обработчик изменения текста
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ content: e.target.value });
  };

  /**
   * Обработчик изменения изображений
   */
  const handleImagesChange = (images: ImageData[]) => {
    onChange({ images_data: images });
  };

  /**
   * Обработчик изменения размера изображения
   */
  const handleImageSizeChange = (size: 'small' | 'medium' | 'large') => {
    onChange({
      block_settings: {
        ...block.block_settings,
        imageSize: size,
      },
    });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditorWrapper
        blockType="text_image_right"
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        errors={errors}
        dragHandleProps={{ ...attributes, ...listeners }}
        readOnly={readOnly}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Левая колонка - текст */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст блока
              </label>
              <textarea
                value={block.content || ''}
                onChange={handleContentChange}
                placeholder="Введите текст..."
                disabled={readOnly}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y"
              />
            </div>

            {/* Счетчик символов */}
            <div className="text-right text-xs text-gray-500">
              Символов: {block.content?.length || 0} / 10000
            </div>
          </div>

          {/* Правая колонка - изображение */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Изображение
            </label>
            <ImageUploader
              images={block.images_data || []}
              onChange={handleImagesChange}
              maxImages={1}
              readOnly={readOnly}
            />

            {/* Настройки размера изображения */}
            {block.images_data && block.images_data.length > 0 && !readOnly && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Размер изображения
                </label>
                <div className="flex space-x-2">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleImageSizeChange(size as 'small' | 'medium' | 'large')}
                      className={`px-3 py-1 text-sm rounded border ${
                        (block.block_settings?.imageSize || 'medium') === size
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {size === 'small' && 'Малый'}
                      {size === 'medium' && 'Средний'}
                      {size === 'large' && 'Большой'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Превью расположения */}
        {block.content && block.images_data && block.images_data.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-3">ПРЕВЬЮ РАСПОЛОЖЕНИЯ</p>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
              <div className="flex items-center justify-center bg-blue-100 border border-blue-300 rounded p-4 text-sm text-blue-700">
                Текст слева
              </div>
              <div className="flex items-center justify-center bg-green-100 border border-green-300 rounded p-4 text-sm text-green-700">
                Изображение справа
              </div>
            </div>
          </div>
        )}
      </BlockEditorWrapper>
    </div>
  );
}
