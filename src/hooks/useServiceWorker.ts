import { useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "./use-mobile";

const SW_PATH = "/sw-image-cache.js";

export function useServiceWorker() {
  const isMobile = useIsMobile();
  const swRef = useRef<ServiceWorker | null>(null);
  const isRegistered = useRef(false);

  useEffect(() => {
    if (!isMobile || isRegistered.current) return;
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_PATH, {
          scope: "/",
        });

        if (registration.active) {
          swRef.current = registration.active;
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                swRef.current = newWorker;
              }
            });
          }
        });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        isRegistered.current = true;
      } catch (error) {
        console.warn("Service Worker registration failed:", error);
      }
    };

    registerSW();

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      swRef.current = navigator.serviceWorker.controller;
    });
  }, [isMobile]);

  const prefetchImages = useCallback(
    (urls: string[]) => {
      if (!isMobile || !("serviceWorker" in navigator)) return;

      const validUrls = urls.filter(
        (url) => url && url.includes("image.tmdb.org")
      );
      if (validUrls.length === 0) return;

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "PREFETCH_IMAGES",
          urls: validUrls,
        });
      } else if (swRef.current) {
        swRef.current.postMessage({
          type: "PREFETCH_IMAGES",
          urls: validUrls,
        });
      }
    },
    [isMobile]
  );

  const clearCache = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CLEAR_CACHE",
      });
    }
  }, []);

  return {
    prefetchImages,
    clearCache,
    isMobile,
  };
}
