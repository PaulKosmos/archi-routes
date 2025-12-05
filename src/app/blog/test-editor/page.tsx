'use client'

export const dynamic = 'force-dynamic'

// app/blog/test-editor/page.tsx
// Тестовая страница для проверки редактора блогов

import { useState } from 'react';
import { CreateBlogContentBlock } from '@/types/blog';
import ContentBlockEditor from '@/components/blog/ContentBlockEditor';
import ContentBlockRenderer from '@/components/blog/ContentBlockRenderer';

export default function TestEditorPage() {
  const [blocks, setBlocks] = useState<CreateBlogContentBlock[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Обработчик сохранения (для демо)
   */
  const handleSave = () => {
    console.log('Сохранение блоков:', blocks);
    alert(`Сохранено ${blocks.length} блоков! Проверьте консоль для деталей.`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Заголовок */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🧪 Тест редактора блогов
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Проверка всех 6 типов блоков контента
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Счетчик блоков */}
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Блоков: {blocks.length}
                </span>
              </div>

              {/* Переключатель превью */}
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showPreview
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showPreview ? '📝 Редактор' : '👁️ Превью'}
              </button>

              {/* Кнопка сохранения */}
              <button
                type="button"
                onClick={handleSave}
                disabled={blocks.length === 0}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showPreview ? (
          /* Режим редактирования */
          <div className="bg-white rounded-lg shadow-sm">
            <ContentBlockEditor
              blogPostId="test-post-123"
              initialBlocks={[]}
              onChange={setBlocks}
              onSave={handleSave}
              readOnly={false}
            />
          </div>
        ) : (
          /* Режим превью */
          <div className="space-y-6">
            {blocks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">
                  Добавьте блоки в редакторе, чтобы увидеть превью
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">
                    👁️ Режим превью
                  </h2>
                  <p className="text-sm text-blue-700">
                    Так будут выглядеть блоки в опубликованной статье.
                    Переключитесь на режим редактора, чтобы внести изменения.
                  </p>
                </div>

                {/* Рендер блоков */}
                <div className="bg-white rounded-lg shadow-sm p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {blocks.map((block, index) => (
                      <ContentBlockRenderer
                        key={index}
                        block={{
                          ...block,
                          id: `preview-${index}`,
                          blog_post_id: 'test-post-123',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        }}
                        onShowBuildingOnMap={(id) => {
                          alert(`Показать здание ${id} на карте`);
                        }}
                        onAddBuildingToRoute={(id) => {
                          alert(`Добавить здание ${id} в маршрут`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Информационная панель */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Статистика */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              📊 Статистика
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Всего блоков:</span>
                <span className="font-medium">{blocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Текстовых:</span>
                <span className="font-medium">
                  {blocks.filter((b) => b.block_type === 'text').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>С изображениями:</span>
                <span className="font-medium">
                  {blocks.filter((b) =>
                    ['text_image_right', 'image_text_left', 'full_width_image', 'gallery'].includes(b.block_type)
                  ).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Карточек зданий:</span>
                <span className="font-medium">
                  {blocks.filter((b) => b.block_type === 'building_card').length}
                </span>
              </div>
            </div>
          </div>

          {/* Доступные блоки */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              🧩 Доступные блоки
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>📝 Текстовый блок</li>
              <li>📝🖼️ Текст + изображение справа</li>
              <li>🖼️📝 Изображение слева + текст</li>
              <li>🖼️ Полноразмерное изображение</li>
              <li>🖼️🖼️ Галерея</li>
              <li>🏛️ Карточка здания</li>
            </ul>
          </div>

          {/* Инструкции */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              💡 Как использовать
            </h3>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Нажмите зелёную кнопку "Добавить блок"</li>
              <li>Выберите нужный тип блока</li>
              <li>Заполните контент</li>
              <li>Используйте drag & drop для изменения порядка</li>
              <li>Переключитесь на превью для просмотра</li>
              <li>Сохраните изменения</li>
            </ol>
          </div>
        </div>

        {/* JSON Debug (опционально) */}
        {blocks.length > 0 && (
          <details className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
              🔍 JSON Debug (для разработчиков)
            </summary>
            <pre className="mt-4 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(blocks, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
