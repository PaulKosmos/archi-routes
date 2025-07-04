'use client';

import { useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';

interface Building {
  id: string;
  name: string;
  description: string;
  architect: string;
  year_built: number;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
}

interface GoogleMapProps {
  buildings: Building[];
}

export default function GoogleMap({ buildings }: GoogleMapProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  
  // Центр карты (Берлин)
  const center = { lat: 52.5200, lng: 13.4050 };
  
  console.log('🗺️ Отображаем здания на карте:', buildings);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-96 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">❌ Google Maps API ключ не найден</p>
          <p className="text-red-500 text-sm mt-1">
            Добавь NEXT_PUBLIC_GOOGLE_MAPS_API_KEY в .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg relative">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          style={{ width: '100%', height: '100%' }}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          clickableIcons={false}
          mapTypeControl={true}
          streetViewControl={true}
          fullscreenControl={true}
        >
          {/* Маркеры зданий */}
          {buildings.map((building) => (
            <Marker
              key={building.id}
              position={{ 
                lat: Number(building.latitude), 
                lng: Number(building.longitude) 
              }}
              onClick={() => {
                setSelectedBuilding(building);
                console.log('🏢 Выбрано здание:', building.name);
              }}
              title={building.name}
            />
          ))}

          {/* InfoWindow для выбранного здания */}
          {selectedBuilding && (
            <InfoWindow
              position={{ 
                lat: Number(selectedBuilding.latitude), 
                lng: Number(selectedBuilding.longitude) 
              }}
              onCloseClick={() => setSelectedBuilding(null)}
            >
              <div className="p-3 max-w-xs">
                <h3 className="font-bold text-lg mb-2 text-gray-900">
                  {selectedBuilding.name}
                </h3>
                
                <div className="space-y-2 text-sm">
                  {selectedBuilding.architect && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Архитектор:</span> {selectedBuilding.architect}
                    </p>
                  )}
                  
                  {selectedBuilding.year_built && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Год постройки:</span> {selectedBuilding.year_built}
                    </p>
                  )}
                  
                  {selectedBuilding.address && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Адрес:</span> {selectedBuilding.address}
                    </p>
                  )}
                </div>
                
                {selectedBuilding.description && (
                  <p className="text-gray-600 text-sm mt-3 leading-relaxed">
                    {selectedBuilding.description}
                  </p>
                )}
                
                <div className="flex space-x-2 mt-4">
                  <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                    Подробнее
                  </button>
                  <button className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors">
                    В маршрут
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
      
      {/* Информационная панель */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-3 py-2 rounded shadow text-xs text-gray-600">
        📍 Зданий на карте: {buildings.length}
      </div>
      
      {/* Контролы */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded shadow text-xs text-gray-600">
        🗺️ Google Maps
      </div>
    </div>
  );
}