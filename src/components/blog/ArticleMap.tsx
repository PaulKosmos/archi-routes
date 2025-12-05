'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@/styles/leaflet-popup-fix.css'

// Исправляем проблему с иконками Leaflet только на клиенте
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

interface Building {
  id: string
  name: string
  city: string
  architect?: string
  year_built?: number
  architectural_style?: string
  latitude: number
  longitude: number
  image_url?: string
  rating?: number
  description?: string
}

interface ArticleMapProps {
  buildings: any[]
  selectedBuildingId?: string
  selectedBuildings?: string[] // Массив выбранных зданий для маршрута
  onBuildingSelect?: (buildingId: string) => void
  onAddToRoute?: (building: Building) => void
}

export default function ArticleMap({ 
  buildings, 
  selectedBuildingId, 
  selectedBuildings = [],
  onBuildingSelect,
  onAddToRoute 
}: ArticleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const buildingMarkersRef = useRef<{ [key: string]: L.Marker }>({})
  const [mapInitialized, setMapInitialized] = useState(false)

  // Фильтруем здания с валидными координатами
  const validBuildings: Building[] = buildings
    .map(b => b.building)
    .filter(b => b && b.latitude && b.longitude && !isNaN(b.latitude) && !isNaN(b.longitude))

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || validBuildings.length === 0) return

    // Создаем карту
    mapInstance.current = L.map(mapRef.current, {
      center: [validBuildings[0].latitude, validBuildings[0].longitude],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true
    })

    // Добавляем тайловый слой
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CartoDB',
      maxZoom: 19
    }).addTo(mapInstance.current)

    // Создаем слой для маркеров
    markersLayer.current = L.layerGroup().addTo(mapInstance.current)

    setMapInitialized(true)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
        setMapInitialized(false)
      }
    }
  }, [validBuildings.length])

  // Обновление маркеров
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current || !mapInitialized) return

    // Очищаем предыдущие маркеры
    markersLayer.current.clearLayers()
    buildingMarkersRef.current = {}

    const coordinates: [number, number][] = []

    // Добавляем маркеры для каждого здания
    validBuildings.forEach((building, index) => {
      const isSelected = selectedBuildingId === building.id
      const isInRoute = selectedBuildings.includes(building.id)
      
      // Определяем цвет маркера
      const markerColor = isInRoute ? '#10B981' : isSelected ? '#EF4444' : '#3B82F6'

      // Создаем кастомную иконку
      const customIcon = L.divIcon({
        className: 'custom-building-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            color: white;
            border-radius: 50%;
            width: ${isSelected || isInRoute ? '32px' : '28px'};
            height: ${isSelected || isInRoute ? '32px' : '28px'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected || isInRoute ? '16px' : '14px'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${isInRoute ? '✓' : index + 1}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      })
      
      const marker = L.marker([building.latitude, building.longitude], { icon: customIcon })
      coordinates.push([building.latitude, building.longitude])
      
      // Сохраняем маркер в ref
      buildingMarkersRef.current[building.id] = marker
      
      // Создаем попап с информацией о здании
      const popupContent = `
        <div style="min-width: 280px; max-width: 350px;">
          <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: #1F2937; line-height: 1.3;">
            ${building.name}
          </h3>
          
          ${building.image_url ? `
            <img 
              src="${building.image_url}" 
              alt="${building.name}"
              style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;"
            />
          ` : ''}
          
          <div style="margin-bottom: 8px;">
            ${building.architect ? `
              <p style="margin: 4px 0; font-size: 14px;">
                <strong style="color: #374151;">Архитектор:</strong> 
                <span style="color: #6B7280;">${building.architect}</span>
              </p>
            ` : ''}
            ${building.year_built ? `
              <p style="margin: 4px 0; font-size: 14px;">
                <strong style="color: #374151;">Год постройки:</strong> 
                <span style="color: #6B7280;">${building.year_built}</span>
              </p>
            ` : ''}
            ${building.architectural_style ? `
              <p style="margin: 4px 0; font-size: 14px;">
                <strong style="color: #374151;">Стиль:</strong> 
                <span style="color: #6B7280;">${building.architectural_style}</span>
              </p>
            ` : ''}
          </div>
          
          ${building.description ? `
            <p style="margin: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.4;">
              ${building.description.length > 100 ? building.description.substring(0, 100) + '...' : building.description}
            </p>
          ` : ''}
          
          <div style="margin: 12px 0 8px 0; padding-top: 8px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
              📍 ${building.city}
            </p>
            ${building.rating ? `
              <div style="margin-top: 4px; font-size: 14px; color: #F59E0B;">
                ⭐ ${building.rating}/5
              </div>
            ` : ''}
          </div>
          
          <div style="margin-top: 12px; text-align: center;">
            ${!isInRoute && onAddToRoute ? `
              <button 
                onclick="window.addBuildingToRouteFromBlog && window.addBuildingToRouteFromBlog('${building.id}')"
                style="background: #059669; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-right: 8px; transition: background-color 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                onmouseover="this.style.backgroundColor='#047857'"
                onmouseout="this.style.backgroundColor='#059669'"
              >
                ➕ Добавить в маршрут
              </button>
            ` : isInRoute ? `
              <div style="background: #10B981; color: white; padding: 10px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; margin-right: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ✓ В маршруте
              </div>
            ` : ''}
            <button 
              onclick="window.location.href='/buildings/${building.id}'"
              style="background: #3B82F6; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
              onmouseover="this.style.backgroundColor='#2563EB'"
              onmouseout="this.style.backgroundColor='#3B82F6'"
            >
              📖 Подробнее
            </button>
          </div>
        </div>
      `
      
      marker.bindPopup(popupContent, {
        maxWidth: 400,
        className: 'building-popup-blog',
        closeButton: true,
        autoClose: false,
        autoPan: false  // Как на главной странице
      })
      
      // События для маркера - УЛУЧШЕННАЯ ЛОГИКА
      let popupTimeout: NodeJS.Timeout | null = null
      
      marker.on('mouseover', () => {
        // Очищаем таймаут закрытия если он есть
        if (popupTimeout) {
          clearTimeout(popupTimeout)
          popupTimeout = null
        }
        
        const hoverTimeout = setTimeout(() => {
          marker.openPopup()
        }, 150)
        
        marker.on('mouseout', () => {
          clearTimeout(hoverTimeout)
        }, { once: true })
      })

      marker.on('mouseout', () => {
        // Запускаем таймаут закрытия
        popupTimeout = setTimeout(() => {
          if (marker.getPopup()?.isOpen()) {
            marker.closePopup()
          }
          popupTimeout = null
        }, 200) // Увеличиваем задержку
      })
      
      // Обрабатываем наведение на попап
      marker.on('popupopen', () => {
        const popup = marker.getPopup()
        if (popup) {
          const popupElement = popup.getElement()
          if (popupElement) {
            // Когда курсор на попапе - отменяем закрытие
            popupElement.addEventListener('mouseenter', () => {
              if (popupTimeout) {
                clearTimeout(popupTimeout)
                popupTimeout = null
              }
            })
            
            // Когда курсор уходит с попапа - закрываем
            popupElement.addEventListener('mouseleave', () => {
              popupTimeout = setTimeout(() => {
                marker.closePopup()
                popupTimeout = null
              }, 200)
            })
          }
        }
      })
      
      // Клик по маркеру только для выделения
      marker.on('click', () => {
        // Сначала уведомляем о выборе (это поменяет цвет)
        if (onBuildingSelect) {
          onBuildingSelect(building.id)
        }
      })
      
      markersLayer.current?.addLayer(marker)
    })

    // Подгоняем карту под все здания
    if (coordinates.length > 0) {
      if (coordinates.length === 1) {
        mapInstance.current.setView(coordinates[0], 15)
      } else {
        const bounds = L.latLngBounds(coordinates)
        mapInstance.current.fitBounds(bounds, { padding: [20, 20] })
      }
    }

  }, [validBuildings, mapInitialized, selectedBuildingId, selectedBuildings, onBuildingSelect, onAddToRoute])

  // Глобальная функция для добавления в маршрут из попапа
  useEffect(() => {
    (window as any).addBuildingToRouteFromBlog = (buildingId: string) => {
      const building = validBuildings.find(b => b.id === buildingId)
      
      if (building && onAddToRoute) {
        onAddToRoute(building)
      }
    }

    return () => {
      delete (window as any).addBuildingToRouteFromBlog
    }
  }, [validBuildings, onAddToRoute])

  if (validBuildings.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
            🏗️
          </div>
          <p className="text-sm">Нет зданий</p>
          <p className="text-sm">с координатами</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 relative">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '300px', position: 'relative', zIndex: 1 }}
      />

      {/* Кастомные стили - КОПИРУЕМ С ГЛАВНОЙ СТРАНИЦЫ */}
      <style jsx global>{`
        .building-popup-blog .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #E5E7EB;
        }
        .building-popup-blog .leaflet-popup-content {
          margin: 16px;
          line-height: 1.4;
        }
        .building-popup-blog .leaflet-popup-tip {
          border-top-color: #E5E7EB;
        }
        
        /* КРИТИЧНО: Максимальный z-index для попапов */}
        .leaflet-popup-pane {
          z-index: 9999 !important;
        }
        
        .leaflet-popup {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
        
        .leaflet-popup-content-wrapper {
          z-index: 10000 !important;
          pointer-events: auto !important;
        }
        
        .building-popup-blog {
          z-index: 10001 !important;
        }
        
        /* Убеждаемся что карта имеет меньший z-index */}
        .leaflet-container {
          z-index: 1 !important;
          cursor: default;
        }
        
        .leaflet-map-pane {
          z-index: 1 !important;
        }
        
        .leaflet-tile-pane {
          z-index: 1 !important;
        }
        
        .leaflet-overlay-pane {
          z-index: 2 !important;
        }
        
        .leaflet-marker-pane {
          z-index: 3 !important;
        }
        
        .custom-building-marker {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          z-index: 500;
          cursor: pointer;
        }
        .custom-building-marker:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
          z-index: 600;
        }
        
        .leaflet-marker-icon {
          cursor: pointer;
        }
        .leaflet-marker-icon:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  )
}