// types/news.ts
// TypeScript типы для системы новостей архитектуры

// ============================================================
// НОВАЯ СИСТЕМА БЛОКОВ КОНТЕНТА
// ============================================================

// Типы блоков контента
export type ContentBlockType =
  | 'text'                  // Текстовый блок
  | 'text_image_right'      // Текст + изображение справа
  | 'image_text_left'       // Изображение слева + текст
  | 'two_images'            // Два изображения рядом
  | 'gallery';              // Галерея изображений

// Настройки для изображения
export interface ImageData {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

// Базовый интерфейс блока контента
export interface ContentBlock {
  id: string;
  news_id: string;
  order_index: number;
  block_type: ContentBlockType;
  content?: string;              // Markdown или HTML текст
  images_data?: ImageData[];     // Массив изображений (опционально, т.к. не все блоки используют)
  block_settings?: Record<string, any>; // Дополнительные настройки
  created_at: string;
  updated_at: string;
}

// Типы для создания блоков
export interface CreateContentBlock {
  news_id: string;
  order_index: number;
  block_type: ContentBlockType;
  content?: string;
  images_data?: ImageData[];
  block_settings?: Record<string, any>;
}

// Специфичные настройки для каждого типа блока
export interface TextBlockSettings {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface TextImageRightBlockSettings extends TextBlockSettings {
  imageWidth?: number;
  imageRatio?: string; // '1:1', '16:9', '4:3'
}

export interface ImageTextLeftBlockSettings extends TextImageRightBlockSettings { }

export interface TwoImagesBlockSettings {
  layout?: 'equal' | 'left-large' | 'right-large';
  gap?: number;
}

export interface GalleryBlockSettings {
  columns?: number; // 2, 3, 4
  aspectRatio?: string;
  showCaptions?: boolean;
}

// ============================================================
// НОВАЯ СИСТЕМА ТЕГОВ
// ============================================================

// Расширенный тип тега
export interface NewsTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  usage_count: number;
  is_featured_category: boolean;
  parent_category?: NewsCategory;
  display_order: number;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

// Создание тега
export interface CreateNewsTag {
  name: string;
  slug: string;
  description?: string;
  is_featured_category?: boolean;
  parent_category?: NewsCategory;
  display_order?: number;
  color?: string;
  icon?: string;
}

// Связь новости с тегом
export interface NewsArticleTag {
  id: string;
  news_id: string;
  tag_id: string;
  created_at: string;
}

// ============================================================
// Базовые типы для категорий и статусов
// ============================================================
export type NewsCategory =
  | 'projects'     // Архитектурные проекты
  | 'events'       // События, выставки, конференции
  | 'personalities'// Персоналии, интервью с архитекторами
  | 'trends'       // Тренды, новые материалы, технологии
  | 'planning'     // Городское планирование
  | 'heritage';    // Наследие, реставрация

export type NewsStatus =
  | 'draft'        // Черновик
  | 'review'       // На модерации
  | 'published'    // Опубликовано
  | 'archived';    // Архивировано

export type InteractionType =
  | 'like'         // Лайк
  | 'share'        // Репост
  | 'bookmark'     // Закладка
  | 'view';        // Просмотр

export type RelationType =
  | 'featured'     // Главное здание в новости
  | 'mentioned'    // Упоминается в тексте
  | 'comparison';  // Сравнивается с другими

// Основной тип новости
export interface NewsArticle {
  id: string;

  // Основная информация
  title: string;
  slug: string;
  summary?: string;
  content: string;

  // Медиа
  featured_image_url?: string;
  featured_image_alt?: string;
  gallery_images: string[]; // Массив URL изображений

  // Категоризация
  category: NewsCategory;
  subcategory?: string;
  tags: string[];

  // Геолокация
  city?: string;
  country?: string;
  region?: string;

  // Связи
  related_buildings: string[]; // UUID зданий
  related_architects: string[];

  // Метаданные
  author_id: string;
  editor_id?: string;

