'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NewsArticleWithDetails } from '@/types/news';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

export default function NewsTestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const addTest = (test: string, status: TestResult['status'], message: string, data?: any) => {
    setTests(prev => [
      ...prev.filter(t => t.test !== test),
      { test, status, message, data }
    ]);
  };

  const runTests = async () => {
    setRunning(true);
    setTests([]);

    try {
      // Test 1: Get all news
      addTest('GET /api/news', 'pending', 'Загрузка всех новостей...');
      
      const allNewsResponse = await fetch('/api/news');
      if (allNewsResponse.ok) {
        const allNewsData = await allNewsResponse.json();
        addTest(
          'GET /api/news', 
          'success', 
          `✅ Найдено ${allNewsData.data?.length || 0} новостей`,
          allNewsData.data
        );
        
        if (allNewsData.data && allNewsData.data.length > 0) {
          const firstNews = allNewsData.data[0];
          
          // Test 2: Get news by ID
          addTest('GET /api/news/[id]', 'pending', 'Загрузка детальной информации...');
          
          const detailResponse = await fetch(`/api/news/${firstNews.id}`);
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            addTest(
              'GET /api/news/[id]', 
              'success', 
              `✅ Детальная загрузка: "${detailData.title}"`,
              detailData
            );
          } else {
            addTest(
              'GET /api/news/[id]', 
              'error', 
              `❌ Ошибка загрузки по ID: ${detailResponse.status}`
            );
          }

          // Test 3: Search by slug
          addTest('Search by slug', 'pending', 'Поиск по slug...');
          
          const searchResponse = await fetch(`/api/news?search=${encodeURIComponent(firstNews.slug)}&limit=10`);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const foundBySlug = searchData.data?.find((item: NewsArticleWithDetails) => item.slug === firstNews.slug);
            
            if (foundBySlug) {
              addTest(
                'Search by slug', 
                'success', 
                `✅ Найдено по slug: "${foundBySlug.title}"`,
                { slug: firstNews.slug, found: foundBySlug }
              );
            } else {
              addTest(
                'Search by slug', 
                'error', 
                `❌ Не найдено по slug "${firstNews.slug}". Найдено ${searchData.data?.length || 0} результатов`,
                { slug: firstNews.slug, results: searchData.data }
              );
            }
          } else {
            addTest(
              'Search by slug', 
              'error', 
              `❌ Ошибка поиска: ${searchResponse.status}`
            );
          }

          // Test 4: Test detail page URL
          addTest('Detail page URL', 'success', `🔗 Ссылка на детальную страницу: /news/${firstNews.slug}`);
        }
      } else {
        addTest(
          'GET /api/news', 
          'error', 
          `❌ Ошибка загрузки: ${allNewsResponse.status}`
        );
      }

    } catch (error) {
      addTest(
        'Global error', 
        'error', 
        `❌ Глобальная ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧪 Тестирование системы новостей</h1>
              <p className="text-gray-600 mt-1">Проверка API и функциональности</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={runTests}
                disabled={running}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? '🔄 Тестирование...' : '▶️ Перезапустить тесты'}
              </button>
              
              <Link
                href="/news"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                📰 К новостям
              </Link>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div
                key={`${test.test}-${index}`}
                className={`p-4 rounded-lg border-l-4 ${
                  test.status === 'success' 
                    ? 'bg-green-50 border-green-400 text-green-800'
                    : test.status === 'error'
                    ? 'bg-red-50 border-red-400 text-red-800'
                    : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{test.test}</h3>
                    <p className="mt-1">{test.message}</p>
                    
                    {/* Show data if available */}
                    {test.data && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium opacity-75 hover:opacity-100">
                          📋 Показать данные
                        </summary>
                        <pre className="mt-2 p-3 bg-black/5 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {test.status === 'success' && '✅'}
                    {test.status === 'error' && '❌'}
                    {test.status === 'pending' && '⏳'}
                  </div>
                </div>
              </div>
            ))}
            
            {tests.length === 0 && !running && (
              <div className="text-center py-8 text-gray-500">
                Нажмите "Перезапустить тесты" для начала тестирования
              </div>
            )}
          </div>

          {/* News Links */}
          {tests.some(t => t.status === 'success' && t.data) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔗 Ссылки для тестирования</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests
                  .filter(t => t.status === 'success' && Array.isArray(t.data))
                  .map(t => t.data)
                  .flat()
                  .slice(0, 4)
                  .map((article: any, index: number) => (
                    <Link
                      key={article.id}
                      href={`/news/${article.slug}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {article.summary || 'Без описания'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {article.category}
                        </span>
                        <span>slug: {article.slug}</span>
                      </div>
                    </Link>
                  ))
                }
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Инструкции для тестирования</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🗄️ Если нет данных в БД:</h3>
                <ol className="space-y-1 text-sm text-gray-600 list-decimal list-inside">
                  <li>Откройте Supabase SQL Editor</li>
                  <li>Выполните скрипт: <code>scripts/add-test-news.sql</code></li>
                  <li>Перезапустите тесты на этой странице</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">🔍 Если поиск не работает:</h3>
                <ol className="space-y-1 text-sm text-gray-600 list-decimal list-inside">
                  <li>Проверьте логи в консоли браузера</li>
                  <li>Убедитесь, что таблицы созданы</li>
                  <li>Проверьте RLS политики в Supabase</li>
                </ol>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
