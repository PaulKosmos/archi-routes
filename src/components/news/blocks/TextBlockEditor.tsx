// components/news/blocks/TextBlockEditor.tsx
// Редактор текстового блока

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateContentBlock } from '@/types/news';
import BlockEditorWrapper from './BlockEditorWrapper';

// ============================================================
// ТИПЫ
// ============================================================

interface TextBlockEditorProps {
  block: CreateContentBlock;
  onChange: (updates: Partial<CreateContentBlock>) => void;
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
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ content: e.target.value });
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
        <div className="space-y-3">
          {/* Текстовое поле */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст блока
            </label>
            <textarea
              value={block.content || ''}
              onChange={handleContentChange}
              placeholder="Введите текст..."
              disabled={readOnly}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y"
            />
          </div>

          {/* Счетчик символов */}
          <div className="text-right text-xs text-gray-500">
            Символов: {block.content?.length || 0} / 10000
          </div>
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
