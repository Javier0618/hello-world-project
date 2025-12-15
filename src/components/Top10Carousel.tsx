import { useQuery } from "@tanstack/react-query"
import { getTop10Content, type Section, type Top10Item } from "@/lib/sectionQueries"
import { getImageUrl } from "@/lib/tmdb"
import { Link } from "react-router-dom"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { OptimizedImage } from "@/components/OptimizedImage"

interface Top10CarouselProps {
  section: Section
  tabId?: string
}

const RankingNumber = ({ number }: { number: number }) => {
  return (
    <div className="h-full w-full flex items-center justify-center pr-1 md:pr-2">
      <svg
        viewBox="0 0 100 120"
        className="h-full w-auto max-w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <text
          x="65"
          y="135"
          fontSize="200"
          fontWeight="900"
          textAnchor="middle"
          fill="#000000"
          stroke="#ffffff"
          strokeWidth="2"
          paintOrder="stroke fill"
          style={{ letterSpacing: "-40px" }}
        >
          {number}
        </text>
      </svg>
    </div>
  )
}

const Top10Card = ({
  item,
  detailPath,
  title,
  priority,
}: { item: Top10Item; detailPath: string; title: string; priority?: boolean }) => {
  return (
    <Link to={detailPath} className="block group h-full">
      <div className="flex items-stretch gap-0 h-full">
        <div className="w-[40%] flex-shrink-0 flex items-center justify-center relative z-0">
          <RankingNumber number={item.ranking} />
        </div>
        <div className="w-[60%] flex-shrink-0 relative overflow-hidden rounded-lg aspect-[2/3] bg-muted shadow-md">
          {item.poster_path ? (
            <OptimizedImage
              src={getImageUrl(item.poster_path, "w342")}
              alt={title}
              className="w-full h-full object-cover md:transition-transform md:duration-300 md:group-hover:scale-105"
              containerClassName="w-full h-full"
              priority={priority}
              width={342}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm text-center px-2">{title}</span>
            </div>
          )}
          <div className="absolute inset-0 md:bg-black/0 md:group-hover:bg-black/20 md:transition-colors md:duration-300 z-10" />
        </div>
      </div>
    </Link>
  )
}

export const Top10Carousel = ({ section, tabId = "inicio" }: Top10CarouselProps) => {
  const { data: content, isLoading } = useQuery({
    queryKey: ["top10-content", section.id, tabId],
    queryFn: () => getTop10Content(tabId, section.id),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="mb-6 px-4">
        <div className="h-7 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 flex h-[200px] md:h-[250px] w-[70%] md:w-[40%]">
              <div className="w-[40%] h-full bg-muted/50 animate-pulse rounded-l-lg"></div>
              <div className="w-[60%] h-full bg-muted animate-pulse rounded-r-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!content || content.length === 0) return null

  return (
    <section className="mb-2">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 px-4">{section.name}</h2>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4 px-4">
          {content.map((item: Top10Item, index: number) => {
            const mediaType = "title" in item ? "movie" : "tv"
            const title = "title" in item ? item.title : item.name
            const detailPath = mediaType === "movie" ? `/movie/${item.id}` : `/tv/${item.id}`

            return (
              <CarouselItem
                key={`${item.id}-${item.ranking}`}
                className="pl-4 basis-[75%] sm:basis-[60%] md:basis-[45%] lg:basis-[35%] xl:basis-[28%]"
              >
                <Top10Card item={item} detailPath={detailPath} title={title} priority={index < 2} />
              </CarouselItem>
            )
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex left-1" />
        <CarouselNext className="hidden md:flex right-1" />
      </Carousel>
    </section>
  )
}
