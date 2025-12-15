"use client"

import { useQuery } from "@tanstack/react-query"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getAllPlatforms } from "@/lib/platformQueries"

interface PlatformSelectorProps {
  selectedPlatforms: string[]
  onPlatformsChange: (platforms: string[]) => void
}

export const PlatformSelector = ({ selectedPlatforms, onPlatformsChange }: PlatformSelectorProps) => {
  const { data: platforms, isLoading } = useQuery({
    queryKey: ["platforms"],
    queryFn: getAllPlatforms,
  })

  const activePlatforms = platforms?.filter((p) => p.active) || []

  const handleToggle = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onPlatformsChange(selectedPlatforms.filter((id) => id !== platformId))
    } else {
      onPlatformsChange([...selectedPlatforms, platformId])
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando plataformas...</div>
  }

  if (activePlatforms.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No hay plataformas disponibles. Crea una desde el panel de administración.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label>Plataformas de Streaming</Label>
      <div className="grid grid-cols-2 gap-3">
        {activePlatforms.map((platform) => (
          <div
            key={platform.id}
            className="flex items-center gap-3 p-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleToggle(platform.id)}
          >
            <Checkbox
              id={`platform-${platform.id}`}
              checked={selectedPlatforms.includes(platform.id)}
              onCheckedChange={() => handleToggle(platform.id)}
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {platform.logo_url ? (
                <img
                  src={platform.logo_url || "/placeholder.svg"}
                  alt={platform.name}
                  className="h-5 w-auto object-contain flex-shrink-0"
                />
              ) : (
                <span className="text-sm truncate">{platform.name}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
