// components/news/blocks/GalleryBlock.tsx
// Отображение блока "Галерея изображений"

'use client';

import { useState } from 'react';
import { ContentBlock } from '@/types/news';

// ============================================================
// ТИПЫ
// ============================================================

interface GalleryBlockProps {
  block: ContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function GalleryBlock({ block }: GalleryBlockProps) {
  const { images_data, block_settings } = block;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images_data || images_data.length < 2) return null;

  const layout = block_settings?.layout || 'grid';
  const columns = block_settings?.columns || 3;
  const enableLightbox = block_settings?.enableLightbox !== false;

  /**
   * Открывает lightbox
   */
  const openLightbox = (index: number) => {
    if (enableLightbox) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  /**
   * Закрывает lightbox
   */
  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  /**
   * Переход к следующему изображению
   */
  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images_data.length);
  };

  /**
   * Переход к предыдущему изображению
   */
  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images_data.length) % images_data.length);
  };

  // Классы для grid
  const gridColumnsClass = `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(columns, 5)}`;

  return (
    <>
      <div className="gallery-block">
        <div className={`grid ${gridColumnsClass} gap-4`}>
          {images_data.map((image, index) => (
            <figure
              key={index}
              className={`relative group ${enableLightbox ? 'cursor-pointer' : ''}`}
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.alt || `Изображение ${index + 1}`}
                className={`w-full h-auto rounded-lg shadow-md transition-transform ${
                  enableLightbox ? 'group-hover:scale-105' : ''
                }`}
                style={{
                  objectFit: 'cover',
                  height: layout === 'masonry' ? 'auto' : '250px',
                }}
                loading="lazy"
              />
              {enableLightbox && (
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                  <svg
                    className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                    />
                  </svg>
                </div>
              )}
              {image.caption && (
                <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none z-10"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Кнопка "Назад" */}
          {images_data.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none"
            >
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Изображение */}
          <div
            className="flex flex-col items-center justify-center max-w-[95vw] max-h-[90vh] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center max-w-full max-h-[80vh]">
              <img
                src={images_data[lightboxIndex].url}
                alt={images_data[lightboxIndex].alt || `Изображение ${lightboxIndex + 1}`}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                style={{ maxHeight: '80vh' }}
              />
            </div>
            {images_data[lightboxIndex].caption && (
              <p className="text-white text-center mt-4 max-w-3xl">
                {images_data[lightboxIndex].caption}
              </p>
            )}
            <p className="text-white text-center text-sm mt-2">
              {lightboxIndex + 1} / {images_data.length}
            </p>
          </div>

          {/* Кнопка "Вперед" */}
          {images_data.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none"
            >
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
