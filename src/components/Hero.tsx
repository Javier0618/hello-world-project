"use client"

import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getImageUrl, type Media, type Movie, type TVShow } from "@/lib/tmdb"
import { Button } from "@/components/ui/button"
import { Play, Info } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import Fade from "embla-carousel-fade"
import { cn } from "@/lib/utils"
import { useImageCacheContext } from "@/contexts/ImageCacheContext"
import { useHomeVisit } from "@/contexts/HomeVisitContext"

// =========================================================
// 1. NUEVO COMPONENTE: HeroTitle
// Se encarga de buscar el logo inteligente (ES -> EN -> Texto)
// =========================================================
interface HeroTitleProps {
  media: Media
  title: string
  shouldAnimate: boolean
}

const HeroTitle = ({ media, title, shouldAnimate }: HeroTitleProps) => {
  const isMovie = "title" in media
  const type = isMovie ? "movie" : "tv"

  const { data: logoPath, isLoading } = useQuery({
    queryKey: ["media-logo", type, media.id],
    queryFn: async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY
      
      const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${media.id}/images?api_key=${apiKey}&include_image_language=es,en,null`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      const logos = data.logos || []

      const spanishLogo = logos.find((logo: any) => logo.iso_639_1 === "es")
      if (spanishLogo) return spanishLogo.file_path

      const englishLogo = logos.find((logo: any) => logo.iso_639_1 === "en")
      if (englishLogo) return englishLogo.file_path

      return null
    },
    staleTime: 1000 * 60 * 60 * 24,
  })

  if (isLoading && shouldAnimate) {
    return <div className="h-16 md:h-32 w-1/2 animate-pulse bg-white/10 rounded-lg mb-4" />
  }

  if (isLoading && !shouldAnimate) {
    return <div className="h-16 md:h-32 w-1/2 mb-4" />
  }

  if (logoPath) {
    return (
      <img
        src={getImageUrl(logoPath, "original")}
        alt={`${title} logo`}
        className={cn(
          "max-h-24 md:max-h-48 max-w-[80%] object-contain mb-4 drop-shadow-2xl",
          shouldAnimate && "animate-in fade-in zoom-in duration-500"
        )}
      />
    )
  }

  return (
    <h1 className="text-3xl md:text-7xl font-bold mb-2 md:mb-4 text-foreground drop-shadow-lg leading-tight">
      {title}
    </h1>
  )
}

// =========================================================
// 2. COMPONENTE PRINCIPAL: Hero
// =========================================================

interface HeroProps {
  items: Media[]
  isActive?: boolean
  className?: string
}

export const Hero = ({ items, isActive = true, className }: HeroProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 7000 }), Fade()])
  const navigate = useNavigate()
  const { prefetchBackdrops, prefetchPriority, isMobile } = useImageCacheContext()
  const { hasVisitedHome, markHomeAsVisited } = useHomeVisit()

  useEffect(() => {
    if (items && items.length > 0 && !hasVisitedHome) {
      const timer = setTimeout(() => {
        markHomeAsVisited()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [items, hasVisitedHome, markHomeAsVisited])

  const shouldAnimate = !hasVisitedHome

  const backdropUrls = useMemo(() => {
    if (!items || items.length === 0) return []
    return items
      .filter(item => item.backdrop_path)
      .map(item => getImageUrl(item.backdrop_path!, "original"))
  }, [items])

  useEffect(() => {
    if (isMobile && backdropUrls.length > 0) {
      prefetchPriority(backdropUrls.slice(0, 3))
      if (backdropUrls.length > 3) {
        prefetchBackdrops(backdropUrls.slice(3))
      }
    }
  }, [backdropUrls, isMobile, prefetchPriority, prefetchBackdrops])

  useEffect(() => {
    if (!emblaApi) return
    if (isActive) {
      emblaApi.plugins().autoplay.play()
    } else {
      emblaApi.plugins().autoplay.stop()
    }
  }, [emblaApi, isActive])

  const handleSlideClick = (detailUrl: string) => {
    if (window.innerWidth <= 768) {
      navigate(detailUrl)
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className={cn("relative h-[80vh] w-full flex flex-col items-center justify-center gap-4", className)}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-foreground/70">Cargando...</p>
      </div>
    )
  }

  return (
    <div className={cn("embla relative w-full overflow-hidden aspect-[16/9] md:h-[80vh]", className)} ref={emblaRef}>
      <div className="embla__container h-full">
        {items.map((item) => {
          const isMovie = "title" in item
          const type = isMovie ? "movie" : "tv"
          const title = isMovie ? (item as Movie).title : (item as TVShow).name
          const detailUrl = `/${type}/${item.id}`
          const releaseDate = isMovie ? (item as Movie).release_date : (item as TVShow).first_air_date
          const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : "N/A"

          return (
            <div
              className="embla__slide relative h-full cursor-pointer md:cursor-auto"
              key={item.id}
              onClick={() => handleSlideClick(detailUrl)}
            >
              {/* Imagen de Fondo */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                style={{
                  backgroundImage: item.backdrop_path ? `url(${getImageUrl(item.backdrop_path, "original")})` : "none",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              {/* Contenido */}
              <div className="relative h-full flex items-center">
                <div className="px-4 md:px-8 lg:px-16 md:max-w-2xl w-full">
                  
                  {/* Metadata (Año, Rating) */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 md:mb-4 text-foreground/90 text-xs md:text-base">
                    <span className="bg-foreground/10 text-foreground font-semibold px-2 py-1 rounded-md">
                      {type === "movie" ? "Película" : "Serie"}
                    </span>
                    <span className="font-semibold flex items-center gap-1">
                      <span className="text-yellow-500">★</span> {item.vote_average.toFixed(1)}
                    </span>
                    <span className="font-semibold">{releaseYear}</span>
                  </div>

                  {/* 3. AQUÍ USAMOS EL NUEVO COMPONENTE DE LOGO */}
                  <HeroTitle media={item} title={title} shouldAnimate={shouldAnimate} />

                  <div className="hidden md:block mb-4 md:mb-6">
                    <p className="text-sm md:text-xl text-foreground/90 line-clamp-3 drop-shadow-md text-shadow">
                      {item.overview}
                    </p>
                  </div>

                  <div className="hidden md:flex gap-2 md:gap-4">
                    <Link to={detailUrl}>
                      <Button
                        size="sm"
                        className="md:h-11 md:px-8 md:text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow transition-all hover:scale-105"
                      >
                        <Play className="w-4 h-4 md:w-5 md:h-5" />
                        Ver ahora
                      </Button>
                    </Link>
                    <Link to={detailUrl}>
                      <Button size="sm" variant="secondary" className="md:h-11 md:px-8 md:text-base gap-2 hover:bg-white/20">
                        <Info className="w-4 h-4 md:w-5 md:h-5" />
                        Más información
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}