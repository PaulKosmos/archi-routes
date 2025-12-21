'use client'

export const dynamic = 'force-dynamic'

// src/app/admin/autogeneration/page.tsx - Полная страница автогенерации



import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import Header from '@/components/Header'

export default function AutogenerationPage() {
  const { user } = useAuth()
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
      
      const response = await fetch('/api/autogeneration/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.session?.access_token}`
        },
        body: JSON.stringify({
          city: 'Berlin',
          route_title: `Автоматический маршрут ${new Date().toLocaleTimeString()}`,
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center bg-white rounded-lg shadow-sm p-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Автогенерация контента
          </h1>
          <p className="text-gray-600">Необходима авторизация для доступа к инструментам автогенерации</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header buildings={[]} />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 Автогенерация контента
          </h1>
        <p className="text-gray-600">
          Автоматическое создание архитектурных маршрутов с помощью ИИ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Генератор маршрутов */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🗺️ Автоматическая генерация маршрутов
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ✨ Возможности системы:
            </h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Поиск архитектурных объектов в городе</li>
              <li>• Оптимизация порядка посещения</li>
              <li>• Расчет реальных пешеходных маршрутов</li>
              <li>• Автоматическое создание описаний</li>
              <li>• Сохранение в базе данных</li>
            </ul>
          </div>

          <button
            onClick={testGeneration}
            disabled={isGenerating}
            className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <>
                <span className="inline-block animate-spin mr-2">⚙️</span>
                Генерируем маршрут для Берлина...
              </>
            ) : (
              '🚀 Сгенерировать маршрут в Берлине'
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Ошибка:</h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-4">✅ Маршрут создан!</h3>
              
              <div className="bg-white p-4 rounded border mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">📊 Детали:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>ID маршрута:</strong> {result.route_id}</li>
                  <li><strong>Статус:</strong> {result.message}</li>
                </ul>
              </div>
              
              <div className="flex gap-2">
                <a
                  href={`/routes/${result.route_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  👁️ Просмотреть маршрут
                </a>
                <a
                  href={`/routes/${result.route_id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors text-sm font-medium"
                >
                  ✏️ Редактировать
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Статистика и инструкции */}
        <div className="space-y-6">
          {/* Статистика */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📈 Статистика автогенерации
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">127</div>
                <div className="text-sm text-green-800">Маршрутов создано</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">15</div>
                <div className="text-sm text-blue-800">Городов покрыто</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">89%</div>
                <div className="text-sm text-purple-800">Успешных генераций</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">4.3</div>
                <div className="text-sm text-orange-800">Средний рейтинг</div>
              </div>
            </div>
          </div>

          {/* Инструкции */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📝 Как работает автогенерация
            </h2>
            <ol className="text-sm text-gray-700 space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                <div>
                  <strong>Поиск объектов:</strong> Система находит архитектурные здания в указанном городе используя OpenStreetMap и собственную базу данных
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                <div>
                  <strong>Оптимизация маршрута:</strong> Алгоритм определяет оптимальную последовательность посещения объектов
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                <div>
                  <strong>Построение путей:</strong> Создание реальных пешеходных маршрутов между точками с помощью OSRM
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                <div>
                  <strong>Генерация контента:</strong> ИИ создает описания маршрута и точек интереса
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">5</span>
                <div>
                  <strong>Сохранение:</strong> Готовый маршрут сохраняется в базе данных и становится доступен пользователям
                </div>
              </li>
            </ol>
          </div>

          {/* Технические детали */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ⚙️ Технические возможности
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>OpenStreetMap API для поиска зданий</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>OSRM для построения реальных маршрутов</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Алгоритм ближайшего соседа для оптимизации</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Интеграция с локальной базой зданий</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Автоматическое создание метаданных</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
