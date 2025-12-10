import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsCard } from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Settings, 
  Newspaper,
  ChevronRight
} from "lucide-react";
import { useScrollEnd } from "@/hooks/use-scroll-end";

const News = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [contentRef, isAtEnd] = useScrollEnd(200);
  const categories = [
    { id: 'all', label: 'ВСЕ НОВОСТИ' },
    { id: 'projects', label: 'АРХИТЕКТУРНЫЕ ПРОЕКТЫ' },
    { id: 'events', label: 'СОБЫТИЯ' },
    { id: 'people', label: 'ПЕРСОНАЛИИ' },
    { id: 'trends', label: 'ТРЕНДЫ' },
    { id: 'urban', label: 'ГОРОДСКОЕ ПЛАНИРОВАНИЕ' },
    { id: 'history', label: 'НАСЛЕДИЕ' },
  ];

  const featuredNews = {
    id: 1,
    image: "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=1200&q=80",
    title: "Новая концепция устойчивого строительства меняет облик Берлина",
    description: "Берлинские архитекторы представили революционную концепцию устойчивого строительства с использованием 100% переработанных материалов и инновационных энергоэффективных решений.",
    date: "3 августа 2025 г.",
    readingTime: 7,
    views: 285,
    comments: 23,
    category: "Архитектурные проекты",
    tags: ["Устойчивость", "Экология", "Инновации", "Европа", "Зелёная цепен"],
    author: "Сергей Терехов",
    featured: true
  };

  const newsItems = [
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80",
      title: "Тестовая новость 10 ноября",
      description: "Тестовое создание новости.",
      date: "4 ноября 2025 г.",
      readingTime: 1,
      views: 88,
      comments: 0,
      category: "Архитектурные проекты",
      tags: ["Авто"],
      author: "Сергей Терехов"
    },
    {
      id: 3,
      image: "",
      title: "Test Migration News Article",
      description: "This is a test article created after the migration.",
      date: "2 ноября 2025 г.",
      readingTime: 5,
      views: 2,
      comments: 0,
      category: "Архитектурные проекты"
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&q=80",
      title: "Новая концепция устойчивого строительства меняет облик...",
      description: "Берлинская архитектура представила революционную концепцию устойчивого строительства с...",
      date: "10 августа 2025 г.",
      readingTime: 7,
      views: 209,
      comments: 26,
      category: "Архитектурные проекты",
      tags: ["Sustainability", "Innovation", "Германия"],
      author: "Борис, Германия",
      featured: true
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
      title: "Анализ современных небоскрёбов Москвы: новая эра вертикального...",
      description: "Детальный анализ новых уникальных небоскрёбов-небоскрёбов Москва-Сити и их влияния на...",
      date: "2 августа 2025 г.",
      readingTime: 11,
      views: 71,
      comments: 28,
      category: "Тренды",
      tags: ["Небоскрёбы", "Тренды", "Высотное строительство", "Рекордные высоты"],
      author: "Москва, Россия"
    },
    {
      id: 6,
      image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
      title: "Успешная реставрация исторического центра Праги...",
      description: "Долгожданный завершён проект реставрации исторического центра Праги, включая ратушу ЮНЕСКО.",
      date: "5 августа 2025 г.",
      readingTime: 1,
      views: 473,
      comments: 34,
      category: "Наследие",
      tags: ["Чехия", "Наследие", "Историческая Карлов", "Авиком"],
      author: "Прага, Чехия"
    },
    {
      id: 7,
      image: "",
      title: "Тестовая опубликованная новость",
      description: "Первый вопрос опубликованная для тесной наследие...",
      date: "5 августа 2025 г.",
      readingTime: 1,
      views: 1,
      comments: 0,
      category: "События",
      tags: ["Публичный город", "Публичная страна", "видео"]
    },
    {
      id: 8,
      image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80",
      title: "Зеленые здания Европы: топ-10 экологических проектов 2025 года",
      description: "Представлен рейтинг топ-10 экологических проектов зеленых зданий Европы 2025 года со...",
      date: "31 июля 2025 г.",
      readingTime: 1,
      views: 126,
      comments: 71,
      category: "Тренды",
      tags: ["экология", "Зелёные город", "Инженер", "Германия"],
      author: "Авиком, Европа"
    },
    {
      id: 9,
      image: "",
      title: "Тестовая новость",
      description: "",
      date: "5 августа 2025 г.",
      readingTime: 1,
      views: 1,
      comments: 0,
      category: "Архитектурные проекты"
    }
  ];

  return (
    <div className="min-h-screen bg-background news-theme">
      <Header onViewChange={setView} currentView={view} onSearch={setSearchQuery} />
      
      <main className="container mx-auto px-6 py-8">
        <div ref={contentRef}>
          {/* Page Header */}
          <div className="flex items-center justify-end gap-2 mb-8">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Редактировать сетку
            </Button>
            <Button className="gap-2 bg-news-primary hover:bg-news-primary/90 text-white">
              <Plus className="h-4 w-4" />
              Добавить новость
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Искать новости" 
              className="pl-12 h-12 border border-border" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center flex-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 text-xs font-semibold tracking-wide rounded-none transition-colors flex-1 text-center ${
                    activeCategory === cat.id 
                      ? 'text-news-primary border-b-2 border-news-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured News - spans full width */}
          <div className="mb-6">
            <NewsCard {...featuredNews} variant="horizontal" />
          </div>

          {/* News Grid - 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.map((news) => (
              <NewsCard key={news.id} {...news} variant="compact" />
            ))}
          </div>

          {/* Empty State */}
          {newsItems.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Newspaper className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Новостей не найдено</h3>
              <p className="text-muted-foreground">Попробуйте изменить фильтры или поисковый запрос</p>
            </div>
          )}
        </div>

        {/* Next Page Button */}
        <div className={`flex justify-center py-12 transition-opacity duration-300 ${isAtEnd ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Button variant="outline" className="gap-2 px-8 h-12">
            Следующая страница
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default News;
