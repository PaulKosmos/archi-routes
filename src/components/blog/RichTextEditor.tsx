// components/blog/RichTextEditor.tsx
// WYSIWYG Rich Text Editor with icon-based toolbar

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  readOnly = false,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  }, [onChange]);

  // Format commands
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

  const toggleBold = () => execCommand('bold');
  const toggleItalic = () => execCommand('italic');

  // Toggle blockquote - if inside blockquote, remove it; otherwise add it
  const toggleBlockquote = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Find if we're inside a blockquote
    let node = selection.anchorNode;
    let blockquote: HTMLElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeName === 'BLOCKQUOTE') {
        blockquote = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (blockquote) {
      // Remove blockquote - replace with paragraph
      const p = document.createElement('p');
      p.innerHTML = blockquote.innerHTML;
      blockquote.parentNode?.replaceChild(p, blockquote);
    } else {
      // Add blockquote
      execCommand('formatBlock', 'blockquote');
    }

    handleInput();
    editorRef.current?.focus();
  };

  const setAlignment = (align: string) => {
    const commands: Record<string, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    };
    execCommand(commands[align]);
  };

  // Check if command is active
  const isCommandActive = useCallback((command: string, value?: string) => {
    try {
      if (value) {
        return document.queryCommandValue(command) === value;
      }
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }, []);

  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Bold',
      action: toggleBold,
      isActive: () => isCommandActive('bold'),
    },
    {
      icon: Italic,
      label: 'Italic',
      action: toggleItalic,
      isActive: () => isCommandActive('italic'),
    },
    {
      icon: Quote,
      label: 'Quote',
      action: toggleBlockquote,
      isActive: () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return false;
        let node = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'BLOCKQUOTE') return true;
          node = node.parentNode;
        }
        return false;
      },
    },
    { type: 'divider' as const },
    {
      icon: AlignLeft,
      label: 'Align Left',
      action: () => setAlignment('left'),
      isActive: () => isCommandActive('justifyLeft'),
    },
    {
      icon: AlignCenter,
      label: 'Align Center',
      action: () => setAlignment('center'),
      isActive: () => isCommandActive('justifyCenter'),
    },
    {
      icon: AlignRight,
      label: 'Align Right',
      action: () => setAlignment('right'),
      isActive: () => isCommandActive('justifyRight'),
    },
    {
      icon: AlignJustify,
      label: 'Justify',
      action: () => setAlignment('justify'),
      isActive: () => isCommandActive('justifyFull'),
    },
  ];

  if (readOnly) {
    return (
      <div
        className={`prose max-w-none p-4 ${className}`}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    );
  }

  return (
    <div className={`rich-text-editor border border-gray-300 rounded-lg ${isFocused ? 'ring-2 ring-blue-500 border-transparent' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="toolbar flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap">
        {toolbarButtons.map((button, index) => {
          if (button.type === 'divider') {
            return (
              <div
                key={`divider-${index}`}
                className="w-px h-6 bg-gray-300 mx-1"
              />
            );
          }

          const Icon = button.icon!;
          const active = button.isActive?.();

          return (
            <button
              key={button.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                button.action?.();
              }}
              className={`p-2 rounded transition-colors hover:bg-gray-200 ${
                active ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
              }`}
              title={button.label}
              aria-label={button.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="editor-content p-4 min-h-[200px] max-h-[600px] overflow-y-auto focus:outline-none prose max-w-none"
        data-placeholder={placeholder}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
        suppressContentEditableWarning
      />

      <style jsx>{`
        .editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
        }

        .editor-content:focus:before {
          content: '';
        }

        /* Styling for content to match published version */
        .editor-content {
          font-family: inherit;
          font-size: 1rem;
          line-height: 1.75;
          color: #1f2937;
        }

        .editor-content p {
          margin-bottom: 1em;
        }

        .editor-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #4b5563;
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.375rem;
        }

        .editor-content strong,
        .editor-content b {
          font-weight: 700;
          color: #111827;
        }

        .editor-content em,
        .editor-content i {
          font-style: italic;
        }

        /* Alignment styles */
        .editor-content [style*="text-align: left"] {
          text-align: left;
        }

        .editor-content [style*="text-align: center"] {
          text-align: center;
        }

        .editor-content [style*="text-align: right"] {
          text-align: right;
        }

        .editor-content [style*="text-align: justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  );
}
