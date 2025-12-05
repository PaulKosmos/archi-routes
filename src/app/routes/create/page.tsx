'use client'

export const dynamic = 'force-dynamic'



import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'

export default function CreateRoutePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на авторизацию
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Произойдет redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <Link
            href="/routes"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>К маршрутам</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-blue-600 text-6xl mb-4">
            <Info className="w-16 h-16 mx-auto" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Создание маршрутов
          </h1>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Для создания архитектурных маршрутов используйте форму в выпадающем меню "Создать" в верхней панели навигации.
          </p>
          
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 mb-2">Как создать маршрут:</h3>
              <ol className="text-sm text-gray-700 space-y-1">
                <li>1. Нажмите на кнопку "Создать" в верхней панели</li>
                <li>2. Выберите "Маршрут" из выпадающего меню</li>
                <li>3. Заполните информацию о маршруте</li>
                <li>4. Добавьте точки и здания</li>
                <li>5. Опубликуйте маршрут</li>
              </ol>
            </div>
            
            <Link
              href="/routes"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Вернуться к маршрутам
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
