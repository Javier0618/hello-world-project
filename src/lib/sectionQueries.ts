import { supabase } from "@/integrations/supabase/client";
import type { Media } from "./tmdb";

export type { Media };

export type ScreenVisibility = "all" | "mobile" | "desktop";

export type SectionType =
  | "category"
  | "custom"
  | "backdrop_carousel"
  | "custom_html"
  | "top10";

export interface Section {
  id: string;
  name: string;
  type: SectionType;
  category: string | null;
  position: number;
  visible: boolean;
  placement: "tab" | "internal" | null;
  internal_tab: string | null;
  visible_in_tabs: string[];
  content_type: "all" | "movie" | "tv";
  screen_visibility: ScreenVisibility;
  slug: string | null;
  html_content?: string | null;
  created_at: string;
  updated_at: string;
}

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const getSectionBySlug = async (
  slug: string,
): Promise<Section | null> => {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("slug", slug)
    .eq("visible", true)
    .single();

  if (error) return null;
  return data as Section;
};

export const getSectionByIdOrSlug = async (
  identifier: string,
): Promise<Section | null> => {
  const { data: bySlug } = await supabase
    .from("sections")
    .select("*")
    .eq("slug", identifier)
    .eq("visible", true)
    .single();

  if (bySlug) return bySlug as Section;

  const { data: byId } = await supabase
    .from("sections")
    .select("*")
    .eq("id", identifier)
    .eq("visible", true)
    .single();

  return byId as Section | null;
};

export interface SectionItem {
  id: string;
  section_id: string;
  item_id: number;
  item_type: "movie" | "tv";
  position: number;
}

// Get all visible sections ordered by position
export const getVisibleSections = async (): Promise<Section[]> => {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("visible", true)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []) as Section[];
};

// Get all sections (admin only)
export const getAllSections = async (): Promise<Section[]> => {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []) as Section[];
};

// Get section content
export const getSectionContent = async (section: Section): Promise<Media[]> => {
  if (section.type === "category") {
    return getCategoryContent(
      section.category || "",
      section.content_type || "all",
    );
  } else {
    return getCustomSectionContent(section.id);
  }
};

// Get content by category
const getCategoryContent = async (
  category: string,
  contentType: "all" | "movie" | "tv" = "all",
): Promise<Media[]> => {
  const results: Media[] = [];

  // Fetch movies only if contentType is 'all' or 'movie'
  if (contentType === "all" || contentType === "movie") {
    const { data: movies, error: moviesError } = await supabase
      .from("movies_imported")
      .select("*")
      .ilike("category", `%${category}%`)
      .limit(20);

    if (moviesError) throw moviesError;

    const movieResults: Media[] =
      movies?.map((movie) => ({
        id: movie.tmdb_id,
        title: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: Number(movie.vote_average) || 0,
        vote_count: 0,
        genre_ids: [],
      })) || [];

    results.push(...movieResults);
  }

  // Fetch TV shows only if contentType is 'all' or 'tv'
  if (contentType === "all" || contentType === "tv") {
    const { data: tvShows, error: tvError } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .ilike("category", `%${category}%`)
      .limit(20);

    if (tvError) throw tvError;

    const tvResults: Media[] =
      tvShows?.map((show) => ({
        id: show.tmdb_id,
        name: show.name,
        poster_path: show.poster_path,
        backdrop_path: show.backdrop_path,
        overview: show.overview,
        first_air_date: show.first_air_date,
        vote_average: Number(show.vote_average) || 0,
        vote_count: 0,
        genre_ids: [],
      })) || [];

    results.push(...tvResults);
  }

  return results;
};

// Get all movies (for popular movies section)
export const getAllMovies = async (): Promise<Media[]> => {
  const { data: movies, error } = await supabase
    .from("movies_imported")
    .select("*")
    .order("vote_average", { ascending: false });

  if (error) throw error;

  return (
    movies?.map((movie) => ({
      id: movie.tmdb_id,
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      overview: movie.overview,
      release_date: movie.release_date,
      vote_average: Number(movie.vote_average) || 0,
      vote_count: 0,
      genre_ids: [],
    })) || []
  );
};

export interface PaginatedResult {
  items: Media[];
  nextPage: number | null;
  totalCount: number;
}

const PAGE_SIZE = 30;

