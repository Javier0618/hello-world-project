"use client"

import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { MediaSection } from "@/components/MediaSection"
import { searchImportedMovies, searchImportedTVShows } from "@/lib/supabaseQueries"
import { SearchIcon, ArrowLeft, Trash2, RefreshCw, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { useSearchHistory } from "@/hooks/useSearchHistory"

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get("q") || ""
  const [searchInput, setSearchInput] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasSearched = useRef(false)

  const {
    searchHistory,
    popularContent,
    addSearch,
    trackContentClick,
    clearSearchHistory,
    removeFromHistory,
    refreshPopularContent,
  } = useSearchHistory()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput) {
        setSearchParams({ q: searchInput })
        if (!hasSearched.current || searchInput !== query) {
          hasSearched.current = true
        }
      } else {
        setSearchParams({})
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput, setSearchParams])

  useEffect(() => {
    if (query && hasSearched.current) {
      const timer = setTimeout(() => {
        addSearch(query)
        hasSearched.current = false
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    if (query && !searchInput) {
      setSearchInput(query)
    }
  }, [query])

  const { data: movies, isLoading: loadingMovies } = useQuery({
    queryKey: ["search-movies", query],
    queryFn: () => searchImportedMovies(query),
    enabled: !!query,
  })

  const { data: tvShows, isLoading: loadingTV } = useQuery({
    queryKey: ["search-tv", query],
    queryFn: () => searchImportedTVShows(query),
    enabled: !!query,
  })

  const isLoading = loadingMovies || loadingTV

  const handleSearchFromHistory = (searchQuery: string) => {
    setSearchInput(searchQuery)
  }

  const handlePopularContentClick = (item: { content_id: number; content_type: "movie" | "tv"; title: string }) => {
    navigate(`/${item.content_type}/${item.content_id}`)
    trackContentClick(item.content_id, item.content_type, item.title)
  }

  const handleCancelSearch = () => {
    setSearchInput("")
    setSearchParams({})
  }

  const handleResultClick = (item: any, type: "movie" | "tv") => {
    const title = "title" in item ? item.title : item.name
    trackContentClick(item.id, type, title)
  }

  const getBadgeColor = (index: number) => {
    if (index < 3) return "bg-red-500"
    return "bg-zinc-600"
  }

  const showSuggestions = !searchInput

  const handleGoBack = () => {
    if (searchInput) {
      // Si hay texto, limpiar la búsqueda
      setSearchInput("")
      setSearchParams({})
    } else {
      // Si no hay texto, ir al inicio
      navigate("/")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 h-16 px-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack} className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Buscar por título de contenido o reparto"
              className="pl-10 bg-secondary border-0 h-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
            />
          </div>

          {searchInput && (
            <Button
              variant="ghost"
              className="text-primary font-semibold px-2 flex-shrink-0"
              onClick={handleCancelSearch}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-12">
        {showSuggestions && (
          <div className="space-y-8">
            {/* Search History Section */}
            {searchHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Historial de búsquedas</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSearchHistory}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-2 bg-secondary rounded-full px-4 py-2 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => handleSearchFromHistory(item.query)}
                    >
                      <span className="text-sm text-foreground">{item.query}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromHistory(item.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Búsquedas populares</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={refreshPopularContent}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-3">
                {popularContent.length > 0 ? (
                  popularContent.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 cursor-pointer hover:bg-secondary/50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => handlePopularContentClick(item)}
                    >
                      <span
                        className={`${getBadgeColor(index)} text-white text-sm font-bold w-7 h-7 rounded flex items-center justify-center flex-shrink-0`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-foreground">{item.title}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No hay búsquedas populares aún</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {query && isLoading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Buscando...</p>
          </div>
        )}

        {query && !isLoading && searchInput && (
          <>
            {movies && movies.length > 0 && (
              <MediaSection
                title="Películas"
                items={movies}
                type="movie"
                onItemClick={(item) => handleResultClick(item, "movie")}
              />
            )}

            {tvShows && tvShows.length > 0 && (
              <MediaSection
                title="Series"
                items={tvShows}
                type="tv"
                onItemClick={(item) => handleResultClick(item, "tv")}
              />
            )}

            {movies?.length === 0 && tvShows?.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">No se encontraron resultados</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Search
