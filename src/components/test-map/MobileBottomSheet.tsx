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
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[35] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div className={`
        fixed bottom-0 left-0 right-0
        bg-white border-t-2 border-border
        max-h-[80vh]
        transform transition-transform duration-300
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        z-[45] md:hidden
        rounded-t-2xl
        overflow-hidden
        shadow-2xl
      `}>
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-bold font-display">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-[var(--radius)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-4rem)] p-4">
          {children}
        </div>
      </div>
    </>
  )
}
