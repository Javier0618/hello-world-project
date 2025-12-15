"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { MobileNavbar } from "@/components/MobileNavbar"
import { useAdmin } from "@/hooks/useAdmin"
import { useAuth } from "@/hooks/useAuth"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Film, Tv, Database, LayoutList, Monitor } from "lucide-react"
import { searchMovies, searchTVShows } from "@/lib/tmdb"
import { MovieSearchResults } from "@/components/admin/MovieSearchResults"
import { TVSearchResults } from "@/components/admin/TVSearchResults"
import { ImportedMoviesList } from "@/components/admin/ImportedMoviesList"
import { ImportedTVShowsList } from "@/components/admin/ImportedTVShowsList"
import { SectionManager } from "@/components/admin/SectionManager"
import { PlatformManager } from "@/components/admin/PlatformManager"

const Admin = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState("movies")

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    navigate("/auth")
    return null
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile ? <MobileNavbar /> : <Navbar />}
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-center text-destructive">Acceso Denegado</h1>
          <p className="text-center text-muted-foreground mt-4">No tienes permisos de administrador</p>
          <div className="flex justify-center mt-8">
            <Button onClick={() => navigate("/")}>Volver al Inicio</Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      if (activeTab === "movies") {
        const results = await searchMovies(searchQuery)
        setSearchResults(results)
      } else {
        const results = await searchTVShows(searchQuery)
        setSearchResults(results)
      }
    } catch (error) {
      console.error("Error searching:", error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? <MobileNavbar /> : <Navbar />}
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">Panel de Administración</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-4xl grid-cols-5 mb-8">
            <TabsTrigger value="movies" className="gap-2">
              <Film className="w-4 h-4" />
              Películas
            </TabsTrigger>
            <TabsTrigger value="tv" className="gap-2">
              <Tv className="w-4 h-4" />
              Series
            </TabsTrigger>
            <TabsTrigger value="imported" className="gap-2">
              <Database className="w-4 h-4" />
              Contenido
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2">
              <LayoutList className="w-4 h-4" />
              Secciones
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-2">
              <Monitor className="w-4 h-4" />
              Plataformas
            </TabsTrigger>
          </TabsList>

          {activeTab !== "sections" && activeTab !== "platforms" && (
            <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={`Buscar ${activeTab === "movies" ? "películas" : "series"}...`}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={searching}>
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </form>
          )}

          <TabsContent value="movies">
            <MovieSearchResults results={searchResults} />
          </TabsContent>

          <TabsContent value="tv">
            <TVSearchResults results={searchResults} />
          </TabsContent>

          <TabsContent value="imported">
            <Tabs defaultValue="imported-movies" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                <TabsTrigger value="imported-movies">Películas Importadas</TabsTrigger>
                <TabsTrigger value="imported-tv">Series Importadas</TabsTrigger>
              </TabsList>
              <TabsContent value="imported-movies">
                <ImportedMoviesList />
              </TabsContent>
              <TabsContent value="imported-tv">
                <ImportedTVShowsList />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="sections">
            <SectionManager />
          </TabsContent>

          <TabsContent value="platforms">
            <PlatformManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Admin
