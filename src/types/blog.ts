// =====================================================
// ТИПЫ TYPESCRIPT ДЛЯ БЛОГА
// =====================================================

// ============================================================
// СИСТЕМА БЛОКОВ КОНТЕНТА
// ============================================================

// Типы блоков контента для блога
export type BlogContentBlockType =
  | 'text'                  // Текстовый блок
  | 'text_image_right'      // Текст + изображение справа
  | 'image_text_left'       // Изображение слева + текст
  | 'full_width_image'      // Полноразмерное изображение на всю ширину
  | 'gallery'               // Галерея изображений
  | 'building_card';        // Карточка архитектурного объекта

// Настройки для изображения
export interface ImageData {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

// Базовый интерфейс блока контента блога
export interface BlogContentBlock {
  id: string;
  blog_post_id: string;
  order_index: number;
  block_type: BlogContentBlockType;
  content?: string;              // HTML текст
  building_id?: string;          // Для building_card блоков
  images_data: ImageData[];      // Массив изображений
  block_settings?: Record<string, any>; // Дополнительные настройки
  created_at: string;
  updated_at: string;

  // Данные здания (при join для building_card)
  building?: {
    id: string;
    name: string;
    description?: string;
    architect?: string;
    year_built?: number;
    architectural_style?: string;
    city: string;
    image_url?: string;
    latitude?: number;
    longitude?: number;
  };
}

// Типы для создания блоков
export interface CreateBlogContentBlock {
  blog_post_id: string;
  order_index: number;
  block_type: BlogContentBlockType;
  content?: string;
  building_id?: string;
  images_data?: ImageData[];
  block_settings?: Record<string, any>;
}

// Специфичные настройки для каждого типа блока
export interface TextBlockSettings {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface TextImageRightBlockSettings extends TextBlockSettings {
  imageWidth?: number;      // Процент ширины (30-50)
  imageRatio?: string;      // '1:1', '16:9', '4:3'
}

export interface ImageTextLeftBlockSettings extends TextImageRightBlockSettings {}

export interface FullWidthImageBlockSettings {
  showCaption?: boolean;
  aspectRatio?: string;     // 'auto', '21:9', '16:9', '4:3'
}

export interface GalleryBlockSettings {
  columns?: number;         // 2, 3, 4
  aspectRatio?: string;
  showCaptions?: boolean;
  layout?: 'grid' | 'masonry';
}

export interface BuildingCardBlockSettings {
  showDescription?: boolean;
  showArchitect?: boolean;
  showYear?: boolean;
  showStyle?: boolean;
  showMapButton?: boolean;      // Зеленая кнопка "Показать на карте"
  showRouteButton?: boolean;    // Зеленая кнопка "Добавить в маршрут"
  cardLayout?: 'horizontal' | 'vertical';
}

// ============================================================
// ОСНОВНЫЕ ТИПЫ БЛОГА
// ============================================================

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: any // JSON content from rich text editor (deprecated for blocks)
  editor_version?: 'rich_text' | 'blocks' // Версия редактора
  excerpt?: string
  featured_image_url?: string
  author_id: string
  status: 'draft' | 'published' | 'archived'
  published_at?: string
  view_count: number
  reading_time_minutes?: number
  seo_title?: string
  seo_description?: string
  created_at: string
  updated_at: string

  // Связанные данные (при join запросах)
  author?: {
    id: string
    display_name?: string
    full_name?: string
    avatar_url?: string
  }
  tags?: BlogTag[]
  buildings?: BlogPostBuilding[]
  routes?: BlogPostRoute[]
  reactions?: BlogPostReaction[]
  content_blocks?: BlogContentBlock[] // Блоки контента для модульного редактора
  comment_count?: number
  like_count?: number
  save_count?: number
}

export interface BlogPostBuilding {
  id: string
  post_id: string
  building_id: string
  mention_type: 'auto' | 'manual' | 'featured'
  context?: string
  order_index?: number
  position_in_text?: number
  created_at: string
  
  // Данные здания (при join)
  building?: {
    id: string
    name: string
    description?: string
    architect?: string
    year_built?: number
    architectural_style?: string
    city: string
    image_url?: string
    rating?: number
    latitude?: number
    longitude?: number
  }
}

export interface BlogPostRoute {
  id: string
  post_id: string
  route_id: string
  route_type: 'generated' | 'existing' | 'suggested' | 'author_created'
  description?: string
  created_at: string
  
  // Данные маршрута (при join)
  route?: {
    id: string
    title: string
    description?: string
    duration_hours?: number
    distance_km?: number
    difficulty?: string
    building_count?: number
  }
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  post_count: number
  created_at: string
  updated_at: string
}

export interface BlogPostTag {
  post_id: string
  tag_id: string
  created_at: string
}

export interface BlogComment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id?: string
  status: 'approved' | 'pending' | 'rejected'
  likes_count: number
  created_at: string
  updated_at: string
  
