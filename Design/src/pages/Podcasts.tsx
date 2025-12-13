import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PodcastCard } from "@/components/PodcastCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Plus, 
  Headphones,
  ChevronRight,
  Grid3x3,
  List
} from "lucide-react";
import { useScrollEnd } from "@/hooks/use-scroll-end";

const Podcasts = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentRef, isAtEnd] = useScrollEnd(200);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const series = [
    { id: 'arch-history', label: 'Architecture & History' },
    { id: 'city-stories', label: 'City Stories' },
    { id: 'modern-design', label: 'Modern Design' },
    { id: 'tashkent-mahalla', label: 'Tashkent mahalla' },
  ];

  const tags = [
    'Architecture',
    'Classicism',
    'Design',
    'Heritage',
    'History',
    'Mahalla',
    'Modernism',
    'Travel',
    'Urban Planning',
  ];

  const podcasts = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&q=80",
      title: "Langar 3 test",
      description: "Данный источник представляет собой...",
      date: "5 нояб. 2025 г.",
      duration: 1,
      episode: 1,
      category: "TASHKENT MAHALLA",
      platforms: ["spotify", "apple"]
    },
    {
      id: 2,
      image: "",
      title: "Sustainable Urban Development",
      description: "How cities worldwide are embracing green architectur...",
      date: "3 нояб. 2025 г.",
      duration: 48,
      episode: 1,
      category: "MODERN DESIGN",
      platforms: []
    },
    {
      id: 3,
      image: "",
      title: "Minimalism in Modern Architecture",
      description: "Understanding the principles of minimalism and how...",
      date: "2 нояб. 2025 г.",
      duration: 40,
      episode: 2,
      category: "ARCHITECTURE & HISTORY",
      platforms: []
    },
    {
      id: 4,
      image: "",
      title: "Berlin: City of Contradictions",
      description: "A deep dive into Berlin's architectural history, from...",
      date: "31 окт. 2025 г.",
      duration: 52,
      episode: 1,
      category: "CITY STORIES",
      platforms: ["spotify", "apple", "youtube"]
    },
    {
      id: 5,
      image: "",
      title: "The Rise of Gothic Architecture",
      description: "Exploring the fascinating history of Gothic architectur...",
      date: "27 окт. 2025 г.",
      duration: 45,
      episode: 1,
      category: "ARCHITECTURE & HISTORY",
      platforms: []
    },
  ];

  const toggleSeries = (id: string) => {
    setSelectedSeries(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onViewChange={setView} currentView={view} onSearch={setSearchQuery} />
      
      <main className="container mx-auto px-6 py-8">
        <div ref={contentRef}>
          {/* Search and View Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Искать эпизоды..." 
                className="pl-12 h-12 border border-border" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={view === 'grid' ? 'default' : 'outline'} 
                size="icon" 
                onClick={() => setView('grid')} 
                className={`h-12 w-12 ${view === 'grid' ? 'bg-podcast-primary hover:bg-podcast-primary/90' : ''}`}
              >
                <Grid3x3 className="h-5 w-5" />
              </Button>
              <Button 
                variant={view === 'list' ? 'default' : 'outline'} 
                size="icon" 
                onClick={() => setView('list')} 
                className={`h-12 w-12 ${view === 'list' ? 'bg-podcast-primary hover:bg-podcast-primary/90' : ''}`}
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-border">
            <span className="text-sm font-medium">
              Найдено эпизодов: <span className="font-bold text-podcast-primary">{podcasts.length}</span>
            </span>
            <Button className="gap-2 bg-podcast-primary hover:bg-podcast-primary/90 text-white">
              <Plus className="h-4 w-4" />
              Добавить подкаст
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="flex gap-8">
            {/* Sidebar Filters */}
            <aside className="w-64 flex-shrink-0">
              <div className="bg-card border border-border p-5">
                {/* Series */}
                <div className="mb-6">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-4 text-podcast-primary">Серии</h3>
                  <div className="space-y-3">
                    {series.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox 
                          checked={selectedSeries.includes(s.id)}
                          onCheckedChange={() => toggleSeries(s.id)}
                          className="border-podcast-primary data-[state=checked]:bg-podcast-primary data-[state=checked]:border-podcast-primary"
                        />
                        <span className="text-sm">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-4 text-podcast-primary">Теги</h3>
                  <div className="space-y-3">
                    {tags.map((tag) => (
                      <label key={tag} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox 
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                          className="border-podcast-primary data-[state=checked]:bg-podcast-primary data-[state=checked]:border-podcast-primary"
                        />
                        <span className="text-sm">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1">
              {/* Podcast Grid */}
              <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 max-w-3xl'}`}>
                {podcasts.map((podcast) => (
                  <PodcastCard key={podcast.id} {...podcast} />
                ))}
              </div>

              {/* Empty State */}
              {podcasts.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Headphones className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Подкастов не найдено</h3>
                  <p className="text-muted-foreground">Попробуйте изменить фильтры или поисковый запрос</p>
                </div>
              )}
            </div>
          </div>

          {/* Player Bar Placeholder */}
          <div className="mt-8 py-4 border-t border-border text-center text-muted-foreground text-sm">
            Выберите подкаст для прослушивания
          </div>
        </div>

        {/* Next Page Button */}
        <div className={`flex justify-center py-12 transition-opacity duration-300 ${isAtEnd ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button className="group w-14 h-14 border-2 border-podcast-primary bg-transparent hover:bg-podcast-primary transition-all duration-300 flex items-center justify-center">
            <ChevronRight className="h-6 w-6 text-podcast-primary group-hover:text-white transition-colors duration-300" />
          </button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Podcasts;