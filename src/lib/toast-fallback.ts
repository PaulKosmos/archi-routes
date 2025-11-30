// src/lib/toast-fallback.ts
// Временная заглушка для toast уведомлений

export const toast = {
  success: (message: string) => {
    console.log('✅ SUCCESS:', message)
    // Можно добавить alert или другой способ показа уведомлений
    // alert(`✅ ${message}`)
  },
  error: (message: string) => {
    console.error('❌ ERROR:', message)
    // alert(`❌ ${message}`)
  },
  loading: (message: string) => {
    console.log('⏳ LOADING:', message)
    return { id: 'loading' }
  },
  dismiss: (id?: string) => {
    console.log('🔇 DISMISS:', id)
  }
}