export const getMoviesPaginated = async (
  page: number = 0,
): Promise<PaginatedResult> => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: movies,
    error,
    count,
  } = await supabase
    .from("movies_imported")
    .select("*", { count: "exact" })
    .order("vote_average", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const items: Media[] =
    movies?.map((movie) => ({
      id: movie.tmdb_id,
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      overview: movie.overview,
      release_date: movie.release_date,
      vote_average: Number(movie.vote_average) || 0,
      vote_count: 0,
      genre_ids: [],
    })) || [];

  const totalCount = count || 0;
  const hasMore = from + items.length < totalCount;

  return {
    items,
    nextPage: hasMore ? page + 1 : null,
    totalCount,
  };
};

export const getTVShowsPaginated = async (
  page: number = 0,
): Promise<PaginatedResult> => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: tvShows,
    error,
    count,
  } = await supabase
    .from("tv_shows_imported")
    .select("*", { count: "exact" })
    .order("vote_average", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const items: Media[] =
    tvShows?.map((show) => ({
      id: show.tmdb_id,
      name: show.name,
      poster_path: show.poster_path,
      backdrop_path: show.backdrop_path,
      overview: show.overview,
      first_air_date: show.first_air_date,
      vote_average: Number(show.vote_average) || 0,
      vote_count: 0,
      genre_ids: [],
    })) || [];

  const totalCount = count || 0;
  const hasMore = from + items.length < totalCount;

  return {
    items,
    nextPage: hasMore ? page + 1 : null,
    totalCount,
  };
};

export const getCategoryContentPaginated = async (
  category: string,
  page: number = 0,
  contentType: "all" | "movie" | "tv" = "all",
): Promise<PaginatedResult> => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const items: Media[] = [];
  let totalMovies = 0;
  let totalTVShows = 0;

  if (contentType === "all" || contentType === "movie") {
    const { count: moviesCount } = await supabase
      .from("movies_imported")
      .select("*", { count: "exact", head: true })
      .ilike("category", `%${category}%`);

    totalMovies = moviesCount || 0;
  }

  if (contentType === "all" || contentType === "tv") {
    const { count: tvCount } = await supabase
      .from("tv_shows_imported")
      .select("*", { count: "exact", head: true })
      .ilike("category", `%${category}%`);

    totalTVShows = tvCount || 0;
  }

  const totalCount = totalMovies + totalTVShows;

  if (
    contentType === "movie" ||
    (contentType === "all" && from < totalMovies)
  ) {
    const movieFrom = contentType === "movie" ? from : from;
    const movieTo =
      contentType === "movie" ? to : Math.min(to, totalMovies - 1);

    if (movieFrom < totalMovies) {
      const { data: movies, error: moviesError } = await supabase
        .from("movies_imported")
        .select("*")
        .ilike("category", `%${category}%`)
        .order("vote_average", { ascending: false })
        .order("tmdb_id", { ascending: true })
        .range(movieFrom, movieTo);

      if (moviesError) throw moviesError;

      const movieItems: Media[] =
        movies?.map((movie) => ({
          id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          overview: movie.overview,
          release_date: movie.release_date,
          vote_average: Number(movie.vote_average) || 0,
          vote_count: 0,
          genre_ids: [],
        })) || [];

      items.push(...movieItems);
    }
  }

  if (
    contentType === "tv" ||
    (contentType === "all" && from + items.length <= to)
  ) {
    const remainingSlots = PAGE_SIZE - items.length;
    if (remainingSlots > 0) {
      const tvFrom =
        contentType === "tv" ? from : Math.max(0, from - totalMovies);
      const tvTo = tvFrom + remainingSlots - 1;

      if (tvFrom < totalTVShows) {
        const { data: tvShows, error: tvError } = await supabase
          .from("tv_shows_imported")
          .select("*")
          .ilike("category", `%${category}%`)
          .order("vote_average", { ascending: false })
          .order("tmdb_id", { ascending: true })
          .range(tvFrom, tvTo);

        if (tvError) throw tvError;

        const tvItems: Media[] =
          tvShows?.map((show) => ({
            id: show.tmdb_id,
            name: show.name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            first_air_date: show.first_air_date,
            vote_average: Number(show.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          })) || [];

        items.push(...tvItems);
      }
    }
  }

  const hasMore = from + items.length < totalCount;

  return {
    items,
    nextPage: hasMore ? page + 1 : null,
    totalCount,
  };
};

