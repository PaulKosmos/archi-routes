'use client'

export const dynamic = 'force-dynamic'

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNewsAPI } from '@/hooks/useNewsAPI';

export default function NewsTestFixesPage() {
  const { user, profile } = useAuth();
  const { createNews, searchBuildings } = useNewsAPI();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testNewsCreation = async () => {
    addResult('🧪 Тестирование создания новости...');
    
    try {
      const testData = {
        title: 'Тестовая новость ' + Date.now(),
        slug: 'test-news-' + Date.now(),
        content: 'Это тестовая новость для проверки API.',
        category: 'trends' as const,
        status: 'draft' as const
      };

      // Сначала пробуем через API
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        const result = await response.json();
        addResult(`✅ Новость создана через API: ${result.title}`);
      } else {
        const error = await response.text();
        addResult(`❌ Ошибка API: ${response.status} - ${error}`);
        
        // Пробуем клиентский метод
        addResult('🔄 Пробуем клиентский метод...');
        const result = await createNews(testData);
        addResult(`✅ Новость создана через клиент: ${result.title}`);
      }
    } catch (error) {
      addResult(`❌ Ошибка сети: ${error}`);
    }
  };

  const testBuildingSearch = async () => {
    addResult('🔍 Тестирование поиска зданий...');
    
    try {
      const response = await fetch('/api/buildings/search?q=собор&limit=5', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Найдено зданий (API): ${data.buildings?.length || 0}`);
        if (data.buildings?.length > 0) {
          addResult(`📍 Пример: ${data.buildings[0].name}`);
        }
      } else {
        addResult(`❌ Ошибка поиска зданий (API): ${response.status}`);
        
        // Пробуем клиентский метод
        addResult('🔄 Пробуем клиентский поиск...');
        const buildings = await searchBuildings('собор');
        addResult(`✅ Найдено зданий (клиент): ${buildings.length}`);
        if (buildings.length > 0) {
          addResult(`📍 Пример: ${buildings[0].name}`);
        }
      }
    } catch (error) {
      addResult(`❌ Ошибка сети при поиске зданий: ${error}`);
    }
  };

  const testStatsAccess = async () => {
    addResult('📊 Тестирование доступа к статистике...');
    
    try {
      const response = await fetch('/api/news/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Статистика загружена: ${data.total_articles} статей`);
      } else {
        addResult(`❌ Ошибка доступа к статистике: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ Ошибка сети при загрузке статистики: ${error}`);
    }
  };

  const runAllTests = () => {
    setTestResults([]);
    testNewsCreation();
    setTimeout(testBuildingSearch, 1000);
    setTimeout(testStatsAccess, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🔧 Тестирование исправлений новостей
          </h1>
          
          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-medium text-blue-900 mb-2">Информация о пользователе:</h2>
            <p><strong>Email:</strong> {user?.email || 'Не авторизован'}</p>
            <p><strong>Роль:</strong> {profile?.role || 'Не определена'}</p>
            <p><strong>ID:</strong> {user?.id || 'Нет'}</p>
          </div>

          {/* Tests */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Тесты:</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={testNewsCreation}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">1. Создание новости</h3>
                <p className="text-sm text-gray-600">Проверка API /api/news POST</p>
              </button>

              <button
                onClick={testBuildingSearch}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">2. Поиск зданий</h3>
                <p className="text-sm text-gray-600">Проверка API поиска зданий</p>
              </button>

              <button
                onClick={testStatsAccess}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">3. Доступ к статистике</h3>
                <p className="text-sm text-gray-600">Проверка прав доступа</p>
              </button>

              <button
                onClick={runAllTests}
                className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left"
              >
                <h3 className="font-medium">🚀 Запустить все тесты</h3>
                <p className="text-sm text-blue-100">Проверить все исправления</p>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Результаты тестов:</h2>
            
            {testResults.length === 0 ? (
              <p className="text-gray-500 italic">Запустите тесты для просмотра результатов</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded text-sm font-mono ${
                      result.includes('✅') 
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : result.includes('❌')
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые ссылки:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/admin/news"
                className="text-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                📰 Админ-панель
              </a>
              <a
                href="/admin/news/create"
                className="text-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ✏️ Создать новость
              </a>
              <a
                href="/admin/news/stats"
                className="text-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                📊 Статистика
              </a>
              <a
                href="/news"
                className="text-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                📖 Все новости
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
