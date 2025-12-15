"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { MovieCard } from "@/components/MovieCard"
import { useNavigate } from "react-router-dom"
import { Film, Tv, HistoryIcon, Trash2, ArrowLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const History = () => {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: historyItems, isLoading } = useQuery({
    queryKey: ["watch-history", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("watch_history").delete().eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Elemento eliminado del historial")
      queryClient.invalidateQueries({ queryKey: ["watch-history", user?.id] })
    },
    onError: () => {
      toast.error("Error al eliminar el elemento")
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("watch_history").delete().eq("user_id", user?.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Historial borrado completamente")
      queryClient.invalidateQueries({ queryKey: ["watch-history", user?.id] })
    },
    onError: () => {
      toast.error("Error al borrar el historial")
    },
  })

  const handleClearAll = () => {
    if (window.confirm("¿Estás seguro de que quieres borrar todo tu historial de visualización?")) {
      clearAllMutation.mutate()
    }
  }

  const movies = historyItems?.filter((item) => item.item_type === "movie") || []
  const tvShows = historyItems?.filter((item) => item.item_type === "tv") || []

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Hace un momento"
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`
    return date.toLocaleDateString("es-ES")
  }

  const RenderHistoryCard = ({ item }: { item: any }) => (
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
          deleteItemMutation.mutate(item.id)
        }}
        disabled={deleteItemMutation.isPending}
        className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
        title="Eliminar del historial"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg pointer-events-none">
        <p className="text-xs text-muted-foreground">{formatTimeAgo(item.watched_at)}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Historial</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-muted-foreground">Contenido que has visto</p>

          {historyItems && historyItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
              className="w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar historial
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4" />
              Todos ({historyItems?.length || 0})
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
            ) : historyItems && historyItems.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {historyItems.map((item) => (
                  <RenderHistoryCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tienes historial aún</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="movies" className="mt-6">
            {movies.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {movies.map((item) => (
                  <RenderHistoryCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No has visto películas</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tv" className="mt-6">
            {tvShows.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {tvShows.map((item) => (
                  <RenderHistoryCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Tv className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No has visto series</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default History
