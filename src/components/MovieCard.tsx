"use client"

import { type Movie, type TVShow, getImageUrl } from "@/lib/tmdb"
import { Card } from "@/components/ui/card"
import { Link, useNavigate } from "react-router-dom"
import RatingCircle from "@/components/ui/RatingCircle"
import { CachedImage } from "@/components/CachedImage"

// Partial type for items with incomplete data (from history/saved)
export interface PartialMediaItem {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  vote_average?: number | null
}

interface MovieCardProps {
  item: Movie | TVShow | PartialMediaItem
  type: "movie" | "tv"
  titleLines?: 1 | 2 | "full"
  onClick?: () => void
  replaceNavigation?: boolean
}

export const MovieCard = ({ item, type, titleLines = 1, onClick, replaceNavigation = false }: MovieCardProps) => {
  const title = "title" in item && item.title ? item.title : ("name" in item ? item.name : "")
  const date = "release_date" in item ? (item as Movie).release_date : ("first_air_date" in item ? (item as TVShow).first_air_date : undefined)
  const voteAverage = item.vote_average ?? 0
  const navigate = useNavigate()

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick()
    }
    if (replaceNavigation) {
      e.preventDefault()
      navigate(`/${type}/${item.id}`, { replace: true })
    }
  }

  return (
    <Link to={`/${type}/${item.id}`} className="block" onClick={handleClick}>
      <Card className="relative overflow-hidden rounded-lg border-0 bg-card shadow-card transition-all duration-300 cursor-pointer">
        <div className="aspect-[2/3] relative">
          {item.poster_path ? (
            <CachedImage
              src={getImageUrl(item.poster_path)}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              fallback={
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-muted-foreground">Sin imagen</span>
                </div>
              }
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground">Sin imagen</span>
            </div>
          )}

          {/* Overlays */}
          <div className="absolute top-2 left-2">
            <RatingCircle rating={voteAverage} />
          </div>
          <div className="absolute bottom-2 left-1 bg-black/70 px-1 py-0.2 md:px-2 md:py-1 rounded-sm">
            <span className="text-white text-[10px] md:text-xs font-semibold">
              {type === "movie" ? "Película" : "Serie"}
            </span>
          </div>
          {date && (
            <div className="absolute bottom-2 right-1 bg-black/70 px-1 py-0.2 md:px-2 md:py-1 rounded-sm">
              <span className="text-white text-[10px] md:text-xs font-semibold">{new Date(date).getFullYear()}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-2 px-1">
        <h3
          className={`font-semibold text-sm text-foreground leading-tight ${
            titleLines === 1 ? "line-clamp-1" : titleLines === 2 ? "line-clamp-2" : ""
          }`}
        >
          {title}
        </h3>
      </div>
    </Link>
  )
}
