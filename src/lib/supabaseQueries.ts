import { supabase } from "@/integrations/supabase/client"
import type { Movie, TVShow } from "./tmdb"

// --- FUNCIONES EXISTENTES (SIN CAMBIOS) ---

export const getImportedMovies = async (): Promise<Movie[]> => {
  const { data, error } = await supabase.from("movies_imported").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (
    data?.map((movie) => ({
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
  )
}

export const getImportedTVShows = async (): Promise<TVShow[]> => {
  const { data, error } = await supabase.from("tv_shows_imported").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (
    data?.map((show) => ({
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
  )
}

export const getRelatedMovies = async (excludeId: number, limit = 6): Promise<Movie[]> => {
  const { data, error } = await supabase
    .from("movies_imported")
    .select("*")
    .neq("tmdb_id", excludeId)
    .limit(100)
  if (error) throw error
  const shuffled = data?.sort(() => 0.5 - Math.random()).slice(0, limit) || []
  return shuffled.map((movie) => ({
    id: movie.tmdb_id,
    title: movie.title,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    overview: movie.overview,
    release_date: movie.release_date,
    vote_average: Number(movie.vote_average) || 0,
    vote_count: 0,
    genre_ids: [],
  }))
}

export const getRelatedTVShows = async (excludeId: number, limit = 6): Promise<TVShow[]> => {
  const { data, error } = await supabase
    .from("tv_shows_imported")
    .select("*")
    .neq("tmdb_id", excludeId)
    .limit(100)
  if (error) throw error
  const shuffled = data?.sort(() => 0.5 - Math.random()).slice(0, limit) || []
  return shuffled.map((show) => ({
    id: show.tmdb_id,
    name: show.name,
    poster_path: show.poster_path,
    backdrop_path: show.backdrop_path,
    overview: show.overview,
    first_air_date: show.first_air_date,
    vote_average: Number(show.vote_average) || 0,
    vote_count: 0,
    genre_ids: [],
  }))
}

// --- NUEVAS FUNCIONES DE BÚSQUEDA HÍBRIDA ---

// Helper para obtener la API KEY (ajústalo según cómo manejes tus env vars)
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "TU_API_KEY_MANUAL_AQUI";

export const searchImportedMovies = async (query: string): Promise<Movie[]> => {
  if (!query.trim()) return []

  try {
    // 1. Buscamos en TMDB primero (entiende inglés, español, errores tipográficos)
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
    );
    const tmdbData = await tmdbRes.json();

    if (!tmdbData.results || tmdbData.results.length === 0) return [];

    // 2. Extraemos solo los IDs de los resultados de TMDB
    const tmdbIds = tmdbData.results.map((m: any) => m.id);

    // 3. Consultamos SUPABASE: "Dame solo las películas que coincidan con estos IDs"
    // Esto filtra automáticamente: si no está en tu DB, no sale.
    const { data, error } = await supabase
      .from("movies_imported")
      .select("*")
      .in("tmdb_id", tmdbIds) // <--- El filtro clave
      .order("vote_average", { ascending: false });

    if (error) throw error

    return (
      data?.map((movie) => ({
        id: movie.tmdb_id,
        title: movie.title, // Aquí viene el título en español desde tu DB
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: Number(movie.vote_average) || 0,
        vote_count: 0,
        genre_ids: [],
      })) || []
    )
  } catch (err) {
    console.error("Error en búsqueda híbrida:", err);
    return [];
  }
}

export const searchImportedTVShows = async (query: string): Promise<TVShow[]> => {
  if (!query.trim()) return []

  try {
    // 1. Buscamos Series en TMDB
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
    );
    const tmdbData = await tmdbRes.json();

    if (!tmdbData.results || tmdbData.results.length === 0) return [];

    // 2. Extraemos IDs
    const tmdbIds = tmdbData.results.map((s: any) => s.id);

    // 3. Filtramos contra Supabase
    const { data, error } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .in("tmdb_id", tmdbIds) // <--- El filtro clave
      .order("vote_average", { ascending: false });

    if (error) throw error

    return (
      data?.map((show) => ({
        id: show.tmdb_id,
        name: show.name, // Nombre en español desde tu DB
        poster_path: show.poster_path,
        backdrop_path: show.backdrop_path,
        overview: show.overview,
        first_air_date: show.first_air_date,
        vote_average: Number(show.vote_average) || 0,
        vote_count: 0,
        genre_ids: [],
      })) || []
    )
  } catch (err) {
    console.error("Error en búsqueda híbrida:", err);
    return [];
  }
}