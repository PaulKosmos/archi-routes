import { useState } from "react";
import { Header } from "@/components/Header";
import { BlogCard } from "@/components/BlogCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Grid3x3, List, Plus, Search } from "lucide-react";
const Index = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const blogPosts = [{
    id: 1,
    image: "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=800&q=80",
    title: "Модернизм в архитектуре: революция XX века",
    description: "История модернизма в архитектуре: от Баухауса до современности. Основные принципы и знаковые здания",
    date: "25 октября 2025 г.",
    views: 842,
    comments: 0
  }, {
    id: 2,
    image: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
    title: "Знаменитая архитектура Москвы: путеводитель по столице",
    description: "Путешествие по самым знаменитым архитектурным достопримечательностям Москвы — от Кремля до Москва-Сити",
    date: "23 октября 2025 г.",
    views: 756,
    comments: 0
  }, {
    id: 3,
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80",
    title: "Небоскрёбы: вертикальная архитектура будущего",
    description: "Как небоскрёбы изменили облик городов и что ждёт высотное строительство в ближайшие десятилетия",
    date: "20 октября 2025 г.",
    views: 1204,
    comments: 3
  }, {
    id: 4,
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80",
    title: "Устойчивая архитектура: проектирование для планеты",
    description: "Экологичные материалы, энергоэффективность и зелёные технологии в современном строительстве. Как архитекторы создают здания будущего",
    date: "18 октября 2025 г.",
    views: 2156,
    comments: 12,
    wide: true
  }, {
    id: 5,
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&q=80",
    title: "Готическая архитектура Европы",
    description: "Величественные соборы и замки средневековья: история и особенности готического стиля",
    date: "15 октября 2025 г.",
    views: 934,
    comments: 5
  }];
  return <div className="min-h-screen bg-background">
      <Header onViewChange={setView} currentView={view} onSearch={setSearchQuery} />
      
      <main className="container mx-auto px-6 py-8">

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Поиск статей..." className="pl-12 h-12 border border-border" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="flex gap-2">
            <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setView('grid')} className="h-12 w-12">
              <Grid3x3 className="h-5 w-5" />
            </Button>
            <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setView('list')} className="h-12 w-12">
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-border">
          <span className="text-sm font-medium">
            Найдено статей: <span className="font-bold text-primary">{blogPosts.length}</span>
          </span>
        </div>

        {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(0, 3).map(post => (
              <BlogCard key={post.id} {...post} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {blogPosts.map(post => (
              <BlogCard key={post.id} {...post} />
            ))}
          </div>
        )}
        
        {view === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
            {blogPosts.slice(3, 4).map(post => (
              <div key={post.id} className="lg:col-span-2">
                <BlogCard {...post} wide />
              </div>
            ))}
            {blogPosts.slice(4).map(post => (
              <BlogCard key={post.id} {...post} />
            ))}
          </div>
        )}

        {blogPosts.length === 0 && <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Статьи не найдены</h3>
            <p className="text-muted-foreground">Попробуйте изменить параметры поиска</p>
          </div>}
      </main>

      <div className="fixed bottom-8 right-8 w-16 h-16 bg-accent rounded-full shadow-lg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-foreground rounded-lg" />
      </div>
    </div>;
};
export default Index;