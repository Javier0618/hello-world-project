import { useQuery } from "@tanstack/react-query";
import { getSectionContent, getSectionContentForTab, type Section, type Media } from "@/lib/sectionQueries";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "./ui/button";

interface BackdropCarouselProps {
  section: Section;
  tabId?: string;
}

const getBackdropUrl = (backdropPath: string | null | undefined, size: string = "w1280"): string => {
  if (!backdropPath) return "";
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
};

export const BackdropCarousel = ({ section, tabId }: BackdropCarouselProps) => {
  const { data: content, isLoading } = useQuery({
    queryKey: ["section-content", section.id, tabId || "default"],
    queryFn: () => tabId ? getSectionContentForTab(section, tabId) : getSectionContent(section),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="h-6 w-40 bg-muted animate-pulse rounded mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[300px] h-[170px] md:w-[400px] md:h-[225px] bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!content || content.length === 0) return null;

  const filteredContent = content.filter((item: Media) => item.backdrop_path);

  if (filteredContent.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 px-2">
        {section.name}
      </h2>
      
      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-3">
          {filteredContent.map((item: Media) => {
            const mediaType = "title" in item ? "movie" : "tv";
            const title = "title" in item ? item.title : item.name;
            const detailPath = mediaType === "movie" ? `/movie/${item.id}` : `/tv/${item.id}`;
            
            return (
              <CarouselItem
                key={item.id}
                className="pl-2 md:pl-3 basis-[85%] sm:basis-[60%] md:basis-[45%] lg:basis-[35%] xl:basis-[28%]"
              >
                <Link to={detailPath} className="block group relative overflow-hidden rounded-lg">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <img
                      src={getBackdropUrl(item.backdrop_path)}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 md:group-hover:opacity-80 transition-opacity duration-300" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-white font-bold text-lg md:text-xl line-clamp-2 mb-2">
                        {title}
                      </h3>
                      
                      <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                          className="bg-white text-black hover:bg-white/90 gap-1"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Ver ahora
                        </Button>
                      </div>
                    </div>
                    
                    {item.vote_average && item.vote_average > 0 && (
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-sm font-semibold text-yellow-400">
                        {item.vote_average.toFixed(1)}
                      </div>
                    )}
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
    </section>
  );
};
