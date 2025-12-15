"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getAllSections, createSection, updateSection, deleteSection, generateSlug, type Section, type ScreenVisibility, type SectionType } from "@/lib/sectionQueries"
import { Checkbox } from "@/components/ui/checkbox"
import { Monitor, Smartphone, MonitorSmartphone, Pencil } from "lucide-react"
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react"
import { CustomSectionEditor } from "./CustomSectionEditor"

const MAIN_TABS = [
  { id: "inicio", label: "Inicio", description: "Muestra todos los tipos de contenido" },
  { id: "peliculas", label: "Películas", description: "Solo muestra películas" },
  { id: "series", label: "Series", description: "Solo muestra series" },
]

const CATEGORIES = [
  { value: "action", label: "Acción" },
  { value: "adventure", label: "Aventura" },
  { value: "animation", label: "Animación" },
  { value: "comedy", label: "Comedia" },
  { value: "crime", label: "Crimen" },
  { value: "documentary", label: "Documental" },
  { value: "drama", label: "Drama" },
  { value: "family", label: "Familia" },
  { value: "fantasy", label: "Fantasía" },
  { value: "history", label: "Historia" },
  { value: "horror", label: "Terror" },
  { value: "music", label: "Música" },
  { value: "mystery", label: "Misterio" },
  { value: "romance", label: "Romance" },
  { value: "science fiction", label: "Ciencia Ficción" },
  { value: "thriller", label: "Suspenso" },
  { value: "war", label: "Guerra" },
  { value: "western", label: "Western" },
  { value: "tv movie", label: "Película de TV" },
]

const getContentTypeForTab = (internalTab: string): "all" | "movie" | "tv" => {
  if (internalTab === "peliculas") return "movie"
  if (internalTab === "series") return "tv"
  return "all" // For "inicio" or custom tabs
}

interface EditSectionForm {
  name: string
  type: SectionType
  category: string
  placement: "tab" | "internal"
  internal_tab: string
  visible_in_tabs: string[]
  screen_visibility: ScreenVisibility
  slug: string
  html_content: string
}

