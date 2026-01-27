// src/app/test-maplibre/TestMapLibreClient.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Building } from '@/types/building'
import type { MapLibreEnhancedRef } from '@/components/MapLibreEnhanced'

// Route type
interface Route {
  id: string
  title: string
  description?: string
  city: string | null
  country: string | null
  transport_mode?: string
  difficulty_level?: string | null
  estimated_duration_minutes?: number
  distance_km?: number
  points_count?: number
  is_published?: boolean
  rating?: number
  review_count?: number
  created_at: string
  thumbnail_url?: string | null
  route_geometry?: GeoJSON.LineString | null
  route_points?: {
    id: string
    title: string
    latitude: number
    longitude: number
    order_index: number
    description?: string
  }[]
}

// Dynamic imports (no SSR)
const MapLibreMap = dynamic(
  () => import('@/components/MapLibreMap'),
  {
    ssr: false,
    loading: () => <MapLoadingState text="Загрузка базовой карты..." />
  }
)

const MapLibreEnhanced = dynamic(
  () => import('@/components/MapLibreEnhanced'),
  {
    ssr: false,
    loading: () => <MapLoadingState text="Загрузка расширенной карты..." />
  }
)

// Loading component
function MapLoadingState({ text }: { text: string }) {
  return (
    <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  )
}

