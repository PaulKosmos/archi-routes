import { Search, Bell, User, Building2, MapPin, Eye, Heart, Settings, LogOut, Users, FileText, Newspaper, Sparkles, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onViewChange: (view: 'grid' | 'list') => void;
  currentView: 'grid' | 'list';
  onSearch: (query: string) => void;
}

export const Header = ({ onViewChange, currentView, onSearch }: HeaderProps) => {
  const userStats = {
    buildings: 4,
    routes: 19,
    reviews: 2,
    favorites: 1,
  };

  const menuItems = [
    { icon: User, label: "Мой профиль", href: "/profile" },
    { icon: Settings, label: "Редактировать профиль", href: "/profile/edit" },
    { icon: Building2, label: "Объекты", href: "/objects", count: 4 },
    { icon: Eye, label: "Мои обзоры", href: "/reviews", count: 2 },
    { icon: Heart, label: "Избранные маршруты", href: "/favorites", count: 1 },
    { icon: MapPin, label: "Мои коллекции", href: "/collections", count: 1 },
    { icon: MapPin, label: "Мои маршруты", href: "/routes", count: 19 },
    { icon: Settings, label: "Настройки", href: "/settings" },
  ];

  const adminItems = [
    { icon: Shield, label: "Модерация", href: "/admin/moderation" },
    { icon: Sparkles, label: "Автогенерация", href: "/admin/autogen" },
    { icon: Users, label: "Управление пользователями", href: "/admin/users" },
    { icon: FileText, label: "Модерация контента", href: "/admin/content" },
    { icon: Newspaper, label: "Управление новостями", href: "/admin/news" },
  ];

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
              className="font-medium hover:text-news-primary transition-colors"
              activeClassName="text-news-primary"
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-4 border-l-2 border-border hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">Павел</p>
                    <p className="text-xs text-muted-foreground">Администратор</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-card border border-border shadow-lg">
                {/* User Info Section */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-destructive flex items-center justify-center">
                      <span className="text-xl">🦸</span>
                    </div>
                    <div>
                      <p className="font-semibold">Павел</p>
                      <p className="text-sm text-muted-foreground">paul.kosenkov@gmail.com</p>
                      <p className="text-xs text-primary font-medium">Администратор</p>
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-border text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Зданий: <strong>{userStats.buildings}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Маршрутов: <strong>{userStats.routes}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>Обзоров: <strong>{userStats.reviews}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Избранное: <strong>{userStats.favorites}</strong></span>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {menuItems.map((item) => (
                    <DropdownMenuItem key={item.label} className="flex items-center justify-between px-4 py-2 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && (
                        <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>

                <DropdownMenuSeparator />

                {/* Admin Section */}
                <div className="py-2">
                  {adminItems.map((item) => (
                    <DropdownMenuItem key={item.label} className="flex items-center gap-3 px-4 py-2 cursor-pointer text-amber-600">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </div>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem className="flex items-center gap-3 px-4 py-2 cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
