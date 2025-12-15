"use client"

import type React from "react"

import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { getTVShowDetails, getImageUrl, getTVSeasonDetails } from "@/lib/tmdb"
import { supabase } from "@/integrations/supabase/client"
import { getRelatedTVShows } from "@/lib/supabaseQueries"
import { Button } from "@/components/ui/button"
import { Star, PlayCircle, Calendar, Tv } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { SaveButton } from "@/components/SaveButton"
import { MovieCard } from "@/components/MovieCard"
import { useWatchHistory } from "@/hooks/useWatchHistory"
import { cn } from "@/lib/utils"
import { useRealtimeEpisodes } from "@/hooks/useRealtimeEpisodes"
import { VideoPlayer } from "@/components/VideoPlayer"
import { useImageCacheContext } from "@/contexts/ImageCacheContext"

import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

// Definimos la estructura que esperamos usar en el componente
interface Season {
  id: string
  season_number: number
  episodes: {
    id: string
    episode_number: number
    name: string
    video_url: string
    still_path?: string
    overview?: string
  }[]
}

// Interfaz auxiliar para el objeto completo importado
interface ImportedShowData {
  id: number
  tmdb_id: number
  seasons: Season[]
}

const TVShowDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const { prefetchPriority, prefetchImages, isMobile } = useImageCacheContext()

