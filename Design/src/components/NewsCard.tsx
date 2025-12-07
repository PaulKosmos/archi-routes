import { Eye, MessageCircle, Clock, Calendar, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NewsCardProps {
  image?: string;
  title: string;
  description?: string;
  date: string;
  readingTime?: number;
  views: number;
  comments: number;
  category?: string;
  tags?: string[];
  author?: string;
  featured?: boolean;
  variant?: 'default' | 'horizontal' | 'compact';
}

export const NewsCard = ({
  image,
  title,
  description,
  date,
  readingTime = 3,
  views,
  comments,
  category,
  tags = [],
  author,
  featured = false,
  variant = 'default'
}: NewsCardProps) => {
  if (variant === 'horizontal') {
    return (
      <article className="group bg-card border border-border overflow-hidden hover:shadow-md transition-shadow h-fit">
        <div className="flex flex-col md:flex-row md:h-[320px]">
          <div className="md:w-2/5 relative aspect-[4/3] md:aspect-auto overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">Изображение отсутствует</span>
              </div>
            )}
            {category && (
              <Badge className="absolute top-3 left-3 bg-news-primary text-white border-0">
                {category}
              </Badge>
            )}
            {featured && (
              <Badge className="absolute top-3 right-3 bg-orange-500 text-white border-0">
                Главная новость
              </Badge>
            )}
          </div>
          <div className="md:w-3/5 p-5 flex flex-col">
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readingTime} мин
              </span>
            </div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-news-primary transition-colors line-clamp-2">
              {title}
            </h3>
            {description && (
              <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{description}</p>
            )}
            {author && (
              <p className="text-xs text-muted-foreground mb-3">
                <span className="text-news-primary">●</span> {author}
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {views}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {comments}
                </span>
                <Share2 className="h-3 w-3 cursor-pointer hover:text-news-primary" />
              </div>
              <button className="text-xs text-news-primary font-medium hover:underline">
                Читать далее →
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="group bg-card border border-border overflow-hidden hover:shadow-md transition-shadow">
        <div className="relative aspect-[4/3] overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Изображение отсутствует</span>
            </div>
          )}
          {category && (
            <Badge className="absolute top-3 left-3 bg-news-primary text-white border-0 text-xs">
              {category}
            </Badge>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime} мин
            </span>
          </div>
          <h3 className="font-semibold text-sm mb-2 group-hover:text-news-primary transition-colors line-clamp-2">
            {title}
          </h3>
          {description && (
            <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {views}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {comments}
              </span>
            </div>
            <button className="text-xs text-news-primary font-medium hover:underline">
              Читать далее →
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article className="group bg-card border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">Изображение отсутствует</span>
          </div>
        )}
        {category && (
          <Badge className="absolute top-3 left-3 bg-news-primary text-white border-0">
            {category}
          </Badge>
        )}
        {featured && (
          <Badge className="absolute top-3 right-3 bg-orange-500 text-white border-0">
            Главная новость
          </Badge>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime} мин
          </span>
        </div>
        <h3 className="font-bold text-lg mb-2 group-hover:text-news-primary transition-colors line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{description}</p>
        )}
        {author && (
          <p className="text-xs text-muted-foreground mb-3">
            <span className="text-news-primary">●</span> {author}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {views}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {comments}
            </span>
            <Share2 className="h-3 w-3 cursor-pointer hover:text-news-primary" />
          </div>
          <button className="text-xs text-news-primary font-medium hover:underline">
            Читать далее →
          </button>
        </div>
      </div>
    </article>
  );
};
