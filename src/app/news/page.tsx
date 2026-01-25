import React, { Suspense } from 'react';
import NewsListPage from './NewsListPage';
import { PageLoader } from '@/components/ui/PageLoader';

export default function NewsPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading news..." size="md" />}>
      <NewsListPage />
    </Suspense>
  );
}
