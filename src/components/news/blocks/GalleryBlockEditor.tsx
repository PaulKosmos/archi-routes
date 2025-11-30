// components/news/blocks/GalleryBlockEditor.tsx
// Редактор блока "Галерея изображений"

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateContentBlock, ImageData } from '@/types/news';
import BlockEditorWrapper from './BlockEditorWrapper';
import ImageUploader from './ImageUploader';

// ============================================================
// ТИПЫ
// ============================================================

interface GalleryBlockEditorProps {
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

export default function GalleryBlockEditor({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  readOnly = false,
}: GalleryBlockEditorProps) {
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
   * Обработчик изменения количества колонок
   */
  const handleColumnsChange = (columns: number) => {
    onChange({
      block_settings: {
        ...block.block_settings,
        columns,
      },
    });
  };

  /**
   * Обработчик изменения стиля галереи
   */
  const handleLayoutChange = (layout: 'grid' | 'masonry') => {
    onChange({
      block_settings: {
        ...block.block_settings,
        layout,
      },
    });
  };

  /**
   * Обработчик включения/выключения лайтбокса
   */
  const handleLightboxToggle = (enabled: boolean) => {
    onChange({
      block_settings: {
        ...block.block_settings,
        enableLightbox: enabled,
      },
    });
  };

  const currentLayout = block.block_settings?.layout || 'grid';
  const currentColumns = block.block_settings?.columns || 3;
  const enableLightbox = block.block_settings?.enableLightbox !== false;

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditorWrapper
        blockType="gallery"
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
              Изображения галереи (2-20)
            </label>
            <ImageUploader
              images={block.images_data || []}
              onChange={handleImagesChange}
              maxImages={20}
              readOnly={readOnly}
            />
            {block.images_data && block.images_data.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                Загружено изображений: {block.images_data.length} / 20
              </p>
            )}
          </div>

          {/* Настройки галереи */}
          {block.images_data && block.images_data.length >= 2 && !readOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Тип раскладки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип раскладки
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleLayoutChange('grid')}
                    className={`w-full px-4 py-3 text-sm text-left rounded border ${
                      currentLayout === 'grid'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Сетка (Grid)</div>
                    <div className={`text-xs mt-1 ${currentLayout === 'grid' ? 'text-blue-100' : 'text-gray-500'}`}>
                      Равномерная сетка изображений
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayoutChange('masonry')}
                    className={`w-full px-4 py-3 text-sm text-left rounded border ${
                      currentLayout === 'masonry'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Masonry</div>
                    <div className={`text-xs mt-1 ${currentLayout === 'masonry' ? 'text-blue-100' : 'text-gray-500'}`}>
                      Кирпичная кладка (разная высота)
                    </div>
                  </button>
                </div>
              </div>

              {/* Количество колонок */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество колонок
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => handleColumnsChange(cols)}
                      className={`px-3 py-2 text-sm rounded border ${
                        currentColumns === cols
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  На мобильных устройствах автоматически 1-2 колонки
                </p>
              </div>
            </div>
          )}

          {/* Дополнительные опции */}
          {block.images_data && block.images_data.length >= 2 && !readOnly && (
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableLightbox}
                  onChange={(e) => handleLightboxToggle(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Включить увеличение при клике (Lightbox)
                </span>
              </label>
            </div>
          )}

          {/* Превью раскладки */}
          {block.images_data && block.images_data.length >= 2 && (
            <div className="pt-6 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-3">
                ПРЕВЬЮ РАСКЛАДКИ ({currentColumns} колонки, {currentLayout})
              </p>
              <div
                className={`grid gap-2 p-4 bg-gray-50 rounded`}
                style={{
                  gridTemplateColumns: `repeat(${Math.min(currentColumns, 4)}, 1fr)`,
                }}
              >
                {block.images_data.slice(0, 8).map((image, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded border border-gray-200"
                    style={{
                      height: currentLayout === 'masonry' ? `${80 + (i % 3) * 30}px` : '120px',
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || `Изображение ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-tl">
                      {i + 1}
                    </div>
                  </div>
                ))}
                {block.images_data.length > 8 && (
                  <div className="col-span-full text-center text-xs text-gray-500 mt-2">
                    ... и еще {block.images_data.length - 8} изображений
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Подсказка */}
          {(!block.images_data || block.images_data.length < 2) && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Совет</p>
                  <p className="mt-1">
                    Галерея должна содержать минимум 2 изображения. Загрузите несколько фотографий,
                    чтобы увидеть настройки раскладки.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
