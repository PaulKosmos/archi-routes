// src/app/buildings/[id]/edit/page.tsx - Страница редактирования здания
'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import EditBuildingClient from './EditBuildingClient'
import EditPageWrapper from '@/components/EditPageWrapper'
import { Loader2 } from 'lucide-react'
import { getAllBuildings, checkBuildingExists, extractIdFromUrl } from '@/utils/building-debug'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditBuildingPage({ params }: PageProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()
  const [building, setBuilding] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Используем React.use() для получения параметров
  const resolvedParams = use(params)
  const buildingId = resolvedParams.id

  useEffect(() => {
    fetchBuilding()
  }, [buildingId])

  const fetchBuilding = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🏢 Fetching building with ID:', buildingId)

      if (!buildingId || buildingId.trim() === '') {
        console.error('🏢 Invalid building ID:', buildingId)
        setError('Неверный ID здания')
        return
      }

      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          *,
          profiles:created_by (
            id,
            role,
            email
          )
        `)
        .eq('id', buildingId)
        .single()

      console.log('🏢 Supabase response:', { building, error: buildingError })

      if (buildingError) {
        console.error('🏢 Building not found:', buildingError)

        // Полная диагностика
        const debugInfo = await getAllBuildings()
        const buildingCheck = await checkBuildingExists(buildingId)
        const urlId = extractIdFromUrl(window.location.href)

        setError(`Здание не найдено.
Параметр ID: ${buildingId}
Из URL: ${urlId}
Ошибка: ${buildingError.message || 'неизвестная'}
Всего зданий в БД: ${debugInfo.total}`)
        return
      }

      if (!building) {
        console.error('🏢 Building is null despite no error')
        setError('Здание не найдено (null result)')
        return
      }

      console.log('🏢 Building loaded for editing:', {
        id: building.id,
        name: building.name
      })

      setBuilding(building)

    } catch (err) {
      console.error('🏢 Error fetching building:', err)
      setError('Ошибка при загрузке здания')
    } finally {
      setLoading(false)
    }
  }

  // Пока загружаем здание
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка здания...</p>
        </div>
      </div>
    )
  }

  // Ошибка загрузки здания
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ошибка</h1>
          <div className="text-gray-600 mb-6 whitespace-pre-line text-left bg-gray-100 p-4 rounded-lg font-mono text-sm">
            {error}
          </div>
          <div className="space-x-4">
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Назад
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Обновить
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Отображаем форму редактирования с проверкой прав через EditPageWrapper
  if (building && user) {
    const isOwner = building.created_by === user.id
    const isAdmin = profile?.role === 'admin'
    const isModerator = profile?.role === 'moderator'

    return (
      <EditPageWrapper contentType="building" contentId={buildingId}>
        <EditBuildingClient
          building={building}
          currentUser={user}
          isOwner={isOwner}
          isAdmin={isAdmin}
          isModerator={isModerator}
        />
      </EditPageWrapper>
    )
  }

  return null
}
