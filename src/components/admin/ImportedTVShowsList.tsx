"use client";

import { useState, useEffect, useCallback } from "react";
import { getImportedTVShows } from "@/lib/supabaseQueries";
import { supabase } from "@/integrations/supabase/client";
import type { TVShow } from "@/lib/tmdb";
import { getTVSeasonDetails } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlatformSelector } from "./PlatformSelector";
import { TabSelector } from "./TabSelector";
import { getTVShowPlatforms, setTVShowPlatforms } from "@/lib/platformQueries";
import { getItemTabs, setItemTabs } from "@/lib/sectionQueries";

interface Season {
  id: string;
  season_number: number;
  name: string;
  episode_count: number;
}

interface CombinedEpisode {
  id?: string;
  episode_number: number;
  name: string;
  video_url: string;
  isNew: boolean;
}

export const ImportedTVShowsList = () => {
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShow, setEditingShow] = useState<TVShow | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Record<string, CombinedEpisode[]>>(
    {},
  );
  const [editingEpisodes, setEditingEpisodes] = useState<
    Record<string, string>
  >({});
  const [category, setCategory] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const { toast } = useToast();

  const loadShows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getImportedTVShows();
      setShows(data);
    } catch (error) {
      console.error("Error loading shows:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las series",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadShows();
  }, [loadShows]);

  const loadShowDetails = async (tmdbId: number) => {
    try {
      const { data: seasonsData, error: seasonsError } = await supabase
        .from("seasons")
        .select("*")
        .eq("tv_show_id", tmdbId)
        .order("season_number");

      if (seasonsError) throw seasonsError;
      setSeasons(seasonsData || []);

      const episodesData: Record<string, CombinedEpisode[]> = {};
      const editingData: Record<string, string> = {};

      for (const season of seasonsData || []) {
        const { data: dbEpisodes, error: epsError } = await supabase
          .from("episodes")
          .select("*")
          .eq("season_id", season.id)
          .order("episode_number");

        if (epsError) throw epsError;

        const tmdbSeasonData = await getTVSeasonDetails(
          tmdbId,
          season.season_number,
        );
        const tmdbEpisodes = tmdbSeasonData?.episodes || [];

        const dbEpisodesMap = new Map(
          (dbEpisodes || []).map((ep) => [ep.episode_number, ep]),
        );

        const combinedEpisodes: CombinedEpisode[] = tmdbEpisodes.map(
          (tmdbEp: { episode_number: number; name: string }) => {
            const dbEp = dbEpisodesMap.get(tmdbEp.episode_number);

            if (dbEp) {
              editingData[dbEp.id] = dbEp.video_url || "";
              return {
                id: dbEp.id,
                episode_number: tmdbEp.episode_number,
                name: tmdbEp.name || `Episodio ${tmdbEp.episode_number}`,
                video_url: dbEp.video_url || "",
                isNew: false,
              };
            } else {
              const tempId = `new-${season.id}-${tmdbEp.episode_number}`;
              editingData[tempId] = "";
              return {
                id: tempId,
                episode_number: tmdbEp.episode_number,
                name: tmdbEp.name || `Episodio ${tmdbEp.episode_number}`,
                video_url: "",
                isNew: true,
              };
            }
          },
        );

        episodesData[season.id] = combinedEpisodes;
      }

      setEpisodes(episodesData);
      setEditingEpisodes(editingData);
    } catch (error) {
      console.error("Error loading show details:", error);
    }
  };

  const handleDelete = async (tmdbId: number) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar esta serie y todos sus episodios?",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("tv_shows_imported")
        .delete()
        .eq("tmdb_id", tmdbId);

      if (error) throw error;

      toast({
        title: "Serie eliminada",
        description: "La serie se eliminó correctamente",
      });

      await loadShows();
    } catch (error) {
      console.error("Error deleting show:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la serie",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEpisodes = async () => {
    if (!editingShow) return;

    try {
      await supabase
        .from("tv_shows_imported")
        .update({ category: category || null })
        .eq("tmdb_id", editingShow.id);

      await setTVShowPlatforms(editingShow.id, selectedPlatforms);

      await setItemTabs(editingShow.id, "tv", selectedTabs);

      for (const [seasonId, seasonEpisodes] of Object.entries(episodes)) {
        for (const episode of seasonEpisodes) {
          const videoUrl = editingEpisodes[episode.id || ""]?.trim();

          if (!videoUrl) continue;

          if (episode.isNew) {
            await supabase.from("episodes").insert({
              season_id: seasonId,
              episode_number: episode.episode_number,
              name: episode.name,
              video_url: videoUrl,
            });
          } else if (episode.id) {
            await supabase
              .from("episodes")
              .update({ video_url: videoUrl })
              .eq("id", episode.id);
          }
        }
      }

      toast({
        title: "Serie actualizada",
        description: "La serie se actualizó correctamente",
      });

      setEditingShow(null);
      setCategory("");
      setSelectedPlatforms([]);
      setSelectedTabs([]);
      await loadShows();
    } catch (error) {
      console.error("Error updating episodes:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la serie",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = async (show: TVShow) => {
    setEditingShow(show);
    setCategory("");
    loadShowDetails(show.id);
    try {
      const platforms = await getTVShowPlatforms(show.id);
      setSelectedPlatforms(platforms);
      const tabs = await getItemTabs(show.id, "tv");
      setSelectedTabs(tabs);
    } catch (error) {
      console.error("Error loading show data:", error);
      setSelectedPlatforms([]);
      setSelectedTabs([]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando series...</div>;
  }

  if (shows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay series importadas
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {shows.map((show) => (
          <div key={show.id} className="group relative">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
              <img
                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                alt={show.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleOpenEdit(show)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(show.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <h3 className="mt-2 text-sm font-medium line-clamp-2">
              {show.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {show.first_air_date?.split("-")[0]}
            </p>
          </div>
        ))}
      </div>

      <Dialog
        open={!!editingShow}
        onOpenChange={(open) => !open && setEditingShow(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Serie: {editingShow?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <Tabs defaultValue={seasons[0]?.id}>
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${seasons.length}, 1fr)`,
                }}
              >
                {seasons.map((season) => (
                  <TabsTrigger key={season.id} value={season.id}>
                    {season.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {seasons.map((season) => (
                <TabsContent
                  key={season.id}
                  value={season.id}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Temporada {season.season_number} -{" "}
                    {episodes[season.id]?.length || 0} episodios
                  </p>
                  {episodes[season.id]?.map((episode) => (
                    <div key={episode.id}>
                      <Label
                        htmlFor={`episode-${episode.id}`}
                        className="flex items-center gap-2"
                      >
                        Episodio {episode.episode_number}
                        {episode.name && `: ${episode.name}`}
                        {episode.isNew && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">
                            Nuevo
                          </span>
                        )}
                      </Label>
                      <Input
                        id={`episode-${episode.id}`}
                        type="url"
                        placeholder="https://ejemplo.com/video.mp4"
                        value={editingEpisodes[episode.id || ""] || ""}
                        onChange={(e) =>
                          setEditingEpisodes({
                            ...editingEpisodes,
                            [episode.id || ""]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
            <Button onClick={handleUpdateEpisodes} className="w-full">
              Actualizar Serie
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
