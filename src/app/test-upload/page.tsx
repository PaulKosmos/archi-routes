// src/app/test-upload/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import ImageUploader from '../../components/ImageUploader'

export default function TestUploadPage() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            🧪 Тестирование загрузки изображений
          </h1>

          {/* Компонент загрузки */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Загрузка изображений зданий
            </h2>
            <ImageUploader
              maxFiles={5}
              folder="buildings"
              onImagesChange={setUploadedImages}
              existingImages={uploadedImages}
            />
          </div>

          {/* Результат */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              📸 Результат загрузки
            </h3>
            
            {uploadedImages.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    📁 Успешно загружено: <span className="font-semibold">{uploadedImages.length}</span> изображений
                  </p>
                  <button
                    onClick={() => setUploadedImages([])}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    🗑️ Очистить все
                  </button>
                </div>

                {/* Галерея загруженных изображений */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                      <img
                        src={url}
                        alt={`Изображение ${index + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">
                            Изображение #{index + 1}
                          </p>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            ✅ Загружено
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Готово к использованию
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Техническая информация (скрытая по умолчанию) */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    🔧 Показать техническую информацию (для разработчиков)
                  </summary>
                  <div className="mt-3 bg-gray-50 rounded-lg p-4">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(uploadedImages, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">
                  Изображения появятся здесь после успешной загрузки
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Поддерживаются форматы: JPG, PNG, GIF
                </p>
              </div>
            )}
          </div>

          {/* Инструкции */}
          <div className="border-t pt-8 mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              📋 Что тестируем
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>✅ Загрузка изображений через выбор файлов</li>
              <li>✅ Drag & Drop изображений</li>
              <li>✅ Автоматическое сжатие больших изображений</li>
              <li>✅ Валидация типов файлов</li>
              <li>✅ Ограничение размера файлов (10MB)</li>
              <li>✅ Ограничение количества файлов (5 шт)</li>
              <li>✅ Прогресс загрузки</li>
              <li>✅ Удаление изображений</li>
              <li>✅ Получение публичных URL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}