// src/app/routes/[id]/edit/RouteEditClient.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { useEditPermissions } from '../../../../hooks/useEditPermissions'
import type { Building, RoutePoint } from '../../../../types/building'
import {
  Save, ArrowLeft, Trash2, MapPin, GripVertical, X,
  ChevronDown, Footprints, Bike, Car, Bus, ChevronsDown, Map
} from 'lucide-react'
import { noCyrillic } from '../../../../lib/utils'
import { getStorageUrl } from '../../../../lib/storage'
import dynamic from 'next/dynamic'

type TransportMode = 'walking' | 'cycling' | 'driving' | 'public_transport'

const TRANSPORT_MODES: { value: TransportMode; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { value: 'walking',          label: 'Walking',  shortLabel: 'Walk',    icon: <Footprints className="w-4 h-4" /> },
  { value: 'cycling',          label: 'Cycling',  shortLabel: 'Bike',    icon: <Bike        className="w-4 h-4" /> },
  { value: 'driving',          label: 'By car',   shortLabel: 'Car',     icon: <Car         className="w-4 h-4" /> },
  { value: 'public_transport', label: 'Transit',  shortLabel: 'Transit', icon: <Bus         className="w-4 h-4" /> },
]

function getModeInfo(mode: TransportMode) {
  return TRANSPORT_MODES.find(m => m.value === mode) ?? TRANSPORT_MODES[0]
}

