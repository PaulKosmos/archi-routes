import { Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";

interface HeaderProps {
  onViewChange: (view: 'grid' | 'list') => void;
  currentView: 'grid' | 'list';
  onSearch: (query: string) => void;
}

export const Header = ({ onViewChange, currentView, onSearch }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary bevel-edge flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ArchiRoutes</h1>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink 
              to="/map" 
              className="font-medium hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              Карта
            </NavLink>
            <NavLink 
              to="/news" 
              className="font-medium hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              Новости
            </NavLink>
            <NavLink 
              to="/" 
              className="font-medium hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              Блог
            </NavLink>
            <NavLink 
              to="/podcasts" 
              className="font-medium hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              Подкасты
            </NavLink>
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 pl-4 border-l-2 border-border">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">Павел</p>
                <p className="text-xs text-muted-foreground">Администратор</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
