"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  type TVShow,
  getImageUrl,
  getTVShowDetails,
  getTVShowGenres,
  getTVSeasonDetails,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { Upload } from "lucide-react";
import { PlatformSelector } from "./PlatformSelector";
import { TabSelector } from "./TabSelector";
import { setTVShowPlatforms } from "@/lib/platformQueries";
import { addItemToSection } from "@/lib/sectionQueries";

interface TVSearchResultsProps {
  results: TVShow[];
}

interface SeasonDetails {
  season_number: number;
  episode_count: number;
  episodes: Array<{
    episode_number: number;
    name: string;
  }>;
}

import type { TVShowDetails } from "@/lib/tmdb";

export const TVSearchResults = ({ results }: TVSearchResultsProps) => {
  console.log("TVSearchResults results:", results);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [showDetails, setShowDetails] = useState<TVShowDetails | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<{
    [season: number]: SeasonDetails;
  }>({});
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodeUrls, setEpisodeUrls] = useState<{
    [season: number]: { [episode: number]: string };
  }>({});
  const [loading, setLoading] = useState(false);
  const [tvShowGenres, setTvShowGenres] = useState<Genre[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      const genres = await getTVShowGenres("en-US");
      setTvShowGenres(genres);
    };
    fetchGenres();
  }, []);

  const handleShowClick = async (show: TVShow) => {
    setSelectedShow(show);
    const details = await getTVShowDetails(show.id);
    setShowDetails(details);
    setSelectedSeason(1);
    setEpisodeUrls({});

    const seasonsData: { [season: number]: SeasonDetails } = {};
    for (let i = 1; i <= details.number_of_seasons; i++) {
      const seasonData = await getTVSeasonDetails(show.id, i);
      seasonsData[i] = {
        season_number: i,
        episode_count: seasonData.episodes?.length || 0,
        episodes: seasonData.episodes || [],
      };
    }
    setSeasonDetails(seasonsData);
  };

  const handleImport = async () => {
    if (!selectedShow || !showDetails) return;

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const genreNames = selectedShow.genre_ids
        .map((id) => tvShowGenres.find((genre) => genre.id === id)?.name)
        .filter(Boolean);

      const logoUrl = await getLogo("tv", selectedShow.id);

      const { data: tvShowData, error: tvError } = await supabase
        .from("tv_shows_imported")
        .upsert({
          id: selectedShow.id,
          tmdb_id: selectedShow.id,
          name: selectedShow.name,
          category: genreNames.join(", "),
          genre_ids: selectedShow.genre_ids,
          poster_path: selectedShow.poster_path,
          backdrop_path: selectedShow.backdrop_path,
          overview: selectedShow.overview,
          first_air_date: selectedShow.first_air_date,
          vote_average: selectedShow.vote_average,
          number_of_seasons: showDetails.number_of_seasons,
          logo_path: logoUrl,
          imported_by: user.id,
        })
        .select()
        .single();

      if (tvError) throw tvError;

      if (selectedPlatforms.length > 0) {
        await setTVShowPlatforms(tvShowData.id, selectedPlatforms);
      }

      for (const tabId of selectedTabs) {
        await addItemToSection(tabId, tvShowData.id, "tv", 0);
      }

      const seasonsWithEpisodes = Object.entries(episodeUrls).filter(
        ([_, episodes]) => Object.keys(episodes).length > 0,
      );

      for (const [seasonNum, episodes] of seasonsWithEpisodes) {
        const { data: seasonData, error: seasonError } = await supabase
          .from("seasons")
          .upsert({
            tv_show_id: tvShowData.id,
            season_number: Number.parseInt(seasonNum),
            name: `Temporada ${seasonNum}`,
          })
          .select()
          .single();

        if (seasonError) throw seasonError;

        const episodePromises = Object.entries(episodes).map(
          ([episodeNum, url]) => {
            if (!url) return Promise.resolve();

            const validation = z
              .string()
              .url({ message: "URL de video inválida" })
              .min(1)
              .safeParse(url);
            if (!validation.success) {
              throw new Error(
                `URL inválida para episodio ${episodeNum} de temporada ${seasonNum}`,
              );
            }

            return supabase.from("episodes").upsert({
              season_id: seasonData.id,
              episode_number: Number.parseInt(episodeNum),
              name: `Episodio ${episodeNum}`,
              video_url: url,
            });
          },
        );

        await Promise.all(episodePromises);
      }

      const importedSeasons = seasonsWithEpisodes.map(([s]) => s).join(", ");
      toast({
        title: "¡Serie importada!",
        description: `${selectedShow.name} Temporada(s) ${importedSeasons} ha sido añadida`,
      });

      setSelectedShow(null);
      setShowDetails(null);
      setEpisodeUrls({});
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

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      const newEpisodeUrls: {
        [season: number]: { [episode: number]: string };
      } = { ...episodeUrls };

      for (const line of lines) {
        if (
          line.toLowerCase().includes("temporada") ||
          line.toLowerCase().includes("season")
        )
          continue;

        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          const season = Number.parseInt(parts[0]);
          const episode = Number.parseInt(parts[1]);
          const url = parts[2];

          if (!isNaN(season) && !isNaN(episode) && url) {
            if (!newEpisodeUrls[season]) {
              newEpisodeUrls[season] = {};
            }
            newEpisodeUrls[season][episode] = url;
          }
        }
      }

      setEpisodeUrls(newEpisodeUrls);
      toast({
        title: "CSV importado",
        description:
          "Los enlaces de episodios han sido cargados desde el archivo CSV",
      });
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Busca series para importarlas y añadir enlaces de video por episodio
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {results.map((show) => (
          <Card
            key={show.id}
            className="overflow-hidden cursor-pointer"
            onClick={() => handleShowClick(show)}
          >
            <div className="aspect-[2/3] relative">
              {show.poster_path ? (
                <img
                  src={getImageUrl(show.poster_path) || "/placeholder.svg"}
                  alt={show.name}
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
                {show.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {show.first_air_date
                  ? new Date(show.first_air_date).getFullYear()
                  : "N/A"}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedShow} onOpenChange={() => setSelectedShow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar: {selectedShow?.name}</DialogTitle>
          </DialogHeader>
          {showDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                  id="csv-import"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar CSV
                </Button>
                <span className="text-xs text-muted-foreground">
                  Formato: temporada,episodio,url
                </span>
              </div>

              <PlatformSelector
                selectedPlatforms={selectedPlatforms}
                onPlatformsChange={setSelectedPlatforms}
              />

              <TabSelector
                selectedTabs={selectedTabs}
                onTabsChange={setSelectedTabs}
              />

              <Tabs
                value={selectedSeason.toString()}
                onValueChange={(v) => setSelectedSeason(Number.parseInt(v))}
              >
                <TabsList className="w-full overflow-x-auto flex-wrap h-auto">
                  {Array.from(
                    { length: showDetails.number_of_seasons },
                    (_, i) => i + 1,
                  ).map((season) => (
                    <TabsTrigger key={season} value={season.toString()}>
                      Temporada {season}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Array.from(
                  { length: showDetails.number_of_seasons },
                  (_, i) => i + 1,
                ).map((season) => (
                  <TabsContent
                    key={season}
                    value={season.toString()}
                    className="space-y-3"
                  >
                    <p className="text-sm text-muted-foreground mb-4">
                      Ingresa las URLs de video para cada episodio de la
                      temporada {season}(
                      {seasonDetails[season]?.episode_count || 0} episodios)
                    </p>
                    {seasonDetails[season]?.episodes?.map((episode) => (
                      <div key={episode.episode_number}>
                        <Label
                          htmlFor={`episode-${season}-${episode.episode_number}`}
                        >
                          Episodio {episode.episode_number}: {episode.name}
                        </Label>
                        <Input
                          id={`episode-${season}-${episode.episode_number}`}
                          type="url"
                          placeholder="https://..."
                          value={
                            episodeUrls[season]?.[episode.episode_number] || ""
                          }
                          onChange={(e) =>
                            setEpisodeUrls({
                              ...episodeUrls,
                              [season]: {
                                ...episodeUrls[season],
                                [episode.episode_number]: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                    {!seasonDetails[season] && (
                      <p className="text-sm text-muted-foreground">
                        Cargando episodios...
                      </p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>

              <Button
                onClick={handleImport}
                disabled={
                  loading ||
                  Object.values(episodeUrls).every(
                    (episodes) =>
                      !episodes || Object.values(episodes).every((url) => !url),
                  )
                }
                className="w-full"
              >
                {loading ? "Importando..." : "Importar Serie"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
