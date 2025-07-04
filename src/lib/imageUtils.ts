// src/lib/imageUtils.ts
import { supabase } from './supabase'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  progress?: number
}

/**
 * Загружает изображение в Supabase Storage
 */
export async function uploadImage(
  file: File,
  folder: 'buildings' | 'routes' | 'profiles' = 'buildings',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Ошибка аутентификации:', authError)
      return { 
        success: false, 
        error: 'Необходимо войти в систему для загрузки изображений' 
      }
    }

    console.log('🔐 Пользователь аутентифицирован:', user.id)

    // Валидация файла
    if (!file) {
      return { success: false, error: 'Файл не выбран' }
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Можно загружать только изображения' }
    }

    // Проверка размера (максимум 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { success: false, error: 'Файл слишком большой (максимум 10MB)' }
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    console.log('📁 Загружаем файл:', fileName)

    // Загружаем файл
    const { data, error } = await supabase.storage
      .from('building-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Ошибка загрузки:', error)
      return { success: false, error: `Ошибка загрузки: ${error.message}` }
    }

    console.log('✅ Файл загружен:', data)

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('building-images')
      .getPublicUrl(fileName)

    console.log('🔗 Публичный URL:', publicUrl)

    return {
      success: true,
      url: publicUrl
    }

  } catch (error) {
    console.error('💥 Неожиданная ошибка:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }
  }
}

/**
 * Удаляет изображение из Storage
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    // Извлекаем путь к файлу из URL
    const urlParts = url.split('/building-images/')
    if (urlParts.length < 2) {
      console.error('Некорректный URL изображения')
      return false
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('building-images')
      .remove([filePath])

    if (error) {
      console.error('Ошибка удаления:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Ошибка при удалении:', error)
    return false
  }
}

/**
 * Получает оптимизированный URL изображения
 */
export function getOptimizedImageUrl(
  url: string, 
  options: {
    width?: number
    height?: number
    quality?: number
  } = {}
): string {
  if (!url) return ''

  // Если это Supabase URL, можно добавить параметры трансформации
  // (требует настройки Supabase Image Transformation)
  const params = new URLSearchParams()
  
  if (options.width) params.append('width', options.width.toString())
  if (options.height) params.append('height', options.height.toString())
  if (options.quality) params.append('quality', options.quality.toString())

  return params.toString() ? `${url}?${params.toString()}` : url
}

/**
 * Сжимает изображение перед загрузкой
 */
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      // Вычисляем новые размеры
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      // Рисуем сжатое изображение
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      // Конвертируем в blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Возвращаем оригинал если сжатие не удалось
          }
        },
        file.type,
        quality
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Создает превью изображения
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })
}