// 2. MODIFICADO: useEffect para Barra de Estado + Botón Atrás Físico y de Navegador
  useEffect(() => {
    // A. Configuración inicial de la UI
    const initStatusBar = async () => {
      try {
        await StatusBar.show();
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await ScreenOrientation.unlock();
      } catch (e) {
        console.log("Error init statusbar", e);
      }
    };

    initStatusBar();

    // B. Manejo de Pantalla Completa
    const handleFullscreenChange = async () => {
      const isFullscreen = !!document.fullscreenElement;
      try {
        if (isFullscreen) {
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.hide();
          await ScreenOrientation.lock({ orientation: 'landscape' });
        } else {
          await ScreenOrientation.lock({ orientation: 'portrait' });
          await StatusBar.show();
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: '#000000' });
        }
      } catch (error) {
        console.error("Error fullscreen:", error);
      }
    };

    // C. Manejo del Botón Atrás Físico (Hardware - Celular)
    let backButtonListener: any;
    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', async () => {
        if (document.fullscreenElement) {
          // Si está en pantalla completa, salir de ella y restaurar
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          }
          await ScreenOrientation.lock({ orientation: 'portrait' });
          await StatusBar.show();
        } else {
          // SOLUCIÓN AQUÍ: En lugar de navigate(-1), forzamos ir al INICIO
          // 'replace: true' evita que se cree más historial, limpiando el flujo.
          navigate('/', { replace: true });
        }
      });
    };
    setupBackButton();

    // D. Manejo del Botón Atrás del Navegador (Web)
    // Esto intercepta cuando el usuario da click a la flecha atrás del navegador
    const handleBrowserBack = (event: PopStateEvent) => {
      // Opcional: Evitar el comportamiento por defecto si se requiere
      // event.preventDefault(); 
      navigate('/', { replace: true });
    };
    window.addEventListener('popstate', handleBrowserBack);

    // Listeners del DOM
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      // Limpieza
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      window.removeEventListener('popstate', handleBrowserBack); // Limpiamos el listener del navegador
      
      if (backButtonListener) {
        backButtonListener.remove();
      }
      
      initStatusBar(); 
    };
  }, [navigate]);

  useRealtimeEpisodes(id ? Number(id) : undefined)

  const { data: show, isLoading } = useQuery({
    queryKey: ["tv", id],
    queryFn: () => getTVShowDetails(Number(id)),
    enabled: !!id,
  })

  const { data: importedShow } = useQuery({
    queryKey: ["imported-tv", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tv_shows_imported")
        .select(`
          *,
          seasons (
            *,
            episodes (*)
          )
        `)
        .eq("tmdb_id", Number(id))
        .maybeSingle()

      // Casteamos 'data' a 'any' para poder manipular la estructura
      const mutableData = data as any

      if (mutableData?.seasons) {
        mutableData.seasons = mutableData.seasons.map((season: any) => ({
          ...season,
          episodes: season.episodes?.sort((a: any, b: any) => a.episode_number - b.episode_number) || [],
        }))
        mutableData.seasons.sort((a: any, b: any) => a.season_number - b.season_number)
      }

      // Devolvemos los datos forzando el tipo 'ImportedShowData'
      return mutableData as ImportedShowData
    },
    enabled: !!id,
  })

  // Determina qué temporada mostrar en la LISTA (visual)
  const selectedSeason = useMemo(() => {
    if (!importedShow?.seasons) return null
    return importedShow.seasons.find((s) => s.id === selectedSeasonId) || importedShow.seasons[0] || null
  }, [importedShow, selectedSeasonId])

  // Determina qué episodio reproducir en el PLAYER (lógica global)
  const selectedEpisode = useMemo(() => {
    if (!importedShow?.seasons) return null

    if (selectedEpisodeId) {
      for (const season of importedShow.seasons) {
        const found = season.episodes?.find((e) => e.id === selectedEpisodeId)
        if (found) return found
      }
    }

    return importedShow.seasons[0]?.episodes?.[0] || null
  }, [importedShow, selectedEpisodeId])

  // Cálculo de la última información de actualización (Nuevo)
  const updateStatusInfo = useMemo(() => {
    if (!show || !importedShow?.seasons?.length) return null

    // Si la serie está terminada según TMDB
    if (show.status === "Ended") {
      return { text: "Finalizada", className: "text-500 font-bold" }
    }

    // Si no está terminada, buscamos el último episodio subido
    const lastSeason = importedShow.seasons[importedShow.seasons.length - 1]
    const lastEpisode = lastSeason?.episodes?.[lastSeason.episodes.length - 1]

    if (lastSeason && lastEpisode) {
      return {
        text: `Actualizado hasta T${lastSeason.season_number} E${lastEpisode.episode_number}`,
        className: "text-muted-foreground",
      }
    }

    return null
  }, [show, importedShow])

  const { data: tmdbSeason } = useQuery({
    queryKey: ["tmdb-season", id, selectedSeason?.season_number],
    queryFn: () => getTVSeasonDetails(Number(id), selectedSeason!.season_number),
    enabled: !!selectedSeason,
  })

  const { data: relatedShows } = useQuery({
    queryKey: ["related-tv", id],
    queryFn: () => getRelatedTVShows(Number(id), 6),
    enabled: !!id,
  })

  // Inicialización
  useEffect(() => {
    if (importedShow?.seasons?.[0]) {
      if (!selectedSeasonId) {
        setSelectedSeasonId(importedShow.seasons[0].id)
      }
      if (!selectedEpisodeId && importedShow.seasons[0].episodes?.[0]) {
        setSelectedEpisodeId(importedShow.seasons[0].episodes[0].id)
      }
    }
  }, [importedShow, selectedSeasonId, selectedEpisodeId])

  const seasonWithTmdbData = useMemo(() => {
    if (!selectedSeason) return null
    if (!tmdbSeason) return selectedSeason

    const updatedEpisodes = selectedSeason.episodes.map((ep) => {
      const tmdbEp = tmdbSeason.episodes.find((t: any) => t.episode_number === ep.episode_number)
      return {
        ...ep,
        still_path: tmdbEp?.still_path,
        overview: tmdbEp?.overview,
      }
    })

    return { ...selectedSeason, episodes: updatedEpisodes }
  }, [selectedSeason, tmdbSeason])

  const watchItem = useMemo(() => {
    if (!show) return null
    return {
      itemId: show.id,
      itemType: "tv" as const,
      title: show.name,
      posterPath: show.poster_path,
      voteAverage: show.vote_average,
    }
  }, [show])

  useWatchHistory(watchItem)

  useEffect(() => {
    if (!isMobile) return

    const imagesToPrefetch: string[] = []

    if (show?.poster_path) {
      imagesToPrefetch.push(getImageUrl(show.poster_path, "w500"))
    }
    if (show?.backdrop_path) {
      imagesToPrefetch.push(getImageUrl(show.backdrop_path, "original"))
    }

    if (imagesToPrefetch.length > 0) {
      prefetchPriority(imagesToPrefetch)
    }

    if (relatedShows && relatedShows.length > 0) {
      const relatedPosterUrls = relatedShows
        .filter(s => s.poster_path)
        .map(s => getImageUrl(s.poster_path!, "w500"))
      if (relatedPosterUrls.length > 0) {
        prefetchImages(relatedPosterUrls)
      }
    }

    if (seasonWithTmdbData?.episodes) {
      const episodeStillUrls = seasonWithTmdbData.episodes
        .filter(ep => ep.still_path)
        .map(ep => getImageUrl(ep.still_path!, "w300"))
      if (episodeStillUrls.length > 0) {
        prefetchImages(episodeStillUrls)
      }
    }
  }, [show, relatedShows, seasonWithTmdbData, isMobile, prefetchPriority, prefetchImages])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const maxScroll = container.scrollWidth - container.clientWidth
    const currentScroll = container.scrollLeft
    setScrollPosition(maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0)
  }

  const handleSelectSeason = (season: Season) => {
    setSelectedSeasonId(season.id)
  }

  const handleSelectEpisode = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!show) return null

  const totalEpisodesMobile = seasonWithTmdbData?.episodes.length || 0
  const showCustomScrollbarMobile = totalEpisodesMobile > 60

  const videoPlayer = (
    <VideoPlayer
      videoUrl={selectedEpisode?.video_url}
      loadingText="Cargando..."
      emptyText="Selecciona un episodio"
      showBackButton={true}
      backButtonClassName="md:hidden"
      // 3. AÑADIDO: Prop para que el botón visual en pantalla regrese atrás
      onBack={() => navigate(-1)} 
    />
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SECCIÓN REPRODUCTOR UNIFICADA (RESPONSIVE) - STICKY */}
      <div className="sticky top-0 z-50 w-full md:static md:container md:mx-auto md:px-4 md:py-8 md:max-w-[1600px]">
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-6 md:h-[500px] lg:h-[650px] md:mb-2">
          {/* LEFT: Video Player */}
          <div className="w-full md:col-span-8 lg:col-span-9 bg-black md:rounded-xl overflow-hidden shadow-2xl relative flex items-center justify-center aspect-video md:aspect-auto">
            {videoPlayer}
          </div>

          {/* RIGHT: Seasons & Episodes List (DESKTOP) */}
          <div className="hidden md:flex col-span-4 lg:col-span-3 bg-card/40 backdrop-blur-sm border border-white/10 rounded-xl flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-background/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Temporadas</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {importedShow?.seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSelectSeason(season)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border",
                      selectedSeason?.id === season.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    T{season.season_number}
                  </button>
                ))}
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mt-4">
                Episodios ({seasonWithTmdbData?.episodes.length || 0})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {seasonWithTmdbData?.episodes.map((episode) => (
                <div
                  key={episode.id}
                  onClick={() => handleSelectEpisode(episode.id)}
                  className={cn(
                    "group flex gap-3 p-2 rounded-lg cursor-pointer transition-all border border-transparent",
                    selectedEpisode?.id === episode.id
                      ? "bg-white/10 border-white/10"
                      : "hover:bg-white/5 hover:border-white/5",
                  )}
                >
                  <div className="relative w-32 aspect-video flex-shrink-0 rounded-md overflow-hidden bg-muted">
                    {episode.still_path ? (
                      <img
                        src={getImageUrl(episode.still_path, "w300") || "/placeholder.svg"}
                        alt={episode.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <span className="text-xs text-muted-foreground">Sin img</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
                        selectedEpisode?.id === episode.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center min-w-0">
                    <span
                      className={cn(
                        "text-xs font-bold mb-0.5",
                        selectedEpisode?.id === episode.id ? "text-primary" : "text-primary/70",
                      )}
                    >
                      Episodio {episode.episode_number}
                    </span>
                    <h4
                      className={cn(
                        "text-sm font-medium leading-tight line-clamp-2",
                        selectedEpisode?.id === episode.id
                          ? "text-white"
                          : "text-muted-foreground group-hover:text-white",
                      )}
                    >
                      {episode.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE INFO LAYOUT (< 768px) */}
      <div className="md:hidden pb-1 px-2 mt-4">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-bold flex-1">{show.name}</h1>
          <SaveButton
            itemId={show.id}
            itemType="tv"
            tmdbId={show.id}
            title={show.name}
            posterPath={show.poster_path}
            voteAverage={show.vote_average}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-muted-foreground text-sm">
          <div className="flex items-center gap-1 text-accent">
            <Star className="w-4 h-4 fill-accent" />
            <span className="font-bold text-white">{show.vote_average.toFixed(1)}</span>
          </div>
          {show.first_air_date && <span>{new Date(show.first_air_date).getFullYear()}</span>}
          <span className="flex-shrink-0">
            {show.genres
              .slice(0, 3)
              .map((g) => g.name)
              .join(" / ")}
          </span>
        </div>

        {/* Lógica de Actualización / Finalización */}
        {updateStatusInfo && (
          <p className={cn("text-sm mt-4", updateStatusInfo.className)}>
            {updateStatusInfo.text}
          </p>
        )}

        {/* Mobile Episode Scroller */}
        <div className="mt-4">
          <div className="flex overflow-x-auto gap-2 mb-4 scrollbar-hide">
            {importedShow?.seasons.map((season) => (
              <Button
                key={season.id}
                variant={selectedSeason?.id === season.id ? "secondary" : "ghost"}
                onClick={() => handleSelectSeason(season)}
                size="sm"
                className="px-3 h-8 flex-shrink-0"
              >
                Temporada {season.season_number}
              </Button>
            ))}
          </div>
          <div className="relative">
            <div
              id="episode-scroll-container"
              className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide"
              onScroll={handleScroll}
            >
              {seasonWithTmdbData?.episodes.map((episode) => (
                <div
                  key={episode.id}
                  className={`flex-shrink-0 p-2 rounded-lg cursor-pointer w-16 h-10 flex items-center justify-center text-center ${selectedEpisode?.id === episode.id ? "bg-secondary" : "bg-background-alt hover:bg-secondary/80"}`}
                  onClick={() => handleSelectEpisode(episode.id)}
                >
                  <p className="font-semibold text-sm">{episode.episode_number}</p>
                </div>
              ))}
            </div>

            {showCustomScrollbarMobile && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted rounded-full transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(10, scrollPosition))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Description & Credits */}
        <div className="mt-6">
          <p className="text-foreground/90 leading-relaxed text-sm">{show.overview}</p>

          <div className="text-sm mt-4 space-y-4 pt-4 border-t border-white/10">
            <div>
              <span className="text-muted-foreground block mb-1">Creadores:</span>
              <span className="font-medium">
                {(show as any).created_by?.map((c: any) => c.name).join(", ") ||
                  show.credits.crew.find((c) => c.job === "Director")?.name ||
                  "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-2">Actores:</span>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {show.credits.cast.slice(0, 8).map((a, index) => (
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
        </div>

        {/* Mobile Related */}
        {relatedShows && relatedShows.length > 0 && (
          <div className="mt-8 pb-4">
            <h2 className="text-xl font-bold mb-3">También podría gustarte</h2>
            <div className="grid grid-cols-3 gap-2">
              {relatedShows.map((relatedShow) => (
                <MovieCard key={relatedShow.id} item={relatedShow} type="tv" titleLines={1} replaceNavigation />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP INFO LAYOUT */}
      <div className="hidden md:block container mx-auto px-4 max-w-[1600px]">
        <div className="flex flex-col lg:flex-row gap-10 mb-12 items-start">
          <div className="hidden lg:block flex-shrink-0 w-[320px]">
            {show.poster_path ? (
              <img
                src={getImageUrl(show.poster_path, "w500") || "/placeholder.svg"}
                alt={show.name}
                className="w-full rounded-xl shadow-2xl border border-white/10 hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-secondary rounded-xl flex items-center justify-center">
                <span className="text-muted-foreground">Sin imagen</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex items-start justify-between">
              <div className="w-full">
                <h1 className="text-5xl font-bold mb-2 leading-tight tracking-tight">{show.name}</h1>
                {show.tagline && <p className="text-xl text-muted-foreground italic mb-5">"{show.tagline}"</p>}

                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-white/10 pb-6 mb-6">
                  <div className="flex items-center gap-1.5 text-yellow-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-lg text-white">{show.vote_average.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({show.vote_count})</span>
                  </div>

                  {show.first_air_date && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span className="text-white">{new Date(show.first_air_date).getFullYear()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                    <Tv className="w-4 h-4" />
                    <span className="text-white">{show.number_of_seasons} Temporadas</span>
                  </div>

                  {show.status && (
                    <span
                      className={cn(
                        "px-3 py-1 border border-white/10 rounded-full text-xs uppercase tracking-wider font-semibold",
                        show.status === "Ended" ? "bg-green-500/20 text-green-400 border-green-500/30" : "",
                      )}
                    >
                      {show.status === "Ended" ? "Finalizada" : show.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {show.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-4 py-1.5 bg-secondary/50 border border-white/5 rounded-full text-sm font-medium hover:bg-secondary transition-colors cursor-default"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                <div className="bg-card/10 p-6 rounded-xl border border-white/10 mb-8">
                  <h3 className="text-lg font-bold text-white mb-3">Sinopsis</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {show.overview || "No hay descripción disponible para esta serie."}
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide opacity-70">
                      Creadores
                    </h4>
                    <p className="text-muted-foreground font-medium">
                      {(show as any).created_by?.map((c: any) => c.name).join(", ") ||
                        show.credits.crew.find((c) => c.job === "Director")?.name ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide opacity-70">
                      Elenco Principal
                    </h4>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                      {show.credits.cast.slice(0, 5).map((a, index) => (
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

              <div className="mt-2 flex-shrink-0">
                <SaveButton
                  itemId={show.id}
                  itemType="tv"
                  tmdbId={show.id}
                  title={show.name}
                  posterPath={show.poster_path}
                  voteAverage={show.vote_average}
                />
              </div>
            </div>
          </div>
        </div>

        {relatedShows && relatedShows.length > 0 && (
          <div className="pt-8 border-t border-white/10">
            <h2 className="text-2xl font-bold mb-6">También podría gustarte</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {relatedShows.map((relatedShow) => (
                <MovieCard key={relatedShow.id} item={relatedShow} type="tv" replaceNavigation />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TVShowDetail