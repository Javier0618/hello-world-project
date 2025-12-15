"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

interface SearchHistoryItem {
  id: string
  query: string
  searched_at: string
}

interface PopularContentClick {
  id: string
  content_id: number
  content_type: "movie" | "tv"
  title: string
  click_count: number
  last_clicked_at?: string // Agregado para coincidir con la actualización
}

export const useSearchHistory = () => {
  const { user } = useAuth()
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [popularContent, setPopularContent] = useState<PopularContentClick[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch user's search history
  const fetchSearchHistory = async () => {
    if (!user) {
      setSearchHistory([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("searched_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setSearchHistory(data || [])
    } catch (error) {
      console.error("Error fetching search history:", error)
      setSearchHistory([])
    }
  }

  const fetchPopularContent = async () => {
    try {
      // CORRECCIÓN: Usamos (supabase as any) porque TypeScript no encuentra la tabla en los tipos generados.
      const { data, error } = await (supabase as any)
        .from("popular_content_clicks")
        .select("*")
        .order("click_count", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error fetching popular content:", error)
        setPopularContent([])
        return
      }
      
      // Forzamos el tipo de los datos recibidos
      setPopularContent((data as PopularContentClick[]) || [])
    } catch (error) {
      console.error("Error fetching popular content:", error)
      setPopularContent([])
    }
  }

  // Add search to history (solo para el historial del usuario)
  const addSearch = async (query: string) => {
    if (!query.trim() || !user) return

    const normalizedQuery = query.trim().toLowerCase()

    try {
      // Check if this query already exists in user's history
      const { data: existing } = await supabase
        .from("search_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("query", normalizedQuery)
        .single()

      if (existing) {
        // Update the timestamp
        await supabase.from("search_history").update({ searched_at: new Date().toISOString() }).eq("id", existing.id)
      } else {
        // Insert new entry
        await supabase.from("search_history").insert({
          user_id: user.id,
          query: normalizedQuery,
        })
      }
      fetchSearchHistory()
    } catch (error) {
      console.error("Error adding to search history:", error)
    }
  }

  const trackContentClick = async (contentId: number, contentType: "movie" | "tv", title: string) => {
    try {
      // CORRECCIÓN: Casting a 'any' para evitar errores de tabla no encontrada
      const { data: existing } = await (supabase as any)
        .from("popular_content_clicks")
        .select("id, click_count")
        .eq("content_id", contentId)
        .eq("content_type", contentType)
        .maybeSingle() // Usamos maybeSingle en lugar de single para evitar error si no existe

      if (existing) {
        // Incrementar contador
        await (supabase as any)
          .from("popular_content_clicks")
          .update({
            click_count: existing.click_count + 1,
            last_clicked_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        // Crear nuevo registro
        await (supabase as any).from("popular_content_clicks").insert({
          content_id: contentId,
          content_type: contentType,
          title: title,
          click_count: 1, // Inicializamos en 1
        })
      }
      // Opcional: Recargar el contenido popular inmediatamente
      // fetchPopularContent() 
    } catch (error) {
      console.error("Error tracking content click:", error)
    }
  }

  // Clear all search history for user
  const clearSearchHistory = async () => {
    if (!user) return

    try {
      await supabase.from("search_history").delete().eq("user_id", user.id)
      setSearchHistory([])
    } catch (error) {
      console.error("Error clearing search history:", error)
    }
  }

  // Remove single item from history
  const removeFromHistory = async (id: string) => {
    if (!user) return

    try {
      await supabase.from("search_history").delete().eq("id", id)
      setSearchHistory((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      console.error("Error removing from search history:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSearchHistory(), fetchPopularContent()])
      setLoading(false)
    }
    loadData()
  }, [user])

  return {
    searchHistory,
    popularContent,
    loading,
    addSearch,
    trackContentClick,
    clearSearchHistory,
    removeFromHistory,
    refreshPopularContent: fetchPopularContent,
  }
}