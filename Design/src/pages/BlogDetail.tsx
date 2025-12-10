import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogCard } from "@/components/BlogCard";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Heart, Bookmark, Share2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const BlogDetail = () => {
  const { id } = useParams();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(124);

  // Mock blog post data
  const blogPost = {
    id: Number(id),
    image: "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=1600&q=80",
    title: "Модернизм в архитектуре: революция XX века",
    author: "Александр Петров",
    date: "25 октября 2025 г.",
    readingTime: 8,
    views: 842,
    category: "История архитектуры",
    content: `
      <p>Модернизм в архитектуре стал одним из самых влиятельных движений XX века, радикально изменившим представление о том, каким должно быть здание. Этот стиль возник как ответ на промышленную революцию и стремление к функциональности.</p>

      <h2>Истоки модернизма</h2>
      <p>В начале XX века архитекторы начали отходить от исторических стилей в поисках нового языка, отражающего дух времени. Промышленная революция принесла новые материалы — сталь, железобетон, стекло — и новые возможности строительства.</p>
      
      <img src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=80" alt="Модернистская архитектура" />
      
      <h2>Баухаус и его влияние</h2>
      <p>Школа Баухаус, основанная Вальтером Гропиусом в 1919 году в Веймаре, стала колыбелью модернистской архитектуры. Её принципы — единство формы и функции, использование современных материалов, отказ от декора — определили развитие архитектуры на десятилетия вперёд.</p>
      
      <p>Среди ключевых фигур Баухауса были Людвиг Мис ван дер Роэ, чей знаменитый принцип «меньше значит больше» стал девизом минимализма, и Марсель Брёйер, экспериментировавший с трубчатой сталью в мебельном дизайне.</p>

      <h3>Основные принципы Баухауса</h3>
      <p>Школа провозглашала несколько ключевых идей:</p>
      <ul>
        <li>Форма следует за функцией</li>
        <li>Честность материалов</li>
        <li>Отказ от излишнего декора</li>
        <li>Геометрическая чистота</li>
      </ul>

      <img src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&q=80" alt="Небоскрёбы модернизма" />

      <h2>Интернациональный стиль</h2>
      <p>В 1930-х годах модернизм превратился в так называемый Интернациональный стиль, распространившийся по всему миру. Его характерные черты — стеклянные фасады, свободная планировка, плоские крыши — стали символом прогресса и современности.</p>
      
      <p>После Второй мировой войны модернизм стал доминирующим стилем в архитектуре, особенно в корпоративном строительстве. Стеклянные небоскрёбы Мис ван дер Роэ определили облик деловых кварталов от Нью-Йорка до Токио.</p>

      <h2>Наследие модернизма</h2>
      <p>Сегодня модернизм остаётся влиятельным направлением, хотя и подвергся существенной критике в эпоху постмодернизма. Многие принципы модернистской архитектуры — функциональность, честность конструкции, использование современных технологий — по-прежнему актуальны.</p>
      
      <p>Современные архитекторы часто обращаются к наследию модернизма, переосмысливая его принципы в контексте устойчивого развития и новых технологий.</p>
    `
  };

  // Related posts for sidebar
  const relatedPosts = [
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
      title: "Знаменитая архитектура Москвы",
      description: "Путешествие по архитектурным достопримечательностям столицы",
      date: "23 октября 2025 г.",
      views: 756,
      comments: 0
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80",
      title: "Небоскрёбы: вертикальная архитектура",
      description: "Как небоскрёбы изменили облик городов",
      date: "20 октября 2025 г.",
      views: 1204,
      comments: 3
    }
  ];

  const recommendedPosts = [
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80",
      title: "Устойчивая архитектура",
      description: "Проектирование для планеты",
      date: "18 октября 2025 г.",
      views: 2156,
      comments: 12
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&q=80",
      title: "Готическая архитектура Европы",
      description: "Величественные соборы средневековья",
      date: "15 октября 2025 г.",
      views: 934,
      comments: 5
    }
  ];

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    toast.success(isLiked ? "Лайк убран" : "Статья понравилась!");
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Удалено из закладок" : "Добавлено в закладки");
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка скопирована в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onViewChange={() => {}} currentView="grid" onSearch={() => {}} />

      <main className="container mx-auto px-6 py-8">
        {/* Back button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Назад к статьям</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <article className="lg:col-span-2">
            {/* Cover image with action buttons */}
            <div className="relative mb-8">
              <img 
                src={blogPost.image} 
                alt={blogPost.title}
                className="w-full aspect-[16/9] object-cover"
              />
              
              {/* Action buttons overlay */}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={handleLike}
                >
                  <Heart 
                    className={`h-5 w-5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
                  />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={handleBookmark}
                >
                  <Bookmark 
                    className={`h-5 w-5 transition-colors ${isBookmarked ? 'fill-primary text-primary' : ''}`} 
                  />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Header section */}
            <header className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-3 py-1">
                  {blogPost.category}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight font-display">
                {blogPost.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{blogPost.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{blogPost.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{blogPost.readingTime} мин чтения</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>{likeCount}</span>
                </div>
              </div>
            </header>

            {/* Content blocks showcase */}
            <div className="space-y-12">
              {/* Text block — full-width paragraph */}
              <section>
                <p className="text-foreground/90 leading-relaxed text-lg">
                  Модернизм в архитектуре стал одним из самых влиятельных движений XX века, радикально изменившим представление о том, каким должно быть здание. Этот стиль возник как ответ на промышленную революцию и стремление к функциональности. Школа Баухаус, основанная Вальтером Гропиусом в 1919 году, стала колыбелью модернистской архитектуры.
                </p>
              </section>

              {/* Text + Image (left) — image on the left, text on the right */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <img 
                  src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80" 
                  alt="Модернистская архитектура"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold font-display mb-4">Истоки модернизма</h2>
                  <p className="text-foreground/90 leading-relaxed">
                    В начале XX века архитекторы начали отходить от исторических стилей в поисках нового языка, отражающего дух времени. Промышленная революция принесла новые материалы — сталь, железобетон, стекло — и новые возможности строительства.
                  </p>
                </div>
              </section>

              {/* Text + Image (right) — image on the right, text on the left */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="md:order-1 order-2">
                  <h2 className="text-2xl font-bold font-display mb-4">Баухаус и его влияние</h2>
                  <p className="text-foreground/90 leading-relaxed">
                    Принципы Баухауса — единство формы и функции, использование современных материалов, отказ от декора — определили развитие архитектуры на десятилетия вперёд. Среди ключевых фигур был Людвиг Мис ван дер Роэ, чей принцип «меньше значит больше» стал девизом минимализма.
                  </p>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80" 
                  alt="Небоскрёбы модернизма"
                  className="w-full aspect-[4/3] object-cover md:order-2 order-1"
                />
              </section>

              {/* Wide image block — image stretched across the full content width */}
              <section>
                <img 
                  src="https://images.unsplash.com/photo-1486718448742-163732cd1544?w=1600&q=80" 
                  alt="Широкий вид на архитектуру"
                  className="w-full aspect-[21/9] object-cover"
                />
                <p className="text-sm text-muted-foreground mt-3">
                  Панорамный вид на современный городской ландшафт с элементами модернистской архитектуры
                </p>
              </section>

              {/* Gallery block — grid of several images */}
              <section>
                <h2 className="text-2xl font-bold font-display mb-6">Галерея проектов</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <img 
                    src="https://images.unsplash.com/photo-1513326738677-b964603b136d?w=600&q=80" 
                    alt="Архитектура 1"
                    className="w-full aspect-square object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80" 
                    alt="Архитектура 2"
                    className="w-full aspect-square object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=600&q=80" 
                    alt="Архитектура 3"
                    className="w-full aspect-square object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=600&q=80" 
                    alt="Архитектура 4"
                    className="w-full aspect-square object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1460574283810-2aab119d8511?w=600&q=80" 
                    alt="Архитектура 5"
                    className="w-full aspect-square object-cover"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=600&q=80" 
                    alt="Архитектура 6"
                    className="w-full aspect-square object-cover"
                  />
                </div>
              </section>

              {/* Object card block — architecture object card */}
              <section>
                <h2 className="text-2xl font-bold font-display mb-6">Упомянутый объект</h2>
                <article className="border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    <img 
                      src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80" 
                      alt="Здание Баухауса"
                      className="w-full aspect-[4/3] md:aspect-auto md:h-full object-cover"
                    />
                    <div className="md:col-span-2 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-1">
                          Образование
                        </span>
                        <span className="text-xs text-muted-foreground">Дессау, Германия</span>
                      </div>
                      <h3 className="text-xl font-bold font-display mb-2">Здание Баухауса</h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        Главное здание школы Баухаус, спроектированное Вальтером Гропиусом в 1925 году. Является образцом функционализма и включено в список Всемирного наследия ЮНЕСКО.
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>1925–1926</span>
                        <span>•</span>
                        <span>Вальтер Гропиус</span>
                        <span>•</span>
                        <span>Модернизм</span>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-8">
            {/* More from category */}
            <div className="bg-card border border-border p-6">
              <h3 className="text-lg font-bold mb-4 font-display">Ещё из категории</h3>
              <div className="space-y-4">
                {relatedPosts.map(post => (
                  <Link 
                    key={post.id} 
                    to={`/blog/${post.id}`}
                    className="flex gap-4 group"
                  >
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-20 h-20 object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">{post.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommended */}
            <div className="bg-card border border-border p-6">
              <h3 className="text-lg font-bold mb-4 font-display">Рекомендуем</h3>
              <div className="space-y-4">
                {recommendedPosts.map(post => (
                  <Link 
                    key={post.id} 
                    to={`/blog/${post.id}`}
                    className="flex gap-4 group"
                  >
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-20 h-20 object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">{post.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogDetail;
