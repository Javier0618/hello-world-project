import { useState, useEffect, useCallback, memo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const CACHE_NAME = "streamfusion-images-v2";

const memoryCache = new Map<string, { url: string; refCount: number }>();
const pendingRequests = new Map<string, Promise<string | null>>();
const MAX_MEMORY_CACHE = 80;

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  loading?: "lazy" | "eager";
  priority?: boolean;
}

const isCacheSupported = (): boolean => {
  return "caches" in window;
};

const acquireMemoryCacheUrl = (key: string, url: string): string => {
  const existing = memoryCache.get(key);
  if (existing) {
    existing.refCount++;
    return existing.url;
  }
  
  if (memoryCache.size >= MAX_MEMORY_CACHE) {
    const entries = Array.from(memoryCache.entries());
    const toRemove = entries
      .filter(([_, v]) => v.refCount === 0)
      .slice(0, 20);
    
    toRemove.forEach(([k, v]) => {
      if (v.url.startsWith("blob:")) {
        URL.revokeObjectURL(v.url);
      }
      memoryCache.delete(k);
    });
  }
  
  memoryCache.set(key, { url, refCount: 1 });
  return url;
};

const releaseMemoryCacheUrl = (key: string): void => {
  const entry = memoryCache.get(key);
  if (entry) {
    entry.refCount = Math.max(0, entry.refCount - 1);
  }
};

async function getCachedImageUrl(src: string): Promise<string | null> {
  const existing = memoryCache.get(src);
  if (existing) {
    existing.refCount++;
    return existing.url;
  }

  if (pendingRequests.has(src)) {
    return pendingRequests.get(src)!;
  }

  const fetchPromise = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(src);
      
      if (response) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        acquireMemoryCacheUrl(src, objectUrl);
        return objectUrl;
      }
    } catch (error) {
    } finally {
      pendingRequests.delete(src);
    }
    return null;
  })();

  pendingRequests.set(src, fetchPromise);
  return fetchPromise;
}

async function cacheImage(src: string): Promise<void> {
  if (!isCacheSupported() || !src.includes("image.tmdb.org")) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const existingResponse = await cache.match(src);
    
    if (!existingResponse) {
      const response = await fetch(src, { mode: "cors" });
      if (response.ok) {
        await cache.put(src, response.clone());
      }
    }
  } catch (error) {
  }
}

export const CachedImage = memo(function CachedImage({
  src,
  alt,
  className,
  fallback,
  onLoad,
  onError,
  loading = "lazy",
  priority = false,
}: CachedImageProps) {
  const isMobile = useIsMobile();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCachedImage, setIsCachedImage] = useState(false);
  const mountedRef = useRef(true);
  const currentSrcRef = useRef(src);
  const usedCacheKeyRef = useRef<string | null>(null);

  const loadImage = useCallback(async () => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    currentSrcRef.current = src;

    if (!isMobile || !isCacheSupported()) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    const existingEntry = memoryCache.get(src);
    if (existingEntry) {
      existingEntry.refCount++;
      usedCacheKeyRef.current = src;
      if (mountedRef.current && currentSrcRef.current === src) {
        setImageSrc(existingEntry.url);
        setIsCachedImage(true);
        setIsLoading(false);
      }
      return;
    }

    try {
      const cachedUrl = await getCachedImageUrl(src);
      
      if (!mountedRef.current || currentSrcRef.current !== src) {
        if (cachedUrl) {
          releaseMemoryCacheUrl(src);
        }
        return;
      }

      if (cachedUrl) {
        usedCacheKeyRef.current = src;
        setImageSrc(cachedUrl);
        setIsCachedImage(true);
        setIsLoading(false);
        return;
      }

      setImageSrc(src);
      setIsLoading(false);

      cacheImage(src);
    } catch (error) {
      if (mountedRef.current && currentSrcRef.current === src) {
        setImageSrc(src);
        setIsLoading(false);
      }
    }
  }, [src, isMobile]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (usedCacheKeyRef.current && usedCacheKeyRef.current !== src) {
      releaseMemoryCacheUrl(usedCacheKeyRef.current);
      usedCacheKeyRef.current = null;
    }
    
    setIsLoading(true);
    setHasError(false);
    setIsCachedImage(false);
    loadImage();

    return () => {
      mountedRef.current = false;
      if (usedCacheKeyRef.current) {
        releaseMemoryCacheUrl(usedCacheKeyRef.current);
        usedCacheKeyRef.current = null;
      }
    };
  }, [loadImage]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;
    
    if (isCachedImage && imageSrc && imageSrc.startsWith("blob:")) {
      if (usedCacheKeyRef.current) {
        releaseMemoryCacheUrl(usedCacheKeyRef.current);
        usedCacheKeyRef.current = null;
      }
      setImageSrc(src);
      setIsCachedImage(false);
      return;
    }
    
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError, isCachedImage, imageSrc, src]);

  if (hasError || !src) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn("bg-secondary flex items-center justify-center", className)}>
        <span className="text-muted-foreground text-xs">Sin imagen</span>
      </div>
    );
  }

  if (isCachedImage && imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        loading="eager"
        decoding="sync"
        onError={handleError}
      />
    );
  }

  return (
    <>
      {isLoading && (
        <div className={cn("bg-secondary/50 animate-pulse", className)} />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            className,
            isLoading && "opacity-0 absolute",
            !isLoading && "animate-fade-in"
          )}
          loading={priority ? "eager" : loading}
          onLoad={handleLoad}
          onError={handleError}
          decoding="async"
        />
      )}
    </>
  );
});

export function clearMemoryCache(): void {
  memoryCache.forEach((entry) => {
    if (entry.url.startsWith("blob:")) {
      URL.revokeObjectURL(entry.url);
    }
  });
  memoryCache.clear();
}

export default CachedImage;
