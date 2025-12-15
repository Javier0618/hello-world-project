"use client"

import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { getActivePlatforms } from "@/lib/platformQueries"

export const StreamingPlatforms = () => {
  const navigate = useNavigate()

  const { data: platforms, isLoading } = useQuery({
    queryKey: ["active-platforms"],
    queryFn: getActivePlatforms,
  })

  if (isLoading || !platforms || platforms.length === 0) {
    return null
  }

  return (
    // Se cambió px-4 por px-2. Se mantiene w-full.
    <div className="w-full bg-zinc-900/80 backdrop-blur-sm py-4 px-2 rounded-xl">
      {/* Se eliminó 'container mx-auto' para que ocupe todo el ancho disponible */}
      <div className="w-full flex items-center justify-center gap-6 md:gap-10 overflow-x-auto scrollbar-hide">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => navigate(`/platform/${platform.id}`)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:opacity-100"
            title={platform.name}
          >
            {platform.logo_url ? (
              <img
                src={platform.logo_url || "/placeholder.svg"}
                alt={platform.name}
                className="h-6 md:h-8 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-200"
              />
            ) : (
              <span className="text-white/70 hover:text-white font-semibold text-sm md:text-base transition-colors">
                {platform.name}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}