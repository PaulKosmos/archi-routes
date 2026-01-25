// utils/newsBlocks.ts
// Утилиты для работы с блоками контента новостей

import {
  ContentBlock,
  CreateContentBlock,
  ContentBlockType,
  ImageData,
  TextBlockSettings,
  TextImageRightBlockSettings,
  ImageTextLeftBlockSettings,
  TwoImagesBlockSettings,
  GalleryBlockSettings
} from '@/types/news';

// ============================================================
// СЕРИАЛИЗАЦИЯ И ДЕСЕРИАЛИЗАЦИЯ
// ============================================================

/**
 * Сериализует массив блоков в JSON для сохранения в БД
 */
export const serializeContentBlocks = (blocks: ContentBlock[]): string => {
  return JSON.stringify(blocks);
};

/**
 * Десериализует JSON из БД в массив блоков
 */
export const deserializeContentBlocks = (json: string): ContentBlock[] => {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse content blocks:', error);
    return [];
  }
};

// ============================================================
// СОЗДАНИЕ БЛОКОВ
// ============================================================

/**
 * Создает пустой текстовый блок
 */
export const createTextBlock = (newsId: string, orderIndex: number): CreateContentBlock => {
  return {
    news_id: newsId,
    order_index: orderIndex,
    block_type: 'text',
    content: '',
    images_data: [],
    block_settings: {
      textAlign: 'left',
      fontSize: 'medium'
    } as TextBlockSettings
  };
};

/**
 * Создает блок "Текст + изображение справа"
 */
export const createTextImageRightBlock = (newsId: string, orderIndex: number): CreateContentBlock => {
  return {
    news_id: newsId,
    order_index: orderIndex,
    block_type: 'text_image_right',
    content: '',
    images_data: [],
    block_settings: {
      textAlign: 'left',
      fontSize: 'medium',
      imageWidth: 40,
      imageRatio: '1:1'
    } as TextImageRightBlockSettings
  };
};

/**
 * Создает блок "Изображение слева + текст"
 */
export const createImageTextLeftBlock = (newsId: string, orderIndex: number): CreateContentBlock => {
  return {
    news_id: newsId,
    order_index: orderIndex,
    block_type: 'image_text_left',
    content: '',
    images_data: [],
    block_settings: {
      textAlign: 'left',
      fontSize: 'medium',
      imageWidth: 40,
      imageRatio: '1:1'
    } as ImageTextLeftBlockSettings
  };
};

/**
 * Создает блок "Два изображения"
 */
export const createTwoImagesBlock = (newsId: string, orderIndex: number): CreateContentBlock => {
  return {
    news_id: newsId,
    order_index: orderIndex,
    block_type: 'two_images',
    content: '',
    images_data: [],
    block_settings: {
      layout: 'equal',
      gap: 16
    } as TwoImagesBlockSettings
  };
};

/**
 * Создает блок "Галерея"
 */
export const createGalleryBlock = (newsId: string, orderIndex: number): CreateContentBlock => {
  return {
    news_id: newsId,
    order_index: orderIndex,
    block_type: 'gallery',
    content: '',
    images_data: [],
    block_settings: {
      columns: 3,
      aspectRatio: '16:9',
      showCaptions: true
    } as GalleryBlockSettings
  };
};

/**
 * Фабрика для создания блока по типу
 */
export const createBlockByType = (
  blockType: ContentBlockType,
  newsId: string,
  orderIndex: number
): CreateContentBlock => {
  switch (blockType) {
    case 'text':
      return createTextBlock(newsId, orderIndex);
    case 'text_image_right':
      return createTextImageRightBlock(newsId, orderIndex);
    case 'image_text_left':
      return createImageTextLeftBlock(newsId, orderIndex);
    case 'two_images':
      return createTwoImagesBlock(newsId, orderIndex);
    case 'gallery':
      return createGalleryBlock(newsId, orderIndex);
    default:
      return createTextBlock(newsId, orderIndex);
  }
};

// ============================================================
// МАНИПУЛЯЦИИ С БЛОКАМИ
// ============================================================

/**
 * Добавляет новый блок в конец списка
 */
