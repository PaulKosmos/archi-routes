'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Globe, Lock, Star, Clock, CheckCircle, XCircle, Eye,
  Search, Filter, ExternalLink, MapPin, User, Calendar,
  ChevronDown, Loader2, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type PublicationStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
type RouteVisibility = 'private' | 'public' | 'featured'
type FilterStatus = 'all' | PublicationStatus

interface AdminRoute {
  id: string
  title: string
  description: string | null
  city: string
  country: string
  route_visibility: RouteVisibility
  publication_status: PublicationStatus
  route_source: string
  points_count: number | null
  estimated_duration_minutes: number | null
  distance_km: number | null
  difficulty_level: string | null
  created_at: string
  updated_at: string
  moderation_notes: string | null
  profiles: {
    id: string
    full_name: string | null
    username: string | null
    email: string | null
    role: string | null
  } | null
}

const STATUS_CONFIG: Record<PublicationStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'text-gray-600',  bg: 'bg-gray-100',   icon: <Lock className="w-3.5 h-3.5" /> },
  pending:   { label: 'Pending',   color: 'text-amber-700', bg: 'bg-amber-100',  icon: <Clock className="w-3.5 h-3.5" /> },
  published: { label: 'Published', color: 'text-green-700', bg: 'bg-green-100',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:  { label: 'Rejected',  color: 'text-red-700',   bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  archived:  { label: 'Archived',  color: 'text-slate-600', bg: 'bg-slate-100',  icon: <Lock className="w-3.5 h-3.5" /> },
}

const VISIBILITY_CONFIG: Record<RouteVisibility, { label: string; color: string; icon: React.ReactNode }> = {
  private:  { label: 'Private',  color: 'text-gray-500',   icon: <Lock className="w-3.5 h-3.5" /> },
  public:   { label: 'Public',   color: 'text-blue-600',   icon: <Globe className="w-3.5 h-3.5" /> },
  featured: { label: 'Featured', color: 'text-purple-600', icon: <Star className="w-3.5 h-3.5" /> },
}

export default function AdminRoutesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()

  const [routes, setRoutes] = useState<AdminRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [moderationNote, setModerationNote] = useState('')

  const loadRoutes = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('routes')
        .select(`
          id, title, description, city, country,
          route_visibility, publication_status, route_source,
          points_count, estimated_duration_minutes, distance_km,
          difficulty_level, created_at, updated_at, moderation_notes,
          profiles!routes_created_by_fkey (
            id, full_name, username, email, role
          )
        `)
        .order('updated_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('publication_status', filterStatus)
      }

      const { data, error } = await query
      if (error) throw error
      // Supabase returns profiles as array for FK joins — flatten to object
      const normalized = (data || []).map((r: any) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles,
      }))
      setRoutes(normalized as AdminRoute[])
    } catch (err: any) {
      toast.error(`Error loading routes: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, filterStatus])

  useEffect(() => {
    if (user && profile && ['admin', 'moderator'].includes(profile.role || '')) {
      loadRoutes()
    }
  }, [user, profile, loadRoutes])

  const updateRoute = async (
    routeId: string,
    updates: { route_visibility?: RouteVisibility; publication_status?: PublicationStatus; moderation_notes?: string }
  ) => {
    setUpdatingId(routeId)
    try {
      const payload: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      if (updates.publication_status === 'published') {
        payload.is_published = true
        payload.published_at = new Date().toISOString()
        payload.moderated_by = user?.id
        payload.moderated_at = new Date().toISOString()
      } else if (updates.publication_status === 'rejected') {
        payload.is_published = false
        payload.moderated_by = user?.id
        payload.moderated_at = new Date().toISOString()
      } else if (updates.publication_status === 'draft') {
        payload.is_published = false
      }

      const { error } = await supabase
        .from('routes')
        .update(payload)
        .eq('id', routeId)

      if (error) throw error

      setRoutes(prev =>
        prev.map(r => r.id === routeId ? { ...r, ...updates, ...payload } : r)
      )

      const action = updates.publication_status
      if (action === 'published') toast.success('Route published')
      else if (action === 'rejected') toast.success('Route rejected')
      else if (updates.route_visibility === 'featured') toast.success('Route featured')
      else toast.success('Route updated')

      setExpandedId(null)
      setModerationNote('')
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const publish = (route: AdminRoute) =>
    updateRoute(route.id, {
      route_visibility: 'public',
      publication_status: 'published',
      ...(moderationNote ? { moderation_notes: moderationNote } : {})
    })

  const feature = (route: AdminRoute) =>
    updateRoute(route.id, {
      route_visibility: 'featured',
      publication_status: 'published',
      ...(moderationNote ? { moderation_notes: moderationNote } : {})
    })

  const reject = (route: AdminRoute) => {
    if (!moderationNote.trim()) {
      toast.error('Please enter a reason for rejection')
      return
    }
    updateRoute(route.id, {
      route_visibility: 'private',
      publication_status: 'rejected',
      moderation_notes: moderationNote
    })
  }

  const unpublish = (route: AdminRoute) =>
    updateRoute(route.id, {
      route_visibility: 'private',
      publication_status: 'draft',
    })

  const filteredRoutes = routes.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      (r.profiles?.full_name || '').toLowerCase().includes(q) ||
      (r.profiles?.username || '').toLowerCase().includes(q)
    )
  })

  // Status counts
  const counts = routes.reduce((acc, r) => {
    acc[r.publication_status] = (acc[r.publication_status] || 0) + 1
    acc.all = (acc.all || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
    return null
  }

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold text-foreground">Route Publication</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review user routes and manage their public visibility
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'pending', 'published', 'draft', 'rejected'] as FilterStatus[]).map(status => {
                const config = status !== 'all' ? STATUS_CONFIG[status as PublicationStatus] : null
                const count = counts[status] || 0
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      filterStatus === status
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {config?.icon}
                    <span className="capitalize">{status === 'all' ? 'All' : config?.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filterStatus === status ? 'bg-white/20' : 'bg-muted'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="relative sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search routes..."
                className="pl-9 pr-4 py-1.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary w-full sm:w-56"
              />
            </div>

            <button
              onClick={loadRoutes}
              disabled={loading}
              className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Routes list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-muted" />
            <p className="font-medium">No routes found</p>
            <p className="text-sm mt-1">Try a different filter or search query</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRoutes.map(route => {
              const statusCfg = STATUS_CONFIG[route.publication_status]
              const visCfg = VISIBILITY_CONFIG[route.route_visibility]
              const isExpanded = expandedId === route.id
              const isUpdating = updatingId === route.id

              return (
                <div
                  key={route.id}
                  className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden"
                >
                  {/* Main row */}
                  <div className="p-4 flex items-start gap-4">
                    {/* Status indicator */}
                    <div className={`mt-0.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color} shrink-0`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </div>

                    {/* Route info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{route.title}</h3>
                            <span className={`flex items-center gap-1 text-xs ${visCfg.color}`}>
                              {visCfg.icon}
                              {visCfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {route.city}, {route.country}
                            </span>
                            {route.points_count && (
                              <span>{route.points_count} points</span>
                            )}
                            {route.estimated_duration_minutes && (
                              <span>{route.estimated_duration_minutes} min</span>
                            )}
                            {route.distance_km && (
                              <span>{route.distance_km} km</span>
                            )}
                            {route.difficulty_level && (
                              <span className="capitalize">{route.difficulty_level}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {route.profiles?.full_name || route.profiles?.username || 'Unknown'}
                              {route.profiles?.role && route.profiles.role !== 'user' && (
                                <span className="px-1.5 py-0.5 bg-muted rounded-full capitalize">{route.profiles.role}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(route.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="capitalize text-muted-foreground/70">{route.route_source}</span>
                          </div>

                          {route.moderation_notes && (
                            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                              Note: {route.moderation_notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/routes/${route.id}`}
                            target="_blank"
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                            title="View route"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => {
                              setExpandedId(isExpanded ? null : route.id)
                              setModerationNote(route.moderation_notes || '')
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isExpanded
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:border-primary/50'
                            }`}
                          >
                            Actions
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 p-4">
                      {/* Description */}
                      {route.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{route.description}</p>
                      )}

                      {/* Moderation note */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                          Moderation note (optional for approval, required for rejection)
                        </label>
                        <textarea
                          value={moderationNote}
                          onChange={e => setModerationNote(e.target.value)}
                          rows={2}
                          placeholder="Leave a comment for the route author..."
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Publish */}
                        {route.publication_status !== 'published' || route.route_visibility === 'private' ? (
                          <button
                            onClick={() => publish(route)}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                            Make Public
                          </button>
                        ) : null}

                        {/* Feature */}
                        {route.route_visibility !== 'featured' ? (
                          <button
                            onClick={() => feature(route)}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                            Feature
                          </button>
                        ) : null}

                        {/* Reject */}
                        {route.publication_status !== 'rejected' ? (
                          <button
                            onClick={() => reject(route)}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject
                          </button>
                        ) : null}

                        {/* Unpublish */}
                        {(route.publication_status === 'published' || route.route_visibility !== 'private') ? (
                          <button
                            onClick={() => unpublish(route)}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-4 py-2 bg-background text-foreground text-sm font-medium rounded-lg border border-border hover:bg-accent disabled:opacity-50 transition-colors"
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Make Private
                          </button>
                        ) : null}

                        <Link
                          href={`/routes/${route.id}/edit`}
                          className="flex items-center gap-1.5 px-4 py-2 bg-background text-foreground text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Edit Route
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
