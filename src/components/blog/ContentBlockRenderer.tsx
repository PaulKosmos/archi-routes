// components/blog/ContentBlockRenderer.tsx
// Рендеринг блоков контента блога на странице чтения

'use client';

import { BlogContentBlock } from '@/types/blog';
import TextBlock from './blocks/TextBlock';
import TextImageRightBlock from './blocks/TextImageRightBlock';
import ImageTextLeftBlock from './blocks/ImageTextLeftBlock';
import FullWidthImageBlock from './blocks/FullWidthImageBlock';
import GalleryBlock from './blocks/GalleryBlock';
import BuildingCardBlock from './blocks/BuildingCardBlock';

// ============================================================
// ТИПЫ
// ============================================================

interface ContentBlockRendererProps {
  block: BlogContentBlock;
  onShowBuildingOnMap?: (buildingId: string) => void;
  onAddBuildingToRoute?: (buildingId: string) => void;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

/**
 * Рендерит блок контента в зависимости от его типа
 */
export default function ContentBlockRenderer({
  block,
  onShowBuildingOnMap,
  onAddBuildingToRoute
}: ContentBlockRendererProps) {
  switch (block.block_type) {
    case 'text':
      return <TextBlock block={block} />;

    case 'text_image_right':
      return <TextImageRightBlock block={block} />;

    case 'image_text_left':
      return <ImageTextLeftBlock block={block} />;

    case 'full_width_image':
      return <FullWidthImageBlock block={block} />;

    case 'gallery':
      return <GalleryBlock block={block} />;

    case 'building_card':
      // BuildingCardBlock has its own map toggle, doesn't need external handlers
      return <BuildingCardBlock block={block} />;

    default:
      console.warn(`Неизвестный тип блока: ${block.block_type}`);
      return null;
  }
}
