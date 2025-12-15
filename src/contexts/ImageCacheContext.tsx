"use client"

import { createContext, useContext, useCallback, useRef, type ReactNode } from "react"
import { prefetchThumbnails, prefetchImages } from "@/components/OptimizedImage"

interface ImageCacheContextType {
  prefetchImages: (urls: string[]) => void
  prefetchBackdrops: (urls: string[]) => void
  prefetchPriority: (urls: string[]) => void
  clearCache: () => Promise<void>
  isMobile: boolean
  isServiceWorkerReady: boolean
}

const ImageCacheContext = createContext<ImageCacheContextType | null>(null)

const CACHE_NAME = "streamfusion-images-v3"

interface ImageCacheProviderProps {
  children: ReactNode
}

export function ImageCacheProvider({ children }: ImageCacheProviderProps) {
  const prefetchedUrls = useRef<Set<string>>(new Set())

  // Detect mobile
  const isMobile =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

  const handlePrefetchImages = useCallback((urls: string[]) => {
    const newUrls = urls.filter((url) => {
      if (!url || prefetchedUrls.current.has(url)) return false
      prefetchedUrls.current.add(url)
      return true
    })

    if (newUrls.length === 0) return

    // Extract poster paths from full URLs
    const posterPaths = newUrls
      .map((url) => {
        const match = url.match(/\/t\/p\/[^/]+(\/.+)$/)
        return match ? match[1] : null
      })
      .filter((p): p is string => !!p)

    if (posterPaths.length > 0) {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            prefetchThumbnails(posterPaths)
          },
          { timeout: 2000 },
        )
      } else {
        setTimeout(() => {
          prefetchThumbnails(posterPaths)
        }, 100)
      }
    }
  }, [])

  const handlePrefetchBackdrops = useCallback((urls: string[]) => {
    const newUrls = urls.filter((url) => {
      if (!url || prefetchedUrls.current.has(url)) return false
      prefetchedUrls.current.add(url)
      return true
    })

    if (newUrls.length === 0) return

    // Backdrops are lower priority
    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          prefetchImages(newUrls)
        },
        { timeout: 3000 },
      )
    } else {
      setTimeout(() => {
        prefetchImages(newUrls)
      }, 200)
    }
  }, [])

  const handlePrefetchPriority = useCallback((urls: string[]) => {
    const newUrls = urls.filter((url) => {
      if (!url || prefetchedUrls.current.has(url)) return false
      prefetchedUrls.current.add(url)
      return true
    })

    if (newUrls.length === 0) return

    // Priority = immediate
    prefetchImages(newUrls)
  }, [])

  const clearCache = useCallback(async () => {
    if (!("caches" in window)) return

    try {
      await caches.delete(CACHE_NAME)
      prefetchedUrls.current.clear()
    } catch (error) {
      console.warn("Failed to clear image cache:", error)
    }
  }, [])

  return (
    <ImageCacheContext.Provider
      value={{
        prefetchImages: handlePrefetchImages,
        prefetchBackdrops: handlePrefetchBackdrops,
        prefetchPriority: handlePrefetchPriority,
        clearCache,
        isMobile,
        isServiceWorkerReady: true, // Simplified - no SW needed for new approach
      }}
    >
      {children}
    </ImageCacheContext.Provider>
  )
}

export function useImageCacheContext() {
  const context = useContext(ImageCacheContext)
  if (!context) {
    return {
      prefetchImages: () => {},
      prefetchBackdrops: () => {},
      prefetchPriority: () => {},
      clearCache: async () => {},
      isMobile: false,
      isServiceWorkerReady: false,
    }
  }
  return context
}
