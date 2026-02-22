'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users,
  Building2,
  MessageSquare,
  Route,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  UserPlus,
  Eye
} from 'lucide-react'

interface TimeSeriesData {
  date: string
  count: number
}

interface AnalyticsData {
  // Totals
  totalUsers: number
  totalBuildings: number
  totalReviews: number
  totalRoutes: number

  // Growth (last 30 days vs previous 30 days)
  usersGrowth: number
  buildingsGrowth: number
  reviewsGrowth: number
  routesGrowth: number

  // New this week
  newUsersThisWeek: number
  newBuildingsThisWeek: number
  newReviewsThisWeek: number
  newRoutesThisWeek: number

  // Time series for chart
  usersByDay: TimeSeriesData[]

  // Role distribution
  roleDistribution: { role: string; count: number }[]

  // Top cities
  topCities: { city: string; count: number }[]
}

type TimePeriod = '7d' | '30d' | '90d' | 'all'

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<TimePeriod>('30d')

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)

      const now = new Date()
      const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365 * 10
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
      const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Fetch all data in parallel
      const [
        usersResult,
        buildingsResult,
        reviewsResult,
        routesResult
      ] = await Promise.all([
        supabase.from('profiles').select('id, role, city, created_at'),
        supabase.from('buildings').select('id, city, created_at'),
        supabase.from('building_reviews').select('id, created_at'),
        supabase.from('routes').select('id, created_at')
      ])

      const users = usersResult.data || []
      const buildings = buildingsResult.data || []
      const reviews = reviewsResult.data || []
      const routes = routesResult.data || []

      // Calculate totals
      const totalUsers = users.length
      const totalBuildings = buildings.length
      const totalReviews = reviews.length
      const totalRoutes = routes.length

      // Calculate growth (compare periods)
      const usersInPeriod = users.filter(u => new Date(u.created_at) >= startDate).length
      const usersInPreviousPeriod = users.filter(u => {
        const date = new Date(u.created_at)
        return date >= previousStartDate && date < startDate
      }).length
      const usersGrowth = usersInPreviousPeriod > 0
        ? Math.round(((usersInPeriod - usersInPreviousPeriod) / usersInPreviousPeriod) * 100)
        : usersInPeriod > 0 ? 100 : 0

      const buildingsInPeriod = buildings.filter(b => new Date(b.created_at) >= startDate).length
      const buildingsInPreviousPeriod = buildings.filter(b => {
        const date = new Date(b.created_at)
        return date >= previousStartDate && date < startDate
      }).length
      const buildingsGrowth = buildingsInPreviousPeriod > 0
        ? Math.round(((buildingsInPeriod - buildingsInPreviousPeriod) / buildingsInPreviousPeriod) * 100)
        : buildingsInPeriod > 0 ? 100 : 0

      const reviewsInPeriod = reviews.filter(r => new Date(r.created_at) >= startDate).length
      const reviewsInPreviousPeriod = reviews.filter(r => {
        const date = new Date(r.created_at)
        return date >= previousStartDate && date < startDate
      }).length
      const reviewsGrowth = reviewsInPreviousPeriod > 0
        ? Math.round(((reviewsInPeriod - reviewsInPreviousPeriod) / reviewsInPreviousPeriod) * 100)
        : reviewsInPeriod > 0 ? 100 : 0

      const routesInPeriod = routes.filter(r => new Date(r.created_at) >= startDate).length
      const routesInPreviousPeriod = routes.filter(r => {
        const date = new Date(r.created_at)
        return date >= previousStartDate && date < startDate
      }).length
      const routesGrowth = routesInPreviousPeriod > 0
        ? Math.round(((routesInPeriod - routesInPreviousPeriod) / routesInPreviousPeriod) * 100)
        : routesInPeriod > 0 ? 100 : 0

      // New this week
      const newUsersThisWeek = users.filter(u => new Date(u.created_at) >= weekAgo).length
      const newBuildingsThisWeek = buildings.filter(b => new Date(b.created_at) >= weekAgo).length
      const newReviewsThisWeek = reviews.filter(r => new Date(r.created_at) >= weekAgo).length
      const newRoutesThisWeek = routes.filter(r => new Date(r.created_at) >= weekAgo).length

      // Users by day (for chart)
      const usersByDayMap = new Map<string, number>()
      for (let i = periodDays - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        usersByDayMap.set(dateStr, 0)
      }

      users.forEach(u => {
        const dateStr = new Date(u.created_at).toISOString().split('T')[0]
        if (usersByDayMap.has(dateStr)) {
          usersByDayMap.set(dateStr, (usersByDayMap.get(dateStr) || 0) + 1)
        }
      })

      const usersByDay: TimeSeriesData[] = Array.from(usersByDayMap.entries()).map(([date, count]) => ({
        date,
        count
      }))

      // Role distribution
      const roleMap = new Map<string, number>()
      users.forEach(u => {
        const role = u.role || 'guest'
        roleMap.set(role, (roleMap.get(role) || 0) + 1)
      })
      const roleDistribution = Array.from(roleMap.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)

      // Top cities (from users)
      const cityMap = new Map<string, number>()
      users.forEach(u => {
        if (u.city) {
          cityMap.set(u.city, (cityMap.get(u.city) || 0) + 1)
        }
      })
      const topCities = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setAnalytics({
        totalUsers,
        totalBuildings,
        totalReviews,
        totalRoutes,
        usersGrowth,
        buildingsGrowth,
        reviewsGrowth,
        routesGrowth,
        newUsersThisWeek,
        newBuildingsThisWeek,
        newReviewsThisWeek,
        newRoutesThisWeek,
        usersByDay,
        roleDistribution,
        topCities
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, period])

  useEffect(() => {
    if (user && profile && ['admin', 'moderator'].includes(profile.role || '')) {
      loadAnalytics()
    }
  }, [user, profile, loadAnalytics])

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded-[var(--radius)] w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded-[var(--radius)]"></div>
              ))}
            </div>
            <div className="h-64 bg-muted rounded-[var(--radius)]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
    return null
  }

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-muted-foreground text-sm">No change</span>
    const isPositive = value > 0
    return (
      <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {isPositive ? '+' : ''}{value}%
      </span>
    )
  }

  // Simple bar chart component
  const SimpleChart = ({ data, maxBars = 30 }: { data: TimeSeriesData[], maxBars?: number }) => {
    const displayData = data.slice(-maxBars)
    const maxCount = Math.max(...displayData.map(d => d.count), 1)

    return (
      <div className="flex items-end gap-1 h-40">
        {displayData.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t group relative"
            style={{ height: `${Math.max((d.count / maxCount) * 100, 4)}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {d.date}: {d.count} users
            </div>
          </div>
        ))}
      </div>
    )
  }

  const periodLabels: Record<TimePeriod, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    'all': 'All time'
  }

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-2">Platform growth and user statistics</p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-[var(--radius)]">
            {(['7d', '30d', '90d', 'all'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-[var(--radius)] transition-colors ${
                  period === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-[var(--radius)]">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <GrowthIndicator value={analytics?.usersGrowth || 0} />
            </div>
            <p className="text-3xl font-metrics font-bold text-foreground">{analytics?.totalUsers || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Users</p>
            <div className="mt-3 pt-3 border-t border-border flex items-center text-sm text-muted-foreground">
              <UserPlus className="w-4 h-4 mr-2" />
              +{analytics?.newUsersThisWeek || 0} this week
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-[var(--radius)]">
                <Building2 className="w-6 h-6 text-amber-500" />
              </div>
              <GrowthIndicator value={analytics?.buildingsGrowth || 0} />
            </div>
            <p className="text-3xl font-metrics font-bold text-foreground">{analytics?.totalBuildings || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Objects</p>
            <div className="mt-3 pt-3 border-t border-border flex items-center text-sm text-muted-foreground">
              <Activity className="w-4 h-4 mr-2" />
              +{analytics?.newBuildingsThisWeek || 0} this week
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-[var(--radius)]">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <GrowthIndicator value={analytics?.reviewsGrowth || 0} />
            </div>
            <p className="text-3xl font-metrics font-bold text-foreground">{analytics?.totalReviews || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Reviews</p>
            <div className="mt-3 pt-3 border-t border-border flex items-center text-sm text-muted-foreground">
              <Activity className="w-4 h-4 mr-2" />
              +{analytics?.newReviewsThisWeek || 0} this week
            </div>
          </div>

          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-[var(--radius)]">
                <Route className="w-6 h-6 text-purple-500" />
              </div>
              <GrowthIndicator value={analytics?.routesGrowth || 0} />
            </div>
            <p className="text-3xl font-metrics font-bold text-foreground">{analytics?.totalRoutes || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Routes</p>
            <div className="mt-3 pt-3 border-t border-border flex items-center text-sm text-muted-foreground">
              <Activity className="w-4 h-4 mr-2" />
              +{analytics?.newRoutesThisWeek || 0} this week
            </div>
          </div>
        </div>

        {/* User Registration Chart */}
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">User Registrations</h2>
              <p className="text-sm text-muted-foreground">{periodLabels[period]}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Daily new users
            </div>
          </div>

          {analytics?.usersByDay && analytics.usersByDay.length > 0 ? (
            <SimpleChart data={analytics.usersByDay} maxBars={period === '7d' ? 7 : period === '30d' ? 30 : 90} />
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}

          {analytics?.usersByDay && analytics.usersByDay.length > 0 && (
            <div className="flex justify-between mt-4 text-xs text-muted-foreground">
              <span>{analytics.usersByDay[0]?.date}</span>
              <span>{analytics.usersByDay[analytics.usersByDay.length - 1]?.date}</span>
            </div>
          )}
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Role Distribution */}
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Role Distribution</h2>
            <div className="space-y-4">
              {analytics?.roleDistribution.map((item) => {
                const percentage = analytics.totalUsers > 0
                  ? Math.round((item.count / analytics.totalUsers) * 100)
                  : 0
                const roleLabels: Record<string, string> = {
                  guest: 'Guests',
                  explorer: 'Explorers',
                  guide: 'Guides',
                  expert: 'Experts',
                  moderator: 'Moderators',
                  admin: 'Administrators'
                }
                return (
                  <div key={item.role}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {roleLabels[item.role] || item.role}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Cities */}
          <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Top Cities (by Users)</h2>
            {analytics?.topCities && analytics.topCities.length > 0 ? (
              <div className="space-y-4">
                {analytics.topCities.map((item, index) => (
                  <div key={item.city} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground">{item.city}</span>
                    </div>
                    <span className="text-muted-foreground">{item.count} users</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No city data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
