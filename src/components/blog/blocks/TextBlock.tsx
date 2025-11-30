// components/blog/blocks/TextBlock.tsx
// Отображение текстового блока в блоге

'use client';

import { BlogContentBlock } from '@/types/blog';

// ============================================================
// ТИПЫ
// ============================================================

interface TextBlockProps {
  block: BlogContentBlock;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TextBlock({ block }: TextBlockProps) {
  const { content } = block;

  if (!content) return null;

  return (
    <div
      className="text-block prose prose-lg max-w-none my-6 text-gray-800"
      dangerouslySetInnerHTML={{ __html: content }}
      style={{
        fontFamily: 'inherit',
        fontSize: '1rem',
        lineHeight: '1.75',
      }}
    />
  );
}
