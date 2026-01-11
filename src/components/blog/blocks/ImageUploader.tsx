// components/blog/blocks/ImageUploader.tsx
// Компонент для загрузки и управления изображениями в блоках блога

'use client';

import { useState, useCallback } from 'react';
import { ImageData } from '@/types/blog';
import { uploadImage } from '@/lib/supabase';
import { Upload, X, ChevronUp, ChevronDown } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface ImageUploaderProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
  readOnly?: boolean;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ImageUploader({
  images,
  onChange,
  maxImages = 1,
  readOnly = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Обработчик загрузки файла
   */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Проверка лимита изображений
      if (images.length + files.length > maxImages) {
        setError(`Максимум ${maxImages} изображений`);
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          // Валидация файла
          if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
          }
          if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must not exceed 10MB');
          }

          // Загрузка в Supabase Storage (используем bucket 'photos', папка 'blog')
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
        onChange([...images, ...uploadedImages]);
      } catch (err) {
        console.error('Error uploading image:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
      } finally {
        setUploading(false);
        // Сбрасываем input для возможности повторной загрузки того же файла
        e.target.value = '';
      }
    },
    [images, maxImages, onChange]
  );

  /**
   * Обработчик изменения подписи к изображению
   */
  const handleCaptionChange = (index: number, caption: string) => {
    const updatedImages = images.map((img, i) =>
      i === index ? { ...img, caption } : img
    );
    onChange(updatedImages);
  };

  /**
   * Обработчик изменения alt текста
   */
  const handleAltChange = (index: number, alt: string) => {
    const updatedImages = images.map((img, i) =>
      i === index ? { ...img, alt } : img
    );
    onChange(updatedImages);
  };

  /**
   * Обработчик удаления изображения
   */
  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onChange(updatedImages);
  };

  /**
   * Обработчик перемещения изображения
   */
  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedImages = [...images];
    [updatedImages[index], updatedImages[newIndex]] = [
      updatedImages[newIndex],
      updatedImages[index],
    ];
    onChange(updatedImages);
  };

  return (
    <div className="image-uploader space-y-4">
      {/* Кнопка загрузки */}
      {images.length < maxImages && !readOnly && (
        <div>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-10 w-10 text-gray-400 mb-3" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold text-green-600">Нажмите для загрузки</span> или перетащите
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WEBP до 10MB
              </p>
              {maxImages > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  ({images.length} из {maxImages})
                </p>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple={maxImages > 1}
              onChange={handleFileUpload}
              disabled={uploading || readOnly}
            />
          </label>
        </div>
      )}

      {/* Индикатор загрузки */}
      {uploading && (
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm text-blue-700">Загрузка изображений...</span>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Список загруженных изображений */}
      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 transition-colors"
            >
              {/* Превью изображения */}
              <div className="flex-shrink-0">
                <img
                  src={image.url}
                  alt={image.alt || `Изображение ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                />
              </div>

              {/* Поля редактирования */}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={image.alt || ''}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  placeholder="Alt текст (для SEO)"
                  disabled={readOnly}
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                />
                <input
                  type="text"
                  value={image.caption || ''}
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  placeholder="Подпись (опционально)"
                  disabled={readOnly}
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                />
                {image.width && image.height && (
                  <p className="text-xs text-gray-500">
                    {image.width} × {image.height} px
                  </p>
                )}
              </div>

              {/* Кнопки управления */}
              <div className="flex flex-col gap-1">
                {/* Переместить вверх */}
                {maxImages > 1 && index > 0 && !readOnly && (
                  <button
                    type="button"
                    onClick={() => handleMoveImage(index, 'up')}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                    title="Переместить вверх"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}

                {/* Переместить вниз */}
                {maxImages > 1 && index < images.length - 1 && !readOnly && (
                  <button
                    type="button"
                    onClick={() => handleMoveImage(index, 'down')}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                    title="Переместить вниз"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}

                {/* Удалить */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 mt-auto"
                    title="Удалить изображение"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
