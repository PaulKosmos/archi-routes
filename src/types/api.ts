// src/types/api.ts - Утилиты для работы с типами API

/**
 * Конвертирует null в undefined для совместимости с React
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * Безопасное получение строки для React атрибутов
 */
export function safeString(value: string | null | undefined): string | undefined {
  return value || undefined
}

/**
 * Конвертирует Supabase объект в React-совместимый
 */
export function sanitizeForReact<T extends Record<string, any>>(obj: T): T {
  const result = {} as T
  
  for (const [key, value] of Object.entries(obj)) {
    result[key as keyof T] = value === null ? undefined : value
  }
  
  return result
}

/**
 * Типы для обработки ошибок API
 */
export interface APIError {
  message: string
  code?: string | number
  details?: any
}

/**
 * Обертка для безопасного вызова API
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data: T | null; error: APIError | null }> {
  try {
    const data = await apiCall()
    return { data, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message || 'Unknown API error',
        code: error.code,
        details: error
      }
    }
  }
}