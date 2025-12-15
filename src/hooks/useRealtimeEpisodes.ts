"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

/**
 * Hook para escuchar cambios en tiempo real de episodios
 * Cuando un episodio se actualiza en la base de datos (ej: video_url),
 * automáticamente actualiza el cache de react-query con los nuevos datos
 */
export function useRealtimeEpisodes(tvShowId: number | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tvShowId) return

    // Suscribirse a cambios en la tabla episodes
    const channel = supabase
      .channel(`episodes-changes-${tvShowId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "episodes",
        },
        (payload) => {
          console.log("[v0] Episode updated in realtime:", payload)
          const updatedEpisode = payload.new as any

          // Actualizar directamente el cache con el episodio actualizado
          queryClient.setQueryData(["imported-tv", String(tvShowId)], (oldData: any) => {
            if (!oldData?.seasons) return oldData

            return {
              ...oldData,
              seasons: oldData.seasons.map((season: any) => ({
                ...season,
                episodes: season.episodes.map((episode: any) =>
                  episode.id === updatedEpisode.id ? { ...episode, ...updatedEpisode } : episode,
                ),
              })),
            }
          })
        },
      )
      .subscribe((status) => {
        console.log("[v0] Episodes realtime subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tvShowId, queryClient])
}
