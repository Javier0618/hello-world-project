"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  getAllPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  type StreamingPlatform,
} from "@/lib/platformQueries"
import { Plus, Trash2, GripVertical, Pencil, Eye, EyeOff } from "lucide-react"

export const PlatformManager = () => {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<StreamingPlatform | null>(null)
  const [newPlatform, setNewPlatform] = useState({
    name: "",
    logo_url: "",
    active: true,
  })

  const { data: platforms, isLoading } = useQuery({
    queryKey: ["platforms"],
    queryFn: getAllPlatforms,
  })

  const createMutation = useMutation({
    mutationFn: createPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] })
      queryClient.invalidateQueries({ queryKey: ["active-platforms"] })
      toast.success("Plataforma creada exitosamente")
      setIsCreateOpen(false)
      setNewPlatform({ name: "", logo_url: "", active: true })
    },
    onError: () => {
      toast.error("Error al crear la plataforma")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StreamingPlatform> }) => updatePlatform(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] })
      queryClient.invalidateQueries({ queryKey: ["active-platforms"] })
      toast.success("Plataforma actualizada")
      setEditingPlatform(null)
    },
    onError: () => {
      toast.error("Error al actualizar la plataforma")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] })
      queryClient.invalidateQueries({ queryKey: ["active-platforms"] })
      toast.success("Plataforma eliminada")
    },
    onError: () => {
      toast.error("Error al eliminar la plataforma")
    },
  })

  const handleCreate = () => {
    if (!newPlatform.name) {
      toast.error("El nombre es requerido")
      return
    }

    const maxPosition = platforms?.reduce((max, p) => Math.max(max, p.position), -1) ?? -1

    createMutation.mutate({
      name: newPlatform.name,
      logo_url: newPlatform.logo_url || null,
      position: maxPosition + 1,
      active: newPlatform.active,
    })
  }

  const handleUpdate = () => {
    if (!editingPlatform) return

    updateMutation.mutate({
      id: editingPlatform.id,
      updates: {
        name: editingPlatform.name,
        logo_url: editingPlatform.logo_url,
        active: editingPlatform.active,
      },
    })
  }

  const toggleActive = (platform: StreamingPlatform) => {
    updateMutation.mutate({
      id: platform.id,
      updates: { active: !platform.active },
    })
  }

  const movePlatform = (platform: StreamingPlatform, direction: "up" | "down") => {
    if (!platforms) return

    const currentIndex = platforms.findIndex((p) => p.id === platform.id)
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= platforms.length) return

    const targetPlatform = platforms[targetIndex]

    updateMutation.mutate({
      id: platform.id,
      updates: { position: targetPlatform.position },
    })

    updateMutation.mutate({
      id: targetPlatform.id,
      updates: { position: platform.position },
    })
  }

  if (isLoading) {
    return <div className="text-center py-8">Cargando plataformas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Plataformas de Streaming</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plataforma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Plataforma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newPlatform.name}
                  onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                  placeholder="Ej: Netflix, HBO Max, Prime Video"
                />
              </div>
              <div>
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input
                  id="logo_url"
                  value={newPlatform.logo_url}
                  onChange={(e) => setNewPlatform({ ...newPlatform, logo_url: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: Logo en formato PNG con fondo transparente
                </p>
              </div>
              {newPlatform.logo_url && (
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img
                    src={newPlatform.logo_url || "/placeholder.svg"}
                    alt="Preview"
                    className="h-12 object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Activa</Label>
                <Switch
                  id="active"
                  checked={newPlatform.active}
                  onCheckedChange={(checked) => setNewPlatform({ ...newPlatform, active: checked })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                Crear Plataforma
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {platforms?.map((platform, index) => (
          <div key={platform.id} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" onClick={() => movePlatform(platform, "up")} disabled={index === 0}>
                    <GripVertical className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePlatform(platform, "down")}
                    disabled={index === (platforms?.length ?? 0) - 1}
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                </div>

                {platform.logo_url ? (
                  <div className="w-24 h-10 flex items-center justify-center bg-muted/50 rounded">
                    <img
                      src={platform.logo_url || "/placeholder.svg"}
                      alt={platform.name}
                      className="max-h-8 max-w-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-10 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground">
                    Sin logo
                  </div>
                )}

                <div>
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="text-xs text-muted-foreground">{platform.active ? "Activa" : "Inactiva"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggleActive(platform)}>
                  {platform.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingPlatform(platform)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("¿Estás seguro de eliminar esta plataforma?")) {
                      deleteMutation.mutate(platform.id)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {!platforms?.length && (
          <div className="text-center py-12 text-muted-foreground">
            No hay plataformas creadas. Crea una nueva plataforma para comenzar.
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlatform} onOpenChange={(open) => !open && setEditingPlatform(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plataforma</DialogTitle>
          </DialogHeader>
          {editingPlatform && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={editingPlatform.name}
                  onChange={(e) => setEditingPlatform({ ...editingPlatform, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-logo">URL del Logo</Label>
                <Input
                  id="edit-logo"
                  value={editingPlatform.logo_url || ""}
                  onChange={(e) => setEditingPlatform({ ...editingPlatform, logo_url: e.target.value })}
                />
              </div>
              {editingPlatform.logo_url && (
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img
                    src={editingPlatform.logo_url || "/placeholder.svg"}
                    alt="Preview"
                    className="h-12 object-contain"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Activa</Label>
                <Switch
                  id="edit-active"
                  checked={editingPlatform.active}
                  onCheckedChange={(checked) => setEditingPlatform({ ...editingPlatform, active: checked })}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full" disabled={updateMutation.isPending}>
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
