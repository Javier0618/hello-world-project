"use client";

import { useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HomeIcon, Film, Tv } from "lucide-react";
import { Hero } from "@/components/Hero";
import { MediaCarousel } from "@/components/MediaCarousel";
import { StreamingPlatforms } from "@/components/StreamingPlatforms";
import {
  getSectionContent,
  getSectionContentForTab,
  getAllMovies,
  getAllTVShows,
  getTabSections,
  getInternalSections,
  type Section,
  type Media,
} from "@/lib/sectionQueries";
// SE CORRIGE AQUÍ: Se usan llaves. Si esto falla, revisa src/components/Navbar.tsx
import { Navbar } from "@/components/Navbar";
import { MobileNavbar } from "@/components/MobileNavbar";
import {
  MobileTabNavigation,
  type Tab,
} from "@/components/MobileTabNavigation";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useImageCacheContext } from "@/contexts/ImageCacheContext";
import { getImageUrl } from "@/lib/tmdb";
import { useScreenSize, shouldShowForScreen } from "@/hooks/useScreenSize";
import { BackdropCarousel } from "@/components/BackdropCarousel";
import { CustomHTMLSection } from "@/components/CustomHTMLSection";
import { Top10Carousel } from "@/components/Top10Carousel";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import { LazySection } from "@/components/LazySection";

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

