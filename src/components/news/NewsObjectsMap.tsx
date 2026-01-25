// components/news/NewsObjectsMap.tsx
// Карта с маркерами связанных зданий для страницы детальной новости

'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Building } from '@/types/building';
import { MapPin } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

// Минимальный тип здания для карты новости
type NewsBuilding = Pick<Building, 'id' | 'name'> & Partial<Pick<Building, 'latitude' | 'longitude' | 'image_url' | 'architect' | 'year_built' | 'city'>>;

interface NewsObjectsMapProps {
  buildings?: NewsBuilding[];
  onBuildingClick?: (buildingId: string) => void;
  className?: string;
}

// Тип для маркера на карте
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

// ============================================================
// ДИНАМИЧЕСКИЙ ИМПОРТ КАРТЫ
// ============================================================

// Динамически загружаем Leaflet map компонент (только на клиенте)
const LeafletNewsMap = dynamic(
  () => import('./LeafletNewsMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="text-gray-400 text-sm">Загрузка карты...</div>
      </div>
    )
  }
);

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function NewsObjectsMap({
  buildings,
  onBuildingClick,
  className = ''
}: NewsObjectsMapProps) {

  // Конвертируем здания в маркеры для карты
  const markers = useMemo(() => {
    return (buildings || [])
      .filter(b => b.latitude && b.longitude)
      .map(building => ({
        id: building.id,
        name: building.name,
        latitude: building.latitude!,
        longitude: building.longitude!,
        image_url: building.image_url,
        architect: building.architect,
        year_built: building.year_built,
        city: building.city,
      }));
  }, [buildings]);

  // Если нет зданий с координатами
  if (markers.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 p-8 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          Для связанных зданий не указаны координаты
        </p>
      </div>
    );
  }

  // Вычисляем центр карты и zoom
  const mapCenter = useMemo(() => {
    if (markers.length === 1) {
      return {
        lat: markers[0].latitude,
        lng: markers[0].longitude,
        zoom: 15
      };
    }

    // Находим центр всех маркеров
    const latSum = markers.reduce((sum, m) => sum + m.latitude, 0);
    const lngSum = markers.reduce((sum, m) => sum + m.longitude, 0);

    return {
      lat: latSum / markers.length,
      lng: lngSum / markers.length,
      zoom: 13
    };
  }, [markers]);

  // Обработка клика по карте
  const handleMapClick = () => {
    // Переходим на /map с координатами центра
    const lat = mapCenter.lat.toFixed(6);
    const lng = mapCenter.lng.toFixed(6);
    window.location.href = `/map?lat=${lat}&lng=${lng}&zoom=${mapCenter.zoom}`;
  };

  return (
    <div className={`bg-white border border-gray-200 overflow-hidden ${className}`}>
      {/* Заголовок */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Упоминаемые здания на карте ({markers.length})
        </h3>
      </div>

      {/* Карта */}
      <div
        className="relative h-[400px] cursor-pointer group"
        onClick={handleMapClick}
        title="Click to open on full map"
      >
        {/* Overlay для hover эффекта */}
        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity z-10 pointer-events-none" />

        <LeafletNewsMap
          center={mapCenter}
          markers={markers}
          onMarkerClick={onBuildingClick}
        />
      </div>

      {/* Легенда */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Нажмите на маркер для информации о здании
        </p>
        <button
          onClick={handleMapClick}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
        >
          Открыть на полной карте →
        </button>
      </div>
    </div>
  );
}
