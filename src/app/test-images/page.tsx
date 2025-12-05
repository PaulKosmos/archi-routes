// src/app/test-images/page.tsx - Тест загрузки изображений

'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getStorageUrl } from '@/lib/storage'

const TEST_IMAGES = [
  'https://jkozshkubprsvkayfvhf.supabase.co/storage/v1/object/public/photos/buildings/gallery/buildings/7b0079c2-6372-4df4-a1f1-f80d5483a6cf/1751486068286-lk4yf1euizn.jpg',
  'https://jkozshkubprsvkayfvhf.supabase.co/storage/v1/object/public/photos/buildings/gallery/buildings/7b0079c2-6372-4df4-a1f1-f80d5483a6cf/1751655860939-ti8htsnuzu.jpg',
  'https://jkozshkubprsvkayfvhf.supabase.co/storage/v1/object/public/photos/buildings/gallery/buildings/7b0079c2-6372-4df4-a1f1-f80d5483a6cf/1751656883304-pv0rjk7jvj.jpg'
]

export default function TestImagesPage() {
  const [imageStatus, setImageStatus] = useState<{[key: string]: 'loading' | 'success' | 'error'}>({})

  const handleImageLoad = (url: string) => {
    setImageStatus(prev => ({ ...prev, [url]: 'success' }))
    console.log('✅ Image loaded successfully:', url)
  }

  const handleImageError = (url: string) => {
    setImageStatus(prev => ({ ...prev, [url]: 'error' }))
    console.error('❌ Image failed to load:', url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 Тест загрузки изображений</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Информация о функции getStorageUrl</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">
              Функция <code>getStorageUrl</code> теперь умеет обрабатывать:
            </p>
            <ul className="list-disc list-inside mt-2 text-blue-700">
              <li>Полные URL (возвращает как есть)</li>
              <li>Относительные пути (генерирует URL через Supabase)</li>
              <li>Пустые значения (возвращает пустую строку)</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Тест прямых URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Тест прямых URL из БД</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TEST_IMAGES.map((url, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 block mb-1">Исходный URL:</span>
                    <code className="text-xs bg-gray-100 p-1 rounded break-all">
                      {url}
                    </code>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 block mb-1">Обработанный URL:</span>
                    <code className="text-xs bg-green-100 p-1 rounded break-all">
                      {getStorageUrl(url, 'photos')}
                    </code>
                  </div>

                  <div className="relative">
                    <img
                      src={getStorageUrl(url, 'photos')}
                      alt={`Test image ${index + 1}`}
                      className="w-full h-48 object-cover rounded"
                      onLoad={() => handleImageLoad(url)}
                      onError={() => handleImageError(url)}
                      style={{
                        border: imageStatus[url] === 'success' ? '2px solid green' : 
                               imageStatus[url] === 'error' ? '2px solid red' : '2px solid gray'
                      }}
                    />
                    
                    {/* Статус загрузки */}
                    <div className="absolute top-2 right-2">
                      {imageStatus[url] === 'success' && (
                        <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                          ✅ Загружено
                        </div>
                      )}
                      {imageStatus[url] === 'error' && (
                        <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                          ❌ Ошибка
                        </div>
                      )}
                      {!imageStatus[url] && (
                        <div className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
                          ⏳ Загрузка
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-center">
                    <span className="text-sm text-gray-600">
                      Изображение {index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Тест разных случаев */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Тест различных случаев</h2>
            <div className="space-y-4">
              
              {/* Пустая строка */}
              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-medium">Пустая строка:</h3>
                <code className="text-sm bg-gray-100 p-1 rounded">
                  getStorageUrl('') = "{getStorageUrl('', 'photos')}"
                </code>
              </div>

              {/* Null */}
              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-medium">Null значение:</h3>
                <code className="text-sm bg-gray-100 p-1 rounded">
                  getStorageUrl(null) = "{getStorageUrl(null as any, 'photos')}"
                </code>
              </div>

              {/* Относительный путь */}
              <div className="border-l-4 border-blue-400 pl-4">
                <h3 className="font-medium">Относительный путь:</h3>
                <code className="text-sm bg-gray-100 p-1 rounded block mb-2">
                  getStorageUrl('buildings/main/test.jpg') = 
                </code>
                <code className="text-xs text-green-600 break-all">
                  {getStorageUrl('buildings/main/test.jpg', 'photos')}
                </code>
              </div>

              {/* Внешний URL */}
              <div className="border-l-4 border-green-400 pl-4">
                <h3 className="font-medium">Внешний URL:</h3>
                <code className="text-sm bg-gray-100 p-1 rounded block mb-2">
                  getStorageUrl('https://example.com/image.jpg') = 
                </code>
                <code className="text-xs text-green-600">
                  {getStorageUrl('https://example.com/image.jpg', 'photos')}
                </code>
              </div>
            </div>
          </div>

          {/* Инструкции по загрузке новых фото */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📝 Инструкции по загрузке новых фото</h2>
            <div className="prose text-gray-700">
              <p className="mb-4">
                Если старые изображения не загружаются, вот как загрузить новые:
              </p>
              
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>Перейдите на страницу любого здания</li>
                <li>Нажмите "Написать обзор"</li>
                <li>Загрузите новые фотографии через форму</li>
                <li>Опубликуйте обзор</li>
                <li>Новые фотографии будут отображаться в галерее обзора</li>
              </ol>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm">
                  <strong>Примечание:</strong> Старые URL могут не работать из-за изменений в настройках Supabase Storage.
                  Новые загруженные изображения будут работать корректно.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
