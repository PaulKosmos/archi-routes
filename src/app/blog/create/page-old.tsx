'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { CreateBlogContentBlock, BlogTag, generateSlug } from '@/types/blog'
import ContentBlockEditor from '@/components/blog/ContentBlockEditor'
import BlogPreviewModal from '@/components/blog/BlogPreviewModal'
import Header from '@/components/Header'
import {
  Save,
  Eye,
  ArrowLeft,
  Upload,
  X,
  AlertCircle,
  Tag
} from 'lucide-react'
import Link from 'next/link'

export default function CreateBlogPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [tags, setTags] = useState<BlogTag[]>([])
  const [blocks, setBlocks] = useState<CreateBlogContentBlock[]>([])

  // Метаданные блога
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState<File | undefined>()
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Не перенаправляем сразу, дадим время на загрузку
    if (!authLoading && !user) {
      router.push('/auth')
      return
    }
    if (user) {
      loadTags()
    }
  }, [user, authLoading, router])

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name')

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Заголовок обязателен'
    } else if (title.length < 5) {
      newErrors.title = 'Заголовок должен содержать минимум 5 символов'
    } else if (title.length > 200) {
      newErrors.title = 'Заголовок не может быть длиннее 200 символов'
    }

    if (blocks.length === 0) {
      newErrors.content = 'Добавьте хотя бы один блок контента'
    }

    if (excerpt && excerpt.length > 500) {
      newErrors.excerpt = 'Краткое описание не может быть длиннее 500 символов'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `blog-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFeaturedImage(file)

      // Создаем превью
      const reader = new FileReader()
      reader.onload = (e) => {
        setFeaturedImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFeaturedImage = () => {
    setFeaturedImage(undefined)
    setFeaturedImagePreview('')
  }

  const handleSave = async (publishNow = false) => {
    if (!validateForm()) return

    setSaving(true)
    try {
      let featuredImageUrl = ''

      // Загружаем главное изображение если оно есть
      if (featuredImage) {
        featuredImageUrl = await handleImageUpload(featuredImage)
      }

      // Генерируем slug
      const slug = generateSlug(title)

      // Рассчитываем время чтения (примерно 1 минута на 200 слов)
      const totalText = blocks
        .filter(b => b.content)
        .map(b => b.content)
        .join(' ')
      const wordCount = totalText.split(/\s+/).length
      const readingTime = Math.max(1, Math.ceil(wordCount / 200))

      // Создаем пост
      const postData = {
        title,
        slug,
        content: null, // Legacy content не используется
        editor_version: 'blocks' as const,
        excerpt: excerpt || null,
        featured_image_url: featuredImageUrl || null,
        author_id: user!.id,
        status: publishNow ? 'published' as const : 'draft' as const,
        published_at: publishNow ? new Date().toISOString() : null,
        reading_time_minutes: readingTime,
        seo_title: title, // SEO title defaults to main title
        seo_description: excerpt || null // SEO description defaults to excerpt
      }

      const { data: post, error } = await supabase
        .from('blog_posts')
        .insert(postData)
        .select()
        .single()

      if (error) throw error

      // Сохраняем блоки контента
      if (blocks.length > 0) {
        const blocksData = blocks.map(block => ({
          ...block,
          blog_post_id: post.id,
        }))

        const { error: blocksError } = await supabase
          .from('blog_content_blocks')
          .insert(blocksData)

        if (blocksError) throw blocksError
      }

      // Добавляем теги
      if (selectedTagIds.length > 0) {
        const tagRelations = selectedTagIds.map(tagId => ({
          post_id: post.id,
          tag_id: tagId
        }))

        await supabase
          .from('blog_post_tags')
          .insert(tagRelations)
      }

      // Перенаправляем на страницу статьи или редактирования (для черновиков)
      if (publishNow) {
        router.push(`/blog/${post.slug}`)
      } else {
        // Для черновика перенаправляем на страницу редактирования
        router.push(`/blog/${post.slug}/edit`)
      }
    } catch (error) {
      console.error('Error saving post:', error)
      alert('Ошибка при сохранении статьи')
    } finally {
      setSaving(false)
    }
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход необходим</h1>
          <p className="text-gray-600 mb-6">Для создания статей необходимо войти в систему</p>
          <Link 
            href="/auth" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Навигация */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>К блогу</span>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Предпросмотр</span>
            </button>

            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Сохранение...' : 'Сохранить черновик'}</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <span>{saving ? 'Публикация...' : 'Опубликовать'}</span>
            </button>
          </div>
        </div>

        {/* Основной редактор */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {/* Заголовок */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Заголовок статьи..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-3xl font-bold border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Краткое описание */}
              <div className="mb-6">
                <textarea
                  placeholder="Краткое описание статьи (отображается в карточках и для SEO)..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.excerpt && (
                  <p className="text-red-600 text-sm mt-1">{errors.excerpt}</p>
                )}
              </div>

              {/* Главное изображение */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Главное изображение
                </label>

                {featuredImagePreview ? (
                  <div className="relative">
                    <img
                      src={featuredImagePreview}
                      alt="Превью"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={removeFeaturedImage}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center justify-center h-full">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-gray-600">Нажмите чтобы загрузить изображение</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFeaturedImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Редактор контента */}
              <div className="mb-6">
                <ContentBlockEditor
                  blogPostId="new-post-draft"
                  initialBlocks={blocks}
                  onChange={setBlocks}
                  readOnly={false}
                />
                {errors.content && (
                  <p className="text-red-600 text-sm mt-1">{errors.content}</p>
                )}
              </div>

              {/* Теги */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Теги
                </h3>

                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Preview Modal */}
      <BlogPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={title}
        excerpt={excerpt}
        featuredImagePreview={featuredImagePreview}
        blocks={blocks}
        tags={tags}
        selectedTagIds={selectedTagIds}
        readingTime={Math.max(1, Math.ceil(blocks.filter(b => b.content).map(b => b.content).join(' ').split(/\s+/).length / 200))}
      />
    </div>
  )
}

