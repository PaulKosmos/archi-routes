// components/news/blocks/TwoImagesBlock.tsx
// Отображение блока "Два изображения рядом"

'use client';

import { ContentBlock } from '@/types/news';

// ============================================================
// ТИПЫ
// ============================================================

interface TwoImagesBlockProps {
  block: ContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TwoImagesBlock({ block }: TwoImagesBlockProps) {
  const { images_data, block_settings } = block;

  if (!images_data || images_data.length < 2) return null;

  const [image1, image2] = images_data;
  const ratio = block_settings?.imageRatio || '50-50';
  const gap = block_settings?.gap || 'medium';

  // Определяем классы для grid в зависимости от пропорций
  const gridClass =
    ratio === '60-40'
      ? 'grid-cols-[60fr_40fr]'
      : ratio === '40-60'
      ? 'grid-cols-[40fr_60fr]'
      : 'grid-cols-2';

  const gapClass =
    gap === 'small' ? 'gap-2' : gap === 'large' ? 'gap-8' : 'gap-4';

  return (
    <div className={`two-images-block grid ${gridClass} ${gapClass}`}>
      {/* Первое изображение */}
      <figure>
        <img
          src={image1.url}
          alt={image1.alt || 'Изображение 1'}
          className="w-full h-auto rounded-lg shadow-md"
          loading="lazy"
        />
        {image1.caption && (
          <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
            {image1.caption}
          </figcaption>
        )}
      </figure>

      {/* Второе изображение */}
      <figure>
        <img
          src={image2.url}
          alt={image2.alt || 'Изображение 2'}
          className="w-full h-auto rounded-lg shadow-md"
          loading="lazy"
        />
        {image2.caption && (
          <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
            {image2.caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
