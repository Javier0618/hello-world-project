"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

/**
 * Hook para escuchar cambios en tiempo real de películas
 * Cuando una película se actualiza en la base de datos (ej: video_url),
 * automáticamente actualiza el cache de react-query con los nuevos datos
 */
export function useRealtimeMovie(movieId: number | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!movieId) return

    // Suscribirse a cambios en la tabla movies_imported
    const channel = supabase
      .channel(`movie-changes-${movieId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "movies_imported",
        },
        (payload) => {
          const updatedMovie = payload.new as any

          // Solo actualizar si es la película que estamos viendo
          if (updatedMovie.tmdb_id === movieId) {
            console.log("[v0] Movie updated in realtime:", payload)

            // Actualizar directamente el cache con la película actualizada
            queryClient.setQueryData(["imported-movie", String(movieId)], (oldData: any) => {
              if (!oldData) return updatedMovie
              return { ...oldData, ...updatedMovie }
            })
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Movie realtime subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [movieId, queryClient])
}
