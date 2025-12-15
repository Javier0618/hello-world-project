"use client"

import { useEffect, useRef, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"

const MINIMUM_WATCH_TIME = 300 // 5 minutes in seconds

interface WatchHistoryItem {
  itemId: number
  itemType: "movie" | "tv"
  title: string
  posterPath: string | null
  voteAverage: number
}

export const useWatchHistory = (item: WatchHistoryItem | null) => {
  const { user } = useAuth()
  const startTimeRef = useRef<number | null>(null)
  const savedRef = useRef(false)

  const saveToHistory = useCallback(async () => {
    if (!user || !item || savedRef.current) return

    const timeSpent = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0

    if (timeSpent < MINIMUM_WATCH_TIME) return

    savedRef.current = true

    try {
      // Upsert to update if exists or insert if new
      const { error } = await supabase.from("watch_history").upsert(
        {
          user_id: user.id,
          item_id: item.itemId,
          item_type: item.itemType,
          title: item.title,
          poster_path: item.posterPath,
          vote_average: item.voteAverage,
          watched_at: new Date().toISOString(),
          time_spent: timeSpent,
        },
        {
          onConflict: "user_id,item_id,item_type",
        },
      )

      if (error) {
        console.error("Error saving watch history:", error)
        savedRef.current = false
      }
    } catch (err) {
      console.error("Error saving watch history:", err)
      savedRef.current = false
    }
  }, [user, item])

  useEffect(() => {
    if (!item) return

    // Start tracking time
    startTimeRef.current = Date.now()
    savedRef.current = false

    // Save on page visibility change (user leaves tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveToHistory()
      }
    }

    // Save on beforeunload (user closes tab/navigates away)
    const handleBeforeUnload = () => {
      saveToHistory()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      // Save when component unmounts (user navigates to another page)
      saveToHistory()
    }
  }, [item, saveToHistory])

  return { saveToHistory }
}
