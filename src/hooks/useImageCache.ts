import { useCallback, useEffect, useRef } from "react";
import { useIsMobile } from "./use-mobile";

const CACHE_NAME = "streamfusion-images-v1";
const SESSION_KEY = "image-cache-session";

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = Date.now().toString();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

const isCacheSupported = (): boolean => {
  return "caches" in window;
};

export interface ImageCacheState {
  cacheImage: (url: string) => Promise<void>;
  getCachedImage: (url: string) => Promise<string | null>;
  prefetchImages: (urls: string[]) => Promise<void>;
  isCached: (url: string) => Promise<boolean>;
  clearCache: () => Promise<void>;
}

export const useImageCache = (): ImageCacheState & { isMobile: boolean } => {
  const isMobile = useIsMobile();
  const cacheRef = useRef<Cache | null>(null);
  const prefetchedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isMobile || !isCacheSupported()) return;

    const initCache = async () => {
      try {
        cacheRef.current = await caches.open(CACHE_NAME);
      } catch (error) {
        console.warn("Failed to open image cache:", error);
      }
    };

    initCache();

    return () => {
      cacheRef.current = null;
    };
  }, [isMobile]);

  const cacheImage = useCallback(async (url: string): Promise<void> => {
    if (!isMobile || !isCacheSupported() || !url) return;

    try {
      const cache = cacheRef.current || await caches.open(CACHE_NAME);
      const existingResponse = await cache.match(url);
      
      if (!existingResponse) {
        const response = await fetch(url, { mode: "cors" });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      }
    } catch (error) {
      console.warn("Failed to cache image:", url, error);
    }
  }, [isMobile]);

  const getCachedImage = useCallback(async (url: string): Promise<string | null> => {
    if (!isMobile || !isCacheSupported() || !url) return null;

    try {
      const cache = cacheRef.current || await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.warn("Failed to get cached image:", url, error);
    }
    
    return null;
  }, [isMobile]);

  const isCached = useCallback(async (url: string): Promise<boolean> => {
    if (!isMobile || !isCacheSupported() || !url) return false;

    try {
      const cache = cacheRef.current || await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      return false;
    }
  }, [isMobile]);

  const prefetchImages = useCallback(async (urls: string[]): Promise<void> => {
    if (!isMobile || !isCacheSupported()) return;

    const uniqueUrls = urls.filter(url => url && !prefetchedUrls.current.has(url));
    
    if (uniqueUrls.length === 0) return;

    uniqueUrls.forEach(url => prefetchedUrls.current.add(url));

    const batchSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(url => cacheImage(url)));
    }
  }, [isMobile, cacheImage]);

  const clearCache = useCallback(async (): Promise<void> => {
    if (!isCacheSupported()) return;

    try {
      await caches.delete(CACHE_NAME);
      prefetchedUrls.current.clear();
      cacheRef.current = null;
    } catch (error) {
      console.warn("Failed to clear image cache:", error);
    }
  }, []);

  return {
    cacheImage,
    getCachedImage,
    prefetchImages,
    isCached,
    clearCache,
    isMobile,
  };
};

export const getImageUrl = (path: string, size: string = "w500"): string => {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};
