'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { NewsStats } from '@/types/news';
import { 
  ArrowLeft,
  TrendingUp,
  Eye,
  Heart,
  Share2,
  FileText,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';

export default function NewsStatsPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  const canViewStats = profile && ['admin', 'moderator', 'editor', 'guide', 'expert'].includes(profile.role);
  
  // Debug logging
  console.log('User:', user?.email);
  console.log('Profile:', profile);
  console.log('Can view stats:', canViewStats);

  // Fetch stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/news/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewStats) {
      fetchStats();
    }
  }, [canViewStats]);

  if (!user || !canViewStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Доступ запрещен</h1>
          <Link href="/admin/news" className="text-blue-600 hover:text-blue-800">
            К управлению новостями
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin/news"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              К управлению новостями
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">📊 Статистика новостей</h1>
          <p className="text-gray-600 mt-1">
            Аналитика публикаций и взаимодействий с контентом
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка статистики...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Всего статей</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_articles}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <Eye className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Всего просмотров</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_views.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <Heart className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Всего лайков</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_likes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <Share2 className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Всего репостов</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_shares}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Articles by Status */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Статьи по статусам</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">Опубликованные</span>
                    </div>
                    <span className="font-medium">{stats.published_articles}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">Черновики</span>
                    </div>
                    <span className="font-medium">{stats.draft_articles}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">На модерации</span>
                    </div>
                    <span className="font-medium">
                      {stats.total_articles - stats.published_articles - stats.draft_articles}
                    </span>
                  </div>
                </div>
              </div>

              {/* Categories Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Распределение по категориям</h2>
                <div className="space-y-3">
                  {Object.entries(stats.categories_distribution).map(([category, count]) => {
                    const categoryNames: { [key: string]: string } = {
                      'projects': 'Проекты',
                      'events': 'События', 
                      'personalities': 'Персоналии',
                      'trends': 'Тренды',
                      'planning': 'Планирование',
                      'heritage': 'Наследие'
                    };
                    
                    const percentage = stats.total_articles > 0 ? (count / stats.total_articles * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-gray-700">{categoryNames[category] || category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{percentage}%</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Последняя активность</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Новые статьи на этой неделе
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.recent_activity.new_articles_this_week}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Средний рейтинг
                  </h3>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.total_articles > 0 ? (stats.total_likes / stats.total_articles).toFixed(1) : '0'}
                  </p>
                </div>
              </div>
            </div>

            {/* Trending Articles */}
            {stats.recent_activity.trending_articles && stats.recent_activity.trending_articles.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Популярные статьи
                </h2>
                
                <div className="space-y-4">
                  {stats.recent_activity.trending_articles.slice(0, 5).map((article) => (
                    <div key={article.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {article.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            {article.shares_count}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/news/${article.slug}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Просмотр
                        </Link>
                        <Link
                          href={`/admin/news/${article.id}/edit`}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Редактировать
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
}
