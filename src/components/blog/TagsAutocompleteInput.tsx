// components/blog/TagsAutocompleteInput.tsx
// Компонент для ввода тегов с автодополнением

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { BlogTag } from '@/types/blog';
import { X, Plus } from 'lucide-react';

interface TagsAutocompleteInputProps {
  selectedTags: BlogTag[];
  onTagsChange: (tags: BlogTag[]) => void;
  placeholder?: string;
}

export default function TagsAutocompleteInput({
  selectedTags,
  onTagsChange,
  placeholder = 'Введите тег...',
}: TagsAutocompleteInputProps) {
  const supabase = useMemo(() => createClient(), []);
  const [inputValue, setInputValue] = useState('');
  const [allTags, setAllTags] = useState<BlogTag[]>([]);
  const [suggestions, setSuggestions] = useState<BlogTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Загрузка всех тегов при монтировании
  useEffect(() => {
    loadTags();
  }, []);

  // Обработка кликов вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name');

    if (data && !error) {
      setAllTags(data);
    }
  };

  // Фильтрация предложений при вводе
  useEffect(() => {
    if (inputValue.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.find((selected) => selected.id === tag.id)
    );

    setSuggestions(filtered);
    setShowSuggestions(true);

    // Проверяем, существует ли точное совпадение
    const exactMatch = allTags.find(
      (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
    );
    setIsCreatingNew(!exactMatch);
  }, [inputValue, allTags, selectedTags]);

  // Добавление существующего тега
  const handleAddExistingTag = (tag: BlogTag) => {
    onTagsChange([...selectedTags, tag]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Создание нового тега
  const handleCreateNewTag = async () => {
    if (!inputValue.trim()) return;

    const tagName = inputValue.trim();

    // Проверяем, не существует ли уже такой тег
    const existing = allTags.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existing) {
      handleAddExistingTag(existing);
      return;
    }

    // Создаём новый тег в базе данных
    const { data, error } = await supabase
      .from('blog_tags')
      .insert({
        name: tagName,
        slug: tagName.toLowerCase().replace(/\s+/g, '-'),
        color: generateRandomColor(),
      })
      .select()
      .single();

    if (data && !error) {
      setAllTags([...allTags, data]);
      onTagsChange([...selectedTags, data]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  // Удаление тега
  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((tag) => tag.id !== tagId));
  };

  // Генерация случайного цвета для нового тега
  const generateRandomColor = () => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Обработка нажатия Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleAddExistingTag(suggestions[0]);
      } else if (isCreatingNew && inputValue.trim()) {
        handleCreateNewTag();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Выбранные теги */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
              style={{
                backgroundColor: tag.color + '20',
                borderColor: tag.color + '40',
                color: tag.color,
              }}
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Поле ввода */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Список предложений */}
        {showSuggestions && (inputValue.trim().length > 0) && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {/* Существующие теги */}
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAddExistingTag(tag)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors"
              >
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
                <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Нажмите для добавления
                </span>
              </button>
            ))}

            {/* Кнопка создания нового тега */}
            {isCreatingNew && inputValue.trim().length > 0 && (
              <button
                type="button"
                onClick={handleCreateNewTag}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100 text-blue-600 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Создать тег "{inputValue.trim()}"</span>
              </button>
            )}

            {/* Сообщение, если ничего не найдено */}
            {suggestions.length === 0 && !isCreatingNew && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Тег уже добавлен или не найден
              </div>
            )}
          </div>
        )}
      </div>

      {/* Подсказка */}
      <p className="text-xs text-gray-500">
        Введите название тега и выберите из списка или создайте новый. Нажмите Enter для
        быстрого добавления.
      </p>
    </div>
  );
}
