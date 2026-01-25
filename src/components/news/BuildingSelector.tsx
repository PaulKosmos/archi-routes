// components/news/BuildingSelector.tsx
// Компонент для выбора зданий с autocomplete при создании/редактировании новостей

'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Building } from '@/types/building';
import { Search, X, MapPin, Building2, Plus } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface BuildingSelectorProps {
  selectedBuildings: Building[];
  onBuildingsChange: (buildings: Building[]) => void;
  maxSelections?: number;
  className?: string;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BuildingSelector({
  selectedBuildings,
  onBuildingsChange,
  maxSelections = 10,
  className = ''
}: BuildingSelectorProps) {

  const supabase = useMemo(() => createClient(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Поиск зданий с debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,architect.ilike.%${searchQuery}%`)
          .eq('moderation_status', 'approved')
          .limit(10);

        if (error) throw error;

        // Фильтруем уже выбранные здания
        const selectedIds = selectedBuildings.map(b => b.id);
        const filtered = (data || []).filter(b => !selectedIds.includes(b.id)) as Building[];

        setSearchResults(filtered);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error searching buildings:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, supabase, selectedBuildings]);

  // Добавление здания
  const handleAddBuilding = (building: Building) => {
    if (selectedBuildings.length >= maxSelections) {
      alert(`Maximum ${maxSelections} buildings can be selected`);
      return;
    }

    onBuildingsChange([...selectedBuildings, building]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  // Удаление здания
  const handleRemoveBuilding = (buildingId: string) => {
    onBuildingsChange(selectedBuildings.filter(b => b.id !== buildingId));
  };

  // Закрытие dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false);
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className={className}>

      {/* Заголовок */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Building2 className="w-4 h-4 inline mr-1" />
        Связанные здания
        <span className="text-gray-500 ml-1">
          ({selectedBuildings.length}/{maxSelections})
        </span>
      </label>

      {/* Поле поиска */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search buildings by name, city, architect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown с результатами */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Поиск...
              </div>
            ) : (
              searchResults.map((building) => (
                <button
                  key={building.id}
                  onClick={() => handleAddBuilding(building)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                >
                  {/* Изображение */}
                  {building.image_url && (
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={building.image_url}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {building.name}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3" />
                      {building.city}{building.country ? `, ${building.country}` : ''}
                    </div>
                    {building.architect && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {building.architect}
                        {building.year_built && ` • ${building.year_built}`}
                      </div>
                    )}
                  </div>

                  {/* Иконка добавления */}
                  <Plus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Нет результатов */}
        {showDropdown && !loading && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
            Здания не найдены
          </div>
        )}
      </div>

      {/* Выбранные здания */}
      {selectedBuildings.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedBuildings.map((building) => (
            <div
              key={building.id}
              className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              {/* Изображение */}
              {building.image_url && (
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                  <img
                    src={building.image_url}
                    alt={building.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Информация */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">
                  {building.name}
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {building.city}{building.country ? `, ${building.country}` : ''}
                </div>
              </div>

              {/* Кнопка удаления */}
              <button
                onClick={() => handleRemoveBuilding(building.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1.5 rounded transition-colors flex-shrink-0"
                title="Delete"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Подсказка */}
      {selectedBuildings.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Начните вводить название здания, город или имя архитектора для поиска
        </p>
      )}
    </div>
  );
}
