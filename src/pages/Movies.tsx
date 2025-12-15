"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { MobileNavbar } from "@/components/MobileNavbar";
import { MediaCarousel } from "@/components/MediaCarousel";
import { Hero } from "@/components/Hero";
import { StreamingPlatforms } from "@/components/StreamingPlatforms";
import { getAllMovies, getInternalSections, getSectionContentForTab, type Section, type Media } from "@/lib/sectionQueries";
import { useImageCacheContext } from "@/contexts/ImageCacheContext";
import { getImageUrl } from "@/lib/tmdb";
import { useScreenSize, shouldShowForScreen } from "@/hooks/useScreenSize";

const getSessionKey = () => {
  if (typeof window !== "undefined") {
    let sessionKey = sessionStorage.getItem("app-session-key");
    if (!sessionKey) {
      sessionKey = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("app-session-key", sessionKey);
    }
    return sessionKey;
  }
  return "default";
};

const seededShuffle = <T,>(array: T[], seed: string): T[] => {
  const result = [...array];
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum += seed.charCodeAt(i);
  }

  for (let i = result.length - 1; i > 0; i--) {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    const j = Math.floor((seedNum / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const Movies = () => {
  const queryClient = useQueryClient();
  const { screenType } = useScreenSize();
  const heroItemsCache = useRef<Record<string, any[]>>({});
  const sessionKey = useMemo(() => getSessionKey(), []);

  const { data: allMovies } = useQuery({
    queryKey: ["all-movies"],
    queryFn: getAllMovies,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: peliculasInternalSections } = useQuery({
    queryKey: ["internal-sections", "peliculas"],
    queryFn: () => getInternalSections("peliculas"),
    staleTime: Infinity,
  });

  const { prefetchImages, isMobile } = useImageCacheContext();

  useEffect(() => {
    if (isMobile && allMovies && allMovies.length > 0) {
      const posterUrls = allMovies
        .filter((movie) => movie.poster_path)
        .map((movie) => getImageUrl(movie.poster_path, "w500"));
      prefetchImages(posterUrls);
    }
  }, [allMovies, prefetchImages, isMobile]);

  const getHeroItems = () => {
    const cacheKey = `peliculas-${sessionKey}`;

    if (heroItemsCache.current[cacheKey]) {
      return heroItemsCache.current[cacheKey];
    }

    const items = seededShuffle(allMovies || [], cacheKey).slice(0, 8);

    if (items.length > 0) {
      heroItemsCache.current[cacheKey] = items;
    }
    return items;
  };

  const heroItems = getHeroItems();

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Navbar />
      </div>
      <MobileNavbar />

      <Hero items={heroItems} isActive={true} />
      <div className="mt-8">
        <StreamingPlatforms />
      </div>
      <div className="container mx-auto px-2 py-1">
        <MediaCarousel
          title="Todas las Películas"
          items={allMovies || []}
          type="movie"
          viewAllLink="/view-all/movies"
        />
        {peliculasInternalSections
          ?.filter((section) =>
            shouldShowForScreen(
              (section as any).screen_visibility,
              screenType
            )
          )
          .map((section) => (
            <DynamicSection key={section.id} section={section} tabId="peliculas" />
          ))}
      </div>
    </div>
  );
};

const DynamicSection = ({ section, tabId }: { section: Section; tabId: string }) => {
  const { data: content, isLoading } = useQuery({
    queryKey: ["section-content", section.id, tabId],
    queryFn: () => getSectionContentForTab(section, tabId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
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
  }

  if (!content || content.length === 0) return null;

  const viewAllLink =
    section.type === "category"
      ? `/view-all/category/${(section as any).category}`
      : undefined;

  return (
    <MediaCarousel
      title={section.name}
      items={content}
      type="mixed"
      viewAllLink={viewAllLink}
    />
  );
};

export default Movies;
