'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  showBackdrop?: boolean
  maxHeight?: string
}

const CLOSE_THRESHOLD = 80 // px вниз для закрытия

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showBackdrop = true,
  maxHeight = '70vh'
}: MobileBottomSheetProps) {
  const touchStartY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = e.touches[0].clientY - touchStartY.current
    // Тянем только вниз
    if (dy > 0) setDragY(dy)
  }

  const handleTouchEnd = () => {
    if (dragY > CLOSE_THRESHOLD) {
      onClose()
    }
    setDragY(0)
    setIsDragging(false)
    touchStartY.current = null
  }

  if (!isOpen) return null

  // Opacity backdrop уменьшается по мере перетаскивания
  const dragProgress = Math.min(dragY / CLOSE_THRESHOLD, 1)

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className="fixed inset-0 bg-black/70 z-[35] md:hidden"
          style={{ opacity: 1 - dragProgress * 0.6 }}
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-border z-[45] md:hidden rounded-t-2xl overflow-hidden shadow-2xl"
        style={{
          maxHeight,
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
        }}
      >
        {/* Drag handle — зона для свайпа */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="w-8 h-1 rounded-full transition-colors"
            style={{ backgroundColor: dragY > 20 ? '#9ca3af' : '#d1d5db' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
          <div className="flex-1" />
          <h3 className="flex-1 text-center text-sm font-semibold font-display">{title}</h3>
          <div className="flex-1 flex justify-end">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-[var(--radius)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-2" style={{ maxHeight: `calc(${maxHeight} - 3.5rem)` }}>
          {children}
        </div>
      </div>
    </>
  )
}
