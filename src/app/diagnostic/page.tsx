'use client'

export const dynamic = 'force-dynamic'

// src/app/diagnostic/page.tsx - Диагностическая страница


import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { fixImageUrls, checkImageUrls, ImageUrlReport } from '@/utils/fix-image-urls'
import { setupAdminUser, checkUserStatus, getAdminUsers, AdminSetupResult } from '@/utils/admin-setup'

interface DiagnosticData {
  buildings: any[]
  storageUrls: string[]
  tablesStatus: any[]
  imageUrlReport?: {
    total: number
    with_issues: number
    buildings_with_issues: any[]
  }
}

interface FixReport {
  status: 'idle' | 'running' | 'completed' | 'error'
  reports: ImageUrlReport[]
  error?: string
}

interface AdminReport {
  status: 'idle' | 'running' | 'completed' | 'error'
  result?: AdminSetupResult
  adminUsers?: any[]
  error?: string
}

export default function DiagnosticPage() {
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fixReport, setFixReport] = useState<FixReport>({ status: 'idle', reports: [] })
  const [adminReport, setAdminReport] = useState<AdminReport>({ status: 'idle' })

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    try {
      setLoading(true)
      console.log('🔍 Starting diagnostics...')

      // 1. Проверяем здания
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, image_url, image_urls')
        .limit(3)

      if (buildingsError) {
        console.error('Buildings error:', buildingsError)
      }

      // 2. Проверяем статус таблиц
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_list')
        .then(() => null) // RPC может не работать, используем прямую проверку
        .catch(() => null)

      // Проверяем каждую таблицу отдельно
      const tablesStatus = []
      
      // Проверяем buildings
      const { data: buildingsTest } = await supabase.from('buildings').select('id').limit(1)
      tablesStatus.push({ name: 'buildings', exists: !!buildingsTest })
      
      // Проверяем building_reviews
      const { data: reviewsTest } = await supabase.from('building_reviews').select('id').limit(1)
      tablesStatus.push({ name: 'building_reviews', exists: !!reviewsTest })
      
      // Проверяем user_building_favorites
      const { data: favoritesTest } = await supabase.from('user_building_favorites').select('id').limit(1)
      tablesStatus.push({ name: 'user_building_favorites', exists: !!favoritesTest })
      
      // Проверяем profiles
      const { data: profilesTest } = await supabase.from('profiles').select('id').limit(1)
      tablesStatus.push({ name: 'profiles', exists: !!profilesTest })
      
      // Проверяем routes
      try {
        const { data: routesTest, error: routesError } = await supabase.from('routes').select('id').limit(1)
        tablesStatus.push({ name: 'routes', exists: !routesError, error: routesError?.message })
      } catch (error) {
        tablesStatus.push({ name: 'routes', exists: false, error: 'Exception occurred' })
      }
      
      // Проверяем route_points
      try {
        const { data: routePointsTest, error: routePointsError } = await supabase.from('route_points').select('id').limit(1)
        tablesStatus.push({ name: 'route_points', exists: !routePointsError, error: routePointsError?.message })
      } catch (error) {
        tablesStatus.push({ name: 'route_points', exists: false, error: 'Exception occurred' })
      }

      // 3. Проверяем состояние URL изображений
      const imageUrlReport = await checkImageUrls()
      console.log('🔍 Image URL report:', imageUrlReport)

      // 4. Тестируем getStorageUrl
      const testPaths = [
        'buildings/main/test.jpg',
        '',
        null,
        'https://example.com/image.jpg',
        'reviews/user-123/audio.mp3'
      ]

      const storageUrls = testPaths.map(path => {
        try {
          return getStorageUrl(path as any, 'photos')
        } catch (error) {
          return `ERROR: ${error}`
        }
      })

      console.log('🔍 Diagnostic results:', {
        buildings: buildings || [],
        storageUrls,
        tablesStatus,
        imageUrlReport
      })

      setData({
        buildings: buildings || [],
        storageUrls,
        tablesStatus,
        imageUrlReport
      })
    } catch (error) {
      console.error('🔍 Diagnostic error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupAdmin = async () => {
    setAdminReport({ status: 'running' })
    
    try {
      console.log('🔧 Setting up admin user...')
      const result = await setupAdminUser('paul.kosenkov@gmail.com')
      const adminUsers = await getAdminUsers()
      
      setAdminReport({
        status: 'completed',
        result,
        adminUsers
      })
      
    } catch (error) {
      console.error('🔧 Error setting up admin:', error)
      setAdminReport({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handleFixImageUrls = async () => {
    setFixReport({ status: 'running', reports: [] })
    
    try {
      console.log('🔧 Starting image URL fix...')
      const reports = await fixImageUrls()
      
      setFixReport({
        status: 'completed',
        reports
      })
      
      // Перезапускаем диагностику чтобы увидеть обновленные данные
      await runDiagnostics()
      
    } catch (error) {
      console.error('🔧 Error fixing image URLs:', error)
      setFixReport({
        status: 'error',
        reports: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Запуск диагностики...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 Диагностика системы</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Настройка администратора */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔑 Настройка администратора</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Цель:</strong> Назначить paul.kosenkov@gmail.com администратором системы
                  <br />
                  Это позволит видеть кнопку редактирования на всех зданиях.
                </div>
              </div>
              
              <button
                onClick={handleSetupAdmin}
                disabled={adminReport.status === 'running'}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  adminReport.status === 'running'
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {adminReport.status === 'running' ? '⏳ Настройка...' : '🔑 Настроить админа'}
              </button>
              
              {/* Отчет о настройке */}
              {adminReport.status === 'completed' && adminReport.result && (
                <div className={`p-4 rounded-lg border ${
                  adminReport.result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`font-medium mb-2 ${
                    adminReport.result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {adminReport.result.success ? '✅ Успешно' : '❌ Ошибка'}
                  </h3>
                  <div className={`text-sm ${
                    adminReport.result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {adminReport.result.message}
                  </div>
                  
                  {adminReport.result.userProfile && (
                    <div className="mt-3 text-xs bg-white/50 rounded p-2">
                      <strong>Профиль:</strong>
                      <br />ID: {adminReport.result.userProfile.id}
                      <br />Email: {adminReport.result.userProfile.email}
                      <br />Role: {adminReport.result.userProfile.role || adminReport.result.userProfile.user_role}
                    </div>
                  )}
                </div>
              )}
              
              {adminReport.status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-2">❌ Ошибка</h3>
                  <div className="text-sm text-red-700">
                    {adminReport.error}
                  </div>
                </div>
              )}
              
              {/* Список админов */}
              {adminReport.adminUsers && adminReport.adminUsers.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">👥 Администраторы системы</h3>
                  <div className="space-y-2">
                    {adminReport.adminUsers.map((admin, index) => (
                      <div key={index} className="text-sm bg-white rounded p-2">
                        <strong>{admin.email}</strong>
                        <br />
                        Роль: {admin.role || admin.user_role}
                        {admin.display_name && <><br />Имя: {admin.display_name}</>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Исправление URL изображений */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔧 Исправление изображений</h2>
            
            {data?.imageUrlReport && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Общая статистика:</strong>
                  <br />
                  Всего зданий: {data.imageUrlReport.total}
                  <br />
                  С проблемами URL: {data.imageUrlReport.with_issues}
                </div>
              </div>
            )}
            
            {data?.imageUrlReport && data.imageUrlReport.with_issues > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">⚠️ Обнаружены проблемы</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.imageUrlReport.buildings_with_issues.map((building, index) => (
                      <div key={index} className="text-sm">
                        <strong>{building.name}</strong>
                        <div className="ml-4 text-yellow-700">
                          {building.issues.map((issue: string, i: number) => (
                            <div key={i}>• {issue}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleFixImageUrls}
                  disabled={fixReport.status === 'running'}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    fixReport.status === 'running'
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {fixReport.status === 'running' ? '🔄 Исправление...' : '🔧 Исправить URL изображений'}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-800">
                  <strong>✅ Все в порядке!</strong>
                  <br />
                  URL изображений не требуют исправления.
                </div>
              </div>
            )}
            
            {/* Отчет об исправлении */}
            {fixReport.status === 'completed' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">✅ Исправление завершено</h3>
                <div className="text-sm text-green-700 space-y-1">
                  {fixReport.reports.map((report, index) => (
                    <div key={index}>
                      <strong>{report.building_name}:</strong> {report.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {fixReport.status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">❌ Ошибка исправления</h3>
                <div className="text-sm text-red-700">
                  {fixReport.error}
                </div>
              </div>
            )}
          </div>
          
          {/* Здания */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🏢 Здания</h2>
            <div className="space-y-4">
              {data?.buildings?.map((building) => (
                <div key={building.id} className="border rounded p-4">
                  <h3 className="font-medium">{building.name}</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div>
                      <strong>Original image_url:</strong> {building.image_url || 'null'}
                    </div>
                    <div>
                      <strong>image_urls array:</strong> {JSON.stringify(building.image_urls)}
                    </div>
                    {building.image_url && (
                      <div>
                        <strong>Generated URL:</strong> 
                        <br />
                        <span className="break-all text-blue-600">
                          {getStorageUrl(building.image_url, 'photos')}
                        </span>
                      </div>
                    )}
                    {building.image_url && (
                      <div className="mt-2">
                        <strong>Test image:</strong>
                        <br />
                        <img 
                          src={getStorageUrl(building.image_url, 'photos')} 
                          alt="Test"
                          className="w-32 h-24 object-cover border rounded mt-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.border = '2px solid red'
                            target.alt = 'FAILED TO LOAD'
                          }}
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.border = '2px solid green'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Статус таблиц */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Статус таблиц БД</h2>
            <div className="space-y-3">
              {data?.tablesStatus?.map((table) => (
                <div key={table.name} className={`flex items-center justify-between p-3 rounded ${
                  table.exists ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div>
                    <span className="font-medium">{table.name}</span>
                    {table.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {table.error}
                      </div>
                    )}
                  </div>
                  <span className={`font-semibold ${
                    table.exists ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {table.exists ? '✅ Существует' : '❌ Не найдена'}
                  </span>
                </div>
              ))}
              {data?.tablesStatus?.every(t => t.exists) && (
                <div className="text-sm text-green-600 mt-4 p-3 bg-green-50 rounded">
                  <strong>✅ Отлично!</strong> Все основные таблицы доступны.
                </div>
              )}
            </div>
          </div>

          {/* Storage URL тесты */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">🔗 Storage URL тесты</h2>
            <div className="space-y-3">
              {data?.storageUrls?.map((url, index) => (
                <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded">
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                    Test {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="break-all text-sm">
                      {typeof url === 'string' && url.startsWith('ERROR') ? (
                        <span className="text-red-600">{url}</span>
                      ) : (
                        <span className="text-green-600">{url}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Кнопка повторной диагностики */}
        <div className="mt-8 text-center">
          <button
            onClick={runDiagnostics}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Запустить диагностику заново
          </button>
        </div>
      </div>
    </div>
  )
}
