'use client'

import { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import BuildingSelector from './BuildingSelector'
import BuildingCreator from './BuildingCreator'

interface BlogEditorProps {
  content: any
  onChange: (content: any) => void
  placeholder?: string
}

export default function BlogEditor({ content, onChange, placeholder = "Начните писать..." }: BlogEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showBuildingSelector, setShowBuildingSelector] = useState(false)
  const [showBuildingCreator, setShowBuildingCreator] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  // Инициализация контента ТОЛЬКО один раз при загрузке существующего контента
  useEffect(() => {
    if (content && content.content && content.content.length > 0 && editorRef.current && !isInitialized) {
      const html = convertContentToHTML(content)
      if (html.trim()) {
        editorRef.current.innerHTML = html
        setHasContent(true)
        setIsInitialized(true)
      }
    }
  }, [content, isInitialized])

  const convertContentToHTML = (content: any): string => {
    if (!content || !content.content) return ''
    
    return content.content.map((node: any) => {
      switch (node.type) {
        case 'paragraph':
          const text = node.content?.map((textNode: any) => {
            if (textNode.type === 'text') {
              let html = textNode.text
              if (textNode.marks) {
                textNode.marks.forEach((mark: any) => {
                  switch (mark.type) {
                    case 'bold':
                      html = `<strong>${html}</strong>`
                      break
                    case 'italic':
                      html = `<em>${html}</em>`
                      break
                    case 'underline':
                      html = `<u>${html}</u>`
                      break
                    case 'link':
                      html = `<a href="${mark.attrs.href}" class="text-blue-600 hover:underline">${html}</a>`
                      break
                  }
                })
              }
              return html
            }
            return ''
          }).join('') || ''
          return `<p>${text}</p>`
        
        case 'heading':
          const level = node.attrs?.level || 1
          const headingText = node.content?.[0]?.text || ''
          return `<h${level} class="font-bold ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg'} mb-4">${headingText}</h${level}>`
        
        default:
          return ''
      }
    }).join('')
  }

  const convertHTMLToContent = (html: string): any => {
    // Простое преобразование
    const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim()
    
    return {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: cleanText ? [{
          type: 'text',
          text: cleanText
        }] : []
      }]
    }
  }

  const handleContentChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      const contentObj = convertHTMLToContent(html)
      onChange(contentObj)
    }
  }

  // Простая обработка ввода
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      setHasContent(html.trim().length > 0)
      handleContentChange()
    }
  }

  // 🛠️ УПРОЩЕННЫЕ КОМАНДЫ ФОРМАТИРОВАНИЯ
  const executeCommand = (command: string, value?: string) => {
    if (!editorRef.current) return
    
    editorRef.current.focus()
    
    try {
      const success = document.execCommand(command, false, value)
      if (success) {
        setTimeout(handleContentChange, 10)
      }
    } catch (error) {
      console.error('Error executing command:', error)
    }
  }

  const insertLink = () => {
    const url = prompt('Введите URL:')
    if (url) {
      const text = prompt('Введите текст ссылки:') || url
      executeCommand('insertHTML', `<a href="${url}" class="text-blue-600 hover:underline" target="_blank">${text}</a>`)
    }
  }

  const insertImage = () => {
    const url = prompt('Введите URL изображения:')
    if (url) {
      executeCommand('insertHTML', `<img src="${url}" alt="Изображение" class="max-w-full h-auto my-4 rounded-lg" />`)
    }
  }

  const insertBuildingMention = () => {
    setShowBuildingSelector(true)
  }

  const handleBuildingSelect = (building: any) => {
    const buildingHTML = `<span class="building-link bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 cursor-pointer mx-1" data-building-id="${building.id}">${building.name}</span>`
    executeCommand('insertHTML', buildingHTML)
    setShowBuildingSelector(false)
  }

  const handleBuildingCreate = (building: any) => {
    handleBuildingSelect(building)
    setShowBuildingCreator(false)
  }

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
              title="Жирный"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Курсив"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Подчеркнутый"
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
              title="Заголовок 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'h2')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Заголовок 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'h3')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Заголовок 3"
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
              title="Маркированный список"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('insertOrderedList')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Нумерованный список"
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
              title="Вставить ссылку"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertImage}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Вставить изображение"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', 'blockquote')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Цитата"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          {/* Специальные элементы */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={insertBuildingMention}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Добавить здание"
            >
              <Building2 className="w-4 h-4" />
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
        
        .building-link {
          background-color: #DBEAFE;
          color: #1E40AF;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          margin: 0 0.25rem;
          cursor: pointer;
        }
        
        .building-link:hover {
          background-color: #BFDBFE;
        }
      `}</style>

      {/* Модальные окна для работы со зданиями */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onSelect={handleBuildingSelect}
        onCreateNew={() => {
          setShowBuildingCreator(true)
          setShowBuildingSelector(false)
        }}
      />
      
      <BuildingCreator
        isOpen={showBuildingCreator}
        onClose={() => setShowBuildingCreator(false)}
        onSuccess={handleBuildingCreate}
      />
    </div>
  )
}
