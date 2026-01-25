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
  const textAlign = (block_settings?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
  const fontSize = (block_settings?.fontSize || 'medium') as 'small' | 'medium' | 'large';

  // Стили размера шрифта
  const fontSizeClasses: Record<'small' | 'medium' | 'large', string> = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };
  const fontSizeClass = fontSizeClasses[fontSize];

  // Стили выравнивания текста
  const alignClasses: Record<'left' | 'center' | 'right' | 'justify', string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  };
  const alignClass = alignClasses[textAlign];

  // Вычисляем ширину текста и изображения
  const textWidth = 100 - imageWidth;

  return (
    <div className="text-image-right-block max-w-6xl mx-auto my-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Текст слева */}
        <div
          className={`prose ${fontSizeClass} ${alignClass} text-foreground/90`}
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
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            {image.caption && (
              <figcaption className="mt-3 text-sm text-muted-foreground text-center italic">
                {image.caption}
              </figcaption>
            )}
          </figure>
        </div>
      </div>
    </div>
  );
}
