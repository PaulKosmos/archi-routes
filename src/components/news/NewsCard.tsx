'use client';

import React from 'react';
import Link from 'next/link';
import OptimizedImage from '@/components/OptimizedImage';
import { NewsArticleWithDetails, getNewsCategoryIcon } from '@/types/news';
import { Calendar, Eye, Heart, MapPin, User, Building2, Clock, Share2 } from 'lucide-react';

interface NewsCardProps {
  news: NewsArticleWithDetails;
  size?: 'small' | 'medium' | 'large' | 'featured';
  showSummary?: boolean;
  showRelatedBuildings?: boolean;
  showMetrics?: boolean;
  className?: string;
}

export default function NewsCard({ 
  news, 
  size = 'medium', 
  showSummary = true, 
  showRelatedBuildings = true,
  showMetrics = true,
  className = '' 
}: NewsCardProps) {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Вчера';
    if (diffDays === 2) return 'Позавчера';
    if (diffDays <= 7) return `${diffDays} дней назад`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} недель назад`;
    return formatDate(dateString);
  };

  const getCategoryName = (category: string) => {
    const categories = {
      'projects': 'Архитектурные проекты',
      'events': 'События',
      'personalities': 'Персоналии', 
      'trends': 'Тренды',
      'planning': 'Городское планирование',
      'heritage': 'Наследие'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const getCardClasses = () => {
    const baseClasses = "bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group cursor-pointer transform hover:-translate-y-1";

    switch (size) {
      case 'small':
        return `${baseClasses} max-w-sm`;
      case 'large':
        return `${baseClasses} flex flex-col md:flex-row max-w-4xl`;
      case 'featured':
        return `${baseClasses} w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg`;
      default:
        return `${baseClasses} max-w-md`;
    }
  };

  const getImageClasses = () => {
    switch (size) {
      case 'small':
        return "h-48"; // Увеличено с h-32 до h-48
      case 'large':
        return "h-80 md:w-96"; // Увеличено с h-64 до h-80, md:w-80 до md:w-96
      case 'featured':
        return "h-[28rem]"; // Увеличено с h-96 (24rem) до 28rem
      default:
        return "h-56"; // Увеличено с h-48 до h-56
    }
  };

  const getTitleClasses = () => {
    switch (size) {
      case 'small':
        return "text-lg font-semibold";
      case 'large':
        return "text-2xl font-bold";
      case 'featured':
        return "text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent";
      default:
        return "text-xl font-semibold";
    }
  };

  const getContentPadding = () => {
    switch (size) {
      case 'small':
        return "p-4";
      case 'large':
        return "p-6 flex-1";
      case 'featured':
        return "p-8";
      default:
        return "p-5";
    }
  };

  return (
    <article className={`${getCardClasses()} ${className}`}>
      <Link href={`/news/${news.slug}`} className="block h-full">

        {/* Главное изображение или плейсхолдер */}
        <div className={`relative ${getImageClasses()} overflow-hidden ${size === 'large' ? 'md:flex-shrink-0' : ''} ${!news.featured_image_url ? 'bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50' : ''}`}>
          {news.featured_image_url ? (
            <>
              <OptimizedImage
                src={news.featured_image_url}
                alt={news.featured_image_alt || news.title}
                fill
                className="group-hover:scale-105 transition-transform duration-500"
                objectFit="cover"
                sizes={
                  size === 'featured' ? '(max-width: 768px) 100vw, 80vw' :
                  size === 'large' ? '(max-width: 768px) 100vw, 320px' :
                  '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                }
                priority={size === 'featured'}
              />

              {/* Градиент для лучшей читаемости текста */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            // Плейсхолдер для отсутствующего изображения
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <svg className="w-20 h-20 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">Изображение отсутствует</span>
            </div>
          )}

          {/* Категория поверх изображения */}
          <div className="absolute top-4 left-4">
            <span className={`${news.featured_image_url ? 'bg-white/95' : 'bg-white'} backdrop-blur-sm px-3 py-2 rounded-full text-sm font-medium text-gray-700 flex items-center gap-2 shadow-sm`}>
              <span className="text-base">{getNewsCategoryIcon(news.category)}</span>
              <span className="hidden sm:inline">{getCategoryName(news.category)}</span>
            </span>
          </div>

          {/* Featured метка */}
          {news.featured && (
            <div className="absolute top-4 right-4">
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-md flex items-center gap-1">
                <span>⭐</span>
                <span className="hidden sm:inline">Главная новость</span>
              </span>
            </div>
          )}

          {/* Статус поверх изображения для неопубликованных */}
          {news.status !== 'published' && (
            <div className="absolute bottom-4 right-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                news.status === 'draft' ? 'bg-gray-500/90 text-white' :
                news.status === 'review' ? 'bg-yellow-500/90 text-white' :
                'bg-red-500/90 text-white'
              }`}>
                {news.status === 'draft' && 'Черновик'}
                {news.status === 'review' && 'На модерации'}
                {news.status === 'archived' && 'Архив'}
              </span>
            </div>
          )}
        </div>

        {/* Контент карточки */}
        <div className={getContentPadding()}>
          
          {/* Дата и время чтения */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-4">
              {news.published_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatRelativeDate(news.published_at)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>~{Math.max(1, Math.round((news.content?.length || 0) / 1000))} мин</span>
              </div>
            </div>
            
            {/* Автор */}
            {news.author && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{news.author.full_name}</span>
              </div>
            )}
          </div>

          {/* Заголовок */}
          <h2 className={`${getTitleClasses()} text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight`}>
            {news.title}
          </h2>

          {/* Краткое описание */}
          {showSummary && news.summary && (
            <p className={`text-gray-600 mb-4 leading-relaxed ${
              size === 'featured' ? 'text-lg line-clamp-3' : 
              size === 'large' ? 'text-base line-clamp-3' : 
              'text-sm line-clamp-2'
            }`}>
              {news.summary}
            </p>
          )}

          {/* Локация */}
          {news.city && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4" />
              <span>{news.city}{news.country && news.country !== news.city ? `, ${news.country}` : ''}</span>
            </div>
          )}

          {/* Связанные здания */}
          {showRelatedBuildings && news.buildings && news.buildings.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Упоминаемые здания</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {news.buildings.slice(0, size === 'featured' ? 4 : 3).map((building) => (
                  <span
                    key={building.id}
                    className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    {building.name}
                  </span>
                ))}
                {news.buildings.length > (size === 'featured' ? 4 : 3) && (
                  <span className="inline-flex items-center text-gray-500 text-sm">
                    +{news.buildings.length - (size === 'featured' ? 4 : 3)} еще
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Теги */}
          {news.tags && news.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {news.tags.slice(0, size === 'featured' ? 6 : 4).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
                {news.tags.length > (size === 'featured' ? 6 : 4) && (
                  <span className="inline-flex items-center text-gray-400 text-xs">
                    +{news.tags.length - (size === 'featured' ? 6 : 4)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Статистика и взаимодействия */}
          {showMetrics && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{news.views_count || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{news.likes_count || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">{news.shares_count || 0}</span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                Читать далее →
              </div>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
