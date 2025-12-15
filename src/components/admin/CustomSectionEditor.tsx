import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getSectionItems,
  addItemToSection,
  removeItemFromSection,
  type Section,
} from "@/lib/sectionQueries";
import { getImportedMovies, getImportedTVShows } from "@/lib/supabaseQueries";
import { Settings, X } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";

interface CustomSectionEditorProps {
  section: Section;
}

export const CustomSectionEditor = ({ section }: CustomSectionEditorProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sectionItems } = useQuery({
    queryKey: ["section-items", section.id],
    queryFn: () => getSectionItems(section.id),
    enabled: isOpen,
  });

  const { data: allMovies } = useQuery({
    queryKey: ["imported-movies"],
    queryFn: getImportedMovies,
    enabled: isOpen,
  });

  const { data: allTVShows } = useQuery({
    queryKey: ["imported-tv"],
    queryFn: getImportedTVShows,
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: ({ itemId, itemType }: { itemId: number; itemType: "movie" | "tv" }) => {
      const maxPosition = sectionItems?.reduce((max, item) => Math.max(max, item.position), -1) ?? -1;
      return addItemToSection(section.id, itemId, itemType, maxPosition + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-items", section.id] });
      queryClient.invalidateQueries({ queryKey: ["section-content", section.id] });
      toast.success("Contenido agregado a la sección");
    },
    onError: () => {
      toast.error("Error al agregar contenido");
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeItemFromSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-items", section.id] });
      queryClient.invalidateQueries({ queryKey: ["section-content", section.id] });
      toast.success("Contenido removido de la sección");
    },
    onError: () => {
      toast.error("Error al remover contenido");
    },
  });

  const isItemInSection = (itemId: number, itemType: "movie" | "tv") => {
    return sectionItems?.some(item => item.item_id === itemId && item.item_type === itemType);
  };

  const getSectionItemId = (itemId: number, itemType: "movie" | "tv") => {
    return sectionItems?.find(item => item.item_id === itemId && item.item_type === itemType)?.id;
  };

  const filteredMovies = allMovies?.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTVShows = allTVShows?.filter(show =>
    show.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contenido: {section.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Buscar películas o series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Tabs defaultValue="movies">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="movies">Películas</TabsTrigger>
              <TabsTrigger value="tv">Series</TabsTrigger>
            </TabsList>

            <TabsContent value="movies" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {filteredMovies?.map((movie) => {
                  const inSection = isItemInSection(movie.id, "movie");
                  return (
                    <div key={movie.id} className="relative group">
                      <MovieCard item={movie} type="movie" />
                      <div className="absolute top-2 right-2">
                        {inSection ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const itemId = getSectionItemId(movie.id, "movie");
                              if (itemId) removeMutation.mutate(itemId);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addMutation.mutate({ itemId: movie.id, itemType: "movie" })}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="tv" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {filteredTVShows?.map((show) => {
                  const inSection = isItemInSection(show.id, "tv");
                  return (
                    <div key={show.id} className="relative group">
                      <MovieCard item={show} type="tv" />
                      <div className="absolute top-2 right-2">
                        {inSection ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const itemId = getSectionItemId(show.id, "tv");
                              if (itemId) removeMutation.mutate(itemId);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addMutation.mutate({ itemId: show.id, itemType: "tv" })}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
