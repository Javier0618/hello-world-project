import { useState, useRef, useCallback, useEffect, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

type RefreshState = "idle" | "pulling" | "ready" | "refreshing" | "complete";

const PULL_THRESHOLD = 100;
const MAX_PULL_DISTANCE = 120;
const DIRECTION_LOCK_THRESHOLD = 15;

interface UsePullToRefreshOptions {
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
  scrollContainerRef?: RefObject<HTMLElement>;
}

export const usePullToRefresh = (options: UsePullToRefreshOptions = {}) => {
  const { onRefresh, disabled = false, scrollContainerRef } = options;
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<RefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const directionLocked = useRef<"vertical" | "horizontal" | null>(null);
  const rafId = useRef<number | null>(null);
  const isValidStart = useRef(false);
  const initialScrollY = useRef(0);
  
  const isNative = Capacitor.isNativePlatform();

  const getScrollPosition = useCallback((): number => {
    if (scrollContainerRef?.current) {
      return scrollContainerRef.current.scrollTop;
    }
    
    return Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0
    );
  }, [scrollContainerRef]);

  const refreshContent = useCallback(async (): Promise<void> => {
    const queriesToInvalidate = [
      "all-movies",
      "all-series", 
      "tab-sections",
      "internal-sections",
      "section-content",
      "section-by-slug",
    ];

    await Promise.all(
      queriesToInvalidate.map((key) =>
        queryClient.invalidateQueries({ 
          queryKey: [key],
          refetchType: "active"
        })
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 800));
  }, [queryClient]);

  const performRefresh = useCallback(async () => {
    setState("refreshing");
    
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await refreshContent();
      }
      
      setState("complete");
      
      setTimeout(() => {
        setPullDistance(0);
        setState("idle");
      }, 1000);
      
    } catch (error) {
      console.error("Refresh error:", error);
      setPullDistance(0);
      setState("idle");
    }
  }, [onRefresh, refreshContent]);

  const resetState = useCallback(() => {
    directionLocked.current = null;
    isValidStart.current = false;
    initialScrollY.current = 0;
    setPullDistance(0);
    if (state !== "refreshing" && state !== "complete") {
      setState("idle");
    }
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, [state]);

  const shouldExcludeTarget = useCallback((target: HTMLElement): boolean => {
    const selectors = [
      ".embla", ".carousel", "[data-embla]", "[data-carousel]",
      ".embla__container", "[data-mobile-tabs]", "[data-no-ptr]",
      ".overflow-x-auto", ".scrollbar-hide", "[class*='CarouselContent']"
    ];
    return selectors.some(selector => target.closest(selector));
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state === "refreshing" || state === "complete") {
      isValidStart.current = false;
      return;
    }
    
    const target = e.target as HTMLElement;
    
    if (shouldExcludeTarget(target)) {
      isValidStart.current = false;
      return;
    }
    
    const scrollY = getScrollPosition();
    initialScrollY.current = scrollY;
    
    if (scrollY > 10) {
      isValidStart.current = false;
      return;
    }
    
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isValidStart.current = true;
    directionLocked.current = null;
  }, [disabled, state, getScrollPosition, shouldExcludeTarget]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isValidStart.current || disabled) return;
    if (state === "refreshing" || state === "complete") return;

    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const deltaY = touchY - touchStartY.current;
    const deltaX = touchX - touchStartX.current;

    if (directionLocked.current === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > DIRECTION_LOCK_THRESHOLD || absY > DIRECTION_LOCK_THRESHOLD) {
        if (absX > absY * 1.2) {
          directionLocked.current = "horizontal";
          resetState();
          return;
        } else if (absY > absX) {
          directionLocked.current = "vertical";
        }
      } else {
        return;
      }
    }

    if (directionLocked.current === "horizontal") {
      return;
    }

    const currentScrollY = getScrollPosition();
    const isAtTop = currentScrollY <= 10 && initialScrollY.current <= 10;

    if (directionLocked.current === "vertical" && deltaY > 0 && isAtTop) {
      e.preventDefault();
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        const resistance = 0.5;
        const distance = Math.min(deltaY * resistance, MAX_PULL_DISTANCE);
        
        setPullDistance(distance);
        
        if (distance >= PULL_THRESHOLD) {
          setState("ready");
        } else if (distance > 0) {
          setState("pulling");
        }
      });
    } else if (deltaY <= 0 && directionLocked.current === "vertical") {
      resetState();
    }
  }, [disabled, state, getScrollPosition, resetState]);

  const handleTouchEnd = useCallback(() => {
    if (!isValidStart.current) return;
    
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    if (state === "ready" && pullDistance >= PULL_THRESHOLD) {
      performRefresh();
    } else {
      resetState();
    }
    
    isValidStart.current = false;
    directionLocked.current = null;
  }, [state, pullDistance, performRefresh, resetState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (state === "pulling" || state === "ready" || state === "refreshing") {
      container.classList.add("ptr-active");
    } else {
      container.classList.remove("ptr-active");
    }
    
    return () => {
      container.classList.remove("ptr-active");
    };
  }, [state]);

  return {
    containerRef,
    state,
    pullDistance,
    isNative,
    performRefresh,
    resetState,
    PULL_THRESHOLD,
    MAX_PULL_DISTANCE,
  };
};

export default usePullToRefresh;