export const getCategoryContentPaginatedForTab = async (
  category: string,
  tabId: string,
  page: number = 0,
): Promise<PaginatedResult> => {
  const standardTabs = ["inicio", "peliculas", "series"];

  if (!tabId || standardTabs.includes(tabId)) {
    const contentType =
      tabId === "peliculas" ? "movie" : tabId === "series" ? "tv" : "all";
    return getCategoryContentPaginated(category, page, contentType);
  }

  const { data: sectionItems, error: sectionError } = await supabase
    .from("section_items")
    .select("*")
    .eq("section_id", tabId)
    .order("position", { ascending: true });

  if (sectionError) throw sectionError;
  if (!sectionItems || sectionItems.length === 0) {
    return { items: [], nextPage: null, totalCount: 0 };
  }

  const movieIds = sectionItems
    .filter((item) => item.item_type === "movie")
    .map((item) => item.item_id);
  const tvIds = sectionItems
    .filter((item) => item.item_type === "tv")
    .map((item) => item.item_id);

  let allItems: Media[] = [];

  if (movieIds.length > 0) {
    const { data: movies } = await supabase
      .from("movies_imported")
      .select("*")
      .in("tmdb_id", movieIds)
      .ilike("category", `%${category}%`);

    if (movies) {
      allItems.push(
        ...movies.map(
          (movie): Media => ({
            id: movie.tmdb_id,
            title: movie.title,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            overview: movie.overview,
            release_date: movie.release_date,
            vote_average: Number(movie.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          }),
        ),
      );
    }
  }

  if (tvIds.length > 0) {
    const { data: tvShows } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .in("tmdb_id", tvIds)
      .ilike("category", `%${category}%`);

    if (tvShows) {
      allItems.push(
        ...tvShows.map(
          (show): Media => ({
            id: show.tmdb_id,
            name: show.name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            first_air_date: show.first_air_date,
            vote_average: Number(show.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          }),
        ),
      );
    }
  }

  allItems = allItems.sort((a, b) => {
    const aItem = sectionItems.find((item) => item.item_id === a.id);
    const bItem = sectionItems.find((item) => item.item_id === b.id);
    return (aItem?.position || 0) - (bItem?.position || 0);
  });

  const totalCount = allItems.length;
  const from = page * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, totalCount);
  const items = allItems.slice(from, to);
  const hasMore = to < totalCount;

  return {
    items,
    nextPage: hasMore ? page + 1 : null,
    totalCount,
  };
};

// Get all TV shows (for popular series section)
export const getAllTVShows = async (): Promise<Media[]> => {
  const { data: tvShows, error } = await supabase
    .from("tv_shows_imported")
    .select("*")
    .order("vote_average", { ascending: false });

  if (error) throw error;

  return (
    tvShows?.map((show) => ({
      id: show.tmdb_id,
      name: show.name,
      poster_path: show.poster_path,
      backdrop_path: show.backdrop_path,
      overview: show.overview,
      first_air_date: show.first_air_date,
      vote_average: Number(show.vote_average) || 0,
      vote_count: 0,
      genre_ids: [],
    })) || []
  );
};

// Get all content by category (for "view all" pages)
export const getAllCategoryContent = async (
  category: string,
  contentType: "all" | "movie" | "tv" = "all",
): Promise<Media[]> => {
  const results: Media[] = [];

  // Fetch movies only if contentType is 'all' or 'movie'
  if (contentType === "all" || contentType === "movie") {
    const { data: movies, error: moviesError } = await supabase
      .from("movies_imported")
      .select("*")
      .ilike("category", `%${category}%`);

    if (moviesError) throw moviesError;

    const movieResults: Media[] =
      movies?.map((movie) => ({
        id: movie.tmdb_id,
        title: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: Number(movie.vote_average) || 0,
        vote_count: 0,
        genre_ids: [],
      })) || [];

    results.push(...movieResults);
  }

  // Fetch TV shows only if contentType is 'all' or 'tv'
  if (contentType === "all" || contentType === "tv") {
    const { data: tvShows, error: tvError } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .ilike("category", `%${category}%`);

    if (tvError) throw tvError;

    const tvResults: Media[] =
      tvShows?.map((show) => ({
        id: show.tmdb_id,
        name: show.name,
        poster_path: show.poster_path,
        backdrop_path: show.backdrop_path,
        overview: show.overview,
        first_air_date: show.first_air_date,
        vote_average: Number(show.vote_average) || 0,
        vote_count: 0,
        genre_ids: [],
      })) || [];

    results.push(...tvResults);
  }

  return results;
};

// Get custom section content
const getCustomSectionContent = async (sectionId: string): Promise<Media[]> => {
  const { data: items, error } = await supabase
    .from("section_items")
    .select("*")
    .eq("section_id", sectionId)
    .order("position", { ascending: true });

  if (error) throw error;
  if (!items || items.length === 0) return [];

  // Separate movie and TV show IDs
  const movieIds = items
    .filter((item) => item.item_type === "movie")
    .map((item) => item.item_id);
  const tvIds = items
    .filter((item) => item.item_type === "tv")
    .map((item) => item.item_id);

  const results: Media[] = [];

  // Fetch movies
  if (movieIds.length > 0) {
    const { data: movies } = await supabase
      .from("movies_imported")
      .select("*")
      .in("tmdb_id", movieIds);

    if (movies) {
      results.push(
        ...movies.map(
          (movie): Media => ({
            id: movie.tmdb_id,
            title: movie.title,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            overview: movie.overview,
            release_date: movie.release_date,
            vote_average: Number(movie.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          }),
        ),
      );
    }
  }

  // Fetch TV shows
  if (tvIds.length > 0) {
    const { data: tvShows } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .in("tmdb_id", tvIds);

    if (tvShows) {
      results.push(
        ...tvShows.map(
          (show): Media => ({
            id: show.tmdb_id,
            name: show.name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            first_air_date: show.first_air_date,
            vote_average: Number(show.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          }),
        ),
      );
    }
  }

  // Sort by position in section_items
  const sortedResults = results.sort((a, b) => {
    const aItem = items.find((item) => item.item_id === a.id);
    const bItem = items.find((item) => item.item_id === b.id);
    return (aItem?.position || 0) - (bItem?.position || 0);
  });

  return sortedResults;
};

// Create section
export const createSection = async (
  section: Omit<Section, "id" | "created_at" | "updated_at">,
): Promise<Section> => {
  const { data, error } = await supabase
    .from("sections")
    .insert(section)
    .select()
    .single();

  if (error) throw error;
  return data as Section;
};

// Update section
export const updateSection = async (
  id: string,
  updates: Partial<Section>,
): Promise<Section> => {
  const { data, error } = await supabase
    .from("sections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Section;
};

// Delete section
export const deleteSection = async (id: string): Promise<void> => {
  const { error } = await supabase.from("sections").delete().eq("id", id);

  if (error) throw error;
};

// Add item to custom section
export const addItemToSection = async (
  sectionId: string,
  itemId: number,
  itemType: "movie" | "tv",
  position: number,
): Promise<SectionItem> => {
  const { data, error } = await supabase
    .from("section_items")
    .insert({
      section_id: sectionId,
      item_id: itemId,
      item_type: itemType,
      position,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SectionItem;
};

// Remove item from section
export const removeItemFromSection = async (id: string): Promise<void> => {
  const { error } = await supabase.from("section_items").delete().eq("id", id);

  if (error) throw error;
};

// Get section items
export const getSectionItems = async (
  sectionId: string,
): Promise<SectionItem[]> => {
  const { data, error } = await supabase
    .from("section_items")
    .select("*")
    .eq("section_id", sectionId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []) as SectionItem[];
};

export const getTabSections = async (): Promise<Section[]> => {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("visible", true)
    .eq("placement", "tab")
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []) as Section[];
};

export const getInternalSections = async (
  tabNameOrId: string,
): Promise<Section[]> => {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("visible", true)
    .eq("placement", "internal")
    .order("position", { ascending: true });

  if (error) throw error;

  const sections = (data || []) as Section[];

  return sections.filter((section) => {
    const visibleInTabs = section.visible_in_tabs || [];
    if (visibleInTabs.length > 0) {
      return visibleInTabs.includes(tabNameOrId);
    }
    return section.internal_tab === tabNameOrId;
  });
};

export const getContentTypeForTab = (tabId: string): "all" | "movie" | "tv" => {
  if (tabId === "peliculas") return "movie";
  if (tabId === "series") return "tv";
  return "all";
};

const isCustomTab = (tabId: string): boolean => {
  const standardTabs = ["inicio", "peliculas", "series"];
  return !standardTabs.includes(tabId);
};

const getCategoryContentFromCustomTab = async (
  tabId: string,
  category: string,
  contentType: "all" | "movie" | "tv" = "all",
): Promise<Media[]> => {
  const { data: items, error } = await supabase
    .from("section_items")
    .select("*")
    .eq("section_id", tabId)
    .order("position", { ascending: true });

  if (error) throw error;
  if (!items || items.length === 0) return [];

  const movieIds = items
    .filter((item) => item.item_type === "movie")
    .map((item) => item.item_id);
  const tvIds = items
    .filter((item) => item.item_type === "tv")
    .map((item) => item.item_id);

  const results: Media[] = [];

  if (
    (contentType === "all" || contentType === "movie") &&
    movieIds.length > 0
  ) {
    const { data: movies } = await supabase
      .from("movies_imported")
      .select("*")
      .in("tmdb_id", movieIds)
      .ilike("category", `%${category}%`);

    if (movies) {
      results.push(
        ...movies.map(
          (movie): Media => ({
            id: movie.tmdb_id,
            title: movie.title,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            overview: movie.overview,
            release_date: movie.release_date,
            vote_average: Number(movie.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          }),
        ),
      );
    }
  }

  if ((contentType === "all" || contentType === "tv") && tvIds.length > 0) {
    const { data: tvShows } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .in("tmdb_id", tvIds)
      .ilike("category", `%${category}%`);

    if (tvShows) {
      results.push(
        ...tvShows.map(
          (show): Media => ({
            id: show.tmdb_id,
            name: show.name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            first_air_date: show.first_air_date,
            vote_average: Number(show.vote_average) || 0,
            vote_count: 0,
            genre_ids: [],
          }),
        ),
      );
    }
  }

  const sortedResults = results.sort((a, b) => {
    const aItem = items.find((item) => item.item_id === a.id);
    const bItem = items.find((item) => item.item_id === b.id);
    return (aItem?.position || 0) - (bItem?.position || 0);
  });

  return sortedResults;
};

export const getSectionContentForTab = async (
  section: Section,
  tabId: string,
): Promise<Media[]> => {
  if (section.type === "custom" || section.type === "backdrop_carousel") {
    return getCustomSectionContent(section.id);
  } else {
    if (isCustomTab(tabId)) {
      return getCategoryContentFromCustomTab(
        tabId,
        section.category || "",
        section.content_type || "all",
      );
    }
    const contentType = getContentTypeForTab(tabId);
    return getCategoryContent(section.category || "", contentType);
  }
};

export const getItemTabs = async (
  itemId: number,
  itemType: "movie" | "tv",
): Promise<string[]> => {
  const { data, error } = await supabase
    .from("section_items")
    .select("section_id")
    .eq("item_id", itemId)
    .eq("item_type", itemType);

  if (error) throw error;

  const tabSections = await getTabSections();
  const tabIds = tabSections.map((s) => s.id);

  return (data || [])
    .map((item) => item.section_id)
    .filter((sectionId) => tabIds.includes(sectionId));
};

export const setItemTabs = async (
  itemId: number,
  itemType: "movie" | "tv",
  tabIds: string[],
): Promise<void> => {
  const currentTabs = await getItemTabs(itemId, itemType);

  const tabsToAdd = tabIds.filter((id) => !currentTabs.includes(id));
  const tabsToRemove = currentTabs.filter((id) => !tabIds.includes(id));

  for (const tabId of tabsToRemove) {
    await supabase
      .from("section_items")
      .delete()
      .eq("section_id", tabId)
      .eq("item_id", itemId)
      .eq("item_type", itemType);
  }

  for (const tabId of tabsToAdd) {
    await addItemToSection(tabId, itemId, itemType, 0);
  }
};

export type Top10Item = Media & {
  ranking: number;
};

const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const getTop10Content = async (
  tabId: string,
  sectionId?: string,
): Promise<Top10Item[]> => {
  if (isCustomTab(tabId)) {
    return getTop10FromCustomTab(tabId);
  }

  if (tabId === "peliculas") {
    return getTop10Movies();
  }

  if (tabId === "series") {
    return getTop10TVShows();
  }

  return getTop10Mixed();
};

const getTop10Movies = async (): Promise<Top10Item[]> => {
  const { getPopularMovies } = await import("./tmdb");

  const popularMovies = await getPopularMovies();
  const tmdbIds = popularMovies.map((m) => m.id);

  const { data: localMovies } = await supabase
    .from("movies_imported")
    .select("tmdb_id")
    .in("tmdb_id", tmdbIds);

  if (!localMovies || localMovies.length === 0) return [];

  const localIds = new Set(localMovies.map((m) => m.tmdb_id));
  const filteredMovies = popularMovies.filter((m) => localIds.has(m.id));

  return filteredMovies.slice(0, 10).map(
    (movie, index): Top10Item => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      overview: movie.overview,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      genre_ids: movie.genre_ids,
      ranking: index + 1,
    }),
  );
};

const getTop10TVShows = async (): Promise<Top10Item[]> => {
  const { getPopularTVShows } = await import("./tmdb");

  const popularShows = await getPopularTVShows();
  const tmdbIds = popularShows.map((s) => s.id);

  const { data: localShows } = await supabase
    .from("tv_shows_imported")
    .select("tmdb_id")
    .in("tmdb_id", tmdbIds);

  if (!localShows || localShows.length === 0) return [];

  const localIds = new Set(localShows.map((s) => s.tmdb_id));
  const filteredShows = popularShows.filter((s) => localIds.has(s.id));

  return filteredShows.slice(0, 10).map(
    (show, index): Top10Item => ({
      id: show.id,
      name: show.name,
      poster_path: show.poster_path,
      backdrop_path: show.backdrop_path,
      overview: show.overview,
      first_air_date: show.first_air_date,
      vote_average: show.vote_average,
      vote_count: show.vote_count,
      genre_ids: show.genre_ids,
      ranking: index + 1,
    }),
  );
};

const getTop10Mixed = async (): Promise<Top10Item[]> => {
  const { getPopularMovies, getPopularTVShows } = await import("./tmdb");

  const [popularMovies, popularShows] = await Promise.all([
    getPopularMovies(),
    getPopularTVShows(),
  ]);

  const movieIds = popularMovies.map((m) => m.id);
  const showIds = popularShows.map((s) => s.id);

  const [{ data: localMovies }, { data: localShows }] = await Promise.all([
    supabase.from("movies_imported").select("tmdb_id").in("tmdb_id", movieIds),
    supabase.from("tv_shows_imported").select("tmdb_id").in("tmdb_id", showIds),
  ]);

  const localMovieIds = new Set((localMovies || []).map((m) => m.tmdb_id));
  const localShowIds = new Set((localShows || []).map((s) => s.tmdb_id));

  const filteredMovies = popularMovies
    .filter((m) => localMovieIds.has(m.id))
    .slice(0, 5);
  const filteredShows = popularShows
    .filter((s) => localShowIds.has(s.id))
    .slice(0, 5);

  const combined: Media[] = [
    ...filteredMovies.map(
      (movie): Media => ({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        genre_ids: movie.genre_ids,
      }),
    ),
    ...filteredShows.map(
      (show): Media => ({
        id: show.id,
        name: show.name,
        poster_path: show.poster_path,
        backdrop_path: show.backdrop_path,
        overview: show.overview,
        first_air_date: show.first_air_date,
        vote_average: show.vote_average,
        vote_count: show.vote_count,
        genre_ids: show.genre_ids,
      }),
    ),
  ];

  const shuffled = shuffleArray(combined);

  return shuffled.slice(0, 10).map(
    (item, index): Top10Item => ({
      ...item,
      ranking: index + 1,
    }),
  );
};

const getTop10FromCustomTab = async (
  tabId: string,
): Promise<Top10Item[]> => {
  const content = await getCustomSectionContent(tabId);

  if (!content || content.length === 0) return [];

  const shuffled = shuffleArray(content);

  return shuffled.slice(0, 10).map(
    (item, index): Top10Item => ({
      ...item,
      ranking: index + 1,
    }),
  );
};

const getTop10FromCustomSection = async (
  sectionId: string,
): Promise<Top10Item[]> => {
  const content = await getCustomSectionContent(sectionId);

  if (!content || content.length === 0) return [];

  const shuffled = shuffleArray(content);

  return shuffled.slice(0, 10).map(
    (item, index): Top10Item => ({
      ...item,
      ranking: index + 1,
    }),
  );
};
