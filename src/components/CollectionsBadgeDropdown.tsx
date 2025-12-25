'use client'

import { useState, useRef, useEffect } from 'react'
import { Folder, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface CollectionsBadgeDropdownProps {
  collections: Array<{ id: string; name: string }>
  className?: string
}

export default function CollectionsBadgeDropdown({ collections, className = '' }: CollectionsBadgeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (collections.length === 0) return null

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Кнопка-бейдж */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500 text-white text-xs rounded-full hover:bg-indigo-600 transition-colors shadow-sm"
      >
        <Folder className="w-3 h-3" />
        <span>В коллекциях ({collections.length})</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-[var(--radius)] shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground">Добавлено в коллекции:</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="block px-3 py-2 hover:bg-accent transition-colors text-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">{collection.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
