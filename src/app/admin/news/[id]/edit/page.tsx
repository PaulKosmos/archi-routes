'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase'; // ✅ Прямое подключение
import { useNewsAPI } from '@/hooks/useNewsAPI';
import NewsEditor from '@/components/news/NewsEditor';
import ContentBlockEditor from '@/components/news/ContentBlockEditor';
import NewsPreview from '@/components/news/NewsPreview'; // ✅ Добавили импорт превью
import ImageUploader from '@/components/ImageUploader';
import {
  NewsArticleWithDetails,
  UpdateNewsArticle,
  NEWS_CATEGORIES,
  NewsCategory,
  ContentBlock,
  CreateContentBlock
} from '@/types/news';
import {
  Save,
  Eye,
  ArrowLeft,
  X,
  Tag,
  Search,
  AlertCircle,
  Loader,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

interface Building {
  id: string;
  name: string;
  architect?: string;
  city?: string;
  main_image_url?: string;
}

export default function EditNewsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile, initialized } = useAuth(); // ✅ Добавили initialized
  const { fetchContentBlocks, saveAllContentBlocks } = useNewsAPI();
  const router = useRouter();
  const params = useParams();
  const newsId = params.id as string;

  // State
  const [article, setArticle] = useState<NewsArticleWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [buildingSearch, setBuildingSearch] = useState('');
  const [buildingResults, setBuildingResults] = useState<Building[]>([]);
  const [selectedBuildings, setSelectedBuildings] = useState<Building[]>([]);
  const [showBuildingSearch, setShowBuildingSearch] = useState(false);

  // ✅ Block Editor State
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [useBlockEditor, setUseBlockEditor] = useState(false);

  // ✅ Auto-save State
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ✅ Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ Preview State
  const [showPreview, setShowPreview] = useState(false);

  // Form data
  const [formData, setFormData] = useState<UpdateNewsArticle>({
    id: newsId,
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

  // ✅ DELETE FUNCTION
  const handleDelete = async () => {
    if (!article) return;

    setDeleting(true);
    setError(null);

    try {
      console.log('🗑️ Deleting article:', newsId);

      // Delete content blocks first (if any)
      const { error: blocksError } = await supabase
        .from('news_content_blocks')
        .delete()
        .eq('news_id', newsId);

      if (blocksError) {
        console.warn('Warning deleting blocks:', blocksError);
        // Continue anyway
      }

      // Delete the article
      const { error: deleteError } = await supabase
        .from('architecture_news')
        .delete()
        .eq('id', newsId);

      if (deleteError) {
        throw new Error(`Failed to delete: ${deleteError.message}`);
      }

      console.log('✅ Article deleted successfully');

      // Redirect to admin news list
      router.push('/admin/news');
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении новости');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ✅ AUTO-SAVE FUNCTION
  const autoSave = async () => {
    // Don't auto-save if manually saving or if article status is published
    if (saving || article?.status === 'published' || !(formData.title || '').trim()) {
      return;
    }

    try {
      setAutoSaveStatus('saving');
      console.log('💾 Auto-saving draft...');

      const updateData = {
        title: (formData.title || '').trim(),
        slug: formData.slug,
        content: (formData.content || '').trim(),
        summary: formData.summary?.trim() || null,
        category: formData.category,
        subcategory: formData.subcategory,
        tags: formData.tags,
        city: formData.city,
        country: formData.country,
        region: formData.region,
        related_buildings: formData.related_buildings,
        related_architects: formData.related_architects,
        featured: formData.featured,
        priority: formData.priority,
        featured_image_url: formData.featured_image_url || null,
        featured_image_alt: formData.featured_image_alt || null,
        gallery_images: formData.gallery_images,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('architecture_news')
        .update(updateData)
        .eq('id', newsId);

      if (updateError) {
        throw updateError;
      }

      // Auto-save blocks if using block editor
      if (useBlockEditor && contentBlocks.length > 0) {
        const blocksToSave: CreateContentBlock[] = contentBlocks.map((block, index) => ({
          news_id: newsId,
          order_index: index,
          block_type: block.block_type,
          content: block.content,
          images_data: block.images_data,
          block_settings: block.block_settings
        }));

        await saveAllContentBlocks(newsId, blocksToSave);
      }

      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      console.log('✅ Auto-save successful');

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('❌ Auto-save error:', err);
      setAutoSaveStatus('error');

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 5000);
    }
  };

  // ✅ ПРЯМАЯ ЗАГРУЗКА ЧЕРЕЗ SUPABASE
  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📖 Loading article:', newsId);
      console.log('👤 Current user:', user ? user.id : 'not authenticated');
      console.log('💼 User role:', profile?.role || 'no role');

      // Прямой запрос к Supabase
      let query = supabase
        .from('architecture_news')
        .select('*')
        .eq('id', newsId);

      // Применяем фильтры доступа
      if (!user) {
        query = query.eq('status', 'published');
        console.log('🔒 Guest access: only published');
      } else if (['admin', 'moderator', 'editor'].includes(profile?.role || '')) {
        console.log('👑 Admin access: no filter');
      } else {
        query = query.or(`status.eq.published,and(status.eq.draft,author_id.eq.${user.id}),and(status.eq.review,author_id.eq.${user.id})`);
        console.log('👤 User access: published + own drafts');
      }

      const { data, error: supabaseError } = await query.single();

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError);
        if (supabaseError.code === 'PGRST116') {
          throw new Error('News article not found');
        } else {
          throw new Error(`Database error: ${supabaseError.message}`);
        }
      }

      if (data) {
        console.log('✅ Article loaded:', data.title);

        // Проверяем права доступа к редактированию
        const canEdit = user && (
          ['admin', 'moderator', 'editor'].includes(profile?.role || '') ||
          (data.author_id === user.id && ['draft', 'review'].includes(data.status))
        );

        if (!canEdit) {
          throw new Error('У вас нет прав для редактирования этой новости');
        }

        setArticle(data);

        // Заполняем форму
        setFormData({
          id: data.id,
          title: data.title,
          slug: data.slug,
          summary: data.summary || '',
          content: data.content,
          category: data.category,
          subcategory: data.subcategory,
          tags: data.tags || [],
          city: data.city,
          country: data.country,
          region: data.region,
          related_buildings: data.related_buildings || [],
          related_architects: data.related_architects || [],
          featured: data.featured,
          priority: data.priority,
          featured_image_url: data.featured_image_url || '',
          featured_image_alt: data.featured_image_alt || '',
          gallery_images: data.gallery_images || [],
          meta_title: data.meta_title,
          meta_description: data.meta_description,
          meta_keywords: data.meta_keywords || [],
        });

        // ✅ Load content blocks
        try {
          const blocks = await fetchContentBlocks(data.id);
          console.log('✅ Loaded content blocks:', blocks.length);
          setContentBlocks(blocks);
          setUseBlockEditor(blocks.length > 0); // Use block editor if blocks exist
        } catch (blockError) {
          console.error('Error loading content blocks:', blockError);
          // Don't fail the whole page if blocks fail to load
        }
      }

    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  // ✅ ПРЯМОЕ СОХРАНЕНИЕ ЧЕРЕЗ SUPABASE
  const handleSubmit = async (status?: 'draft' | 'review' | 'published') => {
    if (!(formData.title || '').trim() || !(formData.content || '').trim()) {
      setError('Заголовок и содержание обязательны для заполнения');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('💾 Saving article:', newsId);

      const updateData = {
        title: (formData.title || '').trim(),
        slug: formData.slug,
        content: (formData.content || '').trim(),
        summary: formData.summary?.trim() || null,
        category: formData.category,
        subcategory: formData.subcategory,
        tags: formData.tags,
        city: formData.city,
        country: formData.country,
        region: formData.region,
        related_buildings: formData.related_buildings,
        related_architects: formData.related_architects,
        featured: formData.featured,
        priority: formData.priority,
        featured_image_url: formData.featured_image_url || null,
        featured_image_alt: formData.featured_image_alt || null,
        gallery_images: formData.gallery_images,
        status: status || formData.status,
        updated_at: new Date().toISOString(),
        // Если публикуем впервые, устанавливаем published_at
        ...(status === 'published' && article?.status !== 'published' ? {
          published_at: new Date().toISOString()
        } : {})
      };

      console.log('📤 Update data:', updateData);

      const { data, error: updateError } = await supabase
        .from('architecture_news')
        .update(updateData)
        .eq('id', newsId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw new Error(`Failed to update: ${updateError.message}`);
      }

      console.log('✅ Article updated successfully:', data.title);

      // ✅ Save content blocks if using block editor
      if (useBlockEditor && contentBlocks.length > 0) {
        try {
          console.log('💾 Saving content blocks:', contentBlocks.length);
          const blocksToSave: CreateContentBlock[] = contentBlocks.map((block, index) => ({
            news_id: newsId,
            order_index: index,
            block_type: block.block_type,
            content: block.content,
            images_data: block.images_data,
            block_settings: block.block_settings
          }));

          await saveAllContentBlocks(newsId, blocksToSave);
          console.log('✅ Content blocks saved successfully');
        } catch (blockError) {
          console.error('❌ Error saving content blocks:', blockError);
          throw new Error('Failed to save content blocks');
        }
      }

      // Redirect based on status
      if (status === 'published' || data.status === 'published') {
        router.push(`/news/${data.slug}`);
      } else {
        router.push('/admin/news');
      }

    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при обновлении новости');
    } finally {
      setSaving(false);
    }
  };

  // ✅ ПОИСК ЗДАНИЙ ЧЕРЕЗ SUPABASE
  const searchBuildings = async (query: string) => {
    if (query.length < 2) {
      setBuildingResults([]);
      return;
    }

    try {
      console.log('🔍 Searching buildings:', query);

      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, architect, city, main_image_url')
        .or(`name.ilike.%${query}%,architect.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('Building search error:', error);
        setBuildingResults([]);
        return;
      }

      console.log('🏢 Found buildings:', data?.length || 0);
      setBuildingResults(data || []);
    } catch (error) {
      console.error('Error searching buildings:', error);
      setBuildingResults([]);
    }
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

  // Handle title change
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug === generateSlug(prev.title || '') ? generateSlug(title) : prev.slug
    }));
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

  // Load article when auth is ready
  useEffect(() => {
    if (initialized && newsId) {
      console.log('🚀 Auth initialized, loading article...');
      fetchArticle();
    }
  }, [newsId, initialized, user, profile]);

  // ✅ Auto-save when formData or contentBlocks change (debounced)
  useEffect(() => {
    // Skip if article not loaded yet
    if (!article) return;

    // Debounce auto-save by 5 seconds
    const timer = setTimeout(() => {
      autoSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [formData, contentBlocks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка новости...</p>
        </div>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ошибка загрузки</h1>
          <p className="text-gray-600 mb-4">{error}</p>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">✏️ Редактирование новости</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-600">ID: {newsId}</p>

                {/* Auto-save status indicator */}
                {autoSaveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-sm text-blue-600">
                    <Loader className="w-3 h-3 animate-spin" />
                    Сохранение...
                  </span>
                )}
                {autoSaveStatus === 'saved' && lastSaved && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    ✓ Сохранено {new Date(lastSaved).toLocaleTimeString('ru-RU')}
                  </span>
                )}
                {autoSaveStatus === 'error' && (
                  <span className="flex items-center gap-1 text-sm text-red-600">
                    ✗ Ошибка сохранения
                  </span>
                )}
              </div>
            </div>
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

        {/* Status Info */}
        {article && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Статус:</strong> {article.status} |
                  <strong> Создано:</strong> {new Date(article.created_at).toLocaleDateString('ru-RU')}
                </p>
                {article.published_at && (
                  <p className="text-sm text-blue-600 mt-1">
                    <strong>Опубликовано:</strong> {new Date(article.published_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
              <a
                href={`/news/${article.slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Просмотреть →
              </a>
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
                    className="flex-1 ml-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Краткое описание
                </label>
                <textarea
                  value={formData.summary || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
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
                    placeholder="Image description for SEO and accessibility..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${!useBlockEditor
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Простой
                </button>
                <button
                  type="button"
                  onClick={() => setUseBlockEditor(true)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${useBlockEditor
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
                  content={formData.content || ''}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Enter news text..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Используйте простой редактор для быстрого создания текстового контента
                </p>
              </div>
            ) : (
              /* Block Editor */
              <div>
                <ContentBlockEditor
                  newsId={newsId}
                  initialBlocks={contentBlocks}
                  onChange={(blocks) => {
                    setContentBlocks(blocks as ContentBlock[]);
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Блочный редактор позволяет создавать структурированный контент с разными типами блоков
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
                  Главная новость
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Приоритет
                </label>
                <input
                  type="number"
                  value={formData.priority || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex items-center gap-3 pt-6 border-t border-gray-200">
          {/* Preview Button */}
          <button
            onClick={() => setShowPreview(true)}
            disabled={saving || !(formData.title || '').trim()}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Предпросмотр новости"
          >
            <Eye className="w-5 h-5" />
            Предпросмотр
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Action Buttons */}
          {/* Delete Button */}
          {['admin', 'moderator', 'editor'].includes(profile?.role || '') && (
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={saving || deleting}
              className="flex items-center gap-2 px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              title="Удалить новость"
            >
              <Trash2 className="w-5 h-5" />
              Удалить
            </button>
          )}

          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>

          <button
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>

          {/* Submit to review - for draft articles */}
          {article?.status === 'draft' && (
            <button
              onClick={() => handleSubmit('review')}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              <Eye className="w-5 h-5" />
              На модерацию
            </button>
          )}

          {/* Publish button - for editors/moderators/admins */}
          {['admin', 'moderator', 'editor'].includes(profile?.role || '') && (
            <button
              onClick={() => handleSubmit('published')}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Eye className="w-5 h-5" />
              Опубликовать
            </button>
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Удалить новость?
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Это действие нельзя отменить
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Внимание!</strong> Новость "{article?.title}" будет безвозвратно удалена из базы данных.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ News Preview Modal */}
      <NewsPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        news={{
          ...formData,
          id: article?.id || newsId,
          slug: formData.slug || article?.slug || 'preview',
          author_id: article?.author_id || user?.id,
          created_at: article?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: article?.published_at,
        }}
        blocks={contentBlocks.map((block, index) => ({
          ...block,
          id: block.id || `temp-block-${index}`,
          news_id: article?.id || newsId,
          order_index: block.order_index ?? index,
          created_at: block.created_at || new Date().toISOString(),
        }))}
      />
    </div>
  );
}
