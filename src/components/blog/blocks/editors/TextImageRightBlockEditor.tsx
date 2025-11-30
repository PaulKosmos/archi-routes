// components/blog/blocks/editors/TextImageRightBlockEditor.tsx
// Редактор блока "Текст + изображение справа"

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateBlogContentBlock } from '@/types/blog';
import BlockEditorWrapper from '../BlockEditorWrapper';
import ImageUploader from '../ImageUploader';
import RichTextEditor from '../../RichTextEditor';

// ============================================================
// ТИПЫ
// ============================================================

interface TextImageRightBlockEditorProps {
  block: CreateBlogContentBlock;
  onChange: (updates: Partial<CreateBlogContentBlock>) => void;
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

  const currentSettings = (block.block_settings || {}) as any;
  const imageWidth = currentSettings.imageWidth || 40;
  const imageRatio = currentSettings.imageRatio || '1:1';

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
        <div className="space-y-4">
          {/* Inline Layout: Текст слева + Изображение справа */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Текст слева с Rich Text Editor */}
            <div className="flex-1" style={{ width: `${100 - imageWidth}%` }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст блока
              </label>
              <RichTextEditor
                value={block.content || ''}
                onChange={(content) => onChange({ content })}
                placeholder="Введите текст..."
                readOnly={readOnly}
                className="min-h-[300px]"
              />
            </div>

            {/* Изображение справа */}
            <div className="flex-shrink-0" style={{ width: `${imageWidth}%` }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Изображение
              </label>
              <ImageUploader
                images={block.images_data || []}
                onChange={(images) => onChange({ images_data: images })}
                maxImages={1}
                readOnly={readOnly}
              />

              {/* Превью изображения если есть */}
              {block.images_data && block.images_data.length > 0 && (
                <div className="mt-3">
                  <figure>
                    <img
                      src={block.images_data[0].url}
                      alt={block.images_data[0].alt || 'Изображение'}
                      className="w-full h-auto rounded-lg shadow-lg object-cover"
                      style={{ aspectRatio: imageRatio.replace(':', '/') }}
                    />
                    {block.images_data[0].caption && (
                      <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
                        {block.images_data[0].caption}
                      </figcaption>
                    )}
                  </figure>
                </div>
              )}
            </div>
          </div>

          {/* Настройки */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
            {/* Ширина изображения */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Ширина изображения: {imageWidth}%
              </label>
              <input
                type="range"
                min="30"
                max="50"
                step="5"
                value={imageWidth}
                onChange={(e) =>
                  onChange({
                    block_settings: {
                      ...block.block_settings,
                      imageWidth: parseInt(e.target.value),
                    },
                  })
                }
                disabled={readOnly}
                className="w-full"
              />
            </div>

            {/* Соотношение сторон */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Соотношение сторон
              </label>
              <div className="flex gap-2">
                {(['1:1', '16:9', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() =>
                      onChange({
                        block_settings: {
                          ...block.block_settings,
                          imageRatio: ratio,
                        },
                      })
                    }
                    disabled={readOnly}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      imageRatio === ratio
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
