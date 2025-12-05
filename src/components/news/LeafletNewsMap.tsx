// components/news/LeafletNewsMap.tsx
// Leaflet карта для отображения связанных зданий в новости

'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// ТИПЫ
// ============================================================

interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  architect?: string;
  year_built?: number;
  city?: string;
}

interface LeafletNewsMapProps {
  center: { lat: number; lng: number; zoom: number };
  markers: MapMarker[];
  onMarkerClick?: (buildingId: string) => void;
}

// ============================================================
// FIX LEAFLET ICONS
// ============================================================

// Исправление стандартных иконок Leaflet только на клиенте
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Кастомная иконка для зданий (как в EnhancedMap)
const createBuildingIcon = () => {
  const color = '#3B82F6'; // Синий цвет как в EnhancedMap
  const size = 32;

  return L.divIcon({
    className: 'custom-building-icon',
    html: `
      <div class="building-marker" style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        color: white;
        transform: translate(-50%, -50%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        🏛️
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  });
};

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function LeafletNewsMap({
  center,
  markers,
  onMarkerClick
}: LeafletNewsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Инициализация карты
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Создаем карту
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: center.zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // Добавляем tile layer (CartoDB light как в EnhancedMap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CartoDB',
      maxZoom: 19,
    }).addTo(map);

    // Создаем слой для маркеров
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Cleanup при unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Обновление маркеров
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Очищаем старые маркеры
    markersLayerRef.current.clearLayers();

    // Добавляем новые маркеры
    const bounds: L.LatLngBoundsExpression = [];

    markers.forEach(marker => {
      const latLng: L.LatLngExpression = [marker.latitude, marker.longitude];
      bounds.push(latLng);

      // Создаем popup контент
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          ${marker.image_url ? `
            <img
              src="${marker.image_url}"
              alt="${marker.name}"
              class="w-full h-32 object-cover rounded-lg mb-2"
            />
          ` : ''}
          <h4 class="font-semibold text-gray-900 mb-1">${marker.name}</h4>
          ${marker.architect ? `
            <p class="text-sm text-gray-600 mb-0.5">
              <strong>Архитектор:</strong> ${marker.architect}
            </p>
          ` : ''}
          ${marker.year_built ? `
            <p class="text-sm text-gray-600 mb-0.5">
              <strong>Год:</strong> ${marker.year_built}
            </p>
          ` : ''}
          ${marker.city ? `
            <p class="text-sm text-gray-600 mb-2">
              <strong>Город:</strong> ${marker.city}
            </p>
          ` : ''}
          <button
            onclick="window.dispatchEvent(new CustomEvent('building-marker-click', { detail: '${marker.id}' }))"
            class="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Подробнее
          </button>
        </div>
      `;

      // Создаем маркер
      const mapMarker = L.marker(latLng, { icon: createBuildingIcon() })
        .bindPopup(popupContent, {
          maxWidth: 300,
          className: 'news-building-popup'
        });

      markersLayerRef.current?.addLayer(mapMarker);
    });

    // Подгоняем bounds если маркеров больше одного
    if (markers.length > 1 && bounds.length > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15
      });
    } else if (markers.length === 1) {
      mapRef.current.setView([markers[0].latitude, markers[0].longitude], center.zoom);
    }
  }, [markers, center.zoom]);

  // Обработка клика по маркеру
  useEffect(() => {
    if (!onMarkerClick) return;

    const handleMarkerClick = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      onMarkerClick(customEvent.detail);
    };

    window.addEventListener('building-marker-click', handleMarkerClick);

    return () => {
      window.removeEventListener('building-marker-click', handleMarkerClick);
    };
  }, [onMarkerClick]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
}
