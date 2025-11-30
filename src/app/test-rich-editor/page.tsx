'use client'

import { useState } from 'react'
import BlogEditor from '@/components/blog/BlogEditor'

export default function RichEditorTestPage() {
  const [content, setContent] = useState({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Добро пожаловать в тестовый редактор! Попробуйте добавить здание с помощью кнопки с иконкой дома в панели инструментов.'
          }
        ]
      }
    ]
  })

  const handleContentChange = (newContent: any) => {
    setContent(newContent)
    console.log('📝 Content updated:', newContent)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🏗️ Rich Editor Test - Добавление зданий
          </h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Редактор:</h2>
            <BlogEditor
              content={content}
              onChange={handleContentChange}
              placeholder="Начните писать и добавляйте здания через панель инструментов..."
            />
          </div>
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Debug - Текущий контент:
            </h2>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-64">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Инструкция по тестированию:</h3>
            <ol className="text-sm text-blue-800 list-decimal pl-4 space-y-1">
              <li>Напишите текст в редакторе</li>
              <li>Нажмите кнопку с иконкой дома (🏢) в панели инструментов</li>
              <li>Найдите здание в поиске или создайте новое</li>
              <li>Выберите здание - оно будет вставлено как кликабельная ссылка</li>
              <li>Проверьте, что в Debug секции появился building-link тег</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}