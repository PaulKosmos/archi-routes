// components/blog/blocks/editors/FullWidthImageBlockEditor.tsx
// Редактор блока "Полноразмерное изображение"

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateBlogContentBlock } from '@/types/blog';
import BlockEditorWrapper from '../BlockEditorWrapper';
import ImageUploader from '../ImageUploader';

// ============================================================
// ТИПЫ
// ============================================================

interface FullWidthImageBlockEditorProps {
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

export default function FullWidthImageBlockEditor({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  readOnly = false,
}: FullWidthImageBlockEditorProps) {
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
  const showCaption = currentSettings.showCaption ?? true;
  const aspectRatio = currentSettings.aspectRatio || '16:9';

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditorWrapper
        blockType="full_width_image"
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        errors={errors}
        dragHandleProps={{ ...attributes, ...listeners }}
        readOnly={readOnly}
      >
        <div className="space-y-4">
          {/* Загрузка изображения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Полноразмерное изображение
            </label>
            <ImageUploader
              images={block.images_data || []}
              onChange={(images) => onChange({ images_data: images })}
              maxImages={1}
              readOnly={readOnly}
            />
          </div>

          {/* Preview изображения с aspect ratio */}
          {block.images_data && block.images_data.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Предпросмотр (как будет выглядеть после публикации)
              </label>
              <div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={block.images_data[0].url}
                  alt={block.images_data[0].alt || 'Превью'}
                  className="w-full h-auto object-cover"
                  style={
                    aspectRatio !== 'auto'
                      ? { aspectRatio: aspectRatio.replace(':', '/') }
                      : {}
                  }
                />
                {showCaption && block.images_data[0].caption && (
                  <p className="mt-2 text-center text-sm text-gray-600 italic px-4">
                    {block.images_data[0].caption}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Настройки */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
            {/* Соотношение сторон */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Соотношение сторон
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['auto', '21:9', '16:9', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() =>
                      onChange({
                        block_settings: {
                          ...block.block_settings,
                          aspectRatio: ratio,
                        },
                      })
                    }
                    disabled={readOnly}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {ratio === 'auto' ? 'Авто' : ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Показывать подпись */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={showCaption}
                  onChange={(e) =>
                    onChange({
                      block_settings: {
                        ...block.block_settings,
                        showCaption: e.target.checked,
                      },
                    })
                  }
                  disabled={readOnly}
                  className="rounded border-gray-300 text-green-500 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span>Показывать подпись к изображению</span>
              </label>
            </div>
          </div>

          {/* Подсказка */}
          <div className="text-xs text-gray-500 italic">
            💡 Изображение будет отображаться на всю ширину контейнера статьи
          </div>
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
