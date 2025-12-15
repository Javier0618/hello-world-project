"use client"

import { useEffect, useRef } from "react"
import { prefetchThumbnails, prefetchImages } from "@/components/OptimizedImage"

interface PrefetchOptions {
  priority?: boolean
  delay?: number
}

// Prefetch poster paths (will load thumbnails)
export const useImagePrefetch = (posterPaths: (string | null | undefined)[], options: PrefetchOptions = {}) => {
  const { priority = false, delay = 100 } = options
  const prefetchedRef = useRef(false)
  const pathsRef = useRef<string[]>([])

  useEffect(() => {
    const validPaths = posterPaths.filter((p): p is string => !!p)

    // Check if paths have changed
    const pathsChanged =
      validPaths.length !== pathsRef.current.length || validPaths.some((p, i) => p !== pathsRef.current[i])

    if (!pathsChanged && prefetchedRef.current) return

    pathsRef.current = validPaths
    prefetchedRef.current = true

    if (validPaths.length === 0) return

    const doPrefetch = () => {
      prefetchThumbnails(validPaths)
    }

    if (priority) {
      doPrefetch()
    } else if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(doPrefetch, { timeout: 2000 })
      return () => cancelIdleCallback(id)
    } else {
      const timeoutId = setTimeout(doPrefetch, delay)
      return () => clearTimeout(timeoutId)
    }
  }, [posterPaths, priority, delay])
}

// Prefetch full-size images for immediate viewing
export const useFullImagePrefetch = (urls: string[]) => {
  const prefetchedRef = useRef(false)

  useEffect(() => {
    if (prefetchedRef.current || urls.length === 0) return
    prefetchedRef.current = true

    prefetchImages(urls)
  }, [urls])
}

// Hook to prefetch next page images before they're needed
export const useNextPagePrefetch = (
  items: Array<{ poster_path?: string | null }>,
  currentPage: number,
  itemsPerPage = 20,
) => {
  const prefetchedPages = useRef<Set<number>>(new Set())

  useEffect(() => {
    const pageKey = currentPage
    if (prefetchedPages.current.has(pageKey)) return
    prefetchedPages.current.add(pageKey)

    const startIndex = currentPage * itemsPerPage
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage)

    const posterPaths = pageItems.filter((item) => item.poster_path).map((item) => item.poster_path!)

    if (posterPaths.length > 0) {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            prefetchThumbnails(posterPaths)
          },
          { timeout: 1500 },
        )
      } else {
        prefetchThumbnails(posterPaths)
      }
    }
  }, [items, currentPage, itemsPerPage])
}

// Export for use in components
export default useImagePrefetch
