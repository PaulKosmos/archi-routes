'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Building } from '@/types/building'
import type { Route } from '@/types/route'
import type { BuildingReviewWithProfile } from '@/types/building'

// New homepage components
import HeroWithVideo from '@/components/homepage/HeroWithVideo'
import FeaturedRoutesSection from '@/components/homepage/FeaturedRoutesSection'
import BuildingsGrid from '@/components/homepage/BuildingsGrid'
import HowItWorksSection from '@/components/homepage/HowItWorksSection'
import CommunityInsights from '@/components/homepage/CommunityInsights'

// Redesigned sections
import BlogPostsSection from '@/components/homepage/BlogPostsSection'
import NewsSection from '@/components/homepage/NewsSection'
import PodcastsSection from '@/components/homepage/PodcastsSection'

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
        right: `max(1.5rem, calc(2rem + ${buttonRight}px))`,
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

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [reviews, setReviews] = useState<BuildingReviewWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    buildings: 0,
    routes: 0,
    reviews: 0
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12)

      // Fetch featured routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select(`
          *,
          profiles (full_name, avatar_url, role),
          route_points (id, title, latitude, longitude, order_index)
        `)
        .eq('is_published', true)
        .in('route_visibility', ['public', 'featured'])
        .order('created_at', { ascending: false })
        .limit(6)

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('building_reviews')
        .select(`
          *,
          profiles (id, full_name, avatar_url, role),
          buildings (id, name, image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(6)

      // Fetch stats
      const [buildingsCount, routesCount, reviewsCount] = await Promise.all([
        supabase.from('buildings').select('id', { count: 'exact', head: true }),
        supabase.from('routes').select('id', { count: 'exact', head: true }),
        supabase.from('building_reviews').select('id', { count: 'exact', head: true })
      ])

      if (!buildingsError) setBuildings(buildingsData || [])
      if (!routesError) setRoutes(routesData || [])
      if (!reviewsError) setReviews(reviewsData || [])

      setStats({
        buildings: buildingsCount.count || 0,
        routes: routesCount.count || 0,
        reviews: reviewsCount.count || 0
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-background">
      <Header buildings={buildings} onRouteCreated={() => {}} />

      <main>
        {/* HERO SECTION */}
        <HeroWithVideo stats={stats} />

        {/* FEATURED ROUTES SECTION */}
        <FeaturedRoutesSection routes={routes} loading={loading} />

        {/* HOW IT WORKS */}
        <HowItWorksSection />

        {/* BUILDINGS GRID */}
        <BuildingsGrid buildings={buildings} loading={loading} />

        {/* COMMUNITY INSIGHTS */}
        <CommunityInsights reviews={reviews} loading={loading} />

        {/* Blog, News, Podcasts sections */}
        <BlogPostsSection />
        <NewsSection />
        <PodcastsSection />
      </main>

      <EnhancedFooter />
      <ScrollToTopButton />
    </div>
  )
}
