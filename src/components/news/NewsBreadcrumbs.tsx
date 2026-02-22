'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { NewsArticleWithDetails } from '@/types/news';

interface NewsBreadcrumbsProps {
  article?: NewsArticleWithDetails;
  currentPage?: string;
  className?: string;
}

export default function NewsBreadcrumbs({
  article,
  currentPage,
  className = ''
}: NewsBreadcrumbsProps) {

  const categoryNames = {
    'projects': 'Архитектурные проекты',
    'events': 'События',
    'personalities': 'Персоналии',
    'trends': 'Тренды',
    'planning': 'Городское планирование',
    'heritage': 'Наследие'
  };

  const breadcrumbs: Array<{
    title: string;
    href: string;
    icon?: typeof Home;
    current?: boolean;
  }> = [
    { title: 'Home', href: '/', icon: Home },
    { title: 'News', href: '/news' },
  ];

  if (article) {
    // Добавляем категорию
    const categoryName = categoryNames[article.category as keyof typeof categoryNames] || article.category;
    breadcrumbs.push({
      title: categoryName,
      href: `/news?category=${article.category}`
    });

    // Добавляем текущую статью
    breadcrumbs.push({
      title: article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title,
      href: `/news/${article.slug}`,
      current: true
    });
  } else if (currentPage) {
    breadcrumbs.push({
      title: currentPage,
      href: '#',
      current: true
    });
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
            )}

            {breadcrumb.current ? (
              <span className="text-gray-900 font-medium line-clamp-1" aria-current="page">
                {breadcrumb.icon && <breadcrumb.icon className="w-4 h-4 inline mr-1" />}
                {breadcrumb.title}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
              >
                {breadcrumb.icon && <breadcrumb.icon className="w-4 h-4 mr-1" />}
                {breadcrumb.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Компонент для Structured Data хлебных крошек
export function BreadcrumbsStructuredData({ article }: { article?: NewsArticleWithDetails }) {
  if (!article) return null;

  const categoryNames = {
    'projects': 'Архитектурные проекты',
    'events': 'События',
    'personalities': 'Персоналии',
    'trends': 'Тренды',
    'planning': 'Городское планирование',
    'heritage': 'Наследие'
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://archiroutes.com';
  const categoryName = categoryNames[article.category as keyof typeof categoryNames] || article.category;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Главная',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Новости',
        item: `${baseUrl}/news`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `${baseUrl}/news?category=${article.category}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: article.title,
        item: `${baseUrl}/news/${article.slug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
