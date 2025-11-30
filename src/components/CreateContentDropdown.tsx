// src/components/CreateContentDropdown.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { PlusCircle, Building, Route, MapPin, ChevronDown } from 'lucide-react'

interface CreateContentDropdownProps {
  onCreateRoute: () => void
  className?: string
}

export function CreateContentDropdown({ 
  onCreateRoute,
  className = '' 
}: CreateContentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreateRoute = () => {
    onCreateRoute()
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Кнопка-триггер */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
      >
        <PlusCircle className="w-5 h-5" />
        <span>Создать</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {/* Добавить здание */}
            <a
              href="/buildings/new"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Добавить здание</div>
                <div className="text-sm text-gray-500">Новый архитектурный объект</div>
              </div>
            </a>

            {/* Создать маршрут */}
            <button
              onClick={handleCreateRoute}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Route className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Создать маршрут</div>
                <div className="text-sm text-gray-500">Архитектурная прогулка</div>
              </div>
            </button>

            {/* Добавить точку интереса (будущая функция) */}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <div className="flex items-center gap-3 px-4 py-3 text-gray-400 cursor-not-allowed">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Точка интереса</div>
                  <div className="text-sm text-gray-400">Скоро доступно</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}