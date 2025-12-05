'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react';
import { Search, Bell, User, Grid3x3, List, Calendar, Clock, Eye, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: number;
  image: string;
  title: string;
  description: string;
  date: string;
  views: number;
  comments: number;
  readingTime?: number;
  wide?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=800&q=80",
    title: "Модернизм в архитектуре: революция XX века",
    description: "История модернизма в архитектуре: от Баухауса до современности. Основные принципы и знаковые здания",
    date: "25 октября 2025 г.",
    views: 842,
    comments: 0
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
    title: "Знаменитая архитектура Москвы: путеводитель по столице",
    description: "Путешествие по самым знаменитым архитектурным достопримечательностям Москвы — от Кремля до Москва-Сити",
    date: "23 октября 2025 г.",
    views: 756,
    comments: 0
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80",
    title: "Небоскрёбы: вертикальная архитектура будущего",
    description: "Как небоскрёбы изменили облик городов и что ждёт высотное строительство в ближайшие десятилетия",
    date: "20 октября 2025 г.",
    views: 1204,
    comments: 3
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80",
    title: "Устойчивая архитектура: проектирование для планеты",
    description: "Экологичные материалы, энергоэффективность и зелёные технологии в современном строительстве. Как архитекторы создают здания будущего",
    date: "18 октября 2025 г.",
    views: 2156,
    comments: 12,
    wide: true
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&q=80",
    title: "Готическая архитектура Европы",
    description: "Величественные соборы и замки средневековья: история и особенности готического стиля",
    date: "15 октября 2025 г.",
    views: 934,
    comments: 5
  }
];

interface BlogCardProps extends BlogPost {}

function BlogCard({ image, title, description, date, views, comments, readingTime = 5, wide }: BlogCardProps) {
  if (wide) {
    return (
      <article className="bg-white overflow-hidden bevel-card transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col md:flex-row h-full">
        <div className="relative md:w-1/2 h-48 md:h-auto overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 md:w-1/2 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-[hsl(var(--new-primary))] transition-colors cursor-pointer font-[var(--font-outfit)]">
              {title}
            </h3>

            <p className="text-[hsl(var(--new-muted-foreground))] mb-4 line-clamp-3 text-sm font-[var(--font-sora)]">
              {description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2 border-[hsl(var(--new-border))]">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--new-muted-foreground))]">
              <Calendar className="h-3.5 w-3.5" />
              <span>{date}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-[hsl(var(--new-muted-foreground))]">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{readingTime} мин</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{views}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{comments}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white overflow-hidden bevel-card transition-transform hover:-translate-y-1 hover:shadow-lg h-full">
      <div className="relative h-48 overflow-hidden rounded-t-[var(--new-radius)]">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-[hsl(var(--new-primary))] transition-colors cursor-pointer font-[var(--font-outfit)]">
          {title}
        </h3>

        <p className="text-[hsl(var(--new-muted-foreground))] mb-4 line-clamp-2 text-sm font-[var(--font-sora)]">
          {description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t-2 border-[hsl(var(--new-border))]">
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--new-muted-foreground))]">
            <Calendar className="h-3.5 w-3.5" />
            <span>{date}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[hsl(var(--new-muted-foreground))]">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{readingTime} мин</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{views}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{comments}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-[hsl(var(--new-foreground))] bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--new-primary))] bevel-edge flex items-center justify-center">
              <span className="text-white font-bold text-xl font-[var(--font-outfit)]">A</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-[var(--font-outfit)]">ArchiRoutes</h1>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/test-map"
              className="font-medium hover:text-[hsl(var(--new-primary))] transition-colors font-[var(--font-sora)]"
            >
              Карта
            </Link>
            <Link
              href="/news"
              className="font-medium hover:text-[hsl(var(--new-primary))] transition-colors font-[var(--font-sora)]"
            >
              Новости
            </Link>
            <Link
              href="/test-design"
              className="font-medium text-[hsl(var(--new-primary))] transition-colors font-[var(--font-sora)]"
            >
              Блог
            </Link>
            <Link
              href="/podcasts"
              className="font-medium hover:text-[hsl(var(--new-primary))] transition-colors font-[var(--font-sora)]"
            >
              Подкасты
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hover:bg-[hsl(var(--new-muted))] p-2 rounded-lg transition-colors">
              <Search className="h-5 w-5" />
            </button>
            <button className="hover:bg-[hsl(var(--new-muted))] p-2 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l-2 border-[hsl(var(--new-border))]">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--new-primary))] flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium font-[var(--font-outfit)]">Павел</p>
                <p className="text-xs text-[hsl(var(--new-muted-foreground))] font-[var(--font-sora)]">Администратор</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function TestDesignPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--new-background))]" style={{ fontFamily: 'var(--font-sora)' }}>
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--new-muted-foreground))]" />
            <input
              placeholder="Поиск статей..."
              className="pl-12 h-12 w-full border border-[hsl(var(--new-border))] rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--new-primary))] font-[var(--font-sora)]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('grid')}
              className={`h-12 w-12 rounded-lg flex items-center justify-center transition-colors ${
                view === 'grid'
                  ? 'bg-[hsl(var(--new-primary))] text-white'
                  : 'bg-white border border-[hsl(var(--new-border))] hover:bg-[hsl(var(--new-muted))]'
              }`}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`h-12 w-12 rounded-lg flex items-center justify-center transition-colors ${
                view === 'list'
                  ? 'bg-[hsl(var(--new-primary))] text-white'
                  : 'bg-white border border-[hsl(var(--new-border))] hover:bg-[hsl(var(--new-muted))]'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-[hsl(var(--new-border))]">
          <span className="text-sm font-medium font-[var(--font-sora)]">
            Найдено статей: <span className="font-bold text-[hsl(var(--new-primary))] font-[var(--font-outfit)]">{filteredPosts.length}</span>
          </span>
        </div>

        {view === 'grid' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.slice(0, 3).map(post => (
                <BlogCard key={post.id} {...post} />
              ))}
            </div>

            {filteredPosts.length > 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {filteredPosts.slice(3, 4).map(post => (
                  <div key={post.id} className="lg:col-span-2">
                    <BlogCard {...post} wide />
                  </div>
                ))}
                {filteredPosts.slice(4).map(post => (
                  <BlogCard key={post.id} {...post} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {filteredPosts.map(post => (
              <BlogCard key={post.id} {...post} wide />
            ))}
          </div>
        )}

        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-[hsl(var(--new-muted))] rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-[hsl(var(--new-muted-foreground))]" />
            </div>
            <h3 className="text-xl font-bold mb-2 font-[var(--font-outfit)]">Статьи не найдены</h3>
            <p className="text-[hsl(var(--new-muted-foreground))] font-[var(--font-sora)]">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-8 right-8 w-16 h-16 bg-[hsl(var(--new-accent))] rounded-full shadow-lg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--new-foreground))] rounded-lg" />
      </div>
    </div>
  );
}
