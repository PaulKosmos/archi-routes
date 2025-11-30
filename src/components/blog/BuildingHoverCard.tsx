'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Star, 
  Route,
  Heart,
  ExternalLink,
  Plus
} from 'lucide-react'
import Link from 'next/link'

interface BuildingHoverCardProps {
  building: any
  children: React.ReactNode
  onAddToRoute?: (building: any) => void
  onAddToFavorites?: (building: any) => void
}

export default function BuildingHoverCard({ 
  building, 
  children, 
  onAddToRoute,
  onAddToFavorites 
}: BuildingHoverCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const hoverRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop
    
    // Позиционируем карточку сверху или снизу от элемента
    const cardHeight = 350 // примерная высота карточки
    const cardWidth = 320 // ширина карточки
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceLeft = rect.left
    const spaceRight = window.innerWidth - rect.right
    
    // Вычисляем позицию X (центрируем относительно элемента)
    let x = rect.left + scrollX + (rect.width / 2) - (cardWidth / 2)
    
    // Проверяем, не выходит ли карточка за границы экрана
    if (x < 10) {
      x = 10 // минимальный отступ слева
    } else if (x + cardWidth > window.innerWidth - 10) {
      x = window.innerWidth - cardWidth - 10 // отступ справа
    }
    
    // Вычисляем позицию Y
    let y
    if (spaceBelow > cardHeight || spaceBelow > spaceAbove) {
      // Показываем снизу
      y = rect.bottom + scrollY + 10
    } else {
      // Показываем сверху
      y = rect.top + scrollY - cardHeight - 10
    }

    setPosition({ x, y })
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 300) // Увеличили задержку для стабильности
  }

  const handleCardMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleCardMouseLeave = () => {
    setIsVisible(false)
  }

  const formatDate = (year?: number) => {
    return year ? year.toString() : 'Неизвестно'
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <span
        ref={hoverRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="building-mention cursor-pointer hover:bg-blue-100 px-1 py-0.5 rounded transition-colors bg-blue-50 text-blue-800 border-b border-blue-300 relative"
      >
        {children}
      </span>

      {/* Hover Card */}
      {isVisible && (
        <div
          ref={cardRef}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 building-hover-card"
          style={{
            left: position.x - 160, // центрируем карточку
            top: position.y
          }}
        >
          {/* Изображение здания */}
          <div className="relative h-32 bg-gray-200 rounded-lg overflow-hidden mb-3">
            {building.image_url ? (
              <img
                src={building.image_url}
                alt={building.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {/* Иконка архитектурного стиля */}
            {building.architectural_style && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                {building.architectural_style}
              </div>
            )}
          </div>

          {/* Основная информация */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
              {building.name}
            </h4>

            <div className="space-y-1 text-xs text-gray-600">
              {building.architect && (
                <p className="flex items-center">
                  <span className="font-medium mr-1">Архитектор:</span>
                  <span className="truncate">{building.architect}</span>
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{building.city}</span>
                </div>
                
                {building.year_built && (
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{formatDate(building.year_built)}</span>
                  </div>
                )}
              </div>

              {building.rating && (
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                  <span>{building.rating.toFixed(1)}</span>
                  <span className="text-gray-400 ml-1">из 5</span>
                </div>
              )}
            </div>

            {/* Краткое описание */}
            {building.description && (
              <p className="text-xs text-gray-700 line-clamp-2 mt-2">
                {building.description}
              </p>
            )}
          </div>

          {/* Действия */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {onAddToRoute && (
                <button
                  onClick={() => onAddToRoute(building)}
                  className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  title="Добавить в маршрут"
                >
                  <Route className="w-3 h-3" />
                  <span>Маршрут</span>
                </button>
              )}
              
              {onAddToFavorites && (
                <button
                  onClick={() => onAddToFavorites(building)}
                  className="flex items-center space-x-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                  title="Добавить в избранное"
                >
                  <Heart className="w-3 h-3" />
                  <span>Избранное</span>
                </button>
              )}
            </div>

            <Link
              href={`/buildings/${building.id}`}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => setIsVisible(false)}
            >
              <ExternalLink className="w-3 h-3" />
              <span>Подробнее</span>
            </Link>
          </div>

          {/* Треугольная стрелка */}
          <div 
            className="absolute w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"
            style={{
              left: '50%',
              marginLeft: '-6px',
              [position.y < window.innerHeight / 2 ? 'bottom' : 'top']: '-6px'
            }}
          />
        </div>
      )}
    </>
  )
}