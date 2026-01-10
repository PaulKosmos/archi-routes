// src/components/buildings/BuildingMap.tsx

'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Building } from '@/types/building'

interface BuildingMapProps {
  building: Building
  className?: string
}

export default function BuildingMap({ building, className = "h-48" }: BuildingMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Инициализация карты
    const map = L.map(containerRef.current, {
      center: [building.latitude, building.longitude],
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true
    })

    // Добавляем тайлы
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 19
    }).addTo(map)

    // Создаем кастомную иконку для здания
    const buildingIcon = L.divIcon({
      html: `
        <div class="building-marker">
          <div class="building-marker-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17H4V9L12 4.5L20 9V17H22V7L12 2Z" fill="white"/>
              <path d="M6 9V19H18V9L12 5.5L6 9Z" fill="currentColor"/>
              <rect x="8" y="11" width="2" height="2" fill="white"/>
              <rect x="14" y="11" width="2" height="2" fill="white"/>
              <rect x="8" y="14" width="2" height="2" fill="white"/>
              <rect x="14" y="14" width="2" height="2" fill="white"/>
              <rect x="11" y="16" width="2" height="3" fill="white"/>
            </svg>
          </div>
        </div>
      `,
      className: 'building-marker-container',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    })

    // Добавляем маркер здания
    const marker = L.marker([building.latitude, building.longitude], {
      icon: buildingIcon
    }).addTo(map)

    // Добавляем popup с информацией о здании
    const popupContent = `
      <div class="building-popup">
        <h3 class="font-semibold text-sm mb-1">${building.name}</h3>
        ${building.architect ? `<p class="text-xs text-gray-600 mb-1">Arch.: ${building.architect}</p>` : ''}
        ${building.year_built ? `<p class="text-xs text-gray-600 mb-1">${building.year_built}</p>` : ''}
        ${building.address ? `<p class="text-xs text-gray-500">${building.address}</p>` : ''}
      </div>
    `

    marker.bindPopup(popupContent, {
      maxWidth: 250,
      className: 'building-popup-container'
    })

    mapRef.current = map

    // Cleanup функция
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [building.latitude, building.longitude, building.name, building.architect, building.year_built, building.address])

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Стили для маркера */}
      <style jsx global>{`
        .building-marker-container {
          background: none !important;
          border: none !important;
        }
        
        .building-marker {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .building-marker-inner {
          width: 32px;
          height: 32px;
          background: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        
        .building-marker-inner:hover {
          background: #2563EB;
          transform: scale(1.1);
        }
        
        .building-popup-container .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 0;
        }
        
        .building-popup-container .leaflet-popup-content {
          margin: 0;
          padding: 12px;
        }
        
        .building-popup-container .leaflet-popup-tip {
          background: white;
        }
        
        .building-popup h3 {
          margin: 0 0 4px 0;
          font-weight: 600;
          color: #1F2937;
        }
        
        .building-popup p {
          margin: 0 0 2px 0;
          line-height: 1.3;
        }
        
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  )
}
