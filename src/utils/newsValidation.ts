// utils/newsValidation.ts
// Утилиты для валидации новостей и блоков контента

import {
  ContentBlock,
  ContentBlockType,
  NewsArticle,
  CreateNewsArticle,
  NewsTag,
  validateContentBlock as validateBlockFromTypes
} from '@/types/news';

// ============================================================
// ТИПЫ ДЛЯ ОШИБОК ВАЛИДАЦИИ
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================
// ВАЛИДАЦИЯ НОВОСТИ
// ============================================================

/**
 * Валидирует основные поля новости
 */
export const validateNewsArticle = (news: Partial<CreateNewsArticle>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Заголовок
  if (!news.title || news.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'TITLE_REQUIRED'
    });
  } else if (news.title.length < 10) {
    errors.push({
      field: 'title',
      message: 'Title must be at least 10 characters',
      code: 'TITLE_TOO_SHORT'
    });
  } else if (news.title.length > 200) {
    errors.push({
      field: 'title',
      message: 'Title must not exceed 200 characters',
      code: 'TITLE_TOO_LONG'
    });
  }

  // Slug
  if (!news.slug || news.slug.trim() === '') {
    errors.push({
      field: 'slug',
      message: 'URL slug is required',
      code: 'SLUG_REQUIRED'
    });
  } else if (!/^[a-z0-9-]+$/.test(news.slug)) {
    errors.push({
      field: 'slug',
      message: 'URL slug can only contain lowercase letters, numbers and hyphens',
      code: 'SLUG_INVALID_FORMAT'
    });
  }

  // Краткое описание
  if (news.summary && news.summary.length > 500) {
    errors.push({
      field: 'summary',
      message: 'Summary must not exceed 500 characters',
      code: 'SUMMARY_TOO_LONG'
    });
  }

  // Контент (устаревшее поле, но все еще используется)
  if (news.content && news.content.length > 50000) {
    errors.push({
      field: 'content',
      message: 'Content must not exceed 50000 characters',
      code: 'CONTENT_TOO_LONG'
    });
  }

  // Категория
  if (!news.category) {
    errors.push({
      field: 'category',
      message: 'Category is required',
      code: 'CATEGORY_REQUIRED'
    });
  }

  // Изображение
  if (news.featured_image_url && !isValidUrl(news.featured_image_url)) {
    errors.push({
      field: 'featured_image_url',
      message: 'Invalid image URL',
      code: 'IMAGE_URL_INVALID'
    });
  }

  // Теги
  if (news.tags && news.tags.length > 10) {
    errors.push({
      field: 'tags',
      message: 'Maximum 10 tags allowed',
      code: 'TOO_MANY_TAGS'
    });
  }

  // Meta keywords
  if (news.meta_keywords && news.meta_keywords.length > 20) {
    errors.push({
      field: 'meta_keywords',
      message: 'Maximum 20 keywords allowed',
      code: 'TOO_MANY_KEYWORDS'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// ВАЛИДАЦИЯ БЛОКОВ КОНТЕНТА
// ============================================================

/**
 * Валидирует массив блоков контента
 */
export const validateContentBlocks = (blocks: ContentBlock[]): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!blocks || blocks.length === 0) {
    errors.push({
      field: 'content_blocks',
      message: 'News must contain at least one content block',
      code: 'NO_CONTENT_BLOCKS'
    });
    return { valid: false, errors };
  }

  // Валидируем каждый блок
  blocks.forEach((block, index) => {
    const blockErrors = validateBlockFromTypes(block);
    blockErrors.forEach(error => {
      errors.push({
        field: `content_blocks[${index}]`,
        message: error,
        code: 'BLOCK_VALIDATION_ERROR'
      });
    });
  });

  // Проверяем порядок индексов
  const orderIndices = blocks.map(b => b.order_index);
  const expectedIndices = blocks.map((_, i) => i);
  if (JSON.stringify(orderIndices.sort()) !== JSON.stringify(expectedIndices)) {
    errors.push({
      field: 'content_blocks',
      message: 'Invalid block order',
      code: 'INVALID_BLOCK_ORDER'
    });
  }

  // Проверяем наличие хотя бы одного блока с текстом или изображениями
  const hasContent = blocks.some(block =>
    (block.content && block.content.trim() !== '') ||
    (block.images_data && block.images_data.length > 0)
  );

  if (!hasContent) {
    errors.push({
      field: 'content_blocks',
      message: 'At least one block must contain content or images',
      code: 'NO_ACTUAL_CONTENT'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Валидирует отдельный блок контента
 */
export const validateSingleBlock = (block: Partial<ContentBlock>): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!block.block_type) {
    errors.push({
      field: 'block_type',
      message: 'Block type is required',
      code: 'BLOCK_TYPE_REQUIRED'
    });
    return { valid: false, errors };
  }

  // Валидация текстовых блоков
  if (['text', 'text_image_right', 'image_text_left'].includes(block.block_type)) {
    if (!block.content || block.content.trim() === '') {
      errors.push({
        field: 'content',
        message: 'Text content is required for this block type',
        code: 'TEXT_CONTENT_REQUIRED'
      });
    } else if (block.content.length > 10000) {
      errors.push({
        field: 'content',
        message: 'Text must not exceed 10000 characters',
        code: 'TEXT_TOO_LONG'
      });
    }
  }

  // Валидация блоков с изображениями
  if (['text_image_right', 'image_text_left', 'two_images', 'gallery'].includes(block.block_type)) {
    if (!block.images_data || block.images_data.length === 0) {
      errors.push({
        field: 'images_data',
        message: 'Images are required for this block type',
        code: 'IMAGES_REQUIRED'
      });
    } else {
      // Валидация каждого изображения
      block.images_data.forEach((image, index) => {
        if (!image.url) {
          errors.push({
            field: `images_data[${index}].url`,
            message: `Image ${index + 1} URL is required`,
            code: 'IMAGE_URL_REQUIRED'
          });
        } else if (!isValidUrl(image.url)) {
          errors.push({
            field: `images_data[${index}].url`,
            message: `Invalid image URL ${index + 1}`,
            code: 'IMAGE_URL_INVALID'
          });
        }
      });

      // Проверка количества изображений
      if (block.block_type === 'text_image_right' || block.block_type === 'image_text_left') {
        if (block.images_data.length !== 1) {
          errors.push({
            field: 'images_data',
            message: 'This block type must contain exactly 1 image',
            code: 'WRONG_IMAGES_COUNT'
          });
        }
      } else if (block.block_type === 'two_images') {
        if (block.images_data.length !== 2) {
          errors.push({
            field: 'images_data',
            message: 'This block type must contain exactly 2 images',
            code: 'WRONG_IMAGES_COUNT'
          });
        }
      } else if (block.block_type === 'gallery') {
        if (block.images_data.length < 2) {
          errors.push({
            field: 'images_data',
            message: 'Gallery must contain at least 2 images',
            code: 'NOT_ENOUGH_IMAGES'
          });
        } else if (block.images_data.length > 20) {
          errors.push({
            field: 'images_data',
            message: 'Gallery must not contain more than 20 images',
            code: 'TOO_MANY_IMAGES'
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// ВАЛИДАЦИЯ ТЕГОВ
// ============================================================

/**
 * Валидирует тег
 */
export const validateNewsTag = (tag: Partial<NewsTag>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Название
  if (!tag.name || tag.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Tag name is required',
      code: 'TAG_NAME_REQUIRED'
    });
  } else if (tag.name.length < 2) {
    errors.push({
      field: 'name',
      message: 'Tag name must be at least 2 characters',
      code: 'TAG_NAME_TOO_SHORT'
    });
  } else if (tag.name.length > 50) {
    errors.push({
      field: 'name',
      message: 'Tag name must not exceed 50 characters',
      code: 'TAG_NAME_TOO_LONG'
    });
  }

  // Slug
  if (!tag.slug || tag.slug.trim() === '') {
    errors.push({
      field: 'slug',
      message: 'Tag URL slug is required',
      code: 'TAG_SLUG_REQUIRED'
    });
  } else if (!/^[a-z0-9-а-яё]+$/.test(tag.slug)) {
    errors.push({
      field: 'slug',
      message: 'URL slug can only contain lowercase letters, numbers and hyphens',
      code: 'TAG_SLUG_INVALID_FORMAT'
    });
  }

  // Описание
  if (tag.description && tag.description.length > 200) {
    errors.push({
      field: 'description',
      message: 'Description must not exceed 200 characters',
      code: 'TAG_DESCRIPTION_TOO_LONG'
    });
  }

  // Цвет
  if (tag.color && !/^#[0-9A-Fa-f]{6}$/.test(tag.color)) {
    errors.push({
      field: 'color',
      message: 'Color must be in HEX format (#RRGGBB)',
      code: 'TAG_COLOR_INVALID_FORMAT'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Проверяет корректность URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Проверяет, является ли строка валидным email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Проверяет, является ли строка валидным slug
 */
export const isValidSlug = (slug: string): boolean => {
  return /^[a-z0-9-]+$/.test(slug);
};

/**
 * Генерирует slug из строки
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
};

/**
 * Очищает HTML теги из строки
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Подсчитывает количество слов в тексте
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

/**
 * Оценивает время чтения в минутах (250 слов в минуту)
 */
export const estimateReadingTime = (text: string): number => {
  const words = countWords(stripHtmlTags(text));
  return Math.ceil(words / 250);
};

// ============================================================
// ВАЛИДАЦИЯ ПУБЛИКАЦИИ
// ============================================================

/**
 * Проверяет, готова ли новость к публикации
 */
export const canPublish = (
  news: Partial<NewsArticle>,
  blocks?: ContentBlock[]
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Валидация основных полей
  const newsValidation = validateNewsArticle(news as CreateNewsArticle);
  if (!newsValidation.valid) {
    errors.push(...newsValidation.errors);
  }

  // Валидация блоков (если используется новая система)
  if (blocks) {
    const blocksValidation = validateContentBlocks(blocks);
    if (!blocksValidation.valid) {
      errors.push(...blocksValidation.errors);
    }
  } else if (!news.content || news.content.trim() === '') {
    // Если нет блоков и нет старого контента
    errors.push({
      field: 'content',
      message: 'News must contain content',
      code: 'NO_CONTENT'
    });
  }

  // Обязательные поля для публикации
  if (!news.featured_image_url) {
    errors.push({
      field: 'featured_image_url',
      message: 'Featured image is required for publication',
      code: 'IMAGE_REQUIRED_FOR_PUBLISH'
    });
  }

  if (!news.summary || news.summary.trim() === '') {
    errors.push({
      field: 'summary',
      message: 'Summary is required for publication',
      code: 'SUMMARY_REQUIRED_FOR_PUBLISH'
    });
  }

  if (!news.category) {
    errors.push({
      field: 'category',
      message: 'Category is required for publication',
      code: 'CATEGORY_REQUIRED_FOR_PUBLISH'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
