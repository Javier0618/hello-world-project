import { useState, useEffect, useRef, ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  forceLoad?: boolean;
}

export const LazySection = ({
  children,
  fallback,
  rootMargin = "200px",
  threshold = 0,
  forceLoad = false,
}: LazySectionProps) => {
  const [isVisible, setIsVisible] = useState(forceLoad);
  const [hasLoaded, setHasLoaded] = useState(forceLoad);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceLoad && !hasLoaded) {
      setIsVisible(true);
      setHasLoaded(true);
    }
  }, [forceLoad, hasLoaded]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, hasLoaded]);

  const defaultFallback = (
    <div className="space-y-4 mb-6">
      <div className="h-6 w-40 bg-muted animate-pulse rounded" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[150px] h-[225px] bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div ref={ref}>
      {isVisible || hasLoaded ? children : fallback || defaultFallback}
    </div>
  );
};
