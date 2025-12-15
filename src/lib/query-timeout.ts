// Utility для защиты от зависания Supabase queries в production
// Оборачивает Promise в timeout, чтобы предотвратить бесконечное зависание

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Query timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  )

  return Promise.race([promise, timeoutPromise])
}

// Специальная версия для Supabase queries
export async function supabaseQueryWithTimeout<T>(
  queryFn: () => Promise<T>,
  options: {
    timeout?: number
    errorMessage?: string
    fallbackValue?: T
    onTimeout?: () => void
  } = {}
): Promise<T> {
  const {
    timeout = 10000,
    errorMessage = 'Supabase query timeout',
    fallbackValue,
    onTimeout
  } = options

  try {
    return await withTimeout(queryFn(), timeout, errorMessage)
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, error)

    if (onTimeout) {
      onTimeout()
    }

    // Если есть fallback значение, возвращаем его
    if (fallbackValue !== undefined) {
      return fallbackValue
    }

    // Иначе пробрасываем ошибку
    throw error
  }
}
