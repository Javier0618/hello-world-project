import { useEffect, useState, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  getAllMovies,
  getAllTVShows,
  getTabSections,
  getInternalSections,
  getSectionContent,
} from "@/lib/sectionQueries"

// --- UTILIDADES ---
const getSessionKey = () => {
  if (typeof window !== "undefined") {
    let sessionKey = sessionStorage.getItem("app-session-key")
    if (!sessionKey) {
      sessionKey = Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem("app-session-key", sessionKey)
    }
    return sessionKey
  }
  return "default"
}

const seededShuffle = <T,>(array: T[], seed: string): T[] => {
  const result = [...array]
  let seedNum = 0
  for (let i = 0; i < seed.length; i++) {
    seedNum += seed.charCodeAt(i)
  }
  for (let i = result.length - 1; i > 0; i--) {
    seedNum = (seedNum * 9301 + 49297) % 233280
    const j = Math.floor((seedNum / 233280) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const fetchMediaLogo = async (type: "movie" | "tv", id: number) => {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${apiKey}&include_image_language=es,en,null`
    )
    if (!response.ok) return null
    const data = await response.json()
    const logos = data.logos || []
    
    const spanishLogo = logos.find((logo: any) => logo.iso_639_1 === "es")
    if (spanishLogo) return spanishLogo.file_path
    const englishLogo = logos.find((logo: any) => logo.iso_639_1 === "en")
    if (englishLogo) return englishLogo.file_path
    
    return null
  } catch (e) {
    return null
  }
}

// --- CONFIGURACIÓN ---
interface InitState {
  isInitialized: boolean
  isLoading: boolean
  progress: number
  currentTask: string
}

const LOADING_DURATION_MS = 5000
const UPDATE_INTERVAL_MS = 50

export const useAppInitializer = (): InitState => {
  const queryClient = useQueryClient()
  
  const [state, setState] = useState<InitState>({
    isInitialized: false,
    isLoading: true,
    progress: 0,
    currentTask: "Iniciando...",
  })

  const initRef = useRef(false)
  const isDataReadyRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    // --- ANIMACIÓN ---
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime
      let calculatedProgress = Math.min((elapsedTime / LOADING_DURATION_MS) * 100, 100)
      
      setState(prev => {
        if (prev.progress >= 100) {
          clearInterval(progressInterval)
          return { ...prev, progress: 100, isInitialized: true, isLoading: false, currentTask: "Listo" }
        }
        if (calculatedProgress >= 99 && !isDataReadyRef.current) {
          return { ...prev, progress: 99 }
        }
        if (isDataReadyRef.current && elapsedTime >= LOADING_DURATION_MS) {
           return { ...prev, progress: 100 }
        }
        return { ...prev, progress: calculatedProgress }
      })
    }, UPDATE_INTERVAL_MS)


    // --- CARGA DE DATOS ---
    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, currentTask: "Conectando con servidor..." }))
        
        const movies = await queryClient.fetchQuery({
          queryKey: ["all-movies"],
          queryFn: getAllMovies,
          staleTime: Infinity,
          gcTime: Infinity,
        })

        const tvShows = await queryClient.fetchQuery({
          queryKey: ["all-series"],
          queryFn: getAllTVShows,
          staleTime: Infinity,
          gcTime: Infinity,
        })

        const tabSections = await queryClient.fetchQuery({
          queryKey: ["tab-sections"],
          queryFn: getTabSections,
          staleTime: Infinity,
          gcTime: Infinity,
        })

        await queryClient.fetchQuery({
          queryKey: ["internal-sections", "inicio"],
          queryFn: () => getInternalSections("inicio"),
          staleTime: Infinity,
          gcTime: Infinity,
        })
        
        // --- PRECARGA DE LOGOS DEL HERO ---
        setState(prev => ({ ...prev, currentTask: "Precargando imágenes..." }))
        
        const sessionKey = getSessionKey()
        const allMedia = [...(movies || []), ...(tvShows || [])]
        
        // 1. Grupos Estándar
        const heroGroups = [
          { id: "inicio", items: seededShuffle(allMedia, `inicio-${sessionKey}`).slice(0, 5) },
          { id: "peliculas", items: seededShuffle(movies || [], `peliculas-${sessionKey}`).slice(0, 5) },
          { id: "series", items: seededShuffle(tvShows || [], `series-${sessionKey}`).slice(0, 5) }
        ]

        // 2. Grupos Personalizados (NUEVO)
        if (tabSections && tabSections.length > 0) {
          for (const section of tabSections) {
            // Obtenemos el contenido de esta sección específica
            const sectionContent = await queryClient.fetchQuery({
              queryKey: ["section-content", section.id],
              queryFn: () => getSectionContent(section),
              staleTime: Infinity,
              gcTime: Infinity,
            });

            if (sectionContent && sectionContent.length > 0) {
              // Añadimos al grupo de precarga usando la misma semilla que usará el Home
              heroGroups.push({
                id: section.id,
                items: seededShuffle(sectionContent, `${section.id}-${sessionKey}`).slice(0, 5)
              });
            }
          }
        }

        // 3. Descarga Paralela de Logos
        const logoPromises = []
        for (const group of heroGroups) {
          for (const item of group.items) {
            const isMovie = "title" in item
            const type = isMovie ? "movie" : "tv"
            
            logoPromises.push(
              queryClient.prefetchQuery({
                queryKey: ["media-logo", type, item.id],
                queryFn: () => fetchMediaLogo(type, item.id),
                staleTime: Infinity,
              })
            )
          }
        }
        
        await Promise.all(logoPromises)

        // --- FINALIZADO ---
        isDataReadyRef.current = true;
        setState(prev => ({ ...prev, currentTask: "Finalizando..." }))

      } catch (error) {
        console.error("Error cargando datos:", error)
        isDataReadyRef.current = true;
        setState(prev => ({ ...prev, currentTask: "Finalizando..." }))
      }
    }

    loadData()

    return () => clearInterval(progressInterval)
  }, [queryClient])

  return state
}