'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Building2
} from 'lucide-react';

interface NewsEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function NewsEditor({ content, onChange, placeholder = "Start writing..." }: NewsEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Инициализация контента ТОЛЬКО один раз при загрузке существующего контента
  useEffect(() => {
    if (content && content.trim() && editorRef.current && !isInitialized) {
      // Для новостей используем простой HTML контент
      const htmlContent = content.replace(/\n/g, '<br>');
      editorRef.current.innerHTML = htmlContent;
      setHasContent(true);
      setIsInitialized(true);
    }
  }, [content, isInitialized]);

  const handleContentChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Конвертируем HTML обратно в простой текст с переносами
      const textContent = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p><p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

      onChange(textContent);
    }
  };

  // Простая обработка ввода
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHasContent(html.trim().length > 0);
      handleContentChange();
    }
  };

  // 🛠️ УПРОЩЕННЫЕ КОМАНДЫ ФОРМАТИРОВАНИЯ
  const executeCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    try {
      const success = document.execCommand(command, false, value);
      if (success) {
        setTimeout(handleContentChange, 10);
      }
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      const text = prompt('Enter link text:') || url;
      executeCommand('insertHTML', `<a href="${url}" class="text-blue-600 hover:underline" target="_blank">${text}</a>`);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      executeCommand('insertHTML', `<img src="${url}" alt="Image" class="max-w-full h-auto my-4 rounded-lg" />`);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Панель инструментов */}
      <div className="bg-gray-50 border-b border-gray-300 p-2">
        <div className="flex flex-wrap items-center gap-1">

          {/* Форматирование текста */}
          <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => executeCommand('bold')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          {/* Заголовки */}
          <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'h1')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'h2')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'h3')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>
          </div>

          {/* Списки */}
          <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => executeCommand('insertUnorderedList')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Bulleted List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('insertOrderedList')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          {/* Медиа и ссылки */}
          <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={insertLink}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Insert Link"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertImage}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Insert Image"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'blockquote')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Область редактирования */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleContentChange}
        className="min-h-[400px] p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-lg max-w-none"
        style={{
          lineHeight: '1.6',
          fontSize: '16px'
        }}
        suppressContentEditableWarning={true}
        data-placeholder={hasContent ? '' : placeholder}
      />

      {/* CSS для placeholder */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          cursor: text;
        }
        
        [contenteditable]:focus:before {
          content: none;
        }
        
        /* Стили для элементов редактора */
        [contenteditable] h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        [contenteditable] h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        [contenteditable] h3 {
          font-size: 1.125rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        
        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        
        [contenteditable] blockquote {
          border-left: 4px solid #D1D5DB;
          padding-left: 1rem;
          font-style: italic;
          color: #6B7280;
          margin-bottom: 1rem;
        }
        
        [contenteditable] a {
          color: #2563EB;
          text-decoration: underline;
        }
        
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
          border-radius: 0.5rem;
        }
        
        [contenteditable] p {
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
