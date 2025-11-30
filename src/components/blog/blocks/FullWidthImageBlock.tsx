// components/blog/blocks/FullWidthImageBlock.tsx
// Отображение полноразмерного изображения на всю ширину

'use client';

import { useState } from 'react';
import { BlogContentBlock } from '@/types/blog';
import { X, ZoomIn } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface FullWidthImageBlockProps {
  block: BlogContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function FullWidthImageBlock({ block }: FullWidthImageBlockProps) {
  const { images_data, block_settings } = block;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images_data || images_data.length === 0) return null;

  const image = images_data[0];
  const showCaption = block_settings?.showCaption !== false;
  const aspectRatio = block_settings?.aspectRatio || 'auto';

  // Aspect ratio стили
  const aspectRatioStyle = aspectRatio !== 'auto' ? {
    aspectRatio: aspectRatio.replace(':', '/')
  } : {};

  return (
    <>
      <div className="full-width-image-block w-full my-12">
        <figure
          className="relative group cursor-pointer overflow-hidden"
          onClick={() => setLightboxOpen(true)}
        >
          <div className="relative w-full overflow-hidden">
            <img
              src={image.url}
              alt={image.alt || 'Изображение'}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              style={aspectRatioStyle}
              loading="lazy"
            />
            {/* Overlay при hover */}
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300 flex items-center justify-center">
              <ZoomIn className="h-16 w-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
          {showCaption && image.caption && (
            <figcaption className="mt-4 text-center text-sm md:text-base text-gray-600 italic max-w-4xl mx-auto px-4">
              {image.caption}
            </figcaption>
          )}
        </figure>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none z-10 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Изображение */}
          <div
            className="flex flex-col items-center justify-center max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={image.url}
              alt={image.alt || 'Изображение'}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            />
            {image.caption && (
              <p className="text-white text-center mt-6 max-w-3xl text-lg px-4">
                {image.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
