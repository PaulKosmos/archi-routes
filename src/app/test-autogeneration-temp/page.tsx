'use client'

export const dynamic = 'force-dynamic'

// src/app/test-autogeneration/page.tsx - Страница для тестирования исправлений автогенерации



import { useState, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '@/lib/supabase'

export default function TestAutogenerationPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testGeneration = async () => {
    if (!user) {
      setError('Необходима авторизация')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      console.log('🚀 Запускаем тест автогенерации с исправлениями...')

      // Get current session for access token
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/autogeneration/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          city: 'Berlin',
          route_title: `Тестовый маршрут ${new Date().toLocaleTimeString()}`,
          generation_params: {
            max_points: 5,
            transport_mode: 'walking',
            difficulty: 'easy',
            radius_km: 2
          },
          ai_options: {
            provider: 'local'
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        console.log('✅ Автогенерация успешна:', data)
      } else {
        setError(data.error || 'Неизвестная ошибка')
        console.error('❌ Ошибка автогенерации:', data)
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      console.error('❌ Ошибка запроса:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Тест автогенерации маршрутов
          </h1>
          <p className="text-gray-600">Необходима авторизация для тестирования</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Тест исправлений автогенерации маршрутов
          </h1>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              🎯 Что мы тестируем:
            </h2>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>✅ <strong>Оптимизация порядка точек</strong> - логичная последовательность от ближней к дальней</li>
              <li>✅ <strong>Реальные дороги</strong> - сохранение геометрии маршрута в БД</li>
              <li>✅ <strong>Улучшенная обработка ошибок</strong> - критичные ошибки не игнорируются</li>
              <li>✅ <strong>Детальная диагностика</strong> - подробные логи процесса генерации</li>
            </ul>
          </div>

          <div className="mb-6">
            <button
              onClick={testGeneration}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                isGenerating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⚙️</span>
                  Генерируем маршрут...
                </>
              ) : (
                '🚀 Запустить тест автогенерации'
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Ошибка:</h3>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">✅ Генерация успешна!</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded border">
                  <h4 className="font-semibold text-gray-900 mb-2">📊 Результат:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li><strong>ID маршрута:</strong> {result.route_id}</li>
                    <li><strong>Сообщение:</strong> {result.message}</li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 rounded border">
                  <h4 className="font-semibold text-gray-900 mb-2">🔗 Действия:</h4>
                  <div className="space-y-2">
                    <a
                      href={`/routes/${result.route_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-sm"
                    >
                      👁️ Просмотреть маршрут
                    </a>
                    <br />
                    <a
                      href={`/routes/${result.route_id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors text-sm"
                    >
                      ✏️ Редактировать
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 bg-white p-4 rounded border">
                <h4 className="font-semibold text-gray-900 mb-2">🔍 Что проверить в созданном маршруте:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>Порядок точек:</strong> должен быть логичным (от ближней к дальней)</li>
                  <li>• <strong>Геометрия маршрута:</strong> должна показывать реальные дороги, а не прямые линии</li>
                  <li>• <strong>Расстояние и время:</strong> должны быть реалистичными</li>
                  <li>• <strong>Инструкции:</strong> должны содержать пошаговые указания</li>
                </ul>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Инструкция по тестированию:</h3>
            <ol className="text-sm text-gray-700 space-y-2">
              <li>1. Нажмите кнопку "Запустить тест автогенерации"</li>
              <li>2. Дождитесь завершения генерации (30-60 секунд)</li>
              <li>3. Откройте созданный маршрут в новой вкладке</li>
              <li>4. Проверьте на карте, что маршрут идет по реальным дорогам</li>
              <li>5. Убедитесь, что порядок точек логичен</li>
              <li>6. Проверьте консоль браузера для детальных логов процесса</li>
            </ol>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              🔧 Эта страница для тестирования исправлений автогенерации маршрутов.
              <br />
              Проверяем: оптимизацию порядка точек и сохранение реальной геометрии дорог.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}