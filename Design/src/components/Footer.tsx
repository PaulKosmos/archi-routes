import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Footer = () => {
  const navigationLinks = [
    { label: "Главная", href: "/" },
    { label: "Карта", href: "/map" },
    { label: "Новости", href: "/news" },
    { label: "Блог", href: "/" },
    { label: "Подкасты", href: "/podcasts" },
  ];

  const infoLinks = [
    { label: "О нас", href: "/about" },
    { label: "Контакты", href: "/contacts" },
    { label: "Политика конфиденциальности", href: "/privacy" },
    { label: "Условия использования", href: "/terms" },
  ];

  const bottomLinks = [
    { label: "Карта сайта", href: "/sitemap" },
    { label: "Статус", href: "/status" },
    { label: "Документация", href: "/docs" },
  ];

  return (
    <footer className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,96%)] mt-16">
      {/* Main Footer */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-[var(--radius)] flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AR</span>
              </div>
              <span className="text-xl font-bold">ArchiRoutes</span>
            </div>
            <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed">
              Откройте архитектуру города через призму сообщества энтузиастов. 
              Исследуйте здания, делитесь маршрутами и создавайте вместе с нами.
            </p>
            <p className="text-xs text-[hsl(215,20%,55%)]">
              Платформа для путешествия по архитектурным сокровищам мира
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Навигация</h3>
            <ul className="space-y-2">
              {navigationLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-[hsl(215,20%,65%)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Информация</h3>
            <ul className="space-y-2">
              {infoLinks.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-[hsl(215,20%,65%)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Подпишитесь</h3>
            <p className="text-sm text-[hsl(215,20%,65%)] mb-4">
              Получайте обновления об архитектуре и новых маршрутах
            </p>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter your email" 
                className="bg-[hsl(222,47%,15%)] border-[hsl(222,47%,20%)] text-white placeholder:text-[hsl(215,20%,50%)] h-10"
              />
              <Button size="icon" className="h-10 w-10 bg-primary hover:bg-primary/90">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-[hsl(215,20%,55%)] mt-4">Следите за нами</p>
            <div className="flex gap-3 mt-2">
              <a href="#" className="w-9 h-9 rounded-full border border-[hsl(222,47%,25%)] flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full border border-[hsl(222,47%,25%)] flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full border border-[hsl(222,47%,25%)] flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full border border-[hsl(222,47%,25%)] flex items-center justify-center hover:border-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[hsl(222,47%,18%)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[hsl(215,20%,55%)]">
              © 2025 ArchiRoutes. Все права защищены.
            </p>
            <div className="flex items-center gap-6">
              {bottomLinks.map((link) => (
                <a 
                  key={link.label}
                  href={link.href} 
                  className="text-sm text-[hsl(215,20%,55%)] hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Made with Love */}
      <div className="border-t border-[hsl(222,47%,18%)]">
        <div className="container mx-auto px-6 py-3 text-center">
          <p className="text-sm text-[hsl(215,20%,55%)]">
            Сделано с любовью к архитектуре ❤️
          </p>
        </div>
      </div>
    </footer>
  );
};