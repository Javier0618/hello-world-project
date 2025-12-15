"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react"
import { cn } from "@/lib/utils"

const CACHE_NAME = "streamfusion-images-v3"
const THUMBNAIL_SIZE = "w92"

const globalImageCache = new Map<string, string>()

// Pending requests deduplication
const pendingRequests = new Map<string, Promise<string | null>>()

// Dominant color cache (simulated blurhash)
const colorCache = new Map<string, string>()

const fullyLoadedPaths = new Set<string>()

// Generate a placeholder color based on the image path (deterministic)
const getPlaceholderColor = (path: string): string => {
  if (colorCache.has(path)) return colorCache.get(path)!

  let hash = 0
  for (let i = 0; i < path.length; i++) {
    hash = path.charCodeAt(i) + ((hash << 5) - hash)
  }

  const h = Math.abs(hash % 360)
  const s = 15 + (Math.abs(hash >> 8) % 20)
  const l = 15 + (Math.abs(hash >> 16) % 15)

  const color = `hsl(${h}, ${s}%, ${l}%)`
  colorCache.set(path, color)
  return color
}

// Get optimal TMDB image size based on container width
const getOptimalSize = (width: number): string => {
  if (width <= 92) return "w92"
  if (width <= 154) return "w154"
  if (width <= 185) return "w185"
  if (width <= 342) return "w342"
  if (width <= 500) return "w500"
  return "w780"
}

// Build TMDB URL with optimal size
const buildTmdbUrl = (path: string, size: string): string => {
  return `https://image.tmdb.org/t/p/${size}${path}`
}

const getCachedBlob = (url: string): string | null => {
  return globalImageCache.get(url) || null
}

