// components/blog/blocks/editors/TextBlockEditor.tsx
// Редактор текстового блока для блога

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateBlogContentBlock } from '@/types/blog';
import BlockEditorWrapper from '../BlockEditorWrapper';
import RichTextEditor from '../../RichTextEditor';

// ============================================================
// ТИПЫ
// ============================================================

interface TextBlockEditorProps {
  block: CreateBlogContentBlock;
  onChange: (updates: Partial<CreateBlogContentBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  errors?: string[];
  readOnly?: boolean;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TextBlockEditor({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  readOnly = false,
}: TextBlockEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.order_index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  /**
   * Обработчик изменения текста
   */
  const handleContentChange = (content: string) => {
    onChange({ content });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditorWrapper
        blockType="text"
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        errors={errors}
        dragHandleProps={{ ...attributes, ...listeners }}
        readOnly={readOnly}
      >
        <div className="space-y-4">
          {/* Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст блока
            </label>
            <RichTextEditor
              value={block.content || ''}
              onChange={handleContentChange}
              placeholder="Введите текст блога... Используйте панель инструментов для форматирования."
              readOnly={readOnly}
            />
          </div>

          {/* Счетчик символов */}
          <div className="flex items-center justify-end text-xs text-gray-500">
            <span className="font-medium">
              {block.content?.replace(/<[^>]*>/g, '').length || 0} символов
            </span>
          </div>
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