export const addBlock = (
  blocks: ContentBlock[],
  blockType: ContentBlockType,
  newsId: string
): ContentBlock[] => {
  const newBlock = createBlockByType(blockType, newsId, blocks.length);

  return [
    ...blocks,
    {
      ...newBlock,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ContentBlock
  ];
};

/**
 * Удаляет блок по индексу
 */
export const removeBlock = (blocks: ContentBlock[], index: number): ContentBlock[] => {
  const newBlocks = blocks.filter((_, i) => i !== index);
  // Пересчитываем order_index
  return newBlocks.map((block, i) => ({
    ...block,
    order_index: i
  }));
};

/**
 * Перемещает блок с одной позиции на другую
 */
export const moveBlock = (
  blocks: ContentBlock[],
  fromIndex: number,
  toIndex: number
): ContentBlock[] => {
  const result = Array.from(blocks);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  // Пересчитываем order_index
  return result.map((block, i) => ({
    ...block,
    order_index: i
  }));
};

/**
 * Обновляет содержимое блока
 */
export const updateBlockContent = (
  blocks: ContentBlock[],
  index: number,
  content: string
): ContentBlock[] => {
  return blocks.map((block, i) =>
    i === index
      ? { ...block, content, updated_at: new Date().toISOString() }
      : block
  );
};

/**
 * Обновляет изображения блока
 */
export const updateBlockImages = (
  blocks: ContentBlock[],
  index: number,
  images: ImageData[]
): ContentBlock[] => {
  return blocks.map((block, i) =>
    i === index
      ? { ...block, images_data: images, updated_at: new Date().toISOString() }
      : block
  );
};

/**
 * Обновляет настройки блока
 */
export const updateBlockSettings = (
  blocks: ContentBlock[],
  index: number,
  settings: Record<string, any>
): ContentBlock[] => {
  return blocks.map((block, i) =>
    i === index
      ? { ...block, block_settings: { ...block.block_settings, ...settings }, updated_at: new Date().toISOString() }
      : block
  );
};

/**
 * Дублирует блок
 */
export const duplicateBlock = (blocks: ContentBlock[], index: number): ContentBlock[] => {
  const blockToDuplicate = blocks[index];
  if (!blockToDuplicate) return blocks;

  const duplicated: ContentBlock = {
    ...blockToDuplicate,
    id: `temp-${Date.now()}`,
    order_index: index + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = [
    ...blocks.slice(0, index + 1),
    duplicated,
    ...blocks.slice(index + 1)
  ];

  // Пересчитываем order_index для блоков после дубликата
  return result.map((block, i) => ({
    ...block,
    order_index: i
  }));
};

/**
 * Переиндексирует блоки после перестановки
 */
export const reorderBlocks = <T extends { order_index: number }>(blocks: T[]): T[] => {
  return blocks.map((block, i) => ({
    ...block,
    order_index: i
  }));
};

// ============================================================
// КОНВЕРТАЦИЯ СТАРОГО КОНТЕНТА
// ============================================================

/**
 * Конвертирует старое текстовое поле content в блоки
 */
export const convertLegacyContentToBlocks = (
  content: string,
  newsId: string
): ContentBlock[] => {
  if (!content || content.trim() === '') {
    return [];
  }

  // Создаем один текстовый блок со старым контентом
  return [{
    id: `temp-${Date.now()}`,
    news_id: newsId,
    order_index: 0,
    block_type: 'text',
    content: content,
    images_data: [],
    block_settings: {
      textAlign: 'left',
      fontSize: 'medium'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];
};

// ============================================================
// ЭКСПОРТ/ИМПОРТ
// ============================================================

/**
 * Экспортирует блоки в формат для копирования
 */
export const exportBlocks = (blocks: ContentBlock[]): string => {
  const exportData = blocks.map(block => ({
    block_type: block.block_type,
    content: block.content,
    images_data: block.images_data,
    block_settings: block.block_settings
  }));

  return JSON.stringify(exportData, null, 2);
};

/**
 * Импортирует блоки из скопированного формата
 */
export const importBlocks = (
  json: string,
  newsId: string,
  startIndex: number = 0
): ContentBlock[] => {
  try {
    const importData = JSON.parse(json);

    if (!Array.isArray(importData)) {
      throw new Error('Invalid import format');
    }

    return importData.map((data, index) => ({
      id: `temp-${Date.now()}-${index}`,
      news_id: newsId,
      order_index: startIndex + index,
      block_type: data.block_type,
      content: data.content || '',
      images_data: data.images_data || [],
      block_settings: data.block_settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Failed to import blocks:', error);
    return [];
  }
};

// ============================================================
// ПОЛУЧЕНИЕ ИНФОРМАЦИИ О БЛОКЕ
// ============================================================

/**
 * Возвращает человекочитаемое название типа блока
 */
export const getBlockTypeName = (blockType: ContentBlockType): string => {
  const names: Record<ContentBlockType, string> = {
    text: 'Текстовый блок',
    text_image_right: 'Текст + изображение справа',
    image_text_left: 'Изображение слева + текст',
    two_images: 'Два изображения',
    gallery: 'Галерея изображений'
  };

  return names[blockType] || 'Неизвестный тип';
};

/**
 * Возвращает иконку для типа блока
 */
export const getBlockTypeIcon = (blockType: ContentBlockType): string => {
  const icons: Record<ContentBlockType, string> = {
    text: '📝',
    text_image_right: '📝🖼️',
    image_text_left: '🖼️📝',
    two_images: '🖼️🖼️',
    gallery: '🎨'
  };

  return icons[blockType] || '📄';
};

/**
 * Подсчитывает общее количество изображений во всех блоках
 */
export const getTotalImagesCount = (blocks: ContentBlock[]): number => {
  return blocks.reduce((total, block) => total + (block.images_data?.length || 0), 0);
};

/**
 * Подсчитывает общее количество символов в текстовых блоках
 */
export const getTotalTextLength = (blocks: ContentBlock[]): number => {
  return blocks.reduce((total, block) => {
    if (block.content) {
      return total + block.content.length;
    }
    return total;
  }, 0);
};

/**
 * Проверяет, содержит ли хотя бы один блок текст
 */
export const hasTextContent = (blocks: ContentBlock[]): boolean => {
  return blocks.some(block => block.content && block.content.trim() !== '');
};

/**
 * Проверяет, содержит ли хотя бы один блок изображения
 */
export const hasImageContent = (blocks: ContentBlock[]): boolean => {
  return blocks.some(block => block.images_data && block.images_data.length > 0);
};
