// src/app/routes/[id]/RouteDetailPageClient.tsx - Client Component with authentication
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import Header from '../../../components/Header'
import EnhancedFooter from '../../../components/EnhancedFooter'
import RouteDetailClient from './RouteDetailClient'

export default function RouteDetailPageClient() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [route, setRoute] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const routeId = params.id as string

  useEffect(() => {
    if (!authLoading) {
      loadRoute()
      loadBuildings()
    }
  }, [routeId, user, authLoading])

  const loadRoute = async () => {
    setLoading(true)
    setError(null)

    console.log('🛤️ Loading route with ID:', routeId)
    console.log('👤 Current user:', user?.id || 'anonymous')

    try {
      // Load specific route
      const { data: routeData, error } = await supabase
        .from('routes')
        .select(`
          id,
          title,
          description,
          city,
          country,
          created_by,
          route_type,
          difficulty_level,
          estimated_duration_minutes,
          distance_km,
          points_count,
          thumbnail_url,
          is_published,
          is_premium,
          price_credits,
          language,
          tags,
          rating,
          review_count,
          completion_count,
          transport_mode,
          route_geometry,
          route_instructions,
          route_summary,
          route_options,
          route_visibility,
          publication_status,
          created_at,
          updated_at,
          profiles!routes_created_by_fkey (
            id,
            username,
            full_name,
            role,
            email,
            avatar_url
          ),
          route_points (
            id,
            route_id,
            building_id,
            order_index,
            title,
            description,
            audio_url,
            audio_duration_seconds,
            latitude,
            longitude,
            instructions,
            estimated_time_minutes,
            point_type,
            buildings (
              id,
              name,
              description,
              architect,
              year_built,
              architectural_style,
              address,
              city,
              country,
              latitude,
              longitude,
              image_url,
              building_type
            )
          )
        `)
        .eq('id', routeId)
        .single()

      if (error) {
        console.error('❌ Route fetch error:', {
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          routeId: routeId,
          userId: user?.id
        })

        if (error?.code === 'PGRST116') {
          console.log('ℹ️ Route not found or access denied due to RLS')
          setError('Route not found or you do not have access to it')
          return
        }

        setError(error.message)
        return
      }

      if (!routeData) {
        console.error('❌ No route data returned')
        setError('Route not found')
        return
      }

      // Process data
      const processedRoute = {
        ...routeData,
        profiles: Array.isArray(routeData.profiles)
          ? routeData.profiles[0] || null
          : routeData.profiles,
        route_points: (routeData.route_points || []).map((point: any) => ({
          ...point,
          buildings: Array.isArray(point.buildings)
            ? point.buildings[0] || null
            : point.buildings
        }))
      }

      // Sort points by order
      if (processedRoute.route_points) {
        processedRoute.route_points.sort((a: any, b: any) => a.order_index - b.order_index)
      }

      console.log('✅ Route loaded successfully:', processedRoute.title)
      console.log('📊 Route visibility:', processedRoute.route_visibility)
      console.log('📊 Publication status:', processedRoute.publication_status)
      console.log('👤 Created by:', processedRoute.created_by)
      console.log('🔐 Access check:', user?.id === processedRoute.created_by ? 'Owner' : 'Public')

      setRoute(processedRoute)
    } catch (error) {
      console.error('❌ Unexpected error loading route:', error)
      setError('An error occurred while loading the route')
    } finally {
      setLoading(false)
    }
  }

  const loadBuildings = async () => {
    try {
      const { data } = await supabase
        .from('buildings')
        .select('*')

      setBuildings(data || [])
    } catch (error) {
      console.error('Error loading buildings:', error)
    }
  }

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={buildings} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">404</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Route Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <a
              href="/routes"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Routes
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Route not loaded
  if (!route) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={buildings} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Route Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              The route may have been deleted or you do not have access to it
            </p>
            <a
              href="/routes"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Routes
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Check if Header should be hidden (for modal)
  const shouldHideHeader = searchParams?.get('hideHeader') === 'true'
  console.log('🛤️ [DEBUG] Should hide header:', shouldHideHeader)

  return (
    <div className="min-h-screen bg-gray-50">
      {!shouldHideHeader && <Header buildings={buildings} />}
      <RouteDetailClient route={route} />
      {!shouldHideHeader && <EnhancedFooter />}
    </div>
  )
}