  // Публикация
  status: NewsStatus;
  published_at?: string;
  featured: boolean;
  priority: number;

  // SEO
  meta_title?: string;
  meta_description?: string;
  meta_keywords: string[];

  // Статистика
  views_count: number;
  likes_count: number;
  shares_count: number;
  bookmarks_count: number;

  // Временные метки
  created_at: string;
  updated_at: string;
}

// Тип для создания новости (без auto-generated полей)
export interface CreateNewsArticle {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  gallery_images?: string[];
  category: NewsCategory;
  subcategory?: string;
  tags?: string[];
  city?: string;
  country?: string;
  region?: string;
  related_buildings?: string[];
  related_architects?: string[];
  status?: NewsStatus;
  featured?: boolean;
  priority?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
}

// Тип для обновления новости
export interface UpdateNewsArticle extends Partial<CreateNewsArticle> {
  id: string;
  editor_id?: string;
  published_at?: string;
}

// Связь новости с зданием
export interface NewsBuildingRelation {
  id: string;
  news_id: string;
  building_id: string;
  relation_type: RelationType;
  description?: string;
  created_at: string;
}

// Создание связи
export interface CreateNewsBuildingRelation {
  news_id: string;
  building_id: string;
  relation_type: RelationType;
  description?: string;
}

// Взаимодействие пользователя с новостью
export interface NewsInteraction {
  id: string;
  news_id: string;
  user_id: string;
  interaction_type: InteractionType;
  metadata?: Record<string, any>;
  created_at: string;
}

// Создание взаимодействия
export interface CreateNewsInteraction {
  news_id: string;
  interaction_type: InteractionType;
  metadata?: Record<string, any>;
}

// Расширенная новость с дополнительными данными
export interface NewsArticleWithDetails extends NewsArticle {
  // Информация об авторе
  author?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
  };

  // Информация о редакторе
  editor?: {
    id: string;
    full_name?: string;
    role?: string;
  };

  // Связанные здания с полной информацией
  buildings?: Array<{
    id: string;
    name: string;
    architect?: string;
    year_built?: number;
    style?: string;
    city?: string;
    image_url?: string;
    architectural_style?: string;
    relation_type?: RelationType;
    relation_description?: string;
  }>;

  // Взаимодействия текущего пользователя
  user_interactions?: {
    liked: boolean;
    bookmarked: boolean;
    shared: boolean;
  };

  // НОВОЕ: Блоки контента
  content_blocks?: ContentBlock[];

