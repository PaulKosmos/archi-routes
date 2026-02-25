// src/app/routes/[id]/RouteDetailPageClient.tsx - Client Component with authentication
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import Header from '../../../components/Header'
import EnhancedFooter from '../../../components/EnhancedFooter'
import { ArrowLeft } from 'lucide-react'
import RouteDetailClient from './RouteDetailClient'

// Компонент ScrollToTop с "убеганием" от курсора
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [buttonBottom, setButtonBottom] = useState(32)
  const [buttonRight, setButtonRight] = useState(0)
  const [isRunningAway, setIsRunningAway] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)

      const footer = document.querySelector('footer')
      if (footer) {
        const footerRect = footer.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const spacing = 32

        if (footerRect.top < windowHeight) {
          const overlap = windowHeight - footerRect.top
          setButtonBottom(spacing + overlap)
        } else {
          setButtonBottom(spacing)
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return

      const button = buttonRef.current
      const buttonRect = button.getBoundingClientRect()
      const buttonCenterX = buttonRect.left + buttonRect.width / 2
      const buttonCenterY = buttonRect.top + buttonRect.height / 2

      const distanceX = e.clientX - buttonCenterX
      const distanceY = e.clientY - buttonCenterY
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

      const triggerDistance = 100

      if (distance < triggerDistance) {
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
        }

        escapeTimeoutRef.current = setTimeout(() => {
          setIsRunningAway(true)

          const angle = Math.atan2(distanceY, distanceX)
          const escapeDistance = 80

          const newRight = -Math.cos(angle) * escapeDistance
          const newBottomOffset = -Math.sin(angle) * escapeDistance

          const footer = document.querySelector('footer')
          const windowHeight = window.innerHeight
          const buttonHeight = 48

          let maxBottom = buttonBottom + 150

          if (footer) {
            const footerRect = footer.getBoundingClientRect()
            const footerTop = footerRect.top
            const maxAllowedBottom = windowHeight - footerTop - buttonHeight - 32

            if (maxAllowedBottom > 32) {
              maxBottom = Math.min(maxBottom, maxAllowedBottom + buttonBottom)
            }
          }

          const maxRight = 200
          const newBottomValue = buttonBottom + newBottomOffset

          setButtonRight(Math.max(-maxRight, Math.min(maxRight, newRight)))
          setButtonBottom(Math.max(32, Math.min(maxBottom, newBottomValue)))
        }, 200)
      } else if (distance > triggerDistance + 100) {
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
          escapeTimeoutRef.current = null
        }

        setIsRunningAway(false)
        setButtonRight(0)

        const footer = document.querySelector('footer')
        if (footer) {
          const footerRect = footer.getBoundingClientRect()
          const windowHeight = window.innerHeight
          const spacing = 32

          if (footerRect.top < windowHeight) {
            const overlap = windowHeight - footerRect.top
            setButtonBottom(spacing + overlap)
          } else {
            setButtonBottom(spacing)
          }
        }
      }
    }

    if (isVisible) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current)
        }
      }
    }
  }, [isVisible, buttonBottom])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={scrollToTop}
      className="fixed z-[9999] p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 hover:scale-110"
      style={{
        bottom: `${buttonBottom}px`,
        right: `max(1.5rem, calc(50% - 640px + 2rem + ${buttonRight}px))`,
        transition: isRunningAway
          ? 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'bottom, right'
      }}
      aria-label="Scroll to top"
    >
      <ArrowLeft className="h-6 w-6 rotate-90" />
    </button>
  )
}

export default function RouteDetailPageClient() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [route, setRoute] = useState<any>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
              image_urls,
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
      <div className="min-h-screen bg-background">
        <Header buildings={[]} />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-[var(--radius)] w-1/2"></div>
            <div className="h-4 bg-muted rounded-[var(--radius)] w-3/4"></div>
            <div className="h-4 bg-muted rounded-[var(--radius)] w-1/2"></div>
            <div className="h-64 bg-muted rounded-[var(--radius)]"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show error
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header buildings={buildings} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-card rounded-[var(--radius)] border border-border p-8 text-center">
            <div className="text-destructive text-6xl mb-4 font-metrics">404</div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Route Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <a
              href="/routes"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
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
      <div className="min-h-screen bg-background">
        <Header buildings={buildings} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-card rounded-[var(--radius)] border border-border p-8 text-center">
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Route Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The route may have been deleted or you do not have access to it
            </p>
            <a
              href="/routes"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
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
    <div className="min-h-screen bg-background">
      {!shouldHideHeader && <Header buildings={buildings} />}
      <RouteDetailClient route={route} />
      {!shouldHideHeader && <EnhancedFooter />}
    </div>
  )
}
