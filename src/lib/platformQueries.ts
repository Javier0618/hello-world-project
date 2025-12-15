import { supabase } from "@/integrations/supabase/client"

export interface StreamingPlatform {
  id: string
  name: string
  logo_url: string | null
  position: number
  active: boolean
  created_at: string
  updated_at: string
}

const platformsTable = () => (supabase as any).from("streaming_platforms")
const moviePlatformsTable = () => (supabase as any).from("movie_platforms")
const tvShowPlatformsTable = () => (supabase as any).from("tv_show_platforms")

// Get all active platforms
export const getActivePlatforms = async (): Promise<StreamingPlatform[]> => {
  const { data, error } = await platformsTable().select("*").eq("active", true).order("position", { ascending: true })

  if (error) throw error
  return (data || []) as StreamingPlatform[]
}

// Get all platforms (admin)
export const getAllPlatforms = async (): Promise<StreamingPlatform[]> => {
  const { data, error } = await platformsTable().select("*").order("position", { ascending: true })

  if (error) throw error
  return (data || []) as StreamingPlatform[]
}

// Create platform
export const createPlatform = async (
  platform: Omit<StreamingPlatform, "id" | "created_at" | "updated_at">,
): Promise<StreamingPlatform> => {
  const { data, error } = await platformsTable().insert(platform).select().single()

  if (error) throw error
  return data as StreamingPlatform
}

// Update platform
export const updatePlatform = async (id: string, updates: Partial<StreamingPlatform>): Promise<StreamingPlatform> => {
  const { data, error } = await platformsTable()
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as StreamingPlatform
}

// Delete platform
export const deletePlatform = async (id: string): Promise<void> => {
  const { error } = await platformsTable().delete().eq("id", id)

  if (error) throw error
}

// Get platforms for a movie
export const getMoviePlatforms = async (movieId: number): Promise<string[]> => {
  const { data, error } = await moviePlatformsTable().select("platform_id").eq("movie_id", movieId)

  if (error) throw error
  return ((data || []) as any[]).map((item) => item.platform_id)
}

// Get platforms for a TV show
export const getTVShowPlatforms = async (tvShowId: number): Promise<string[]> => {
  const { data, error } = await tvShowPlatformsTable().select("platform_id").eq("tv_show_id", tvShowId)

  if (error) throw error
  return ((data || []) as any[]).map((item) => item.platform_id)
}

// Set platforms for a movie (replaces existing)
export const setMoviePlatforms = async (movieId: number, platformIds: string[]): Promise<void> => {
  // Delete existing
  await moviePlatformsTable().delete().eq("movie_id", movieId)

  // Insert new
  if (platformIds.length > 0) {
    const { error } = await moviePlatformsTable().insert(
      platformIds.map((platformId) => ({
        movie_id: movieId,
        platform_id: platformId,
      })),
    )
    if (error) throw error
  }
}

// Set platforms for a TV show (replaces existing)
export const setTVShowPlatforms = async (tvShowId: number, platformIds: string[]): Promise<void> => {
  // Delete existing
  await tvShowPlatformsTable().delete().eq("tv_show_id", tvShowId)

  // Insert new
  if (platformIds.length > 0) {
    const { error } = await tvShowPlatformsTable().insert(
      platformIds.map((platformId) => ({
        tv_show_id: tvShowId,
        platform_id: platformId,
      })),
    )
    if (error) throw error
  }
}

// Get all content for a specific platform
export const getPlatformContent = async (platformId: string): Promise<{ movies: any[]; tvShows: any[] }> => {
  const movies: any[] = []
  const tvShows: any[] = []

  // Get movies
  const { data: moviePlatforms, error: movieError } = await moviePlatformsTable()
    .select("movie_id")
    .eq("platform_id", platformId)

  if (movieError) throw movieError

  const moviePlatformsData = (moviePlatforms || []) as any[]

  if (moviePlatformsData.length > 0) {
    const movieIds = moviePlatformsData.map((mp) => mp.movie_id)
    const { data: moviesData, error: moviesError } = await supabase
      .from("movies_imported")
      .select("*")
      .in("id", movieIds)

    if (moviesError) throw moviesError

    if (moviesData) {
      movies.push(
        ...moviesData.map((movie) => ({
          id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          overview: movie.overview,
          release_date: movie.release_date,
          vote_average: Number(movie.vote_average) || 0,
          vote_count: 0,
          genre_ids: [],
        })),
      )
    }
  }

  // Get TV shows
  const { data: tvPlatforms, error: tvError } = await tvShowPlatformsTable()
    .select("tv_show_id")
    .eq("platform_id", platformId)

  if (tvError) throw tvError

  const tvPlatformsData = (tvPlatforms || []) as any[]

  if (tvPlatformsData.length > 0) {
    const tvIds = tvPlatformsData.map((tp) => tp.tv_show_id)
    const { data: tvShowsData, error: tvShowsError } = await supabase
      .from("tv_shows_imported")
      .select("*")
      .in("id", tvIds)

    if (tvShowsError) throw tvShowsError

    if (tvShowsData) {
      tvShows.push(
        ...tvShowsData.map((show) => ({
          id: show.tmdb_id,
          name: show.name,
          poster_path: show.poster_path,
          backdrop_path: show.backdrop_path,
          overview: show.overview,
          first_air_date: show.first_air_date,
          vote_average: Number(show.vote_average) || 0,
          vote_count: 0,
          genre_ids: [],
        })),
      )
    }
  }

  return { movies, tvShows }
}