function SegmentConnector({ mode, onChange }: { mode: TransportMode; onChange: (m: TransportMode) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const info = getModeInfo(mode)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="flex flex-col items-center py-0.5 relative" ref={ref}>
      <div className="w-px h-3 bg-gray-200" />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all shadow-sm
          ${open ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
      >
        {info.icon}
        <span>{info.shortLabel}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all duration-200 origin-top
          ${open ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'}`}
        style={{ minWidth: '10rem' }}
      >
        <div className="flex p-1.5 gap-1">
          {TRANSPORT_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => { onChange(m.value); setOpen(false) }}
              title={m.label}
              className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors
                ${mode === m.value ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {m.icon}
              <span>{m.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="w-px h-3 bg-gray-200" />
    </div>
  )
}

const MapLibreMapCreator = dynamic(() => import('../../../../components/MapLibreMapCreator'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl">
      <span className="text-gray-500 text-sm">Loading map...</span>
    </div>
  )
})

interface RouteEditClientProps {
  route: any
  buildings: Building[]
}

const availableTags = [
  'architecture', 'historical', 'modern', 'baroque', 'gothic',
  'art-nouveau', 'brutalism', 'classical', 'contemporary',
  'walking', 'family-friendly', 'photography', 'educational'
]

export default function RouteEditClient({ route, buildings }: RouteEditClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const permissions = useEditPermissions('route', route.id)

  const [formData, setFormData] = useState({
    title: route.title || '',
    description: route.description || '',
    city: route.city || '',
    country: route.country || '',
    difficulty_level: route.difficulty_level || 'easy',
    estimated_duration_minutes: route.estimated_duration_minutes || 60,
    route_type: route.route_type || 'walking',
    tags: (route.tags || []) as string[],
  })

  const initialPoints: RoutePoint[] = (route.route_points || []).map((point: any) => ({
    id: point.id,
    route_id: point.route_id,
    building_id: point.building_id,
    order_index: point.order_index,
    title: point.title,
    description: point.description,
    audio_url: point.audio_url,
    audio_duration_seconds: point.audio_duration_seconds,
    latitude: point.latitude,
    longitude: point.longitude,
    instructions: point.instructions,
    estimated_time_minutes: point.estimated_time_minutes,
    point_type: point.point_type,
    created_at: point.created_at,
    duration_minutes: point.estimated_time_minutes,
    buildings: point.buildings || null,
  }))

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(initialPoints)
  const [segmentModes, setSegmentModes] = useState<TransportMode[]>(
    Array(Math.max(0, initialPoints.length - 1)).fill('walking')
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [isAddingPoint, setIsAddingPoint] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Sync segment modes when points change
  useEffect(() => {
    setSegmentModes(prev => {
      const needed = Math.max(0, routePoints.length - 1)
      if (prev.length === needed) return prev
      if (prev.length < needed) return [...prev, ...Array(needed - prev.length).fill('walking')]
      return prev.slice(0, needed)
    })
  }, [routePoints.length])

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }))
  }

  const calculateDistance = () => {
    if (routePoints.length < 2) return 0
    let total = 0
    for (let i = 0; i < routePoints.length - 1; i++) {
      const p1 = routePoints[i], p2 = routePoints[i + 1]
      const dx = (p2.latitude ?? 0) - (p1.latitude ?? 0)
      const dy = (p2.longitude ?? 0) - (p1.longitude ?? 0)
      total += Math.sqrt(dx * dx + dy * dy) * 111
    }
    return Math.round(total * 100) / 100
  }

  // Drag handlers
  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const newPoints = [...routePoints]
    const [dragged] = newPoints.splice(draggedIndex, 1)
    newPoints.splice(index, 0, dragged)
    setRoutePoints(newPoints)
    setDraggedIndex(index)
  }
  const handleDragEnd = () => setDraggedIndex(null)

  const removePoint = (pointId: string) => {
    const idx = routePoints.findIndex(p => p.id === pointId)
    setRoutePoints(prev => prev.filter(p => p.id !== pointId))
    setSegmentModes(prev => {
      if (prev.length === 0) return prev
      const removeIdx = idx > 0 ? idx - 1 : 0
      return prev.filter((_, i) => i !== removeIdx).slice(0, Math.max(0, routePoints.length - 2))
    })
  }

  const addBuildingPoint = (building: Building) => {
    const newPoint: RoutePoint = {
      id: `temp_${Date.now()}`,
      route_id: route.id,
      building_id: building.id,
      order_index: routePoints.length,
      title: building.name,
      description: building.architect ? `${building.architect}${building.year_built ? `, ${building.year_built}` : ''}` : null,
      audio_url: null,
      audio_duration_seconds: null,
      latitude: building.latitude,
      longitude: building.longitude,
      instructions: null,
      estimated_time_minutes: 15,
      point_type: 'building',
      created_at: new Date().toISOString(),
      duration_minutes: 15,
    }
    setRoutePoints(prev => [...prev, newPoint])
  }

  const addCustomPoint = (lat: number, lng: number) => {
    const pointName = prompt('Point name:')
    if (!pointName) return
    const newPoint: RoutePoint = {
      id: `temp_${Date.now()}`,
      route_id: route.id,
      building_id: null,
      order_index: routePoints.length,
      title: pointName,
      description: null,
      audio_url: null,
      audio_duration_seconds: null,
      latitude: lat,
      longitude: lng,
      instructions: null,
      estimated_time_minutes: 10,
      point_type: 'landmark',
      created_at: new Date().toISOString(),
      duration_minutes: 10,
    }
    setRoutePoints(prev => [...prev, newPoint])
  }

  const applyToAll = (mode: TransportMode) => {
    setSegmentModes(Array(Math.max(0, routePoints.length - 1)).fill(mode))
  }

  const saveRoute = async () => {
    if (!formData.title.trim()) { setError('Enter route name'); return }
    if (routePoints.length < 2) { setError('Route must have at least 2 points'); return }

    setLoading(true)
    setError(null)

    try {
      const { error: routeError } = await supabase
        .from('routes')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          city: formData.city.trim(),
          country: formData.country.trim(),
          route_type: formData.route_type,
          difficulty_level: formData.difficulty_level,
          estimated_duration_minutes: formData.estimated_duration_minutes,
          distance_km: calculateDistance(),
          points_count: routePoints.length,
          tags: formData.tags.length > 0 ? formData.tags : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', route.id)

      if (routeError) throw new Error(routeError.message)

      const { error: deleteError } = await supabase
        .from('route_points')
        .delete()
        .eq('route_id', route.id)

      if (deleteError) throw new Error(deleteError.message)

      const { error: pointsError } = await supabase
        .from('route_points')
        .insert(routePoints.map((point, index) => ({
          route_id: route.id,
          building_id: point.building_id,
          order_index: index,
          title: point.title,
          description: point.description,
          audio_url: point.audio_url,
          audio_duration_seconds: point.audio_duration_seconds,
          latitude: point.latitude,
          longitude: point.longitude,
          instructions: point.instructions,
          estimated_time_minutes: point.estimated_time_minutes,
          point_type: point.point_type
        })))

      if (pointsError) throw new Error(pointsError.message)

      setSuccess(true)
      setTimeout(() => router.push(`/routes/${route.id}`), 1500)
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving')
    } finally {
      setLoading(false)
    }
  }

  const deleteRoute = async () => {
    setDeleting(true)
    try {
      await supabase.from('route_points').delete().eq('route_id', route.id)
      const { error } = await supabase.from('routes').delete().eq('id', route.id)
      if (error) throw new Error(error.message)
      router.push('/map')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const globalMode: TransportMode | 'mixed' = segmentModes.length === 0
    ? 'walking'
    : segmentModes.every(m => m === segmentModes[0]) ? segmentModes[0] : 'mixed'

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Save className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Saved!</h2>
          <p className="text-gray-500 text-sm">Redirecting to route page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">Edit Route</h1>
              <p className="text-xs text-gray-400 truncate">
                {route.profiles?.full_name ? `by ${route.profiles.full_name} · ` : ''}
                {new Date(route.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            {permissions.userRole && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                {permissions.userRole === 'admin' ? 'Admin' : permissions.userRole === 'moderator' ? 'Moderator' : 'Author'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete route"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.back()}
              className="hidden sm:flex px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveRoute}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <X className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:text-red-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Route info */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Route Info</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: noCyrillic(e.target.value) }))}
                    placeholder="Route name"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: noCyrillic(e.target.value) }))}
                    rows={3}
                    placeholder="Brief description of the route..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData(p => ({ ...p, city: noCyrillic(e.target.value) }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={e => setFormData(p => ({ ...p, country: noCyrillic(e.target.value) }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min)</label>
                    <input
                      type="number"
                      value={formData.estimated_duration_minutes}
                      onChange={e => setFormData(p => ({ ...p, estimated_duration_minutes: Number(e.target.value) }))}
                      min={1}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Difficulty</label>
                    <select
                      value={formData.difficulty_level}
                      onChange={e => setFormData(p => ({ ...p, difficulty_level: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      formData.tags.includes(tag)
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Buildings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Route Points · {routePoints.length}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMap(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    showMap
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  {showMap ? 'Hide map' : 'Add from map'}
                </button>
              </div>

              {/* Apply-to-all transport strip */}
              {routePoints.length > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <ChevronsDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500 shrink-0">All:</span>
                  <div className="flex gap-1 flex-wrap">
                    {TRANSPORT_MODES.map(m => {
                      const active = globalMode === m.value
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => applyToAll(m.value)}
                          title={m.label}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all
                            ${active ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                        >
                          {m.icon}
                          <span className="hidden sm:inline">{m.shortLabel}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Map panel */}
            {showMap && (
              <div className="h-72 border-b border-gray-100 relative">
                <MapLibreMapCreator
                  buildings={buildings}
                  routePoints={routePoints}
                  isAddingPoint={isAddingPoint}
                  onAddBuildingPoint={addBuildingPoint}
                  onAddCustomPoint={addCustomPoint}
                />
                <button
                  type="button"
                  onClick={() => setIsAddingPoint(v => !v)}
                  className={`absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-all ${
                    isAddingPoint
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isAddingPoint ? '✓ Click to add' : '+ Add point'}
                </button>
              </div>
            )}

            {/* Building list */}
            <div className="flex-1 overflow-y-auto p-5">
              {routePoints.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">No points yet</p>
                  <p className="text-xs mt-1">Open the map to add buildings</p>
                </div>
              ) : (
                <div>
                  {routePoints.map((point, index) => (
                    <div key={point.id}>
                      {/* Point card */}
                      <div
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-all cursor-move bg-white
                          ${draggedIndex === index ? 'opacity-40 scale-95' : ''}`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

                        <div className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                          {index + 1}
                        </div>

                        {/* Thumbnail from building data if available */}
                        {(point.buildings as any)?.image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={getStorageUrl((point.buildings as any).image_url, 'photos')}
                              alt={point.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-gray-300" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{point.title}</p>
                          {point.description && (
                            <p className="text-xs text-gray-400 truncate">{point.description}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removePoint(point.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>

                      {/* Segment connector */}
                      {index < routePoints.length - 1 && (
                        <SegmentConnector
                          mode={segmentModes[index] ?? 'walking'}
                          onChange={m => setSegmentModes(prev => prev.map((v, i) => i === index ? m : v))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats footer */}
            {routePoints.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span><strong className="text-gray-700">{routePoints.length}</strong> points</span>
                  <span><strong className="text-gray-700">~{calculateDistance()} km</strong></span>
                  <span><strong className="text-gray-700">{formData.estimated_duration_minutes} min</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Route?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete <strong className="text-gray-700">"{route.title}"</strong>?
              This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteRoute}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
