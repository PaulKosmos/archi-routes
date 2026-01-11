// components/news/blocks/ImageUploader.tsx
// Компонент для загрузки и управления изображениями в блоках

'use client';

import { useState, useCallback } from 'react';
import { ImageData } from '@/types/news';
import { uploadImage } from '@/lib/supabase';

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
        setError(`Maximum ${maxImages} images`);
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

          // Загрузка в Supabase Storage (используем bucket 'photos', папка 'news')
          const { url } = await uploadImage(file, 'photos', 'news');

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
        setError(err instanceof Error ? err.message : 'Error uploading image');
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
      {!readOnly && images.length < maxImages && (
        <div>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              multiple={maxImages > 1}
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Загрузка...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Загрузить изображение
                </>
              )}
            </div>
          </label>
          {maxImages > 1 && (
            <p className="mt-1 text-xs text-gray-500">
              {images.length} / {maxImages} изображений
            </p>
          )}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Список загруженных изображений */}
      {images.length > 0 && (
        <div className="space-y-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Превью изображения */}
              <div className="relative bg-gray-100">
                <img
                  src={image.url}
                  alt={image.alt || `Изображение ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                {!readOnly && (
                  <div className="absolute top-2 right-2 flex space-x-1">
                    {/* Переместить вверх */}
                    {maxImages > 1 && index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(index, 'up')}
                        className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                        title="Move up"
                      >
                        <svg
                          className="h-4 w-4 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
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
                    {maxImages > 1 && index < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(index, 'down')}
                        className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                        title="Move down"
                      >
                        <svg
                          className="h-4 w-4 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                    {/* Удалить */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-1 bg-white rounded-full shadow-sm hover:bg-red-100"
                      title="Delete image"
                    >
                      <svg
                        className="h-4 w-4 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Поля для подписи и alt */}
              <div className="p-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Подпись к изображению
                  </label>
                  <input
                    type="text"
                    value={image.caption || ''}
                    onChange={(e) => handleCaptionChange(index, e.target.value)}
                    placeholder="Description to display under image"
                    disabled={readOnly}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Alt текст (для доступности)
                  </label>
                  <input
                    type="text"
                    value={image.alt || ''}
                    onChange={(e) => handleAltChange(index, e.target.value)}
                    placeholder="Description for screen readers"
                    disabled={readOnly}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
                {/* Размеры изображения */}
                {image.width && image.height && (
                  <p className="text-xs text-gray-500">
                    Размер: {image.width} × {image.height} px
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
