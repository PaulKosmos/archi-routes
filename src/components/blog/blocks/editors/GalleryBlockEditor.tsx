// components/blog/blocks/editors/GalleryBlockEditor.tsx
// Редактор блока "Галерея изображений"

'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateBlogContentBlock, ImageData } from '@/types/blog';
import { uploadImage } from '@/lib/supabase';
import BlockEditorWrapper from '../BlockEditorWrapper';
import { Upload, X, Edit2, Check } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface GalleryBlockEditorProps {
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

  const currentSettings = (block.block_settings || {}) as any;
  const columns = currentSettings.columns || 3;
  const layout = currentSettings.layout || 'grid';
  const showCaptions = currentSettings.showCaptions ?? true;
  const aspectRatio = currentSettings.aspectRatio || '1:1';

  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const images = block.images_data || [];

  // Обработчик загрузки файлов
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (images.length + files.length > 12) {
        alert('Максимум 12 изображений');
        return;
      }

      setUploading(true);

      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          if (!file.type.startsWith('image/')) {
            throw new Error('Файл должен быть изображением');
          }
          if (file.size > 10 * 1024 * 1024) {
            throw new Error('Размер файла не должен превышать 10MB');
          }

          const { url } = await uploadImage(file, 'photos', 'blog');

          const newImage: ImageData = {
            url,
            caption: '',
            alt: file.name,
            width: 0,
            height: 0,
          };

          // Получаем размеры изображения
          const img = new Image();
          img.src = url;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              newImage.width = img.naturalWidth;
              newImage.height = img.naturalHeight;
              resolve();
            };
          });

          return newImage;
        });

        const uploadedImages = await Promise.all(uploadPromises);
        onChange({ images_data: [...images, ...uploadedImages] });
      } catch (err) {
        console.error('Error uploading image:', err);
        alert(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [images, onChange]
  );

  // Обработчик удаления изображения
  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onChange({ images_data: updatedImages });
  };

  // Обработчик изменения caption
  const handleCaptionChange = (index: number, caption: string) => {
    const updatedImages = images.map((img, i) =>
      i === index ? { ...img, caption } : img
    );
    onChange({ images_data: updatedImages });
  };

  // Обработчик изменения alt
  const handleAltChange = (index: number, alt: string) => {
    const updatedImages = images.map((img, i) =>
      i === index ? { ...img, alt } : img
    );
    onChange({ images_data: updatedImages });
  };

  // Классы для grid
  const gridColumnsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

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
        <div className="space-y-4">
          {/* Inline Gallery with Upload */}
          {layout === 'grid' ? (
            /* Grid Layout */
            <div className={`grid gap-4 ${gridColumnsClass}`}>
              {images.map((image, index) => (
                <div
                  key={index}
                  className="relative group overflow-hidden rounded-lg shadow-md border-2 border-gray-200 hover:border-green-400 transition-all"
                >
                  <img
                    src={image.url}
                    alt={image.alt || `Изображение ${index + 1}`}
                    className="w-full h-full object-contain bg-gray-50"
                    style={{
                      aspectRatio: aspectRatio.replace(':', '/'),
                    }}
                  />

                  {/* Edit/Delete overlay */}
                  {!readOnly && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-green-50"
                        title="Редактировать"
                      >
                        {editingIndex === index ? <Check className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4 text-gray-600" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-red-50"
                        title="Удалить"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}

                  {/* Caption/Alt editor */}
                  {editingIndex === index && !readOnly && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-white bg-opacity-95 space-y-1">
                      <input
                        type="text"
                        value={image.alt || ''}
                        onChange={(e) => handleAltChange(index, e.target.value)}
                        placeholder="Alt текст"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                        value={image.caption || ''}
                        onChange={(e) => handleCaptionChange(index, e.target.value)}
                        placeholder="Подпись"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                  )}

                  {/* Caption display */}
                  {showCaptions && image.caption && editingIndex !== index && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-60">
                      <p className="text-xs text-white text-center">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Upload button in grid */}
              {images.length < 12 && !readOnly && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
                  style={{
                    aspectRatio: aspectRatio.replace(':', '/'),
                  }}
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Добавить фото</span>
                  <span className="text-xs text-gray-500 mt-1">({images.length}/12)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          ) : (
            /* Masonry Layout using CSS columns */
            <div>
              <div
                className="gap-4"
                style={{
                  columnCount: columns,
                  columnGap: '1rem',
                }}
              >
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group overflow-hidden rounded-lg shadow-md border-2 border-gray-200 hover:border-green-400 transition-all mb-4 break-inside-avoid"
                  >
                    <img
                      src={image.url}
                      alt={image.alt || `Изображение ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />

                    {/* Edit/Delete overlay */}
                    {!readOnly && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                          className="p-1.5 bg-white rounded-full shadow-md hover:bg-green-50"
                          title="Редактировать"
                        >
                          {editingIndex === index ? <Check className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4 text-gray-600" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="p-1.5 bg-white rounded-full shadow-md hover:bg-red-50"
                          title="Удалить"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}

                    {/* Caption/Alt editor */}
                    {editingIndex === index && !readOnly && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-white bg-opacity-95 space-y-1">
                        <input
                          type="text"
                          value={image.alt || ''}
                          onChange={(e) => handleAltChange(index, e.target.value)}
                          placeholder="Alt текст"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={image.caption || ''}
                          onChange={(e) => handleCaptionChange(index, e.target.value)}
                          placeholder="Подпись"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        />
                      </div>
                    )}

                    {/* Caption display */}
                    {showCaptions && image.caption && editingIndex !== index && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-60">
                        <p className="text-xs text-white text-center">{image.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Upload button for masonry */}
              {images.length < 12 && !readOnly && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all p-8 mt-4">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Добавить фото</span>
                  <span className="text-xs text-gray-500 mt-1">({images.length}/12)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Uploading indicator */}
          {uploading && (
            <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-sm text-blue-700">Загрузка изображений...</span>
            </div>
          )}

          {/* Настройки галереи */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
            {/* Количество колонок */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Количество колонок: {columns}
              </label>
              <div className="flex gap-2">
                {[2, 3, 4].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() =>
                      onChange({
                        block_settings: {
                          ...block.block_settings,
                          columns: col,
                        },
                      })
                    }
                    disabled={readOnly}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      columns === col
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {col} колонки
                  </button>
                ))}
              </div>
            </div>

            {/* Тип layout */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Тип раскладки
              </label>
              <div className="flex gap-2">
                {(['grid', 'masonry'] as const).map((layoutType) => (
                  <button
                    key={layoutType}
                    type="button"
                    onClick={() =>
                      onChange({
                        block_settings: {
                          ...block.block_settings,
                          layout: layoutType,
                        },
                      })
                    }
                    disabled={readOnly}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      layout === layoutType
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {layoutType === 'grid' ? 'Сетка' : 'Masonry'}
                  </button>
                ))}
              </div>
            </div>

            {/* Соотношение сторон (только для grid) */}
            {layout === 'grid' && (
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
                            aspectRatio: ratio,
                          },
                        })
                      }
                      disabled={readOnly}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                        aspectRatio === ratio
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Показывать подписи */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={showCaptions}
                  onChange={(e) =>
                    onChange({
                      block_settings: {
                        ...block.block_settings,
                        showCaptions: e.target.checked,
                      },
                    })
                  }
                  disabled={readOnly}
                  className="rounded border-gray-300 text-green-500 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span>Показывать подписи к изображениям</span>
              </label>
            </div>
          </div>

          {/* Подсказка */}
          <div className="text-xs text-gray-500 italic space-y-1">
            <p>💡 <strong>Сетка</strong>: все изображения одного размера в ровных рядах</p>
            <p>💡 <strong>Masonry</strong>: изображения сохраняют оригинальные пропорции, создавая интересную раскладку</p>
          </div>

          {/* Счетчик изображений */}
          <div className="text-sm text-gray-600">
            Изображений в галерее: {block.images_data?.length || 0} / 12
          </div>
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
