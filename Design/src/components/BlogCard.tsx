import { Link } from "react-router-dom";
import { Calendar, Clock, Eye, MessageCircle } from "lucide-react";

interface BlogCardProps {
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

export const BlogCard = ({ id, image, title, description, date, views, comments, readingTime = 5, wide }: BlogCardProps) => {
  if (wide) {
    return (
      <Link to={`/blog/${id}`} className="block">
        <article className="bg-card overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col md:flex-row h-full">
        <div className="relative md:w-1/2 h-48 md:h-auto overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-6 md:w-1/2 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-primary transition-colors cursor-pointer">
              {title}
            </h3>
            
            <p className="text-muted-foreground mb-4 line-clamp-3 text-sm">
              {description}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t-2 border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{date}</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
      </Link>
    );
  }

  return (
    <Link to={`/blog/${id}`} className="block h-full">
      <article className="bg-card overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg h-full">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold mb-3 line-clamp-2 hover:text-primary transition-colors cursor-pointer">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
          {description}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t-2 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{date}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
    </Link>
  );
};
