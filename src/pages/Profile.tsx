"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { MovieCard } from "@/components/MovieCard"
import { Navigate, useNavigate } from "react-router-dom"
import { Bookmark, Clock, ChevronRight, User, ArrowLeft } from "lucide-react"

const Profile = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const { data: historyItems } = useQuery({
    queryKey: ["watch-history", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  const { data: savedItems } = useQuery({
    queryKey: ["saved-items", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from("saved_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

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

  const userName = user.email?.split("@")[0] || "Usuario"
  const userId = user.id.slice(0, 10).toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Mi Perfil</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/50 to-slate-900">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        {/* Profile info */}
        <div className="relative px-4 py-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>

            {/* User info */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground capitalize">{userName}</h1>
              <p className="text-muted-foreground text-sm">ID:{userId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Guardado button */}
          <button
            onClick={() => navigate("/profile/saved")}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card/80 border border-border/50 hover:bg-card transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-orange-500 fill-orange-500" />
            </div>
            <span className="text-foreground font-medium">Guardado</span>
          </button>

          {/* Historial button */}
          <button
            onClick={() => navigate("/historial")}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card/80 border border-border/50 hover:bg-card transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-cyan-500" />
            </div>
            <span className="text-foreground font-medium">Historial</span>
          </button>
        </div>
      </div>

      {historyItems && historyItems.length > 0 && (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Historial</h2>
            <button
              onClick={() => navigate("/historial")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {historyItems.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-28 md:w-36">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {savedItems && savedItems.length > 0 && (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Guardado</h2>
            <button
              onClick={() => navigate("/profile/saved")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {savedItems.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-28 md:w-36">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no history and no saved items */}
      {(!historyItems || historyItems.length === 0) && (!savedItems || savedItems.length === 0) && (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">Comienza a ver películas y series para llenar tu perfil</p>
        </div>
      )}
    </div>
  )
}

export default Profile