export const SectionManager = () => {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditSectionForm>({
    name: "",
    type: "category",
    category: "",
    placement: "internal",
    internal_tab: "inicio",
    visible_in_tabs: [] as string[],
    screen_visibility: "all",
    slug: "",
    html_content: "",
  })
  const [newSection, setNewSection] = useState({
    name: "",
    type: "category" as SectionType,
    category: "",
    position: 0,
    visible: true,
    placement: "internal" as "tab" | "internal",
    internal_tab: "inicio" as string,
    visible_in_tabs: [] as string[],
    screen_visibility: "all" as ScreenVisibility,
    slug: "" as string,
    html_content: "" as string,
  })

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: getAllSections,
  })

  const availableTabSections = sections?.filter((s) => s.placement === "tab") || []

  const createMutation = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] })
      queryClient.invalidateQueries({ queryKey: ["tab-sections"] })
      queryClient.invalidateQueries({ queryKey: ["internal-sections"] })
      toast.success("Sección creada exitosamente")
      setIsCreateOpen(false)
      setNewSection({
        name: "",
        type: "category",
        category: "",
        position: 0,
        visible: true,
        placement: "internal",
        internal_tab: "inicio",
        visible_in_tabs: [],
        screen_visibility: "all",
        slug: "",
        html_content: "",
      })
    },
    onError: (error: Error) => {
      console.error("Error creating section:", error)
      toast.error(`Error al crear la sección: ${error.message || "Error desconocido"}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Section> }) => updateSection(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] })
      queryClient.invalidateQueries({ queryKey: ["tab-sections"] })
      queryClient.invalidateQueries({ queryKey: ["internal-sections"] })
      toast.success("Sección actualizada")
    },
    onError: () => {
      toast.error("Error al actualizar la sección")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] })
      queryClient.invalidateQueries({ queryKey: ["tab-sections"] })
      queryClient.invalidateQueries({ queryKey: ["internal-sections"] })
      toast.success("Sección eliminada")
    },
    onError: () => {
      toast.error("Error al eliminar la sección")
    },
  })

  const handleCreate = () => {
    if (!newSection.name) {
      toast.error("El nombre es requerido")
      return
    }
    if (newSection.type === "category" && !newSection.category) {
      toast.error("La categoría es requerida")
      return
    }
    if (newSection.type === "custom_html" && !newSection.html_content) {
      toast.error("El contenido HTML es requerido")
      return
    }
    if (newSection.placement === "internal" && newSection.visible_in_tabs.length === 0) {
      toast.error("Debes seleccionar al menos una pestaña principal")
      return
    }

    const maxPosition = sections?.reduce((max, s) => Math.max(max, s.position), -1) ?? -1

    const slug = newSection.placement === "tab" 
      ? (newSection.slug || generateSlug(newSection.name))
      : null

    createMutation.mutate({
      ...newSection,
      position: maxPosition + 1,
      internal_tab: newSection.placement === "internal" && newSection.visible_in_tabs.length > 0 
        ? newSection.visible_in_tabs[0] 
        : null,
      visible_in_tabs: newSection.placement === "internal" ? newSection.visible_in_tabs : [],
      content_type: "all",
      screen_visibility: newSection.screen_visibility,
      slug,
      html_content: newSection.type === "custom_html" ? newSection.html_content : null,
    })
  }

  const toggleVisibility = (section: Section) => {
    updateMutation.mutate({
      id: section.id,
      updates: { visible: !section.visible },
    })
  }

  const openEditDialog = (section: Section) => {
    setEditingSection(section)
    setEditForm({
      name: section.name,
      type: section.type as SectionType,
      category: section.category || "",
      placement: (section.placement || "internal") as "tab" | "internal",
      internal_tab: section.internal_tab || "inicio",
      visible_in_tabs: section.visible_in_tabs || [],
      screen_visibility: (section.screen_visibility || "all") as ScreenVisibility,
      slug: section.slug || "",
      html_content: section.html_content || "",
    })
    setIsEditOpen(true)
  }

  const handleEditSubmit = () => {
    if (!editingSection) return
    
    if (!editForm.name) {
      toast.error("El nombre es requerido")
      return
    }
    if (editForm.type === "category" && !editForm.category) {
      toast.error("La categoría es requerida")
      return
    }
    if (editForm.type === "custom_html" && !editForm.html_content) {
      toast.error("El contenido HTML es requerido")
      return
    }
    if (editForm.placement === "internal" && editForm.visible_in_tabs.length === 0) {
      toast.error("Debes seleccionar al menos una pestaña principal")
      return
    }

    const slug = editForm.placement === "tab" 
      ? (editForm.slug || generateSlug(editForm.name))
      : null

    updateMutation.mutate({
      id: editingSection.id,
      updates: {
        name: editForm.name,
        type: editForm.type,
        category: editForm.type === "category" ? editForm.category : null,
        placement: editForm.placement,
        internal_tab: editForm.placement === "internal" && editForm.visible_in_tabs.length > 0 
          ? editForm.visible_in_tabs[0] 
          : null,
        visible_in_tabs: editForm.placement === "internal" ? editForm.visible_in_tabs : [],
        content_type: "all",
        screen_visibility: editForm.screen_visibility,
        slug,
        html_content: editForm.type === "custom_html" ? editForm.html_content : null,
      },
    })
    setIsEditOpen(false)
    setEditingSection(null)
  }

  const moveSection = (section: Section, direction: "up" | "down") => {
    if (!sections) return

    const currentIndex = sections.findIndex((s) => s.id === section.id)
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= sections.length) return

    const targetSection = sections[targetIndex]

    updateMutation.mutate({
      id: section.id,
      updates: { position: targetSection.position },
    })

    updateMutation.mutate({
      id: targetSection.id,
      updates: { position: section.position },
    })
  }

  if (isLoading) {
    return <div className="text-center py-8">Cargando secciones...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Secciones</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Sección
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Sección</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Sección</Label>
                <Input
                  id="name"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  placeholder="Ej: Animes, Doramas, Terror"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de Sección</Label>
                <Select
                  value={newSection.type}
                  onValueChange={(value: SectionType) => setNewSection({ ...newSection, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Por Categoría</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                    <SelectItem value="backdrop_carousel">Carrusel de Backdrops</SelectItem>
                    <SelectItem value="custom_html">Banner HTML Personalizado</SelectItem>
                    <SelectItem value="top10">Top 10 Más Vistos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newSection.type === "category" && "Muestra contenido filtrado por categoría"}
                  {newSection.type === "custom" && "Selecciona manualmente películas y series"}
                  {newSection.type === "backdrop_carousel" && "Carrusel grande con imágenes de fondo (estilo Netflix)"}
                  {newSection.type === "custom_html" && "Inserta código HTML/anuncios personalizados"}
                  {newSection.type === "top10" && "Top 10 más populares de TMDB con estilo Netflix (numeración 1-10)"}
                </p>
              </div>

              {newSection.type === "category" && (
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={newSection.category}
                    onValueChange={(value) => setNewSection({ ...newSection, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newSection.type === "custom_html" && (
                <div>
                  <Label htmlFor="html_content">Código HTML</Label>
                  <textarea
                    id="html_content"
                    value={newSection.html_content}
                    onChange={(e) => setNewSection({ ...newSection, html_content: e.target.value })}
                    placeholder="<div>Tu código HTML aquí...</div>"
                    className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pega aquí código de anuncios (AdSense, Adsterra, etc.) o cualquier HTML/CSS/JS personalizado.
                  </p>
                </div>
              )}

              {(newSection.type === "custom" || newSection.type === "backdrop_carousel" || newSection.type === "top10") && (
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    {newSection.type === "custom" && "Después de crear la sección, podrás agregar películas y series desde el gestor de contenido."}
                    {newSection.type === "backdrop_carousel" && "Después de crear la sección, podrás seleccionar las películas y series que aparecerán en el carrusel de backdrops."}
                    {newSection.type === "top10" && "Esta sección obtiene automáticamente el Top 10 de películas y series más populares de TMDB. Solo muestra contenido que exista en tu base de datos local."}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="placement">Ubicación en Móvil</Label>
                <Select
                  value={newSection.placement}
                  onValueChange={(value: "tab" | "internal") => setNewSection({ ...newSection, placement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tab">Pestaña Principal</SelectItem>
                    <SelectItem value="internal">Sección Interna</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newSection.placement === "tab"
                    ? "Aparece como pestaña en el menú de navegación móvil"
                    : "Se muestra como carrusel dentro de una pestaña existente"}
                </p>
              </div>

              {newSection.placement === "tab" && (
                <div>
                  <Label htmlFor="new-slug">URL amigable (slug)</Label>
                  <Input
                    id="new-slug"
                    value={newSection.slug}
                    onChange={(e) => setNewSection({ ...newSection, slug: e.target.value })}
                    placeholder={`Ej: ${generateSlug(newSection.name || "mi-seccion")}`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    La URL será: /tab/{newSection.slug || generateSlug(newSection.name || "mi-seccion")}
                  </p>
                </div>
              )}

              {newSection.placement === "internal" && (
                <div>
                  <Label className="mb-3 block">Mostrar en las siguientes pestañas principales</Label>
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                    {MAIN_TABS.map((tab) => (
                      <div key={tab.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`new-tab-${tab.id}`}
                          checked={newSection.visible_in_tabs.includes(tab.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewSection({
                                ...newSection,
                                visible_in_tabs: [...newSection.visible_in_tabs, tab.id],
                              })
                            } else {
                              setNewSection({
                                ...newSection,
                                visible_in_tabs: newSection.visible_in_tabs.filter((t) => t !== tab.id),
                              })
                            }
                          }}
                        />
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor={`new-tab-${tab.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {tab.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {tab.description}
                          </p>
                        </div>
                      </div>
                    ))}
                    {availableTabSections.map((tabSection) => (
                      <div key={tabSection.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`new-tab-${tabSection.id}`}
                          checked={newSection.visible_in_tabs.includes(tabSection.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewSection({
                                ...newSection,
                                visible_in_tabs: [...newSection.visible_in_tabs, tabSection.id],
                              })
                            } else {
                              setNewSection({
                                ...newSection,
                                visible_in_tabs: newSection.visible_in_tabs.filter((t) => t !== tabSection.id),
                              })
                            }
                          }}
                        />
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor={`new-tab-${tabSection.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {tabSection.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Pestaña personalizada
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {newSection.type === "custom" 
                      ? "Las secciones personalizadas mostrarán el mismo contenido en todas las pestañas seleccionadas."
                      : "Las secciones por categoría filtrarán automáticamente el contenido según el tipo de pestaña (películas/series/todo)."}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="visible">Visible</Label>
                <Switch
                  id="visible"
                  checked={newSection.visible}
                  onCheckedChange={(checked) => setNewSection({ ...newSection, visible: checked })}
                />
              </div>

              <div>
                <Label htmlFor="screen_visibility">Visibilidad por Pantalla</Label>
                <Select
                  value={newSection.screen_visibility}
                  onValueChange={(value: ScreenVisibility) => setNewSection({ ...newSection, screen_visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="w-4 h-4" />
                        <span>Todos los dispositivos</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Solo móvil y tablet</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="desktop">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span>Solo desktop</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newSection.screen_visibility === "all"
                    ? "Se mostrará en todos los dispositivos"
                    : newSection.screen_visibility === "mobile"
                      ? "Solo visible en móvil y tablet (≤768px)"
                      : "Solo visible en escritorio (≥769px)"}
                </p>
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                Crear Sección
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {sections?.map((section, index) => (
          <div key={section.id} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" onClick={() => moveSection(section, "up")} disabled={index === 0}>
                    <GripVertical className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveSection(section, "down")}
                    disabled={index === sections.length - 1}
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold">{section.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {section.type === "category" && `Categoría: ${CATEGORIES.find((c) => c.value === section.category)?.label || section.category}`}
                    {section.type === "custom" && "Sección personalizada"}
                    {section.type === "backdrop_carousel" && "Carrusel de Backdrops"}
                    {section.type === "custom_html" && "Banner HTML personalizado"}
                    {section.type === "top10" && "Top 10 Más Vistos"}
                    {section.type === "category" && section.content_type && section.content_type !== "all" && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted">
                        {section.content_type === "movie" ? "Solo películas" : "Solo series"}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {section.placement === "tab"
                      ? "📱 Pestaña principal en móvil"
                      : section.placement === "internal"
                        ? `📱 Visible en: ${
                            (section.visible_in_tabs && section.visible_in_tabs.length > 0)
                              ? section.visible_in_tabs.map((tabId) => {
                                  if (tabId === "inicio") return "Inicio"
                                  if (tabId === "peliculas") return "Películas"
                                  if (tabId === "series") return "Series"
                                  return sections?.find((s) => s.id === tabId)?.name || tabId
                                }).join(", ")
                              : section.internal_tab === "inicio"
                                ? "Inicio"
                                : section.internal_tab === "peliculas"
                                  ? "Películas"
                                  : section.internal_tab === "series"
                                    ? "Series"
                                    : sections?.find((s) => s.id === section.internal_tab)?.name || section.internal_tab
                          }`
                        : "💻 Solo escritorio"}
                    {section.screen_visibility && section.screen_visibility !== "all" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted">
                        {section.screen_visibility === "mobile" ? (
                          <>
                            <Smartphone className="w-3 h-3" />
                            Solo móvil
                          </>
                        ) : (
                          <>
                            <Monitor className="w-3 h-3" />
                            Solo desktop
                          </>
                        )}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleVisibility(section)}>
                    {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(section)} title="Editar propiedades">
                    <Pencil className="w-4 h-4" />
                  </Button>

                  {(section.type === "custom" || section.type === "backdrop_carousel") && <CustomSectionEditor section={section} />}

                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(section.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!sections?.length && (
          <div className="text-center py-12 text-muted-foreground">
            No hay secciones creadas. Crea una nueva sección para comenzar.
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Sección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre de la Sección</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Ej: Animes, Doramas, Terror"
              />
            </div>

            <div>
              <Label htmlFor="edit-type">Tipo de Sección</Label>
              <Select
                value={editForm.type}
                onValueChange={(value: SectionType) => setEditForm({ ...editForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Por Categoría</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                  <SelectItem value="backdrop_carousel">Carrusel de Backdrops</SelectItem>
                  <SelectItem value="custom_html">Banner HTML Personalizado</SelectItem>
                  <SelectItem value="top10">Top 10 Más Vistos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {editForm.type === "category" && "Muestra contenido filtrado por categoría"}
                {editForm.type === "custom" && "Selecciona manualmente películas y series"}
                {editForm.type === "backdrop_carousel" && "Carrusel grande con imágenes de fondo (estilo Netflix)"}
                {editForm.type === "custom_html" && "Inserta código HTML/anuncios personalizados"}
                {editForm.type === "top10" && "Top 10 más populares de TMDB con estilo Netflix (numeración 1-10)"}
              </p>
            </div>

            {editForm.type === "top10" && (
              <div className="p-4 bg-muted/30 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Esta sección obtiene automáticamente el Top 10 de películas y series más populares de TMDB. Solo muestra contenido que exista en tu base de datos local.
                </p>
              </div>
            )}

            {editForm.type === "category" && (
              <div>
                <Label htmlFor="edit-category">Categoría</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editForm.type === "custom_html" && (
              <div>
                <Label htmlFor="edit-html_content">Código HTML</Label>
                <textarea
                  id="edit-html_content"
                  value={editForm.html_content}
                  onChange={(e) => setEditForm({ ...editForm, html_content: e.target.value })}
                  placeholder="<div>Tu código HTML aquí...</div>"
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pega aquí código de anuncios (AdSense, Adsterra, etc.) o cualquier HTML/CSS/JS personalizado.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="edit-placement">Ubicación en Móvil</Label>
              <Select
                value={editForm.placement}
                onValueChange={(value: "tab" | "internal") => setEditForm({ ...editForm, placement: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tab">Pestaña Principal</SelectItem>
                  <SelectItem value="internal">Sección Interna</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {editForm.placement === "tab"
                  ? "Aparece como pestaña en el menú de navegación móvil"
                  : "Se muestra como carrusel dentro de una pestaña existente"}
              </p>
            </div>

            {editForm.placement === "tab" && (
              <div>
                <Label htmlFor="edit-slug">URL amigable (slug)</Label>
                <Input
                  id="edit-slug"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  placeholder={`Ej: ${generateSlug(editForm.name || "mi-seccion")}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  La URL será: /tab/{editForm.slug || generateSlug(editForm.name || "mi-seccion")}
                </p>
              </div>
            )}

            {editForm.placement === "internal" && (
              <div>
                <Label className="mb-3 block">Mostrar en las siguientes pestañas principales</Label>
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  {MAIN_TABS.map((tab) => (
                    <div key={tab.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`edit-tab-${tab.id}`}
                        checked={editForm.visible_in_tabs.includes(tab.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditForm({
                              ...editForm,
                              visible_in_tabs: [...editForm.visible_in_tabs, tab.id],
                            })
                          } else {
                            setEditForm({
                              ...editForm,
                              visible_in_tabs: editForm.visible_in_tabs.filter((t) => t !== tab.id),
                            })
                          }
                        }}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor={`edit-tab-${tab.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {tab.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {tab.description}
                        </p>
                      </div>
                    </div>
                  ))}
                  {availableTabSections
                    .filter((s) => s.id !== editingSection?.id)
                    .map((tabSection) => (
                      <div key={tabSection.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`edit-tab-${tabSection.id}`}
                          checked={editForm.visible_in_tabs.includes(tabSection.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditForm({
                                ...editForm,
                                visible_in_tabs: [...editForm.visible_in_tabs, tabSection.id],
                              })
                            } else {
                              setEditForm({
                                ...editForm,
                                visible_in_tabs: editForm.visible_in_tabs.filter((t) => t !== tabSection.id),
                              })
                            }
                          }}
                        />
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor={`edit-tab-${tabSection.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {tabSection.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Pestaña personalizada
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {editForm.type === "custom" 
                    ? "Las secciones personalizadas mostrarán el mismo contenido en todas las pestañas seleccionadas."
                    : "Las secciones por categoría filtrarán automáticamente el contenido según el tipo de pestaña (películas/series/todo)."}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="edit-screen_visibility">Visibilidad por Pantalla</Label>
              <Select
                value={editForm.screen_visibility}
                onValueChange={(value: ScreenVisibility) => setEditForm({ ...editForm, screen_visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone className="w-4 h-4" />
                      <span>Todos los dispositivos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      <span>Solo móvil y tablet</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span>Solo desktop</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {editForm.screen_visibility === "all"
                  ? "Se mostrará en todos los dispositivos"
                  : editForm.screen_visibility === "mobile"
                    ? "Solo visible en móvil y tablet (≤768px)"
                    : "Solo visible en escritorio (≥769px)"}
              </p>
            </div>

            <Button onClick={handleEditSubmit} className="w-full" disabled={updateMutation.isPending}>
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
