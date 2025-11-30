// components/news/blocks/TextBlock.tsx
// Отображение текстового блока

'use client';

import { ContentBlock } from '@/types/news';

// ============================================================
// ТИПЫ
// ============================================================

interface TextBlockProps {
  block: ContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TextBlock({ block }: TextBlockProps) {
  const { content, block_settings } = block;

  if (!content) return null;

  return (
    <div
      className={`text-block prose prose-lg max-w-none ${
        block_settings?.centered ? 'text-center' : ''
      } ${block_settings?.emphasized ? 'font-medium text-gray-900' : 'text-gray-700'}`}
    >
      <div className="whitespace-pre-wrap">{content}</div>
    </div>
  );
}
