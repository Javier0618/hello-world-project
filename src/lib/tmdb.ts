// TMDB API configuration
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export type Media = (Movie | TVShow) & { logo_path?: string | null };

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface MovieDetails extends Movie {
  genres: { id: number; name: string }[];
  runtime: number;
  status: string;
  tagline: string;
  budget: number;
  revenue: number;
  credits: {
    cast: { name: string; profile_path: string | null }[];
    crew: { name: string; job: string }[];
  };
}

export interface TVShowDetails extends TVShow {
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  tagline: string;
  credits: {
    cast: { name: string; profile_path: string | null }[];
    crew: { name: string; job: string }[];
  };
}

export interface Genre {
  id: number;
  name: string;
}

interface Logo {
  iso_639_1: string | null;
  file_path: string;
}

const movieGenresCache: { [lang: string]: Genre[] } = {};
const tvShowGenresCache: { [lang: string]: Genre[] } = {};

export const getMovieGenres = async (language: string = "es-MX"): Promise<Genre[]> => {
  if (movieGenresCache[language]) {
    return movieGenresCache[language];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=${language}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch movie genres");
    }
    const data = await response.json();
    movieGenresCache[language] = data.genres;
    return data.genres;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getTVShowGenres = async (language: string = "es-MX"): Promise<Genre[]> => {
  if (tvShowGenresCache[language]) {
    return tvShowGenresCache[language];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}&language=${language}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch TV show genres");
    }
    const data = await response.json();
    tvShowGenresCache[language] = data.genres;
    return data.genres;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getImageUrl = (path: string, size: string = "w500") => {
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

export const getTrendingMovies = async () => {
  const response = await fetch(
    `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=es-MX`
  );
  const data = await response.json();
  return data.results as Movie[];
};

export const getTrendingTVShows = async () => {
  const response = await fetch(
    `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=es-MX`
  );
  const data = await response.json();
  return data.results as TVShow[];
};

export const getTVSeasonDetails = async (tvId: number, seasonNumber: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=es-MX`
  );
  const data = await response.json();
  return data;
};

export const getLogo = async (type: "movie" | "tv", id: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/${type}/${id}/images?api_key=${TMDB_API_KEY}`
  );
  const data = await response.json();

  if (!data.logos || data.logos.length === 0) {
    return null;
  }

  const findBestLogo = (logos: Logo[], lang: string | null) => {
    const langLogos = lang
      ? logos.filter((logo) => logo.iso_639_1 === lang)
      : logos.filter((logo) => !logo.iso_639_1);

    if (langLogos.length > 0) {
      const svgLogo = langLogos.find((logo) => logo.file_path.endsWith(".svg"));
      if (svgLogo) return getImageUrl(svgLogo.file_path, "original");
      return getImageUrl(langLogos[0].file_path, "original");
    }
    return null;
  };

  // Prioritization: es-MX -> en -> no language -> any
  const esMxLogo = findBestLogo(data.logos, "es-MX");
  if (esMxLogo) return esMxLogo;

  const enLogo = findBestLogo(data.logos, "en");
  if (enLogo) return enLogo;

  const noLangLogo = findBestLogo(data.logos, null);
  if (noLangLogo) return noLangLogo;

  // Fallback to the very first logo if no preferred one is found
  const svgLogo = data.logos.find((logo: Logo) => logo.file_path.endsWith(".svg"));
  if (svgLogo) return getImageUrl(svgLogo.file_path, "original");
  
  return getImageUrl(data.logos[0].file_path, "original");
};

export const getPopularMovies = async () => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-MX`
  );
  const data = await response.json();
  return data.results as Movie[];
};

export const getPopularTVShows = async () => {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-MX`
  );
  const data = await response.json();
  return data.results as TVShow[];
};

export const getMovieDetails = async (id: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits`
  );
  const data = await response.json();
  return data as MovieDetails;
};

export const getTVShowDetails = async (id: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=credits`
  );
  const data = await response.json();
  return data as TVShowDetails;
};

export const searchMovies = async (query: string) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&language=es-MX`
  );
  const data = await response.json();
  return data.results as Movie[];
};

export const searchTVShows = async (query: string) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&language=es-MX`
  );
  const data = await response.json();
  return data.results as TVShow[];
};
