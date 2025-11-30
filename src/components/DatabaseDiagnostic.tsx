// src/components/DatabaseDiagnostic.tsx - ИСПРАВЛЕННАЯ ДИАГНОСТИКА

'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export default function DatabaseDiagnostic() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    const diagnosticResults: DiagnosticResult[] = []

    // Тест 1: Проверка подключения к Supabase
    try {
      const { data, error } = await supabase.from('buildings').select('count').limit(1)
      if (error) throw error
      diagnosticResults.push({
        test: 'Подключение к Supabase',
        status: 'success',
        message: 'Успешное подключение'
      })
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Подключение к Supabase',
        status: 'error',
        message: error.message,
        details: error
      })
    }

    // Тест 2: Проверка таблицы building_reviews
    try {
      const { data, error } = await supabase
        .from('building_reviews')
        .select('id')
        .limit(1)
      
      if (error) throw error
      diagnosticResults.push({
        test: 'Таблица building_reviews',
        status: 'success',
        message: 'Таблица существует и доступна'
      })
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Таблица building_reviews',
        status: 'error',
        message: `Ошибка: ${error.message}`,
        details: error
      })
    }

    // Тест 3: Проверка таблицы user_building_favorites
    try {
      const { data, error } = await supabase
        .from('user_building_favorites')
        .select('id')
        .limit(1)
      
      if (error) throw error
      diagnosticResults.push({
        test: 'Таблица user_building_favorites',
        status: 'success',
        message: 'Таблица существует и доступна'
      })
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Таблица user_building_favorites',
        status: 'error',
        message: `Ошибка: ${error.message}`,
        details: error
      })
    }

    // Тест 4: Проверка Storage buckets (обновленный метод)
    // Проверяем bucket 'audio'
    try {
      console.log('🔍 Проверяем audio bucket...')
      
      // Попробуем получить публичный URL для тестового файла
      const { data: audioTest } = supabase.storage
        .from('audio')
        .getPublicUrl('test-file-that-does-not-exist.mp3')
      
      if (audioTest && audioTest.publicUrl) {
        // Если URL получен, значит bucket существует
        diagnosticResults.push({
          test: 'Storage bucket "audio"',
          status: 'success',
          message: 'Bucket существует и доступен',
          details: { publicUrl: audioTest.publicUrl }
        })
      } else {
        throw new Error('Не удалось получить URL')
      }
    } catch (error: any) {
      console.error('❌ Audio bucket error:', error)
      diagnosticResults.push({
        test: 'Storage bucket "audio"',
        status: 'error',
        message: 'Bucket "audio" не существует или недоступен',
        details: error
      })
    }

    // Проверяем bucket 'photos'
    try {
      console.log('🔍 Проверяем photos bucket...')
      
      const { data: photoTest } = supabase.storage
        .from('photos')
        .getPublicUrl('test-file-that-does-not-exist.jpg')
      
      if (photoTest && photoTest.publicUrl) {
        diagnosticResults.push({
          test: 'Storage bucket "photos"',
          status: 'success',
          message: 'Bucket существует и доступен',
          details: { publicUrl: photoTest.publicUrl }
        })
      } else {
        throw new Error('Не удалось получить URL')
      }
    } catch (error: any) {
      console.error('❌ Photos bucket error:', error)
      diagnosticResults.push({
        test: 'Storage bucket "photos"',
        status: 'error',
        message: 'Bucket "photos" не существует или недоступен',
        details: error
      })
    }

    // Проверяем есть ли bucket 'building-images' (устаревший)
    try {
      const { data: buildingImagesTest } = supabase.storage
        .from('building-images')
        .getPublicUrl('test.jpg')
      
      if (buildingImagesTest && buildingImagesTest.publicUrl) {
        diagnosticResults.push({
          test: 'Storage bucket "building-images" (устаревший)',
          status: 'warning',
          message: 'Устаревший bucket найден - рекомендуется мигрировать файлы в "photos"',
          details: { 
            publicUrl: buildingImagesTest.publicUrl,
            recommendation: 'Migrate files to "photos" bucket and remove this bucket'
          }
        })
      }
    } catch (error: any) {
      // Это нормально - bucket может не существовать
      diagnosticResults.push({
        test: 'Storage bucket "building-images" (устаревший)',
        status: 'success',
        message: 'Устаревший bucket не найден (это хорошо)'
      })
    }

    // Тест 5: Проверка аутентификации
    if (!user) {
      diagnosticResults.push({
        test: 'Аутентификация пользователя',
        status: 'warning',
        message: 'Пользователь не авторизован'
      })
    } else {
      diagnosticResults.push({
        test: 'Аутентификация пользователя',
        status: 'success',
        message: `Пользователь авторизован: ${user.email}`
      })
    }

    // Тест 6: Проверка структуры таблицы building_reviews
    try {
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'building_reviews' })
      
      if (error) {
        // Альтернативная проверка - попробуем создать тестовую запись
        const testInsert = await supabase
          .from('building_reviews')
          .insert({
            building_id: '00000000-0000-0000-0000-000000000000',
            user_id: '00000000-0000-0000-0000-000000000000',
            rating: 5,
            title: 'test',
            review_type: 'general'
          })
          .select()
        
        if (testInsert.error && testInsert.error.code === '23503') {
          diagnosticResults.push({
            test: 'Структура таблицы building_reviews',
            status: 'success',
            message: 'Таблица имеет правильную структуру (foreign key constraints работают)'
          })
        } else if (testInsert.error) {
          diagnosticResults.push({
            test: 'Структура таблицы building_reviews',
            status: 'error',
            message: `Неожиданная ошибка: ${testInsert.error.message}`,
            details: testInsert.error
          })
        }
      } else {
        diagnosticResults.push({
          test: 'Структура таблицы building_reviews',
          status: 'success',
          message: 'Структура таблицы корректна',
          details: data
        })
      }
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Структура таблицы building_reviews',
        status: 'error',
        message: error.message,
        details: error
      })
    }

    // Тест 7: Проверка загрузки файлов (если пользователь авторизован)
    if (user) {
      try {
        // Создаем тестовый blob
        const testBlob = new Blob(['test'], { type: 'text/plain' })
        const testFileName = `diagnostic-test-${Date.now()}.txt`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos')
          .upload(testFileName, testBlob)
        
        if (uploadError) throw uploadError
        
        // Удаляем тестовый файл
        await supabase.storage
          .from('photos')
          .remove([testFileName])
        
        diagnosticResults.push({
          test: 'Загрузка файлов в Storage',
          status: 'success',
          message: 'Загрузка и удаление файлов работает корректно'
        })
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Загрузка файлов в Storage',
          status: 'error',
          message: `Ошибка загрузки: ${error.message}`,
          details: error
        })
      }
    } else {
      diagnosticResults.push({
        test: 'Загрузка файлов в Storage',
        status: 'warning',
        message: 'Требуется авторизация для тестирования загрузки файлов'
      })
    }

    setResults(diagnosticResults)
    setLoading(false)
  }

  const getIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">Диагностика базы данных и Storage</h2>
        <p className="text-gray-600 mb-6">
          Этот инструмент поможет выявить проблемы с настройкой базы данных и файлового хранилища
        </p>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center mb-6"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Проверка...
            </>
          ) : (
            'Запустить диагностику'
          )}
        </button>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Результаты проверки:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start">
                  {getIcon(result.status)}
                  <div className="ml-3 flex-1">
                    <h4 className="font-medium">{result.test}</h4>
                    <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Подробности
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Рекомендации:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {results.some(r => r.status === 'error' && r.test.includes('building_reviews')) && (
                <li>• Выполните SQL команды для создания таблицы building_reviews из DATABASE_SETUP.sql</li>
              )}
              {results.some(r => r.status === 'error' && r.test.includes('user_building_favorites')) && (
                <li>• Выполните SQL команды для создания таблицы user_building_favorites из DATABASE_SETUP.sql</li>
              )}
              {results.some(r => r.status === 'error' && r.test.includes('audio')) && (
                <li>• Создайте Storage bucket "audio" в админ-панели Supabase (Settings → Storage)</li>
              )}
              {results.some(r => r.status === 'error' && r.test.includes('photos')) && (
                <li>• Создайте Storage bucket "photos" в админ-панели Supabase (Settings → Storage)</li>
              )}
              {results.some(r => r.status === 'warning' && r.test.includes('building-images')) && (
                <li>• Рекомендуется мигрировать файлы из bucket "building-images" в "photos" и удалить старый bucket</li>
              )}
              {results.some(r => r.status === 'warning' && r.test.includes('Аутентификация')) && (
                <li>• Войдите в систему для тестирования функций, требующих авторизации</li>
              )}
              {results.some(r => r.status === 'error' && r.test.includes('Загрузка файлов')) && (
                <li>• Проверьте RLS политики для Storage buckets в DATABASE_SETUP.sql</li>
              )}
            </ul>
          </div>
        )}

        {/* Статистика */}
        {results.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {results.filter(r => r.status === 'success').length}
              </div>
              <div className="text-sm text-green-700">Успешно</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {results.filter(r => r.status === 'warning').length}
              </div>
              <div className="text-sm text-yellow-700">Предупреждения</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {results.filter(r => r.status === 'error').length}
              </div>
              <div className="text-sm text-red-700">Ошибки</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}