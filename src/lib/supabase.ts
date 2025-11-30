// lib/supabase.ts - Правильная конфигурация для Next.js App Router
// Используем @supabase/ssr для правильной работы с cookies и SSR

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ ПРАВИЛЬНО: Экспортируем ФУНКЦИЮ, а не singleton
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// ⚠️ DEPRECATED: Для обратной совместимости, но лучше использовать createClient()
// Этот глобальный клиент будет удален в будущем
let _globalClient: ReturnType<typeof createBrowserClient> | null = null

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // На сервере создаем новый клиент каждый раз
    return createClient()
  }

  // В браузере используем singleton для обратной совместимости
  if (!_globalClient) {
    _globalClient = createClient()
  }
  return _globalClient
})()

// Экспорт типов
export type { Profile } from '../types/building'

// Утилиты для работы с Storage
export const getStorageUrl = (bucket: string, path: string) => {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: {
    cacheControl?: string
    contentType?: string
    upsert?: boolean
  }
) => {
  const client = createClient()
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options?.cacheControl || '3600',
      contentType: options?.contentType || file.type,
      upsert: options?.upsert || false
    })

  if (error) {
    throw error
  }

  return {
    path: data.path,
    fullPath: data.fullPath,
    url: getStorageUrl(bucket, data.path)
  }
}

export const deleteFile = async (bucket: string, path: string) => {
  const client = createClient()
  const { error } = await client.storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw error
  }
}

// Утилиты для аудио файлов
export const uploadAudio = async (file: File, buildingId: string, reviewId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${reviewId}-${Date.now()}.${fileExt}`
  const filePath = `reviews/${buildingId}/${fileName}`

  return uploadFile('audio', filePath, file, {
    contentType: 'audio/mpeg'
  })
}

// Утилиты для изображений
export const uploadImage = async (file: File, bucket: string, folder: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  return uploadFile(bucket, filePath, file, {
    contentType: file.type
  })
}

export default supabase
