"use client"

import { useMemo, useEffect, useRef } from "react"
import { MovieCard } from "./MovieCard"
import type { Movie, TVShow } from "@/lib/tmdb"
import { Button } from "./ui/button"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { prefetchThumbnails } from "@/components/OptimizedImage"

interface MediaCarouselProps {
  title: string
  items: (Movie | TVShow)[]
  type?: "movie" | "tv" | "mixed"
  viewAllLink?: string
  shuffleSeed?: string
}

const seededShuffle = <T,>(array: T[], seed: string): T[] => {
  const result = [...array]
  let seedNum = 0
  for (let i = 0; i < seed.length; i++) {
    seedNum += seed.charCodeAt(i)
  }

  for (let i = result.length - 1; i > 0; i--) {
    seedNum = (seedNum * 9301 + 49297) % 233280
    const j = Math.floor((seedNum / 233280) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

const getSessionKey = () => {
  if (typeof window !== "undefined") {
    let sessionKey = sessionStorage.getItem("app-session-key")
    if (!sessionKey) {
      sessionKey = Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem("app-session-key", sessionKey)
    }
    return sessionKey
  }
  return "default"
}

export const MediaCarousel = ({ title, items, type = "mixed", viewAllLink, shuffleSeed }: MediaCarouselProps) => {
  const sessionKey = useMemo(() => getSessionKey(), [])
  const prefetchedRef = useRef(false)

  const shuffledItems = useMemo(() => {
    if (!items || items.length === 0) return []
    const seed = shuffleSeed || `${title}-${sessionKey}`
    return seededShuffle(items, seed)
  }, [items, title, sessionKey, shuffleSeed])

  useEffect(() => {
    if (prefetchedRef.current || shuffledItems.length === 0) return
    prefetchedRef.current = true

    const posterPaths = shuffledItems.filter((item) => item.poster_path).map((item) => item.poster_path)

    // Prefetch thumbnails during idle time
    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          prefetchThumbnails(posterPaths)
        },
        { timeout: 2000 },
      )
    } else {
      setTimeout(() => {
        prefetchThumbnails(posterPaths)
      }, 100)
    }
  }, [shuffledItems])

  if (!shuffledItems || shuffledItems.length === 0) return null

  return (
    <section className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-1xl md:text-1xl font-bold text-foreground">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink}>
            <Button variant="ghost" className="gap-1">
              Ver todo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {shuffledItems.map((item, index) => {
            const itemType = type === "mixed" ? ("title" in item ? "movie" : "tv") : type
            return (
              <CarouselItem
                key={item.id}
                className="pl-2 md:pl-4 basis-1/3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <MovieCard item={item} type={itemType} priority={index < 3} />
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
