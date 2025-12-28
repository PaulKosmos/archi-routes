'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
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

export default function MainTestPage() {
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

        {/* Существующие секции - временно */}
        <BlogPostsSection />
        <NewsSection />
        <PodcastsSection />
      </main>

      <EnhancedFooter />
    </div>
  )
}
