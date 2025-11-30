// components/blog/blocks/TextImageRightBlock.tsx
// Отображение блока "Текст с изображением справа" в блоге

'use client';

import { BlogContentBlock } from '@/types/blog';
import Image from 'next/image';

// ============================================================
// ТИПЫ
// ============================================================

interface TextImageRightBlockProps {
  block: BlogContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TextImageRightBlock({ block }: TextImageRightBlockProps) {
  const { content, images_data, block_settings } = block;

  if (!content || !images_data || images_data.length === 0) return null;

  const image = images_data[0];
  const imageWidth = block_settings?.imageWidth || 40; // Процент ширины
  const imageRatio = block_settings?.imageRatio || '1:1';
  const textAlign = block_settings?.textAlign || 'left';
  const fontSize = block_settings?.fontSize || 'medium';

  // Стили размера шрифта
  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }[fontSize];

  // Стили выравнивания текста
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  }[textAlign];

  // Вычисляем ширину текста и изображения
  const textWidth = 100 - imageWidth;

  return (
    <div className="text-image-right-block max-w-6xl mx-auto my-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Текст слева */}
        <div
          className={`prose prose-lg ${fontSizeClass} ${alignClass} text-gray-800`}
          style={{ width: `${textWidth}%` }}
        >
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>

        {/* Изображение справа */}
        <div
          className="flex-shrink-0"
          style={{ width: `${imageWidth}%` }}
        >
          <figure>
            <img
              src={image.url}
              alt={image.alt || 'Изображение'}
              className="w-full h-auto rounded-lg shadow-lg object-cover"
              loading="lazy"
            />
            {image.caption && (
              <figcaption className="mt-3 text-sm text-gray-600 text-center italic">
                {image.caption}
              </figcaption>
            )}
          </figure>
        </div>
      </div>
    </div>
  );
}
