import { useState } from "react";
import { Search, X, FileText, Newspaper, Mic, MapPin, Building2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  type: "blog" | "news" | "podcast" | "route" | "building";
  title: string;
  description?: string;
  category?: string;
}

const recentSearches = [
  "Конструктивизм в Москве",
  "Шуховская башня",
  "Архитектура модернизма",
];

const quickLinks = [
  { icon: FileText, label: "Блог", href: "/", color: "text-primary" },
  { icon: Newspaper, label: "Новости", href: "/news", color: "text-news-primary" },
  { icon: Mic, label: "Подкасты", href: "/podcasts", color: "text-podcast-primary" },
  { icon: MapPin, label: "Маршруты", href: "/routes", color: "text-primary" },
];

const popularResults: SearchResult[] = [
  { type: "blog", title: "Архитектура конструктивизма", category: "Статья" },
  { type: "news", title: "Открытие выставки в МАРХИ", category: "Новость" },
  { type: "podcast", title: "История советского модернизма", category: "Подкаст" },
  { type: "building", title: "Дом Наркомфина", category: "Объект" },
];

const getTypeIcon = (type: SearchResult["type"]) => {
  switch (type) {
    case "blog":
      return FileText;
    case "news":
      return Newspaper;
    case "podcast":
      return Mic;
    case "route":
      return MapPin;
    case "building":
      return Building2;
    default:
      return FileText;
  }
};

const getTypeColor = (type: SearchResult["type"]) => {
  switch (type) {
    case "blog":
      return "text-primary";
    case "news":
      return "text-news-primary";
    case "podcast":
      return "text-podcast-primary";
    default:
      return "text-primary";
  }
};

export const SearchModal = ({ open, onOpenChange }: SearchModalProps) => {
  const [query, setQuery] = useState("");

  const handleClear = () => {
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 bg-card border-2 border-foreground overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Поиск</DialogTitle>
        </VisuallyHidden>
        
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-foreground">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Поиск по сайту..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-lg font-medium placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Quick Links */}
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Разделы
            </p>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted border border-border rounded-[0.75rem] transition-colors group"
                >
                  <link.icon className={`h-4 w-4 ${link.color}`} />
                  <span className="text-sm font-medium">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="px-6 py-4 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Недавние запросы
              </p>
              <div className="space-y-1">
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => setQuery(search)}
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted rounded-[0.75rem] transition-colors group text-left"
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{search}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Results */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Популярное
            </p>
            <div className="space-y-1">
              {popularResults.map((result, index) => {
                const Icon = getTypeIcon(result.type);
                const colorClass = getTypeColor(result.type);
                return (
                  <button
                    key={index}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 w-full px-3 py-3 hover:bg-muted rounded-[0.75rem] transition-colors group text-left"
                  >
                    <div className={`w-10 h-10 flex items-center justify-center bg-muted rounded-[0.5rem] ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.category}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded">↓</kbd>
              <span className="ml-1">навигация</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded">↵</kbd>
              <span className="ml-1">выбрать</span>
            </span>
          </div>
          <span>Powered by ArchiRoutes</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
