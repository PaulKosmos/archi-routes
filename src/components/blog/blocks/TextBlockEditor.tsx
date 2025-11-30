// components/blog/blocks/TextBlockEditor.tsx
// Редактор текстового блока для блога

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateBlogContentBlock } from '@/types/blog';
import BlockEditorWrapper from './BlockEditorWrapper';

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
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ content: e.target.value });
  };

  /**
   * Обработчик изменения настроек выравнивания
   */
  const handleAlignmentChange = (align: 'left' | 'center' | 'right' | 'justify') => {
    onChange({
      block_settings: {
        ...block.block_settings,
        textAlign: align,
      },
    });
  };

  /**
   * Обработчик изменения размера шрифта
   */
  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    onChange({
      block_settings: {
        ...block.block_settings,
        fontSize: size,
      },
    });
  };

  const settings = block.block_settings || {};
  const textAlign = settings.textAlign || 'left';
  const fontSize = settings.fontSize || 'medium';

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
          {/* Настройки */}
          <div className="flex gap-4">
            {/* Выравнивание текста */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выравнивание
              </label>
              <div className="flex gap-2">
                {['left', 'center', 'right', 'justify'].map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => handleAlignmentChange(align as any)}
                    disabled={readOnly}
                    className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                      textAlign === align
                        ? 'bg-green-500 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {align === 'left' && 'Слева'}
                    {align === 'center' && 'По центру'}
                    {align === 'right' && 'Справа'}
                    {align === 'justify' && 'По ширине'}
                  </button>
                ))}
              </div>
            </div>

            {/* Размер шрифта */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Размер текста
              </label>
              <div className="flex gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFontSizeChange(size as any)}
                    disabled={readOnly}
                    className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                      fontSize === size
                        ? 'bg-green-500 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {size === 'small' && 'Маленький'}
                    {size === 'medium' && 'Средний'}
                    {size === 'large' && 'Большой'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Текстовое поле */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст блока
            </label>
            <textarea
              value={block.content || ''}
              onChange={handleContentChange}
              placeholder="Введите текст блога... Поддерживается HTML разметка."
              disabled={readOnly}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              💡 Совет: Вы можете использовать HTML теги для форматирования (например, &lt;strong&gt;, &lt;em&gt;, &lt;a href=""&gt;)
            </p>
          </div>

          {/* Счетчик символов */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Символов: {block.content?.length || 0}</span>
            <span className={block.content && block.content.length > 10000 ? 'text-red-500 font-semibold' : ''}>
              Максимум: 10,000
            </span>
          </div>

          {/* Предпросмотр */}
          {block.content && block.content.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Предпросмотр:
              </label>
              <div
                className={`p-4 bg-gray-50 rounded-lg prose prose-sm max-w-none ${
                  fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'
                }`}
                style={{ textAlign: textAlign as any }}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            </div>
          )}
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
