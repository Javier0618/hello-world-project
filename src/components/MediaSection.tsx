"use client"

import { MovieCard } from "./MovieCard"
import type { Movie, TVShow } from "@/lib/tmdb"

interface MediaSectionProps {
  title: string
  items: (Movie | TVShow)[]
  type?: "movie" | "tv" | "mixed"
  onItemClick?: (item: Movie | TVShow) => void
}

export const MediaSection = ({ title, items, type = "mixed", onItemClick }: MediaSectionProps) => {
  if (!items || items.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-1xl md:text-1xl font-bold mb-1 text-foreground">{title}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {items.map((item) => {
          const itemType = type === "mixed" ? ("title" in item ? "movie" : "tv") : type
          return (
            <MovieCard
              key={item.id}
              item={item}
              type={itemType}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}
