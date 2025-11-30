// src/components/DeleteContentModal.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import { Trash2, AlertTriangle, X } from 'lucide-react'

interface DeleteContentModalProps {
  contentType: 'building' | 'route'
  contentId: string
  contentTitle: string
  isOpen: boolean
  onClose: () => void
}

export default function DeleteContentModal({
  contentType,
  contentId,
  contentTitle,
  isOpen,
  onClose
}: DeleteContentModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [deletionSuccess, setDeletionSuccess] = useState(false)

  // Первое подтверждение
  const handleFirstConfirm = () => {
    setShowConfirmation(true)
  }

  // Второе подтверждение - реальное удаление
  const handleFinalDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      if (contentType === 'route') {
        // 1. Удаляем точки маршрута
        const { error: pointsError } = await supabase
          .from('route_points')
          .delete()
          .eq('route_id', contentId)

        if (pointsError) {
          throw new Error(`Ошибка удаления точек маршрута: ${pointsError.message}`)
        }

        // 2. Удаляем отзывы
        await supabase
          .from('route_reviews')
          .delete()
          .eq('route_id', contentId)

        // 3. Удаляем рейтинги
        await supabase
          .from('route_ratings')
          .delete()
          .eq('route_id', contentId)

        // 4. Удаляем из избранного
        await supabase
          .from('route_favorites')
          .delete()
          .eq('route_id', contentId)

        // 5. Удаляем завершения маршрута
        await supabase
          .from('route_completions')
          .delete()
          .eq('route_id', contentId)

        // 6. Удаляем сам маршрут
        const { error: routeError } = await supabase
          .from('routes')
          .delete()
          .eq('id', contentId)

        if (routeError) {
          throw new Error(`Ошибка удаления маршрута: ${routeError.message}`)
        }

      } else if (contentType === 'building') {
        // 1. Проверяем, используется ли здание в маршрутах
        const { data: routePoints, error: checkError } = await supabase
          .from('route_points')
          .select('route_id')
          .eq('building_id', contentId)

        if (checkError) {
          throw new Error(`Ошибка проверки связей: ${checkError.message}`)
        }

        if (routePoints && routePoints.length > 0) {
          // Получаем названия маршрутов
          const uniqueRouteIds = Array.from(new Set(routePoints.map(p => p.route_id)))
          
          const { data: routes, error: routesError } = await supabase
            .from('routes')
            .select('id, title')
            .in('id', uniqueRouteIds)

          if (routesError) {
            throw new Error(`Ошибка получения маршрутов: ${routesError.message}`)
          }

          const routeTitles = routes?.map(r => r.title).join(', ') || 'Неизвестные маршруты'
          
          throw new Error(
            `Невозможно удалить здание. Оно используется в маршрутах: ${routeTitles}. ` +
            'Сначала удалите здание из этих маршрутов.'
          )
        }

        // 2. Удаляем отзывы о здании
        await supabase
          .from('building_reviews')
          .delete()
          .eq('building_id', contentId)

        // 3. Удаляем здание из коллекций пользователей
        const { data: collections } = await supabase
          .from('user_collections')
          .select('id, building_ids')
          .contains('building_ids', [contentId])

        if (collections) {
          for (const collection of collections) {
            const updatedBuildingIds = collection.building_ids?.filter(
              (id: string) => id !== contentId
            ) || []
            
            await supabase
              .from('user_collections')
              .update({ building_ids: updatedBuildingIds })
              .eq('id', collection.id)
          }
        }

        // 4. Удаляем само здание
        const { error: buildingError } = await supabase
          .from('buildings')
          .delete()
          .eq('id', contentId)

        if (buildingError) {
          throw new Error(`Ошибка удаления здания: ${buildingError.message}`)
        }

        // 5. Удаляем изображения из Storage
        try {
          const { data: files } = await supabase.storage
            .from('building-images')
            .list('', {
              search: `building_${contentId}`
            })

          if (files && files.length > 0) {
            const filePaths = files.map(file => file.name)
            await supabase.storage
              .from('building-images')
              .remove(filePaths)
          }
        } catch (storageError) {
          // Игнорируем ошибки storage - не критично
        }
      }

      setDeletionSuccess(true)
      
    } catch (error: any) {
      setError(error.message || 'Произошла ошибка при удалении')
    } finally {
      setIsDeleting(false)
    }
  }

  // Сброс состояния при закрытии
  const handleClose = () => {
    if (deletionSuccess) {
      // Успешное удаление - редиректим
      window.location.href = '/'
    } else {
      setShowConfirmation(false)
      setError(null)
      onClose()
    }
  }

  // Ручной редирект после успешного удаления
  const handleManualRedirect = () => {
    window.location.href = '/'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {!showConfirmation && !deletionSuccess ? (
          // Первое окно - начальное подтверждение
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Удалить {contentType === 'building' ? 'здание' : 'маршрут'}?
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Вы действительно хотите удалить {contentType === 'building' ? 'здание' : 'маршрут'}:
              </p>
              
              <div className="bg-gray-50 border rounded-lg p-3">
                <p className="font-medium text-gray-900">{contentTitle}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {contentType === 'building' ? 'Здание' : 'Маршрут'}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleFirstConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
              >
                <Trash2 size={16} />
                <span>Удалить</span>
              </button>
            </div>
          </>
        ) : deletionSuccess ? (
          // Окно успешного удаления
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-900">
                  Успешно удалено!
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-green-700">
                {contentType === 'building' ? 'Здание' : 'Маршрут'} "{contentTitle}" было успешно удалено.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleManualRedirect}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Перейти на главную
              </button>
            </div>
          </>
        ) : (
          // Второе окно - финальное подтверждение
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Подтвердите удаление
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeleting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-red-900 text-sm">
                    <p className="font-medium mb-2">Внимание! Это действие нельзя отменить!</p>
                    <p className="mb-2">Будет удалено:</p>
                    <ul className="text-xs space-y-1">
                      {contentType === 'building' ? (
                        <>
                          <li>• Здание из базы данных</li>
                          <li>• Все фотографии здания</li>
                          <li>• Отзывы и рейтинги</li>
                          <li>• Удаление из коллекций пользователей</li>
                        </>
                      ) : (
                        <>
                          <li>• Маршрут и все его точки</li>
                          <li>• Отзывы и рейтинги маршрута</li>
                          <li>• История прохождений</li>
                          <li>• Удаление из избранного всех пользователей</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 font-medium">
                Вы точно уверены, что хотите удалить "{contentTitle}"?
              </p>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Назад
              </button>
              <button
                onClick={handleFinalDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Удаление...' : 'Да, удалить навсегда'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}