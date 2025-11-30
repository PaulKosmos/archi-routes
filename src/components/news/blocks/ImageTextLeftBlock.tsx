// components/news/blocks/ImageTextLeftBlock.tsx
// Отображение блока "Изображение слева, текст справа"

'use client';

import { ContentBlock } from '@/types/news';

// ============================================================
// ТИПЫ
// ============================================================

interface ImageTextLeftBlockProps {
  block: ContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ImageTextLeftBlock({ block }: ImageTextLeftBlockProps) {
  const { content, images_data, block_settings } = block;

  if (!content || !images_data || images_data.length === 0) return null;

  const image = images_data[0];
  const imageSize = block_settings?.imageSize || 'medium';

  // Определяем размер изображения (для 2-колоночной сетки)
  const imageSizeClass =
    imageSize === 'small'
      ? 'lg:w-1/3'
      : imageSize === 'large'
      ? 'lg:w-2/3'
      : 'lg:w-1/2';

  const textSizeClass =
    imageSize === 'small'
      ? 'lg:w-2/3'
      : imageSize === 'large'
      ? 'lg:w-1/3'
      : 'lg:w-1/2';

  return (
    <div className="image-text-left-block max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Изображение слева */}
        <div className={imageSizeClass}>
          <figure>
            <img
              src={image.url}
              alt={image.alt || 'Изображение'}
              className="w-full h-auto rounded-lg shadow-md"
              loading="lazy"
            />
            {image.caption && (
              <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
                {image.caption}
              </figcaption>
            )}
          </figure>
        </div>

        {/* Текст справа */}
        <div className={`prose prose-lg ${textSizeClass}`}>
          <div className="whitespace-pre-wrap text-gray-700">{content}</div>
        </div>
      </div>
    </div>
  );
}
