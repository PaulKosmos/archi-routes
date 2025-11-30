// components/blog/BlogPreviewModal.tsx
// Модальное окно для предпросмотра блога перед публикацией

'use client';

import React from 'react';
import { CreateBlogContentBlock, BlogTag } from '@/types/blog';
import ContentBlockRenderer from './ContentBlockRenderer';
import { X, Calendar, Clock, Eye, User } from 'lucide-react';

interface BlogPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  featuredImagePreview: string;
  blocks: CreateBlogContentBlock[];
  tags: BlogTag[];
  selectedTagIds: string[];
  readingTime: number;
}

export default function BlogPreviewModal({
  isOpen,
  onClose,
  title,
  excerpt,
  featuredImagePreview,
  blocks,
  tags,
  selectedTagIds,
  readingTime
}: BlogPreviewModalProps) {
  if (!isOpen) return null;

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Преобразуем CreateBlogContentBlock в BlogContentBlock для рендерера
  const blocksForRender = blocks.map((block, index) => ({
    ...block,
    id: `preview-${index}`,
    blog_post_id: 'preview',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header с кнопкой закрытия */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Предпросмотр статьи</h2>
              <p className="text-sm text-gray-500">Так будет выглядеть ваша статья после публикации</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="px-6 py-8">
            {/* Заголовок статьи */}
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {title || 'Заголовок статьи'}
              </h1>

              {excerpt && (
                <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                  {excerpt}
                </p>
              )}

              {/* Мета-информация */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Автор статьи</p>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(new Date())}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {readingTime} мин чтения
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        0 просмотров
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Главное изображение */}
            {featuredImagePreview && (
              <div className="mb-8">
                <img
                  src={featuredImagePreview}
                  alt={title}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Контент статьи */}
            {blocks.length > 0 ? (
              <article className="space-y-6 mb-8">
                {blocksForRender.map((block, index) => (
                  <ContentBlockRenderer
                    key={index}
                    block={block}
                  />
                ))}
              </article>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">Нет блоков контента для отображения</p>
              </div>
            )}

            {/* Теги */}
            {selectedTags.length > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Теги:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
