// src/components/RoutePublicationRequest.tsx
// Компонент для подачи заявки на публикацию маршрута

'use client'

import { useState } from 'react'
import { Globe, FileText, Users, TrendingUp, Send, X } from 'lucide-react'
import { RoutePublicationSystem } from '@/lib/smart-route-filtering'
import { toast } from 'react-hot-toast'
// import { toast } from '@/lib/toast-fallback'
import type { Route } from '@/types/route'

interface RoutePublicationRequestProps {
  route: Route
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function RoutePublicationRequest({
  route,
  isOpen,
  onClose,
  onSuccess
}: RoutePublicationRequestProps) {
  const [requestType, setRequestType] = useState<'publish' | 'feature' | 'corporate'>('publish')
  const [justification, setJustification] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [estimatedPopularity, setEstimatedPopularity] = useState(25)
  const [businessInfo, setBusinessInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!justification.trim()) {
      toast.error('Укажите обоснование для публикации')
      return
    }

    if (!targetAudience.trim()) {
      toast.error('Укажите целевую аудиторию')
      return
    }

    setIsSubmitting(true)

    try {
      const businessInfoData = businessInfo.trim() ? {
        type: requestType,
        description: businessInfo,
        contact: 'user-provided'
      } : undefined

      const success = await RoutePublicationSystem.requestPublication(
        route.id,
        requestType,
        justification.trim(),
        businessInfoData
      )

      if (success) {
        toast.success('Заявка на публикацию отправлена на рассмотрение!')
        onSuccess?.()
        onClose()
      } else {
        toast.error('Ошибка при отправке заявки')
      }
    } catch (error) {
      console.error('Error submitting publication request:', error)
      toast.error('Произошла ошибка при отправке заявки')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Заявка на публикацию маршрута
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              "{route.title}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Тип заявки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Тип публикации
            </label>
            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="requestType"
                  value="publish"
                  checked={requestType === 'publish'}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Публичный маршрут</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Маршрут будет доступен всем пользователям платформы
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="requestType"
                  value="feature"
                  checked={requestType === 'feature'}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-gray-900">Рекомендуемый маршрут</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Маршрут может появиться на главной странице и в рекомендациях
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="requestType"
                  value="corporate"
                  checked={requestType === 'corporate'}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Корпоративный маршрут</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Маршрут от туристической компании или организации
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Обоснование */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Обоснование публикации *
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Почему этот маршрут будет интересен другим пользователям? Что в нем особенного?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Опишите уникальность маршрута, его образовательную или культурную ценность
            </p>
          </div>

          {/* Целевая аудитория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Целевая аудитория *
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Например: любители архитектуры, туристы, семьи с детьми"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Оценка популярности */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ожидаемая популярность
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="100"
                value={estimatedPopularity}
                onChange={(e) => setEstimatedPopularity(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-700 w-16">
                {estimatedPopularity}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Низкая</span>
              <span>Средняя</span>
              <span>Высокая</span>
            </div>
          </div>

          {/* Корпоративная информация */}
          {requestType === 'corporate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Информация об организации
              </label>
              <textarea
                value={businessInfo}
                onChange={(e) => setBusinessInfo(e.target.value)}
                placeholder="Название компании, контактная информация, лицензии..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Информация о маршруте */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Информация о маршруте</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Точек:</span>
                <span className="ml-2 font-medium">{route.points_count || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Город:</span>
                <span className="ml-2 font-medium">{route.city}</span>
              </div>
              <div>
                <span className="text-gray-600">Длительность:</span>
                <span className="ml-2 font-medium">{route.estimated_duration_minutes || 0} мин</span>
              </div>
              <div>
                <span className="text-gray-600">Расстояние:</span>
                <span className="ml-2 font-medium">{route.distance_km || 0} км</span>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={16} className="mr-2" />
              {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
