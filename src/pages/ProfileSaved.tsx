"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { MobileNavbar } from "@/components/MobileNavbar"
import { MovieCard } from "@/components/MovieCard"
import { Navigate } from "react-router-dom"
import { Film, Tv, Bookmark, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const ProfileSaved = () => {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()

  const { data: savedItems, isLoading } = useQuery({
    queryKey: ["saved-items", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from("saved_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  const deleteSavedItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("saved_items").delete().eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Eliminado de guardados")
      queryClient.invalidateQueries({ queryKey: ["saved-items", user?.id] })
    },
    onError: () => {
      toast.error("Error al eliminar")
    },
  })

  const clearAllSavedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("saved_items").delete().eq("user_id", user?.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Lista de guardados vaciada")
      queryClient.invalidateQueries({ queryKey: ["saved-items", user?.id] })
    },
    onError: () => {
      toast.error("Error al vaciar la lista")
    },
  })

  const handleClearAll = () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar todos los elementos guardados?")) {
      clearAllSavedMutation.mutate()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const movies = savedItems?.filter((item) => item.item_type === "movie") || []
  const tvShows = savedItems?.filter((item) => item.item_type === "tv") || []

  const RenderSavedCard = ({ item }: { item: any }) => (
    <div key={`${item.item_type}-${item.id}`} className="relative group">
      <MovieCard
        item={{
          id: item.item_id,
          title: item.item_type === "movie" ? item.title : undefined,
          name: item.item_type === "tv" ? item.title : undefined,
          poster_path: item.poster_path,
          vote_average: item.vote_average,
        }}
        type={item.item_type as "movie" | "tv"}
      />

      <button
        onClick={(e) => {
          e.preventDefault()
          deleteSavedItemMutation.mutate(item.id)
        }}
        disabled={deleteSavedItemMutation.isPending}
        className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
        title="Eliminar de guardados"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileNavbar showBackButton title="Guardado" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Tu contenido guardado</p>
          </div>

          {savedItems && savedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearAllSavedMutation.isPending}
              className="w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar todo
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Todos ({savedItems?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="movies" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Películas ({movies.length})
            </TabsTrigger>
            <TabsTrigger value="tv" className="flex items-center gap-2">
              <Tv className="w-4 h-4" />
              Series ({tvShows.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Cargando...</div>
            ) : savedItems && savedItems.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {savedItems.map((item) => (
                  <RenderSavedCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No has guardado nada aún</p>
                <p className="text-sm mt-2">Explora películas y series para empezar a guardar tus favoritos</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="movies" className="mt-6">
            {movies.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {movies.map((item) => (
                  <RenderSavedCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No has guardado películas</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tv" className="mt-6">
            {tvShows.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {tvShows.map((item) => (
                  <RenderSavedCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Tv className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No has guardado series</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ProfileSaved
