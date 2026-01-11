'use client'

import { useState, useEffect } from 'react'
import {
  Route,
  MapPin,
  Clock,
  Navigation,
  Shuffle,
  TrendingUp,
  Star,
  Building2,
  ArrowRight,
  Download,
  Share2,
  Eye
} from 'lucide-react'
import RoutePreview from './RoutePreview'

interface RouteGeneratorProps {
  buildings: any[]
  onRouteGenerated?: (route: any) => void
  className?: string
}

interface GeneratedRoute {
  id: string
  title: string
  description: string
  buildings: any[]
  totalDistance: number
  estimatedTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  routeType: 'optimal' | 'chronological' | 'rating' | 'custom'
}

export default function RouteGenerator({
  buildings,
  onRouteGenerated,
  className = ''
}: RouteGeneratorProps) {
  const [generatedRoutes, setGeneratedRoutes] = useState<GeneratedRoute[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedRouteType, setSelectedRouteType] = useState<'optimal' | 'chronological' | 'rating' | 'custom'>('optimal')
  const [previewRoute, setPreviewRoute] = useState<GeneratedRoute | null>(null)

  // Фильтруем здания с координатами
  const validBuildings = buildings.filter(b =>
    b.building &&
    b.building.latitude &&
    b.building.longitude
  )

  useEffect(() => {
    if (validBuildings.length >= 2) {
      generateRoutes()
    }
  }, [validBuildings, selectedRouteType])

  const generateRoutes = async () => {
    if (validBuildings.length < 2) return

    setIsGenerating(true)
    try {
      const routes: GeneratedRoute[] = []

      // 1. Оптимальный маршрут (кратчайший путь)
      if (selectedRouteType === 'optimal' || selectedRouteType === 'custom') {
        const optimalRoute = await generateOptimalRoute(validBuildings)
        routes.push(optimalRoute)
      }

      // 2. Хронологический маршрут (по годам постройки)
      if (selectedRouteType === 'chronological' || selectedRouteType === 'custom') {
        const chronoRoute = generateChronologicalRoute(validBuildings)
        routes.push(chronoRoute)
      }

      // 3. Маршрут по рейтингу (от лучших к средним)
      if (selectedRouteType === 'rating' || selectedRouteType === 'custom') {
        const ratingRoute = generateRatingRoute(validBuildings)
        routes.push(ratingRoute)
      }

      setGeneratedRoutes(routes)
    } catch (error) {
      console.error('Error generating routes:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateOptimalRoute = async (buildings: any[]): Promise<GeneratedRoute> => {
    // Вычисляем расстояния между всеми парами зданий
    const distances = calculateDistanceMatrix(buildings)

    // Решаем задачу коммивояжера (упрощенный алгоритм)
    const optimizedOrder = solveTSP(buildings, distances)

    const totalDistance = calculateTotalDistance(optimizedOrder, distances)
    const estimatedTime = calculateEstimatedTime(totalDistance, optimizedOrder.length)

    return {
      id: 'optimal',
      title: '🎯 Optimal Route',
      description: 'Кратчайший путь для посещения всех зданий из статьи',
      buildings: optimizedOrder,
      totalDistance,
      estimatedTime,
      difficulty: getDifficulty(totalDistance, optimizedOrder.length),
      routeType: 'optimal'
    }
  }

  const generateChronologicalRoute = (buildings: any[]): GeneratedRoute => {
    const sortedBuildings = [...buildings].sort((a, b) => {
      const yearA = a.building.year_built || 0
      const yearB = b.building.year_built || 0
      return yearA - yearB
    })

    const distances = calculateDistanceMatrix(sortedBuildings)
    const totalDistance = calculateTotalDistance(sortedBuildings, distances)
    const estimatedTime = calculateEstimatedTime(totalDistance, sortedBuildings.length)

    return {
      id: 'chronological',
      title: '📅 Chronological Route',
      description: 'Путешествие через время: от старейших зданий к самым современным',
      buildings: sortedBuildings,
      totalDistance,
      estimatedTime,
      difficulty: getDifficulty(totalDistance, sortedBuildings.length),
      routeType: 'chronological'
    }
  }

  const generateRatingRoute = (buildings: any[]): GeneratedRoute => {
    const sortedBuildings = [...buildings].sort((a, b) => {
      const ratingA = a.building.rating || 0
      const ratingB = b.building.rating || 0
      return ratingB - ratingA // От лучших к худшим
    })

    const distances = calculateDistanceMatrix(sortedBuildings)
    const totalDistance = calculateTotalDistance(sortedBuildings, distances)
    const estimatedTime = calculateEstimatedTime(totalDistance, sortedBuildings.length)

    return {
      id: 'rating',
      title: '⭐ Route by Rating',
      description: 'Начинаем с самых популярных и высоко оцененных зданий',
      buildings: sortedBuildings,
      totalDistance,
      estimatedTime,
      difficulty: getDifficulty(totalDistance, sortedBuildings.length),
      routeType: 'rating'
    }
  }

  // Вычисление расстояний между зданиями (упрощенная формула)
  const calculateDistanceMatrix = (buildings: any[]) => {
    const matrix: number[][] = []

    for (let i = 0; i < buildings.length; i++) {
      matrix[i] = []
      for (let j = 0; j < buildings.length; j++) {
        if (i === j) {
          matrix[i][j] = 0
        } else {
          const lat1 = parseFloat(buildings[i].building.latitude)
          const lon1 = parseFloat(buildings[i].building.longitude)
          const lat2 = parseFloat(buildings[j].building.latitude)
          const lon2 = parseFloat(buildings[j].building.longitude)

          matrix[i][j] = haversineDistance(lat1, lon1, lat2, lon2)
        }
      }
    }

    return matrix
  }

  // Формула гаверсинуса для расчета расстояния между двумя точками
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Радиус Земли в километрах
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Упрощенное решение задачи коммивояжера (жадный алгоритм)
  const solveTSP = (buildings: any[], distances: number[][]): any[] => {
    if (buildings.length <= 2) return buildings

    const visited = new Set<number>()
    const route: any[] = []
    let currentIndex = 0 // Начинаем с первого здания

    route.push(buildings[currentIndex])
    visited.add(currentIndex)

    while (visited.size < buildings.length) {
      let nearestIndex = -1
      let nearestDistance = Infinity

      for (let i = 0; i < buildings.length; i++) {
        if (!visited.has(i) && distances[currentIndex][i] < nearestDistance) {
          nearestDistance = distances[currentIndex][i]
          nearestIndex = i
        }
      }

      if (nearestIndex !== -1) {
        route.push(buildings[nearestIndex])
        visited.add(nearestIndex)
        currentIndex = nearestIndex
      }
    }

    return route
  }

  const calculateTotalDistance = (route: any[], distances: number[][]): number => {
    let total = 0
    for (let i = 0; i < route.length - 1; i++) {
      const fromIndex = validBuildings.findIndex(b => b.building.id === route[i].building.id)
      const toIndex = validBuildings.findIndex(b => b.building.id === route[i + 1].building.id)
      if (fromIndex !== -1 && toIndex !== -1) {
        total += distances[fromIndex][toIndex]
      }
    }
    return Math.round(total * 100) / 100 // Округляем до 2 знаков
  }

  const calculateEstimatedTime = (distance: number, buildingCount: number): number => {
    // Примерный расчет: 20 мин на здание + время на перемещение (4 км/ч пешком)
    const walkingTime = (distance / 4) * 60 // минуты
    const visitTime = buildingCount * 20 // 20 минут на здание
    return Math.round(walkingTime + visitTime)
  }

  const getDifficulty = (distance: number, buildingCount: number): 'easy' | 'medium' | 'hard' => {
    if (distance < 2 && buildingCount <= 3) return 'easy'
    if (distance < 5 && buildingCount <= 5) return 'medium'
    return 'hard'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легкий'
      case 'medium': return 'Средний'
      case 'hard': return 'Сложный'
      default: return 'Неизвестно'
    }
  }

  const handleRouteSelect = (route: GeneratedRoute) => {
    onRouteGenerated?.(route)
  }

  const handleRoutePreview = (route: GeneratedRoute) => {
    setPreviewRoute(route)
  }

  const handleClosePreview = () => {
    setPreviewRoute(null)
  }

  const handleExportRoute = (route: GeneratedRoute) => {
    // TODO: Реализовать экспорт маршрута
    alert(`Экспорт маршрута "${route.title}" будет реализован позже`)
  }

  const handleShareRoute = (route: GeneratedRoute) => {
    // TODO: Реализовать шаринг маршрута
    alert(`Поделиться маршрутом "${route.title}" - функция в разработке`)
  }

  if (validBuildings.length < 2) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <Route className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Генерация маршрутов недоступна</p>
        <p className="text-sm text-gray-500">Нужно минимум 2 здания с координатами</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Route className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Автоматические маршруты</h3>
              <p className="text-sm text-gray-600">
                {validBuildings.length} зданий • Различные способы обхода
              </p>
            </div>
          </div>

          {/* Переключатель типов маршрутов */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedRouteType('optimal')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${selectedRouteType === 'optimal'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              Оптимальный
            </button>
            <button
              onClick={() => setSelectedRouteType('chronological')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${selectedRouteType === 'chronological'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              По времени
            </button>
            <button
              onClick={() => setSelectedRouteType('rating')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${selectedRouteType === 'rating'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              По рейтингу
            </button>
          </div>
        </div>
      </div>

      {/* Список сгенерированных маршрутов */}
      <div className="p-4">
        {isGenerating ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Генерируем оптимальные маршруты...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedRoutes.map((route) => (
              <div
                key={route.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                {/* Заголовок маршрута */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {route.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {route.description}
                    </p>

                    {/* Метрики маршрута */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{route.totalDistance} км</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{Math.floor(route.estimatedTime / 60)}ч {route.estimatedTime % 60}м</span>
                      </div>
                      <div className="flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        <span>{route.buildings.length} зданий</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(route.difficulty)}`}>
                        {getDifficultyLabel(route.difficulty)}
                      </span>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleRoutePreview(route)}
                      className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleShareRoute(route)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExportRoute(route)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Превью маршрута */}
                <div className="flex items-center space-x-2 mb-3 overflow-x-auto">
                  {route.buildings.map((buildingData, index) => {
                    const building = buildingData.building
                    return (
                      <div key={building.id} className="flex items-center space-x-2 flex-shrink-0">
                        <div className="flex items-center space-x-1 bg-gray-50 rounded-lg px-2 py-1">
                          <div className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-xs font-medium text-gray-700 max-w-20 truncate">
                            {building.name}
                          </span>
                        </div>
                        {index < route.buildings.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Кнопка выбора маршрута */}
                <button
                  onClick={() => handleRouteSelect(route)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Выбрать этот маршрут
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Navigation className="w-4 h-4" />
          <span>
            💡 <strong>Совет:</strong> Оптимальный маршрут учитывает кратчайшие расстояния между зданиями
          </span>
        </div>
      </div>

      {/* Предпросмотр маршрута */}
      {previewRoute && (
        <RoutePreview
          route={previewRoute}
          onClose={handleClosePreview}
        />
      )}
    </div>
  )
}
