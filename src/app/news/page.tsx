import React, { Suspense } from 'react';
import NewsListPage from './NewsListPage';

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewsListPage />
    </Suspense>
  );
}
