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
    <section className="text-block">
      <div
        className="text-foreground/90 leading-relaxed text-base"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
