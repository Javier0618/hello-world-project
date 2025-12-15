"use client"

import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MobileNavbar } from "@/components/MobileNavbar"
import { MovieCard } from "@/components/MovieCard"
import { getPlatformContent, getActivePlatforms } from "@/lib/platformQueries"
import type { Movie, TVShow } from "@/lib/tmdb"
import { Button } from "@/components/ui/button"
import { useMemo } from "react"

const PlatformContent = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: platforms } = useQuery({
    queryKey: ["active-platforms"],
    queryFn: getActivePlatforms,
  })

  const platform = platforms?.find((p) => p.id === id)

  const { data: content, isLoading } = useQuery({
    queryKey: ["platform-content", id],
    queryFn: () => getPlatformContent(id!),
    enabled: !!id,
  })

  const mixedContent = useMemo(() => {
    const movies = (content?.movies || []).map((movie) => ({
      item: movie as Movie,
      type: "movie" as const,
    }))
    const tvShows = (content?.tvShows || []).map((show) => ({
      item: show as TVShow,
      type: "tv" as const,
    }))
    // Mezclar alternando películas y series
    const mixed: Array<{ item: Movie | TVShow; type: "movie" | "tv" }> = []
    const maxLength = Math.max(movies.length, tvShows.length)
    for (let i = 0; i < maxLength; i++) {
      if (i < movies.length) mixed.push(movies[i])
      if (i < tvShows.length) mixed.push(tvShows[i])
    }
    return mixed
  }, [content])

  if (!platform && !isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileNavbar showBackButton title="Plataforma" onBack={() => navigate("/")} />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Plataforma no encontrada</p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate("/")}>Volver al Inicio</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileNavbar showBackButton title={platform?.name || "Cargando..."} onBack={() => navigate("/")} />

      <div className="container mx-auto px-2 py-6">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : mixedContent.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {mixedContent.map(({ item, type }) => (
              <MovieCard key={`${type}-${item.id}`} item={item} type={type} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No hay contenido disponible en esta plataforma</div>
        )}
      </div>
    </div>
  )
}

export default PlatformContent
