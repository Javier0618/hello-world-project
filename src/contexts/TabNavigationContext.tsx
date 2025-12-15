import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";

interface TabNavigationContextType {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  handleTabChange: (tabId: string) => void;
  // Swipe progress for synchronized indicator animation
  swipeProgress: number;
  setSwipeProgress: (progress: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

export const TabNavigationProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<string>("inicio");
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollPositions = useRef<Record<string, number>>({});

  const handleTabChange = useCallback((tabId: string) => {
    if (typeof window !== "undefined") {
      scrollPositions.current[activeTab] = window.scrollY;
    }
    setActiveTab(tabId);
    setSwipeProgress(0);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const savedPosition = scrollPositions.current[tabId] || 0;
        window.scrollTo(0, savedPosition);
      });
    }
  }, [activeTab]);

  return (
    <TabNavigationContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      handleTabChange,
      swipeProgress,
      setSwipeProgress,
      isDragging,
      setIsDragging
    }}>
      {children}
    </TabNavigationContext.Provider>
  );
};

export const useTabNavigation = () => {
  const context = useContext(TabNavigationContext);
  if (context === undefined) {
    throw new Error("useTabNavigation must be used within a TabNavigationProvider");
  }
  return context;
};
