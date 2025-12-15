"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"

interface SaveButtonProps {
  itemId: number
  itemType: "movie" | "tv"
  tmdbId: number
  title: string
  posterPath?: string
  voteAverage?: number
}

export const SaveButton = ({ itemId, itemType, tmdbId, title, posterPath, voteAverage }: SaveButtonProps) => {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user) return

      const { data } = await supabase
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_id", itemId)
        .eq("item_type", itemType)
        .maybeSingle()

      setIsSaved(!!data)
    }

    checkIfSaved()
  }, [user, itemId, itemType])

  const handleToggleSave = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar contenido",
        variant: "destructive",
      })
      navigate("/auth")
      return
    }

    setIsLoading(true)

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from("saved_items")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId)
          .eq("item_type", itemType)

        if (error) throw error

        setIsSaved(false)
        toast({
          title: "Eliminado",
          description: "Eliminado de tu lista",
        })
      } else {
        const { error } = await supabase.from("saved_items").insert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType,
          tmdb_id: tmdbId,
          title,
          poster_path: posterPath,
          vote_average: voteAverage || 0,
        })

        if (error) throw error

        setIsSaved(true)
        toast({
          title: "Guardado",
          description: "Agregado a tu lista",
        })
      }
    } catch (error) {
      console.error("Error toggling save:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el contenido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleSave}
      disabled={isLoading}
      className="hover:bg-secondary/80"
      aria-label={isSaved ? "Eliminar de guardados" : "Guardar"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`w-6 h-6 ${isSaved ? "fill-primary" : "fill-none"} stroke-current stroke-2`}
      >
        <path
          d="M5 3C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V21L12 17L21 21V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3H5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Button>
  )
}
