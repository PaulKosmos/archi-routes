// components/blog/blocks/editors/BuildingCardBlockEditor.tsx
// Редактор карточки здания для блога

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateBlogContentBlock } from '@/types/blog';
import { createClient } from '@/lib/supabase';
import BlockEditorWrapper from '../BlockEditorWrapper';
import { Search, Building2, MapPin, User, Calendar, Palette, X } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface BuildingCardBlockEditorProps {
  block: CreateBlogContentBlock;
  onChange: (updates: Partial<CreateBlogContentBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  errors?: string[];
  readOnly?: boolean;
}

interface Building {
  id: string;
  name: string;
  description?: string;
  architect?: string;
  year_built?: number;
  architectural_style?: string;
  city: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function BuildingCardBlockEditor({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  errors,
  readOnly = false,
}: BuildingCardBlockEditorProps) {
  const supabase = useMemo(() => createClient(), []);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.order_index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Загрузить выбранное здание при монтировании
  useEffect(() => {
    if (block.building_id) {
      loadBuilding(block.building_id);
    }
  }, [block.building_id]);

  /**
   * Загружает данные здания
   */
  const loadBuilding = async (buildingId: string) => {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single();

    if (data && !error) {
      setSelectedBuilding(data);
    }
  };

  /**
   * Поиск зданий
   */
  const searchBuildings = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%,architect.ilike.%${query}%`)
      .eq('moderation_status', 'approved')
      .limit(10);

    if (data && !error) {
      setSearchResults(data);
    }
    setIsLoading(false);
  };

  /**
   * Обработчик изменения поискового запроса
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchBuildings(value);
  };

  /**
   * Обработчик выбора здания
   */
  const handleSelectBuilding = (building: Building) => {
    setSelectedBuilding(building);
    onChange({ building_id: building.id });
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * Обработчик удаления выбранного здания
   */
  const handleRemoveBuilding = () => {
    setSelectedBuilding(null);
    onChange({ building_id: undefined });
  };

  /**
   * Обработчик изменения настроек отображения
   */
  const handleSettingChange = (key: string, value: any) => {
    onChange({
      block_settings: {
        ...block.block_settings,
        [key]: value,
      },
    });
  };

  const currentSettings = (block.block_settings || {}) as any;
  const showDescription = currentSettings.showDescription ?? true;
  const showArchitect = currentSettings.showArchitect ?? true;
  const showYear = currentSettings.showYear ?? true;
  const showStyle = currentSettings.showStyle ?? true;
  const showMapButton = currentSettings.showMapButton ?? true;
  const showRouteButton = currentSettings.showRouteButton ?? true;
  const cardLayout = currentSettings.cardLayout || 'horizontal';

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditorWrapper
        blockType="building_card"
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        errors={errors}
        dragHandleProps={{ ...attributes, ...listeners }}
        readOnly={readOnly}
      >
        <div className="space-y-4">
          {/* Выбор здания или preview */}
          {!selectedBuilding ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                Выберите архитектурный объект для отображения в статье
              </p>

              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                disabled={readOnly}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="inline h-4 w-4 mr-2" />
                Выбрать объект
              </button>

              {/* Поисковая панель */}
              {isSearchOpen && (
                <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 text-left">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Поиск по названию, городу или архитектору..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      autoFocus
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>

                  {/* Результаты поиска */}
                  {isLoading && (
                    <div className="mt-3 text-center text-sm text-gray-500">
                      Загрузка...
                    </div>
                  )}

                  {!isLoading && searchResults.length > 0 && (
                    <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                      {searchResults.map((building) => (
                        <button
                          key={building.id}
                          type="button"
                          onClick={() => handleSelectBuilding(building)}
                          className="w-full p-3 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg text-left transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {building.image_url && (
                              <img
                                src={building.image_url}
                                alt={building.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {building.name}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                <MapPin className="h-3 w-3" />
                                {building.city}
                                {building.architect && (
                                  <>
                                    <span>•</span>
                                    <User className="h-3 w-3" />
                                    {building.architect}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="mt-3 text-center text-sm text-gray-500">
                      Ничего не найдено. Попробуйте другой запрос.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Кнопка удаления объекта */}
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={handleRemoveBuilding}
                  disabled={readOnly}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Удалить объект"
                >
                  <X className="h-4 w-4" />
                  Удалить объект
                </button>
              </div>

              {/* Preview выбранного здания - соответствует финальной публикации */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Предпросмотр (как будет выглядеть после публикации)
                </label>

                {/* Вертикальный layout */}
                {cardLayout === 'vertical' ? (
                  <div className="building-card-block my-6 max-w-md mx-auto">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                      {/* Изображение */}
                      {selectedBuilding.image_url && (
                        <div className="relative h-64 overflow-hidden">
                          <img
                            src={selectedBuilding.image_url}
                            alt={selectedBuilding.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Контент */}
                      <div className="p-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          {selectedBuilding.name}
                        </h3>

                        <div className="space-y-2 mb-4">
                          {showArchitect && selectedBuilding.architect && (
                            <div className="flex items-center text-gray-600 text-sm">
                              <User className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{selectedBuilding.architect}</span>
                            </div>
                          )}
                          {showYear && selectedBuilding.year_built && (
                            <div className="flex items-center text-gray-600 text-sm">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{selectedBuilding.year_built}</span>
                            </div>
                          )}
                          {showStyle && selectedBuilding.architectural_style && (
                            <div className="flex items-center text-gray-600 text-sm">
                              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs">
                                {selectedBuilding.architectural_style}
                              </span>
                            </div>
                          )}
                        </div>

                        {showDescription && selectedBuilding.description && (
                          <p className="text-gray-700 text-sm mb-6 line-clamp-3">
                            {selectedBuilding.description}
                          </p>
                        )}

                        {/* Зелёные кнопки */}
                        <div className="flex gap-3">
                          {showMapButton && (
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg font-medium">
                              <MapPin className="h-5 w-5" />
                              <span>На карте</span>
                            </button>
                          )}
                          {showRouteButton && (
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg font-medium">
                              <Building2 className="h-5 w-5" />
                              <span>В маршрут</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Горизонтальный layout */
                  <div className="building-card-block my-6 max-w-5xl mx-auto">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                      <div className="flex flex-col md:flex-row">
                        {/* Изображение */}
                        {selectedBuilding.image_url && (
                          <div className="relative md:w-2/5 h-64 md:h-auto overflow-hidden flex-shrink-0">
                            <img
                              src={selectedBuilding.image_url}
                              alt={selectedBuilding.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Контент */}
                        <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
                          <div>
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                              {selectedBuilding.name}
                            </h3>

                            <div className="flex flex-wrap gap-4 mb-4">
                              {showArchitect && selectedBuilding.architect && (
                                <div className="flex items-center text-gray-600 text-sm">
                                  <User className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{selectedBuilding.architect}</span>
                                </div>
                              )}
                              {showYear && selectedBuilding.year_built && (
                                <div className="flex items-center text-gray-600 text-sm">
                                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{selectedBuilding.year_built}</span>
                                </div>
                              )}
                              {showStyle && selectedBuilding.architectural_style && (
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                                  {selectedBuilding.architectural_style}
                                </span>
                              )}
                            </div>

                            {showDescription && selectedBuilding.description && (
                              <p className="text-gray-700 text-base mb-6 line-clamp-4">
                                {selectedBuilding.description}
                              </p>
                            )}
                          </div>

                          {/* Зелёные кнопки */}
                          <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            {showMapButton && (
                              <button className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium shadow-md">
                                <MapPin className="h-5 w-5" />
                                <span>Показать на карте</span>
                              </button>
                            )}
                            {showRouteButton && (
                              <button className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium shadow-md">
                                <Building2 className="h-5 w-5" />
                                <span>Добавить в маршрут</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Настройки отображения */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">
                  Настройки отображения карточки
                </h5>

                <div className="space-y-3">
                  {/* Layout */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Макет карточки
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSettingChange('cardLayout', 'horizontal')}
                        disabled={readOnly}
                        className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                          cardLayout === 'horizontal'
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        Горизонтальный
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSettingChange('cardLayout', 'vertical')}
                        disabled={readOnly}
                        className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                          cardLayout === 'vertical'
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        Вертикальный
                      </button>
                    </div>
                  </div>

                  {/* Чекбоксы для полей */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'showDescription', label: 'Показать описание', value: showDescription },
                      { key: 'showArchitect', label: 'Показать архитектора', value: showArchitect },
                      { key: 'showYear', label: 'Показать год', value: showYear },
                      { key: 'showStyle', label: 'Показать стиль', value: showStyle },
                      { key: 'showMapButton', label: 'Кнопка "На карте"', value: showMapButton },
                      { key: 'showRouteButton', label: 'Кнопка "В маршрут"', value: showRouteButton },
                    ].map((setting) => (
                      <label
                        key={setting.key}
                        className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
                      >
                        <input
                          type="checkbox"
                          checked={setting.value}
                          onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                          disabled={readOnly}
                          className="rounded border-gray-300 text-green-500 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span>{setting.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </BlockEditorWrapper>
    </div>
  );
}
