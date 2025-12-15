"use client";

import { useState, useEffect } from "react";
import {
  type Movie,
  getImageUrl,
  getMovieGenres,
  type Genre,
} from "@/lib/tmdb";
import { getLogo } from "@/lib/tmdb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { PlatformSelector } from "./PlatformSelector";
import { TabSelector } from "./TabSelector";
import { setMoviePlatforms } from "@/lib/platformQueries";
import { addItemToSection } from "@/lib/sectionQueries";

const videoUrlSchema = z
  .string()
  .url({ message: "URL de video inválida" })
  .min(1);

interface MovieSearchResultsProps {
  results: Movie[];
}

export const MovieSearchResults = ({ results }: MovieSearchResultsProps) => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGenres = async () => {
      const genres = await getMovieGenres("en-US");
      setMovieGenres(genres);
    };
    fetchGenres();
  }, []);

  const handleImport = async () => {
    if (!selectedMovie) return;

    const validation = videoUrlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast({
        title: "Error",
        description: "Por favor ingresa una URL válida",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const genreNames = selectedMovie.genre_ids
        .map((id) => movieGenres.find((genre) => genre.id === id)?.name)
        .filter(Boolean);

      const logoUrl = await getLogo("movie", selectedMovie.id);

      const { error } = await supabase.from("movies_imported").upsert({
        id: selectedMovie.id,
        tmdb_id: selectedMovie.id,
        title: selectedMovie.title,
        video_url: videoUrl,
        category: genreNames.join(", "),
        genre_ids: selectedMovie.genre_ids,
        poster_path: selectedMovie.poster_path,
        backdrop_path: selectedMovie.backdrop_path,
        overview: selectedMovie.overview,
        release_date: selectedMovie.release_date,
        vote_average: selectedMovie.vote_average,
        logo_path: logoUrl,
        imported_by: user.id,
      });

      if (error) throw error;

      if (selectedPlatforms.length > 0) {
        await setMoviePlatforms(selectedMovie.id, selectedPlatforms);
      }

      for (const tabId of selectedTabs) {
        await addItemToSection(tabId, selectedMovie.id, "movie", 0);
      }

      toast({
        title: "¡Película importada!",
        description: `${selectedMovie.title} ha sido añadida exitosamente`,
      });

      setSelectedMovie(null);
      setVideoUrl("");
      setSelectedPlatforms([]);
      setSelectedTabs([]);
    } catch (error: unknown) {
      let errorMessage = "Ocurrió un error desconocido";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Busca películas para importarlas y añadir enlaces de video
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {results.map((movie) => (
          <Card
            key={movie.id}
            className="overflow-hidden cursor-pointer"
            onClick={() => setSelectedMovie(movie)}
          >
            <div className="aspect-[2/3] relative">
              {movie.poster_path ? (
                <img
                  src={getImageUrl(movie.poster_path) || "/placeholder.svg"}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">
                    Sin imagen
                  </span>
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm line-clamp-2">
                {movie.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {movie.release_date
                  ? new Date(movie.release_date).getFullYear()
                  : "N/A"}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedMovie}
        onOpenChange={() => setSelectedMovie(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar: {selectedMovie?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="videoUrl">URL del Video</Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder="https://..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
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
              onClick={handleImport}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Importando..." : "Importar Película"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
