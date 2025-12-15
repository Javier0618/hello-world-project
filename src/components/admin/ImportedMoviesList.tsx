"use client";

import { useState, useEffect, useCallback } from "react";
import { getImportedMovies } from "@/lib/supabaseQueries";
import { supabase } from "@/integrations/supabase/client";
import type { Movie } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlatformSelector } from "./PlatformSelector";
import { TabSelector } from "./TabSelector";
import { getMoviePlatforms, setMoviePlatforms } from "@/lib/platformQueries";
import { getItemTabs, setItemTabs } from "@/lib/sectionQueries";

export const ImportedMoviesList = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const { toast } = useToast();

  const loadMovies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getImportedMovies();
      setMovies(data);
    } catch (error) {
      console.error("Error loading movies:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las películas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleDelete = async (tmdbId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta película?"))
      return;

    try {
      const { error } = await supabase
        .from("movies_imported")
        .delete()
        .eq("tmdb_id", tmdbId);

      if (error) throw error;

      toast({
        title: "Película eliminada",
        description: "La película se eliminó correctamente",
      });

      await loadMovies();
    } catch (error) {
      console.error("Error deleting movie:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la película",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingMovie) return;

    try {
      const updateData: { video_url?: string; category?: string | null } = {};
      
      if (videoUrl.trim()) {
        updateData.video_url = videoUrl;
      }
      if (category !== undefined) {
        updateData.category = category || null;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("movies_imported")
          .update(updateData)
          .eq("tmdb_id", editingMovie.id);

        if (error) throw error;
      }

      await setMoviePlatforms(editingMovie.id, selectedPlatforms);

      await setItemTabs(editingMovie.id, "movie", selectedTabs);

      toast({
        title: "Película actualizada",
        description: "La película se actualizó correctamente",
      });

      setEditingMovie(null);
      setVideoUrl("");
      setCategory("");
      setSelectedPlatforms([]);
      setSelectedTabs([]);
      await loadMovies();
    } catch (error) {
      console.error("Error updating movie:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la película",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = async (movie: Movie) => {
    setEditingMovie(movie);
    setVideoUrl("");
    setCategory("");
    try {
      const platforms = await getMoviePlatforms(movie.id);
      setSelectedPlatforms(platforms);
      const tabs = await getItemTabs(movie.id, "movie");
      setSelectedTabs(tabs);
    } catch (error) {
      console.error("Error loading movie data:", error);
      setSelectedPlatforms([]);
      setSelectedTabs([]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando películas...</div>;
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay películas importadas
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {movies.map((movie) => (
          <div key={movie.id} className="group relative">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleOpenEdit(movie)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(movie.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <h3 className="mt-2 text-sm font-medium line-clamp-2">
              {movie.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {movie.release_date?.split("-")[0]}
            </p>
          </div>
        ))}
      </div>

      <Dialog
        open={!!editingMovie}
        onOpenChange={(open) => !open && setEditingMovie(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Película: {editingMovie?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url">URL del Video</Label>
              <Input
                id="video-url"
                type="url"
                placeholder="https://ejemplo.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoría (opcional)</Label>
              <Input
                id="category"
                type="text"
                placeholder="Ej: Acción, Comedia, Drama..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              onPlatformsChange={setSelectedPlatforms}
            />
            <TabSelector
              selectedTabs={selectedTabs}
              onTabsChange={setSelectedTabs}
            />
            <Button
              onClick={handleEdit}
              className="w-full"
            >
              Actualizar Película
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