const fetchAndCacheImage = async (url: string): Promise<string | null> => {
  // Check global cache first
  const cached = getCachedBlob(url)
  if (cached) {
    return cached
  }

  // Check if already fetching
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)!
  }

  const fetchPromise = (async () => {
    try {
      // Try Cache API first (persistent across page reloads)
      if ("caches" in window) {
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(url)
        if (cachedResponse) {
          const blob = await cachedResponse.blob()
          const blobUrl = URL.createObjectURL(blob)
          globalImageCache.set(url, blobUrl)
          return blobUrl
        }
      }

      // Fetch from network
      const response = await fetch(url, { mode: "cors" })
      if (!response.ok) return null

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Store in Cache API for persistence across reloads
      if ("caches" in window) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(url, new Response(blob.slice()))
      }

      // Store in global memory cache
      globalImageCache.set(url, blobUrl)
      return blobUrl
    } catch {
      return null
    } finally {
      pendingRequests.delete(url)
    }
  })()

  pendingRequests.set(url, fetchPromise)
  return fetchPromise
}

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  containerClassName?: string
  width?: number
  height?: number
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
  aspectRatio?: "poster" | "backdrop" | "square" | "auto"
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  containerClassName,
  width,
  height,
  priority = false,
  onLoad,
  onError,
  fallback,
  aspectRatio = "auto",
}: OptimizedImageProps) {
  // Extract path from full URL or use as-is
  const imagePath = useMemo(() => {
    if (!src) return null
    const match = src.match(/\/t\/p\/[^/]+(\/.+)$/)
    return match ? match[1] : src.startsWith("/") ? src : null
  }, [src])

  const optimalSize = useMemo(() => {
    if (width) return getOptimalSize(width)
    return "w342" // Default for posters
  }, [width])

  const cachedUrls = useMemo(() => {
    if (!imagePath) return { thumb: null, final: null, isFullyLoaded: false }

    const thumbUrl = buildTmdbUrl(imagePath, THUMBNAIL_SIZE)
    const finalUrl = buildTmdbUrl(imagePath, optimalSize)

    return {
      thumb: getCachedBlob(thumbUrl),
      final: getCachedBlob(finalUrl),
      isFullyLoaded: fullyLoadedPaths.has(imagePath),
      thumbUrl,
      finalUrl,
    }
  }, [imagePath, optimalSize])

  const [loadState, setLoadState] = useState<"placeholder" | "thumbnail" | "loaded" | "error">(() => {
    if (cachedUrls.final) return "loaded"
    if (cachedUrls.thumb) return "thumbnail"
    return "placeholder"
  })

  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(cachedUrls.thumb)
  const [finalSrc, setFinalSrc] = useState<string | null>(cachedUrls.final)

  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const loadingStarted = useRef(cachedUrls.isFullyLoaded)

  const placeholderColor = useMemo(() => {
    return imagePath ? getPlaceholderColor(imagePath) : "hsl(0, 0%, 20%)"
  }, [imagePath])

  const aspectRatioClass = useMemo(() => {
    switch (aspectRatio) {
      case "poster":
        return "aspect-[2/3]"
      case "backdrop":
        return "aspect-video"
      case "square":
        return "aspect-square"
      default:
        return ""
    }
  }, [aspectRatio])

  const startLoading = useCallback(async () => {
    if (!imagePath || loadingStarted.current) return
    loadingStarted.current = true

    const thumbUrl = buildTmdbUrl(imagePath, THUMBNAIL_SIZE)
    const finalUrl = buildTmdbUrl(imagePath, optimalSize)

    // Load thumbnail first for LQIP effect
    const thumbResult = await fetchAndCacheImage(thumbUrl)
    if (mountedRef.current && thumbResult) {
      setThumbnailSrc(thumbResult)
      setLoadState("thumbnail")
    }

    // Then load final image
    const finalResult = await fetchAndCacheImage(finalUrl)
    if (mountedRef.current) {
      if (finalResult) {
        setFinalSrc(finalResult)
        setLoadState("loaded")
        fullyLoadedPaths.add(imagePath)
        onLoad?.()
      } else if (!thumbResult) {
        setLoadState("error")
        onError?.()
      }
    }
  }, [imagePath, optimalSize, onLoad, onError])

  useEffect(() => {
    if (!imagePath) {
      setLoadState("error")
      return
    }

    mountedRef.current = true

    if (cachedUrls.final) {
      setFinalSrc(cachedUrls.final)
      setThumbnailSrc(cachedUrls.thumb)
      setLoadState("loaded")
      loadingStarted.current = true
      return
    }

    if (priority) {
      startLoading()
      return () => {
        mountedRef.current = false
      }
    }

    // Non-priority: use IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          startLoading()
          observer.disconnect()
        }
      },
      {
        rootMargin: "300px",
        threshold: 0,
      },
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      mountedRef.current = false
      observer.disconnect()
    }
  }, [imagePath, priority, startLoading, cachedUrls.final, cachedUrls.thumb])

  // Error state
  if (loadState === "error" || !imagePath) {
    if (fallback) return <>{fallback}</>
    return (
      <div className={cn("flex items-center justify-center bg-muted", aspectRatioClass, containerClassName)}>
        <span className="text-muted-foreground text-xs">Sin imagen</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", aspectRatioClass, containerClassName)}
      style={{ backgroundColor: placeholderColor }}
    >
      {/* Shimmer placeholder - only show if not cached */}
      {loadState === "placeholder" && <div className="absolute inset-0 shimmer-placeholder" />}

      {/* LQIP Thumbnail (blurred) */}
      {thumbnailSrc && loadState !== "loaded" && (
        <img
          src={thumbnailSrc || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className={cn("absolute inset-0 w-full h-full object-cover blur-lg scale-110", className)}
          decoding="sync"
        />
      )}

      {/* Final image */}
      {finalSrc && (
        <img
          src={finalSrc || "/placeholder.svg"}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            cachedUrls.isFullyLoaded ? "" : "transition-opacity duration-300",
            loadState === "loaded" ? "opacity-100" : "opacity-0",
            className,
          )}
          decoding="async"
        />
      )}
    </div>
  )
})

// Utility to prefetch images
export const prefetchImages = async (urls: string[]): Promise<void> => {
  const batchSize = 6
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    await Promise.allSettled(batch.map((url) => fetchAndCacheImage(url)))
  }
}

// Utility to prefetch thumbnails for a list of poster paths
export const prefetchThumbnails = async (posterPaths: string[]): Promise<void> => {
  const urls = posterPaths.filter(Boolean).map((path) => buildTmdbUrl(path, THUMBNAIL_SIZE))
  await prefetchImages(urls)
}

export const getImageCacheStats = () => ({
  memoryCache: globalImageCache.size,
  fullyLoaded: fullyLoadedPaths.size,
})

export const clearImageCache = () => {
  globalImageCache.forEach((blobUrl) => URL.revokeObjectURL(blobUrl))
  globalImageCache.clear()
  fullyLoadedPaths.clear()
}

export default OptimizedImage
