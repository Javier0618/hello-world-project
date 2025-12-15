"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useParams, useSearchParams } from "react-router-dom"
import { useEffect, useRef, useCallback } from "react"
import { Navbar } from "@/components/Navbar"
import { MobileNavbar } from "@/components/MobileNavbar"
import { MovieCard } from "@/components/MovieCard"
import {
  getMoviesPaginated,
  getTVShowsPaginated,
  getCategoryContentPaginated,
  getCategoryContentPaginatedForTab,
  type PaginatedResult,
} from "@/lib/sectionQueries"
import { Loader2 } from "lucide-react"
import { prefetchThumbnails } from "@/components/OptimizedImage"

const categoryTranslations: Record<string, string> = {
  action: "Acción",
  adventure: "Aventura",
  animation: "Animación",
  comedy: "Comedia",
  crime: "Crimen",
  documentary: "Documental",
  drama: "Drama",
  family: "Familia",
  fantasy: "Fantasía",
  history: "Historia",
  horror: "Terror",
  music: "Música",
  mystery: "Misterio",
  romance: "Romance",
  "science fiction": "Ciencia Ficción",
  "sci-fi": "Ciencia Ficción",
  thriller: "Suspenso",
  war: "Guerra",
  western: "Western",
  trending: "Tendencias",
  popular: "Populares",
  "top rated": "Mejor valoradas",
  upcoming: "Próximamente",
  "now playing": "En cartelera",
}

const ViewAll = () => {
  const { type, category } = useParams<{ type: string; category?: string }>()
  const [searchParams] = useSearchParams()
  const tabId = searchParams.get("tab")
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const prefetchedPages = useRef<Set<number>>(new Set())

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery<PaginatedResult>({
    queryKey: ["view-all-paginated", type, category, tabId],
    queryFn: async ({ pageParam = 0 }) => {
      if (type === "movies") {
        return getMoviesPaginated(pageParam as number)
      } else if (type === "series") {
        return getTVShowsPaginated(pageParam as number)
      } else if (type === "category" && category) {
        if (tabId) {
          return getCategoryContentPaginatedForTab(category, tabId, pageParam as number)
        }
        return getCategoryContentPaginated(category, pageParam as number)
      }
      return { items: [], nextPage: null, totalCount: 0 }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  })

  useEffect(() => {
    if (!data?.pages) return

    data.pages.forEach((page, pageIndex) => {
      if (prefetchedPages.current.has(pageIndex)) return
      prefetchedPages.current.add(pageIndex)

      const posterPaths = page.items.filter((item) => item.poster_path).map((item) => item.poster_path)

      if (posterPaths.length > 0) {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(
            () => {
              prefetchThumbnails(posterPaths)
            },
            { timeout: 1000 },
          )
        } else {
          prefetchThumbnails(posterPaths)
        }
      }
    })
  }, [data?.pages])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "400px",
      threshold: 0,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [handleObserver])

  const getTitle = () => {
    if (type === "movies") return "Películas"
    if (type === "series") return "Series"
    if (type === "category" && category) {
      const lowerCategory = category.toLowerCase()
      return categoryTranslations[lowerCategory] || category
    }
    return "Todos"
  }

  const allItems = data?.pages.flatMap((page) => page.items) || []
  const totalCount = data?.pages[0]?.totalCount || 0

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Navbar />
      </div>
      <MobileNavbar showBackButton={true} title={getTitle()} />

      <div className="container mx-auto px-2 pt-4 pb-1 md:pt-8">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                <div className="w-full h-full shimmer-placeholder" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
              {allItems.map((item, index) => {
                const itemType = "title" in item ? "movie" : "tv"
                return (
                  <MovieCard
                    key={`${item.id}-${index}`}
                    item={item}
                    type={itemType}
                    titleLines="full"
                    priority={index < 6}
                  />
                )
              })}
            </div>

            <div ref={loadMoreRef} className="w-full py-2 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando más...</span>
                </div>
              )}
              {!hasNextPage && allItems.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  <span>Fin del contenido</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ViewAll