export default function TestMapLibreClient() {
  const supabase = useMemo(() => createClient(), [])
  const mapRef = useRef<MapLibreEnhancedRef>(null)

  const [buildings, setBuildings] = useState<Building[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null)

  // Mode switches
  const [mapMode, setMapMode] = useState<'basic' | 'enhanced'>('enhanced')
  const [routeCreationMode, setRouteCreationMode] = useState(false)
  const [selectedBuildingsForRoute, setSelectedBuildingsForRoute] = useState<string[]>([])

  // Load buildings
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Load buildings
        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('*')
          .eq('moderation_status', 'approved')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(100)

        if (buildingsError) throw buildingsError

        // Load routes with geometry
        const { data: routesData, error: routesError } = await supabase
          .from('routes')
          .select(`
            id, title, description, city, country,
            transport_mode, difficulty_level, estimated_duration_minutes,
            distance_km, points_count, is_published, rating, review_count,
            created_at, thumbnail_url, route_geometry,
            route_points (
              id, title, latitude, longitude, order_index, description
            )
          `)
          .eq('publication_status', 'published')
          .not('route_geometry', 'is', null)
          .limit(20)

        if (routesError) {
          console.warn('Routes load error:', routesError)
        }

        console.log(`Loaded ${buildingsData?.length || 0} buildings, ${routesData?.length || 0} routes`)
        setBuildings(buildingsData || [])
        setRoutes(routesData || [])
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  // Handlers
  const handleBuildingClick = (buildingId: string) => {
    console.log('Building clicked:', buildingId)
    setSelectedBuilding(buildingId)

    if (routeCreationMode && !selectedBuildingsForRoute.includes(buildingId)) {
      setSelectedBuildingsForRoute(prev => [...prev, buildingId])
    }
  }

  const handleBuildingDetails = (building: Building) => {
    console.log('Building details:', building.name)
    setSelectedBuilding(building.id)
  }

  const handleRouteClick = (routeId: string) => {
    console.log('Route clicked:', routeId)
    setSelectedRoute(routeId)
    mapRef.current?.centerOnRoute(routeId)
  }

  const handleAddToRoute = (buildingId: string) => {
    if (!selectedBuildingsForRoute.includes(buildingId)) {
      setSelectedBuildingsForRoute(prev => [...prev, buildingId])
    }
  }

  const handleRemoveFromRoute = (buildingId: string) => {
    setSelectedBuildingsForRoute(prev => prev.filter(id => id !== buildingId))
  }

  const handleClearRoute = () => {
    setSelectedBuildingsForRoute([])
    setRouteCreationMode(false)
  }

  // Get selected building object
  const selectedBuildingObj = useMemo(() =>
    buildings.find(b => b.id === selectedBuilding),
    [buildings, selectedBuilding]
  )

  // Get selected route object
  const selectedRouteObj = useMemo(() =>
    routes.find(r => r.id === selectedRoute),
    [routes, selectedRoute]
  )

  // Get buildings for route display
  const routeBuildings = useMemo(() =>
    selectedBuildingsForRoute.map(id => buildings.find(b => b.id === id)).filter(Boolean) as Building[],
    [buildings, selectedBuildingsForRoute]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                MapLibre GL JS Test
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Тестовая страница миграции с Leaflet
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/test-map"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Leaflet версия
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                На главную
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Mode selector */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700 mr-3">Режим карты:</span>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setMapMode('basic')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mapMode === 'basic'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Базовая
                </button>
                <button
                  onClick={() => setMapMode('enhanced')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mapMode === 'enhanced'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Расширенная
                </button>
              </div>
            </div>

            {mapMode === 'enhanced' && (
              <>
                <div className="h-6 w-px bg-gray-200"></div>
                <button
                  onClick={() => setRouteCreationMode(!routeCreationMode)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    routeCreationMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {routeCreationMode ? '🗺️ Создание маршрута' : '➕ Создать маршрут'}
                </button>

                {routeCreationMode && selectedBuildingsForRoute.length > 0 && (
                  <button
                    onClick={handleClearRoute}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Очистить ({selectedBuildingsForRoute.length})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-blue-700">Загрузка данных...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700"><strong>Ошибка:</strong> {error}</p>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <div className="h-[600px]">
            {mapMode === 'basic' ? (
              <MapLibreMap
                buildings={buildings}
                routes={routes}
                selectedBuilding={selectedBuilding}
                onBuildingClick={(building) => setSelectedBuilding(building.id)}
              />
            ) : (
              <MapLibreEnhanced
                ref={mapRef}
                buildings={buildings}
                routes={routes}
                selectedBuilding={selectedBuilding}
                selectedRoute={selectedRoute}
                hoveredBuilding={hoveredBuilding}
                onBuildingClick={handleBuildingClick}
                onBuildingDetails={handleBuildingDetails}
                onRouteClick={handleRouteClick}
                onAddToRoute={handleAddToRoute}
                routeCreationMode={routeCreationMode}
                selectedBuildingsForRoute={selectedBuildingsForRoute}
                className="h-full"
              />
            )}
          </div>
        </div>

        {/* Route creation panel */}
        {routeCreationMode && routeBuildings.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-900 mb-3">
              Маршрут ({routeBuildings.length} точек)
            </h3>
            <div className="space-y-2">
              {routeBuildings.map((building, index) => (
                <div
                  key={building.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-purple-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900">{building.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFromRoute(building.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected building */}
        {selectedBuildingObj && !routeCreationMode && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-start gap-4">
              {selectedBuildingObj.image_url && (
                <img
                  src={selectedBuildingObj.image_url}
                  alt={selectedBuildingObj.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedBuildingObj.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedBuildingObj.architect}, {selectedBuildingObj.year_built}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedBuildingObj.address || selectedBuildingObj.city}
                </p>
              </div>
              <Link
                href={`/buildings/${selectedBuildingObj.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Открыть
              </Link>
            </div>
          </div>
        )}

        {/* Selected route */}
        {selectedRouteObj && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                🛤️
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedRouteObj.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedRouteObj.city}, {selectedRouteObj.country}
                </p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  {selectedRouteObj.distance_km && (
                    <span>📏 {selectedRouteObj.distance_km.toFixed(1)} км</span>
                  )}
                  {selectedRouteObj.estimated_duration_minutes && (
                    <span>⏱️ {selectedRouteObj.estimated_duration_minutes} мин</span>
                  )}
                  {selectedRouteObj.transport_mode && (
                    <span>🚶 {selectedRouteObj.transport_mode}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedRoute(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {/* Routes list */}
        {routes.length > 0 && mapMode === 'enhanced' && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Маршруты ({routes.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {routes.map(route => (
                <button
                  key={route.id}
                  onClick={() => handleRouteClick(route.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedRoute === route.id
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {route.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {route.city} • {route.transport_mode || 'walking'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-3xl font-bold text-blue-600">{buildings.length}</div>
            <div className="text-sm text-gray-600">Зданий</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-3xl font-bold text-green-600">{routes.length}</div>
            <div className="text-sm text-gray-600">Маршрутов</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-3xl font-bold text-purple-600">WebGL</div>
            <div className="text-sm text-gray-600">Рендеринг</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-3xl font-bold text-amber-600">Vector</div>
            <div className="text-sm text-gray-600">Тайлы</div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Сравнение MapLibre vs Leaflet
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Характеристика</th>
                  <th className="text-left py-2 px-3 font-medium text-blue-600">MapLibre GL JS</th>
                  <th className="text-left py-2 px-3 font-medium text-green-600">Leaflet</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 px-3 text-gray-600">Рендеринг</td>
                  <td className="py-2 px-3">WebGL (GPU)</td>
                  <td className="py-2 px-3">Canvas/SVG (CPU)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Тайлы</td>
                  <td className="py-2 px-3">Векторные</td>
                  <td className="py-2 px-3">Растровые</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">3D поддержка</td>
                  <td className="py-2 px-3">Полная (pitch, bearing)</td>
                  <td className="py-2 px-3">Ограниченная</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Производительность</td>
                  <td className="py-2 px-3">Высокая (много маркеров)</td>
                  <td className="py-2 px-3">Средняя</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Размер бандла</td>
                  <td className="py-2 px-3">~300kb</td>
                  <td className="py-2 px-3">~40kb</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Плавность зума</td>
                  <td className="py-2 px-3">Очень плавный</td>
                  <td className="py-2 px-3">Дискретный</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
