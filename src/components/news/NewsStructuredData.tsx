'use client';

import React from 'react';
import { NewsArticleWithDetails } from '@/types/news';

interface NewsStructuredDataProps {
  article: NewsArticleWithDetails;
}

export default function NewsStructuredData({ article }: NewsStructuredDataProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary || article.content.substring(0, 200) + '...',
    image: article.featured_image_url ? [article.featured_image_url] : [],
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Person',
      name: article.author?.full_name || 'Archi Routes',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Archi Routes',
      logo: {
        '@type': 'ImageObject',
        url: 'https://archiroutes.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://archiroutes.com/news/${article.slug}`,
    },
    articleSection: (() => {
      const sections = {
        'projects': 'Архитектурные проекты',
        'events': 'События',
        'personalities': 'Персоналии',
        'trends': 'Тренды',
        'planning': 'Городское планирование',
        'heritage': 'Наследие'
      };
      return sections[article.category as keyof typeof sections] || 'Архитектура';
    })(),
    keywords: [
      ...(article.tags || []),
      'архитектура',
      'новости архитектуры',
      article.city,
      article.country,
    ].filter(Boolean).join(','),
    
    // Географические данные
    ...(article.city && {
      contentLocation: {
        '@type': 'Place',
        name: article.city + (article.country ? `, ${article.country}` : ''),
        address: {
          '@type': 'PostalAddress',
          addressLocality: article.city,
          addressCountry: article.country,
        },
      },
    }),

    // Связанные здания
    ...(article.buildings && article.buildings.length > 0 && {
      mentions: article.buildings.map(building => ({
        '@type': 'Place',
        name: building.name,
        description: `Архитектурное сооружение${building.architect ? ` архитектора ${building.architect}` : ''}${building.year_built ? ` ${building.year_built} года` : ''}`,
        address: building.city ? {
          '@type': 'PostalAddress',
          addressLocality: building.city,
        } : undefined,
      })),
    }),

    // Метрики взаимодействия
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ReadAction',
        userInteractionCount: article.views_count || 0,
      },
      {
        '@type': 'InteractionCounter', 
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: article.likes_count || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ShareAction', 
        userInteractionCount: article.shares_count || 0,
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
