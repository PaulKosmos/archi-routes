'use client'

export const dynamic = 'force-dynamic'



import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Перенаправляем на правильную страницу настроек
    router.replace('/profile/settings')
  }, [router])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Перенаправление на страницу настроек...</p>
        </div>
      </div>
    </div>
  )
}
