// components/news/NewsPreview.tsx
// Модальное окно для предпросмотра новости

'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { NewsArticle, ContentBlock } from '@/types/news';
import ContentBlockRenderer from './ContentBlockRenderer';

// ============================================================
// ТИПЫ
// ============================================================

interface NewsPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  news: Partial<NewsArticle>;
  blocks: ContentBlock[];
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function NewsPreview({ isOpen, onClose, news, blocks }: NewsPreviewProps) {
  /**
   * Форматирует дату публикации
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не опубликовано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Заголовок модального окна */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Предпросмотр новости
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Содержимое */}
                <div className="px-6 py-8 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Featured Image */}
                  {news.featured_image_url && (
                    <div className="mb-8 -mx-6">
                      <img
                        src={news.featured_image_url}
                        alt={news.title || 'Изображение новости'}
                        className="w-full h-96 object-cover"
                      />
                    </div>
                  )}

                  {/* Категория и дата */}
                  <div className="flex items-center space-x-4 mb-4">
                    {news.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {news.category}
                      </span>
                    )}
                    {news.subcategory && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {news.subcategory}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{formatDate(news.published_at)}</span>
                  </div>

                  {/* Заголовок */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{news.title || 'Без заголовка'}</h1>

                  {/* Краткое описание */}
                  {news.summary && (
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">{news.summary}</p>
                  )}

                  {/* Теги */}
                  {news.tags && news.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {news.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Разделитель */}
                  <hr className="mb-8 border-gray-200" />

                  {/* Блоки контента */}
                  {blocks.length > 0 ? (
                    <div className="space-y-8">
                      {blocks.map((block, index) => (
                        <ContentBlockRenderer key={block.id || index} block={block} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Нет блоков контента</p>
                    </div>
                  )}

                  {/* Связанные здания */}
                  {news.related_buildings && news.related_buildings.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Упомянутые объекты
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {news.related_buildings.map((buildingId, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                          >
                            {buildingId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Подвал */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {blocks.length > 0 && (
                        <span>
                          {blocks.length} {blocks.length === 1 ? 'блок' : blocks.length < 5 ? 'блока' : 'блоков'} контента
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
