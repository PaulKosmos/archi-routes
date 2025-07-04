// src/app/buildings/[id]/BuildingDetailClient.tsx
'use client'

import dynamic from 'next/dynamic'

// Динамический импорт карты
const LeafletMap = dynamic(() => import('../../../components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
    <span className="text-gray-500">Загрузка карты...</span>
  </div>
})

interface BuildingDetailClientProps {
  building: any
}

export default function BuildingDetailClient({ building }: BuildingDetailClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero секция с изображением */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
        {building.image_url ? (
          <div className="h-96 bg-gray-200">
            <img
              src={building.image_url}
              alt={building.name}
              className="w-full h-96 object-cover"
            />
          </div>
        ) : (
          <div className="h-96 bg-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-5a1 1 0 011-1h4a1 1 0 011 1v5M7 7h10M7 10h10M7 13h10" />
              </svg>
              <p>Изображение отсутствует</p>
            </div>
          </div>
        )}
        
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {building.name}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Архитектор: <span className="font-medium">{building.architect}</span>
              </p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                {building.year_built && (
                  <span>📅 {building.year_built} год</span>
                )}
                <span>🏛️ {building.architectural_style}</span>
                {building.rating && building.rating > 0 && (
                  <span>⭐ {building.rating}/5</span>
                )}
              </div>
            </div>

            {/* Метаданные */}
            <div className="text-right text-sm text-gray-500">
              <p>Добавлено: {new Date(building.created_at).toLocaleDateString('ru-RU')}</p>
              {building.profiles && (
                <p>Автор: {building.profiles.full_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-8">
          {/* Описание */}
          {building.description && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Описание
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {building.description}
              </p>
            </div>
          )}

          {/* Карта */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Местоположение
            </h2>
            {building.address && (
              <p className="text-gray-600 mb-4">
                📍 {building.address}
              </p>
            )}
            
            {building.latitude && building.longitude ? (
              <LeafletMap buildings={[building]} />
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Местоположение не указано</p>
              </div>
            )}
          </div>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Технические характеристики */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Характеристики
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Архитектор</dt>
                <dd className="text-sm text-gray-900">{building.architect}</dd>
              </div>
              
              {building.year_built && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Год постройки</dt>
                  <dd className="text-sm text-gray-900">{building.year_built}</dd>
                </div>
              )}
              
              {building.architectural_style && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Архитектурный стиль</dt>
                  <dd className="text-sm text-gray-900">{building.architectural_style}</dd>
                </div>
              )}
              
              {building.city && building.country && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Местоположение</dt>
                  <dd className="text-sm text-gray-900">{building.city}, {building.country}</dd>
                </div>
              )}
              
              {building.rating && building.rating > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Рейтинг</dt>
                  <dd className="text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="ml-1">{building.rating}/5</span>
                      {building.review_count && building.review_count > 0 && (
                        <span className="text-gray-500 ml-2">({building.review_count} отзывов)</span>
                      )}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Действия */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Действия
            </h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                🗺️ Добавить в маршрут
              </button>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                ❤️ Добавить в избранное
              </button>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                📤 Поделиться
              </button>
            </div>
          </div>

          {/* Похожие объекты */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Похожие объекты
            </h3>
            <p className="text-sm text-gray-500">
              Функционал будет добавлен позже
            </p>
          </div>
        </div>
      </div>

      {/* Кнопка возврата */}
      <div className="mt-8">
        <a
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          ← Вернуться к списку объектов
        </a>
      </div>
    </main>
  )
}