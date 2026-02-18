// src/lib/storage.ts - Утилиты для работы с Storage

import { createClient } from './supabase'

const supabase = createClient()

// Типы для структуры папок
export type StorageFolder = 
  | 'buildings/main'
  | 'buildings/gallery' 
  | 'reviews'
  | 'profiles'
  | 'temp'

// Утилита для генерации путей файлов
export const generateStoragePath = (
  folder: StorageFolder,
  fileName: string,
  userId?: string
): string => {
  const timestamp = Date.now()
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  
  switch (folder) {
    case 'buildings/main':
      return `buildings/main/${timestamp}-${cleanFileName}`
    
    case 'buildings/gallery':
      return `buildings/gallery/${timestamp}-${cleanFileName}`
    
    case 'reviews':
      if (!userId) throw new Error('User ID required for reviews folder')
      return `reviews/user-${userId}/${timestamp}-${cleanFileName}`
    
    case 'profiles':
      if (!userId) throw new Error('User ID required for profiles folder')
      return `profiles/${userId}-${timestamp}-${cleanFileName}`
    
    case 'temp':
      return `temp/${timestamp}-${cleanFileName}`
    
    default:
      throw new Error(`Unknown folder: ${folder}`)
  }
}

// Получение публичного URL
export const getStorageUrl = (path: string, bucket: 'photos' | 'audio' | 'podcasts' | 'avatars' | 'routes' = 'photos'): string => {
  // Проверяем на пустое или null значение
  if (!path || path.trim() === '') {
    return ''
  }

  // Если это уже полный URL от Supabase или внешний URL - возвращаем как есть
  if (path.startsWith('http')) {
    return path
  }

  // Если это относительный путь - генерируем URL через Supabase
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  } catch (error) {
    console.error('Error generating storage URL:', error)
    return ''
  }
}

// Загрузка изображения с автоматическим путем
export const uploadImage = async (
  file: File,
  folder: StorageFolder,
  userId?: string
): Promise<{ path: string; url: string }> => {
  const filePath = generateStoragePath(folder, file.name, userId)
  
  const { data, error } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  return {
    path: data.path,
    url: getStorageUrl(data.path)
  }
}

// Загрузка аудио
export const uploadAudio = async (
  file: File,
  userId: string,
  reviewId?: string
): Promise<{ path: string; url: string }> => {
  const fileName = reviewId 
    ? `${reviewId}-${Date.now()}.${file.name.split('.').pop()}`
    : `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  const filePath = `reviews/user-${userId}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('audio')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  return {
    path: data.path,
    url: getStorageUrl(data.path, 'audio')
  }
}

// Удаление файла
export const deleteFile = async (path: string, bucket: 'photos' | 'audio' | 'podcasts' = 'photos'): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
}

// Массовая загрузка файлов
export const uploadMultipleImages = async (
  files: File[],
  folder: StorageFolder,
  userId?: string
): Promise<Array<{ path: string; url: string }>> => {
  const uploadPromises = files.map(file => uploadImage(file, folder, userId))
  return Promise.all(uploadPromises)
}