const Home = () => {
  const { activeTab, handleTabChange } = useTabNavigation();
  const queryClient = useQueryClient();
  const { screenType } = useScreenSize();

  const carouselRef = useRef<HTMLDivElement>(null);
  const heroItemsCache = useRef<Record<string, any[]>>({});
  const sessionKey = useMemo(() => getSessionKey(), []);

  const { data: tabSections } = useQuery({
    queryKey: ["tab-sections"],
    queryFn: getTabSections,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: allMovies } = useQuery({
    queryKey: ["all-movies"],
    queryFn: getAllMovies,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: allSeries } = useQuery({
    queryKey: ["all-series"],
    queryFn: getAllTVShows,
    staleTime: Infinity,
    gcTime: Infinity,
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

  useEffect(() => {
    if (isMobile && allSeries && allSeries.length > 0) {
      const posterUrls = allSeries
        .filter((show) => show.poster_path)
        .map((show) => getImageUrl(show.poster_path, "w500"));
      prefetchImages(posterUrls);
    }
  }, [allSeries, prefetchImages, isMobile]);

  useEffect(() => {
    if (tabSections) {
      tabSections.forEach((section) => {
        queryClient.prefetchQuery({
          queryKey: ["section-content", section.id],
          queryFn: () => getSectionContent(section),
          staleTime: Infinity,
        });
      });
    }
  }, [tabSections, queryClient]);

  const { data: inicioInternalSections } = useQuery({
    queryKey: ["internal-sections", "inicio"],
    queryFn: () => getInternalSections("inicio"),
    staleTime: Infinity,
  });

  const { data: peliculasInternalSections } = useQuery({
    queryKey: ["internal-sections", "peliculas"],
    queryFn: () => getInternalSections("peliculas"),
    staleTime: Infinity,
  });

  const { data: seriesInternalSections } = useQuery({
    queryKey: ["internal-sections", "series"],
    queryFn: () => getInternalSections("series"),
    staleTime: Infinity,
  });

  const tabs: Tab[] = useMemo(() => {
    const baseTabs: Tab[] = [
      { id: "inicio", label: "Inicio", icon: <HomeIcon className="w-4 h-4" /> },
      {
        id: "peliculas",
        label: "Películas",
        icon: <Film className="w-4 h-4" />,
      },
      { id: "series", label: "Series", icon: <Tv className="w-4 h-4" /> },
    ];
    const filteredTabSections = (tabSections || []).filter((section) =>
      shouldShowForScreen(
        section.screen_visibility as "all" | "mobile" | "desktop",
        screenType,
      ),
    );
    const customTabs: Tab[] = filteredTabSections.map((section) => ({
      id: section.id,
      label: section.name,
    }));
    return [...baseTabs, ...customTabs];
  }, [tabSections, screenType]);

  const currentTabIndex = useMemo(() => {
    return tabs.findIndex((tab) => tab.id === activeTab);
  }, [tabs, activeTab]);

  const handleSwipeLeft = () => {
    if (currentTabIndex < tabs.length - 1) {
      handleTabChange(tabs[currentTabIndex + 1].id);
    }
  };

  const handleSwipeRight = () => {
    if (currentTabIndex > 0) {
      handleTabChange(tabs[currentTabIndex - 1].id);
    }
  };

  useSwipeNavigation({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    totalTabs: tabs.length,
    currentTabIndex,
    containerRef: carouselRef,
  });

  const getHeroItems = (tabId: string) => {
    const cacheKey = `${tabId}-${sessionKey}`;

    if (heroItemsCache.current[cacheKey]) {
      return heroItemsCache.current[cacheKey];
    }

    let items: any[] = [];

    if (tabId === "peliculas") {
      items = seededShuffle(allMovies || [], cacheKey).slice(0, 8);
    } else if (tabId === "series") {
      items = seededShuffle(allSeries || [], cacheKey).slice(0, 8);
    } else if (tabId === "inicio") {
      const allMedia = [...(allMovies || []), ...(allSeries || [])];
      items = seededShuffle(allMedia, cacheKey).slice(0, 8);
    } else {
      const customContent = queryClient.getQueryData<Media[]>([
        "section-content",
        tabId,
      ]);

      if (customContent && customContent.length > 0) {
        items = seededShuffle(customContent, cacheKey).slice(0, 8);
      } else {
        items = [];
      }
    }

    if (items.length > 0) {
      heroItemsCache.current[cacheKey] = items;
    }
    return items;
  };

  const renderTabContent = (tabId: string, isActive: boolean) => {
    const heroItems = getHeroItems(tabId);

    if (tabId === "inicio") {
      return (
        <>
          <Hero items={heroItems} isActive={isActive} />
          <LazySection forceLoad={isActive}>
            <div className="mt-8">
              <StreamingPlatforms />
            </div>
          </LazySection>
          <div className="container mx-auto px-2 py-1">
            <LazySection forceLoad={isActive}>
              <MediaCarousel
                title="Películas Populares"
                items={allMovies?.slice(0, 20) || []}
                type="movie"
                viewAllLink="/view-all/movies"
              />
            </LazySection>
            <LazySection forceLoad={isActive}>
              <MediaCarousel
                title="Series Populares"
                items={allSeries?.slice(0, 20) || []}
                type="tv"
                viewAllLink="/view-all/series"
              />
            </LazySection>
            {inicioInternalSections
              ?.filter((section) =>
                shouldShowForScreen(
                  (section as any).screen_visibility,
                  screenType,
                ),
              )
              .map((section) => (
                <LazySection key={section.id}>
                  <DynamicSection section={section} tabId="inicio" />
                </LazySection>
              ))}
          </div>
        </>
      );
    }

    if (tabId === "peliculas") {
      return (
        <>
          <Hero items={heroItems} isActive={isActive} />
          <LazySection forceLoad={isActive}>
            <div className="mt-8">
              <StreamingPlatforms />
            </div>
          </LazySection>
          <div className="container mx-auto px-2 py-1">
            <LazySection forceLoad={isActive}>
              <MediaCarousel
                title="Todas las Películas"
                items={allMovies || []}
                type="movie"
                viewAllLink="/view-all/movies"
              />
            </LazySection>
            {peliculasInternalSections
              ?.filter((section) =>
                shouldShowForScreen(
                  (section as any).screen_visibility,
                  screenType,
                ),
              )
              .map((section) => (
                <LazySection key={section.id}>
                  <DynamicSection section={section} tabId="peliculas" />
                </LazySection>
              ))}
          </div>
        </>
      );
    }

    if (tabId === "series") {
      return (
        <>
          <Hero items={heroItems} isActive={isActive} />
          <LazySection forceLoad={isActive}>
            <div className="mt-8">
              <StreamingPlatforms />
            </div>
          </LazySection>
          <div className="container mx-auto px-2 py-1">
            <LazySection forceLoad={isActive}>
              <MediaCarousel
                title="Todas las Series"
                items={allSeries || []}
                type="tv"
                viewAllLink="/view-all/series"
              />
            </LazySection>
            {seriesInternalSections
              ?.filter((section) =>
                shouldShowForScreen(
                  (section as any).screen_visibility,
                  screenType,
                ),
              )
              .map((section) => (
                <LazySection key={section.id}>
                  <DynamicSection section={section} tabId="series" />
                </LazySection>
              ))}
          </div>
        </>
      );
    }

    return (
      <>
        <Hero items={heroItems} isActive={isActive} />
        <LazySection forceLoad={isActive}>
          <div className="mt-8">
            <StreamingPlatforms />
          </div>
        </LazySection>
        <div className="container mx-auto px-2 py-1">
          <LazySection forceLoad={isActive}>
            <CustomTabContent sectionId={tabId} />
          </LazySection>
          <LazySection forceLoad={isActive}>
            <DynamicSectionsForTab tabId={tabId} screenType={screenType} />
          </LazySection>
        </div>
      </>
    );
  };

  return (
    <PullToRefresh>
      <div className="min-h-screen bg-background">
        <div className="hidden md:block">
          <Navbar />
        </div>
        <MobileNavbar />
        <MobileTabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <div className="hidden md:block">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <div
                key={tab.id}
                style={{ display: isActive ? "block" : "none" }}
              >
                {renderTabContent(tab.id, isActive)}
              </div>
            );
          })}
        </div>

        <div className="md:hidden overflow-hidden touch-pan-y">
          <div
            ref={carouselRef}
            className="relative w-full"
            style={{
              transform: `translateX(-${currentTabIndex * 100}%)`,
              willChange: "transform",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              perspective: 1000,
            }}
          >
            {tabs.map((tab, index) => {
              const isActive = index === currentTabIndex;
              const shouldRender = Math.abs(index - currentTabIndex) <= 1;

              return (
                <div
                  key={tab.id}
                  className="w-full overflow-x-hidden"
                  style={{
                    width: "100vw",
                    minWidth: "100vw",
                    maxWidth: "100vw",
                    position: isActive ? "relative" : "absolute",
                    top: 0,
                    left: `${index * 100}%`,
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    willChange: shouldRender ? "transform" : "auto",
                  }}
                >
                  {shouldRender ? (
                    renderTabContent(tab.id, isActive)
                  ) : (
                    <div className="min-h-screen" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
};

const DynamicSectionsForTab = ({
  tabId,
  screenType,
}: {
  tabId: string;
  screenType: "mobile" | "desktop";
}) => {
  const { data: internalSections, isLoading } = useQuery({
    queryKey: ["internal-sections", tabId],
    queryFn: () => getInternalSections(tabId),
    staleTime: Infinity,
    enabled: tabId !== "inicio" && tabId !== "peliculas" && tabId !== "series",
  });

  if (isLoading) return <div className="h-20" />;

  return (
    <>
      {internalSections
        ?.filter((section) =>
          shouldShowForScreen((section as any).screen_visibility, screenType),
        )
        .map((section) => (
          <DynamicSection key={section.id} section={section} tabId={tabId} />
        ))}
    </>
  );
};

const CustomTabContent = ({ sectionId }: { sectionId: string }) => {
  const { data: sections } = useQuery({
    queryKey: ["tab-sections"],
    queryFn: getTabSections,
    staleTime: Infinity,
  });

  const section = sections?.find((s) => s.id === sectionId);

  const { data: content, isLoading } = useQuery({
    queryKey: ["section-content", sectionId],
    queryFn: () => getSectionContent(section!),
    enabled: !!section,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[150px] h-[225px] bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!section || !content || content.length === 0) return null;

  const viewAllLink =
    section.type === "category"
      ? `/view-all/category/${section.category}`
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

const StandardSectionContent = ({
  section,
  tabId,
}: {
  section: Section;
  tabId?: string;
}) => {
  const { data: content, isLoading } = useQuery({
    queryKey: ["section-content", section.id, tabId || "default"],
    queryFn: () =>
      tabId
        ? getSectionContentForTab(section, tabId)
        : getSectionContent(section),
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

  const isCustomTab =
    tabId && !["inicio", "peliculas", "series"].includes(tabId);
  const viewAllLink =
    section.type === "category"
      ? isCustomTab
        ? `/view-all/category/${(section as any).category}?tab=${tabId}`
        : `/view-all/category/${(section as any).category}`
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

const DynamicSection = ({
  section,
  tabId,
}: {
  section: Section;
  tabId?: string;
}) => {
  switch (section.type) {
    case "backdrop_carousel":
      return <BackdropCarousel section={section} tabId={tabId} />;
    case "custom_html":
      return <CustomHTMLSection section={section} />;
    case "top10":
      return <Top10Carousel section={section} tabId={tabId} />;
    default:
      return <StandardSectionContent section={section} tabId={tabId} />;
  }
};

export default Home;
