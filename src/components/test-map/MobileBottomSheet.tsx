'use client'

import { X } from 'lucide-react'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children
}: MobileBottomSheetProps) {
  // Не рендерим sheet вообще, если он закрыт (для оптимизации и избежания проблем с z-index)
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-[35] md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={`
        fixed bottom-0 left-0 right-0
        bg-white border-t-2 border-border
        max-h-[80vh]
        transform transition-transform duration-300
        translate-y-0
        z-[45] md:hidden
        rounded-t-2xl
        overflow-hidden
        shadow-2xl
      `}>
        {/* Compact Header with handle bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          {/* Handle bar (visual indicator) */}
          <div className="flex-1 flex justify-center">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Title - compact */}
          <h3 className="flex-1 text-center text-sm font-semibold font-display">{title}</h3>

          {/* Close button */}
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
        <div className="overflow-y-auto max-h-[calc(80vh-4rem)] p-4">
          {children}
        </div>
      </div>
    </>
  )
}
