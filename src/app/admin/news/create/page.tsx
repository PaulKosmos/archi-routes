'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNewsAPI } from '@/hooks/useNewsAPI';
import NewsEditor from '@/components/news/NewsEditor';
import ContentBlockEditor from '@/components/news/ContentBlockEditor';
import NewsPreview from '@/components/news/NewsPreview'; // ✅ Добавили импорт превью
import ImageUploader from '@/components/ImageUploader';
import {
  CreateNewsArticle,
  NEWS_CATEGORIES,
  NewsCategory,
  ContentBlock,
  CreateContentBlock
} from '@/types/news';
import {
  Save,
  Eye,
  ArrowLeft,
  Upload,
  X,
  Tag,
  MapPin,
  Building2,
  Search,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

interface Building {
  id: string;
  name: string;
  architect?: string;
  city?: string;
  main_image_url?: string;
}

export default function CreateNewsPage() {
  const { user, profile } = useAuth();
  const { createNews, searchBuildings: clientSearchBuildings, saveAllContentBlocks } = useNewsAPI();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<CreateNewsArticle>({
    title: '',
    slug: '',
    summary: '',
    content: '',
    category: 'projects',
    tags: [],
    status: 'draft',
    featured: false,
    priority: 0,
    // ✅ Добавили поля для изображений
    featured_image_url: '',
    featured_image_alt: '',
    gallery_images: []
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [buildingSearch, setBuildingSearch] = useState('');
  const [buildingResults, setBuildingResults] = useState<Building[]>([]);
  const [selectedBuildings, setSelectedBuildings] = useState<Building[]>([]);
  const [showBuildingSearch, setShowBuildingSearch] = useState(false);

  // ✅ Block Editor State
  const [contentBlocks, setContentBlocks] = useState<CreateContentBlock[]>([]);
  const [useBlockEditor, setUseBlockEditor] = useState(false);

  // ✅ Preview State
  const [showPreview, setShowPreview] = useState(false);
  
  // Check permissions
  const canCreateNews = profile && ['admin', 'moderator', 'editor', 'author', 'guide', 'expert'].includes(profile.role);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[а-я]/g, (char) => {
        const rusToEng: { [key: string]: string } = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return rusToEng[char] || char;
      })
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 100);
  };

  // Handle title change and auto-generate slug
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  // ✅ Обработка изменения изображений
  const handleImagesChange = (urls: string[]) => {
    console.log('Images changed:', urls);
    setFormData(prev => {
      const newData = { ...prev };
      
      // Первое изображение становится главным
      if (urls.length > 0) {
        newData.featured_image_url = urls[0];
        if (!newData.featured_image_alt) {
          newData.featured_image_alt = `Изображение к статье: ${prev.title}`;
        }
      } else {
        newData.featured_image_url = '';
        newData.featured_image_alt = '';
      }
      
      // Остальные изображения в галерею
      newData.gallery_images = urls.slice(1);
      
      return newData;
    });
  };

  // Add tag
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  // Search buildings using only client method
  const searchBuildings = async (query: string) => {
    if (query.length < 2) {
      setBuildingResults([]);
      return;
    }

    try {
      console.log('Searching buildings for:', query);
      
      // Use client method directly
      const buildings = await clientSearchBuildings(query);
      console.log('Building search results:', buildings);
      setBuildingResults(buildings);
    } catch (error) {
      console.error('Building search failed:', error);
      setBuildingResults([]);
    }
  };

  // Add building to selection
  const addBuilding = (building: Building) => {
    if (!selectedBuildings.find(b => b.id === building.id)) {
      setSelectedBuildings(prev => [...prev, building]);
      setFormData(prev => ({
        ...prev,
        related_buildings: [...(prev.related_buildings || []), building.id]
      }));
    }
    setBuildingSearch('');
    setBuildingResults([]);
    setShowBuildingSearch(false);
  };

  // Remove building from selection
  const removeBuilding = (buildingId: string) => {
    setSelectedBuildings(prev => prev.filter(b => b.id !== buildingId));
    setFormData(prev => ({
      ...prev,
      related_buildings: prev.related_buildings?.filter(id => id !== buildingId) || []
    }));
  };

  // Submit form using only client method
  const handleSubmit = async (status: 'draft' | 'review' | 'published') => {
    // Проверка: должен быть заголовок И (текстовый контент ИЛИ блоки)
    const hasContent = formData.content.trim() || (useBlockEditor && contentBlocks.length > 0);
    if (!formData.title.trim() || !hasContent) {
      setError('Заголовок и содержание обязательны для заполнения');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData: CreateNewsArticle = {
        ...formData,
        title: formData.title.trim(),
        // Если используется блочный редактор, content может быть пустым (контент в блоках)
        content: formData.content.trim() || (useBlockEditor ? 'Контент отображается в виде блоков' : ''),
        summary: formData.summary?.trim() || undefined,
        status,
      };

      console.log('Submitting news data:', submitData);

      // Use client method directly
      const result = await createNews(submitData);
      console.log('Created news:', result);

      // ✅ Save content blocks if using block editor
      if (useBlockEditor && contentBlocks.length > 0) {
        try {
          console.log('💾 Saving content blocks:', contentBlocks.length);
          const blocksToSave = contentBlocks.map((block, index) => ({
            ...block,
            news_id: result.id,
            order_index: index
          }));

          await saveAllContentBlocks(result.id, blocksToSave);
          console.log('✅ Content blocks saved successfully');
        } catch (blockError) {
          console.error('❌ Error saving content blocks:', blockError);
          // Continue anyway - article was created successfully
        }
      }

      // Redirect based on status
      if (status === 'published') {
        router.push(`/news/${result.slug}`);
      } else {
        router.push('/admin/news');
      }

    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при создании новости');
    } finally {
      setLoading(false);
    }
  };

  // Debounced building search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (buildingSearch.trim()) {
        searchBuildings(buildingSearch);
      } else {
        setBuildingResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [buildingSearch]);

  if (!user || !canCreateNews) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Доступ запрещен</h1>
          <p className="text-gray-600 mb-4">
            У вас нет прав для создания новостей
          </p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-gray-50 py-4 mb-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Назад
            </button>
            <h1 className="text-3xl font-bold text-gray-900">📝 Создание новости</h1>
          </div>

          {/* Empty space for symmetry */}
          <div></div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          
          {/* Basic Info */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Основная информация</h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заголовок <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Введите заголовок новости..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL (slug)
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 text-sm">/news/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-novosti"
                    className="flex-1 ml-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Автоматически генерируется из заголовка
                </p>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Краткое описание
                </label>
                <textarea
                  value={formData.summary || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Краткое описание новости для превью..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category and Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as NewsCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {NEWS_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Город
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Москва"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Страна
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Россия"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ✅ БЛОК ИЗОБРАЖЕНИЙ */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Изображения
            </h2>
            
            <div className="space-y-4">
              <div>
                <ImageUploader
                  maxFiles={6}
                  folder="news" 
                  onImagesChange={handleImagesChange}
                  existingImages={[
                    ...(formData.featured_image_url ? [formData.featured_image_url] : []),
                    ...(formData.gallery_images || [])
                  ]}
                />
              </div>
              
              {/* Описание главного изображения */}
              {formData.featured_image_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание главного изображения (Alt-текст)
                  </label>
                  <input
                    type="text"
                    value={formData.featured_image_alt || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      featured_image_alt: e.target.value 
                    }))}
                    placeholder="Описание изображения для SEO и доступности..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Первое загруженное изображение автоматически становится главным
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Содержание</h2>

              {/* Toggle between editors */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Режим редактора:</span>
                <button
                  type="button"
                  onClick={() => setUseBlockEditor(false)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !useBlockEditor
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Простой
                </button>
                <button
                  type="button"
                  onClick={() => setUseBlockEditor(true)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    useBlockEditor
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Блочный
                </button>
              </div>
            </div>

            {!useBlockEditor ? (
              /* Simple Editor */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текст новости <span className="text-red-500">*</span>
                </label>
                <NewsEditor
                  content={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Введите текст новости..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Используйте простой редактор для быстрого создания текстового контента
                </p>
              </div>
            ) : (
              /* Block Editor */
              <div>
                <ContentBlockEditor
                  newsId="temp-new-article" // Временный ID для нового контента
                  initialBlocks={contentBlocks}
                  onChange={(blocks) => {
                    setContentBlocks(blocks);
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Блочный редактор позволяет создавать структурированный контент с разными типами блоков. Блоки будут сохранены вместе с новостью.
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Теги</h2>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Добавить тег..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleAddTag}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Tag className="w-4 h-4" />
                  Добавить
                </button>
              </div>
              
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Related Buildings */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Связанные здания</h2>
            
            <div className="space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={buildingSearch}
                    onChange={(e) => setBuildingSearch(e.target.value)}
                    onFocus={() => setShowBuildingSearch(true)}
                    placeholder="Найти здание..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowBuildingSearch(!showBuildingSearch)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Поиск
                  </button>
                </div>
                
                {/* Building Search Results */}
                {showBuildingSearch && buildingResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {buildingResults.map((building) => (
                      <button
                        key={building.id}
                        onClick={() => addBuilding(building)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {building.main_image_url && (
                          <img
                            src={building.main_image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{building.name}</p>
                          {building.architect && (
                            <p className="text-sm text-gray-600">Архитектор: {building.architect}</p>
                          )}
                          {building.city && (
                            <p className="text-sm text-gray-500">{building.city}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Buildings */}
              {selectedBuildings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Выбранные здания:</p>
                  <div className="space-y-2">
                    {selectedBuildings.map((building) => (
                      <div
                        key={building.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {building.main_image_url && (
                          <img
                            src={building.main_image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{building.name}</p>
                          {building.architect && (
                            <p className="text-sm text-gray-600">Архитектор: {building.architect}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeBuilding(building.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Настройки</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Главная новость (отображается на главной странице)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Приоритет (для сортировки)
                </label>
                <input
                  type="number"
                  value={formData.priority || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Чем больше число, тем выше в списке
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex items-center gap-3 pt-6 border-t border-gray-200">
          {/* Preview Button */}
          <button
            onClick={() => setShowPreview(true)}
            disabled={loading || !formData.title.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Предпросмотр новости"
          >
            <Eye className="w-5 h-5" />
            Предпросмотр
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Action Buttons */}
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>

          <button
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Сохранение...' : 'Сохранить черновик'}
          </button>

          {/* Submit button - for guides/experts/authors */}
          {['guide', 'expert', 'author'].includes(profile?.role || '') && (
            <button
              onClick={() => handleSubmit('review')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              {loading ? 'Отправка...' : 'Отправить на модерацию'}
            </button>
          )}

          {/* Publish button - for editors/moderators/admins */}
          {['editor', 'moderator', 'admin'].includes(profile?.role || '') && (
            <button
              onClick={() => handleSubmit('published')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              {loading ? 'Публикация...' : 'Опубликовать'}
            </button>
          )}
        </div>

      </div>

      {/* ✅ News Preview Modal */}
      <NewsPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        news={{
          ...formData,
          id: 'temp-preview-id',
          slug: formData.slug || 'preview',
          author_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        blocks={contentBlocks.map((block, index) => ({
          ...block,
          id: `temp-block-${index}`,
          news_id: 'temp-preview-id',
          order_index: index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))}
      />
    </div>
  );
}
