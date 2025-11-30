// components/news/AddNewsFAB.tsx
// Floating Action Button для создания новой новости (только для admin/moderator/editor)

'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AddNewsFAB() {
  const { profile } = useAuth();

  // Показываем кнопку только для admin, moderator, editor
  const canCreateNews = profile && ['admin', 'moderator', 'editor'].includes(profile.role);

  if (!canCreateNews) return null;

  return (
    <Link
      href="/admin/news/create"
      className="fixed bottom-8 right-8 z-40 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 group"
      title="Создать новость"
    >
      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      <span className="font-semibold hidden sm:inline">Создать новость</span>
    </Link>
  );
}
