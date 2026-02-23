'use client'

import { useState, useEffect, useRef } from 'react'
import { X, GripVertical, Trash2, MapPin, Save, Footprints, Bike, Car, Bus, ChevronDown, ChevronsDown } from 'lucide-react'
import { Building } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'
import { noCyrillic } from '@/lib/utils'

export type TransportMode = 'walking' | 'cycling' | 'driving' | 'public_transport'

const TRANSPORT_MODES: {
  value: TransportMode
  label: string
  shortLabel: string
  icon: React.ReactNode
}[] = [
  { value: 'walking',          label: 'Walking',  shortLabel: 'Walk',    icon: <Footprints className="w-4 h-4" /> },
  { value: 'cycling',          label: 'Cycling',  shortLabel: 'Bike',    icon: <Bike        className="w-4 h-4" /> },
  { value: 'driving',          label: 'By car',   shortLabel: 'Car',     icon: <Car         className="w-4 h-4" /> },
  { value: 'public_transport', label: 'Transit',  shortLabel: 'Transit', icon: <Bus         className="w-4 h-4" /> },
]

function getModeInfo(mode: TransportMode) {
  return TRANSPORT_MODES.find(m => m.value === mode) ?? TRANSPORT_MODES[0]
}

// Скорости транспорта в км/ч для локального расчёта (без API)
const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  walking: 5,
  cycling: 15,
  driving: 40,
  public_transport: 20,
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatSegmentDist(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatSegmentTime(meters: number, mode: TransportMode): string {
  const minutes = Math.round((meters / 1000) / TRANSPORT_SPEEDS[mode] * 60)
  return minutes < 1 ? '<1 min' : `${minutes} min`
}

/** Компактный переключатель режима между двумя зданиями */
function SegmentConnector({
  mode,
  onChange,
  fromLat,
  fromLon,
  toLat,
  toLon,
}: {
  mode: TransportMode
  onChange: (m: TransportMode) => void
  fromLat: number
  fromLon: number
  toLat: number
  toLon: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const info = getModeInfo(mode)

  const distMeters = haversineMeters(fromLat, fromLon, toLat, toLon)

  // Закрываем по клику вне
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
      {/* верхняя линия */}
      <div className="w-px h-3 bg-gray-200" />

      {/* кнопка-переключатель + метрики */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all shadow-sm
            ${open
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
        >
          {info.icon}
          <span className="hidden sm:inline">{info.shortLabel}</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Расстояние и время — мгновенный локальный расчёт */}
        <span className="text-[11px] text-gray-400 tabular-nums select-none">
          ~{formatSegmentDist(distMeters)} · {formatSegmentTime(distMeters, mode)}
        </span>
      </div>

      {/* шторка с вариантами */}
      <div
        className={`absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden
          transition-all duration-200 origin-top
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
                ${mode === m.value
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {m.icon}
              <span>{m.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* нижняя линия */}
      <div className="w-px h-3 bg-gray-200" />
    </div>
  )
}

interface PersonalRouteCreationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBuildings: Building[]
  onRemoveBuilding: (buildingId: string) => void
  onReorderBuildings: (buildingIds: string[]) => void
  onSave: (routeName: string, segmentModes: TransportMode[]) => Promise<void>
}

export default function PersonalRouteCreationModal({
  isOpen,
  onClose,
  selectedBuildings,
  onRemoveBuilding,
  onReorderBuildings,
  onSave,
}: PersonalRouteCreationModalProps) {
  const [routeName, setRouteName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [localBuildings, setLocalBuildings] = useState<Building[]>(selectedBuildings)

  // Режимы между каждой парой зданий: length = buildings.length - 1
  const [segmentModes, setSegmentModes] = useState<TransportMode[]>(() =>
    Array(Math.max(0, selectedBuildings.length - 1)).fill('walking')
  )

  // Синхронизируем при изменении входящего списка
  useEffect(() => {
    setLocalBuildings(selectedBuildings)
    setSegmentModes(prev => {
      const needed = Math.max(0, selectedBuildings.length - 1)
      if (prev.length === needed) return prev
      if (prev.length < needed) return [...prev, ...Array(needed - prev.length).fill('walking')]
      return prev.slice(0, needed)
    })
  }, [selectedBuildings])

  if (!isOpen) return null

  /* ── helpers ── */
  const applyToAll = (mode: TransportMode) => {
    setSegmentModes(Array(Math.max(0, localBuildings.length - 1)).fill(mode))
  }

  const setSegmentMode = (idx: number, mode: TransportMode) => {
    setSegmentModes(prev => prev.map((m, i) => i === idx ? mode : m))
  }

  const handleSave = async () => {
    if (!routeName.trim()) { alert('Please enter route name'); return }
    if (localBuildings.length < 2) { alert('Add at least 2 objects to create a route'); return }

    setIsSaving(true)
    try {
      onReorderBuildings(localBuildings.map(b => b.id))
      await onSave(routeName, segmentModes)
      setRouteName('')
      onClose()
    } catch (err) {
      console.error('Error saving route:', err)
    } finally {
      setIsSaving(false)
    }
  }

  /* ── drag-and-drop ── */
  const handleDragStart = (index: number) => setDraggedIndex(index)

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newBuildings = [...localBuildings]
    const [dragged] = newBuildings.splice(draggedIndex, 1)
    newBuildings.splice(index, 0, dragged)

    // Переставляем и сегменты вместе со зданиями
    const newModes = [...segmentModes]
    const fromSeg = draggedIndex < localBuildings.length - 1 ? draggedIndex : draggedIndex - 1
    const toSeg   = index        < localBuildings.length - 1 ? index        : index - 1
    const [draggedMode] = newModes.splice(fromSeg, 1)
    newModes.splice(toSeg, 0, draggedMode)

    setLocalBuildings(newBuildings)
    setSegmentModes(newModes.slice(0, Math.max(0, newBuildings.length - 1)))
    setDraggedIndex(index)
  }

  const handleDragEnd = () => setDraggedIndex(null)

  const handleRemove = (buildingId: string) => {
    const idx = localBuildings.findIndex(b => b.id === buildingId)
    setLocalBuildings(prev => prev.filter(b => b.id !== buildingId))
    setSegmentModes(prev => {
      if (prev.length === 0) return prev
      // Убираем сегмент перед удалённым зданием (или после, если это последнее)
      const removeIdx = idx > 0 ? idx - 1 : 0
      return prev.filter((_, i) => i !== removeIdx).slice(0, Math.max(0, localBuildings.length - 2))
    })
    onRemoveBuilding(buildingId)
  }

  /* ── render ── */
  // Определяем «глобальный» режим для показа активного в apply-all
  const globalMode: TransportMode | 'mixed' = segmentModes.length === 0
    ? 'walking'
    : segmentModes.every(m => m === segmentModes[0]) ? segmentModes[0] : 'mixed'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 shrink-0">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            Create personal route
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

          {/* Building list with segment connectors */}
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Objects: {localBuildings.length}
              </h3>
              {localBuildings.length > 1 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <GripVertical className="w-3 h-3" /> drag to reorder
                </span>
              )}
            </div>

            {/* Apply-to-all strip */}
            {localBuildings.length > 1 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <ChevronsDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 shrink-0">All segments:</span>
                <div className="flex gap-1 flex-wrap">
                  {TRANSPORT_MODES.map(m => {
                    const active = globalMode === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => applyToAll(m.value)}
                        title={`Apply "${m.label}" to all segments`}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all
                          ${active
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }`}
                      >
                        {m.icon}
                        <span className="hidden sm:inline">{m.shortLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Buildings + connectors */}
            <div>
              {localBuildings.map((building, index) => (
                <div key={building.id}>
                  {/* Building card */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-all cursor-move bg-white
                      ${draggedIndex === index ? 'opacity-40 scale-95' : ''}`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

                    {/* Number badge */}
                    <div className="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    {building.image_url ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={getStorageUrl(building.image_url, 'photos')}
                          alt={building.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-gray-300" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{building.name}</p>
                      <p className="text-xs text-gray-400 truncate">{building.city}, {building.country}</p>
                    </div>

                    <button
                      onClick={() => handleRemove(building.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>

                  {/* Segment connector between buildings */}
                  {index < localBuildings.length - 1 && (
                    <SegmentConnector
                      mode={segmentModes[index] ?? 'walking'}
                      onChange={(m) => setSegmentMode(index, m)}
                      fromLat={building.latitude}
                      fromLon={building.longitude}
                      toLat={localBuildings[index + 1].latitude}
                      toLon={localBuildings[index + 1].longitude}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Route name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Route name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(noCyrillic(e.target.value))}
              placeholder="E.g.: My Berlin Walk"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={100}
            />
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            Personal route — visible only to you. Editable later.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!routeName.trim() || localBuildings.length < 2 || isSaving}
            className="px-5 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create route
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
