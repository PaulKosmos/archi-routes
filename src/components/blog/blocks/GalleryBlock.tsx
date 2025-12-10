// components/blog/blocks/GalleryBlock.tsx
// Отображение блока "Галерея изображений" в блоге

'use client';

import { useState } from 'react';
import { BlogContentBlock } from '@/types/blog';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface GalleryBlockProps {
  block: BlogContentBlock;
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
  const showCaptions = block_settings?.showCaptions !== false;
  const aspectRatio = block_settings?.aspectRatio || '16:9';

  // Открывает lightbox
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Закрывает lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  // Переход к следующему изображению
  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images_data.length);
  };

  // Переход к предыдущему изображению
  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images_data.length) % images_data.length);
  };

  // Обработка клавиш в lightbox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  };

  // Классы для grid
  const gridColumnsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <>
      <div className="gallery-block max-w-7xl mx-auto my-10">
        {layout === 'grid' ? (
          /* Grid Layout */
          <div className={`grid ${gridColumnsClass} gap-4`}>
            {images_data.map((image, index) => (
              <figure
                key={index}
                className="relative group cursor-pointer overflow-hidden transition-all duration-300"
                onClick={() => openLightbox(index)}
              >
                <div className="relative overflow-hidden bg-gray-50">
                  <img
                    src={image.url}
                    alt={image.alt || `Изображение ${index + 1}`}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    style={{
                      aspectRatio: aspectRatio.replace(':', '/'),
                    }}
                    loading="lazy"
                  />
                  {/* Overlay при hover */}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300 flex items-center justify-center">
                    <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
                {showCaptions && image.caption && (
                  <figcaption className="mt-2 px-2 text-sm text-muted-foreground text-center italic">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          /* Masonry Layout using CSS columns */
          <div
            className="gap-4"
            style={{
              columnCount: columns,
              columnGap: '1rem',
            }}
          >
            {images_data.map((image, index) => (
              <figure
                key={index}
                className="relative group cursor-pointer overflow-hidden transition-all duration-300 mb-4 break-inside-avoid"
                onClick={() => openLightbox(index)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.alt || `Изображение ${index + 1}`}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Overlay при hover */}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300 flex items-center justify-center">
                    <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
                {showCaptions && image.caption && (
                  <figcaption className="mt-2 px-2 pb-2 text-sm text-muted-foreground text-center italic">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none z-10 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Кнопка "Назад" */}
          {images_data.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none transition-colors"
              aria-label="Предыдущее изображение"
            >
              <ChevronLeft className="h-12 w-12" />
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
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                style={{ maxHeight: '80vh' }}
              />
            </div>
            {images_data[lightboxIndex].caption && (
              <p className="text-white text-center mt-4 max-w-3xl text-lg">
                {images_data[lightboxIndex].caption}
              </p>
            )}
            <p className="text-white text-center text-sm mt-3 opacity-70">
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none transition-colors"
              aria-label="Следующее изображение"
            >
              <ChevronRight className="h-12 w-12" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
