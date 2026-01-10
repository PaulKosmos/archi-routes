'use client'

export const dynamic = 'force-dynamic'



import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { MapPin, Plus, Home, ArrowLeft } from 'lucide-react'
import RouteCreator from '@/components/RouteCreator'
import { SmartRouteFilter } from '@/lib/smart-route-filtering'
import type { RouteWithUserData } from '@/types/route'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'

interface SimpleRoute {
  id: string
  title: string
  description: string | null
  city: string
  country: string
  transport_mode: string | null
  estimated_duration_minutes: number | null
  points_count: number | null
  is_published: boolean | null
  created_at: string
}

const getTransportIcon = (mode: string | null) => {
  switch (mode) {
    case 'walking': return '🚶'
    case 'cycling': return '🚴'
    case 'driving': return '🚗'
    case 'public_transport': return '🚌'
    default: return '🚶'
  }
}

const getTransportLabel = (mode: string | null) => {
  switch (mode) {
    case 'walking': return 'Walking'
    case 'cycling': return 'Cycling'
    case 'driving': return 'Driving'
    case 'public_transport': return 'Public Transport'
    default: return 'Walking'
  }
}

export default function RoutesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [routes, setRoutes] = useState<SimpleRoute[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRouteCreatorOpen, setIsRouteCreatorOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Loading routes with smart filtering...')

      // Use smart filtering for routes page (more routes)
      const smartRoutes = await SmartRouteFilter.getRoutesForMap({
        city: 'Berlin',
        maxRoutes: 50, // Show more routes on routes page
        userPreferences: {
          // Can add user filters
        }
      })

      console.log(`✅ Retrieved ${smartRoutes.length} filtered routes`)
      setRoutes(smartRoutes)

    } catch (smartError: any) {
      console.error('❌ Smart filtering error:', smartError)
      
      // Fallback к обычному запросу
      try {
        const { data: routesData, error: routesError } = await supabase
          .from('routes')
          .select(`
            id,
            title,
            description,
            city,
            country,
            transport_mode,
            estimated_duration_minutes,
            points_count,
            is_published,
            created_at,
            route_visibility,
            publication_status,
            priority_score
          `)
          .eq('publication_status', 'published')
          .eq('route_visibility', 'public')
          .order('priority_score', { ascending: false })

        if (routesError) {
          console.error('❌ Routes error:', routesError)
          setError(routesError.message)
          return
        }

        // Convert to needed format
        const formattedRoutes = (routesData || []).map(route => ({
          ...route,
          // Add missing fields
          route_points: [],
          profiles: null,
          route_geometry: null,
          distance_km: 0,
          rating: null,
          completion_count: 0
        })) as RouteWithUserData[]

        setRoutes(formattedRoutes)
        console.log('✅ Used fallback loading:', formattedRoutes.length)
        
      } catch (fallbackError: any) {
        console.error('❌ Fallback error:', fallbackError)
        setError(fallbackError.message)
        return
      }
    }

    // Load buildings for route creation
    try {
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('name')

      if (buildingsError) {
        console.error('❌ Buildings error:', buildingsError)
      } else {
        setBuildings(buildingsData || [])
      }
    } catch (buildingsError: any) {
      console.error('❌ Buildings exception:', buildingsError)
    }
    
    setLoading(false)
  }

  const handleOpenRouteCreator = () => {
    setIsRouteCreatorOpen(true)
  }

  const handleCloseRouteCreator = () => {
    setIsRouteCreatorOpen(false)
    // Reload data after route creation
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading routes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Routes Loading Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={loadData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 inline-block">
              Home
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/diagnostic" className="text-blue-600 hover:underline text-sm">
              System Diagnostics →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header buildings={buildings} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Architectural Routes
            </h1>

            {user && (
              <button
                onClick={handleOpenRouteCreator}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Create Route</span>
              </button>
            )}
          </div>

          <p className="text-lg text-gray-600">
            Explore cities through the lens of architecture. Public routes from local experts and enthusiasts.
          </p>

          <div className="mt-4 text-sm text-gray-500">
            DB Status: Connected ✅ | Routes found: {routes.length}
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No routes yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create an architectural route!
            </p>
            {user ? (
              <button
                onClick={handleOpenRouteCreator}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create First Route</span>
              </button>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span>Sign In to Create Routes</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {route.title}
                </h3>
                {route.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {route.description}
                  </p>
                )}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>📍 {route.city}, {route.country}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>⏱️ {route.estimated_duration_minutes || 60} min</span>
                    <span>📍 {route.points_count || 0} points</span>
                  </div>
                  {route.transport_mode && (
                    <div className="flex items-center gap-2">
                      <span>{getTransportIcon(route.transport_mode)}</span>
                      <span>{getTransportLabel(route.transport_mode)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 pt-2 border-t flex justify-between">
                    <span>Created: {new Date(route.created_at).toLocaleDateString('en-US')}</span>
                    <span className="text-green-600 font-medium">🌍 Public</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/routes/${route.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Route →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
            <h4 className="font-semibold mb-2">Debug Information:</h4>
            <div>User: {user ? user.email : 'Not authorized'}</div>
            <div>Routes loaded: {routes.length}</div>
            <div>Last update: {new Date().toLocaleString('en-US')}</div>
          </div>
        )}

        </div>
      </div>
    
    {/* Route creation modal */}
    {isRouteCreatorOpen && user && (
      <RouteCreator
        isOpen={isRouteCreatorOpen}
        onClose={handleCloseRouteCreator}
        user={user}
        buildings={buildings}
      />
    )}
    <EnhancedFooter />
  </>
  )
}
