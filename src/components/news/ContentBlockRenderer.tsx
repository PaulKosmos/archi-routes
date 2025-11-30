// components/news/ContentBlockRenderer.tsx
// Компонент для отображения блоков контента на странице новости

'use client';

import { ContentBlock } from '@/types/news';
import TextBlock from './blocks/TextBlock';
import TextImageRightBlock from './blocks/TextImageRightBlock';
import ImageTextLeftBlock from './blocks/ImageTextLeftBlock';
import TwoImagesBlock from './blocks/TwoImagesBlock';
import GalleryBlock from './blocks/GalleryBlock';

// ============================================================
// ТИПЫ
// ============================================================

interface ContentBlockRendererProps {
  block: ContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ContentBlockRenderer({ block }: ContentBlockRendererProps) {
  switch (block.block_type) {
    case 'text':
      return <TextBlock block={block} />;
    case 'text_image_right':
      return <TextImageRightBlock block={block} />;
    case 'image_text_left':
      return <ImageTextLeftBlock block={block} />;
    case 'two_images':
      return <TwoImagesBlock block={block} />;
    case 'gallery':
      return <GalleryBlock block={block} />;
    default:
      console.warn(`Unknown block type: ${block.block_type}`);
      return null;
  }
}
