import { Clock, Calendar, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PodcastCardProps {
  id: number;
  image?: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  episode: number;
  category: string;
  platforms?: string[];
}

export const PodcastCard = ({
  id,
  image,
  title,
  description,
  date,
  duration,
  episode,
  category,
  platforms = []
}: PodcastCardProps) => {
  return (
    <article className="group bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
      {/* Cover Image */}
      <div className="relative aspect-square overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-podcast-primary/80 to-podcast-primary/40 flex items-center justify-center">
            <Headphones className="w-16 h-16 text-podcast-primary-foreground/80" />
          </div>
        )}
        {/* Episode Badge */}
        <Badge className="absolute top-3 right-3 bg-podcast-primary text-white border-0 font-bold">
          EP. {episode}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category */}
        <span className="text-xs font-semibold text-podcast-primary uppercase tracking-wide">
          {category}
        </span>

        {/* Title */}
        <h3 className="font-bold text-base mt-2 mb-2 line-clamp-2 group-hover:text-podcast-primary transition-colors">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {/* Platform icons */}
        {platforms.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Слушать:</span>
            <div className="flex gap-1">
              {platforms.map((platform, index) => (
                <div
                  key={index}
                  className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
                >
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {platform.charAt(0).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{duration} мин</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </article>
  );
};