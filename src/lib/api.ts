const API_BASE = "/api";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  release_date: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  video_url?: string;
  category?: string;
}

export interface TVShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  first_air_date: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  number_of_seasons?: number;
  category?: string;
}

export interface Section {
  id: string;
  name: string;
  type: "category" | "custom";
  category: string | null;
  position: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionItem {
  id: string;
  sectionId: string;
  itemId: number;
  itemType: "movie" | "tv";
  position: number;
}

export interface Platform {
  id: string;
  name: string;
  logoUrl: string | null;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  movies: {
    getAll: () => fetchApi<Movie[]>("/movies"),
    getById: (tmdbId: number) => fetchApi<Movie>(`/movies/${tmdbId}`),
    create: (movie: any) => fetchApi("/movies", { method: "POST", body: JSON.stringify(movie) }),
    delete: (id: number) => fetchApi(`/movies/${id}`, { method: "DELETE" }),
    getPlatforms: (movieId: number) => fetchApi<string[]>(`/movies/${movieId}/platforms`),
    updatePlatforms: (movieId: number, platformIds: string[]) =>
      fetchApi(`/movies/${movieId}/platforms`, { method: "POST", body: JSON.stringify({ platformIds }) }),
  },
  tvShows: {
    getAll: () => fetchApi<TVShow[]>("/tv-shows"),
    getById: (tmdbId: number) => fetchApi<TVShow>(`/tv-shows/${tmdbId}`),
    create: (tvShow: any) => fetchApi("/tv-shows", { method: "POST", body: JSON.stringify(tvShow) }),
    delete: (id: number) => fetchApi(`/tv-shows/${id}`, { method: "DELETE" }),
    getSeasons: (tmdbId: number) => fetchApi(`/tv-shows/${tmdbId}/seasons`),
    getPlatforms: (tvShowId: number) => fetchApi<string[]>(`/tv-shows/${tvShowId}/platforms`),
    updatePlatforms: (tvShowId: number, platformIds: string[]) =>
      fetchApi(`/tv-shows/${tvShowId}/platforms`, { method: "POST", body: JSON.stringify({ platformIds }) }),
  },
  episodes: {
    getBySeason: (seasonId: string) => fetchApi(`/seasons/${seasonId}/episodes`),
  },
  sections: {
    getVisible: () => fetchApi<Section[]>("/sections?visible=true"),
    getAll: () => fetchApi<Section[]>("/sections"),
    create: (section: any) => fetchApi<Section>("/sections", { method: "POST", body: JSON.stringify(section) }),
    update: (id: string, data: any) => fetchApi<Section>(`/sections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/sections/${id}`, { method: "DELETE" }),
    getItems: (sectionId: string) => fetchApi<SectionItem[]>(`/sections/${sectionId}/items`),
    addItem: (sectionId: string, item: any) => fetchApi(`/sections/${sectionId}/items`, { method: "POST", body: JSON.stringify(item) }),
    removeItem: (itemId: string) => fetchApi(`/section-items/${itemId}`, { method: "DELETE" }),
  },
  platforms: {
    getActive: () => fetchApi<Platform[]>("/platforms?active=true"),
    getAll: () => fetchApi<Platform[]>("/platforms"),
    create: (platform: any) => fetchApi<Platform>("/platforms", { method: "POST", body: JSON.stringify(platform) }),
    update: (id: string, data: any) => fetchApi<Platform>(`/platforms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/platforms/${id}`, { method: "DELETE" }),
    getContent: (platformId: string) => fetchApi<{ movies: Movie[]; tvShows: TVShow[] }>(`/platforms/${platformId}/content`),
  },
  search: (query: string) => fetchApi<{ movies: Movie[]; tvShows: TVShow[] }>(`/search?q=${encodeURIComponent(query)}`),
  category: (category: string, type?: string) =>
    fetchApi<{ movies: Movie[]; tvShows: TVShow[] }>(`/category/${encodeURIComponent(category)}${type ? `?type=${type}` : ""}`),
};
