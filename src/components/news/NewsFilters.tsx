'use client';

import React from 'react';
import { NewsFilters } from '@/types/news';

interface NewsFiltersProps {
  filters: NewsFilters;
  onFiltersChange: (filters: NewsFilters) => void;
  availableCities?: string[];
  className?: string;
}

export default function NewsFiltersComponent({
  filters,
  onFiltersChange,
  availableCities = [],
  className = ''
}: NewsFiltersProps) {

  const updateFilter = (key: keyof NewsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleCityChange = (city: string) => {
    updateFilter('city', city || undefined);
  };

  const handleDateChange = (value: string) => {
    const now = new Date();
    if (value === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      updateFilter('date_from', weekAgo.toISOString());
    } else if (value === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      updateFilter('date_from', monthAgo.toISOString());
    } else if (value === '3months') {
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      updateFilter('date_from', threeMonthsAgo.toISOString());
    } else {
      updateFilter('date_from', undefined);
    }
  };

  const handleFeaturedChange = (featured: boolean) => {
    updateFilter('featured', featured || undefined);
  };

  const handleBuildingsChange = (has_buildings: boolean) => {
    updateFilter('has_buildings', has_buildings || undefined);
  };

  return (
    <div className={`space-y-4 ${className}`}>

      {/* Город и период - в одну строку */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Город */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Город
          </label>
          <select
            value={filters.city || ''}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все города</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Период */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Период
          </label>
          <select
            value={
              filters.date_from ? (
                filters.date_from.includes(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ? 'week' :
                filters.date_from.includes(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ? 'month' :
                filters.date_from.includes(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ? '3months' :
                'custom'
              ) : ''
            }
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все время</option>
            <option value="week">Последняя неделя</option>
            <option value="month">Последний месяц</option>
            <option value="3months">Последние 3 месяца</option>
          </select>
        </div>
      </div>

      {/* Чекбоксы */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.featured || false}
            onChange={(e) => handleFeaturedChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Только главные новости</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_buildings || false}
            onChange={(e) => handleBuildingsChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">С упоминанием зданий</span>
        </label>
      </div>
    </div>
  );
}
