// utils/blogBlocks.ts
// Утилиты для работы с блоками контента блога

import {
  BlogContentBlock,
  CreateBlogContentBlock,
  BlogContentBlockType,
  ImageData,
  TextBlockSettings,
  TextImageRightBlockSettings,
  ImageTextLeftBlockSettings,
  FullWidthImageBlockSettings,
  GalleryBlockSettings,
  BuildingCardBlockSettings
} from '@/types/blog';

// ============================================================
// СЕРИАЛИЗАЦИЯ И ДЕСЕРИАЛИЗАЦИЯ
// ============================================================

/**
 * Сериализует массив блоков в JSON для сохранения в БД
 */
export const serializeContentBlocks = (blocks: BlogContentBlock[]): string => {
  return JSON.stringify(blocks);
};

/**
 * Десериализует JSON из БД в массив блоков
 */
export const deserializeContentBlocks = (json: string): BlogContentBlock[] => {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse blog content blocks:', error);
    return [];
  }
};

// ============================================================
// СОЗДАНИЕ БЛОКОВ
// ============================================================

/**
 * Создает пустой текстовый блок
 */
export const createTextBlock = (blogPostId: string, orderIndex: number): CreateBlogContentBlock => {
  return {
    blog_post_id: blogPostId,
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
export const createTextImageRightBlock = (blogPostId: string, orderIndex: number): CreateBlogContentBlock => {
  return {
    blog_post_id: blogPostId,
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
export const createImageTextLeftBlock = (blogPostId: string, orderIndex: number): CreateBlogContentBlock => {
  return {
    blog_post_id: blogPostId,
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
 * Создает блок "Полноразмерное изображение"
 */
export const createFullWidthImageBlock = (blogPostId: string, orderIndex: number): CreateBlogContentBlock => {
  return {
    blog_post_id: blogPostId,
    order_index: orderIndex,
    block_type: 'full_width_image',
    content: '',
    images_data: [],
    block_settings: {
      showCaption: true,
      aspectRatio: 'auto'
    } as FullWidthImageBlockSettings
  };
};

/**
 * Создает блок "Галерея"
 */
export const createGalleryBlock = (blogPostId: string, orderIndex: number): CreateBlogContentBlock => {
  return {
    blog_post_id: blogPostId,
    order_index: orderIndex,
    block_type: 'gallery',
    content: '',
    images_data: [],
    block_settings: {
      columns: 3,
      aspectRatio: '16:9',
      showCaptions: true,
      layout: 'grid'
    } as GalleryBlockSettings
  };
};

/**
 * Создает блок "Карточка объекта"
 */
export const createBuildingCardBlock = (blogPostId: string, orderIndex: number): CreateBlogContentBlock => {
  return {
    blog_post_id: blogPostId,
    order_index: orderIndex,
    block_type: 'building_card',
    content: '',
    building_id: undefined,
    images_data: [],
    block_settings: {
      showDescription: true,
      showArchitect: true,
      showYear: true,
      showStyle: true,
      showMapButton: true,      // Зеленая кнопка
      showRouteButton: true,    // Зеленая кнопка
      cardLayout: 'horizontal'
    } as BuildingCardBlockSettings
  };
};

/**
 * Фабрика для создания блока по типу
 */
export const createBlockByType = (
  blockType: BlogContentBlockType,
  blogPostId: string,
  orderIndex: number
): CreateBlogContentBlock => {
  switch (blockType) {
    case 'text':
      return createTextBlock(blogPostId, orderIndex);
    case 'text_image_right':
      return createTextImageRightBlock(blogPostId, orderIndex);
    case 'image_text_left':
      return createImageTextLeftBlock(blogPostId, orderIndex);
    case 'full_width_image':
      return createFullWidthImageBlock(blogPostId, orderIndex);
    case 'gallery':
      return createGalleryBlock(blogPostId, orderIndex);
    case 'building_card':
      return createBuildingCardBlock(blogPostId, orderIndex);
    default:
      return createTextBlock(blogPostId, orderIndex);
  }
};

// ============================================================
// МАНИПУЛЯЦИИ С БЛОКАМИ
// ============================================================

/**
 * Добавляет новый блок в конец списка
 */
export const addBlock = (
  blocks: BlogContentBlock[],
  blockType: BlogContentBlockType,
  blogPostId: string
): BlogContentBlock[] => {
  const newBlock = createBlockByType(blockType, blogPostId, blocks.length);

  return [
    ...blocks,
    {
      ...newBlock,
      id: `temp-${Date.now()}`,
      images_data: newBlock.images_data || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as BlogContentBlock
  ];
};

/**
 * Удаляет блок по индексу и пересчитывает order_index
 */
export const removeBlock = (blocks: BlogContentBlock[], index: number): BlogContentBlock[] => {
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
  blocks: BlogContentBlock[],
  fromIndex: number,
  toIndex: number
): BlogContentBlock[] => {
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
 * Пересчитывает order_index для всех блоков
 */
export const reorderBlocks = (blocks: BlogContentBlock[]): BlogContentBlock[] => {
  return blocks.map((block, i) => ({
    ...block,
    order_index: i
  }));
};

/**
 * Обновляет содержимое блока
 */
export const updateBlockContent = (
  blocks: BlogContentBlock[],
  index: number,
  content: string
): BlogContentBlock[] => {
  return blocks.map((block, i) =>
    i === index
      ? { ...block, content, updated_at: new Date().toISOString() }
      : block
  );
};

/**
 * Обновляет building_id для building_card блока
 */
export const updateBlockBuilding = (
  blocks: BlogContentBlock[],
  index: number,
  buildingId: string
): BlogContentBlock[] => {
  return blocks.map((block, i) =>
    i === index && block.block_type === 'building_card'
      ? { ...block, building_id: buildingId, updated_at: new Date().toISOString() }
      : block
  );
};

/**
 * Обновляет изображения блока
 */
export const updateBlockImages = (
  blocks: BlogContentBlock[],
  index: number,
  images: ImageData[]
): BlogContentBlock[] => {
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
  blocks: BlogContentBlock[],
  index: number,
  settings: Record<string, any>
): BlogContentBlock[] => {
  return blocks.map((block, i) =>
    i === index
      ? { ...block, block_settings: { ...block.block_settings, ...settings }, updated_at: new Date().toISOString() }
      : block
  );
};

/**
 * Дублирует блок
 */
export const duplicateBlock = (blocks: BlogContentBlock[], index: number): BlogContentBlock[] => {
  const blockToDuplicate = blocks[index];
  if (!blockToDuplicate) return blocks;

  const duplicated: BlogContentBlock = {
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

// ============================================================
// КОНВЕРТАЦИЯ СТАРОГО КОНТЕНТА
// ============================================================

/**
 * Конвертирует старое rich text поле content в блоки
 * Используется для миграции существующих блогов
 */
export const convertLegacyContentToBlocks = (
  content: any,
  blogPostId: string
): BlogContentBlock[] => {
  if (!content) {
    return [];
  }

  // Если content - это строка HTML
  if (typeof content === 'string') {
    if (content.trim() === '') return [];

    return [{
      id: `temp-${Date.now()}`,
      blog_post_id: blogPostId,
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
  }

  // Если content - это JSON из rich text редактора
  // TODO: Реализовать более сложную конвертацию с парсингом JSON
  const blocks: BlogContentBlock[] = [];

  return blocks;
};

// ============================================================
// ПОЛУЧЕНИЕ ИНФОРМАЦИИ О БЛОКЕ
// ============================================================

/**
 * Возвращает человекочитаемое название типа блока
 */
export const getBlockTypeName = (blockType: BlogContentBlockType): string => {
  const names: Record<BlogContentBlockType, string> = {
    text: 'Текстовый блок',
    text_image_right: 'Текст + изображение справа',
    image_text_left: 'Изображение слева + текст',
    full_width_image: 'Полноразмерное изображение',
    gallery: 'Галерея изображений',
    building_card: 'Карточка объекта'
  };

  return names[blockType] || 'Неизвестный тип';
};

/**
 * Возвращает иконку для типа блока
 */
export const getBlockTypeIcon = (blockType: BlogContentBlockType): string => {
  const icons: Record<BlogContentBlockType, string> = {
    text: '📝',
    text_image_right: '📝🖼️',
    image_text_left: '🖼️📝',
    full_width_image: '🖼️',
    gallery: '🎨',
    building_card: '🏛️'
  };

  return icons[blockType] || '📄';
};

/**
 * Возвращает описание типа блока
 */
export const getBlockTypeDescription = (blockType: BlogContentBlockType): string => {
  const descriptions: Record<BlogContentBlockType, string> = {
    text: 'Параграф текста с форматированием',
    text_image_right: 'Текст с изображением, расположенным справа',
    image_text_left: 'Изображение слева с текстовым описанием',
    full_width_image: 'Изображение на всю ширину страницы',
    gallery: 'Галерея из нескольких изображений',
    building_card: 'Интерактивная карточка архитектурного объекта'
  };

  return descriptions[blockType] || '';
};

/**
 * Подсчитывает общее количество изображений во всех блоках
 */
export const getTotalImagesCount = (blocks: BlogContentBlock[]): number => {
  return blocks.reduce((total, block) => total + (block.images_data?.length || 0), 0);
};

/**
 * Подсчитывает общее количество символов в текстовых блоках
 */
export const getTotalTextLength = (blocks: BlogContentBlock[]): number => {
  return blocks.reduce((total, block) => {
    if (block.content) {
      // Убираем HTML теги для подсчета
      const textOnly = block.content.replace(/<[^>]*>/g, '');
      return total + textOnly.length;
    }
    return total;
  }, 0);
};

/**
 * Проверяет, содержит ли хотя бы один блок текст
 */
export const hasTextContent = (blocks: BlogContentBlock[]): boolean => {
  return blocks.some(block => block.content && block.content.trim() !== '');
};

/**
 * Проверяет, содержит ли хотя бы один блок изображения
 */
export const hasImageContent = (blocks: BlogContentBlock[]): boolean => {
  return blocks.some(block => block.images_data && block.images_data.length > 0);
};

/**
 * Собирает все building_id из building_card блоков
 */
export const extractBuildingIds = (blocks: BlogContentBlock[]): string[] => {
  return blocks
    .filter(block => block.block_type === 'building_card' && block.building_id)
    .map(block => block.building_id!)
    .filter(Boolean);
};

/**
 * Подсчитывает количество блоков каждого типа
 */
export const getBlockTypeStats = (blocks: BlogContentBlock[]): Record<BlogContentBlockType, number> => {
  const stats = {
    text: 0,
    text_image_right: 0,
    image_text_left: 0,
    full_width_image: 0,
    gallery: 0,
    building_card: 0
  };

  blocks.forEach(block => {
    stats[block.block_type]++;
  });

  return stats;
};

/**
 * Валидация блока - проверяет, все ли обязательные поля заполнены
 */
export const validateBlock = (block: BlogContentBlock): string[] => {
  const errors: string[] = [];

  // Проверка обязательных полей
  if (!block.block_type) {
    errors.push('Не указан тип блока');
  }

  // Специфичная валидация по типу блока
  switch (block.block_type) {
    case 'text':
      if (!block.content || block.content.trim() === '') {
        errors.push('Текстовый блок не может быть пустым');
      }
      break;

    case 'text_image_right':
    case 'image_text_left':
      if (!block.content || block.content.trim() === '') {
        errors.push('Добавьте текст к блоку');
      }
      if (!block.images_data || block.images_data.length === 0) {
        errors.push('Добавьте изображение к блоку');
      }
      break;

    case 'full_width_image':
      if (!block.images_data || block.images_data.length === 0) {
        errors.push('Добавьте изображение');
      }
      break;

    case 'gallery':
      if (!block.images_data || block.images_data.length < 2) {
        errors.push('Галерея должна содержать минимум 2 изображения');
      }
      break;

    case 'building_card':
      if (!block.building_id) {
        errors.push('Выберите объект из базы');
      }
      break;
  }

  return errors;
};

/**
 * Валидация всех блоков
 */
export const validateAllBlocks = (blocks: BlogContentBlock[]): Record<number, string[]> => {
  const errors: Record<number, string[]> = {};

  blocks.forEach((block, index) => {
    const blockErrors = validateBlock(block);
    if (blockErrors.length > 0) {
      errors[index] = blockErrors;
    }
  });

  return errors;
};

/**
 * Проверяет, есть ли ошибки валидации
 */
export const hasValidationErrors = (errors: Record<number, string[]>): boolean => {
  return Object.keys(errors).length > 0;
};