  // НОВОЕ: Теги с полной информацией
  article_tags?: NewsTag[];
}

// Новость с блоками для редактирования
export interface NewsArticleWithBlocks extends NewsArticle {
  content_blocks: ContentBlock[];
  tags_full: NewsTag[];
}

// Параметры фильтрации новостей
export interface NewsFilters {
  category?: NewsCategory;
  subcategory?: string;
  tags?: string[];
  city?: string;
  country?: string;
  region?: string;
  author_id?: string;
  status?: NewsStatus;
  featured?: boolean;
  date_from?: string;
  date_to?: string;
  has_buildings?: boolean;
  building_id?: string; // Фильтр по конкретному зданию
  search?: string; // Поиск по заголовку и содержимому
}

// Параметры сортировки
export interface NewsSortOptions {
  field: 'created_at' | 'published_at' | 'updated_at' | 'views_count' | 'likes_count' | 'priority' | 'title';
  direction: 'asc' | 'desc';
}

// Параметры пагинации
export interface NewsPagination {
  page: number;
  limit: number;
  total?: number;
  pages?: number;
}

// Ответ API со списком новостей
export interface NewsListResponse {
  data: NewsArticleWithDetails[];
  pagination: NewsPagination;
  filters: NewsFilters;
  sort: NewsSortOptions;
}

// Статистика по новостям
export interface NewsStats {
  total_articles: number;
  published_articles: number;
  draft_articles: number;
  total_views: number;
  total_likes: number;
  total_shares: number;
  categories_distribution: Record<NewsCategory, number>;
  recent_activity: {
    new_articles_this_week: number;
    trending_articles: NewsArticle[];
  };
}

// Тип для форм создания/редактирования
export interface NewsFormData {
  title: string;
  summary: string;
  content: string;
  category: NewsCategory;
  subcategory: string;
  tags: string[];
  city: string;
  country: string;
  region: string;
  related_buildings: string[];
  related_architects: string[];
  featured_image_url: string;
  featured_image_alt: string;
  gallery_images: string[];
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  featured: boolean;
  priority: number;
  status: NewsStatus;
}

// Опции категорий для UI
export const NEWS_CATEGORIES: Array<{
  value: NewsCategory;
  label: string;
  description: string;
  icon?: string;
}> = [
    {
      value: 'projects',
      label: 'Architectural Projects',
      description: 'New buildings, renovations, completed projects',
      icon: '🏗️'
    },
    {
      value: 'events',
      label: 'Events',
      description: 'Exhibitions, conferences, architecture festivals',
      icon: '📅'
    },
    {
      value: 'personalities',
      label: 'Personalities',
      description: 'Interviews with architects, awards, achievements',
      icon: '👤'
    },
    {
      value: 'trends',
      label: 'Trends',
      description: 'New materials, technologies, architectural styles',
      icon: '📈'
    },
    {
      value: 'planning',
      label: 'Urban Planning',
      description: 'Urban development projects, city development',
      icon: '🏙️'
    },
    {
      value: 'heritage',
      label: 'Heritage',
      description: 'Restoration, preservation of architectural monuments',
      icon: '🏛️'
    }
  ];

// Опции статусов
export const NEWS_STATUSES: Array<{
  value: NewsStatus;
  label: string;
  color: string;
}> = [
    { value: 'draft', label: 'Черновик', color: 'gray' },
    { value: 'review', label: 'На модерации', color: 'yellow' },
    { value: 'published', label: 'Опубликовано', color: 'green' },
    { value: 'archived', label: 'Архивировано', color: 'red' }
  ];

// Утилитарные функции для работы с типами
export const isPublishedNews = (news: NewsArticle): boolean => {
  return news.status === 'published' && !!news.published_at;
};

export const canEditNews = (news: NewsArticle, userId: string, userRole: string): boolean => {
  if (['admin', 'moderator', 'editor'].includes(userRole)) {
    return true;
  }
  return news.author_id === userId && news.status === 'draft';
};

export const getNewsCategoryIcon = (category: NewsCategory): string => {
  const cat = NEWS_CATEGORIES.find(c => c.value === category);
  return cat?.icon || '📰';
};

// ============================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С БЛОКАМИ КОНТЕНТА
// ============================================================

// Проверка типа блока
export const isTextBlock = (block: ContentBlock): boolean => {
  return block.block_type === 'text';
};

export const hasImages = (block: ContentBlock): boolean => {
  return !!(block.images_data && block.images_data.length > 0);
};

export const getBlockImageCount = (blockType: ContentBlockType): number => {
  switch (blockType) {
    case 'text':
      return 0;
    case 'text_image_right':
    case 'image_text_left':
      return 1;
    case 'two_images':
      return 2;
    case 'gallery':
      return -1; // Неограниченно
    default:
      return 0;
  }
};

// Валидация блока
export const validateContentBlock = (block: Partial<ContentBlock>): string[] => {
  const errors: string[] = [];

  if (!block.block_type) {
    errors.push('Block type is required');
  }

  const imageCount = getBlockImageCount(block.block_type!);

  if (imageCount > 0) {
    if (!block.images_data || block.images_data.length === 0) {
      errors.push(`Block type ${block.block_type} requires at least ${imageCount} image(s)`);
    } else if (imageCount > 0 && block.images_data.length < imageCount) {
      errors.push(`Block type ${block.block_type} requires exactly ${imageCount} image(s)`);
    }
  }

  if (['text', 'text_image_right', 'image_text_left'].includes(block.block_type!)) {
    if (!block.content || block.content.trim() === '') {
      errors.push('Text content is required for this block type');
    }
  }

  return errors;
};

// Сортировка блоков по order_index
export const sortContentBlocks = (blocks: ContentBlock[]): ContentBlock[] => {
  return [...blocks].sort((a, b) => a.order_index - b.order_index);
};

// Пересчет order_index после удаления
export const reindexContentBlocks = (blocks: ContentBlock[]): ContentBlock[] => {
  return blocks.map((block, index) => ({
    ...block,
    order_index: index
  }));
};

// ============================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С ТЕГАМИ
// ============================================================

// Получение featured категорий
export const getFeaturedTags = (tags: NewsTag[]): NewsTag[] => {
  return tags
    .filter(tag => tag.is_featured_category)
    .sort((a, b) => a.display_order - b.display_order);
};

// Получение тегов по категории
export const getTagsByCategory = (tags: NewsTag[], category: NewsCategory): NewsTag[] => {
  return tags
    .filter(tag => tag.parent_category === category)
    .sort((a, b) => a.display_order - b.display_order);
};

// Поиск тега по slug
export const findTagBySlug = (tags: NewsTag[], slug: string): NewsTag | undefined => {
  return tags.find(tag => tag.slug === slug);
};

// Генерация slug из имени
export const generateTagSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// ============================================================
// NEWS GRID BLOCKS - Конструктор сетки новостей
// ============================================================

// ============================================================
// НОВАЯ СИСТЕМА МАСШТАБИРУЕМЫХ КАРТОЧЕК (SCALABLE GRID CARDS)
// ============================================================

/**
 * Размеры карточек новостей
 * - small: маленькая карточка (компактный вид)
 * - medium: стандартная карточка (по умолчанию)
 * - large: увеличенная карточка (больше текста)
 * - featured: крупная карточка (максимальный контент)
 */
export type CardSize = 'small' | 'medium' | 'large' | 'featured';

/**
 * Колонки и ряды для масштабирования карточки
 * col_span: ширина карточки (1 или 2 колонки)
 * row_span: высота карточки (1 или 2 ряда)
 */
export type GridSpan = 1 | 2;

/**
 * Конфигурация размера карточки для UI (Popover)
 */
export interface CardSizeConfig {
  colSpan: GridSpan;
  rowSpan: GridSpan;
  label: string;        // "1×1", "2×1", "1×2", "2×2"
  icon: string;         // "□", "▭", "▯", "▢"
  description: string;  // Описание размера
  cardSize: CardSize;   // Рекомендуемый размер карточки
}

/**
 * Все доступные размеры карточек для выбора в UI
 */
export const CARD_SIZE_CONFIGS: CardSizeConfig[] = [
  {
    colSpan: 1,
    rowSpan: 1,
    label: '1×1',
    icon: '□',
    description: 'Стандартная карточка',
    cardSize: 'medium'
  },
  {
    colSpan: 2,
    rowSpan: 1,
    label: '2×1',
    icon: '▭',
    description: 'Широкая карточка',
    cardSize: 'large'
  },
  {
    colSpan: 1,
    rowSpan: 2,
    label: '1×2',
    icon: '▯',
    description: 'Высокая карточка',
    cardSize: 'large'
  },
  {
    colSpan: 2,
    rowSpan: 2,
    label: '2×2',
    icon: '▢',
    description: 'Крупная featured карточка',
    cardSize: 'featured'
  }
];

/**
 * Интерфейс карточки сетки новостей
 * Каждая карточка представляет одну новость с настраиваемым размером
 */
export interface NewsGridCard {
  id: string;
  news_id: string;              // Одна новость на карточку
  position: number;             // Порядок в сетке (0-indexed)
  col_span: GridSpan;           // Ширина (1 или 2)
  row_span: GridSpan;           // Высота (1 или 2)
  card_size: CardSize;          // Размер карточки
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Создание карточки сетки
 */
export interface CreateNewsGridCard {
  news_id: string;
  position: number;
  col_span?: GridSpan;          // По умолчанию 1
  row_span?: GridSpan;          // По умолчанию 1
  card_size?: CardSize;         // По умолчанию 'medium'
  is_active?: boolean;          // По умолчанию true
}

/**
 * Обновление карточки сетки
 */
export interface UpdateNewsGridCard extends Partial<CreateNewsGridCard> {
  id: string;
}

/**
 * Расширенная карточка с загруженной новостью
 */
export interface NewsGridCardWithNews extends NewsGridCard {
  news?: NewsArticleWithDetails;
}

// ============================================================
// DEPRECATED: Старые типы блоков (для обратной совместимости)
// ============================================================
/**
 * @deprecated Используйте NewsGridCard вместо NewsGridBlock
 * Старая система фиксированных блоков заменена на масштабируемые карточки
 */
export type NewsGridBlockType = never;

/**
 * @deprecated Используйте NewsGridCard вместо NewsGridBlock
 */
export interface NewsGridBlock {
  /** @deprecated */
  id: string;
  /** @deprecated */
  position: number;
  /** @deprecated */
  is_active: boolean;
  /** @deprecated */
  created_at: string;
  /** @deprecated */
  updated_at: string;
}

/**
 * @deprecated Используйте CreateNewsGridCard
 */
export interface CreateNewsGridBlock extends Partial<CreateNewsGridCard> { }

/**
 * @deprecated Используйте UpdateNewsGridCard
 */
export interface UpdateNewsGridBlock extends Partial<UpdateNewsGridCard> { }

/**
 * @deprecated Используйте NewsGridCardWithNews
 */
export interface NewsGridBlockWithNews extends Partial<NewsGridCardWithNews> { }

// ============================================================
// DEPRECATED GRID BLOCK UTILITIES
// ============================================================

/**
 * @deprecated Old grid block configuration type
 * Use CardSizeConfig instead
 */
export interface GridBlockConfig {
  type: string;
  newsCount: number;
  label: string;
  icon: string;
  description: string;
}

/**
 * @deprecated Old grid block configurations (kept for backward compatibility)
 * Use CARD_SIZE_CONFIGS instead
 */
export const GRID_BLOCK_CONFIGS: GridBlockConfig[] = [];

/**
 * @deprecated Use CARD_SIZE_CONFIGS instead
 * Get configuration for a block type (always returns undefined as old system is deprecated)
 */
export const getGridBlockConfig = (_type: string): GridBlockConfig | undefined => {
  return undefined;
};

/**
 * @deprecated New card system uses single news per card
 * Get news count for a block type (always returns 1 as new system uses single news per card)
 */
export const getGridBlockNewsCount = (_type: string): number => {
  return 1;
};

/**
 * @deprecated Use validateGridCard instead
 * Validate a grid block (kept for backward compatibility)
 */
export const validateGridBlock = (block: Partial<CreateNewsGridCard>): string[] => {
  const errors: string[] = [];

  if (block.position === undefined || block.position < 0) {
    errors.push('Valid position is required');
  }

  if (!block.news_id) {
    errors.push('News article is required');
  }

  return errors;
};

// Проверка, может ли пользователь редактировать сетку
export const canEditNewsGrid = (userRole: string): boolean => {
  return ['admin', 'moderator'].includes(userRole);
};

// Сортировка блоков по позиции
export const sortGridBlocks = (blocks: NewsGridBlock[]): NewsGridBlock[] => {
  return [...blocks].sort((a, b) => a.position - b.position);
};

// Пересчет позиций после удаления блока
export const reindexGridBlocks = (blocks: NewsGridBlock[]): NewsGridBlock[] => {
  return blocks.map((block, index) => ({
    ...block,
    position: index
  }));
};
