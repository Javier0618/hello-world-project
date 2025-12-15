"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { getMovieDetails, getImageUrl } from "@/lib/tmdb"
import { supabase } from "@/integrations/supabase/client"
import { getRelatedMovies } from "@/lib/supabaseQueries"
import { Star, Calendar, Clock, ArrowLeft } from "lucide-react"
import { MovieCard } from "@/components/MovieCard"
import { SaveButton } from "@/components/SaveButton"
import { useWatchHistory } from "@/hooks/useWatchHistory"
// 1. AÑADIDO: Importar useEffect
import { useMemo, useEffect } from "react"
import { useRealtimeMovie } from "@/hooks/useRealtimeMovie"
import { VideoPlayer } from "@/components/VideoPlayer"
import { useImageCacheContext } from "@/contexts/ImageCacheContext"

import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';

const MovieDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { prefetchPriority, prefetchImages, isMobile } = useImageCacheContext()

useEffect(() => {
    // 1. Configuración inicial al cargar la pantalla (Modo Normal)
    const initStatusBar = async () => {
      try {
        await StatusBar.show();
        await StatusBar.setOverlaysWebView({ overlay: false }); // Que NO flote encima
        await StatusBar.setBackgroundColor({ color: '#000000' }); // Color Negro Sólido
        await ScreenOrientation.unlock(); // O 'portrait' si prefieres forzar vertical
      } catch (e) {
        console.log("Error init statusbar", e);
      }
    };

    initStatusBar();

    // 2. Manejador de cambios (Fullscreen vs Normal)
    const handleFullscreenChange = async () => {
      const isFullscreen = !!document.fullscreenElement;

      try {
        if (isFullscreen) {
          // --- MODO VIDEO (FULLSCREEN) ---
          
          // 1. Ponemos el overlay true para que al ocultar la barra no quede hueco negro
          await StatusBar.setOverlaysWebView({ overlay: true });
          // 2. Ocultamos la barra
          await StatusBar.hide();
          // 3. Rotamos a horizontal
          await ScreenOrientation.lock({ orientation: 'landscape' });
          
        } else {
          // --- MODO NORMAL (SALIR DEL VIDEO) ---
          
          // 1. Rotamos a vertical
          await ScreenOrientation.lock({ orientation: 'portrait' });
          // 2. Mostramos la barra
          await StatusBar.show();
          // 3. DESACTIVAMOS el overlay (para que empuje el contenido hacia abajo)
          await StatusBar.setOverlaysWebView({ overlay: false }); 
          // 4. Pintamos la barra de NEGRO (o el color de tu app #1a1a1a)
          await StatusBar.setBackgroundColor({ color: '#000000' });
        }
      } catch (error) {
        console.error("Error fullscreen:", error);
      }
    };

    // Listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      
      // Restaurar al salir del componente (Seguridad)
      initStatusBar(); 
    };
  }, []);

  useRealtimeMovie(id ? Number(id) : undefined)

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => getMovieDetails(Number(id)),
    enabled: !!id,
  })

  const { data: importedMovie } = useQuery({
    queryKey: ["imported-movie", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies_imported")
        .select("video_url")
        .eq("tmdb_id", Number(id))
        .maybeSingle()
      return data
    },
    enabled: !!id,
  })

  const { data: relatedMovies } = useQuery({
    queryKey: ["related-movies", id],
    queryFn: () => getRelatedMovies(Number(id), 6),
    enabled: !!id,
  })

  const watchItem = useMemo(() => {
    if (!movie) return null
    return {
      itemId: movie.id,
      itemType: "movie" as const,
      title: movie.title,
      posterPath: movie.poster_path,
      voteAverage: movie.vote_average,
    }
  }, [movie])

  useWatchHistory(watchItem)

  useEffect(() => {
    if (!isMobile) return

    const imagesToPrefetch: string[] = []

    if (movie?.poster_path) {
      imagesToPrefetch.push(getImageUrl(movie.poster_path, "w500"))
    }
    if (movie?.backdrop_path) {
      imagesToPrefetch.push(getImageUrl(movie.backdrop_path, "original"))
    }

    if (imagesToPrefetch.length > 0) {
      prefetchPriority(imagesToPrefetch)
    }

    if (relatedMovies && relatedMovies.length > 0) {
      const relatedPosterUrls = relatedMovies
        .filter(m => m.poster_path)
        .map(m => getImageUrl(m.poster_path!, "w500"))
      if (relatedPosterUrls.length > 0) {
        prefetchImages(relatedPosterUrls)
      }
    }
  }, [movie, relatedMovies, isMobile, prefetchPriority, prefetchImages])

  // Un solo reproductor para toda la vida del componente
  const videoPlayer = (
    <VideoPlayer 
      videoUrl={importedMovie?.video_url} 
      loadingText="Cargando..." 
      emptyText="Tráiler no disponible"
      showBackButton={true}
      backButtonClassName="md:hidden"
    />
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!movie) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* 
        =====================================================================================
        SECCIÓN REPRODUCTOR UNIFICADA - STICKY
        ===================================================================================== 
      */}
      <div className="sticky top-0 z-50 w-full md:static md:container md:mx-auto md:px-4 md:py-8 md:max-w-5xl md:mb-2">
        <div className="aspect-video bg-black md:rounded-xl overflow-hidden shadow-2xl relative border-none md:border md:border-white/10">
          {videoPlayer}
        </div>
      </div>

      {/* =====================================================================================
          MOBILE INFO LAYOUT (< 768px)
         ===================================================================================== */}
      <div className="md:hidden pb-2 px-2 mt-4">
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-bold flex-1">{movie.title}</h1>
            <SaveButton
              itemId={movie.id}
              itemType="movie"
              tmdbId={movie.id}
              title={movie.title}
              posterPath={movie.poster_path}
              voteAverage={movie.vote_average}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-muted-foreground text-sm">
            <div className="flex items-center gap-1 text-accent">
              <Star className="w-4 h-4 fill-accent" />
              <span className="font-bold text-white">{movie.vote_average.toFixed(1)}</span>
            </div>
            {movie.release_date && <span>{new Date(movie.release_date).getFullYear()}</span>}
            <span className="flex-shrink-0">
              {movie.genres
                .slice(0, 2)
                .map((g) => g.name)
                .join(" / ")}
            </span>
            {movie.runtime && <span>{movie.runtime} min</span>}
          </div>

          <p className="text-foreground/90 leading-relaxed text-sm mt-4">{movie.overview}</p>

          <div className="text-sm mt-4 space-y-4 pt-4 border-t border-white/10">
            <div>
              <span className="text-muted-foreground block mb-1">Director:</span>
              <span className="font-medium">{movie.credits.crew.find((c) => c.job === "Director")?.name || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-2">Actores:</span>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {movie.credits.cast.slice(0, 8).map((a, index) => (
                  <div key={index} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20">
                      {a.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${a.profile_path}`}
                          alt={a.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground text-lg">
                          {a.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground text-center w-16 truncate">
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Related Mobile */}
          {relatedMovies && relatedMovies.length > 0 && (
            <div className="mt-8 pb-1">
              <h2 className="text-xl font-bold mb-3">También podría gustarte</h2>
              <div className="grid grid-cols-3 gap-2">
                {relatedMovies.map((relatedMovie) => (
                  <MovieCard key={relatedMovie.id} item={relatedMovie} type="movie" titleLines={1} replaceNavigation />
                ))}
              </div>
            </div>
          )}
      </div>


      {/* =====================================================================================
          DESKTOP INFO LAYOUT (min-width: 768px)
         ===================================================================================== */}
      <div className="hidden md:block container mx-auto px-4 py-2 max-w-[1600px]">
        {/* 2. SECCIÓN INFO Y POSTER */}
        <div className="flex flex-col lg:flex-row gap-10 mb-12 items-start">

          <div className="hidden lg:block flex-shrink-0 w-[340px]">
            {movie.poster_path ? (
              <img
                src={getImageUrl(movie.poster_path, "w500") || "/placeholder.svg"}
                alt={movie.title}
                className="w-full rounded-xl shadow-lg border border-white/5 hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-secondary rounded-xl flex items-center justify-center">
                <span className="text-muted-foreground">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Movie Information */}
          <div className="flex-1 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">{movie.title}</h1>
                {movie.tagline && <p className="text-xl text-muted-foreground italic mb-4">"{movie.tagline}"</p>}

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-white/10 pb-6">
                  <div className="flex items-center gap-1.5 text-yellow-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-lg text-white">{movie.vote_average.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({movie.vote_count})</span>
                  </div>

                  {movie.release_date && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span className="text-white">{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                  )}

                  {movie.runtime && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                      <Clock className="w-4 h-4" />
                      <span className="text-white">{movie.runtime} min</span>
                    </div>
                  )}

                  {movie.status && (
                    <span className="px-3 py-1 border border-white/10 rounded-full text-xs uppercase tracking-wider">
                      {movie.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <SaveButton
                  itemId={movie.id}
                  itemType="movie"
                  tmdbId={movie.id}
                  title={movie.title}
                  posterPath={movie.poster_path}
                  voteAverage={movie.vote_average}
                />
              </div>
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors cursor-default"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview Box */}
            <div className="bg-card/30 p-6 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">Sinopsis</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {movie.overview || "No hay descripción disponible para esta película."}
              </p>
            </div>

            {/* Credits Section */}
            <div className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide opacity-70">Dirección</h4>
                <p className="text-muted-foreground font-medium">
                  {movie.credits.crew.find((c) => c.job === "Director")?.name || "N/A"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide opacity-70">
                  Elenco Principal
                </h4>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  {movie.credits.cast.slice(0, 5).map((a, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 group">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-white/50 transition-colors">
                        {a.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${a.profile_path}`}
                            alt={a.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground text-lg sm:text-xl">
                            {a.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-white transition-colors text-center max-w-[70px] sm:max-w-[80px] truncate">
                        {a.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONTENIDO RELACIONADO */}
        {relatedMovies && relatedMovies.length > 0 && (
          <div className="pt-8 border-t border-white/10">
            <h2 className="text-2xl font-bold mb-6">También podría gustarte</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {relatedMovies.map((relatedMovie) => (
                <MovieCard key={relatedMovie.id} item={relatedMovie} type="movie" replaceNavigation />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MovieDetail