  // Данные пользователя (при join)
  user?: {
    id: string
    display_name?: string
    full_name?: string
    avatar_url?: string
  }
  
  // Вложенные ответы
  replies?: BlogComment[]
}

export interface BlogPostReaction {
  id: string
  post_id: string
  user_id: string
  reaction_type: 'like' | 'save' | 'share'
  created_at: string
}

export interface BlogReadingStats {
  id: string
  post_id: string
  user_id?: string
  session_id?: string
  reading_time_seconds?: number
  scroll_percentage?: number
  device_type?: string
  referrer?: string
  created_at: string
}

// =====================================================
// ТИПЫ ДЛЯ ФОРМ И UI
// =====================================================

export interface CreateBlogPostForm {
  title: string
  content: any // Rich text editor content
  excerpt?: string
  featured_image?: File
  status: 'draft' | 'published'
  seo_title?: string
  seo_description?: string
  tag_ids: string[]
  building_ids: string[] // Manually selected buildings
}

export interface UpdateBlogPostForm extends Partial<CreateBlogPostForm> {
  id: string
}

export interface BlogPostFilters {
  status?: 'draft' | 'published' | 'archived'
  author_id?: string
  tag_slug?: string
  building_id?: string
  city?: string
  search?: string
  sort_by?: 'created_at' | 'published_at' | 'view_count' | 'title'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface BlogListResponse {
  posts: BlogPost[]
  total_count: number
  has_more: boolean
}

// =====================================================
// ТИПЫ ДЛЯ RICH TEXT EDITOR
// =====================================================

export interface RichTextContent {
  type: 'doc'
  content: Array<{
    type: string
    attrs?: Record<string, any>
    content?: RichTextContent[]
    text?: string
    marks?: Array<{
      type: string
      attrs?: Record<string, any>
    }>
  }>
}

// Специальные элементы для нашего редактора
export interface BuildingMentionNode {
  type: 'building-mention'
  attrs: {
    buildingId: string
    buildingName: string
    href: string
  }
}

export interface RouteEmbedNode {
  type: 'route-embed'
  attrs: {
    routeId: string
    routeTitle: string
    preview?: boolean
  }
}

// =====================================================
// ТИПЫ ДЛЯ SEO И МЕТА-ДАННЫХ
// =====================================================

export interface BlogPostMeta {
  title: string
  description: string
  image?: string
  url: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
  tags?: string[]
  readingTime?: number
}

// =====================================================
// УТИЛИТЫ И КОНСТАНТЫ
// =====================================================

export const BLOG_POST_STATUS = {
  DRAFT: 'draft' as const,
  PUBLISHED: 'published' as const,
  ARCHIVED: 'archived' as const,
}

export const MENTION_TYPE = {
  AUTO: 'auto' as const,
  MANUAL: 'manual' as const,
  FEATURED: 'featured' as const,
}

export const ROUTE_TYPE = {
  GENERATED: 'generated' as const,
  EXISTING: 'existing' as const,
  SUGGESTED: 'suggested' as const,
  AUTHOR_CREATED: 'author_created' as const,
}

export const REACTION_TYPE = {
  LIKE: 'like' as const,
  SAVE: 'save' as const,
  SHARE: 'share' as const,
}

export const COMMENT_STATUS = {
  APPROVED: 'approved' as const,
  PENDING: 'pending' as const,
  REJECTED: 'rejected' as const,
}

// Константы для валидации
export const BLOG_LIMITS = {
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  EXCERPT_MAX_LENGTH: 500,
  SEO_TITLE_MAX_LENGTH: 60,
  SEO_DESCRIPTION_MAX_LENGTH: 160,
  CONTENT_MIN_LENGTH: 100,
  TAG_NAME_MAX_LENGTH: 50,
  COMMENT_MAX_LENGTH: 1000,
  SLUG_MAX_LENGTH: 100,
} as const

// Функции для работы с типами
export const isPublishedPost = (post: BlogPost): boolean => {
  return post.status === 'published' && !!post.published_at
}

export const canUserEditPost = (post: BlogPost, userId?: string): boolean => {
  return !!userId && post.author_id === userId
}

export const getPostUrl = (post: BlogPost): string => {
  return `/blog/${post.slug}`
}

export const getTagUrl = (tag: BlogTag): string => {
  return `/blog/tag/${tag.slug}`
}

// Функция для расчета времени чтения
export const calculateReadingTime = (content: any): number => {
  // Примерная формула: 200 слов в минуту
  const WORDS_PER_MINUTE = 200
  
  // Извлекаем текст из rich text content
  const extractText = (node: any): string => {
    if (node.text) return node.text
    if (node.content) {
      return node.content.map(extractText).join(' ')
    }
    return ''
  }
  
  const text = extractText(content)
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
  
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}

// Функция для генерации slug из заголовка
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const translit: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      }
      return translit[char] || char
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, BLOG_LIMITS.SLUG_MAX_LENGTH)
}
